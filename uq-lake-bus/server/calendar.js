import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { calendarUrl, MAX_CALENDAR_BYTES, parseCalendar } from '../shared/calendar.js';

export function publicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

export async function fetchCalendar(value) {
  const url = calendarUrl(value);
  // Validate every DNS answer and pin the connection to a validated address,
  // keeping TLS verification and SNI on the allowlisted hostname.
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('Unsafe destination');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => request.destroy(new Error('Timeout')), 10000);
    const request = https.get(url, {
      agent: false,
      lookup: (_hostname, options, callback) => options.all ? callback(null, [addresses[0]]) : callback(null, addresses[0].address, addresses[0].family),
      headers: { Accept: 'text/calendar', 'Accept-Encoding': 'identity' },
    }, response => {
      // Reject all redirects, including same-host redirects. Never forward a token.
      if (response.statusCode !== 200 || Number(response.headers['content-length']) > MAX_CALENDAR_BYTES) {
        response.destroy(); request.destroy(new Error('Feed unavailable')); return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_CALENDAR_BYTES) request.destroy(new Error('Calendar too large'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks).toString('utf8')); });
    });
    request.on('error', error => { clearTimeout(timer); reject(error); });
  });
}

export async function calendarResponse(value, fetcher = fetchCalendar) {
  try { calendarUrl(value); } catch (error) { return { status: 400, body: { error: error.message } }; }
  try {
    const text = await fetcher(value);
    const parsed = parseCalendar(text);
    return { status: 200, body: { ...parsed, syncedAt: Date.now() } };
  } catch {
    // Never return or log upstream errors: they can contain subscription tokens.
    return { status: 422, body: { error: 'Calendar unavailable or unreadable. Check your subscription link or try again later.' } };
  }
}
