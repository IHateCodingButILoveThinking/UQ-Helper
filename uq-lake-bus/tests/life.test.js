import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendar, calendarUrl } from '../shared/calendar.js';
import { calendarResponse, publicAddress } from '../server/calendar.js';
import handler from '../api/calendar.js';
import { dayKey, weekSteps, stepValue } from '../src/lib/life-data.js';
const calendar = events => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UQ Life Tests//EN\r\n${events}\r\nEND:VCALENDAR`;
const event = fields => `BEGIN:VEVENT\r\n${fields}\r\nEND:VEVENT`;
const now = Date.parse('2026-10-05T00:00:00+10:00');

test('recurrences, EXDATE, moved exception, cancelled occurrence and series', () => {
  const text = calendar([
    event('UID:one\r\nDTSTART;TZID=Australia/Brisbane:20261005T090000\r\nDTEND;TZID=Australia/Brisbane:20261005T100000\r\nRRULE:FREQ=DAILY;COUNT=5\r\nEXDATE;TZID=Australia/Brisbane:20261006T090000\r\nSUMMARY:Class'),
    event('UID:one\r\nRECURRENCE-ID;TZID=Australia/Brisbane:20261007T090000\r\nDTSTART;TZID=Australia/Brisbane:20261007T110000\r\nDTEND;TZID=Australia/Brisbane:20261007T120000\r\nSUMMARY:Moved'),
    event('UID:one\r\nRECURRENCE-ID;TZID=Australia/Brisbane:20261008T090000\r\nSTATUS:CANCELLED'),
    event('UID:cancelled\r\nDTSTART:20261005T000000Z\r\nDTEND:20261005T010000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nSTATUS:CANCELLED'),
  ].join('\r\n'));
  const { events } = parseCalendar(text, now);
  assert.equal(events.length, 3);
  assert.equal(events[1].title, 'Moved');
  assert.equal(events[1].start, Date.parse('2026-10-07T11:00:00+10:00'));
  assert.equal(events[2].start, Date.parse('2026-10-09T09:00:00+10:00'));
});

test('UTC, floating Brisbane, IANA daylight savings and all-day dates', () => {
  const { events } = parseCalendar(calendar([
    event('UID:utc\r\nDTSTART:20261005T000000Z\r\nDTEND:20261005T010000Z'),
    event('UID:floating\r\nDTSTART:20261005T100000\r\nDTEND:20261005T110000'),
    event('UID:sydney\r\nDTSTART;TZID=Australia/Sydney:20261005T110000\r\nDTEND;TZID=Australia/Sydney:20261005T120000'),
    event('UID:day\r\nDTSTART;VALUE=DATE:20261006\r\nDTEND;VALUE=DATE:20261007'),
  ].join('\r\n')), now);
  assert.equal(events.length, 4);
  assert.equal(events[0].start, events[1].start);
  assert.equal(events[1].start, events[2].start);
  assert.equal(events[3].allDay, true);
  assert.equal(events[3].end - events[3].start, 86400000);
});

test('embedded VTIMEZONE definition', () => {
  const zone = 'BEGIN:VTIMEZONE\r\nTZID:Custom/Zone\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0530\r\nTZOFFSETTO:+0530\r\nEND:STANDARD\r\nEND:VTIMEZONE';
  const parsed = parseCalendar(calendar(zone + '\r\n' + event('UID:custom\r\nDTSTART;TZID=Custom/Zone:20261005T120000\r\nDTEND;TZID=Custom/Zone:20261005T130000')), now);
  assert.equal(parsed.events[0].start, Date.parse('2026-10-05T12:00:00+05:30'));
});

test('empty, expired, malformed, excessive and unknown timezone calendars', () => {
  assert.deepEqual(parseCalendar(calendar(''), now).events, []);
  assert.deepEqual(parseCalendar(calendar(event('UID:old\r\nDTSTART:20200101T000000Z\r\nDTEND:20200101T010000Z')), now).events, []);
  assert.throws(() => parseCalendar('not a calendar', now));
  assert.throws(() => parseCalendar('x'.repeat(1024 * 1024 + 1), now));
  assert.throws(() => parseCalendar(calendar(event('UID:tz\r\nDTSTART;TZID=Unknown/Zone:20261005T120000')), now));
});

test('URL allowlist and public IP validation reject SSRF targets', () => {
  assert.equal(calendarUrl('webcal://timetable.my.uq.edu.au/aplus/rest/calendar/ical/test').protocol, 'https:');
  for (const url of ['http://timetable.my.uq.edu.au/aplus/rest/calendar/ical/test', 'https://localhost/a.ics', 'https://127.0.0.1/a.ics', 'https://timetable.my.uq.edu.au.evil.test/a.ics', 'https://user:pass@timetable.my.uq.edu.au/aplus/rest/calendar/ical/test', 'https://timetable.my.uq.edu.au:444/aplus/rest/calendar/ical/test']) assert.throws(() => calendarUrl(url));
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1', '100.64.0.1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
});

test('unavailable feeds never disclose tokens, successful empty feed supported', async () => {
  const url = 'https://timetable.my.uq.edu.au/aplus/rest/calendar/ical/private-test-token';
  const failure = await calendarResponse(url, async () => { throw new Error(url); });
  assert.equal(failure.status, 422);
  assert.ok(!JSON.stringify(failure).includes('private-test-token'));
  assert.equal((await calendarResponse(url, async () => calendar(''))).body.events.length, 0);
});

test('endpoint rejects GET, cross-site and oversized requests; disables cache', async () => {
  for (const [request, code] of [[{ method: 'GET', headers: {} }, 405], [{ method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }, 403], [{ method: 'POST', headers: {}, body: { url: 'a'.repeat(9000) } }, 413]]) {
    const headers = {};
    const response = { setHeader: (k,v) => { headers[k] = v; }, status: n => { assert.equal(n, code); return response; }, json: () => {} };
    await handler(request, response);
    assert.match(headers['Cache-Control'], /no-store/);
  }
});

test('Brisbane day boundary, Monday-Sunday week, missing vs zero, updated steps', () => {
  assert.equal(dayKey(Date.parse('2026-10-04T14:01:00Z')), '2026-10-05');
  const rows = weekSteps({ '2026-10-05': { value: 0 }, '2026-10-06': { value: 12345 } }, now);
  assert.equal(rows[0].label, 'Mon'); assert.equal(rows[6].date, '2026-10-11');
  assert.equal(rows[0].steps, 0); assert.equal(rows[1].steps, 12345); assert.equal(rows[2].steps, null);
  assert.equal(weekSteps({ '2026-10-05': { value: 7000 } }, now)[0].steps, 7000);
  assert.equal(stepValue('0'), 0);
  for (const v of ['', '-1', '2.5', '100001']) assert.throws(() => stepValue(v));
  assert.throws(() => stepValue(0, true));
});

test('UTC recurrence IDs do not duplicate moved events; cancelled future ranges', () => {
  const parsed = parseCalendar(calendar([
    event('UID:utc-ex\r\nDTSTART;TZID=Australia/Brisbane:20261005T100000\r\nDTEND;TZID=Australia/Brisbane:20261005T110000\r\nRRULE:FREQ=DAILY;COUNT=4'),
    event('UID:utc-ex\r\nRECURRENCE-ID:20261006T000000Z\r\nDTSTART;TZID=Australia/Brisbane:20261006T120000\r\nDTEND;TZID=Australia/Brisbane:20261006T130000'),
    event('UID:utc-ex\r\nRECURRENCE-ID;RANGE=THISANDFUTURE;TZID=Australia/Brisbane:20261007T100000\r\nSTATUS:CANCELLED'),
  ].join('\r\n')), now);
  assert.equal(parsed.events.length, 2);
  assert.equal(parsed.events[1].start, Date.parse('2026-10-06T12:00:00+10:00'));
});

test('native Health data replaces snapshots, preserves missing values, and is not persisted', async () => {
  const { mergeHealthSteps, persistableLife } = await import('../src/lib/apple-health.js');
  const records = { '2026-10-05': { value: 3, source: 'manual' }, '2026-10-06': { value: 999, source: 'apple-health' } };
  const steps = mergeHealthSteps(records, { enabled: true, syncedAt: 123, days: [{ date: '2026-10-06', steps: null }, { date: '2026-10-07', steps: 0 }, { date: '2026-10-08', steps: 6543 }] });
  assert.equal(steps['2026-10-06'], undefined);
  assert.equal(steps['2026-10-07'].value, 0);
  assert.equal(steps['2026-10-08'].source, 'apple-health');
  const saved = persistableLife({ goal: 10000, calendar: null, steps });
  assert.deepEqual(Object.keys(saved.steps), ['2026-10-05']);
  assert.deepEqual(mergeHealthSteps(steps, { enabled: false }), records['2026-10-05'] ? { '2026-10-05': records['2026-10-05'] } : {});
});
