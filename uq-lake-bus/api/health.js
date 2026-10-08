import { healthAction, healthConfigured } from '../server/health-sync.js';
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method === 'GET') return response.status(200).json({ configured: healthConfigured() });
  if (request.method !== 'POST') { response.setHeader('Allow', 'GET, POST'); return response.status(405).json({ error: 'Use POST.' }); }
  if (!healthConfigured()) return response.status(503).json({ error: 'Website sync has not been configured yet.' });
  if (request.headers['sec-fetch-site'] === 'cross-site') return response.status(403).json({ error: 'Open this website to connect.' });
  if (Number(request.headers['content-length']) > 4096 || JSON.stringify(request.body ?? '').length > 4096) return response.status(413).json({ error: 'Request too large.' });
  try { return response.status(200).json(await healthAction(request.body ?? {}, request.headers.authorization)); }
  catch (error) { return response.status(error.status ?? 503).json({ error: error.status ? error.message : 'Health sync is temporarily unavailable.' }); }
}
