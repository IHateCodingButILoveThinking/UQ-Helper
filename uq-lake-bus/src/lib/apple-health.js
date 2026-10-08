export function hasNativeHealth() {
  return typeof window !== 'undefined' && typeof window.webkit?.messageHandlers?.uqHealth?.postMessage === 'function';
}
export async function nativeHealth(action) {
  if (!hasNativeHealth()) throw new Error('Apple Health is available in the UQ Campus iPhone app.');
  return window.webkit.messageHandlers.uqHealth.postMessage(action);
}
export function mergeHealthSteps(records, payload) {
  // Read-only HealthKit data is kept in memory, never uploaded or cached here.
  const next = Object.fromEntries(Object.entries(records).filter(([, record]) => record.source !== 'apple-health'));
  if (payload.enabled) for (const day of payload.days ?? []) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isInteger(day.steps) && day.steps >= 0) {
      next[day.date] = { value: day.steps, source: 'apple-health', updatedAt: payload.syncedAt };
    }
  }
  return next;
}
export function persistableLife(data) {
  return { ...data, steps: Object.fromEntries(Object.entries(data.steps).filter(([, record]) => record.source !== 'apple-health')) };
}
