export const LIFE_KEY = 'uq-life-v1';
export const EMPTY_LIFE = { goal: 10000, steps: {}, calendar: null };
export function courseLabel(event) {
  // UQ feeds often put the course code in DESCRIPTION, before the semester suffix.
  for (const text of [event?.title, event?.description]) {
    const match = text?.match(/(?:^|[^A-Z0-9])([A-Z]{4})[ -]?(\d{4})(?!\d)/);
    if (match) return `${match[1]} ${match[2]}`;
  }
  return event?.title;
}
export function dayKey(time = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
}
export function weekSteps(records, now = Date.now()) {
  const today = new Date(`${dayKey(now)}T00:00:00+10:00`);
  const day = new Date(today.getTime() + 10 * 3600000).getUTCDay();
  const monday = today.getTime() - ((day + 6) % 7) * 86400000;
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
    const date = dayKey(monday + index * 86400000);
    return { label, date, steps: records[date]?.value ?? null };
  });
}
export function stepValue(value, goal = false) {
  if (String(value).trim() === '') throw new Error('Enter a number.');
  const number = Number(value);
  if (!Number.isInteger(number) || number < (goal ? 1 : 0) || number > 100000) throw new Error(`Enter a whole number from ${goal ? 1 : 0} to 100,000.`);
  return number;
}
export function loadLife() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIFE_KEY));
    if (!saved) return EMPTY_LIFE;
    const steps = Object.fromEntries(Object.entries(saved.steps ?? {}).filter(([date, record]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(record?.value) && record.value >= 0 && record.value <= 100000));
    return { goal: stepValue(saved.goal, true), steps, calendar: ['subscription', 'file'].includes(saved.calendar?.source) ? saved.calendar : null };
  } catch { return EMPTY_LIFE; }
}

export function classLocation(event) {
  const location = event?.location?.trim();
  if (!location) return '';
  const parts = location.split(/\s+[–—-]\s+/);
  const building = parts[0].match(/^(\d+[A-Z]?)(?:-\w+)?$/i)?.[1];
  // UQ locations normally end with the building name. Keep the original in
  // details, especially when a feed lists date-specific alternate rooms.
  if (building && parts.length > 1) {
    const name = parts.at(-1).split(/[,(]/)[0].trim();
    if (name && !/^building\s+\d/i.test(name)) return `${building} · ${name}`;
    return `Building ${building}`;
  }
  return location;
}
