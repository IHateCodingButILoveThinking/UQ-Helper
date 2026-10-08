import SwiftUI
import Charts

@main
struct UQCampusApp: App {
    @StateObject private var health = HealthStore()
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            TabView {
                ActivityView(health: health)
                    .tabItem { Label("Your day", systemImage: "figure.walk") }
                CampusWebView(health: health)
                    .tabItem { Label("Campus", systemImage: "building.2") }
            }
            .tint(Color(red: 0.40, green: 0.24, blue: 0.54))
            .task {
                while !Task.isCancelled {
                    if scenePhase == .active { await health.refresh() }
                    try? await Task.sleep(for: .seconds(60))
                }
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await health.refresh() } }
            }
        }
    }
}

struct ActivityView: View {
    @ObservedObject var health: HealthStore
    @AppStorage("dailyStepGoal") private var goal = 10000
    @State private var showSettings = false
    private let green = Color(red: 0.27, green: 0.51, blue: 0.36)
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Your day").font(.largeTitle.bold())
                    Text("UQ Campus").foregroundStyle(.secondary)
                    stepCard
                    weekCard
                    Text("Health data stays on this iPhone.").font(.footnote).foregroundStyle(.secondary)
                }.padding(20)
            }
            .background(Color(red: 0.96, green: 0.95, blue: 0.97))
            .toolbar { Button("Settings", systemImage: "gearshape") { showSettings = true } }
            .sheet(isPresented: $showSettings) { settings }
        }
    }
    private var stepCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Daily steps", systemImage: "figure.walk").font(.headline)
            HStack(alignment: .firstTextBaseline) {
                Text(health.today.map { $0.formatted() } ?? "—").font(.system(size: 40, weight: .bold, design: .rounded))
                Text("/ \(goal.formatted())").foregroundStyle(.secondary)
            }
            ProgressView(value: min(Double(health.today ?? 0) / Double(goal), 1)).tint(green)
            Text(health.message).font(.caption).foregroundStyle(.secondary)
            if let sync = health.lastSync {
                Text("Last read \(sync.formatted(date: .omitted, time: .shortened))").font(.caption2).foregroundStyle(.secondary)
            }
            if !health.enabled {
                Button("Connect Apple Health") { Task { await health.connect() } }
                    .buttonStyle(.borderedProminent).disabled(!health.available || health.busy)
            } else {
                Button("Refresh steps") { Task { await health.refresh() } }.disabled(health.busy)
            }
        }.padding().background(.white, in: RoundedRectangle(cornerRadius: 18))
    }
    private var weekCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This week").font(.headline)
            Chart {
                ForEach(health.days) { day in
                    if let steps = day.steps {
                        BarMark(x: .value("Day", day.key), y: .value("Steps", steps))
                            .foregroundStyle(steps >= goal ? green : Color.purple.opacity(0.35))
                            .accessibilityLabel("\(day.key), \(steps) steps")
                    }
                }
                RuleMark(y: .value("Goal", goal)).lineStyle(StrokeStyle(dash: [3, 4])).foregroundStyle(.gray.opacity(0.5))
            }
            .chartXScale(domain: health.days.map(\.key))
            .chartXAxis {
                AxisMarks(values: health.days.map(\.key)) { value in
                    AxisValueLabel {
                        if let key = value.as(String.self), let day = health.days.first(where: { $0.key == key }) {
                            Text(weekday(day.date))
                        }
                    }
                }
            }
            .frame(height: 130)
            DisclosureGroup("Daily totals") {
                ForEach(health.days) { day in
                    HStack {
                        Text(day.key)
                        Spacer()
                        Text(day.steps.map { "\($0.formatted()) steps" } ?? "No data")
                    }.font(.caption).foregroundStyle(.secondary)
                }
            }.font(.caption)
        }.padding().background(.white, in: RoundedRectangle(cornerRadius: 18))
    }
    private func weekday(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = health.calendar.timeZone
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }
    private var settings: some View {
        NavigationStack {
            Form {
                Section("Daily step goal") { Stepper("\(goal.formatted()) steps", value: $goal, in: 500...100000, step: 500) }
                Section("Apple Health") {
                    Text("Read-only access to Steps. Manage permissions in the Health app.")
                    if health.enabled { Button("Disconnect Apple Health", role: .destructive) { health.disconnect() } }
                }
            }.navigationTitle("Settings").toolbar { Button("Done") { showSettings = false } }
        }
    }
}
