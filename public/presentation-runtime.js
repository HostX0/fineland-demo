/* Public, browser-only demonstration bridge. No clinic API or database access. */
(() => {
  'use strict';
  const fixture = window.FinelandPresentation;
  const scriptBase = new URL('.', document.currentScript.src);
  if (!fixture?.presentationOnly || !fixture?.data || !fixture?.instrument)
    throw new Error('Presentation fixtures are unavailable.');
  const clone = (value) => structuredClone(value);
  const STORAGE_KEY = 'fineland:public-presentation:workspace:v1';
  const CLINIC = 'clinic-age-cap-v1';
  const STANDARD = 'vineland-interview-v1';
  const source = fixture.instrument;
  const baseline = clone(fixture.data);
  let storageAvailable = true;
  function validStored(value) {
    return value?.version === 2 && Array.isArray(value.patients) &&
      Array.isArray(value.assessments) && value.settings &&
      value.assessments.every((a) => a?.id && a?.patientId && ['draft', 'final'].includes(a.status));
  }
  function readWorkspace() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (validStored(stored)) return stored;
    } catch { storageAvailable = false; }
    return clone(baseline);
  }
  let workspace = readWorkspace();
  function persist(data = workspace) {
    workspace = clone(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); storageAvailable = true; return true; }
    catch { storageAvailable = false; return false; }
  }
  const age = (patient, date) => window.NamaaLogic.calendarAge(patient.dob, date);
  const eligible = (section, visitAge, assessment) =>
    visitAge.totalMonths >= Number(section.minAgeMonths || 0) &&
    (section.group !== 'MOT' || (assessment.motor && visitAge.years < 10)) &&
    (section.group !== 'MAL' || assessment.maladaptive);
  const sections = (assessment, patient) => {
    const visitAge = age(patient, assessment.date);
    return source.subdomains.filter((section) => eligible(section, visitAge, assessment));
  };
  const number = (item) => Number(item.number || String(item.id).match(/(\d+)$/)?.[1]);
  function boundary(section, years, protocol) {
    if (protocol !== CLINIC || section.group === 'MAL') return null;
    const starts = section.starts || [];
    let index = -1;
    for (let i = 0; i < starts.length; i++)
      if (years >= Number(starts[i].years?.[0] ?? Infinity)) index = i;
    if (index < 0) return null;
    return { startNumber: starts[index].item,
      endNumber: starts[index + 1] ? starts[index + 1].item - 1 : number(section.items.at(-1)) };
  }
  let exactScorer = null;
  function score(assessment, patient) {
    if (!exactScorer) throw new Error('The browser scoring engine is still loading.');
    return exactScorer(assessment, patient);
  }
  function fillDemoResponses(assessment, patient) {
    const filled = clone(assessment);
    const mode = filled.entryMode === 'raw' ? 'raw' : 'items';
    const protocol = filled.administrationProtocol || (mode === 'raw' ? STANDARD : CLINIC);
    filled.answers ||= {};
    filled.estimated ||= {};
    filled.rawScores ||= {};
    filled.maladaptiveRaw ||= {};
    filled.criticalScores ||= {};
    filled.criticalNotes ||= {};
    const years = age(patient, filled.date).years;
    for (const section of sections(filled, patient)) {
      if (mode === 'raw') {
        if (section.scoreId === 'critical') {
          for (const item of section.items) filled.criticalScores[number(item)] = number(item) === 1 ? 1 : 0;
          filled.criticalNotes[1] ||= 'Illustrative observation for clinician discussion.';
        } else if (section.group === 'MAL') {
          filled.maladaptiveRaw[section.scoreId] = Math.max(1, Math.round(section.items.length * 0.2));
        } else {
          filled.rawScores[section.scoreId] = Math.round(section.items.length * 1.25);
        }
        continue;
      }
      const cap = boundary(section, years, protocol);
      const required = section.items.filter((item) => !cap || number(item) <= cap.endNumber);
      for (let index = 0; index < required.length; index++) {
        const item = required[index];
        const permitted = item.allowedScores || [0, 1, 2];
        const proposed = section.group === 'MAL'
          ? (section.scoreId === 'critical' && index === 0 ? 1 : 0)
          : index < 4 ? 2 : index >= required.length - 4 ? 0 : index % 5 === 0 ? 1 : 2;
        filled.answers[item.id] = permitted.includes(proposed) ? proposed : permitted[0];
        if (section.scoreId === 'critical' && index === 0)
          filled.criticalNotes[number(item)] ||= 'Illustrative observation for clinician discussion.';
      }
    }
    return filled;
  }
  function canonicalJSON(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
    return '{' + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ':' + canonicalJSON(value[key])).join(',') + '}';
  }
  async function snapshotHash(body) {
    const bytes = new TextEncoder().encode(canonicalJSON(body));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  async function finalize(id) {
    const assessment = workspace.assessments.find((item) => item.id === id);
    if (!assessment || assessment.status !== 'draft') throw new Error('Draft assessment not found.');
    const patient = workspace.patients.find((item) => item.id === assessment.patientId);
    if (!patient) throw new Error('Patient record not found.');
    const result = score(assessment, patient);
    if (!result.completeness.complete) throw new Error('Complete the required demo responses before saving the report.');
    assessment.status = 'final';
    assessment.finalizationMode = 'review';
    assessment.finalizedAt = new Date().toISOString();
    assessment.reportMode = 'presentation';
    assessment.patientSnapshot = clone(patient);
    assessment.reportSnapshot = clone(workspace.settings);
    assessment.clinicalScore = clone(result);
    const snapshot = { snapshotVersion: 'browser-demo-1', assessmentId: id,
      instrumentHash: result.instrumentHash, input: clone(result.calculationInput), result: clone(result),
      administrationInput: { assessment: { id, date: assessment.date, entryMode: assessment.entryMode,
        administrationProtocol: assessment.administrationProtocol, answers: clone(assessment.answers || {}),
        estimated: clone(assessment.estimated || {}), motor: assessment.motor, maladaptive: assessment.maladaptive,
        criticalNotes: clone(assessment.criticalNotes || {}), confidenceLevel: assessment.confidenceLevel,
        significanceLevel: assessment.significanceLevel }, patient: { dob: patient.dob } } };
    assessment.scoringSnapshot = { ...snapshot, snapshotHash: await snapshotHash(snapshot) };
    persist();
    return { data: clone(workspace) };
  }
  window.NAMAA_MODE = 'server';
  const capabilities = { canManageBackup: false, canViewPhone: true };
  window.NamaaRemote = {
    enabled: true, presentationOnly: true, instrument: source,
    user: { role: 'owner', name: 'Dr. Maya Hassan', capabilities },
    clinic: { id: 'public-presentation', name: 'Fineland Clinic' }, capabilities,
    load: () => clone(workspace), save: (data) => persist(data),
    flushNow: async () => true,
    statusText: () => storageAvailable ? 'Demo workspace · saved in this browser' : 'Demo changes held in this tab',
    score: async (assessment, patient) => score(assessment, patient),
    finalize: (id) => finalize(id),
    fillDemoResponses,
    resetDemo: () => { workspace = clone(baseline); try { localStorage.removeItem(STORAGE_KEY); storageAvailable = true; } catch {} location.reload(); },
  };
  function labelReports() {
    const main = document.getElementById('main-content');
    if (main && !main.querySelector('[data-public-demo-intro]')) {
      const intro = document.createElement('section');
      intro.dataset.publicDemoIntro = 'true';
      intro.className = 'public-demo-bar';
      intro.setAttribute('aria-label', 'About this demo');
      intro.innerHTML = '<div><strong>Fineland by DevsHub</strong><p>Complete interactive demo. Explore the workflow with fictional cases.</p></div><nav aria-label="Demo links"><a class="btn primary tiny" href="https://github.com/HostX0/fineland-demo/issues/new?template=product-enquiry.yml" target="_blank" rel="noopener noreferrer">Request the full system</a><a class="btn tiny" href="https://github.com/HostX0/fineland-demo" target="_blank" rel="noopener noreferrer">Documentation &amp; source</a></nav>';
      main.prepend(intro);
    }
    for (const details of document.querySelectorAll('#report .provenance')) details.remove();
    const sidebar = document.querySelector('.sidebar-foot');
    if (sidebar && !sidebar.querySelector('[data-demo-reset]')) {
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'btn text small';
      reset.dataset.demoReset = 'true';
      reset.textContent = 'Reset demo data';
      reset.addEventListener('click', () => {
        if (confirm('Reset this device’s demonstration changes and restore the example cases?'))
          window.NamaaRemote.resetDemo();
      });
      sidebar.appendChild(reset);
    }
    for (const report of document.querySelectorAll('#report')) {
      if (report.querySelector('[data-public-demo-label]')) continue;
      const label = document.createElement('div');
      label.dataset.publicDemoLabel = 'true';
      label.textContent = 'Demonstration report · Fictional case · Not for clinical use';
      label.style.cssText = 'padding:9px 14px;margin:0 0 14px;border:1px solid #c6b9e5;border-radius:10px;background:#f5f0ff;color:#573a85;font-weight:700;text-align:center';
      report.prepend(label);
    }
  }
  new MutationObserver(labelReports).observe(document.getElementById('app'), { childList: true, subtree: true });
  function loadScript(name) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(name, scriptBase).href; script.onload = resolve; script.onerror = reject;
      document.body.appendChild(script);
    });
  }
  (async () => {
    const response = await fetch(new URL('demo-scoring/interview-reference.json', scriptBase), { cache: 'force-cache' });
    if (!response.ok) throw new Error('Scoring reference data could not be loaded.');
    const table = await response.json();
    if (await snapshotHash(table) !== '64aea6e0f04a505cdf8334abfd598f691463c38369c7266dac6310843767fe13')
      throw new Error('Scoring reference integrity check failed.');
    window.FinelandReferenceData = table;
    const module = await import('./demo-scoring/scoring-service.mjs');
    exactScorer = module.scoreWorkspaceAssessment;
    await loadScript('clinical.js');
    await loadScript('app.js');
  })().catch((error) => {
    document.getElementById('app').textContent = `The presentation interface could not be loaded: ${error.message}`;
  });
})();
