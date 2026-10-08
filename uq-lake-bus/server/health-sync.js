import { randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';

const TTL = 90 * 86400;
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const brisbaneDate = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export function healthConfigured(env = process.env) {
  return /^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/i.test(env.UPSTASH_REDIS_REST_URL ?? '') && !!env.UPSTASH_REDIS_REST_TOKEN && /^[a-f0-9]{64}$/i.test(env.HEALTH_ENCRYPTION_KEY ?? '');
}
export async function redisCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!response.ok) throw fail('Sync storage is temporarily unavailable.', 503);
  const body = await response.json();
  if (body.error) throw fail('Sync storage is temporarily unavailable.', 503);
  return body.result;
}
export function encryptSteps(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}
export function decryptSteps(value, key) {
  const raw = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
}
export function validateHealthDays(body, now = Date.now()) {
  if (!Array.isArray(body.days) || !body.days.length || body.days.length > 7) throw fail('Send one to seven daily totals.');
  if (!Number.isFinite(body.measuredAt) || body.measuredAt > now + 300000 || body.measuredAt < now - 86400000) throw fail('Refresh Health data before syncing.');
  const today = brisbaneDate(now), oldest = brisbaneDate(now - 34 * 86400000);
  const seen = new Set();
  return body.days.map(day => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date ?? '') || !Number.isFinite(Date.parse(`${day.date}T00:00:00Z`)) || new Date(`${day.date}T00:00:00Z`).toISOString().slice(0, 10) !== day.date || day.date > today || day.date < oldest || seen.has(day.date)) throw fail('Invalid step date.');
    if (!Number.isInteger(day.steps) || day.steps < 0 || day.steps > 100000) throw fail('Invalid daily step count.');
    seen.add(day.date);
    return { date: day.date, steps: day.steps };
  });
}
const rateScript = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";
// Authorization and writes/deletion are atomic, so an in-flight upload cannot
// resurrect a connection after the browser has disconnected it.
export const uploadScript = `
local auth=redis.call('GET',KEYS[1]); if not auth then return 0 end
if cjson.decode(auth).writeHash~=ARGV[1] then return 0 end
local days=cjson.decode(ARGV[2])
for _,day in ipairs(days) do
 local old=redis.call('HGET',KEYS[2],day.date)
 if not old or cjson.decode(old).measuredAt<=tonumber(ARGV[3]) then
  redis.call('HSET',KEYS[2],day.date,cjson.encode({encrypted=day.encrypted,measuredAt=tonumber(ARGV[3])}))
 end
end
for _,date in ipairs(redis.call('HKEYS',KEYS[2])) do if date<ARGV[4] then redis.call('HDEL',KEYS[2],date) end end
redis.call('EXPIRE',KEYS[1],ARGV[5]); redis.call('EXPIRE',KEYS[2],ARGV[5]); return 1`;
export const deleteScript = `local auth=redis.call('GET',KEYS[1]); if not auth then return 1 end; if cjson.decode(auth).readHash~=ARGV[1] then return 0 end; redis.call('DEL',KEYS[1],KEYS[2]); return 1`;
export async function healthAction(body, authorization, { command = redisCommand, key = process.env.HEALTH_ENCRYPTION_KEY, now = Date.now() } = {}) {
  async function rate(scope, limit, seconds) {
    const count = await command(['EVAL', rateScript, 1, `uq-health:limit:${scope}:${Math.floor(now / (seconds * 1000))}`, seconds]);
    if (count > limit) throw fail('Too many requests. Try again later.', 429);
  }
  if (body.action === 'pair') {
    await rate('pair', 60, 3600);
    const id = randomBytes(16).toString('hex');
    const read = randomBytes(32).toString('hex'), write = randomBytes(32).toString('hex');
    await command(['SET', `uq-health:connection:${id}`, JSON.stringify({ readHash: hash(read), writeHash: hash(write) }), 'EX', TTL]);
    return { readToken: `${id}.${read}`, uploadCode: `${id}.${write}` };
  }
  const match = authorization?.match(/^Bearer ([a-f0-9]{32})\.([a-f0-9]{64})$/);
  if (!match) throw fail('Pair this device again.', 401);
  const [, id, secret] = match;
  const connectionKey = `uq-health:connection:${id}`, dataKey = `uq-health:data:${id}`;
  const raw = await command(['GET', connectionKey]);
  if (!raw) throw fail('This connection has expired or was removed. Pair again.', 401);
  const auth = JSON.parse(raw), digest = hash(secret);
  const expected = body.action === 'upload' ? auth.writeHash : auth.readHash;
  if (!expected || !timingSafeEqual(Buffer.from(digest), Buffer.from(expected))) throw fail('Invalid connection code.', 401);
  await rate(id, 120, 60);
  if (body.action === 'read') {
    const values = await command(['HGETALL', dataKey]);
    const days = [];
    let syncedAt = null;
    for (let i = 0; i < (values?.length ?? 0); i += 2) {
      if (values[i] < brisbaneDate(now - 34 * 86400000)) continue;
      const record = JSON.parse(values[i + 1]);
      days.push(decryptSteps(record.encrypted, key));
      syncedAt = Math.max(syncedAt ?? 0, record.measuredAt);
    }
    return { days, syncedAt, enabled: true };
  }
  if (body.action === 'upload') {
    const days = validateHealthDays(body, now);
    const encrypted = days.map(day => ({ date: day.date, encrypted: encryptSteps(day, key) }));
    const result = await command(['EVAL', uploadScript, 2, connectionKey, dataKey, digest, JSON.stringify(encrypted), body.measuredAt, brisbaneDate(now - 34 * 86400000), TTL]);
    if (!result) throw fail('Connection removed. Pair again.', 401);
    return { syncedAt: body.measuredAt };
  }
  if (body.action === 'disconnect') {
    if (!await command(['EVAL', deleteScript, 2, connectionKey, dataKey, digest])) throw fail('Invalid connection code.', 401);
    return { disconnected: true };
  }
  throw fail('Unknown sync action.');
}
