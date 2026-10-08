import { calendarUrl, parseCalendar, MAX_CALENDAR_BYTES } from '../../shared/calendar.js';
export async function syncSubscription(value, signal) {
  const url = calendarUrl(value).href;
  const response = await fetch('/api/calendar', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Calendar sync failed.');
  return { ...body, url, source: 'subscription' };
}
export async function importCalendar(file) {
  if (!file || file.size > MAX_CALENDAR_BYTES) throw new Error('Choose an .ics file smaller than 1 MB.');
  const text = await file.text();
  return { ...parseCalendar(text), text, source: 'file', syncedAt: Date.now() };
}
