// Browser port of the isolated scoring service. Numerical behavior comes from
// reference-engine.mjs and clinic-age-cap.mjs; no clinic API is used.
import { calculateAge } from './age.mjs';
import { routeClinicAgeCap, CLINIC_AGE_CAP_PROTOCOL, CLINIC_AGE_CAP_VERSION } from './clinic-age-cap.mjs';
import { scoreReference, routeReference, applyEstimatedInterpretation } from './reference-engine.mjs';
const instrument = globalThis.FinelandPresentation?.instrument;
if (!instrument?.subdomains) throw new Error('Demo instrument unavailable');
export const STANDARD_PROTOCOL = 'vineland-interview-v1';
export const ADMINISTRATION_PROTOCOLS = [STANDARD_PROTOCOL, CLINIC_AGE_CAP_PROTOCOL];
const own = (o, k) => Object.prototype.hasOwnProperty.call(o ?? {}, k);
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const allIds = new Map(instrument.subdomains.flatMap((s) => s.items.map((i) => [i.id, i])));
export function scoreWorkspaceAssessment(item, patient) {
  assert(item && patient, 'Assessment and patient required');
  const person = item.patientSnapshot ?? patient;
  const age = calculateAge(person.dob, item.date);
  const mode = item.entryMode ?? 'items';
  assert(['items', 'raw'].includes(mode), 'entryMode must be items or raw');
  const protocol = item.administrationProtocol ?? STANDARD_PROTOCOL;
  assert(ADMINISTRATION_PROTOCOLS.includes(protocol), 'Unknown administration protocol');
  const ageCapped = protocol === CLINIC_AGE_CAP_PROTOCOL;
  assert(!ageCapped || mode === 'items', 'Clinic age cap requires item-level responses');
  const input = {
    dob: person.dob,
    assessmentDate: item.date,
    includeMotor: item.motor === true,
    includeMaladaptive: item.maladaptive === true,
    confidenceLevel: item.confidenceLevel ?? 90,
    alpha: item.significanceLevel ?? 0.05,
    rawScores: {},
    maladaptiveRaw: {},
    critical: {},
  };
  const administration = {},
    administrationIssues = [],
    warnings = [];
  if (mode === 'raw') {
    assert(
      item.rawScores && typeof item.rawScores === 'object' && !Array.isArray(item.rawScores),
      'rawScores object required for raw entry',
    );
    input.rawScores = structuredClone(item.rawScores);
    input.maladaptiveRaw = structuredClone(item.maladaptiveRaw ?? {});
    // Raw-entry callers supply individual critical responses separately, never a total.
    input.critical = structuredClone(item.criticalScores ?? {});
    if (item.maladaptive === true) {
      const missing = Array.from({ length: 20 }, (_, i) => String(i + 1)).filter(
        (id) => !own(input.critical, id),
      );
      if (missing.length)
        administrationIssues.push({
          path: 'administration.critical',
          message:
            'All 20 critical-item responses are required for operational finalization; missing responses are not zero',
          missing,
        });
    }
    warnings.push({
      path: 'administration',
      message:
        'Raw scores entered from an external administration; item-level completeness, basal and ceiling cannot be independently checked.',
    });
  } else {
    assert(
      item.answers && typeof item.answers === 'object' && !Array.isArray(item.answers),
      'answers object required',
    );
    for (const [id, score] of Object.entries(item.answers)) {
      assert(allIds.has(id), 'Unknown instrument item ' + id);
      assert(
        Number.isInteger(score) && allIds.get(id).allowedScores.includes(score),
        'Invalid score for instrument item ' + id,
      );
    }
    for (const [id, value] of Object.entries(item.estimated ?? {})) {
      assert(allIds.has(id) && typeof value === 'boolean', 'Invalid estimated flag ' + id);
    }
    for (const section of instrument.subdomains) {
      if (age.totalMonths < section.minAgeMonths) continue;
      if (section.group === 'MOT' && !item.motor) continue;
      if (section.group === 'MAL' && !item.maladaptive) continue;
      if (section.group === 'MOT' && age.years >= 10) {
        administrationIssues.push({
          path: 'administration.' + section.scoreId,
          message: 'Motor norm scores are unavailable from age 10',
        });
        continue;
      }
      if (section.group !== 'MAL') {
        const result = (ageCapped ? routeClinicAgeCap : routeReference)(section, age, item.answers, item.estimated ?? {});
        administration[section.scoreId] = result;
        if (result.raw !== null) input.rawScores[section.scoreId] = result.raw;
        else
          administrationIssues.push({
            path: 'administration.' + section.scoreId,
            message:
              result.status === 'needs-review'
                ? 'Basal/ceiling ordering conflict'
                : 'Required items not answered',
            missing: result.missing,
            nextItem: result.nextItem,
          });
      } else {
        const missing = section.items.filter((i) => !own(item.answers, i.id)).map((i) => i.id);
        const complete = missing.length === 0;
        const raw =
          complete && section.scoreId !== 'critical'
            ? section.items.reduce((sum, i) => sum + item.answers[i.id], 0)
            : null;
        administration[section.scoreId] = {
          status: complete ? 'complete' : 'continue',
          raw,
          missing,
          nextItem: missing[0] ?? null,
          answeredCount: section.items.length - missing.length,
          estimatedCount: section.items.filter(
            (i) => own(item.answers, i.id) && item.estimated?.[i.id] === true,
          ).length,
          estimatedDenominator: 'entered-items',
        };
        if (missing.length)
          administrationIssues.push({
            path: 'administration.' + section.scoreId,
            message: 'All enabled maladaptive/critical items must be answered',
            missing,
          });
        if (section.scoreId === 'critical') {
          for (const i of section.items)
            if (own(item.answers, i.id))
              input.critical[String(i.number)] = {
                score: item.answers[i.id],
                ...(typeof item.criticalNotes?.[String(i.number)] === 'string' &&
                item.criticalNotes[String(i.number)].trim()
                  ? { note: item.criticalNotes[String(i.number)].trim() }
                  : {}),
              };
        } else if (raw !== null) input.maladaptiveRaw[section.scoreId] = raw;
      }
    }
  }
  const result = scoreReference(input);
  result.critical = result.critical.map((row) => ({
    ...row,
    ...(input.critical?.[row.id]?.note ? { note: input.critical[row.id].note } : {}),
  }));
  for (const [id, route] of Object.entries(administration)) {
    if (result.subdomains[id])
      Object.assign(result.subdomains[id], {
        percentEstimated: route.percentEstimated,
        estimatedCount: route.estimatedCount,
        answeredCount: route.answeredCount,
        administrationStatus: route.status,
      });
  }
  const issues = [...result.completeness.issues, ...administrationIssues];
  result.completeness = { complete: issues.length === 0, issues };
  applyEstimatedInterpretation(result, administration);
  if (ageCapped) {
    result.interpretationEligible = false;
    result.normativeComparability = false;
    result.normativeUse = 'exploratory-only';
    result.mode = 'custom-clinic-age-cap';
    result.watermark = 'Custom age-capped clinic protocol · exploratory norm-table lookups only';
    result.clinicalReadiness.reasons.push({ code: 'custom-age-cap-not-standardized', path: 'administrationProtocol',
      message: 'Age-capped administration differs from the supplied Vineland-3 procedure. Norm-table lookups are exploratory, not standardized clinical results.' });
    warnings.push({ path: 'administrationProtocol', message: 'Custom clinic age cap: converted values are exploratory and are not equivalent to standard Vineland-3 administration.' });
    for (const row of [...Object.values(result.subdomains), ...Object.values(result.domains), result.abc, ...result.analyses].filter(Boolean)) {
      row.responseInterpretation = row.interpretation;
      row.interpretation = { status: 'custom-protocol', eligible: false, protocolId: protocol, normativeComparability: false };
      for (const field of ['level', 'classification', 'significant', 'baseRate']) {
        if (row[field] == null) continue;
        row.reviewValues ??= {};
        row.reviewValues[field] = row[field];
        row[field] = null;
      }
    }
  }
  const routeEvidence = Object.values(administration)
    .map((route) => route.administrationEvidence)
    .filter(Boolean);
  const administrationEvidence =
    mode === 'raw'
      ? {
          method: 'external-raw-entry',
          verified: false,
          reasons: ['item-level-administration-not-available'],
        }
      : {
          method:
            routeEvidence.length && routeEvidence.every((evidence) => evidence.method === 'complete-administered')
              ? 'complete-administered'
              : routeEvidence.some((evidence) => evidence.method === 'conflicting-administration')
                ? 'conflicting-administration'
                : routeEvidence.some((evidence) => evidence.method === 'incomplete')
                  ? 'incomplete'
                  : 'manual-basal-ceiling',
          verified:
            routeEvidence.length > 0 &&
            routeEvidence.every((evidence) => evidence.verified === true) &&
            administrationIssues.length === 0,
          reasons: [
            ...new Set(routeEvidence.flatMap((evidence) => evidence.reasons || [])),
          ],
        };
  if (ageCapped) Object.assign(administrationEvidence, {
    method: 'custom-clinic-age-cap', verified: false,
    operationallyComplete: result.completeness.complete,
    reasons: [...administrationEvidence.reasons, 'custom-age-cap-not-standardized'],
  });
  return {
    ...result,
    scoringProtocol: { id: protocol, version: ageCapped ? CLINIC_AGE_CAP_VERSION : '1.1.0',
      label: ageCapped ? 'طريقة العيادة بحدّ العمر' : 'قواعد الأساس والسقف في الدليل',
      standardized: !ageCapped },
    entryMode: mode,
    instrumentId: instrument.id,
    instrumentVersion: instrument.version,
    instrumentHash: instrument.instrumentHash,
    form: instrument.form ?? 'Interview',
    edition: instrument.edition ?? 'Vineland-3',
    tableVersion: result.packageVersion,
    administration,
    administrationEvidence,
    completeness: result.completeness,
    warnings: [
      ...result.warnings,
      ...warnings,
    ],
    calculationInput: input,
  };
}
