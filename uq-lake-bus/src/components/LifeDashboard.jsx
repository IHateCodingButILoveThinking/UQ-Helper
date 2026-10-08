import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockModalScroll } from '../lib/modal-scroll-lock';
import { CalendarDays, Footprints, Settings, RefreshCw, X, ChevronRight } from 'lucide-react';
import { BarChart, Bar, Cell, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { EMPTY_LIFE, LIFE_KEY, classLocation, courseLabel, dayKey, loadLife, stepValue, weekSteps } from '../lib/life-data';
import { importCalendar, syncSubscription } from '../lib/calendar-sync';
import { hasNativeHealth, nativeHealth, mergeHealthSteps, persistableLife } from '../lib/apple-health';
import { parseCalendar } from '../../shared/calendar';
import '../styles/life-dashboard.css';

const time = value => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit' }).format(value);
const date = value => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short' }).format(value);
const synced = value => value ? `${date(value)}, ${time(value)}` : 'Not synced yet';
const when = event => event.allDay ? 'All day' : `${time(event.start)}–${time(event.end)}`;

function Sheet({ title, close, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const unlock = lockModalScroll(dialog);
    dialog.showModal();
    return () => { dialog.close(); unlock(); previous?.focus?.({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={ref} className="life-sheet" aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="life-sheet-inner"><header><h2>{title}</h2><button className="life-icon-button" aria-label="Close" onClick={close}><X size={20} /></button></header>{children}</div></dialog>, document.body);
}
function ClassDetail({ event, label }) {
  return <article className="life-event">{label && <small className="life-event-label">{label}</small>}<h3>{event.title}</h3><p>{date(event.start)} · {when(event)}</p>{event.location && <p>{event.location}</p>}{event.description && <details><summary>Description</summary><p>{event.description}</p></details>}</article>;
}
export function NextClassCard({ calendar, now, open }) {
  const events = calendar?.events ?? [];
  const current = events.find(e => e.start <= now && e.end > now);
  const event = current ?? events.find(e => e.start > now);
  return <button className={`life-card life-class-preview ${current ? "is-current" : ""} ${courseLabel(event)?.match(/^[A-Z]{4} \d{4}$/) ? "has-course-code" : ""}`} onClick={open} aria-label={event ? `View classes: ${courseLabel(event)}` : 'Connect calendar'}><span className="life-card-heading"><span><CalendarDays size={14} />{current ? 'In class' : 'Next class'}{current && <i className="life-live-dot" aria-hidden="true" />}</span><ChevronRight size={13} /></span><strong className="life-class-title">{courseLabel(event) ?? (calendar ? 'All clear' : 'Add your timetable')}</strong>{event?.location && <span className="life-class-location" title={event.location}>{classLocation(event)}</span>}{current && <progress className="life-class-progress" aria-label="Class progress" max={Math.max(current.end - current.start, 1)} value={Math.max(0, now - current.start)} />}<span className="life-card-caption">{event ? `${dayKey(event.start) === dayKey(now) ? '' : `${date(event.start)} · `}${when(event)}` : calendar ? 'No upcoming classes' : 'Connect calendar'}</span></button>;
}
export function DailyStepsCard({ record, goal, open }) {
  const steps = record?.value;
  return <button className="life-card" onClick={open} aria-label="Manage daily steps"><span className="life-card-heading"><span><Footprints size={14} />Steps</span><ChevronRight size={13} /></span><span className="life-step-total">{steps == null ? '—' : steps.toLocaleString()}<small> / {goal.toLocaleString()}</small></span><progress aria-label="Daily step goal progress" value={Math.min(steps ?? 0, goal)} max={goal} /><span className="life-card-caption">{steps == null ? 'Connect or add steps' : `${Math.round(steps / goal * 100)}% · ${record.source === 'apple-health' ? 'Apple Health' : 'Manual'}`}</span></button>;
}
export function WeeklyActivityChart({ records, goal, now, open }) {
  const data = weekSteps(records, now);
  const [selected, setSelected] = useState(null);
  const active = data.find(day => day.date === selected);
  return <article className="life-chart">
    <button className="life-chart-heading" onClick={open} aria-label="Open weekly activity"><span>This week</span><span className="life-chart-selection" aria-live="polite">{active && `${active.label} · ${active.steps == null ? 'No entry' : active.steps.toLocaleString()}`}<ChevronRight size={13} /></span></button>
    <div className="life-chart-canvas"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} accessibilityLayer>
      <Tooltip cursor={{ fill: '#f3f1f6', radius: 5 }} contentStyle={{ borderRadius: 12, border: '1px solid #eee8f2', fontSize: 11, boxShadow: '0 8px 24px #33204412' }} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} formatter={value => [Number(value).toLocaleString(), 'Steps']} />
      <ReferenceLine y={goal} stroke="#ddd6e3" strokeDasharray="2 5" ifOverflow="extendDomain" />
      <Bar dataKey="steps" radius={[4, 4, 4, 4]} maxBarSize={18} minPointSize={2} isAnimationActive={false}>{data.map(day => <Cell key={day.date} fill={day.steps >= goal ? '#44835d' : day.date === selected ? '#80519c' : '#cbbbd7'} />)}</Bar>
    </BarChart></ResponsiveContainer></div>
    <div className="life-week-days" aria-label="Select a day">{data.map(day => <button key={day.date} aria-pressed={day.date === selected} aria-label={`${day.date}: ${day.steps == null ? 'No entry' : `${day.steps} steps`}`} className={day.date === dayKey(now) ? 'is-today' : ''} onClick={() => setSelected(selected === day.date ? null : day.date)}>{day.label}</button>)}</div>
  </article>;
}
export function CalendarConnectionSettings({ data, update, connect, busy, remove, clear, section, health, syncHealth }) {
  const [url, setUrl] = useState('');
  const [goal, setGoal] = useState(data.goal);
  const [entryDate, setEntryDate] = useState(dayKey());
  const [steps, setSteps] = useState(data.steps[dayKey()]?.value ?? '');
  const [message, setMessage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const attempt = async action => { setMessage(''); try { await action(); setMessage('Saved'); } catch (error) { setMessage(error.message); } };
  return <div className="life-settings">
    <details name="life-settings" className="life-setting-group" open={section === 'calendar' || undefined}><summary><span><CalendarDays size={18} /><span>Calendar<small>{data.calendar ? data.calendar.source === 'file' ? 'Imported calendar' : 'UQ timetable connected' : 'Not connected'}</small></span></span><ChevronRight size={16} /></summary><div className="life-setting-body">
      {data.calendar && <p className="life-muted">Last sync · {synced(data.calendar.syncedAt)}</p>}
      <form onSubmit={e => { e.preventDefault(); attempt(async () => { await connect(url); setUrl(''); }); }}><label>Subscription link<input type="password" autoComplete="off" value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste your UQ calendar link" required /></label><button disabled={busy} type="submit">{busy ? 'Connecting…' : data.calendar ? 'Update calendar' : 'Connect'}</button></form>
      <label className="life-import">Import .ics file<input type="file" accept=".ics,text/calendar" disabled={busy} onChange={e => { const file = e.target.files[0]; if (file) attempt(() => connect(file)); e.target.value = ''; }} /></label>
      {data.calendar && <button className="life-danger" onClick={() => { remove(); setMessage('Calendar removed'); }}>Remove calendar</button>}
      <details className="life-help"><summary>About calendar sync</summary><p>UQ HTTPS and webcal subscriptions refresh every 30 minutes while open. Imported files are snapshots. Times use Brisbane.</p></details>
    </div></details>
    <details name="life-settings" className="life-setting-group" open={section === 'steps' || undefined}><summary><span><Footprints size={18} /><span>Steps<small>{health?.enabled ? 'Apple Health' : 'Manual entry'} · {data.goal.toLocaleString()} goal</small></span></span><ChevronRight size={16} /></summary><div className="life-setting-body">
      {hasNativeHealth() ? <div className="life-health"><strong>Apple Health</strong><p className="life-muted">{health?.message ?? 'Read steps from your iPhone.'}</p><button onClick={() => attempt(() => syncHealth(health?.enabled ? 'sync' : 'connect'))}>{health?.enabled ? 'Refresh steps' : 'Connect Apple Health'}</button>{health?.enabled && <button className="life-danger" onClick={() => attempt(() => syncHealth('disconnect'))}>Disconnect</button>}</div> : <p className="life-muted">Apple Health works in the native iPhone app.</p>}
      <form onSubmit={e => { e.preventDefault(); attempt(() => update(old => ({ ...old, goal: stepValue(goal, true) }))); }}><label>Daily goal<input type="number" min="1" max="100000" step="1" required value={goal} onChange={e => setGoal(e.target.value)} /></label><button type="submit">Save goal</button></form>
      <details className="life-manual"><summary>Add steps manually</summary><form onSubmit={e => { e.preventDefault(); attempt(() => { const value = stepValue(steps); if (!entryDate || entryDate > dayKey()) throw new Error('Choose today or a past date.'); update(old => ({ ...old, steps: { ...old.steps, [entryDate]: { value, updatedAt: Date.now(), source: 'manual' } } })); }); }}><label>Date<input type="date" required max={dayKey()} value={entryDate} onChange={e => { setEntryDate(e.target.value); setSteps(data.steps[e.target.value]?.value ?? ''); }} /></label><label>Steps<input type="number" min="0" max="100000" step="1" required value={steps} onChange={e => setSteps(e.target.value)} /></label><button type="submit">Save steps</button></form></details>
      <p className="life-muted">Last update · {synced(data.steps[dayKey()]?.updatedAt)}</p>
    </div></details>
    <details name="life-settings" className="life-setting-group"><summary><span>Privacy & data</span><ChevronRight size={16} /></summary><div className="life-setting-body"><p className="life-muted">Calendar links and manual steps stay in this browser. Keep your calendar link private. Apple Health totals stay in memory in the iPhone app and aren’t uploaded.</p><button className="life-danger" onClick={() => setConfirmClear(true)}>Clear dashboard data</button>{confirmClear && <div><p>Remove your calendar, steps and goal?</p><button className="life-danger" onClick={() => attempt(async () => { await clear(); setGoal(10000); setSteps(''); setUrl(''); setConfirmClear(false); })}>Clear data</button><button onClick={() => setConfirmClear(false)}>Cancel</button></div>}</div></details>
    <p className="life-form-message" role="status">{message}</p>
  </div>;
}
export default function LifeDashboard() {
  const [data, setData] = useState(loadLife);
  const [sheet, setSheet] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [health, setHealth] = useState(null);
  const generation = useRef(0);
  const controller = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  function update(change) {
    const next = typeof change === 'function' ? change(dataRef.current) : change;
    dataRef.current = next; setData(next);
    try { localStorage.setItem(LIFE_KEY, JSON.stringify(persistableLife(next))); setStorageError(''); }
    catch { setStorageError('Changes could not be saved on this device.'); }
  }
  async function connect(value) {
    const id = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController();
    const activeController = controller.current;
    const timeout = setTimeout(() => activeController.abort(), 15000);
    setBusy(true); setError('');
    try {
      const calendar = typeof value === 'string' ? await syncSubscription(value, activeController.signal) : await importCalendar(value);
      if (id === generation.current) update(old => ({ ...old, calendar }));
    } catch (e) {
      if (id === generation.current) { const message = e.name === 'AbortError' ? 'Calendar sync timed out. Try again.' : e.message; setError(message); throw new Error(message); }
    } finally { clearTimeout(timeout); if (id === generation.current) setBusy(false); }
  }
  function refresh() { const calendar = dataRef.current.calendar; if (calendar?.source === 'subscription') connect(calendar.url).catch(() => {}); }
  async function syncHealth(action = 'sync') {
    const payload = await nativeHealth(action);
    setHealth(payload);
    const next = { ...dataRef.current, steps: mergeHealthSteps(dataRef.current.steps, payload) };
    dataRef.current = next; setData(next);
  }
  function remove(clear = false) {
    generation.current++; controller.current?.abort(); setBusy(false); setError('');
    update(clear ? { ...EMPTY_LIFE, steps: {} } : old => ({ ...old, calendar: null }));
    if (clear) { try { localStorage.removeItem(LIFE_KEY); } catch { setStorageError('Clear this site’s data in browser settings.'); } }
  }
  useEffect(() => {
    let active = true;
    const readHealth = async () => { if (hasNativeHealth() && active) { try { await syncHealth(); } catch { if (active) setHealth({ message: 'Could not read Apple Health. Try again in Settings.' }); } } };
    readHealth();
    const calendar = dataRef.current.calendar;
    if (calendar?.source === 'subscription') refresh();
    else if (calendar?.source === 'file' && calendar.text) {
      try { update(old => ({ ...old, calendar: { ...calendar, ...parseCalendar(calendar.text) } })); } catch (e) { setError(e.message); }
    }
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const sync = setInterval(refresh, 30 * 60000);
    const healthTimer = setInterval(() => { if (document.visibilityState === 'visible') readHealth(); }, 60000);
    const onVisible = () => { setNow(Date.now()); if (document.visibilityState === 'visible') { readHealth(); if (Date.now() - (dataRef.current.calendar?.syncedAt ?? 0) > 30 * 60000) refresh(); } };
    const onStorage = event => { if (event.key === LIFE_KEY || event.key === null) { generation.current++; controller.current?.abort(); setBusy(false); const next = loadLife(); dataRef.current = next; setData(next); readHealth(); } };
    document.addEventListener('visibilitychange', onVisible); window.addEventListener('storage', onStorage);
    return () => { active = false; generation.current++; controller.current?.abort(); clearInterval(tick); clearInterval(sync); clearInterval(healthTimer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('storage', onStorage); };
  }, []);
  const events = data.calendar?.events ?? [];
  const current = events.filter(e => e.start <= now && e.end > now);
  const upcoming = events.filter(e => e.start > now);
  const today = upcoming.filter(e => dayKey(e.start) === dayKey(now));
  return <section className="life-dashboard" aria-label="Personal dashboard"><div className="campus-trip-head"><span>Your day</span><button className="life-icon-button" aria-label="Dashboard settings" onClick={() => setSheet('settings')}><Settings size={17} /></button></div>
    {(error || storageError) && <button className="life-sync-notice" onClick={() => setSheet('settings')}>Sync needs attention <ChevronRight size={12} /></button>}
    <div className="life-cards"><NextClassCard calendar={data.calendar} now={now} open={() => setSheet(data.calendar ? 'classes' : 'calendar')} /><DailyStepsCard record={data.steps[dayKey(now)]} goal={data.goal} open={() => setSheet('steps')} /></div>
    <WeeklyActivityChart records={data.steps} goal={data.goal} now={now} open={() => setSheet('activity')} />
    {sheet && <Sheet title={sheet === 'classes' ? 'Your classes' : sheet === 'activity' ? 'Weekly activity' : 'Settings'} close={() => setSheet(null)}>
      {(error || storageError) && <p className="life-error" role="alert">{error || storageError}</p>}
      {sheet === 'classes' ? <div className="life-class-list">{current.map(e => <ClassDetail key={e.id} event={e} label="In progress" />)}{(today.length ? today : upcoming.slice(0, 1)).map((e, index) => <ClassDetail key={e.id} event={e} label={index === 0 ? 'Up next' : 'Later today'} />)}{!current.length && !upcoming.length && <p>No upcoming classes.</p>}<footer><small>Synced · {synced(data.calendar?.syncedAt)}</small>{data.calendar?.source === 'subscription' && <button className="life-icon-button" disabled={busy} onClick={refresh} aria-label="Refresh calendar"><RefreshCw size={16} /></button>}<button className="life-link" onClick={() => setSheet('calendar')}>Manage calendar</button></footer></div>
      : sheet === 'activity' ? <div className="life-activity-list"><p className="life-muted">Daily goal · {data.goal.toLocaleString()}</p>{weekSteps(data.steps, now).map(day => <div key={day.date}><span>{day.label}<small>{day.date}</small></span><strong>{day.steps == null ? '—' : day.steps.toLocaleString()}</strong></div>)}<button className="life-link" onClick={() => setSheet('steps')}>Manage steps</button></div>
      : <CalendarConnectionSettings key={sheet} data={data} update={update} connect={connect} busy={busy} remove={() => remove()} clear={async () => { if (hasNativeHealth()) await syncHealth('disconnect'); remove(true); }} section={sheet} health={health} syncHealth={syncHealth} />}
    </Sheet>}
  </section>;
}
