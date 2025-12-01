// -----------------------------
// UTC-safe helpers 
// -----------------------------

export function formatInZone(isoUtc, timeZone, opts) {
  const d = new Date(isoUtc); // must be ...Z or have offset
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    ...(opts || { dateStyle: 'medium', timeStyle: 'short' }),
  }).format(d);
}

export function formatLocal(isoUtc, opts) {
  const d = new Date(isoUtc);
  return new Intl.DateTimeFormat(undefined, {
    ...(opts || { dateStyle: 'medium', timeStyle: 'short' }),
  }).format(d);
}

export function isoFromLocalWallClock(dateYmd, hhmm, timeZone) {
  const [H, M] = hhmm.split(':').map(Number);

  const containerUtc = new Date(Date.UTC(
    Number(dateYmd.slice(0, 4)),
    Number(dateYmd.slice(5, 7)) - 1,
    Number(dateYmd.slice(8, 10)),
    H, M, 0, 0
  ));

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).formatToParts(containerUtc).reduce((acc, p) => (acc[p.type] = p.value, acc), {});

  const fakeLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`);
  const offsetMin = Math.round((fakeLocal.getTime() - containerUtc.getTime()) / 60000);

  const sign = offsetMin <= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offH = String(Math.floor(abs / 60)).padStart(2, '0');
  const offM = String(abs % 60).padStart(2, '0');

  return `${dateYmd}T${hhmm}:00${sign}${offH}:${offM}`;
}

export function localWallClockToUtcIso(dateYmd, hhmm, timeZone) {
  const withOffset = isoFromLocalWallClock(dateYmd, hhmm, timeZone);   // "…-05:00"
  const d = new Date(withOffset);
  return d.toISOString(); 
}

export function isSameSalonLocalDate(isoUtc, dateYmd, timeZone) {
  const d = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
  const localYmd = `${parts.year}-${parts.month}-${parts.day}`;
  return localYmd === dateYmd;
}

export function cmpUtc(aIso, bIso) {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function todayYmdInZone(timeZone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((a, p) => (a[p.type] = p.value, a), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

