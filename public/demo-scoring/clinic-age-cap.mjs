// User-requested clinic protocol. Its age caps and routing are not validated Vineland rules.
import { estimatedInterpretation } from './reference-engine.mjs';

export const CLINIC_AGE_CAP_PROTOCOL = 'clinic-age-cap-v1';
export const CLINIC_AGE_CAP_VERSION = '1.0.0';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const boundaryFor = (section, years) => {
  const markers = [...(section.starts ?? [])];
  for (const marker of markers)
    assert(Number.isInteger(marker.years?.[0]) && Number.isInteger(marker.item) &&
      marker.item >= 1 && marker.item <= section.items.length, 'Invalid instrument age marker');
  markers.sort((a, b) => a.years[0] - b.years[0]);
  const selected = markers.filter((marker) => marker.years[0] <= years).at(-1);
  const following = markers.find((marker) => marker.years[0] > years);
  const startNumber = selected?.item ?? 1;
  const endNumber = Math.min((following?.item ?? section.items.length + 1) - 1, section.items.length);
  assert(endNumber >= startNumber, 'Invalid instrument age boundary');
  return {
    startNumber,
    endNumber,
    label: selected?.label ?? 'Before first supplied age marker',
    sourcePage: selected?.sourcePage ?? null,
  };
};

/** Route an explicitly selected, chronological age-capped clinic administration. */
export function routeClinicAgeCap(section, age, answers = {}, estimated = {}) {
  assert(section && Array.isArray(section.items) && section.items.length &&
    typeof section.scoreId === 'string', 'Instrument section required');
  assert(age && Number.isInteger(age.years) && age.years >= 0, 'Valid chronological age required');
  assert(answers && typeof answers === 'object' && !Array.isArray(answers), 'Answer map required');
  assert(estimated && typeof estimated === 'object' && !Array.isArray(estimated), 'Estimated map required');

  const ageBoundary = boundaryFor(section, age.years);
  const { startNumber, endNumber } = ageBoundary;
  const entries = section.items.map((item, index) => {
    const entered = own(answers, item.id);
    const value = answers[item.id];
    if (entered)
      assert(Number.isInteger(value) && (item.allowedScores ?? [0, 1, 2]).includes(value),
        'Invalid score for ' + item.id);
    assert(estimated[item.id] === undefined || typeof estimated[item.id] === 'boolean',
      'Invalid estimated flag');
    const excluded = index >= endNumber;
    return {
      id: item.id,
      number: index + 1,
      enteredScore: entered ? value : null,
      effectiveScore: excluded ? 0 : entered ? value : null,
      state: excluded ? entered ? 'entered-age-excluded' : 'age-excluded' : entered ? 'entered' : 'untouched',
      estimated: !excluded && entered && estimated[item.id] === true,
    };
  });
  const inCap = entries.slice(0, endNumber);
  const runs = (score) => {
    const found = [];
    for (let index = 0; index < inCap.length;) {
      if (inCap[index].enteredScore !== score) { index++; continue; }
      let last = index;
      while (last + 1 < inCap.length && inCap[last + 1].enteredScore === score) last++;
      if (last - index + 1 >= 4) found.push({ start: index, end: last });
      index = last + 1;
    }
    return found;
  };
  const basalRuns = runs(2);
  const ceilingRuns = runs(0);
  const basal = basalRuns.at(-1) ?? null;
  const ceiling = ceilingRuns[0] ?? null;
  const conflict = Boolean(basal && ceiling && basal.end >= ceiling.start);
  const adjustedItems = [];
  if (!conflict) {
    if (basal)
      for (let index = 0; index < basal.start; index++) {
        const entry = inCap[index];
        if (entry.enteredScore !== null && entry.enteredScore !== 2) adjustedItems.push(entry.id);
        entry.effectiveScore = 2;
        entry.state = entry.enteredScore === null ? 'inferred-basal' :
          entry.enteredScore === 2 ? 'entered' : 'entered-basal-adjusted';
      }
    if (ceiling)
      for (let index = ceiling.end + 1; index < inCap.length; index++) {
        const entry = inCap[index];
        if (entry.enteredScore !== null && entry.enteredScore !== 0) adjustedItems.push(entry.id);
        entry.effectiveScore = 0;
        entry.state = entry.enteredScore === null ? 'inferred-ceiling' :
          entry.enteredScore === 0 ? 'entered' : 'entered-ceiling-adjusted';
      }
  }

  // Routing is determined from observations, before any boundary credits. In particular,
  // a zero run met while reversing never terminates the search for a lower basal.
  const band = inCap.slice(startNumber - 1);
  const lowerUnanswered = inCap.slice(0, startNumber - 1).filter((entry) => entry.effectiveScore === null);
  const bandHasCeiling = ceiling !== null && ceiling.start >= startNumber - 1;
  const bandExhausted = band.every((entry) => entry.enteredScore !== null);
  const reverse = !basal && lowerUnanswered.length > 0 && (bandHasCeiling || bandExhausted ||
    inCap.slice(0, startNumber - 1).some((entry) => entry.enteredScore !== null));
  const missing = inCap.filter((entry) => entry.effectiveScore === null).map((entry) => entry.id);
  const warnings = [];
  if (basalRuns.length > 1 || ceilingRuns.length > 1)
    warnings.push({ code: 'multiple-runs', message: 'Highest observed basal and lowest observed ceiling selected within the age cap.' });
  if (entries.slice(endNumber).some((entry) => entry.enteredScore !== null))
    warnings.push({ code: 'age-excluded-observations', message: 'Entered responses above the chronological age cap were preserved but excluded from scoring and routing.' });
  if (conflict)
    warnings.push({ code: 'administration-conflict', message: 'The selected ceiling precedes the selected basal within the age cap; review entered observations.' });
  if (startNumber === 1 && !section.starts?.some((marker) => marker.years?.[0] <= age.years))
    warnings.push({ code: 'start-at-first-item', message: 'No matching supplied start marker; administer from item 1.' });

  let status = 'complete';
  let nextItem = null;
  if (conflict) status = 'needs-review';
  else if (!basal && reverse) {
    status = 'reverse';
    nextItem = lowerUnanswered.at(-1).id;
  } else if (missing.length) {
    status = basal ? 'continue' : 'findbasal';
    nextItem = (!basal ? band.find((entry) => entry.effectiveScore === null) : null)?.id ?? missing[0];
  }

  const answeredCount = inCap.filter((entry) => entry.enteredScore !== null).length;
  const estimatedCount = inCap.filter((entry) => entry.estimated).length;
  const allInCapAdministered = answeredCount === endNumber;
  const routeBoundary = (run) => run ? {
    start: entries[run.start].id,
    end: entries[run.end].id,
    startNumber: run.start + 1,
    endNumber: run.end + 1,
  } : null;
  return {
    subdomain: section.scoreId,
    protocolId: CLINIC_AGE_CAP_PROTOCOL,
    status,
    nextItem,
    startItem: entries[startNumber - 1].id,
    startNumber,
    startSource: section.starts?.find((marker) => marker.item === startNumber && marker.years?.[0] <= age.years)
      ? { label: ageBoundary.label, pdfPage: ageBoundary.sourcePage } : null,
    ageBoundary,
    basal: routeBoundary(basal),
    ceiling: routeBoundary(ceiling),
    raw: conflict || missing.length ? null : inCap.reduce((sum, entry) => sum + entry.effectiveScore, 0),
    observedRaw: allInCapAdministered ? inCap.reduce((sum, entry) => sum + entry.enteredScore, 0) : null,
    clinicalReady: false,
    administrationEvidence: {
      method: 'custom-clinic-age-cap',
      verified: false,
      operationallyComplete: !conflict && missing.length === 0,
      reasons: conflict ? ['basal-ceiling-order-conflict'] : missing.length ? ['missing-in-cap-items'] : [],
      source: { id: 'user-requested-clinic-protocol', protocolId: CLINIC_AGE_CAP_PROTOCOL },
      scope: 'Custom chronological age-capped administration; no claim of validated Vineland administration or clinical readiness.',
      adjustedItems,
      basalRunCount: basalRuns.length,
      ceilingRunCount: ceilingRuns.length,
    },
    items: entries,
    missing,
    answeredCount,
    estimatedCount,
    percentEstimated: answeredCount ? (estimatedCount / answeredCount) * 100 : null,
    estimatedDenominator: 'entered-in-cap-items',
    interpretation: estimatedInterpretation(estimatedCount, answeredCount),
    warnings,
    policy: {
      id: CLINIC_AGE_CAP_PROTOCOL,
      version: CLINIC_AGE_CAP_VERSION,
      basalCount: 4,
      ceilingCount: 4,
      basalSelection: 'highest-numbered-maximal-in-cap-run',
      ceilingSelection: 'lowest-numbered-maximal-in-cap-run',
      credit: '2-through-basal-end;0-from-ceiling-start;0-above-age-cap;original-observations-preserved',
      startSelection: 'latest-supplied-lower-age-bound',
      ageCapSelection: 'item-before-next-supplied-age-marker-or-last-item',
      reviewStatus: 'custom-user-requested-unvalidated',
      source: { id: 'user-requested-clinic-protocol', protocolId: CLINIC_AGE_CAP_PROTOCOL },
    },
  };
}
