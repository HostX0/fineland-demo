// Isolated public browser port of the current reference scorer, authorized for this demo.
import { calculateAge, ENGINE_VERSION } from './age.mjs';
const reference = globalThis.FinelandReferenceData;
if (!reference) throw new Error('Reference table has not loaded');
export const REFERENCE_HASH = '64aea6e0f04a505cdf8334abfd598f691463c38369c7266dac6310843767fe13';
const domains = {
  COM: ['REC', 'EXP', 'WRN'],
  DLS: ['PER', 'DOM', 'CMY'],
  SOC: ['IPR', 'PLA', 'COP'],
  MOT: ['GRO', 'FIN'],
};
const names = {
  REC: 'Receptive',
  EXP: 'Expressive',
  WRN: 'Written',
  PER: 'Personal',
  DOM: 'Domestic',
  CMY: 'Community',
  IPR: 'Interpersonal Relationships',
  PLA: 'Play and Leisure',
  COP: 'Coping Skills',
  GRO: 'Gross Motor',
  FIN: 'Fine Motor',
};
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
// Reject malformed reference age bounds rather than silently ignoring extra coordinates.
for (const group of ['vScale', 'standard', 'maladaptive', 'comparisons'])
  for (const table of reference[group])
    for (const endpoint of ['min', 'max']) {
      const a = table.age[endpoint];
      assert(Array.isArray(a) && a.length === 3 && a.every(Number.isInteger) &&
        a[0] >= 0 && a[1] >= 0 && a[1] <= 11 && a[2] >= 0 && a[2] <= 30,
      'Malformed reference age bound');
    }
const akey = (a) => a[0] * 372 + a[1] * 31 + a[2];
const atAge = (a, range) => akey(a) >= akey(range.min) && akey(a) <= akey(range.max);
const select = (tables, a) => {
  const hits = tables.filter((t) => atAge(a, t.age));
  assert(hits.length === 1, 'Unsupported or ambiguous age for table');
  return hits[0];
};
const adaptiveLevel = (value, type) => {
  const limits =
    type === 'v'
      ? [
          [9, 'Low'],
          [12, 'Moderately Low'],
          [17, 'Adequate'],
          [20, 'Moderately High'],
          [24, 'High'],
        ]
      : [
          [70, 'Low'],
          [85, 'Moderately Low'],
          [114, 'Adequate'],
          [129, 'Moderately High'],
          [140, 'High'],
        ];
  return limits.find(([max]) => value <= max)?.[1] ?? null;
};
const provenance = (table, page) => ({
  source: 'pearson-appendices-b-e-2016',
  sourceHash: reference.source.sha256,
  table,
  pdfPage: page,
});
const manualSource = (pages) => ({
  id: 'vineland3-manual-chapter3-public-scan',
  url: 'https://www.scribd.com/document/913892769/Vineland-3-Manual-Chapter-3-Abridged',
  printedPages: pages,
  provenance: 'Original manual excerpt, third-party-hosted scan; page content and appendix mapping crosschecked, not publisher-hosted or externally authenticated',
});
export function estimatedInterpretation(estimatedCount, answeredCount) {
  if (estimatedCount === undefined || answeredCount === undefined)
    return { status: 'unknown', eligible: false, percentEstimated: null, source: manualSource([47]) };
  assert(Number.isInteger(estimatedCount) && Number.isInteger(answeredCount) &&
    answeredCount >= 0 && estimatedCount >= 0 && estimatedCount <= answeredCount, 'Invalid estimated-response counts');
  if (answeredCount === 0)
    return { status: 'unknown', eligible: false, percentEstimated: null, source: manualSource([47]) };
  const percentEstimated = estimatedCount / answeredCount * 100;
  // Compare integer counts to avoid rounding 14.999... or 24.999... over a boundary.
  const status = estimatedCount * 100 >= answeredCount * 25 ? 'do-not-interpret' :
    estimatedCount * 100 >= answeredCount * 15 ? 'caution' : 'probably-not-compromised';
  return { status, eligible: status !== 'do-not-interpret', percentEstimated,
    estimatedCount, answeredCount, denominator: 'entered-items', source: manualSource([47]) };
}

/** Adds interpretation reliability without removing source-based numerical review values.
 * Mutates only this freshly computed result; original item observations remain separate.
 */
export function applyEstimatedInterpretation(result, administration = {}) {
  const sections = {};
  const targets = { ...result.subdomains, ...result.maladaptive };
  const suppress = (row, interpretation, fields) => {
    row.interpretation = interpretation;
    if (interpretation.status === 'do-not-interpret')
      for (const field of fields)
        if (row[field] !== undefined && row[field] !== null) {
          row.reviewValues ??= {};
          row.reviewValues[field] = row[field];
          row[field] = null;
        }
  };
  for (const [id, row] of Object.entries(targets)) {
    const route = administration[id];
    sections[id] = estimatedInterpretation(route?.estimatedCount, route?.answeredCount);
    suppress(row, sections[id], ['level']);
  }
  const rank = { 'probably-not-compromised': 0, unknown: 1, caution: 2, 'do-not-interpret': 3 };
  const aggregate = (ids, evidence) => {
    const status = ids.reduce((state, id) => rank[evidence[id]?.status ?? 'unknown'] > rank[state] ?
      evidence[id]?.status ?? 'unknown' : state, 'probably-not-compromised');
    return { status, eligible: ids.length > 0 && ids.every((id) => evidence[id]?.eligible === true), dependencies: ids,
      policy: 'propagate-affected-input-reliability', source: manualSource([47]) };
  };
  const domainEvidence = {};
  for (const [id, row] of Object.entries(result.domains)) {
    const members = domains[id].filter((member) => own(result.subdomains, member));
    domainEvidence[id] = aggregate(members, sections);
    if (row) suppress(row, domainEvidence[id], ['level']);
  }
  const abc = aggregate(['COM', 'DLS', 'SOC'], domainEvidence);
  if (result.abc) suppress(result.abc, abc, ['level']);
  for (const analysis of result.analyses) {
    const evidence = analysis.type === 'domain' ? domainEvidence : sections;
    const ids = analysis.kind === 'strength'
      ? Object.keys(analysis.type === 'domain' ? result.domains : result.subdomains)
      : [analysis.left, analysis.right];
    suppress(analysis, aggregate(ids, evidence), ['classification', 'significant', 'baseRate']);
  }
  const doNotInterpretSections = Object.keys(sections).filter((id) => sections[id].status === 'do-not-interpret');
  result.interpretationReliability = {
    sections, domains: domainEvidence, abc,
    status: aggregate(Object.keys(sections), sections).status,
    eligible: aggregate(Object.keys(sections), sections).eligible,
    doNotInterpretSections,
    considerDiscontinuing: doNotInterpretSections.length >= 2,
    guidance: doNotInterpretSections.length >= 2
      ? 'Two or more sections have at least 25% estimated answers; the manual says the examiner may discontinue scoring and seek a more knowledgeable informant. This is not an automatic blanket rejection.'
      : null,
  };
  result.interpretationEligible = result.completeness.complete && result.interpretationReliability.eligible;
  if (doNotInterpretSections.length)
    result.warnings.push({ path: 'interpretation', message: 'Do not interpret affected sections or dependent results; numerical values are retained for review only.', sections: doNotInterpretSections });
  return result;
}
export function referenceCatalog() {
  return {
    id: reference.id,
    version: reference.version,
    packageHash: REFERENCE_HASH,
    synthetic: false,
    status: reference.status,
    edition: reference.edition,
    form: reference.form,
    level: reference.level,
    normSet: reference.normSet,
    subdomains: Object.entries(reference.maxRaw).map(([id, maxRaw]) => ({
      id,
      name: names[id],
      itemCount: maxRaw / 2,
      maxRaw,
      domain: Object.keys(domains).find((d) => domains[d].includes(id)),
    })),
    agePolicies: ['calendar-clamped-v1'],
    tableCounts: {
      vScaleAgeBands: reference.vScale.length,
      aeGsvRows: reference.aeGsv.length,
      standardAgeBands: reference.standard.length,
      maladaptiveAgeBands: reference.maladaptive.length,
      comparisonRows: reference.comparisons.length,
    },
    confidenceLevels: [85, 90, 95],
    significanceLevels: [0.05, 0.1],
    source: reference.source,
  };
}
function compare(a, kind, type, left, right, difference, alpha, reversed = false) {
  const direction = difference < 0 ? 'negative' : 'positive';
  const rs = reference.comparisons.filter(
    (r) =>
      r.kind === kind &&
      r.type === type &&
      atAge(a, r.age) &&
      (kind === 'strength'
        ? r.target === left
        : r.left === left && r.right === right && r.direction === direction),
  );
  // B.5/B.6 order is fixed in the source. Reverse an explicitly stored comparison if needed.
  if (!rs.length && kind === 'pairwise' && !reversed) {
    const reverse = compare(a, kind, type, right, left, -difference, alpha, true);
    return { ...reverse, left, right, difference, direction };
  }
  assert(rs.length === 1, `Missing/ambiguous ${kind} statistics for ${left}/${right}`);
  const r = rs[0];
  const critical = r.critical[alpha],
    magnitude = Math.abs(difference);
  assert(Number.isFinite(critical), 'Unsupported significance level');
  const base = Object.entries(r.baseRates)
    .filter(([, min]) => min !== null && magnitude >= min)
    .sort(([a], [b]) => Number(a) - Number(b))[0];
  return {
    kind,
    type,
    left,
    right,
    difference,
    direction,
    alpha: Number(alpha),
    critical,
    significant: magnitude >= critical,
    classification: magnitude >= critical ? (difference < 0 ? 'weakness' : 'strength') : 'not-significant',
    baseRate: base ? '≤' + base[0] + '%' : '>25%',
    ...provenance(r.table, r.pdfPage),
  };
}
/** Draft numerical conversion remains available; computational completion is not clinical readiness. */
export function scoreReference(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'Assessment object required');
  for (const [key, value] of Object.entries({
    edition: 'Vineland-3',
    form: 'Interview',
    level: 'Comprehensive',
    normSet: 'US-2016',
  }))
    assert(input[key] === undefined || input[key] === value, 'Unsupported assessment identity ' + key);
  assert(
    input.packageHash === undefined || input.packageHash === REFERENCE_HASH,
    'Reference package hash mismatch',
  );
  for (const key of ['includeMotor', 'includeMaladaptive'])
    assert(input[key] === undefined || typeof input[key] === 'boolean', 'Invalid option ' + key);
  const age = calculateAge(input.dob, input.assessmentDate),
    a = [age.years, age.months, age.days];
  const vtable = select(reference.vScale, a),
    stable = select(reference.standard, a);
  const issues = [],
    warnings = [],
    subdomains = {},
    domainResults = {},
    analyses = [],
    maladaptive = {},
    critical = [];
  const motor = input.includeMotor === true;
  const ids = Object.keys(vtable.rows).filter((id) => motor || !['GRO', 'FIN'].includes(id));
  if (motor && !own(vtable.rows, 'GRO'))
    issues.push({
      path: 'domains.MOT',
      message: 'Motor norms are unavailable for this age; no extrapolation performed',
    });
  assert(
    input.rawScores && typeof input.rawScores === 'object' && !Array.isArray(input.rawScores),
    'rawScores object required',
  );
  for (const id of Object.keys(input.rawScores))
    assert(ids.includes(id), 'Unknown, inactive or unselected subdomain ' + id);
  for (const id of ids) {
    const raw = input.rawScores[id];
    if (raw === undefined) {
      issues.push({ path: 'subdomains.' + id, message: 'Raw score missing' });
      subdomains[id] = { raw: null, vScale: null, ae: null, gsv: null };
      continue;
    }
    assert(Number.isInteger(raw) && raw >= 0 && raw <= reference.maxRaw[id], 'Invalid raw score ' + id);
    assert(own(vtable.rows[id], String(raw)), 'Raw score absent from source table ' + id);
    const v = vtable.rows[id][raw],
      ag = reference.aeGsv.find((r) => r.target === id && r.raw === raw);
    assert(ag, 'AE/GSV source lookup absent');
    subdomains[id] = {
      raw,
      vScale: v,
      ae: ag.ae,
      gsv: ag.gsv,
      level: adaptiveLevel(v, 'v'),
      sources: [provenance('B.1', vtable.pdfPage), provenance('B.2', ag.pdfPage)],
    };
  }
  const confidence = String(input.confidenceLevel ?? 90);
  assert(['85', '90', '95'].includes(confidence), 'Unsupported confidence level');
  const standard = (id, sum) => {
    assert(own(stable.rows[id], String(sum)), 'Sum absent from source standard table ' + id + '/' + sum);
    const row = stable.rows[id][sum],
      width = stable.ciWidths[id]?.[confidence];
    assert(Number.isInteger(width), 'CI width absent');
    const ci = [row.standardScore - width, row.standardScore + width];
    if (ci[0] < 20 || ci[1] > 140)
      warnings.push({
        path: id + '.ci',
        message:
          'Arithmetic CI extends beyond standard-score scale; not clipped because boundary convention has not been independently established',
      });
    return {
      sum,
      standardScore: row.standardScore,
      percentile: row.percentile,
      confidenceLevel: Number(confidence),
      ci,
      ciWidth: width,
      ciPolicy: 'source-width-plus-minus-unclipped',
      level: adaptiveLevel(row.standardScore, 'ss'),
      sources: [provenance('B.3', row.pdfPage), provenance('B.3-CI', stable.pdfPages[2])],
    };
  };
  for (const [id, members] of Object.entries(domains)) {
    if (id === 'MOT' && !motor) continue;
    const active = members.filter((x) => ids.includes(x)),
      vs = active.map((x) => subdomains[x]?.vScale);
    if (active.length && vs.every(Number.isFinite))
      domainResults[id] = standard(
        id,
        vs.reduce((a, b) => a + b, 0),
      );
    else {
      domainResults[id] = null;
      issues.push({ path: 'domains.' + id, message: 'Domain inputs incomplete' });
    }
  }
  const core = ['COM', 'DLS', 'SOC'].map((id) => domainResults[id]?.standardScore);
  const abc = core.every(Number.isFinite)
    ? standard(
        'ABC',
        core.reduce((a, b) => a + b, 0),
      )
    : null;
  if (!abc) issues.push({ path: 'abc', message: 'COM, DLS and SOC are required; Motor is excluded' });
  const alphaValue = Number(input.alpha ?? 0.1);
  assert([0.05, 0.10].includes(alphaValue), 'Unsupported significance level');
  const alpha = alphaValue.toFixed(2);
  for (const type of ['domain', 'subdomain']) {
    const entries = Object.entries(type === 'domain' ? domainResults : subdomains);
    if (
      !entries.length ||
      entries.some(([, r]) => !Number.isFinite(type === 'domain' ? r?.standardScore : r?.vScale))
    )
      continue;
    const value = (r) => (type === 'domain' ? r.standardScore : r.vScale);
    const mean = Number((entries.reduce((sum, [, r]) => sum + value(r), 0) / entries.length).toFixed(1));
    // The supplied sample requires one-decimal mean/difference: FIN -2.1 reaches B.4 2.1 (<=25%).
    for (const [id, r] of entries)
      analyses.push({
        ...compare(a, 'strength', type, id, 'mean', Number((value(r) - mean).toFixed(1)), alpha),
        mean,
        displayDifference: Number((value(r) - mean).toFixed(1)),
      });
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++)
        analyses.push(
          compare(
            a,
            'pairwise',
            type,
            entries[i][0],
            entries[j][0],
            value(entries[i][1]) - value(entries[j][1]),
            alpha,
          ),
        );
  }
  if (input.includeMaladaptive) {
    if (age.years < 3) issues.push({ path: 'maladaptive', message: 'E.1 norms begin at age 3' });
    else {
      const mt = select(reference.maladaptive, a);
      for (const id of Object.keys(input.maladaptiveRaw ?? {}))
        assert(['internalizing', 'externalizing'].includes(id), 'Unknown maladaptive scale');
      for (const id of ['internalizing', 'externalizing']) {
        const raw = input.maladaptiveRaw?.[id];
        if (raw === undefined) {
          issues.push({ path: 'maladaptive.' + id, message: 'Raw score missing' });
          continue;
        }
        assert(
          Number.isInteger(raw) && raw >= 0 && own(mt.rows[id], String(raw)),
          'Invalid maladaptive raw ' + id,
        );
        const v = mt.rows[id][raw];
        maladaptive[id] = {
          raw,
          vScale: v,
          level: v <= 17 ? 'Average' : v <= 20 ? 'Elevated' : 'Clinically Significant',
          sources: [provenance('E.1', mt.pdfPage)],
        };
      }
    }
    for (const [id, response] of Object.entries(input.critical ?? {})) {
      assert(/^(?:[1-9]|1[0-9]|20)$/.test(id), 'Critical item id must be 1–20');
      const score = typeof response === 'object' ? response?.score : response;
      assert(Number.isInteger(score) && score >= 0 && score <= 2, 'Invalid critical item score');
      if (score > 0) critical.push({ id, score });
    }
    if (Object.keys(input.critical ?? {}).length < 20)
      warnings.push({
        path: 'critical',
        message: 'Only provided critical-item responses are shown; all 20 responses have not been supplied',
      });
  }
  warnings.push({
    path: 'review',
    message:
      'Source-based computation with US-2016 norms; independent clinical validation and Arabic adaptation equivalence have not been established',
  });
  return {
    engineVersion: ENGINE_VERSION,
    referenceEngineVersion: '1.1.0',
    packageId: reference.id,
    packageVersion: reference.version,
    packageHash: REFERENCE_HASH,
    mode: 'source-based',
    synthetic: false,
    clinicalReady: false,
    clinicalReadiness: {
      eligible: false,
      reasons: [
        { code: 'arabic-adaptation-unvalidated', path: 'identity', message: 'Equivalence of the supplied Iraqi Arabic adaptation to the US-2016 normative instrument has not been established.' },
        { code: 'age-policy-unverified', path: 'age', message: 'Calendar-clamped age calculation is explicit; the Vineland-3-specific boundary convention has not been established from the available primary sources.' },
        ...(warnings.some((w) => w.path.endsWith('.ci')) ? [{ code: 'ci-boundary-unverified', path: 'confidenceIntervals', message: 'At least one arithmetic interval exceeds the published standard-score scale; publisher boundary presentation has not been verified.' }] : []),
      ],
    },
    ageEvidence: { policy: age.policy, verified: false, tableSelection: 'inclusive-source-age-bounds' },
    reviewStatus: reference.status,
    watermark: 'Source-based calculation · pending independent clinical validation',
    age,
    ageBand: vtable.age.label,
    standardAgeBand: stable.age.label,
    identity: { edition: 'Vineland-3', form: 'Interview', level: 'Comprehensive', normSet: 'US-2016' },
    analysisPolicy: {
      meanDecimals: 1,
      differenceDecimals: 1,
      evidence:
        'Reproduces supplied Pearson Comprehensive Interview sample, including Fine Motor base rate boundary',
    },
    subdomains,
    domains: domainResults,
    abc,
    maladaptive,
    critical,
    analyses,
    completeness: { complete: issues.length === 0, issues },
    warnings,
    source: reference.source,
  };
}
export const officialSampleInput = {
  dob: '2010-04-01',
  assessmentDate: '2016-06-13',
  includeMotor: true,
  includeMaladaptive: false,
  confidenceLevel: 90,
  alpha: 0.1,
  rawScores: {
    REC: 68,
    EXP: 95,
    WRN: 28,
    PER: 87,
    DOM: 3,
    CMY: 28,
    IPR: 78,
    PLA: 51,
    COP: 29,
    GRO: 86,
    FIN: 48,
  },
};
export function routeReference(section, age, answers = {}, estimated = {}) {
  assert(section && Array.isArray(section.items) && section.items.length, 'Instrument section required');
  const items = section.items;
  const id = section.scoreId;
  assert(
    own(reference.maxRaw, id) && items.length === reference.maxRaw[id] / 2,
    'Instrument item count does not match source norm maximum',
  );
  assert(answers && typeof answers === 'object' && !Array.isArray(answers), 'Answer map required');
  assert(estimated && typeof estimated === 'object' && !Array.isArray(estimated), 'Estimated map required');
  assert(age && Number.isInteger(age.years) && age.years >= 0, 'Valid chronological age required');
  const points = (section.starts ?? [])
    .filter((s) => Number.isInteger(s.years?.[0]) && s.years[0] <= age.years)
    .sort((a, b) => b.years[0] - a.years[0]);
  const start = points[0]?.item ?? 1;
  assert(Number.isInteger(start) && start >= 1 && start <= items.length, 'Invalid instrument start point');
  const warnings = [];
  if (!points.length)
    warnings.push({
      code: 'start-at-first-item',
      message: 'No matching supplied start marker; administer from the first item.',
    });
  const entries = items.map((it, i) => {
    const value = answers[it.id];
    const entered = own(answers, it.id);
    if (entered)
      assert(
        Number.isInteger(value) && (it.allowedScores ?? [0, 1, 2]).includes(value),
        'Invalid score for ' + it.id,
      );
    assert(estimated[it.id] === undefined || typeof estimated[it.id] === 'boolean', 'Invalid estimated flag');
    return {
      id: it.id,
      number: i + 1,
      enteredScore: entered ? value : null,
      effectiveScore: entered ? value : null,
      state: entered ? 'entered' : 'untouched',
      estimated: entered && estimated[it.id] === true,
    };
  });
  const runs = (score) => {
    const result = [];
    for (let i = 0; i < entries.length; ) {
      if (entries[i].enteredScore !== score) {
        i++;
        continue;
      }
      let end = i;
      while (end + 1 < entries.length && entries[end + 1].enteredScore === score) end++;
      if (end - i + 1 >= 4) result.push({ start: i, end });
      i = end + 1;
    }
    return result;
  };
  const basalRuns = runs(2),
    ceilingRuns = runs(0),
    basal = basalRuns.at(-1) ?? null,
    ceiling = ceilingRuns[0] ?? null;
  const multipleRuns = basalRuns.length > 1 || ceilingRuns.length > 1;
  const orderingConflict = !!(basal && ceiling && basal.end >= ceiling.start);
  const adjustedItems = entries.filter((e, i) => e.enteredScore !== null &&
    ((basal && i < basal.start && e.enteredScore !== 2) ||
     (ceiling && i > ceiling.end && e.enteredScore !== 0))).map((e) => e.id);
  const conflict = orderingConflict;
  if (multipleRuns)
    warnings.push({
      code: 'multiple-runs',
      message:
        'Manual chapter 3 page 48 selects the highest basal and lowest ceiling when multiple qualifying runs occur.',
    });
  if (!conflict) {
    if (basal)
      for (let i = 0; i < basal.start; i++) {
        const e = entries[i];
        Object.assign(e, { effectiveScore: 2, state: e.enteredScore === null ? 'inferred-basal' : e.enteredScore === 2 ? 'entered' : 'entered-basal-adjusted' });
      }
    if (ceiling)
      for (let i = ceiling.end + 1; i < entries.length; i++) {
        const e = entries[i];
        Object.assign(e, { effectiveScore: 0, state: e.enteredScore === null ? 'inferred-ceiling' : e.enteredScore === 0 ? 'entered' : 'entered-ceiling-adjusted' });
      }
  }
  const missing = entries.filter((e) => e.effectiveScore === null).map((e) => e.id);
  let status = 'complete',
    nextItem = null;
  if (conflict) {
    status = 'needs-review';
    warnings.push({
      code: 'administration-conflict',
      message:
        'The selected ceiling precedes the selected basal. This ordering is unresolved; no normative raw score is issued and original observations remain available.',
    });
  } else if (missing.length) {
    if (!basal) {
      const window = entries.slice(start - 1, Math.min(start + 3, entries.length));
      const before = entries.slice(0, start - 1).filter((e) => e.enteredScore === null);
      const windowFailed =
        window.some((e) => e.enteredScore !== null && e.enteredScore !== 2) || window.length < 4;
      if (windowFailed && before.length) {
        status = 'reverse';
        nextItem = before.at(-1).id;
      } else {
        status = 'findbasal';
        nextItem = window.find((e) => e.effectiveScore === null)?.id ?? before.at(-1)?.id ?? missing[0];
      }
    } else {
      status = 'continue';
      nextItem = missing[0];
    }
  }
  const answeredCount = entries.filter((e) => e.enteredScore !== null).length,
    estimatedCount = entries.filter((e) => e.estimated).length;
  const allAdministered = answeredCount === items.length;
  const evidenceMethod = conflict ? 'conflicting-administration' : missing.length ? 'incomplete' :
    allAdministered && !adjustedItems.length ? 'complete-administered' : 'manual-basal-ceiling';
  return {
    subdomain: id,
    status,
    nextItem,
    startItem: items[start - 1].id,
    startNumber: start,
    startSource: points[0] ? { label: points[0].label, pdfPage: points[0].sourcePage } : null,
    basal: basal
      ? {
          start: items[basal.start].id,
          end: items[basal.end].id,
          startNumber: basal.start + 1,
          endNumber: basal.end + 1,
        }
      : null,
    ceiling: ceiling
      ? {
          start: items[ceiling.start].id,
          end: items[ceiling.end].id,
          startNumber: ceiling.start + 1,
          endNumber: ceiling.end + 1,
        }
      : null,
    raw: conflict || missing.length ? null : entries.reduce((sum, e) => sum + e.effectiveScore, 0),
    observedRaw: allAdministered ? entries.reduce((sum, e) => sum + e.enteredScore, 0) : null,
    clinicalReady: false,
    administrationEvidence: {
      method: evidenceMethod,
      verified: !conflict && missing.length === 0,
      reasons: conflict ? ['basal-ceiling-order-conflict'] : missing.length ? ['missing-administered-items'] : [],
      source: manualSource([48, 49]),
      scope: 'Raw-score arithmetic and administration evidence only; does not validate age policy, translation, or clinical use.',
      adjustedItems,
      basalRunCount: basalRuns.length,
      ceilingRunCount: ceilingRuns.length,
    },
    items: entries,
    missing,
    answeredCount,
    estimatedCount,
    percentEstimated: answeredCount ? (estimatedCount / answeredCount) * 100 : null,
    estimatedDenominator: 'entered-items',
    interpretation: estimatedInterpretation(estimatedCount, answeredCount),
    warnings,
    policy: {
      id: 'manual-interview-chapter3-v2',
      basalCount: 4,
      ceilingCount: 4,
      basalSelection: 'highest-numbered-maximal-run',
      ceilingSelection: 'lowest-numbered-maximal-run',
      credit: '2-through-basal-end;0-from-ceiling-start;original-observations-preserved',
      startSelection: 'latest-supplied-lower-age-bound',
      sourceProven: [
        'four-consecutive-2',
        'four-consecutive-0',
        'return-to-first-if-no-basal',
        'continue-to-last-if-no-ceiling',
        'highest-basal-lowest-ceiling',
        'effective-boundary-credit-original-observations-preserved',
      ],
      reviewStatus: 'source-supported-original-manual-scan',
      source: manualSource([48, 49]),
    },
  };
}
