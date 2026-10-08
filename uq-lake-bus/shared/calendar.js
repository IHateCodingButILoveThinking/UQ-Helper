import ICAL from 'ical.js';

export const MAX_CALENDAR_BYTES = 1024 * 1024;
export const DISPLAY_ZONE = 'Australia/Brisbane';
export function calendarUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('Enter a UQ timetable subscription URL.');
  let url;
  try { url = new URL(value.trim().replace(/^webcal:/i, 'https:')); } catch { throw new Error('Enter a valid calendar URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'timetable.my.uq.edu.au' || url.port || url.username || url.password || url.hash || !url.pathname.startsWith('/aplus/rest/calendar/ical/')) {
    throw new Error('Only HTTPS UQ timetable subscription links are supported.');
  }
  return url;
}

// Embedded VTIMEZONE definitions take precedence. For IANA TZIDs without a
// definition, use the runtime's maintained timezone database through Intl.
function ianaZone(tzid) {
  if (ICAL.TimezoneService.has(tzid)) return;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: tzid, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const zone = new ICAL.Timezone({ tzid });
  zone.utcOffset = (time) => {
    const wall = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
    let guess = wall;
    let offset = 0;
    for (let i = 0; i < 3; i++) {
      const p = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, value]));
      offset = (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - guess) / 1000;
      const next = wall - offset * 1000;
      if (next === guess) break;
      guess = next;
    }
    return offset;
  };
  ICAL.TimezoneService.register(tzid, zone);
}
function timestamp(time) {
  const copy = time.clone();
  if (copy.zone.tzid === 'floating') copy.zone = ICAL.TimezoneService.get(DISPLAY_ZONE);
  return copy.toUnixTime() * 1000;
}

export function parseCalendar(text, now = Date.now()) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_CALENDAR_BYTES) throw new Error('Calendar exceeds the 1 MB limit.');
  try {
    const root = new ICAL.Component(ICAL.parse(text));
    if (root.name !== 'vcalendar') throw new Error('Not a calendar');
    ianaZone(DISPLAY_ZONE);
    const embedded = new Set(root.getAllSubcomponents('vtimezone').map(c => c.getFirstPropertyValue('tzid')));
    const components = root.getAllSubcomponents('vevent');
    if (components.length > 3000) throw new Error('Too many events');
    for (const c of components) {
      for (const p of c.getAllProperties()) {
        const tz = p.getParameter('tzid');
        if (tz && !embedded.has(tz)) ianaZone(tz);
      }
      for (const rule of c.getAllProperties('rrule')) {
        if (['SECONDLY', 'MINUTELY', 'HOURLY'].includes(rule.getFirstValue().freq)) throw new Error('Unsupported frequency');
      }
    }
    const events = components.map(c => new ICAL.Event(c, { strictExceptions: true, exceptions: [] }));
    const masters = events.filter(e => !e.isRecurrenceException());
    const exceptions = events.filter(e => e.isRecurrenceException());
    for (const master of masters) for (const exception of exceptions) if (exception.uid === master.uid) master.relateException(exception);
    const result = new Map();
    const until = now + 366 * 86400000;
    let iterations = 0;
    function add(event, startDate, endDate, key) {
      if (event.component.getFirstPropertyValue('status') === 'CANCELLED') return;
      const start = timestamp(startDate), end = timestamp(endDate);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('Invalid dates');
      if (end <= now || start > until) return;
      result.set(key, { id: key, title: event.summary || 'Untitled class', start, end, allDay: startDate.isDate, location: event.location || '', description: event.description || '' });
      if (result.size > 5000) throw new Error('Too many occurrences');
    }
    for (const event of masters) {
      if (event.component.getFirstPropertyValue('status') === 'CANCELLED') continue;
      if (!event.startDate || !event.uid) throw new Error('Missing start or UID');
      if (!event.isRecurring()) { add(event, event.startDate, event.endDate, event.uid); continue; }
      const iterator = event.iterator();
      let occurrence;
      while ((occurrence = iterator.next())) {
        if (++iterations > 100000) throw new Error('Too many recurrences');
        if (timestamp(occurrence) > until) break;
        const override = event.exceptions[occurrence.toString()]
          ?? event.exceptions[occurrence.convertToZone(ICAL.Timezone.utcTimezone).toString()]
          ?? event.exceptions[event.findRangeException(occurrence)];
        if (override?.component.getFirstPropertyValue('status') === 'CANCELLED') continue;
        const details = event.getOccurrenceDetails(occurrence);
        add(details.item, details.startDate, details.endDate, `${event.uid}/${timestamp(occurrence)}`);
      }
    }
    // Include detached or moved-in exceptions even when the original falls
    // outside the expansion window, but never resurrect a cancelled series.
    for (const e of exceptions) {
      const master = masters.find(m => m.uid === e.uid);
      if (master?.component.getFirstPropertyValue('status') === 'CANCELLED') continue;
      if (e.startDate && e.component.getFirstPropertyValue('status') !== 'CANCELLED') add(e, e.startDate, e.endDate, `${e.uid}/${timestamp(e.recurrenceId)}`);
    }
    return { events: [...result.values()].sort((a, b) => a.start - b.start), windowEnd: until };
  } catch {
    throw new Error('This calendar could not be read. Check the file or subscription; use a valid calendar with supported timezones and daily or less frequent recurrences.');
  }
}
