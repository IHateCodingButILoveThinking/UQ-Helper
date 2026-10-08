import { calendarResponse } from '../server/calendar.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Use POST.' });
  }
  if (request.headers['sec-fetch-site'] === 'cross-site') return response.status(403).json({ error: 'Use the calendar settings on this website.' });
  if (Number(request.headers['content-length']) > 8192 || JSON.stringify(request.body ?? '').length > 8192) return response.status(413).json({ error: 'Request too large.' });
  const { status, body } = await calendarResponse(request.body?.url);
  return response.status(status).json(body);
}
