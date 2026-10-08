import Foundation
import HealthKit

@MainActor
final class HealthStore: ObservableObject {
    struct Day: Identifiable {
        let date: Date
        let key: String
        let steps: Int?
        var id: String { key }
    }

    private let store = HKHealthStore()
    private let stepType = HKQuantityType(.stepCount)
    @Published private(set) var days: [Day] = []
    @Published private(set) var lastSync: Date?
    @Published private(set) var busy = false
    @Published private(set) var message = "Connect Apple Health to read your steps."
    @Published private(set) var enabled = UserDefaults.standard.bool(forKey: "healthEnabled")
    private var generation = 0
    var available: Bool { HKHealthStore.isHealthDataAvailable() }
    var calendar: Calendar {
        var result = Calendar(identifier: .gregorian)
        result.timeZone = TimeZone(identifier: "Australia/Brisbane")!
        result.firstWeekday = 2
        return result
    }
    var today: Int? { days.first { calendar.isDate($0.date, inSameDayAs: Date()) }?.steps }

    func connect() async {
        guard available else { message = "Apple Health is unavailable on this device."; return }
        do {
            // Completion means the permission sheet was handled, NOT that read
            // permission was granted. HealthKit intentionally conceals read denial.
            try await store.requestAuthorization(toShare: [], read: [stepType])
            enabled = true
            UserDefaults.standard.set(true, forKey: "healthEnabled")
            await refresh()
        } catch {
            message = "Could not request Health access. Try again on your iPhone."
        }
    }

    func disconnect() {
        generation += 1
        enabled = false
        UserDefaults.standard.set(false, forKey: "healthEnabled")
        days = []
        lastSync = nil
        busy = false
        message = "Disconnected. You can also revoke Steps access in the Health app."
    }

    func refresh() async {
        guard enabled, available, !busy else { return }
        busy = true
        let requestGeneration = generation
        defer { if requestGeneration == generation { busy = false } }
        let now = Date()
        let today = calendar.startOfDay(for: now)
        let weekday = calendar.component(.weekday, from: today)
        let monday = calendar.date(byAdding: .day, value: -((weekday + 5) % 7), to: today)!
        do {
            var totals: [Int: Int] = [:]
            // Each query gets explicit Brisbane midnight boundaries, independent
            // of the phone's current timezone or daylight-saving transitions.
            for offset in 0..<7 {
                let start = calendar.date(byAdding: .day, value: offset, to: monday)!
                guard start <= now else { continue }
                let end = min(calendar.date(byAdding: .day, value: 1, to: start)!, now)
                let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
                let total: Double? = try await withCheckedThrowingContinuation { continuation in
                    let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
                        if let error { continuation.resume(throwing: error) }
                        else { continuation.resume(returning: result?.sumQuantity()?.doubleValue(for: .count())) }
                    }
                    store.execute(query)
                }
                guard requestGeneration == generation else { return }
                if let total { totals[offset] = Int(total.rounded()) }
            }
            guard requestGeneration == generation else { return }
            let formatter = DateFormatter()
            formatter.calendar = calendar
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = calendar.timeZone
            formatter.dateFormat = "yyyy-MM-dd"
            days = (0..<7).map { offset in
                let date = calendar.date(byAdding: .day, value: offset, to: monday)!
                // Use HealthKit's aggregate, never add overlapping iPhone/Watch
                // raw samples. Missing or denied read access must not become zero.
                return Day(date: date, key: formatter.string(from: date), steps: totals[offset])
            }
            lastSync = now
            message = days.contains { $0.steps != nil }
                ? "Apple Health · Australia/Brisbane"
                : "No readable step data. Allow Steps in Health, or check that your device has recorded steps."
        } catch {
            guard requestGeneration == generation else { return }
            days = []
            lastSync = nil
            message = "Could not read steps. Unlock your iPhone and check Health permissions."
        }
    }

    func payload() -> [String: Any] {
        ["enabled": enabled, "available": available, "message": message,
         "syncedAt": lastSync.map { $0.timeIntervalSince1970 * 1000 } as Any? ?? NSNull(),
         "days": days.map { ["date": $0.key, "steps": $0.steps as Any? ?? NSNull()] }]
    }
}
