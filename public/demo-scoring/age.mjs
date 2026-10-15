// Calendar policy copied from the isolated scoring/engine.mjs for browser parity.
export const ENGINE_VERSION = '1.0.0';
function parseDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s))
    throw new Error('Dates must be YYYY-MM-DD');
  const d = new Date(s + 'T00:00:00Z');
  if (Number(s.slice(0, 4)) < 1 || !Number.isFinite(+d) || d.toISOString().slice(0, 10) !== s)
    throw new Error('Invalid calendar date');
  return d;
}
function addMonths(d, n) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
  const out = new Date(0);
  out.setUTCFullYear(y, m, 1);
  out.setUTCHours(0, 0, 0, 0);
  out.setUTCDate(Math.min(d.getUTCDate(),
    new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate()));
  return out;
}
export function calculateAge(dob, assessmentDate) {
  const birth = parseDate(dob), end = parseDate(assessmentDate);
  if (end < birth) throw new Error('Assessment precedes birth');
  let years = end.getUTCFullYear() - birth.getUTCFullYear();
  let yearAnchor = addMonths(birth, years * 12);
  if (yearAnchor > end) { years--; yearAnchor = addMonths(birth, years * 12); }
  let months = (end.getUTCFullYear() - yearAnchor.getUTCFullYear()) * 12 +
    end.getUTCMonth() - yearAnchor.getUTCMonth();
  if (addMonths(yearAnchor, months) > end) months--;
  const days = Math.round((end - addMonths(yearAnchor, months)) / 86400000);
  return { years, months, days, totalMonths: years * 12 + months,
    totalDays: Math.round((end - birth) / 86400000), policy: 'calendar-clamped-v1' };
}
