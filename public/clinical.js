(function (root) {
  'use strict';
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  const names = {
    COM: 'Communication',
    DLS: 'Daily Living Skills',
    SOC: 'Socialization',
    MOT: 'Motor Skills',
    MAL: 'Maladaptive Behavior',
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
    internalizing: 'Internalizing',
    externalizing: 'Externalizing',
    critical: 'Critical Items',
  };
  // Presentation-only illustrative statements. The Arabic source instrument remains
  // in memory for scoring; its protected item wording is never rendered in English.
  const illustrativeItems = {
    COM: ['Follows a short everyday instruction.', 'Shares a simple idea in conversation.', 'Responds to a familiar written cue.'],
    DLS: ['Completes a familiar personal routine.', 'Helps organize a shared space.', 'Uses a common community routine.'],
    SOC: ['Joins a familiar social activity.', 'Takes turns during a leisure activity.', 'Adapts to a small change in plans.'],
    MOT: ['Moves safely through a familiar activity.', 'Uses small objects during a practical task.', 'Coordinates movement in play.'],
    MAL: ['Illustrative behavior observation for clinician review.', 'Illustrative context requiring individual review.', 'Illustrative response pattern for follow-up.'],
  };
  const illustrativeText = (section, item) =>
    `Demonstration item ${item.number}: ${illustrativeItems[section.group]?.[(item.number - 1) % 3] || 'Observation for clinician review.'}`;
  const results = new Map();
  const scoreVersions = new Map();
  const guidanceStates = new Map();
  const locked = () => root.NamaaRemote?.user?.role === 'viewer';
  const CLINIC_PROTOCOL = 'clinic-age-cap-v1';
  const STANDARD_PROTOCOL = 'vineland-interview-v1';
  const isClinicProtocol = (assessment, result) =>
    (result?.scoringProtocol?.id || assessment?.administrationProtocol) === CLINIC_PROTOCOL;
  const itemNumber = (id) =>
    String(id ?? '')
      .match(/(\d+)$/)?.[1]
      ?.replace(/^0+/, '') || String(id ?? '');
  function routeState(route, item) {
    const row = route?.items?.find((value) => value.id === item.id);
    if (!row) return '';
    const state =
      {
        entered: 'إجابة مدخلة',
        untouched: 'غير مدخلة',
        credited: 'محتسبة استدلالياً قبل الأساس',
        zeroed: 'محتسبة استدلالياً بعد السقف',
        'inferred-basal': 'محتسبة بقاعدة الأساس (غير مدخلة)',
        'inferred-ceiling': 'محتسبة بقاعدة السقف (غير مدخلة)',
        'entered-basal-adjusted': 'مدخلة؛ الفعلية عُدلت بقاعدة الأساس',
        'entered-ceiling-adjusted': 'مدخلة؛ الفعلية عُدلت بقاعدة السقف',
        'age-excluded': 'خارج حد العمر؛ الفعلية 0',
        'entered-age-excluded': 'إجابة محفوظة خارج حد العمر؛ الفعلية 0',
      }[row.state] || 'حالة غير معرّفة';
    return `<div class="route-state"><span>الحالة: ${esc(state)}</span><span>الدرجة المدخلة: ${row.enteredScore ?? '—'}</span><span>الدرجة الفعلية: ${row.effectiveScore ?? '—'}</span></div>`;
  }
  let instrument = null;
  function setInstrument(value) {
    instrument = value;
    return instrument;
  }
  function getInstrument() {
    return instrument || root.NamaaRemote?.instrument || null;
  }
  function ageMonths(patient, date) {
    try {
      return root.NamaaLogic.calendarAge(patient.dob, date).totalMonths;
    } catch {
      return 0;
    }
  }
  function sections(assessment, patient) {
    const source = getInstrument();
    if (!source) return [];
    const months = ageMonths(patient, assessment.date);
    return source.subdomains.filter(
      (section) =>
        months >= Number(section.minAgeMonths || 0) &&
        (section.group !== 'MOT' || assessment.motor) &&
        (section.group !== 'MAL' || assessment.maladaptive) &&
        !(section.group === 'MOT' && Math.floor(months / 12) >= 10),
    );
  }
  function prepare(assessment) {
    if (assessment.status === 'final') return assessment;
    assessment.instrumentId = getInstrument()?.id || 'vineland3-interview-ar-supplied';
    assessment.entryMode = assessment.entryMode || 'items';
    if (assessment.entryMode === 'raw' && assessment.administrationProtocol === CLINIC_PROTOCOL) {
      assessment.itemAdministrationProtocol = CLINIC_PROTOCOL;
      assessment.administrationProtocol = STANDARD_PROTOCOL;
    }
    if (!assessment.administrationProtocol)
      assessment.administrationProtocol = assessment.entryMode === 'raw' ? STANDARD_PROTOCOL : CLINIC_PROTOCOL;
    assessment.answers = assessment.answers || {};
    assessment.estimated = assessment.estimated || {};
    assessment.rawScores = assessment.rawScores || {};
    assessment.maladaptiveRaw = assessment.maladaptiveRaw || {};
    assessment.criticalScores = assessment.criticalScores || {};
    assessment.criticalNotes = assessment.criticalNotes || {};
    return assessment;
  }
  function ageBoundary(assessment, patient, section, route) {
    if (!(route?.protocolId === CLINIC_PROTOCOL || isClinicProtocol(assessment)) || section.group === 'MAL') return null;
    if (route?.ageBoundary && Number.isInteger(route.ageBoundary.endNumber)) return route.ageBoundary;
    const years = Math.floor(ageMonths(patient, assessment.date) / 12);
    const starts = section.starts || [];
    const index = starts.findIndex((row, i) => years >= row.years?.[0] &&
      (i === starts.length - 1 || years < starts[i + 1].years?.[0]));
    if (index < 0) return null;
    const row = starts[index];
    return {
      startNumber: row.item,
      endNumber: index + 1 < starts.length ? starts[index + 1].item - 1 : section.items.at(-1)?.number,
      label: row.label,
      sourcePage: row.sourcePage,
    };
  }
  const ageExcluded = (item, boundary) => boundary && item.number > boundary.endNumber;
  function ageCapSummary(assessment, section, boundary) {
    if (!boundary) return '';
    const excluded = section.items.filter((item) => ageExcluded(item, boundary));
    if (!excluded.length) return `<p class="small muted">حد العمر لهذا المجال: حتى البند ${boundary.endNumber}. لا توجد بنود أعلى منه.</p>`;
    const entered = excluded.filter((item) => Number.isInteger(assessment.answers?.[item.id]));
    return `<details class="age-cap-summary" data-age-cap-summary><summary>حد العمر: حتى البند ${boundary.endNumber} · ${excluded.length} بنداً أعلى منه تُحتسب 0 ولا تُطرح</summary><p>طريقة العيادة حسب ${esc(boundary.label || 'الفئة العمرية')}. الإجابات السابقة محفوظة، ولا تدخل في الخام.</p>${entered.length ? `<p>إجابات محفوظة خارج الحد: ${entered.map((item) => `${item.number}=${assessment.answers[item.id]}`).join('، ')}.</p>` : ''}</details>`;
  }
  function protocolControl(assessment) {
    const selected = assessment.administrationProtocol || STANDARD_PROTOCOL;
    return `<div class="protocol-control"><label for="administration-protocol">طريقة تطبيق البنود</label><select id="administration-protocol" data-clinical-protocol ${locked() || assessment.status === 'final' ? 'disabled' : ''}><option value="${CLINIC_PROTOCOL}" ${selected === CLINIC_PROTOCOL ? 'selected' : ''}>طريقة العيادة بحدّ العمر</option><option value="${STANDARD_PROTOCOL}" ${selected === STANDARD_PROTOCOL ? 'selected' : ''}>مسار المقابلة المرجعي</option></select><span class="small muted">${selected === CLINIC_PROTOCOL ? 'تُوقف الأسئلة عند نهاية فئة العمر، وتستمر العودة للأساس حتى أربع درجات 2 متتالية أو البند 1.' : 'يُحدد البدء العمري موضع البداية، وتستمر البنود وفق مسار المقابلة المرجعي.'}</span></div>`;
  }
  function protocolNotice(assessment, result) {
    if (assessment.entryMode === 'raw')
      return '<div class="protocol-notice" role="note"><strong>درجات خام من إدارة خارجية</strong><p>طريقة تطبيق البنود والأساس والسقف غير متحققة هنا. تُعرض تحويلات الجداول لمراجعة درجات الإدارة الخارجية فقط.</p></div>';
    if (isClinicProtocol(assessment, result))
      return '<div class="protocol-notice" role="note"><strong>طريقة التطبيق: العيادة بحدّ العمر</strong><p>تُحتسب البنود فوق حدّ العمر بدرجة 0. تُعرض الدرجات والمستويات المقابلة لها في جداول التحويل. هذه الطريقة تختلف عن مسار المقابلة المرجعي، لذلك لا تُعامل نتائج الطريقتين على أنها متكافئة.</p></div>';
    return '<p class="small muted">طريقة التطبيق: مسار المقابلة المرجعي.</p>';
  }
  function invalidate(id) {
    scoreVersions.set(id, (scoreVersions.get(id) || 0) + 1);
    results.delete(id);
    guidanceStates.set(id, { status: 'pending' });
  }
  async function score(assessment, patient) {
    const id = assessment.id;
    const version = (scoreVersions.get(id) || 0) + 1;
    scoreVersions.set(id, version);
    results.delete(id);
    guidanceStates.set(id, { status: 'pending' });
    try {
      if (!root.NamaaRemote?.score) throw Error('خدمة الحساب غير متاحة.');
      const result = await root.NamaaRemote.score(structuredClone(assessment), structuredClone(patient));
      if (scoreVersions.get(id) !== version) return null;
      results.set(id, result);
      guidanceStates.set(id, { status: 'ready' });
      return result;
    } catch (error) {
      if (scoreVersions.get(id) !== version) return null;
      guidanceStates.set(id, { status: 'error', message: error?.message || '' });
      throw error;
    }
  }
  const cached = (id) => results.get(id) || null;
  const guidanceState = (id) => guidanceStates.get(id) || { status: results.has(id) ? 'ready' : 'pending' };
  async function confirmedRoute(id, sectionId, waitForScore, stillCurrent = () => true) {
    if (guidanceState(id).status !== 'ready') {
      try {
        await waitForScore?.();
      } catch {
        return null;
      }
    }
    if (!stillCurrent() || guidanceState(id).status !== 'ready') return null;
    return cached(id)?.administration?.[sectionId] || null;
  }
  function progress(assessment, patient, result = cached(assessment.id)) {
    prepare(assessment);
    const visible = sections(assessment, patient);
    if (assessment.entryMode === 'raw') {
      const standard = visible.filter((section) => section.group !== 'MAL').length,
        maladaptive = visible.filter(
          (section) => section.group === 'MAL' && section.scoreId !== 'critical',
        ).length,
        critical = visible.find((section) => section.scoreId === 'critical')?.items.length || 0,
        total = standard + maladaptive + critical,
        answered =
          Object.keys(assessment.rawScores || {}).length +
          Object.keys(assessment.maladaptiveRaw || {}).length +
          Object.keys(assessment.criticalScores || {}).length;
      return { answered, total, inferred: 0, percent: total ? Math.round((100 * answered) / total) : 0 };
    }
    let excluded = 0;
    const items = visible.flatMap((section) => {
      const boundary = ageBoundary(assessment, patient, section, result?.administration?.[section.scoreId]);
      excluded += (section.items || []).filter((item) => ageExcluded(item, boundary)).length;
      return (section.items || []).filter((item) => !ageExcluded(item, boundary));
    }),
      answered = items.filter((item) => Number.isInteger(assessment.answers?.[item.id])).length,
      inferred = Object.values(result?.administration || {}).reduce(
        (count, route) =>
          count +
          (route.items || []).filter((item) =>
            ['inferred-basal', 'inferred-ceiling', 'credited', 'zeroed'].includes(item.state),
          ).length,
        0,
      );
    return {
      answered,
      total: items.length,
      inferred,
      percent: items.length ? Math.round((100 * answered) / items.length) : 0,
      ...(isClinicProtocol(assessment, result) ? { ageExcluded: excluded } : {}),
    };
  }
  function sectionNav(visible, index, assessment, patient, result) {
    return visible
      .map(
        (section, i) => {
          const boundary = ageBoundary(assessment, patient, section, result?.administration?.[section.scoreId]);
          const items = section.items.filter((item) => !ageExcluded(item, boundary));
          return `${i === 0 || visible[i - 1].group !== section.group ? `<div class="domain-label">${esc(names[section.group] || section.group)}</div>` : ''}<button class="subnav ${i === index ? 'active' : ''}" data-action="clinical-domain" data-index="${i}"><span>${esc(names[section.scoreId] || section.name)}</span><small>${items.filter((item) => Number.isInteger(assessment.answers?.[item.id])).length}/${items.length}</small></button>`;
        },
      )
      .join('');
  }
  function routeGuidance(route, state = { status: 'ready' }) {
    if (state.status === 'error')
      return `<div class="route-callout route-error" role="alert"><div><strong>تعذر تحديث مسار البنود</strong><p>تحققي من الاتصال ثم أعيدي الحساب. لا تعتمدي على توجيه سابق لهذا القسم.</p></div><button class="btn tiny" data-action="clinical-retry-score">إعادة المحاولة</button></div>`;
    if (state.status !== 'ready' || !route)
      return '<div class="route-callout route-pending" role="status"><div><strong>جارٍ تحديث مسار البنود</strong><p>سيظهر البند المطلوب بعد حساب الإجابات الحالية.</p></div></div>';
    const start = route.startNumber,
      next = route.nextItem,
      basal = route.basal,
      ceiling = route.ceiling,
      boundary = route.ageBoundary,
      clinic = Boolean(boundary);
    let title = '', detail = '';
    if (route.status === 'reverse') {
      title = `Basal not reached · return to item ${itemNumber(next)}`;
      detail = clinic
        ? `Start band ${boundary.startNumber}–${boundary.endNumber}; age cap ${boundary.endNumber}. Move backward until four consecutive scores of 2 or item 1. Four zeros during the backward route do not end the basal search.`
        : `Age start ${start ?? '—'} is the starting point only. Move backward item by item until four consecutive scores of 2, or item 1.`;
      if (clinic && ceiling) detail += ` Four zeros were recorded at ${ceiling.startNumber}–${ceiling.endNumber}; the ceiling begins at ${ceiling.startNumber}, while the basal search continues backward.`;
    } else if (route.status === 'findbasal') {
      const reachedFirst = route.items?.[0]?.enteredScore != null;
      title = reachedFirst
        ? `Basal not reached by item 1${next ? ` · continue item ${itemNumber(next)}` : ''}`
        : next ? `Find basal · required item ${itemNumber(next)}` : 'Basal not reached';
      detail = reachedFirst
        ? 'The backward route reached item 1. Enter the remaining required items; inferred basal credit requires four consecutive responses scored 2.'
        : start != null
          ? `Start at age-based item ${start}. Four consecutive scores of 2 are required; otherwise move backward to item 1, then follow the required route.`
          : 'Four consecutive scores of 2 are required, or continue entry through item 1.';
    } else if (route.status === 'complete') {
      title = clinic ? `Entry complete through age cap ${boundary.endNumber}` : 'Section route complete';
      detail = basal
        ? `Basal: items ${basal.startNumber}–${basal.endNumber}. Basal credit through item ${basal.endNumber}: ${basal.endNumber * 2} points; preceding items are inferred as 2.`
        : 'Required item entry is complete without inferred basal credit.';
      if (ceiling) detail += clinic
        ? ` Ceiling begins at item ${ceiling.startNumber} (four zeros at ${ceiling.startNumber}–${ceiling.endNumber}).`
        : ` Ceiling: items ${ceiling.startNumber}–${ceiling.endNumber}. Later items are inferred as 0.`;
      else if (clinic) detail += ` A four-zero ceiling is not required; items after ${boundary.endNumber} are above the age cap and have effective score 0.`;
    } else if (route.status === 'continue') {
      title = next ? `Continue with item ${itemNumber(next)}` : 'Continue required items';
      detail = basal
        ? `Basal reached at items ${basal.startNumber}–${basal.endNumber}; basal credit through item ${basal.endNumber}: ${basal.endNumber * 2} points. ${ceiling ? clinic ? `Ceiling starts at item ${ceiling.startNumber} after four zeros at ${ceiling.startNumber}–${ceiling.endNumber}.` : `Ceiling reached at items ${ceiling.startNumber}–${ceiling.endNumber}.` : 'Complete required items after basal until ceiling or section completion.'}`
        : 'Continue entering items required by the route.';
      if (clinic && !basal) detail += ' Four zeros while moving backward do not stop the basal search.';
      if (clinic) detail += ` Entry ends at item ${boundary.endNumber}.`;
    } else {
      title = 'Review basal and ceiling order';
      detail = `Basal ${basal ? `${basal.startNumber}–${basal.endNumber}` : '—'} conflicts with ceiling ${ceiling ? `${ceiling.startNumber}–${ceiling.endNumber}` : '—'}; review responses in both spans.`;
    }
    return `<div class="route-callout ${route.status === 'reverse' || route.status === 'needs-review' ? 'route-warning' : ''}" role="status" data-route-status="${esc(route.status)}"><div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>${next ? `<button class="btn tiny" data-action="clinical-jump" data-item="${esc(String(next))}">انتقال للبند ${esc(itemNumber(next))}</button>` : ''}</div>`;
  }
  function progressMarkup(assessment, patient, result) {
    const overall = progress(assessment, patient, result);
    return `<div class="row spread"><strong>تقدم الإدخال الفعلي</strong><span>${overall.answered} / ${overall.total} · ${overall.percent}%</span></div><div class="progress-full"><span style="width:${overall.percent}%"></span></div><p class="small muted">${overall.inferred ? `${overall.inferred} بنداً له حالة استدلالية منفصلة؛ لا تُحسب كإجابات أدخلها الفاحص.` : 'يعرض الشريط الإجابات التي أدخلها الفاحص فقط.'}${overall.ageExcluded ? ` ${overall.ageExcluded} بنداً فوق حدّ العمر، فعليته 0 ولا يدخل في تقدم الإدخال.` : ''}</p>`;
  }
  function itemEntry(assessment, patient, index) {
    prepare(assessment);
    root.__namaaCurrent = assessment;
    const visible = sections(assessment, patient),
      section = visible[index] || visible[0];
    if (!section) return '<div class="card error">لا توجد مجالات مؤهلة لهذا العمر والاختيارات.</div>';
    const result = cached(assessment.id),
      route = result?.administration?.[section.scoreId],
      state = guidanceState(assessment.id),
      boundary = ageBoundary(assessment, patient, section, route);
    return `<div class="entry-mode"><button class="btn ${assessment.entryMode === 'items' ? 'primary' : ''}" data-action="clinical-mode" data-mode="items" ${locked() ? 'disabled' : ''}>إدخال البنود</button><button class="btn ${assessment.entryMode === 'raw' ? 'primary' : ''}" data-action="clinical-mode" data-mode="raw" ${locked() ? 'disabled' : ''}>إدخال الدرجات الخام</button></div>${protocolControl(assessment)}<div class="source-progress card" data-clinical-progress>${progressMarkup(assessment, patient, result)}</div><div class="assessment-layout"><aside class="card domain-nav">${sectionNav(visible, index, assessment, patient, result)}</aside><section class="card"><div class="section-head"><div><p class="eyebrow">${esc(names[section.group] || section.group)} · ${esc(section.scoreId)}</p><h2>${esc(section.name)}</h2><p class="small muted">${section.items.length} بند · اختاري إجابة واحدة لكل بند مطلوب.</p></div><span class="badge blue" data-clinical-status>${esc(state.status === 'ready' ? statusAr(route?.status) : state.status === 'error' ? 'تعذر التحديث' : 'جارٍ التحديث')}</span></div><div data-clinical-guidance>${routeGuidance(route, state)}</div><div data-clinical-age-cap-summary data-age-cap-end="${boundary?.endNumber ?? ''}">${ageCapSummary(assessment, section, boundary)}</div><div class="question-list clinical-items">${section.items.map((item) => `<div class="question" id="clinical-${item.id}" data-question="${item.id}" ${ageExcluded(item, boundary) ? 'hidden data-age-excluded="true"' : ''}><fieldset><legend class="question-heading"><span class="qnum">${item.number}</span><span>${esc(illustrativeText(section, item))}</span></legend><div class="scores">${item.allowedScores.map((value) => `<label class="score"><input type="radio" name="${item.id}" value="${value}" ${assessment.answers[item.id] === value ? 'checked' : ''} ${locked() || ageExcluded(item, boundary) ? 'disabled' : ''} data-clinical-score><span><b>${value}</b>${section.group === 'MAL' ? (value === 2 ? 'يحدث غالباً' : value === 1 ? 'يحدث أحياناً' : 'لا يحدث') : value === 2 ? 'عادةً / دائماً' : value === 1 ? 'أحياناً' : 'لا يؤديها'}</span></label>`).join('')}</div></fieldset><div data-clinical-route-state="${esc(item.id)}">${state.status === 'ready' ? routeState(route, item) : ''}</div>${section.group !== 'MAL' ? `<label class="estimated"><input type="checkbox" data-clinical-estimated="${item.id}" ${assessment.estimated[item.id] ? 'checked' : ''} ${locked() || ageExcluded(item, boundary) ? 'disabled' : ''}> إجابة تقديرية</label>` : ''}${section.scoreId === 'critical' ? `<label class="critical-note"><span>سياق أو ملاحظة للبند الحرج <small>اختياري</small></span><textarea rows="2" maxlength="1000" data-clinical-critical-note="${item.number}" ${locked() ? 'disabled' : ''}>${esc(assessment.criticalNotes[item.number] || '')}</textarea></label>` : ''}</div>`).join('')}</div><div class="footer-actions"><button class="btn" data-action="clinical-prev" ${index === 0 ? 'disabled' : ''}>القسم السابق</button><button class="btn primary" data-action="clinical-next" ${locked() && index === visible.length - 1 ? 'disabled' : ''}>${index === visible.length - 1 ? 'مراجعة وحساب' : 'القسم التالي'}</button></div></section></div>`;
  }
  function rawEntry(assessment, patient) {
    prepare(assessment);
    const source = getInstrument(),
      visible = sections(assessment, patient),
      reference = new Map((source.reference?.subdomains || []).map((row) => [row.id, row]));
    const standard = visible.filter((section) => section.group !== 'MAL');
    const maladaptive = visible.filter((section) => section.group === 'MAL');
    return `<div class="entry-mode"><button class="btn" data-action="clinical-mode" data-mode="items" ${locked() ? 'disabled' : ''}>إدخال البنود</button><button class="btn primary" data-action="clinical-mode" data-mode="raw" ${locked() ? 'disabled' : ''}>إدخال الدرجات الخام</button></div><div class="protocol-notice" role="note"><strong>إدخال خام من إدارة خارجية</strong><p>لا يُطبق حدّ العمر هنا؛ أدخلي مجموعاً خاماً من تطبيق مكتمل، ثم راجعي طريقة تطبيقه في المصدر الخارجي.</p></div><section class="card"><div class="section-head"><div><h2>إدخال خام سريع</h2><p class="small muted">استخدميه فقط عند نقل درجات إدارة خارجية مكتملة.</p></div><span class="badge amber">لا يتحقق من الأساس والسقف</span></div><div class="raw-grid">${standard
      .map((section) => {
        const max = reference.get(section.scoreId)?.maxRaw;
        return `<div class="field"><label for="raw-${section.scoreId}">${esc(section.name)} · ${section.scoreId}</label><input id="raw-${section.scoreId}" type="number" min="0" ${max != null ? `max="${max}"` : ''} inputmode="numeric" ${locked() ? 'disabled' : ''} data-clinical-raw="${section.scoreId}" value="${assessment.rawScores[section.scoreId] ?? ''}" placeholder="0${max != null ? '–' + max : ''}"></div>`;
      })
      .join('')}</div>${
      maladaptive.filter((s) => s.scoreId !== 'critical').length
        ? `<h3>السلوك غير التكيفي</h3><div class="raw-grid">${maladaptive
            .filter((s) => s.scoreId !== 'critical')
            .map(
              (section) =>
                `<div class="field"><label for="mal-${section.scoreId}">${esc(section.name)}</label><input id="mal-${section.scoreId}" type="number" min="0" ${locked() ? 'disabled' : ''} data-clinical-maladaptive="${section.scoreId}" value="${assessment.maladaptiveRaw[section.scoreId] ?? ''}"></div>`,
            )
            .join('')}</div>`
        : ''
    }${
      maladaptive.find((s) => s.scoreId === 'critical')
        ? `<h3>البنود الحرجة</h3><div class="critical-grid">${maladaptive
            .find((s) => s.scoreId === 'critical')
            .items.map(
              (item) =>
                `<div class="critical-entry"><div class="field"><label for="critical-${item.number}">البند ${item.number}</label><select id="critical-${item.number}" ${locked() ? 'disabled' : ''} data-clinical-critical="${item.number}"><option value="">غير مدخل</option>${item.allowedScores.map((v) => `<option value="${v}" ${assessment.criticalScores[item.number] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div><label class="critical-note"><span>السياق أو الملاحظة</span><textarea rows="2" maxlength="1000" data-clinical-critical-note="${item.number}" ${locked() ? 'disabled' : ''}>${esc(assessment.criticalNotes[item.number] || '')}</textarea></label></div>`,
            )
            .join('')}</div>`
        : ''
    }<div class="footer-actions"><span class="small muted">القيم الفارغة لا تتحول إلى صفر.</span><button class="btn primary" data-action="clinical-review" ${locked() ? 'disabled' : ''}>حساب ومراجعة</button></div></section>`;
  }
  function renderEntry(assessment, patient, index) {
    return assessment.entryMode === 'raw'
      ? rawEntry(assessment, patient)
      : itemEntry(assessment, patient, index);
  }
  function issueText(issue, route) {
    if (route?.status === 'reverse')
      return `${names[route.subdomain] || names[String(issue.path || '').split('.').at(-1)] || 'Section'}: basal not reached. Return to item ${itemNumber(route.nextItem)} and continue backward until four consecutive responses scored 2 or item 1.${route.ageBoundary ? ' Four zeros do not stop the basal search.' : ''}`;
    if (route?.status === 'findbasal')
      return route.items?.[0]?.enteredScore != null
        ? `${names[route.subdomain] || names[String(issue.path || '').split('.').at(-1)] || 'Section'}: basal not reached by item 1. Continue item ${itemNumber(route.nextItem)} and enter required items; inferred basal credit needs four consecutive responses scored 2.`
        : `${names[route.subdomain] || names[String(issue.path || '').split('.').at(-1)] || 'Section'}: basal must be established. Start with item ${itemNumber(route.nextItem)} and follow the route until four consecutive responses scored 2 or completion through item 1.`;
    if (route?.status === 'continue' && route.nextItem)
      return `${names[route.subdomain] || names[String(issue.path || '').split('.').at(-1)] || 'Section'}: continue item ${itemNumber(route.nextItem)} to complete the administration route.`;
    if (route?.status === 'needs-review')
      return `${names[route.subdomain] || names[String(issue.path || '').split('.').at(-1)] || 'Section'}: basal ${route.basal ? `${route.basal.startNumber}–${route.basal.endNumber}` : '—'} conflicts with ceiling ${route.ceiling ? `${route.ceiling.startNumber}–${route.ceiling.endNumber}` : '—'}. Review responses in both spans.`;
    const map = {
      'Required items not answered': 'Required items not answered',
      'All enabled maladaptive/critical items must be answered': 'Complete enabled maladaptive and critical items',
      'Basal/ceiling ordering conflict': 'Basal/ceiling ordering conflict',
      'Raw score missing': 'Raw score missing',
      'All 20 critical-item responses are required': 'All 20 critical-item responses are required',
      'COM, DLS and SOC are required; Motor is excluded':
        'Composite requires Communication, Daily Living Skills and Socialization',
      'Domain inputs incomplete': 'Domain inputs incomplete',
      'E.1 norms begin at age 3': 'Maladaptive norms begin at age 3',
    };
    const label =
      names[
        String(issue.path || '')
          .split('.')
          .at(-1)
      ] || '';
    const message =
      map[issue.message] ||
      Object.entries(map).find(([key]) => String(issue.message).startsWith(key))?.[1] ||
      'This part of the calculation is incomplete.';
    return label ? `${label}: ${message}` : message;
  }
  const value = (v, suffix = '') =>
    v == null ? 'غير متاح' : `<bdi dir="ltr">${esc(String(v)) + suffix}</bdi>`;
  const demographicAr = (value) =>
    ({
      female: 'أنثى',
      male: 'ذكر',
      parent: 'ولي الأمر',
      mother: 'الأم',
      father: 'الأب',
      caregiver: 'مقدم رعاية',
      other: 'أخرى',
    })[String(value || '').toLowerCase()] || value || '—';
  const levelAr = (value) =>
    ({
      High: 'مرتفع',
      'Moderately High': 'فوق المتوسط',
      Adequate: 'متوسط',
      'Moderately Low': 'أقل من المتوسط',
      Low: 'منخفض',
      Average: 'متوسط',
      Elevated: 'مرتفع',
      'Clinically Significant': 'دال وفق جدول التحويل',
      strength: 'قوة',
      weakness: 'ضعف',
      'not-significant': 'غير دال',
    })[value] ||
    value ||
    'غير متاح';
  const analysisAr = (row, clinicProtocol) => {
    const interpretation = responseInterpretation(row, clinicProtocol);
    if (interpretation?.eligible === false) return interpretationAr(interpretation);
    const significant = clinicProtocol ? row.reviewValues?.significant ?? row.significant : row.significant;
    if (significant == null) return 'غير متاح';
    if (!significant) return 'غير دال';
    if (row.kind === 'pairwise')
      return row.difference == null
        ? 'فرق دال'
        : `فرق دال · ${names[row.left] || row.left} ${Number(row.difference) >= 0 ? 'أعلى من' : 'أقل من'} ${names[row.right] || row.right}`;
    return levelAr(clinicProtocol ? row.reviewValues?.classification ?? row.classification : row.classification);
  };
  // Render the descriptor already captured by the scoring package. Never recompute
  // a frozen report's category from thresholds or mutate its saved interpretation.
  const responseInterpretation = (row, clinicProtocol) => clinicProtocol
    ? row.responseInterpretation ?? (row.interpretation?.status === 'custom-protocol' ? null : row.interpretation)
    : row.interpretation;
  const hasEstimatedResponseLimit = (result) => {
    const clinicProtocol = result?.scoringProtocol?.id === CLINIC_PROTOCOL;
    return Object.values(result?.subdomains || {}).some((row) =>
      responseInterpretation(row, clinicProtocol)?.status === 'do-not-interpret');
  };
  const reportLevel = (row, clinicProtocol, blockedLabel = 'محجوب للتفسير') => {
    if (responseInterpretation(row, clinicProtocol)?.eligible === false) return blockedLabel;
    return esc(levelAr(clinicProtocol ? row.reviewValues?.level ?? row.level : row.level));
  };
  const reportInterpretationBadge = (row, clinicProtocol) => interpretationBadge(
    responseInterpretation(row, clinicProtocol)?.eligible === false
      ? responseInterpretation(row, clinicProtocol) : row.interpretation,
  );
  const statusAr = (value) =>
    ({
      complete: 'مكتمل',
      continue: 'يحتاج متابعة',
      findbasal: 'تحديد الأساس',
      reverse: 'استكمال عكسي',
      'needs-review': 'يحتاج مراجعة',
    })[value] ||
    (value ? 'حالة غير معرّفة' : '—');
  const interpretationAr = (interpretation) => {
    if (interpretation?.status === 'custom-protocol') return 'تحويل جدولي';
    if (interpretation?.eligible === false && interpretation?.status !== 'do-not-interpret')
      return interpretation.status === 'unknown'
        ? 'قابلية التفسير غير محددة'
        : 'غير مؤهل للتفسير · يلزم مراجعة المدخلات';
    return ({
      'probably-not-compromised': 'لا يظهر تأثر التفسير',
      caution: 'يُفسر بحذر',
      'do-not-interpret': 'لا تُفسر النتيجة',
      unknown: 'قابلية التفسير غير محددة',
    })[interpretation?.status] || 'قابلية التفسير غير محددة';
  };
  const interpretationBadge = (interpretation) => {
    const tone =
      interpretation?.status === 'custom-protocol'
        ? 'amber'
        : interpretation?.eligible === false
        ? 'red'
        : interpretation?.status === 'caution'
          ? 'amber'
          : interpretation?.status === 'probably-not-compromised'
            ? 'green'
            : '';
    return `<span class="badge ${tone}">${esc(interpretationAr(interpretation))}</span>`;
  };
  const subdomainOrder = ['REC', 'EXP', 'WRN', 'PER', 'DOM', 'CMY', 'IPR', 'PLA', 'COP', 'GRO', 'FIN'];
  const orderedSubdomains = (rows) =>
    Object.entries(rows).sort(([a], [b]) => subdomainOrder.indexOf(a) - subdomainOrder.indexOf(b));
  function sourceTables(result) {
    const tables = new Set(),
      seen = new Set();
    const visit = (value) => {
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      if (typeof value.table === 'string') tables.add(value.table);
      Object.values(value).forEach(visit);
    };
    visit({ subdomains: result.subdomains, domains: result.domains, abc: result.abc, maladaptive: result.maladaptive, analyses: result.analyses });
    return [...tables].sort().join('، ') || 'غير متاح';
  }
  const evidenceAr = (evidence) =>
    ({
      'complete-administered': 'مكتمل بإجابات مدخلة',
      'manual-basal-ceiling': 'مكتمل بقواعد الأساس والسقف الموثقة',
      'external-raw': 'درجة خام من إدارة خارجية',
      'custom-clinic-age-cap': 'مكتمل بطريقة العيادة بحدّ العمر',
      'provisional-inference': 'إدخال يحتاج إلى مراجعة',
      incomplete: 'إدخال غير مكتمل',
      'conflicting-administration': 'تعارض في الإدارة',
    })[evidence?.method] || 'لم تُسجل حالة الدليل';
  function issueTarget(issue, route) {
    const missing = Array.isArray(issue?.missing) ? issue.missing : [],
      item = route?.nextItem || issue?.nextItem || missing[0] || null,
      section = String(issue?.path || '').split('.').at(-1);
    return item ? { item: String(item), section } : null;
  }
  function issueRow(issue, administration) {
    const route = administration[String(issue?.path || '').split('.').at(-1)];
    const target = issueTarget(issue, route);
    return `<li><span>${esc(issueText(issue, route))}</span>${target ? `<button class="btn tiny" data-action="clinical-review-jump" data-item="${esc(target.item)}" data-section="${esc(target.section)}">انتقال للبند ${esc(itemNumber(target.item))}</button>` : ''}</li>`;
  }
  function renderReviewV2(assessment, result) {
    const allIssues = result.completeness?.issues || [],
      administrationIssues = allIssues.filter((issue) =>
      String(issue.path).startsWith('administration.'),
    ),
      reviewIssues = assessment.entryMode === 'items' && administrationIssues.length ? administrationIssues : allIssues,
      administration = result.administration || {},
      rows = Object.keys(administration).length
        ? Object.entries(administration)
        : orderedSubdomains(result.subdomains || {}).map(([id, row]) => [
            id,
            {
              status: row.raw == null ? 'continue' : 'complete',
              raw: row.raw,
              nextItem: null,
              administrationEvidence: { method: 'external-raw' },
            },
          ]),
      complete = result.completeness?.complete === true;
    return `<section class="card clinical-review"><div class="section-head"><div><h2>${complete ? 'اكتمل حساب النتائج' : 'يلزم استكمال التقييم'}</h2><p class="small muted">راجعي الإجابات ونتائج المجالات قبل حفظ التقرير.</p></div><span class="badge ${complete ? 'green' : 'amber'}">${complete ? 'جاهز لحفظ التقرير' : 'غير مكتمل'}</span></div>${result.interpretationReliability?.considerDiscontinuing ? '<div class="readiness-notice danger" role="alert"><strong>راجعي جودة الاستجابات التقديرية</strong><p>بلغ مجالان فرعيان أو أكثر حد «لا تُفسر». توصي إرشادات المصدر بالنظر في إيقاف الإدارة؛ يبقى القرار للفاحص بعد المراجعة.</p></div>' : ''}${protocolNotice(assessment, result)}<div class="table-wrap"><table><thead><tr><th>المجال الفرعي</th><th>الحالة</th><th>دليل الإدارة</th><th>الخام</th><th>قابلية التفسير</th><th>البدء / حدّ العمر / التالي</th><th>الأساس / السقف</th></tr></thead><tbody>${rows.map(([id, row]) => `<tr><td><strong>${esc(names[id] || id)}</strong></td><td>${esc(statusAr(row.status))}</td><td>${esc(evidenceAr(row.administrationEvidence))}</td><td>${row.raw ?? '—'}</td><td>${interpretationBadge(result.subdomains?.[id]?.interpretation || result.maladaptive?.[id]?.interpretation)}</td><td>${row.startNumber ?? '—'} / ${row.ageBoundary?.endNumber ?? '—'} / ${row.nextItem ? esc(itemNumber(row.nextItem)) : '—'}</td><td>${row.basal ? `${row.basal.startNumber}–${row.basal.endNumber}` : '—'} / ${row.ceiling ? `${row.ceiling.startNumber}–${row.ceiling.endNumber}` : '—'}</td></tr>`).join('')}</tbody></table></div>${assessment.entryMode === 'items' ? `<p class="table-caption">${isClinicProtocol(assessment, result) ? 'حدّ العمر يوقف الأسئلة عند نهاية الفئة. ما فوقه فعليته 0، والإجابات السابقة محفوظة. يستمر البحث العكسي عن الأساس حتى أربع درجات 2 أو البند 1، حتى لو ظهرت أربع درجات 0.' : 'البدء العمري يحدد موضع البدء فقط. الإجابات المدخلة محفوظة كما أدخلها الفاحص؛ البنود المحتسبة قبل الأساس وبعد السقف ظاهرة كحالات استدلالية ولا تتطلب إدخال إجابات فعلية.'}</p>` : '<p class="table-caption">الدرجات الخام من إدارة خارجية؛ لا يمكن التحقق هنا من ترتيب الأساس والسقف أو اكتمال البنود.</p>'}${reviewIssues.length ? `<div class="issues"><h3>ما الذي يحتاج مراجعة؟</h3><ul>${reviewIssues.map((issue) => issueRow(issue, administration)).join('')}</ul></div>` : ''}<div class="review-fields"><div class="field"><label>مستوى الثقة</label><select id="confidence" ${locked() ? 'disabled' : ''}><option value="85" ${String(assessment.confidenceLevel) === '85' ? 'selected' : ''}>85%</option><option value="90" ${String(assessment.confidenceLevel) === '90' ? 'selected' : ''}>90%</option><option value="95" ${String(assessment.confidenceLevel) === '95' ? 'selected' : ''}>95%</option></select></div><div class="field"><label>مستوى الدلالة</label><select id="significance" ${locked() ? 'disabled' : ''}><option value="0.05" ${String(assessment.significanceLevel) === '0.05' ? 'selected' : ''}>0.05</option><option value="0.10" ${String(assessment.significanceLevel) === '0.10' ? 'selected' : ''}>0.10</option></select></div></div><div class="field note-field"><label for="note">ملاحظة الفاحص <span>اختيارية</span></label><textarea id="note" maxlength="2000" ${locked() ? 'disabled' : ''}>${esc(assessment.note || '')}</textarea></div><div class="footer-actions"><button class="btn" data-action="clinical-back">العودة للإدخال</button><button class="btn primary" data-action="clinical-finalize" ${complete && !locked() ? '' : 'disabled'}>حفظ التقرير</button></div></section>`;
  }
  // Keep saved identity intact. The report displays only the requested branding
  // fields; legacy reports may use current optional fields for presentation.
  function reportBranding(assessment, settings = {}) {
    const snapshot = assessment.reportSnapshot || {};
    const fields = ['clinicLogo', 'logoWatermark'];
    const identity = {};
    for (const field of fields)
      identity[field] = Object.hasOwn(snapshot, field) ? snapshot[field] : settings[field];
    const logo = typeof identity.clinicLogo === 'string' && identity.clinicLogo.length <= 90000 &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(identity.clinicLogo)
      ? identity.clinicLogo : null;
    const header = logo ? `<div class="clinic-report-branding"><img class="clinic-report-logo" src="${esc(logo)}" alt="شعار العيادة"></div>` : '';
    const watermark = logo && identity.logoWatermark === true
      ? `<img class="clinic-report-watermark" src="${esc(logo)}" alt="" aria-hidden="true">` : '';
    return { header, watermark };
  }
  // Presentation only: read the saved values; never derive scores or classifications.
  function renderScoreProfile(assessment, result) {
    if (assessment.status !== 'final') return '';
    const rows = ['COM', 'DLS', 'SOC'].map((id) => ({ id, row: result.domains?.[id] }));
    rows.push({ id: 'ABC', row: result.abc });
    if (result.domains?.MOT) rows.push({ id: 'MOT', row: result.domains.MOT });
    const usable = (row) => typeof row?.standardScore === 'number' && Number.isFinite(row.standardScore) && row.standardScore >= 0;
    const values = rows.filter(({ row }) => usable(row)).map(({ row }) => row.standardScore);
    if (!values.length) return '';
    const axisMax = Math.max(160, Math.ceil(Math.max(...values) / 40) * 40);
    const clinicProtocol = isClinicProtocol(assessment, result);
    return `<figure class="card report-card score-profile"><figcaption><h2>ملخص بصري للنتائج</h2><p class="small muted">درجات المجالات والمركب كما هي في الجداول المحفوظة.</p></figcaption><div class="score-profile-axis" aria-hidden="true" dir="ltr">${[0, 1, 2, 3, 4].map((n) => `<span>${n * axisMax / 4}</span>`).join('')}</div>${rows.map(({ id, row }) => `<div class="score-profile-row${id === 'ABC' ? ' is-composite' : id === 'MOT' ? ' is-motor' : ''}"><div class="score-profile-label">${id === 'ABC' ? 'المركب التكيفي ABC' : esc(names[id])}</div><div class="score-profile-track" dir="ltr" aria-hidden="true">${usable(row) ? `<span class="score-profile-fill" style="width:${row.standardScore / axisMax * 100}%"></span>` : ''}</div><strong class="score-profile-value">${usable(row) ? value(row.standardScore) : 'غير متاح'}</strong>${row ? `<div class="score-profile-note">${reportInterpretationBadge(row, clinicProtocol)}</div>` : ''}</div>`).join('')}<p class="table-caption">القيم درجات معيارية وليست نسباً مئوية.${result.domains?.MOT ? ' المهارات الحركية تُعرض مستقلة ولا تدخل ضمن ABC.' : ''}</p></figure>`;
  }
  function renderReportV2(assessment, result, patient, settings = {}) {
    const subs = result.subdomains || {},
      domainRows = result.domains || {},
      branding = reportBranding(assessment, settings),
      age = result.age || {},
      identity = result.identity || {},
      clinicProtocol = isClinicProtocol(assessment, result),
      snapshotHash = assessment.scoringSnapshot?.snapshotHash || result.snapshotHash,
      criticalNote = (item) => assessment.criticalNotes?.[item.id] || item.note || item.context || '',
      reliability = result.interpretationReliability || {},
      ci = (row) =>
        Array.isArray(row?.ci) ? `<bdi dir="ltr">${esc(row.ci[0])}–${esc(row.ci[1])}</bdi>` : 'غير متاح';
    return `<article id="report" class="clinical-report">${branding.watermark}<header class="report-head"><div class="row spread">${branding.header}<span class="badge green">${assessment.status === 'final' ? 'نتيجة محفوظة' : 'نتيجة محسوبة'}</span></div><h2>تقرير المهارات التكيفية</h2></header>${protocolNotice(assessment, result)}<div class="readiness-notice" role="note"><strong>حالة هذه النتيجة</strong><p>${assessment.status === 'final' ? 'النتيجة محفوظة مع هذه الزيارة. تعرض الجداول أدناه الدرجات والتحليلات كما كانت عند حفظ التقرير.' : 'اكتمل الحساب. احفظي التقرير لتثبيت النتائج مع هذه الزيارة.'}</p></div>${reliability.considerDiscontinuing ? '<div class="readiness-notice danger" role="alert"><strong>مراجعة نسبة الإجابات التقديرية</strong><p>بلغ مجالان فرعيان أو أكثر حد «لا تُفسر». تنص إرشادات المصدر على النظر في إيقاف الإدارة ومراجعة جودة الاستجابات؛ القرار للفاحص وليس حكماً آلياً.</p></div>' : ''}<div class="report-grid"><div><span>اسم الطفل</span><strong>${esc(patient.name)}</strong></div><div><span>تاريخ الميلاد · العمر</span><bdi>${esc(patient.dob)}</bdi> · ${value(age.years)} سنة ${value(age.months)} شهر ${value(age.days)} يوم</div><div><span>الجنس · تاريخ التقييم</span>${esc(demographicAr(patient.sex))} · <bdi>${esc(assessment.date)}</bdi></div><div><span>المستجيب</span>${esc(assessment.respondent)} · ${esc(demographicAr(assessment.relationship))}</div><div><span>القائم بالفحص</span>${esc(assessment.examiner)}</div><div><span>إعدادات التحليل</span>ثقة ${value(assessment.confidenceLevel, '%')} · دلالة ${value(assessment.significanceLevel)}</div></div><section class="card report-card"><h2>المجالات الفرعية</h2><div class="table-wrap"><table><thead><tr><th>المجال</th><th>الخام</th><th>v-scale</th><th>${clinicProtocol ? 'المستوى حسب الجدول' : 'المستوى'}</th><th>العمر المكافئ</th><th>GSV</th><th>تقديري من المدخل</th><th>قابلية التفسير</th></tr></thead><tbody>${orderedSubdomains(
      subs,
    )
      .map(
        ([id, row]) =>
          `<tr><td><strong>${esc(names[id] || id)}</strong></td><td>${value(row.raw)}</td><td>${value(row.vScale)}</td><td>${reportLevel(row, clinicProtocol)}</td><td>${value(row.ae)}</td><td>${value(row.gsv)}</td><td>${value(row.percentEstimated, '%')} <small>من المدخل</small></td><td>${reportInterpretationBadge(row, clinicProtocol)}</td></tr>`,
      )
      .join(
        '',
      )}</tbody></table></div></section><section class="card report-card"><h2>المجالات والمركب</h2><div class="norms">${Object.entries(
      domainRows,
    )
      .filter(([, row]) => row)
      .map(
        ([id, row]) =>
          `<div class="norm"><span>${esc(names[id] || id)}</span><b>${value(row.standardScore)}</b><small>${clinicProtocol ? 'المستوى حسب الجدول: ' : ''}${reportLevel(row, clinicProtocol, 'التصنيف محجوب')} · المئين ${value(row.percentile)} · ثقة ${ci(row)}</small>${reportInterpretationBadge(row, clinicProtocol)}</div>`,
      )
      .join(
        '',
      )}${result.abc ? `<div class="norm featured"><span>المركب التكيفي ABC</span><b>${value(result.abc.standardScore)}</b><small>${clinicProtocol ? 'المستوى حسب الجدول: ' : ''}${reportLevel(result.abc, clinicProtocol, 'التصنيف محجوب')} · المئين ${value(result.abc.percentile)} · ثقة ${ci(result.abc)}</small>${reportInterpretationBadge(result.abc, clinicProtocol)}</div>` : ''}</div></section>${renderScoreProfile(assessment, result)}${
      Object.keys(result.maladaptive || {}).length
        ? `<section class="card report-card"><h2>السلوك غير التكيفي</h2><div class="table-wrap"><table><thead><tr><th>المقياس</th><th>الخام</th><th>v-scale</th><th>${clinicProtocol ? 'المستوى حسب الجدول' : 'المستوى'}</th><th>قابلية التفسير</th></tr></thead><tbody>${Object.entries(
            result.maladaptive,
          )
            .map(
              ([id, row]) =>
                `<tr><td>${esc(names[id] || id)}</td><td>${value(row.raw)}</td><td>${value(row.vScale)}</td><td>${reportLevel(row, clinicProtocol)}</td><td>${reportInterpretationBadge(row, clinicProtocol)}</td></tr>`,
            )
            .join(
              '',
            )}</tbody></table></div><h3>البنود الحرجة الموجبة</h3>${result.critical?.length ? result.critical.map((item) => `<div class="critical-row"><div><strong>البند ${esc(item.id)}</strong> <span class="badge amber">الدرجة ${esc(item.score)}</span></div><p>${criticalNote(item) ? esc(criticalNote(item)) : '<span class="muted">لم تُسجل ملاحظة سياقية لهذا البند.</span>'}</p></div>`).join('') : '<p class="muted">لا توجد استجابات موجبة مسجلة.</p>'}</section>`
        : ''
    }<section class="card report-card"><h2>القوة والضعف والمقارنات${clinicProtocol ? ' · حسب الجداول' : ''}</h2>${clinicProtocol ? '<p class="table-caption">الفروق والقيم الحرجة ومعدلات الأساس حسب جداول التحويل وبطريقة التطبيق الموضحة أعلاه.</p>' : ''}<div class="table-wrap"><table><thead><tr><th>التحليل</th><th>الفرق</th><th>القيمة الحرجة</th><th>النتيجة</th><th>معدل الأساس</th></tr></thead><tbody>${(result.analyses || []).map((row) => `<tr><td>${row.kind === 'pairwise' ? 'مقارنة زوجية' : 'مقارنة بالمتوسط'} · ${esc(names[row.left] || row.left)}${row.right && row.right !== 'mean' ? ` / ${esc(names[row.right] || row.right)}` : ''}</td><td>${value(row.difference)}</td><td>${value(row.critical)}</td><td>${esc(analysisAr(row, clinicProtocol))}</td><td>${responseInterpretation(row, clinicProtocol)?.eligible === false ? '—' : value(clinicProtocol ? row.reviewValues?.baseRate ?? row.baseRate : row.baseRate)}</td></tr>`).join('')}</tbody></table></div></section>${assessment.note ? `<section class="card report-card"><h2>ملاحظة الفاحص</h2><p class="pre-wrap">${esc(assessment.note)}</p></section>` : ''}<details class="card report-card provenance"><summary>مصدر الحساب وإصداراته</summary><dl><div><dt>طريقة التطبيق</dt><dd>${assessment.entryMode === "raw" ? "درجات خام من إدارة خارجية · طريقة التطبيق غير متحققة هنا" : `${esc(result.scoringProtocol?.label || (clinicProtocol ? "طريقة العيادة بحدّ العمر" : "مسار المقابلة المرجعي"))} · ${clinicProtocol ? "غير معيارية" : "مرجعية"}`}</dd></div><div><dt>النموذج</dt><dd>${esc(identity.form || result.form || 'غير متاح')} · ${esc(identity.level || result.level || 'غير متاح')}</dd></div><div><dt>الإصدار</dt><dd>${esc(identity.edition || result.edition || 'غير متاح')}</dd></div><div><dt>أداة الإدخال</dt><dd><bdi dir="ltr">${esc(result.instrumentId || assessment.instrumentId || 'غير متاح')} · ${esc(result.instrumentVersion || 'غير متاح')}</bdi></dd></div><div><dt>بصمة أداة الإدخال</dt><dd><code dir="ltr">${esc(result.instrumentHash || 'غير متاح')}</code></dd></div><div><dt>حزمة الجداول</dt><dd><bdi dir="ltr">${esc(result.packageId || 'غير متاح')} · ${esc(result.packageVersion || 'غير متاح')}</bdi></dd></div><div><dt>نسخة الجداول / المعايير</dt><dd><bdi dir="ltr">${esc(result.tableVersion || identity.normSet || 'غير متاح')}</bdi></dd></div><div><dt>جداول المصدر المستخدمة</dt><dd><bdi dir="ltr">${esc(sourceTables(result))}</bdi></dd></div><div><dt>محرك الحساب</dt><dd><bdi dir="ltr">${esc(result.engineVersion || 'غير متاح')} · مرجع ${esc(result.referenceEngineVersion || 'غير متاح')}</bdi></dd></div><div><dt>بصمة الحزمة</dt><dd><code dir="ltr">${esc(result.packageHash || 'غير متاح')}</code></dd></div><div><dt>بصمة لقطة النتيجة</dt><dd><code dir="ltr">${esc(snapshotHash || 'غير متاح')}</code></dd></div></dl></details><p class="footer-note">إرشادات المصدر للإجابات التقديرية: أقل من 15% غالباً لا يتأثر معه التفسير؛ من 15% إلى أقل من 25% يُفسر بحذر؛ و25% فأكثر لا تُفسر النتيجة. راجعي علامة قابلية التفسير لكل قسم.</p></article>`;
  }
  root.NamaaClinical = {
    enabled: true,
    setInstrument,
    getInstrument,
    prepare,
    sections,
    renderEntry,
    renderReview: renderReviewV2,
    renderReport: renderReportV2,
    score,
    invalidate,
    guidanceState,
    confirmedRoute,
    routeGuidance,
    routeState,
    progressMarkup,
    cached,
    progress,
    results,
    ageBoundary,
    ageExcluded,
    ageCapSummary,
    isClinicProtocol,
    hasEstimatedResponseLimit,
    label: (id) => names[id] || id,
  };
})(window);
