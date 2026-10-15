const icons = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3a4 4 0 0 1 0 8"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3M12 17h.01"/>',
  arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  print:
    '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6zM18 12h.01"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
};
const icon = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[n] || icons.file}</svg>`;
Object.assign(icons, {
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2l-2.8 2.8a2 2 0 0 0-2-.4 2 2 0 0 0-1 1.6h-4a2 2 0 0 0-1-1.6 2 2 0 0 0-2 .4L4.2 17a2 2 0 0 0 .4-2A2 2 0 0 0 3 14v-4a2 2 0 0 0 1.6-1 2 2 0 0 0-.4-2L7 4.2a2 2 0 0 0 2 .4A2 2 0 0 0 10 3h4a2 2 0 0 0 1 1.6 2 2 0 0 0 2-.4L19.8 7a2 2 0 0 0-.4 2 2 2 0 0 0 1.6 1v4a2 2 0 0 0-1.6 1Z"/>',
  archive: '<path d="M3 6h18M5 6v14h14V6M8 3h8l2 3H6zM9 11h6"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  trend: '<path d="m4 17 5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
});
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
('use strict');
const L = NamaaLogic,
  KEY = 'namaa.demo.v1',
  VERSION = 2;
const defaultSettings = () => ({
  clinicName: globalThis.NamaaRemote?.enabled ? 'Fineland Clinic' : 'Fineland Demo Clinic',
  doctorName: '',
  clinicSpecialty: '',
  clinicAddress: '',
  clinicPhone: '',
  clinicLogo: '',
  logoWatermark: false,
  defaultExaminer: '',
  confidenceLevel: '90',
  significanceLevel: '0.05',
});
const today = () => L.localToday().iso;
const groups = [
  ['COM', 'التواصل'],
  ['DLS', 'مهارات الحياة اليومية'],
  ['SOC', 'التنشئة الاجتماعية'],
  ['MOT', 'المهارات الحركية'],
  ['MAL', 'السلوك غير التكيفي'],
];
// Original illustrative items only; these are not Vineland items or a scoring instrument.
const domains = [
  [
    'rec',
    'الاستقبالي',
    'COM',
    [
      'Demonstration: follows a simple explanation of a new activity.',
      'Demonstration: follows a short conversation about a familiar topic.',
      'Demonstration: understands an everyday message addressed to them.',
    ],
  ],
  [
    'exp',
    'التعبيري',
    'COM',
    ['Demonstration: explains a choice during a group activity.', 'Demonstration: describes an everyday experience.', 'Demonstration: asks for clarification when help is needed.'],
  ],
  [
    'wrn',
    'الكتابي',
    'COM',
    [
      'Demonstration: uses a written reminder.',
      'Demonstration: responds to an age-appropriate written message.',
      'Demonstration: records a short idea in their own way.',
    ],
  ],
  [
    'per',
    'الشخصي',
    'DLS',
    ['Demonstration: puts away materials after a daily routine.', 'Demonstration: prepares supplies for a personal activity.', 'Demonstration: helps organize personal belongings.'],
  ],
  [
    'dom',
    'المنزلي',
    'DLS',
    ['Demonstration: helps tidy a shared space.', 'Demonstration: returns household activity supplies.', 'Demonstration: helps with an agreed household task.'],
  ],
  [
    'cmm',
    'المجتمعي',
    'DLS',
    [
      'Demonstration: follows an agreed routine during a visit.',
      'Demonstration: prepares to go to a familiar place.',
      'Demonstration: asks a companion for help when needed.',
    ],
  ],
  [
    'ipr',
    'العلاقات الشخصية',
    'SOC',
    ['Demonstration: shows interest in what others share.', 'Demonstration: chooses an activity with a peer.', 'Demonstration: converses in a familiar setting.'],
  ],
  [
    'pla',
    'اللعب ووقت الفراغ',
    'SOC',
    ['Demonstration: suggests a leisure activity.', 'Demonstration: shares supplies during an enjoyable activity.', 'Demonstration: agrees to change between play activities.'],
  ],
  [
    'cop',
    'مهارات التأقلم',
    'SOC',
    ['Demonstration: accepts a small change in an activity plan.', 'Demonstration: asks for a break when distressed.', 'Demonstration: returns to an activity after a short pause.'],
  ],
  [
    'gmo',
    'الحركي الكبير',
    'MOT',
    ['Demonstration: joins an appropriate group movement activity.', 'Demonstration: moves between activity stations.', 'Demonstration: keeps balance during a familiar game.'],
  ],
  [
    'fmo',
    'الحركي الدقيق',
    'MOT',
    ['Demonstration: arranges small pieces in an activity.', 'Demonstration: uses drawing tools in a simple task.', 'Demonstration: completes an age-appropriate craft.'],
  ],
  [
    'internal',
    'الداخلية',
    'MAL',
    ['Demonstration: repeated internal distress observation.', 'Demonstration: withdrawal from a familiar situation.'],
  ],
  [
    'external',
    'الخارجية',
    'MAL',
    ['Demonstration: visible behavioral resistance observation.', 'Demonstration: difficulty regulating behavior.'],
  ],
  [
    'critical',
    'البنود الحرجة',
    'MAL',
    [
      'Demonstration critical item A — clinician review required.',
      'Demonstration critical item B — clinician review required.',
      'Demonstration critical item C — clinician review required.',
    ],
  ],
].map(([id, name, group, items]) => ({
  id,
  name,
  group,
  items: items.map((text, i) => ({ id: `${id}_${i}`, text })),
}));
const activeDomains = (a) =>
  domains.filter((d) => (d.group !== 'MOT' || a.motor) && (d.group !== 'MAL' || a.maladaptive));
const allItems = (a) => activeDomains(a).flatMap((d) => d.items.map((i) => ({ ...i, subdomainId: d.id })));
const stats = (a) =>
  L.aggregateSyntheticAnswers(
    allItems(a).map((i) => ({ subdomainId: i.subdomainId, score: a.answers[i.id] })),
  );
const pct = (a) => Math.round((100 * stats(a).answeredCount) / allItems(a).length);
const uid = () =>
  globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
let storageBlocked = false,
  storageMessage = '',
  view = 'home',
  current = null,
  subIndex = 0,
  searchQuery = '',
  reportFilter = false,
  toastTimer,
  pendingImport = null,
  comparisonSelections = new Map();
const userRole = () => globalThis.NamaaRemote?.user?.role || 'owner';
const canEditWorkspace = () => !globalThis.NamaaRemote?.enabled || userRole() !== 'viewer';
const capability = (name) =>
  globalThis.NamaaRemote?.user?.capabilities?.[name] ?? globalThis.NamaaRemote?.capabilities?.[name];
const canManageBackup = () => {
  if (!globalThis.NamaaRemote?.enabled) return true;
  const allowed = capability('canManageBackup');
  return allowed === undefined ? userRole() === 'owner' : allowed === true;
};
const canViewPhone = () => {
  if (!globalThis.NamaaRemote?.enabled) return true;
  const allowed = capability('canViewPhone');
  return allowed === undefined ? ['owner', 'clinician'].includes(userRole()) : allowed === true;
};
function makeAssessment(patientId, overrides = {}) {
  return {
    id: uid(),
    patientId,
    date: today(),
    examiner: '',
    respondent: '',
    relationship: 'الأم',
    motor: true,
    maladaptive: true,
    answers: {},
    estimated: {},
    note: '',
    status: 'draft',
    confidenceLevel: '90',
    significanceLevel: '0.05',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
function seed() {
  const settings = { ...defaultSettings(), defaultExaminer: 'Demo Examiner' };
  const patients = [
    { id: 'demo-adam', name: 'Adam', dob: '2020-03-14', sex: 'ذكر', phone: '', archived: false },
    { id: 'demo-layan', name: 'Layan', dob: '2019-06-20', sex: 'أنثى', phone: '', archived: false },
    { id: 'demo-omar', name: 'Omar', dob: '2018-10-05', sex: 'ذكر', phone: '', archived: false },
  ];
  const assessments = patients.map((p, k) => {
    const a = makeAssessment(p.id, {
      id: `demo-assessment-${k}`,
      examiner: settings.defaultExaminer,
       respondent: 'Demo Respondent',
      date: today(),
      status: k ? 'final' : 'draft',
    });
    allItems(a).forEach((it, i) => {
      if (k || i < 13) a.answers[it.id] = k ? i % 3 : (i + 1) % 3;
    });
    if (k) {
      a.patientSnapshot = { ...p };
      a.reportSnapshot = {
        clinicName: settings.clinicName,
        confidenceLevel: a.confidenceLevel,
        significanceLevel: a.significanceLevel,
      };
      a.finalizedAt = a.createdAt;
    }
    return a;
  });
  return { version: VERSION, settings, patients, assessments };
}
function cleanText(value, max = 120) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}
function normalizeSettings(value = {}) {
  const base = defaultSettings();
  const doctorName = cleanText(value.doctorName, 100);
  const logo = typeof value.clinicLogo === 'string' && value.clinicLogo.length <= 90000 &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.clinicLogo)
      ? value.clinicLogo : '';
  return {
    clinicName: globalThis.NamaaRemote?.enabled && value.clinicName === 'عيادة نماء التجريبية'
      ? base.clinicName : cleanText(value.clinicName, 200) || base.clinicName,
    doctorName,
    clinicSpecialty: cleanText(value.clinicSpecialty, 160),
    clinicAddress: cleanText(value.clinicAddress, 300),
    clinicPhone: cleanText(value.clinicPhone, 40),
    clinicLogo: logo,
    logoWatermark: value.logoWatermark === true || value.logoWatermark === 'on',
    defaultExaminer: cleanText(value.defaultExaminer, 80) || doctorName.slice(0, 80),
    confidenceLevel: ['85', '90', '95'].includes(String(value.confidenceLevel))
      ? String(value.confidenceLevel)
      : base.confidenceLevel,
    significanceLevel: ['0.05', '0.10'].includes(String(value.significanceLevel))
      ? String(value.significanceLevel)
      : base.significanceLevel,
  };
}
function validateImport(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    ![1, 2].includes(Number(input.version)) ||
    !Array.isArray(input.patients) ||
    !Array.isArray(input.assessments)
  )
    throw Error('صيغة النسخة غير مدعومة.');
  if (input.patients.length > 5000 || input.assessments.length > 20000)
    throw Error('حجم النسخة أكبر من الحد المسموح.');
  const settings = normalizeSettings(input.settings),
    pids = new Set(),
    aids = new Set();
  const patients = input.patients.map((p, i) => {
    if (!p || typeof p !== 'object') throw Error(`بيانات الملف ${i + 1} غير صالحة.`);
    const id = cleanText(p.id),
      name = cleanText(p.name, 80),
      dob = cleanText(p.dob, 10);
    if (!id || !name || !dob || pids.has(id)) throw Error(`بيانات الملف ${i + 1} ناقصة أو مكررة.`);
    L.parseStrictDate(dob);
    pids.add(id);
    return {
      id,
      name,
      dob,
      sex: cleanText(p.sex, 20),
      phone: cleanText(p.phone, 25),
      archived: Boolean(p.archived),
      archivedAt: p.archivedAt ? cleanText(p.archivedAt, 40) : null,
    };
  });
  const assessments = input.assessments.map((a, i) => {
    if (
      !a ||
      typeof a !== 'object' ||
      !a.id ||
      aids.has(a.id) ||
      !pids.has(a.patientId) ||
      !['draft', 'final'].includes(a.status) ||
      !a.answers ||
      !a.estimated
    )
      throw Error(`التقييم ${i + 1} غير صالح.`);
    L.parseStrictDate(a.date);
    for (const [key, value] of Object.entries(a.answers)) {
      if (
        !(
          domains.some((d) => d.items.some((item) => item.id === key)) ||
          globalThis.NamaaRemote?.instrument?.subdomains?.some((d) => d.items.some((item) => item.id === key))
        ) ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 2
      )
        throw Error(`إجابة غير صالحة في التقييم ${i + 1}.`);
    }
    aids.add(a.id);
    const migrated = {
      ...a,
      id: cleanText(a.id),
      patientId: cleanText(a.patientId),
      examiner: cleanText(a.examiner, 80),
      respondent: cleanText(a.respondent, 80),
      relationship: cleanText(a.relationship, 30) || 'الأم',
      note: cleanText(a.note, 2000),
      motor: a.motor !== false,
      maladaptive: a.maladaptive !== false,
      confidenceLevel: ['85', '90', '95'].includes(String(a.confidenceLevel))
        ? String(a.confidenceLevel)
        : settings.confidenceLevel,
      significanceLevel: ['0.05', '0.10'].includes(String(a.significanceLevel))
        ? String(a.significanceLevel)
        : settings.significanceLevel,
    };
    stats(migrated);
    return migrated;
  });
  return { version: VERSION, settings, patients, assessments };
}
function load() {
  try {
    const remote = globalThis.NamaaRemote;
    if (remote?.enabled) return validateImport(remote.load());
    const raw = localStorage.getItem(KEY);
    return raw ? validateImport(JSON.parse(raw)) : seed();
  } catch (e) {
    storageBlocked = true;
    storageMessage =
      'تعذر قراءة الحفظ المحلي. البيانات الأصلية لن تُستبدل؛ يمكنك تجربة الواجهة وتنزيل نسخة من عملك.';
    return seed();
  }
}
let db = load();
function save() {
  if (storageBlocked) return false;
  try {
    db.version = VERSION;
    if (globalThis.NamaaRemote?.enabled) return globalThis.NamaaRemote.save(db);
    localStorage.setItem(KEY, JSON.stringify(db));
    storageMessage = '';
    return true;
  } catch (e) {
    storageMessage = 'لم يُحفظ التغيير. أبقي الصفحة مفتوحة ونزّلي نسخة من عملك.';
    return false;
  }
}
function saveFeedback(saved, successText) {
  if (!saved) return 'تعذر حفظ التغيير على هذا الجهاز. أبقي الصفحة مفتوحة.';
  return globalThis.NamaaRemote?.enabled
    ? globalThis.NamaaRemote.statusText?.() || 'بانتظار الحفظ على الخادم'
    : successText;
}
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
async function download() {
  if (globalThis.NamaaRemote?.enabled && globalThis.NamaaRemote.downloadBackup) {
    await globalThis.NamaaRemote.downloadBackup();
    return;
  }
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `namaa-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('تم تجهيز نسخة البيانات للتنزيل');
}
function age(p, date = today()) {
  try {
    const a = L.calendarAge(p.dob, date);
    return `${a.years} سنة · ${a.months} شهر · ${a.days} يوم`;
  } catch {
    return 'راجعي تاريخ الميلاد والتقييم';
  }
}
function dateLabel(d) {
  try {
    return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${d}T12:00:00`),
    );
  } catch {
    return esc(d);
  }
}
const patientOf = (a) => a.patientSnapshot || db.patients.find((p) => p.id === a.patientId);
function clinicalEligibility(patient, date) {
  try {
    const value = L.calendarAge(patient.dob, date);
    return { motor: value.years < 10, maladaptive: value.years >= 3 };
  } catch {
    return { motor: true, maladaptive: true };
  }
}
function steps(n) {
  return `<div class="steps">${['بيانات الطفل', 'تسجيل الإجابات', 'مراجعة التقييم', 'التقرير'].map((x, i) => `<div class="step ${i === n ? 'active' : i < n ? 'done' : ''}"><span>${i < n ? '✓' : i + 1}</span>${x}</div>`).join('')}</div>`;
}
function shell(content) {
  const status = globalThis.NamaaRemote?.enabled
    ? globalThis.NamaaRemote.statusText?.() || 'مساحة متصلة'
    : 'حفظ محلي على هذا المتصفح';
  const contextNote = globalThis.NamaaRemote?.enabled
    ? 'مساحة التقييم والمتابعة · راجعي اكتمال التقرير قبل الحفظ'
    : 'بيانات وبنود اصطناعية للتجربة فقط · غير مخصص للتقييم السريري';
  document.getElementById('app').innerHTML =
    `<div class="shell"><aside class="sidebar"><div class="brand">${db.settings.clinicLogo ? `<img class="brand-logo" src="${esc(db.settings.clinicLogo)}" alt="شعار العيادة">` : '<span class="brand-icon"><i></i><i></i><i></i></span>'}<div><strong>فينلاند</strong><small>التقييم والمتابعة</small></div></div><div class="nav-label">مساحة العمل</div><nav><button class="nav-item ${view === 'home' && !reportFilter ? 'active' : ''}" data-action="home">${icon('users')} ملفات الأطفال</button><button class="nav-item ${reportFilter ? 'active' : ''}" data-action="reports">${icon('file')} التقارير</button><button class="nav-item ${view === 'archived' ? 'active' : ''}" data-action="archived">${icon('archive')} الأرشيف</button><button class="nav-item ${view === 'settings' ? 'active' : ''}" data-action="settings">${icon('settings')} الإعدادات والبيانات</button><button class="nav-item ${view === 'help' ? 'active' : ''}" data-action="help">${icon('help')} دليل الاستخدام</button></nav><div class="sidebar-foot"><div class="row"><div class="avatar">ف</div><div><strong>فينلاند</strong><br><span>مساحة العيادة</span></div></div>${canManageBackup() ? `<button class="btn text small" data-action="download">${icon('download')} ${globalThis.NamaaRemote?.enabled ? 'نسخة احتياطية مشفرة' : 'تنزيل نسخة البيانات'}</button>` : ''}</div></aside><div class="workspace"><header class="topbar"><div><small>مساحة العيادة</small><strong>فينلاند</strong></div><span class="muted"><i class="status-dot"></i>${esc(status)}</span></header><main id="main-content" class="content" tabindex="-1">${storageMessage ? `<div class="error" role="alert">${esc(storageMessage)} ${canManageBackup() ? '<button class="btn tiny" data-action="download">تنزيل نسخة</button>' : ''}</div>` : ''}${content}<div class="demo-strip no-print">${icon('shield')} ${esc(contextNote)}</div></main></div></div>`;
  window.scrollTo(0, 0);
  if (view === 'settings' && globalThis.NamaaRemote?.user?.role === 'viewer')
    document
      .querySelectorAll('#settings-form input,#settings-form select,#settings-form button')
      .forEach((element) => (element.disabled = true));
}
function head(k, title, desc, actions = '') {
  return `<div class="page-head"><div><p class="eyebrow">${k}</p><h1>${title}</h1><p class="muted">${desc}</p></div><div class="toolbar">${actions}</div></div>`;
}
function patientRows() {
  const needle = L.normalizeArabic(searchQuery);
  const matches = db.patients.filter(
    (p) => !p.archived && L.normalizeArabic(`${p.name} ${canViewPhone() ? p.phone || '' : ''}`).includes(needle),
  );
  return (
    matches
      .map((p) => {
        const as = db.assessments
          .filter((a) => a.patientId === p.id && (!reportFilter || a.status === 'final'))
          .sort((a, b) => b.date.localeCompare(a.date));
        const a = as[0];
        if (reportFilter && !a) return '';
        const progress = assessmentProgress(a);
        return `<tr><td><div class="patient-cell"><div class="avatar">${esc(p.name[0])}</div><div><strong>${esc(p.name)}</strong><small>${esc(p.id.startsWith('demo-') ? 'ملف تجريبي' : 'ملف العيادة')} · ${as.length} تقييم</small></div></div></td><td>${a ? esc(age(p, a.date)) : '<span class="placeholder">لا يوجد تقييم بعد</span>'}</td><td>${a ? dateLabel(a.date) : '—'}</td><td>${a ? `<span class="badge ${a.status === 'final' ? 'green' : 'amber'}">${a.status === 'final' ? 'تقرير محفوظ' : 'مسودة · ' + progress.percent + '%'}</span>` : '<span class="badge">ملف جديد</span>'}</td><td><button class="btn tiny" data-action="patient" data-id="${esc(p.id)}">فتح الملف</button></td></tr>`;
      })
      .join('') || '<tr><td colspan="5" class="empty">لا توجد ملفات مطابقة لبحثك.</td></tr>'
  );
}
function home(reports = false) {
  view = 'home';
  reportFilter = reports;
  searchQuery = '';
  const activeIds = new Set(db.patients.filter((p) => !p.archived).map((p) => p.id)),
    drafts = db.assessments.filter((a) => a.status === 'draft' && activeIds.has(a.patientId)),
    last = drafts.at(-1);
  shell(
    `${head(reports ? 'سجل الزيارات' : 'مرحباً بكِ', reports ? 'النتائج المحفوظة' : 'ملفات الأطفال', reports ? 'افتحي نتيجة محفوظة أو ارجعي إلى سجل الطفل.' : 'كل ملف يجمع الزيارات والمسودات والنتائج في مكان واحد.', canEditWorkspace() ? `<button class="btn primary" data-action="new">${icon('plus')} تقييم جديد</button>` : '')}<div class="grid3">${[
      ['users', activeIds.size, 'ملفات نشطة'],
      ['clock', drafts.length, 'مسودات قيد العمل'],
      [
        'check',
        db.assessments.filter((a) => a.status === 'final' && activeIds.has(a.patientId)).length,
        'نتائج محفوظة',
      ],
    ]
      .map(
        (x) =>
          `<div class="stat"><div><span class="small muted">${x[2]}</span><b>${x[1]}</b></div><div class="icon-wrap">${icon(x[0])}</div></div>`,
      )
      .join(
        '',
      )}</div>${!reports && last ? (() => { const progress = assessmentProgress(last); return `<div class="resume"><div class="avatar">${esc(patientOf(last).name[0])}</div><div class="resume-body"><span class="badge blue">مسودة أخيرة</span><h3>${esc(patientOf(last).name)}</h3><span class="small muted">${progress.summary}</span></div><div><div class="mini-progress"><span style="width:${progress.percent}%"></span></div><span class="small muted">${progress.percent}% ${last.entryMode === 'raw' ? 'من حقول الدرجات أُدخلت' : 'من البنود أُدخلت'}</span></div><button class="btn" data-action="open" data-id="${last.id}">متابعة ${icon('arrow')}</button></div>`; })() : '<div style="height:24px"></div>'}<section class="card"><div class="section-head"><div><h2>${reports ? 'التقارير حسب الطفل' : 'الأطفال في العيادة'}</h2><span class="small muted">${reports ? 'كل نتيجة محفوظة نسخة مستقلة' : canViewPhone() ? 'ابحثي بالاسم أو الهاتف، ثم افتحي الملف' : 'ابحثي بالاسم، ثم افتحي الملف'}</span></div><div class="search">${icon('search')}<input id="search" aria-label="${canViewPhone() ? 'البحث باسم الطفل أو الهاتف' : 'البحث باسم الطفل'}" placeholder="${canViewPhone() ? 'اسم الطفل أو رقم الهاتف' : 'اسم الطفل'}" autocomplete="off"></div></div><div class="table-wrap"><table><thead><tr><th>الطفل</th><th>العمر عند التقييم</th><th>آخر تقييم</th><th>الحالة</th><th></th></tr></thead><tbody id="patient-rows">${patientRows()}</tbody></table></div></section>`,
  );
}
function comparisonPair(finals, patientId) {
  const sorted = [...finals].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) return { latest: null, previous: null, controls: '' };
  const saved = comparisonSelections.get(patientId) || {},
    latest = sorted.find((item) => item.id === saved.latest) || sorted[0],
    previous = sorted.find((item) => item.id === saved.previous && item.id !== latest.id) ||
      sorted.find((item) => item.id !== latest.id) ||
      null;
  comparisonSelections.set(patientId, { latest: latest.id, previous: previous?.id || '' });
  const options = (selected, excluded = '') =>
    sorted
      .filter((item) => item.id !== excluded)
      .map(
        (item) =>
          `<option value="${esc(item.id)}" ${item.id === selected ? 'selected' : ''}>${dateLabel(item.date)} · ${esc(item.examiner || 'دون اسم فاحص')}</option>`,
      )
      .join('');
  const controls = `<div class="comparison-picker"><div class="field"><label for="compare-previous">الزيارة الأولى</label><select id="compare-previous" data-comparison-slot="previous" data-patient="${esc(patientId)}" ${previous ? '' : 'disabled'}>${previous ? options(previous.id, latest.id) : '<option value="">لا توجد زيارة أخرى</option>'}</select></div><div class="field"><label for="compare-latest">الزيارة الثانية</label><select id="compare-latest" data-comparison-slot="latest" data-patient="${esc(patientId)}">${options(latest.id, previous?.id || '')}</select></div></div>`;
  return { latest, previous, controls };
}
function comparison(list, patientId = '') {
  const finals = list.filter((a) => a.status === 'final').sort((a, b) => b.date.localeCompare(a.date)),
    { latest, previous, controls } = comparisonPair(finals, patientId);
  if (!latest)
    return `<div class="empty comparison-empty">${icon('trend')}<h3>تظهر المقارنة بعد حفظ أول تقرير</h3><p>ستبقى GSV غير متاحة حتى ربط التحويل المعتمد.</p></div>`;
  const latestStats = stats(latest),
    previousStats = previous ? stats(previous) : null;
  return `${controls}<div class="compare-dates"><span>الزيارة الأولى: <strong>${previous ? dateLabel(previous.date) : 'لا يوجد'}</strong></span><span>الزيارة الثانية: <strong>${dateLabel(latest.date)}</strong></span></div><div class="table-wrap"><table><thead><tr><th>المجال الفرعي</th><th>الأولى · خام</th><th>الثانية · خام</th><th>التغير</th><th>GSV الأولى</th><th>GSV الثانية</th></tr></thead><tbody>${activeDomains(
    latest,
  )
    .filter((d) => d.group !== 'MAL')
    .map((d) => {
      const a = latestStats.bySubdomain[d.id]?.total ?? '—',
        b = previousStats?.bySubdomain[d.id]?.total,
        delta = Number.isInteger(b) ? a - b : null;
      return `<tr><td><strong>${d.name}</strong></td><td>${Number.isInteger(b) ? b : '—'}</td><td>${a}</td><td dir="ltr">${delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</td><td class="placeholder">غير متاح</td><td class="placeholder">غير متاح</td></tr>`;
    })
    .join(
      '',
    )}</tbody></table></div><p class="table-caption">التغير يصف مجموع البنود الاصطناعية فقط، ولا يثبت نمواً أو تحسناً سريرياً.</p>`;
}
function profile(id) {
  const p = db.patients.find((p) => p.id === id);
  if (!p) return;
  view = 'profile';
  reportFilter = false;
  const list = db.assessments.filter((a) => a.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  shell(
    head(
      p.archived ? 'ملف مؤرشف' : 'ملف الطفل',
      esc(p.name),
      `Age today (years / months / days): ${esc(age(p))}`,
      `<button class="btn" data-action="home">الملفات</button>${canEditWorkspace() ? (p.archived ? `<button class="btn primary" data-action="restore" data-id="${id}">${icon('restore')} استعادة</button>` : `<button class="btn danger-quiet" data-action="archive-request" data-id="${id}">${icon('archive')} أرشفة</button><button class="btn primary" data-action="retest" data-id="${id}">${icon('plus')} تقييم جديد</button>`) : ''}`,
    ) +
      `<div class="profile-grid"><section class="card"><div class="section-head"><div><h2>سجل التقييمات</h2><p class="small muted">كل زيارة محفوظة بصورة مستقلة.</p></div><span class="badge blue">${list.length} تقييم</span></div>${list.map((a) => `<div class="history-row row spread"><div><strong>${dateLabel(a.date)}</strong> <span class="badge ${a.status === 'final' ? 'green' : 'amber'}">${a.status === 'final' ? 'تقرير محفوظ' : 'مسودة'}</span><p class="small muted">${assessmentVisitSummary(a)}</p></div><button class="btn tiny" data-action="open" data-id="${a.id}">${a.status === 'final' ? 'عرض النتيجة' : canEditWorkspace() ? 'متابعة' : 'عرض'}</button></div>`).join('') || '<div class="empty">لا توجد زيارات بعد.</div>'}</section><section class="card comparison-card"><div class="section-head"><div><p class="eyebrow">المتابعة عبر الزمن</p><h2>مقارنة المجالات الفرعية</h2></div>${icon('trend')}</div>${comparison(list, id)}</section></div>`,
  );
}
function intake(patientId = null, assessmentId = null) {
  view = 'intake';
  reportFilter = false;
  current = assessmentId ? db.assessments.find((a) => a.id === assessmentId) : null;
  const p = patientId ? db.patients.find((x) => x.id === patientId) : current ? patientOf(current) : {};
  const a =
      current ||
      makeAssessment(patientId, {
        examiner: db.settings.defaultExaminer,
        confidenceLevel: db.settings.confidenceLevel,
        significanceLevel: db.settings.significanceLevel,
      }),
    elig = clinicalEligibility(p, a.date);
  shell(
    head(
      assessmentId ? 'تعديل المسودة' : patientId ? 'زيارة جديدة' : 'تقييم جديد',
      'نبدأ ببيانات الطفل',
      'تفاصيل بسيطة، ثم ننتقل إلى تسجيل الإجابات.',
      `<button class="btn" data-action="home">العودة للملفات</button>`,
    ) +
      steps(0) +
      `<form id="intake-form" class="card" data-patient="${esc(p.id || '')}"><div class="section-head"><div><h2>معلومات التقييم</h2><p class="small muted">${globalThis.NamaaRemote?.enabled ? 'الحقول المطلوبة معلّمة بنجمة. استخدمي بيانات الزيارة الصحيحة.' : 'الحقول المطلوبة معلّمة بنجمة. استخدمي بيانات تجريبية.'}</p></div>${!patientId && !current && !globalThis.NamaaRemote?.enabled ? '<button type="button" class="btn tiny" data-action="sample">تعبئة بيانات تجربة</button>' : ''}</div><div id="intake-error" role="alert"></div><div class="form-grid"><div class="field"><label for="name">اسم الطفل *</label><input id="name" name="name" required maxlength="80" value="${esc(p.name || '')}" placeholder="الاسم الكامل"></div><div class="field"><label for="sex">الجنس *</label><select id="sex" name="sex" required><option value="">اختاري</option>${['ذكر', 'أنثى'].map((x) => `<option value="${x}" ${p.sex === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label for="dob">تاريخ الميلاد *</label><input id="dob" name="dob" type="date" max="${today()}" min="1900-01-01" required value="${esc(p.dob || '')}"></div><div class="field"><label for="date">تاريخ التقييم *</label><input id="date" name="date" type="date" max="${today()}" min="1900-01-01" required value="${esc(a.date)}"></div><div id="age-preview" class="wide age-box">${p.dob ? esc(age(p, a.date)) : 'العمر الزمني يظهر تلقائياً بعد إدخال التاريخين.'}</div><div class="field"><label for="respondent">اسم المستجيب *</label><input id="respondent" name="respondent" required maxlength="80" value="${esc(a.respondent)}"></div><div class="field"><label for="relationship">علاقته بالطفل *</label><select id="relationship" name="relationship">${['الأم', 'الأب', 'مقدم رعاية', 'أخرى'].map((x) => `<option value="${x}" ${a.relationship === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label for="examiner">اسم القائم بالفحص *</label><input id="examiner" name="examiner" required maxlength="80" value="${esc(a.examiner)}"></div>${canViewPhone() ? `<div class="field"><label for="phone">رقم الهاتف <span>اختياري</span></label><input id="phone" name="phone" type="tel" maxlength="25" value="${esc(p.phone || '')}" placeholder="للبحث داخل الملفات" dir="ltr"></div>` : ''}<div class="wide"><h3>أقسام إضافية في النموذج</h3><p class="small muted">${globalThis.NamaaRemote?.enabled ? 'تُطبق الأهلية تلقائياً: الحركي قبل 10 سنوات، وغير التكيفي من 3 سنوات.' : 'هذه الخيارات لعرض الواجهة. أهلية الأقسام حسب العمر تُطبّق في المحرك المعتمد.'}</p><div class="options"><label class="check-tile"><input name="motor" type="checkbox" ${a.motor && (!globalThis.NamaaRemote?.enabled || elig.motor) ? 'checked' : ''} ${globalThis.NamaaRemote?.enabled && !elig.motor ? 'disabled' : ''}>المهارات الحركية <span class="badge">مجالان فرعيان</span></label><label class="check-tile"><input name="maladaptive" type="checkbox" ${a.maladaptive && (!globalThis.NamaaRemote?.enabled || elig.maladaptive) ? 'checked' : ''} ${globalThis.NamaaRemote?.enabled && !elig.maladaptive ? 'disabled' : ''}>السلوك غير التكيفي</label></div></div></div><div class="footer-actions"><span class="small muted">سيُنشأ سجل مستقل لهذا التقييم</span><button class="btn primary" type="submit">حفظ وبدء التقييم ${icon('arrow')}</button></div></form>`,
  );
}
function submitIntake(form) {
  const f = new FormData(form),
    name = String(f.get('name')).trim(),
    respondent = String(f.get('respondent')).trim(),
    examiner = String(f.get('examiner')).trim();
  const dob = String(f.get('dob')),
    date = String(f.get('date'));
  let visitAge;
  try {
    if (!name || !respondent || !examiner) throw Error();
    visitAge = L.calendarAge(dob, date);
  } catch {
    document.getElementById('intake-error').innerHTML =
      '<div class="error">أكملي الأسماء المطلوبة وتحققي أن تاريخ التقييم بعد الميلاد ولا يقع في المستقبل.</div>';
    return;
  }
  const pid = form.dataset.patient || uid();
  let p = db.patients.find((p) => p.id === pid);
  if (!p) {
    p = { id: pid, archived: false };
    db.patients.push(p);
  }
  Object.assign(p, {
    name,
    dob,
    sex: String(f.get('sex')),
    ...(canViewPhone() ? { phone: String(f.get('phone') || '').trim() } : {}),
  });
  const a = current || makeAssessment(pid);
  Object.assign(a, {
    date,
    respondent,
    examiner,
    relationship: String(f.get('relationship')),
    motor: f.has('motor') && (!globalThis.NamaaRemote?.enabled || visitAge.years < 10),
    maladaptive: f.has('maladaptive') && (!globalThis.NamaaRemote?.enabled || visitAge.years >= 3),
  });
  if (!current) db.assessments.push(a);
  current = a;
  save();
  subIndex = 0;
  assessment();
}
function openAssessment(id) {
  current = db.assessments.find((a) => a.id === id);
  if (!current) return;
  subIndex = 0;
  current.status === 'final' ? report() : assessment();
}
function navDomains() {
  return activeDomains(current)
    .map(
      (d, i) =>
        `${i === 0 || activeDomains(current)[i - 1].group !== d.group ? `<div class="domain-label">${groups.find((g) => g[0] === d.group)[1]}</div>` : ''}<button class="subnav ${subIndex === i ? 'active' : ''}" data-action="domain" data-index="${i}"><span>${d.name}</span><small id="count-${d.id}">${d.items.filter((it) => Number.isInteger(current.answers[it.id])).length}/${d.items.length}</small></button>`,
    )
    .join('');
}
function assessment() {
  if (!current || current.status === 'final') return;
  view = 'assessment';
  const ds = activeDomains(current),
    d = ds[subIndex] || ds[0],
    s = stats(current);
  shell(
    head(
      'تسجيل الإجابات',
      esc(patientOf(current).name),
      `${esc(age(patientOf(current), current.date))} · ${dateLabel(current.date)}`,
      `<button class="btn" data-action="save-home">حفظ وخروج</button><button class="btn primary" data-action="review">مراجعة التقييم ${icon('arrow')}</button>`,
    ) +
      steps(1) +
      `<div class="assessment-layout"><aside class="card domain-nav">${navDomains()}</aside><section class="card"><div class="section-head"><div><p class="eyebrow">${groups.find((g) => g[0] === d.group)[1]} <bdi>${d.group}</bdi></p><h2>${d.name}</h2><span class="small muted">${d.items.length} بنود توضيحية · اختاري إجابة واحدة لكل بند</span></div><span class="badge blue" id="save-state">${storageMessage ? 'حفظ مؤقت بالذاكرة' : 'المسودة محفوظة'}</span></div><div class="progress-full"><span id="progress" style="width:${pct(current)}%"></span></div><div class="score-summary"><span class="small muted">التقدم <b id="answered">${s.answeredCount}</b> / ${allItems(current).length}</span><span class="small muted">${d.id === 'critical' ? 'إجابات موجبة' : 'مجموع هذا القسم'} <b id="sub-total">${d.id === 'critical' ? d.items.filter((i) => current.answers[i.id] > 0).length : s.bySubdomain[d.id]?.total || 0}</b></span><span class="small muted">الناقص <b id="missing">${s.missingCount}</b></span></div><div class="notice">بنود توضيحية من تأليفنا لعرض آلية الاستخدام، وليست بنود Vineland. الاختصارات: <bdi>0 / 1 / 2</bdi> للاختيار وEnter للبند التالي.</div><div class="question-list">${d.items.map((it, i) => `<div class="question" data-question="${it.id}"><fieldset><legend class="question-heading"><span class="qnum">${i + 1}</span>${esc(it.text)}</legend><div class="scores">${[2, 1, 0].map((v) => `<label class="score"><input type="radio" name="${it.id}" value="${v}" ${current.answers[it.id] === v ? 'checked' : ''}><span><b>${v}</b>${d.group === 'MAL' ? ['لا يظهر', 'أحياناً', 'غالباً'][v] : ['لا يؤديها', 'أحياناً', 'عادةً / دائماً'][v]}</span></label>`).join('')}</div></fieldset>${d.group !== 'MAL' ? `<label class="estimated"><input type="checkbox" data-estimated="${it.id}" ${current.estimated[it.id] ? 'checked' : ''}>إجابة تقديرية</label>` : ''}<button class="btn text small" data-action="clear" data-item="${it.id}" aria-label="مسح إجابة البند ${i + 1}">مسح الاختيار</button></div>`).join('')}</div><details class="small muted"><summary>نقطة البدء والأساس والسقف</summary><p>تُربط بقواعد النموذج المعتمد في النسخة التشغيلية. في هذا العرض تُجمع الإجابات المدخلة فقط، ولا نُعطي رصيداً تلقائياً للبنود السابقة أو نصفر البنود اللاحقة.</p></details><div class="footer-actions"><button class="btn" data-action="prev" ${subIndex === 0 ? 'disabled' : ''}>القسم السابق</button><button class="btn primary" data-action="next">${subIndex === ds.length - 1 ? 'مراجعة الإجابات' : 'القسم التالي'} ${icon('arrow')}</button></div></section></div>`,
  );
}
function updateCounters() {
  const s = stats(current),
    d = activeDomains(current)[subIndex];
  document.getElementById('answered').textContent = s.answeredCount;
  document.getElementById('missing').textContent = s.missingCount;
  document.getElementById('sub-total').textContent =
    d.id === 'critical'
      ? d.items.filter((i) => current.answers[i.id] > 0).length
      : s.bySubdomain[d.id]?.total || 0;
  document.getElementById('progress').style.width = pct(current) + '%';
  document.getElementById('count-' + d.id).textContent =
    `${s.bySubdomain[d.id]?.answeredCount || 0}/${d.items.length}`;
  document.getElementById('save-state').textContent = storageMessage
    ? 'تعذر الحفظ — نزّلي نسخة'
    : 'تم الحفظ الآن';
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  if (a === 'home') home();
  else if (a === 'reports') home(true);
  else if (a === 'help') help();
  else if (a === 'download') download();
  else if (a === 'new') intake();
  else if (a === 'patient') profile(b.dataset.id);
  else if (a === 'retest') intake(b.dataset.id);
  else if (a === 'open') openAssessment(b.dataset.id);
  else if (a === 'review') review();
  else if (a === 'domain') {
    subIndex = Number(b.dataset.index);
    assessment();
  } else if (a === 'prev') {
    subIndex--;
    assessment();
  } else if (a === 'next') {
    if (subIndex === activeDomains(current).length - 1) review();
    else {
      subIndex++;
      assessment();
    }
  } else if (a === 'back-answers') assessment();
  else if (a === 'edit-intake') intake(null, current.id);
  else if (a === 'save-home') {
    const saved = save();
    home();
    toast(saveFeedback(saved, 'المسودة محفوظة ويمكنك إكمالها لاحقاً'));
  } else if (a === 'finalize') finalize();
  else if (a === 'print') window.print();
  else if (a === 'clear') {
    delete current.answers[b.dataset.item];
    delete current.estimated[b.dataset.item];
    save();
    assessment();
  } else if (a === 'sample') {
    const values = {
       name: 'Sara — Demo',
      sex: 'أنثى',
      dob: '2020-04-12',
       respondent: 'Demo Respondent',
       examiner: 'Demo Examiner',
    };
    Object.entries(values).forEach(([id, v]) => (document.getElementById(id).value = v));
    updateAge();
  }
});
function updateAge() {
  const dob = document.getElementById('dob')?.value,
    date = document.getElementById('date')?.value;
  if (!dob || !date) return;
  document.getElementById('age-preview').textContent = age({ dob }, date);
  if (globalThis.NamaaRemote?.enabled) {
    const allowed = clinicalEligibility({ dob }, date),
      motor = document.querySelector('[name="motor"]'),
      maladaptive = document.querySelector('[name="maladaptive"]');
    if (motor) {
      motor.disabled = !allowed.motor;
      if (!allowed.motor) motor.checked = false;
    }
    if (maladaptive) {
      maladaptive.disabled = !allowed.maladaptive;
      if (!allowed.maladaptive) maladaptive.checked = false;
    }
  }
}
document.addEventListener('submit', (e) => {
  if (e.target.id === 'intake-form') {
    e.preventDefault();
    submitIntake(e.target);
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'search') {
    searchQuery = e.target.value;
    document.getElementById('patient-rows').innerHTML = patientRows();
  }
  if (e.target.id === 'note' && current?.status === 'draft') {
    current.note = e.target.value;
    save();
  }
  if (['dob', 'date'].includes(e.target.id)) updateAge();
});
document.addEventListener('change', (e) => {
  if (view === 'assessment' && current?.status === 'draft' && !current.instrumentId) {
    if (e.target.type === 'radio') {
      current.answers[e.target.name] = Number(e.target.value);
      save();
      updateCounters();
    }
    if (e.target.dataset.estimated) {
      current.estimated[e.target.dataset.estimated] = e.target.checked;
      save();
      updateCounters();
    }
  }
});
document.addEventListener('keydown', async (e) => {
  if (view !== 'assessment' || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.matches?.('textarea, input[type="text"], input[type="number"]')) return;
  const q = e.target.closest('.question');
  if (!q) return;
  if (['0', '1', '2'].includes(e.key)) {
    const r = q.querySelector(`input[type="radio"][value="${e.key}"]`);
    if (!r || r.disabled) return;
    e.preventDefault();
    r.click();
    r.focus();
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (current?.instrumentId) {
      const assessmentId = current.id;
      const sectionId = NamaaClinical.sections(current, patientOf(current))[subIndex]?.scoreId;
      const questionId = q.dataset.question;
      if (!sectionId) return;
      const stillCurrent = () => view === 'assessment' && current?.id === assessmentId &&
        NamaaClinical.sections(current, patientOf(current))[subIndex]?.scoreId === sectionId &&
        q.isConnected && q.dataset.question === questionId;
      const route = await NamaaClinical.confirmedRoute(assessmentId, sectionId, () => {
        if (clinicalScoreTimer) return runClinicalScore();
        if (clinicalScoreRequest?.id === assessmentId) return clinicalScoreRequest.promise;
        if (stillCurrent()) return runClinicalScore();
        return null;
      }, stillCurrent);
      if (!route || !stillCurrent()) return;
      if (route.nextItem && route.nextItem !== questionId) {
        const suggested = document.getElementById(`clinical-${route.nextItem}`);
        const input = suggested?.querySelector('input[type="radio"]:not([disabled])');
        if (input) {
          input.focus({ preventScroll: false });
          suggested.scrollIntoView({ block: 'center' });
        }
      } else if (route.status === 'complete') {
        document.querySelector('[data-action="clinical-next"]')?.focus();
      }
      return;
    }
    const next = q.nextElementSibling?.querySelector('input[type="radio"]');
    if (next) next.focus();
    else
      document
        .querySelector(current?.instrumentId ? '[data-action="clinical-next"]' : '[data-action="next"]')
        ?.focus();
  }
});
// Optional read-only WebMCP surface. No scores or patient details leave the page.
try {
  if (navigator.modelContext?.registerTool)
    navigator.modelContext.registerTool({
      name: 'namaa_demo_status',
      description: 'Return only aggregate completion counts for the currently open synthetic assessment.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              current
                ? {
                    screen: view,
                    status: current.status,
                    answered: stats(current).answeredCount,
                    missing: stats(current).missingCount,
                  }
                : { screen: view },
            ),
          },
        ],
      }),
    });
} catch {}
if (!storageBlocked && !globalThis.NamaaRemote?.enabled) save();
home();

// V2 interface overrides. Function declarations are intentionally hoisted so the shared static build keeps its simple script model.
function review() {
  view = 'review';
  const ds = activeDomains(current),
    s = stats(current);
  shell(
    head(
      'المراجعة',
      'راجعي الزيارة قبل حفظ التقرير',
      `ملف ${esc(patientOf(current).name)} · ${s.answeredCount} إجابة مسجلة`,
      `<button class="btn" data-action="edit-intake">تعديل البيانات</button><button class="btn" data-action="back-answers">العودة للإجابات</button>`,
    ) +
      steps(2) +
      `<section class="card"><div class="section-head"><div><h2>${s.missingCount ? 'بقيت إجابات ناقصة' : 'الإجابات مكتملة'}</h2><p class="small muted">${s.missingCount ? 'لا تتحول الإجابة الفارغة إلى صفر. افتحي أي قسم لإكماله.' : 'راجعي إعدادات التقرير ثم احفظي نسخة نهائية مستقلة.'}</p></div><span class="badge ${s.missingCount ? 'amber' : 'green'}">${s.missingCount ? s.missingCount + ' بند ناقص' : 'جاهز للحفظ'}</span></div><div class="table-wrap"><table><thead><tr><th>القسم</th><th>الإجابات</th><th>مجموع الأمثلة</th><th></th></tr></thead><tbody>${ds
        .map((d, i) => {
          const bucket = s.bySubdomain[d.id];
          return `<tr><td>${d.name}</td><td><span class="badge ${bucket.missingCount ? 'amber' : 'green'}">${bucket.answeredCount} / ${d.items.length}</span></td><td>${d.id === 'critical' ? 'تُراجع فردياً' : bucket.total}</td><td><button class="btn tiny" data-action="domain" data-index="${i}">${bucket.missingCount ? 'إكمال' : 'مراجعة'}</button></td></tr>`;
        })
        .join(
          '',
        )}</tbody></table></div><div class="review-fields"><div class="field"><label for="confidence">مستوى الثقة المختار</label><select id="confidence"><option value="85" ${current.confidenceLevel === '85' ? 'selected' : ''}>85%</option><option value="90" ${current.confidenceLevel === '90' ? 'selected' : ''}>90%</option><option value="95" ${current.confidenceLevel === '95' ? 'selected' : ''}>95%</option></select><small>يظهر الاختيار فقط؛ فترة الثقة غير محسوبة.</small></div><div class="field"><label for="significance">مستوى الدلالة المختار</label><select id="significance"><option value="0.05" ${current.significanceLevel === '0.05' ? 'selected' : ''}>0.05</option><option value="0.10" ${current.significanceLevel === '0.10' ? 'selected' : ''}>0.10</option></select><small>يظهر الاختيار بلا قيمة حرجة أو استنتاج.</small></div></div><div class="field note-field"><label for="note">ملاحظة الفاحصة <span>اختيارية</span></label><textarea id="note" maxlength="2000">${esc(current.note)}</textarea></div><div class="notice">التحويل المعياري والعمر المكافئ وGSV وABC والقيم الحرجة غير محسوبة في هذه النسخة.</div><div class="footer-actions"><button class="btn" data-action="save-home">حفظ المسودة والخروج</button><button class="btn primary" data-action="finalize" ${s.missingCount ? 'disabled' : ''}>حفظ التقرير التجريبي ${icon('check')}</button></div></section>`,
  );
}
function finalize() {
  if (!current || current.status !== 'draft' || stats(current).missingCount) return;
  current.status = 'final';
  current.patientSnapshot = { ...patientOf(current) };
  current.reportSnapshot = {
    clinicName: db.settings.clinicName,
    confidenceLevel: current.confidenceLevel,
    significanceLevel: current.significanceLevel,
  };
  current.finalizedAt = new Date().toISOString();
  save();
  report();
  toast(storageMessage ? 'التقرير في الذاكرة فقط — نزّلي نسخة' : 'تم حفظ التقرير كنسخة مستقلة');
}
function clinicLogoPreview(logo) {
  return logo
    ? `<img src="${esc(logo)}" alt="شعار العيادة الحالي">`
    : '<span class="small muted">لم يُضف شعار بعد.</span>';
}
async function encodeClinicLogo(file) {
  if (file.size > 5 * 1024 * 1024) throw Error('حجم الشعار يتجاوز 5 ميغابايت.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte);
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const webp = String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...header.slice(8, 12)) === 'WEBP';
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null;
  if (!mime)
    throw Error('اختاري شعاراً بصيغة PNG أو JPEG أو WebP فقط.');
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(Error('تعذر قراءة ملف الشعار.'));
    reader.readAsDataURL(file);
  });
  const payload = source.split(',')[1];
  if (!payload) throw Error('تعذر قراءة ملف الشعار.');
  const imageData = `data:${mime};base64,${payload}`;
  const image = new Image();
  image.src = imageData;
  try { await image.decode(); }
  catch { throw Error('تعذر قراءة الصورة. اختاري ملف صورة صالحاً.'); }
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 80000000)
    throw Error('أبعاد الصورة غير صالحة أو كبيرة جداً.');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw Error('تعذر تجهيز الشعار في هذا المتصفح.');
  for (const side of [384, 320, 256, 192, 128, 96]) {
    const scale = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.68, 0.5]) {
      const encoded = canvas.toDataURL('image/webp', quality);
      if (encoded.startsWith('data:image/webp;base64,') && encoded.length <= 90000) return encoded;
    }
    const fallback = canvas.toDataURL(mime === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.72);
    if (fallback.length <= 90000) return fallback;
  }
  throw Error('تعذر تصغير الشعار إلى حجم الحفظ. اختاري صورة أبسط أو أصغر.');
}
function settings() {
  view = 'settings';
  reportFilter = false;
  const backupPanel = globalThis.NamaaRemote?.presentationOnly
    ? '<div class="notice">Demo data is saved in this browser only. Use Reset demo data to restore the fictional sample workspace.</div>'
    : globalThis.NamaaRemote?.enabled
    ? canManageBackup()
      ? `<div class="notice"><strong>نسخة احتياطية مشفرة</strong><p>تتضمن مساحة العيادة والمستخدمين وسجل التدقيق. استخدمي «الحساب وإدارة العيادة» لإنشاء نسخة بكلمة مرور أو استعادتها بعد التحقق الكامل.</p></div>`
      : '<div class="notice">إدارة النسخ الاحتياطية والاستعادة متاحة لمسؤول العيادة فقط.</div>'
    : `<div class="data-action"><div><strong>تصدير JSON</strong><p>احتفظي بنسخة قابلة للاستيراد.</p></div><button class="btn" data-action="download">${icon('download')} تصدير</button></div><div class="data-action"><div><strong>استيراد JSON</strong><p>نفحص الملف قبل أي استبدال.</p></div><button class="btn" data-action="import">${icon('upload')} اختيار ملف</button></div><div class="notice">لن تُستبدل البيانات بمجرد اختيار الملف؛ يلزم تأكيد صريح.</div>`;
  shell(
    head('إدارة المساحة', 'الإعدادات والبيانات', 'حدّثي القيم الافتراضية أو احتفظي بنسخة من العمل.') +
      `<div class="settings-grid"><form id="settings-form" class="card"><div class="section-head"><div><h2>هوية العيادة</h2><p class="small muted">يظهر الشعار في التقرير والطباعة.</p></div>${icon('settings')}</div>
      <div class="field"><label for="clinic-name">اسم العيادة *</label><input id="clinic-name" name="clinicName" required maxlength="100" value="${esc(db.settings.clinicName)}"></div>
      <div class="field"><label for="doctor-name">اسم الطبيب <span>اختياري</span></label><input id="doctor-name" name="doctorName" maxlength="100" value="${esc(db.settings.doctorName || '')}"></div>
      <div class="field"><label for="clinic-specialty">التخصص <span>اختياري</span></label><input id="clinic-specialty" name="clinicSpecialty" maxlength="160" value="${esc(db.settings.clinicSpecialty || '')}"></div>
      <div class="field"><label for="clinic-address">العنوان <span>اختياري</span></label><textarea id="clinic-address" name="clinicAddress" maxlength="300" rows="2">${esc(db.settings.clinicAddress || '')}</textarea></div>
      <div class="field"><label for="clinic-phone">هاتف العيادة <span>اختياري</span></label><input id="clinic-phone" name="clinicPhone" type="tel" maxlength="40" dir="ltr" value="${esc(db.settings.clinicPhone || '')}"></div>
      <div class="field"><label for="clinic-logo-file">شعار العيادة <span>اختياري</span></label><input id="clinic-logo-file" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="clinic-logo-help"><small id="clinic-logo-help">PNG أو JPEG أو WebP، حتى 5 ميغابايت. يُصغّر محلياً قبل الحفظ.</small><input id="clinic-logo-value" type="hidden" name="clinicLogo" value="${esc(db.settings.clinicLogo || '')}"><div id="clinic-logo-preview" class="clinic-logo-preview">${clinicLogoPreview(db.settings.clinicLogo)}</div><button class="btn tiny" type="button" data-action="remove-clinic-logo" ${db.settings.clinicLogo ? '' : 'disabled'}>إزالة الشعار</button><p id="clinic-logo-error" class="small clinic-logo-error" role="alert"></p></div>
      <label class="clinic-watermark-option"><input name="logoWatermark" type="checkbox" ${db.settings.logoWatermark ? 'checked' : ''}>إظهار الشعار كعلامة مائية خفيفة في التقرير</label>
      <div class="field"><label for="default-examiner">اسم الفاحص الافتراضي</label><input id="default-examiner" name="defaultExaminer" maxlength="80" value="${esc(db.settings.defaultExaminer)}"><small>إذا تُرك فارغاً، يُستخدم اسم الطبيب أعلاه للزيارات القادمة.</small></div>
      <div class="form-grid"><div class="field"><label>مستوى الثقة الافتراضي</label><select name="confidenceLevel"><option value="85" ${db.settings.confidenceLevel === '85' ? 'selected' : ''}>85%</option><option value="90" ${db.settings.confidenceLevel === '90' ? 'selected' : ''}>90%</option><option value="95" ${db.settings.confidenceLevel === '95' ? 'selected' : ''}>95%</option></select></div><div class="field"><label>مستوى الدلالة الافتراضي</label><select name="significanceLevel"><option value="0.05" ${db.settings.significanceLevel === '0.05' ? 'selected' : ''}>0.05</option><option value="0.10" ${db.settings.significanceLevel === '0.10' ? 'selected' : ''}>0.10</option></select></div></div><button class="btn primary" type="submit">حفظ الإعدادات</button></form><section class="card"><div class="section-head"><div><h2>نسخة البيانات</h2><p class="small muted">${globalThis.NamaaRemote?.presentationOnly ? 'Local demo workspace; no clinic database is connected.' : globalThis.NamaaRemote?.enabled ? 'النسخة الشاملة محمية بكلمة مرور ويقتصر تشغيلها على المسؤول.' : 'التصدير يشمل الإعدادات والملفات والتقييمات.'}</p></div>${icon('shield')}</div>${backupPanel}${globalThis.NamaaRemote?.enabled ? '' : '<button class="btn text" data-action="example-results">مثال توضيحي للنتائج</button>'}</section></div>`,
  );
}
let clinicLogoUploadVersion = 0;
document.addEventListener('change', async (event) => {
  if (event.target.id !== 'clinic-logo-file' || !canEditWorkspace()) return;
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  const version = ++clinicLogoUploadVersion;
  const form = input.closest('#settings-form');
  const submit = form?.querySelector('button[type="submit"]');
  const error = form?.querySelector('#clinic-logo-error');
  if (form) form.dataset.logoUploadPending = 'true';
  if (submit) submit.disabled = true;
  if (error) error.textContent = '';
  try {
    const logo = await encodeClinicLogo(file);
    if (!form?.isConnected || version !== clinicLogoUploadVersion) return;
    form.querySelector('#clinic-logo-value').value = logo;
    form.querySelector('#clinic-logo-preview').innerHTML = clinicLogoPreview(logo);
    form.querySelector('[data-action="remove-clinic-logo"]').disabled = false;
  } catch (failure) {
    if (error?.isConnected && version === clinicLogoUploadVersion)
      error.textContent = failure.message || 'تعذر تجهيز الشعار.';
  } finally {
    if (version === clinicLogoUploadVersion) {
      input.value = '';
      if (form?.isConnected) delete form.dataset.logoUploadPending;
      if (submit?.isConnected) submit.disabled = false;
    }
  }
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove-clinic-logo"]');
  if (!button || !canEditWorkspace()) return;
  const form = button.closest('#settings-form');
  if (!form) return;
  clinicLogoUploadVersion += 1;
  delete form.dataset.logoUploadPending;
  form.querySelector('#clinic-logo-file').value = '';
  form.querySelector('button[type="submit"]').disabled = false;
  form.querySelector('#clinic-logo-value').value = '';
  form.querySelector('#clinic-logo-preview').innerHTML = clinicLogoPreview('');
  form.querySelector('#clinic-logo-error').textContent = '';
  button.disabled = true;
});
function archived() {
  view = 'archived';
  reportFilter = false;
  const items = db.patients.filter((p) => p.archived);
  shell(
    head('إدارة الملفات', 'الأرشيف', 'الملفات هنا مخفية من القائمة الرئيسية ويمكن استعادتها.') +
      `<section class="card"><div class="section-head"><div><h2>الملفات المؤرشفة</h2><p class="small muted">${items.length} ملف</p></div></div>${items.length ? items.map((p) => `<div class="archive-row"><div class="patient-cell"><div class="avatar">${esc(p.name[0])}</div><div><strong>${esc(p.name)}</strong><small>${db.assessments.filter((a) => a.patientId === p.id).length} تقييم</small></div></div><div class="toolbar"><button class="btn tiny" data-action="patient" data-id="${p.id}">فتح</button><button class="btn tiny" data-action="restore" data-id="${p.id}">${icon('restore')} استعادة</button></div></div>`).join('') : '<div class="empty">الأرشيف فارغ.</div>'}</section>`,
  );
}
function showModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</section></div>`;
  root.querySelector('.modal').focus();
}
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  pendingImport = null;
}
const demoAssessmentScreen = assessment,
  demoReviewScreen = review,
  demoReportScreen = report;
const clinicalSubdomainOrder = ['REC', 'EXP', 'WRN', 'PER', 'DOM', 'CMY', 'IPR', 'PLA', 'COP', 'GRO', 'FIN'];
const clinicalOrderIndex = new Map(clinicalSubdomainOrder.map((id, index) => [id, index]));
function isSourceAssessment(assessment) {
  return assessment?.instrumentId === 'vineland3-interview-ar-supplied' || Boolean(assessment?.clinicalScore);
}
function assessmentProgress(assessment) {
  if (!assessment) return { answered: 0, total: 0, inferred: 0, percent: 0, summary: 'لا توجد إجابات' };
  if (!isSourceAssessment(assessment)) {
    const answered = stats(assessment).answeredCount,
      total = allItems(assessment).length;
    return {
      answered,
      total,
      inferred: 0,
      percent: total ? Math.round((100 * answered) / total) : 0,
      summary: `${answered} إجابة محفوظة من ${total}`,
    };
  }
  const source = globalThis.NamaaClinical?.progress?.(
    assessment,
    patientOf(assessment),
    assessment.clinicalScore || globalThis.NamaaClinical?.cached?.(assessment.id),
  ) || { answered: 0, total: 0, inferred: 0, percent: 0 };
  return {
    ...source,
    summary:
      assessment.entryMode === 'raw'
        ? `${source.answered} درجة مدخلة من ${source.total}`
        : `${source.answered} إجابة مدخلة من ${source.total}${source.inferred ? ` · ${source.inferred} حالة استدلالية منفصلة` : ''}`,
  };
}
function orderedClinicalEntries(subdomains = {}) {
  return Object.entries(subdomains).sort(
    ([left], [right]) =>
      (clinicalOrderIndex.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (clinicalOrderIndex.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}
function orderClinicalResult(result) {
  if (result?.subdomains) result.subdomains = Object.fromEntries(orderedClinicalEntries(result.subdomains));
  return result;
}
function orderClinicalInstrument() {
  const instrument = globalThis.NamaaClinical?.getInstrument?.();
  if (!instrument?.subdomains) return;
  const subdomains = [...instrument.subdomains].sort(
    (left, right) =>
      (clinicalOrderIndex.get(left.scoreId) ?? Number.MAX_SAFE_INTEGER) -
      (clinicalOrderIndex.get(right.scoreId) ?? Number.MAX_SAFE_INTEGER),
  );
  globalThis.NamaaClinical.setInstrument({ ...instrument, subdomains });
}
let clinicalScoreTimer = null;
let clinicalScoreRequest = null;
function refreshClinicalGuidance() {
  if (view !== 'assessment' || !current?.instrumentId || current.entryMode !== 'items') return;
  const patient = patientOf(current);
  const section = NamaaClinical.sections(current, patient)[subIndex];
  if (!section) return;
  const result = NamaaClinical.cached(current.id);
  const route = result?.administration?.[section.scoreId];
  const boundary = NamaaClinical.ageBoundary(current, patient, section, route);
  const state = NamaaClinical.guidanceState(current.id);
  const progress = document.querySelector('[data-clinical-progress]');
  const guidance = document.querySelector('[data-clinical-guidance]');
  const badge = document.querySelector('[data-clinical-status]');
  if (progress) progress.innerHTML = NamaaClinical.progressMarkup(current, patient, result);
  if (guidance) guidance.innerHTML = NamaaClinical.routeGuidance(route, state);
  if (badge) badge.textContent = state.status === 'ready'
    ? ({ complete: 'مكتمل', reverse: 'استكمال عكسي', findbasal: 'تحديد الأساس', continue: 'يحتاج متابعة', 'needs-review': 'يحتاج مراجعة' })[route?.status] || 'يحتاج متابعة'
    : state.status === 'error' ? 'تعذر التحديث' : 'جارٍ التحديث';
  for (const item of section.items) {
    const question = document.getElementById(`clinical-${item.id}`);
    const excluded = Boolean(NamaaClinical.ageExcluded(item, boundary));
    if (question && question.hidden !== excluded) question.hidden = excluded;
    if (question) {
      question.dataset.ageExcluded = excluded ? 'true' : 'false';
      question.querySelectorAll('input,select,textarea').forEach((input) => {
        input.disabled = excluded || globalThis.NamaaRemote?.user?.role === 'viewer';
      });
    }
    const row = document.querySelector(`[data-clinical-route-state="${item.id}"]`);
    if (row) row.innerHTML = state.status === 'ready' ? NamaaClinical.routeState(route, item) : '';
  }
  const capHost = document.querySelector('[data-clinical-age-cap-summary]');
  if (capHost) {
    const markup = NamaaClinical.ageCapSummary(current, section, boundary);
    if (capHost.dataset.ageCapEnd !== String(boundary?.endNumber ?? '')) {
      const wasOpen = capHost.querySelector('details')?.open;
      capHost.innerHTML = markup;
      capHost.dataset.ageCapEnd = String(boundary?.endNumber ?? '');
      if (wasOpen) capHost.querySelector('details')?.setAttribute('open', '');
    }
  }
  document.querySelectorAll('.domain-nav .subnav').forEach((button) => {
    const sectionForButton = NamaaClinical.sections(current, patient)[Number(button.dataset.index)];
    const sectionBoundary = sectionForButton && NamaaClinical.ageBoundary(current, patient, sectionForButton, result?.administration?.[sectionForButton.scoreId]);
    const eligibleItems = sectionForButton?.items.filter((item) => !NamaaClinical.ageExcluded(item, sectionBoundary)) || [];
    const count = eligibleItems.filter((item) => Number.isInteger(current.answers?.[item.id])).length;
    const small = button.querySelector('small');
    if (small && sectionForButton) small.textContent = `${count}/${eligibleItems.length}`;
  });
}
async function runClinicalScore() {
  clearTimeout(clinicalScoreTimer);
  clinicalScoreTimer = null;
  if (view !== 'assessment' || !current?.instrumentId) return;
  const assessment = current;
  const request = { id: assessment.id, promise: null };
  clinicalScoreRequest = request;
  try {
    request.promise = NamaaClinical.score(assessment, patientOf(assessment));
    const result = await request.promise;
    if (result) orderClinicalResult(result);
    return result;
  } catch {
    // The guidance area renders the actionable retry state.
    return null;
  } finally {
    if (clinicalScoreRequest === request) clinicalScoreRequest = null;
    if (current?.id === assessment.id) refreshClinicalGuidance();
  }
}
function scheduleClinicalScore() {
  if (!current?.instrumentId) return;
  NamaaClinical.invalidate(current.id);
  refreshClinicalGuidance();
  clearTimeout(clinicalScoreTimer);
  clinicalScoreTimer = setTimeout(runClinicalScore, 240);
}
window.addEventListener('namaa:synced', () => {
  if (view === 'assessment' && current?.instrumentId &&
      globalThis.NamaaClinical?.guidanceState(current.id).status === 'error') {
    void runClinicalScore();
  }
});
function assessmentVisitSummary(assessment) {
  const examiner = esc(assessment.examiner || 'دون اسم فاحص');
  if (!isSourceAssessment(assessment))
    return `${examiner} · ${stats(assessment).answeredCount} / ${allItems(assessment).length} إجابة`;
  const complete = Boolean(assessment.clinicalScore?.completeness?.complete);
  if (assessment.entryMode === 'raw')
    return `${examiner} · إدخال الدرجات الخام · ${complete ? 'مكتمل' : 'يحتاج استكمال'}`;
  const progress = assessmentProgress(assessment);
  return `${examiner} · إدخال البنود · ${progress.answered} / ${progress.total} إجابة مدخلة${progress.inferred ? ` · ${progress.inferred} استدلالية` : ''}${complete ? ' · الحساب مكتمل' : ''}`;
}
function clinicalComparison(list) {
  const finals = list
      .filter((item) => item.status === 'final' && item.clinicalScore)
      .sort((a, b) => b.date.localeCompare(a.date)),
    patientId = list[0]?.patientId || '',
    { latest, previous, controls } = comparisonPair(finals, patientId);
  if (!latest)
    return `<div class="empty comparison-empty">${icon('trend')}<h3>تظهر المقارنة بعد تثبيت أول تقرير</h3></div>`;
  const latestSubs = latest.clinicalScore.subdomains || {},
    previousSubs = previous?.clinicalScore?.subdomains || {},
    latestProtocol = latest.clinicalScore.scoringProtocol?.id || latest.administrationProtocol || 'vineland-interview-v1',
    previousProtocol = previous ? previous.clinicalScore.scoringProtocol?.id || previous.administrationProtocol || 'vineland-interview-v1' : latestProtocol,
    mixedProtocols = Boolean(previous && latestProtocol !== previousProtocol),
    customProtocol = latestProtocol === 'clinic-age-cap-v1' || previousProtocol === 'clinic-age-cap-v1',
    limitedInterpretation =
      NamaaClinical.hasEstimatedResponseLimit(latest.clinicalScore) ||
      NamaaClinical.hasEstimatedResponseLimit(previous?.clinicalScore);
  return `${controls}${mixedProtocols ? '<div class="protocol-notice" role="note"><strong>طريقتا تطبيق مختلفتان</strong><p>لا تُحسب مقارنة GSV أو تغيرها بين طريقة العيادة ومسار المقابلة المرجعي.</p></div>' : customProtocol ? '<div class="protocol-notice" role="note"><strong>متابعة النتائج بطريقة العيادة</strong><p>تُقارن قيم GSV المحفوظة للطريقة نفسها. يُفسر الفرق مع ملاحظات الفاحص وسياق كل زيارة.</p></div>' : ''}<div class="compare-dates"><span>الزيارة الأولى: <strong>${previous ? dateLabel(previous.date) : 'لا يوجد'}</strong></span><span>الزيارة الثانية: <strong>${dateLabel(latest.date)}</strong></span></div><div class="table-wrap"><table><thead><tr><th>المجال الفرعي</th><th>خام الأولى</th><th>خام الثانية</th><th>GSV الأولى</th><th>GSV الثانية</th><th>تغير GSV</th></tr></thead><tbody>${orderedClinicalEntries(
    latestSubs,
  )
    .map(([id, row]) => {
      const old = previousSubs[id],
        delta = !mixedProtocols && Number.isFinite(row.gsv) && Number.isFinite(old?.gsv) ? row.gsv - old.gsv : null;
      return `<tr><td><strong>${esc(NamaaClinical.label(id))}</strong></td><td>${old?.raw ?? '—'}</td><td>${row.raw ?? '—'}</td><td>${mixedProtocols ? '—' : old?.gsv ?? '—'}</td><td>${mixedProtocols ? '—' : row.gsv ?? '—'}</td><td dir="ltr">${delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</td></tr>`;
    })
    .join(
      '',
    )}</tbody></table></div><p class="table-caption">${mixedProtocols ? 'الدرجات الخام معروضة للرجوع إلى كل زيارة؛ لا توجد مقارنة GSV صالحة بين الطريقتين.' : customProtocol ? 'فرق GSV يعكس الفرق العددي بين الزيارتين؛ لا يكفي وحده لإثبات تغير سريري، ولا يمثل معدل نمو زمني.' : 'تعرض GSV تغير المقياس بين زيارتين، ولا تمثل معدل نمو زمني.'}${limitedInterpretation ? ' إحدى الزيارتين غير مؤهلة للتفسير الكامل بسبب جودة الإجابات التقديرية؛ تبقى الأرقام للمراجعة فقط.' : ''}</p>`;
}
function clinicalAssessmentScreen() {
  if (!current) return;
  view = 'assessment';
  reportFilter = false;
  const needsPreparation = !current.instrumentId || !current.entryMode || !current.administrationProtocol || !current.estimated ||
    !current.rawScores || !current.maladaptiveRaw || !current.criticalScores || !current.criticalNotes;
  NamaaClinical.prepare(current);
  if (needsPreparation) save();
  const patient = patientOf(current),
    visible = NamaaClinical.sections(current, patient);
  if (subIndex >= visible.length) subIndex = 0;
  shell(
    head(
      'تسجيل الإجابات',
      esc(patient.name),
      `${esc(age(patient, current.date))} · ${dateLabel(current.date)}`,
      `<button class="btn" data-action="save-home">${canEditWorkspace() ? 'حفظ وخروج' : 'العودة للملفات'}</button>${canEditWorkspace() ? `<button class="btn primary" data-action="clinical-review">مراجعة وحساب ${icon('arrow')}</button>` : ''}`,
    ) +
      steps(1) +
      (globalThis.NamaaRemote?.presentationOnly ? `<section class="notice"><strong>Interactive frontend demo</strong><p>Try the full workflow with fictional data. Changes stay in this browser; no clinic server is connected.</p><button class="btn" data-action="demo-fill">Fill example responses</button></section>` : '') +
      NamaaClinical.renderEntry(current, patient, subIndex),
  );
  if (
    current.entryMode === 'items' &&
    !NamaaClinical.cached(current.id) &&
    NamaaClinical.guidanceState(current.id).status !== 'error' &&
    !clinicalScoreTimer &&
    clinicalScoreRequest?.id !== current.id &&
    globalThis.NamaaRemote?.user?.role !== 'viewer'
  ) {
    runClinicalScore();
  }
}
async function clinicalReviewScreen() {
  if (!current) return;
  const requestedId = current.id;
  clearTimeout(clinicalScoreTimer);
  clinicalScoreTimer = null;
  view = 'review';
  reportFilter = false;
  shell(
    head('الحساب والمراجعة', esc(patientOf(current).name), 'يجري حساب النتائج والتحقق من اكتمال الإجابات.') +
      steps(2) +
      `<section class="card loading-card"><span class="spinner"></span><h2>جارٍ حساب النتائج</h2><p class="muted">ستظهر البنود التي تحتاج مراجعة خلال لحظات.</p></section>`,
  );
  try {
    const scored = await NamaaClinical.score(current, patientOf(current));
    if (!scored) return;
    const result = orderClinicalResult(scored);
    if (view !== 'review' || current?.id !== requestedId) return;
    shell(
      head(
        'الحساب والمراجعة',
        esc(patientOf(current).name),
        'راجعي اكتمال الإجابات وإعدادات التحليل قبل التثبيت.',
        `<button class="btn" data-action="clinical-back">العودة للإدخال</button>`,
      ) +
        steps(2) +
        NamaaClinical.renderReview(current, result),
    );
  } catch (error) {
    if (view !== 'review' || current?.id !== requestedId) return;
    shell(
      head('تعذر الحساب', esc(patientOf(current).name), 'لم يكتمل طلب الحساب.') +
        `<section class="card"><div class="error" role="alert">تعذر الاتصال بخدمة الحساب أو معالجة الإجابات الحالية. تحققي من الاتصال ثم أعيدي المحاولة. ${esc(error.message || '')}</div><div class="footer-actions"><button class="btn" data-action="clinical-back">العودة للإدخال</button><button class="btn primary" data-action="clinical-review">إعادة الحساب</button></div></section>`,
    );
  }
}
function clinicalReportScreen() {
  if (!current) return;
  view = 'report';
  reportFilter = false;
  const result = orderClinicalResult(current.clinicalScore || NamaaClinical.cached(current.id));
  if (!result) {
    clinicalReviewScreen();
    return;
  }
  const patient = patientOf(current);
  shell(
    head(
      'تقرير محفوظ',
      esc(patient.name),
      'نتائج التقييم المحفوظة مع هذه الزيارة.',
      `<button class="btn" data-action="patient" data-id="${patient.id}">سجل الطفل</button><button class="btn primary" data-action="print">${icon('print')} طباعة / حفظ PDF</button>`,
    ) +
      steps(3) +
      NamaaClinical.renderReport(current, result, patient, db.settings),
  );
}
async function clinicalFinalize() {
  const button = document.querySelector('[data-action="clinical-finalize"]');
  if (button) button.disabled = true;
  try {
    await globalThis.NamaaRemote.flushNow?.();
    const result = current.clinicalScore || NamaaClinical.cached(current.id),
      mode = result?.clinicalReady === true ? 'clinical' : 'review',
      canonical = await globalThis.NamaaRemote.finalize(current.id, mode),
      next = validateImport(canonical?.data || canonical);
    db = next;
    current = db.assessments.find((item) => item.id === current.id);
    clinicalReportScreen();
    toast('تم حفظ التقرير ونتائج التقييم');
  } catch (error) {
    if (button) button.disabled = false;
    toast(
      error.code === 'clinical_readiness_required'
        ? 'الحساب متاح للمراجعة، لكن التثبيت السريري محجوب حتى اكتمال التحقق المستقل.'
        : error.message || 'تعذر تثبيت التقرير',
    );
  }
}
if (globalThis.NamaaRemote?.enabled && globalThis.NamaaClinical?.enabled) {
  orderClinicalInstrument();
  assessment = clinicalAssessmentScreen;
  review = clinicalReviewScreen;
  report = clinicalReportScreen;
  comparison = clinicalComparison;
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'settings') settings();
  else if (action === 'archived') archived();
  else if (action === 'import') document.getElementById('import-file').click();
  else if (action === 'archive-request') requestArchive(button.dataset.id);
  else if (action === 'archive-confirm') {
    const patient = db.patients.find((p) => p.id === button.dataset.id);
    if (patient) {
      patient.archived = true;
      patient.archivedAt = new Date().toISOString();
      const saved = save();
      closeModal();
      archived();
      toast(saveFeedback(saved, 'تمت أرشفة الملف ويمكن استعادته'));
    }
  } else if (action === 'restore') {
    const patient = db.patients.find((p) => p.id === button.dataset.id);
    if (patient) {
      patient.archived = false;
      patient.archivedAt = null;
      const saved = save();
      profile(patient.id);
      toast(saveFeedback(saved, 'تمت استعادة الملف'));
    }
  } else if (action === 'modal-close') closeModal();
  else if (action === 'import-confirm' && pendingImport) {
    try {
      if (globalThis.NamaaRemote?.enabled && globalThis.NamaaRemote.importWorkspace) {
        const imported = await globalThis.NamaaRemote.importWorkspace(pendingImport);
        db = validateImport(imported);
      } else db = pendingImport;
      storageBlocked = false;
      storageMessage = '';
      save();
      closeModal();
      home();
      toast('تم استيراد النسخة بنجاح');
    } catch (error) {
      toast(error.message || 'تعذر استيراد النسخة');
    }
  }
});
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'settings-form') return;
  event.preventDefault();
  if (!canEditWorkspace()) return;
  if (event.target.dataset.logoUploadPending === 'true') {
    event.target.querySelector('#clinic-logo-error').textContent = 'انتظري حتى يكتمل تجهيز الشعار.';
    return;
  }
  db.settings = normalizeSettings(Object.fromEntries(new FormData(event.target)));
  const saved = save();
  settings();
  toast(saveFeedback(saved, 'تم حفظ إعدادات العيادة'));
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'import-file') readImport(event.target.files?.[0]);
  if (event.target.id === 'confirm-import')
    document.querySelector('[data-action="import-confirm"]').disabled = !event.target.checked;
  if (event.target.dataset.comparisonSlot) {
    const patientId = event.target.dataset.patient,
      previous = comparisonSelections.get(patientId) || {};
    comparisonSelections.set(patientId, {
      ...previous,
      [event.target.dataset.comparisonSlot]: event.target.value,
    });
    profile(patientId);
    return;
  }
  if (view === 'review' && current?.status === 'draft') {
    if (event.target.id === 'confidence') current.confidenceLevel = event.target.value;
    if (event.target.id === 'significance') current.significanceLevel = event.target.value;
    save();
    if (current.instrumentId) setTimeout(() => review(), 0);
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.modal')) closeModal();
});
document.addEventListener('input', (event) => {
  if (!current?.instrumentId || current.status !== 'draft' || globalThis.NamaaRemote?.user?.role === 'viewer')
    return;
  const target = event.target;
  if (target.dataset.clinicalCriticalNote) {
    const key = target.dataset.clinicalCriticalNote,
      note = target.value.trim();
    if (note) current.criticalNotes[key] = target.value;
    else delete current.criticalNotes[key];
  } else if (target.dataset.clinicalRaw) {
    if (target.value === '') delete current.rawScores[target.dataset.clinicalRaw];
    else current.rawScores[target.dataset.clinicalRaw] = Number(target.value);
  } else if (target.dataset.clinicalMaladaptive) {
    if (target.value === '') delete current.maladaptiveRaw[target.dataset.clinicalMaladaptive];
    else current.maladaptiveRaw[target.dataset.clinicalMaladaptive] = Number(target.value);
  } else return;
  save();
});
document.addEventListener('click', async (event) => {
  if (!current?.instrumentId) return;
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (
    globalThis.NamaaRemote?.user?.role === 'viewer' &&
    ['clinical-mode', 'clinical-review', 'clinical-finalize'].includes(action)
  )
    return;
  const visible = NamaaClinical.sections(current, patientOf(current));
  if (action === 'demo-fill' && globalThis.NamaaRemote?.presentationOnly && current.status === 'draft') {
    Object.assign(current, NamaaRemote.fillDemoResponses(current, patientOf(current)));
    NamaaClinical.invalidate(current.id);
    save();
    await runClinicalScore();
    assessment();
    toast('Example responses filled. Ready to review the calculations.');
  } else if (action === 'clinical-domain') {
    subIndex = Number(button.dataset.index);
    assessment();
  } else if (action === 'clinical-prev') {
    subIndex = Math.max(0, subIndex - 1);
    assessment();
  } else if (action === 'clinical-next') {
    if (subIndex >= visible.length - 1) review();
    else {
      subIndex += 1;
      assessment();
    }
  } else if (action === 'clinical-review') review();
  else if (action === 'clinical-back') assessment();
  else if (action === 'clinical-retry-score') {
    NamaaClinical.invalidate(current.id);
    refreshClinicalGuidance();
    runClinicalScore();
  }
  else if (action === 'clinical-mode') {
    if (current.status !== 'draft') return;
    if (button.dataset.mode === current.entryMode) return;
    if (button.dataset.mode === 'raw' && current.entryMode === 'items') {
      current.itemAdministrationProtocol = current.administrationProtocol;
      current.administrationProtocol = 'vineland-interview-v1';
    } else if (current.entryMode === 'raw') {
      current.administrationProtocol = current.itemAdministrationProtocol || 'clinic-age-cap-v1';
    }
    current.entryMode = button.dataset.mode;
    NamaaClinical.invalidate(current.id);
    save();
    assessment();
  } else if (action === 'clinical-jump') {
    const item = document.getElementById(`clinical-${button.dataset.item}`);
    if (item?.hidden) return;
    item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    item?.querySelector('input,select,textarea')?.focus({ preventScroll: true });
  } else if (action === 'clinical-review-jump') {
    const sectionIndex = visible.findIndex(
      (section) =>
        section.scoreId === button.dataset.section ||
        section.items.some((item) => String(item.id) === button.dataset.item),
    );
    if (sectionIndex >= 0) subIndex = sectionIndex;
    if (/^\d+$/.test(button.dataset.item) && button.dataset.section === 'critical') {
      if (current.entryMode === 'items') current.itemAdministrationProtocol = current.administrationProtocol;
      current.administrationProtocol = 'vineland-interview-v1';
      current.entryMode = 'raw';
    } else {
      if (current.entryMode === 'raw')
        current.administrationProtocol = current.itemAdministrationProtocol || 'clinic-age-cap-v1';
      current.entryMode = 'items';
    }
    NamaaClinical.invalidate(current.id);
    save();
    assessment();
    requestAnimationFrame(() => {
      const target =
        document.getElementById(`clinical-${button.dataset.item}`) ||
        document.getElementById(`critical-${button.dataset.item}`);
      if (target?.hidden) return;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (target?.matches?.('input,select,textarea') ? target : target?.querySelector?.('input,select,textarea'))?.focus({
        preventScroll: true,
      });
    });
  } else if (action === 'clinical-finalize') clinicalFinalize();
});
document.addEventListener('change', (event) => {
  if (!current?.instrumentId || current.status !== 'draft' || globalThis.NamaaRemote?.user?.role === 'viewer')
    return;
  const target = event.target;
  if (target.dataset.clinicalProtocol !== undefined) {
    if (!['clinic-age-cap-v1', 'vineland-interview-v1'].includes(target.value) || current.entryMode !== 'items') return;
    current.administrationProtocol = target.value;
    current.itemAdministrationProtocol = target.value;
    NamaaClinical.invalidate(current.id);
    save();
    assessment();
    return;
  } else if (target.dataset.clinicalScore !== undefined) {
    if (target.closest('.question')?.hidden) return;
    current.answers[target.name] = Number(target.value);
  } else if (target.dataset.clinicalEstimated) {
    current.estimated[target.dataset.clinicalEstimated] = target.checked;
  } else if (target.dataset.clinicalRaw) {
    if (target.value === '') delete current.rawScores[target.dataset.clinicalRaw];
    else current.rawScores[target.dataset.clinicalRaw] = Number(target.value);
  } else if (target.dataset.clinicalMaladaptive) {
    if (target.value === '') delete current.maladaptiveRaw[target.dataset.clinicalMaladaptive];
    else current.maladaptiveRaw[target.dataset.clinicalMaladaptive] = Number(target.value);
  } else if (target.dataset.clinicalCritical) {
    if (target.value === '') delete current.criticalScores[target.dataset.clinicalCritical];
    else current.criticalScores[target.dataset.clinicalCritical] = Number(target.value);
  } else if (target.dataset.clinicalCriticalNote) {
    const note = target.value.trim();
    if (note) current.criticalNotes[target.dataset.clinicalCriticalNote] = target.value;
    else delete current.criticalNotes[target.dataset.clinicalCriticalNote];
  } else return;
  save();
  if (target.dataset.clinicalScore !== undefined || target.dataset.clinicalEstimated)
    scheduleClinicalScore();
});
function requestArchive(id) {
  const p = db.patients.find((p) => p.id === id);
  if (!p) return;
  showModal(
    `<button class="modal-close" data-action="modal-close" aria-label="إغلاق">${icon('close')}</button><p class="eyebrow">إجراء قابل للتراجع</p><h2>أرشفة ملف ${esc(p.name)}؟</h2><p>سيختفي من القائمة الرئيسية وتبقى كل التقييمات محفوظة. يمكن استعادته من الأرشيف.</p><div class="modal-actions"><button class="btn" data-action="modal-close">إلغاء</button><button class="btn danger" data-action="archive-confirm" data-id="${id}">أرشفة الملف</button></div>`,
  );
}
async function readImport(file) {
  if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw Error('حجم الملف يتجاوز 8 ميغابايت.');
    const parsed = JSON.parse(await file.text());
    pendingImport = validateImport(parsed.data || parsed);
    showModal(
      `<button class="modal-close" data-action="modal-close" aria-label="إغلاق">${icon('close')}</button><p class="eyebrow">اكتمل فحص الملف</p><h2>تأكيد استبدال البيانات</h2><p>تحتوي النسخة على <strong>${pendingImport.patients.length}</strong> ملف و<strong>${pendingImport.assessments.length}</strong> تقييم.</p><label class="confirm-check"><input id="confirm-import" type="checkbox"> أفهم أن الاستيراد سيستبدل البيانات الحالية.</label><div class="modal-actions"><button class="btn" data-action="modal-close">إلغاء</button><button class="btn danger" data-action="import-confirm" disabled>استبدال البيانات</button></div>`,
    );
  } catch (error) {
    pendingImport = null;
    showModal(
      `<button class="modal-close" data-action="modal-close">${icon('close')}</button><h2>الملف غير صالح</h2><p>${esc(error.message)}</p><button class="btn primary" data-action="modal-close">حسناً</button>`,
    );
  } finally {
    document.getElementById('import-file').value = '';
  }
}
function help() {
  view = 'help';
  reportFilter = false;
  if (globalThis.NamaaRemote?.presentationOnly) {
    shell(head('Quick help', 'Interactive demo guide', 'Explore the complete workflow without a clinic account.') +
      `<div class="help-grid"><section class="card"><h2>Try an assessment</h2><ol><li>Create a patient using fictional details.</li><li>Enter 0, 1 or 2, or choose Fill example responses to explore the full report quickly.</li><li>Review the illustrative scores and choose confidence and significance levels.</li><li>Save the report, then print it or save as PDF.</li></ol><div class="notice"><strong>Frontend only</strong><p>This public demo has no clinic server or real patient database. Demonstration scores do not evaluate a real child's abilities.</p></div></section><section class="card"><h2>Explore the workspace</h2><p>Open saved sample reports, compare visits, search records, archive and restore sample patients, or update the clinic logo and settings.</p><div class="notice">Changes are saved only on this device. Reopening the same link in another browser starts with the sample workspace.</div><button class="btn" data-action="settings">Settings &amp; data</button></section></div>`);
    return;
  }
  const connected = globalThis.NamaaRemote?.enabled;
  shell(
    head('مساعدة سريعة', 'دليل الاستخدام', 'مسار واضح من إنشاء الملف إلى التقرير.') +
      `<div class="help-grid"><section class="card"><h2>إجراء تقييم</h2><ol><li>أدخلي بيانات الطفل والزيارة.</li><li>${connected ? 'اتبعي البند المقترح حسب العمر وقواعد الأساس والسقف. البنود المحتسبة تلقائياً لا تحتاج إلى إجابة.' : 'سجّلي إجابة لكل بند؛ الفارغ يبقى ناقصاً.'}</li><li>راجعي الإجابات واختاري مستوى الثقة والدلالة.</li><li>احفظي التقرير واطبعيه أو احفظيه PDF.</li></ol>${connected ? '<div class="notice"><strong>الحفظ والاتصال</strong><p>تُحفظ التعديلات على هذا الجهاز أثناء انقطاع قصير للاتصال، ثم تتزامن عند عودته. تظهر «محفوظ على الخادم» بعد تأكيد الحفظ. الدخول الأول وحساب النتائج وحفظ التقرير النهائي تحتاج إلى اتصال.</p></div>' : ''}</section><section class="card"><h2>الملفات وهوية العيادة</h2><p>${connected ? 'حدّثي اسم العيادة والطبيب والتخصص والعنوان والهاتف من الإعدادات، وأضيفي شعاراً اختيارياً للطباعة. يحتفظ كل تقرير جديد بهوية العيادة وقت حفظه.' : 'الأرشفة قابلة للتراجع. يفحص نماء ملفات JSON ويطلب تأكيداً واضحاً قبل الاستبدال.'}</p><div class="notice">${connected ? 'الأرشفة قابلة للتراجع. النسخ الاحتياطية مشفرة بكلمة مرور؛ يستطيع مسؤول العيادة تنزيلها واستعادتها من «الحساب وإدارة العيادة».' : 'البنود والنتائج اصطناعية. التحويل المعياري وGSV وABC غير متصلة.'}</div><button class="btn" data-action="settings">الإعدادات والبيانات</button>${connected ? '' : '<button class="btn text" data-action="example-results">مثال توضيحي للنتائج</button>'}</section></div>`,
  );
}
function report() {
  view = 'report';
  const p = patientOf(current),
    s = stats(current),
    ds = activeDomains(current),
    snap = current.reportSnapshot || {
      clinicName: db.settings.clinicName,
      confidenceLevel: current.confidenceLevel || db.settings.confidenceLevel,
      significanceLevel: current.significanceLevel || db.settings.significanceLevel,
    };
  const norm = '<td class="placeholder">غير متاح</td>';
  shell(
    head(
      'تقرير محفوظ',
      esc(p.name),
      'ملخص زيارة تجريبي يحتفظ ببياناته وقت الحفظ.',
      `<button class="btn" data-action="patient" data-id="${p.id}">سجل الطفل</button><button class="btn primary" data-action="print">${icon('print')} طباعة / حفظ PDF</button>`,
    ) +
      `<article id="report"><header class="report-head row spread"><div><p class="eyebrow">فينلاند</p><h2>ملخص تقييم المهارات التكيفية</h2><span class="small muted">نموذج واجهة تجريبي · ليس نتيجة اختبار سريري</span></div><span class="badge blue">${dateLabel(current.date)}</span></header><div class="report-grid"><div><span>اسم الطفل</span><strong>${esc(p.name)}</strong></div><div><span>العمر الزمني</span>${esc(age(p, current.date))}</div><div><span>الجنس · تاريخ الميلاد</span>${esc(p.sex)} · <bdi>${esc(p.dob)}</bdi></div><div><span>المستجيب</span>${esc(current.respondent)} · ${esc(current.relationship)}</div><div><span>القائم بالفحص</span>${esc(current.examiner)}</div><div><span>حالة التقرير</span>محفوظ · ${s.answeredCount} إجابة</div></div><div class="report-note"><strong>حدود هذا التقرير</strong><br>الأرقام مجاميع لبنود توضيحية قصيرة، ولا تمثل درجات خام لاختبار منشور ولا تحدد مستوى الطفل.</div><section class="card report-card"><h2>ملخص المجالات الفرعية</h2><div class="table-wrap report-table"><table><thead><tr><th>المجال الفرعي</th><th>مجموع الأمثلة</th><th>v-scale</th><th>العمر المكافئ</th><th>GSV</th><th>تقديرية</th></tr></thead><tbody>${ds
        .filter((d) => d.group !== 'MAL')
        .map(
          (d) =>
            `<tr><td><strong>${d.name}</strong> <span class="muted small"><bdi>${d.id.toUpperCase()}</bdi></span></td><td>${s.bySubdomain[d.id].total}</td>${norm}${norm}${norm}<td>${d.items.filter((i) => current.estimated[i.id]).length}</td></tr>`,
        )
        .join(
          '',
        )}</tbody></table></div></section><section class="card report-card"><h2>المجالات ومركب السلوك التكيفي</h2><div class="norms">${groups
        .filter((g) => g[0] !== 'MAL' && (g[0] !== 'MOT' || current.motor))
        .map(
          (g) =>
            `<div class="norm"><span class="small">${g[1]} · <bdi>${g[0]}</bdi></span><b>—</b><span class="placeholder">بانتظار التحويل المعياري</span></div>`,
        )
        .join(
          '',
        )}</div><div class="report-note"><strong>مركب السلوك التكيفي ABC: غير محسوب</strong><br>المستوى التكيفي والرتبة المئينية وفترة الثقة تحتاج المحرك والجداول المعتمدة.</div></section><section class="card report-card"><h2>إعدادات التحليل المختارة</h2><div class="selection-grid"><div><span>مستوى الثقة</span><strong>${esc(snap.confidenceLevel)}%</strong><small>اختيار محفوظ؛ فترة الثقة غير محسوبة.</small></div><div><span>مستوى الدلالة</span><strong><bdi>${esc(snap.significanceLevel)}</bdi></strong><small>اختيار محفوظ؛ لا توجد قيمة حرجة أو نتيجة دلالة.</small></div></div></section>${
        current.maladaptive
          ? `<section class="card report-card"><h2>السلوك غير التكيفي</h2><div class="table-wrap"><table><thead><tr><th>المقياس</th><th>مجموع الأمثلة</th><th>v-scale</th><th>التفسير</th></tr></thead><tbody>${['internal', 'external'].map((id) => `<tr><td>${domains.find((d) => d.id === id).name}</td><td>${s.bySubdomain[id].total}</td>${norm}${norm}</tr>`).join('')}</tbody></table></div><h3>البنود الحرجة المسجلة</h3>${
              domains
                .find((d) => d.id === 'critical')
                .items.filter((i) => current.answers[i.id] > 0)
                .map(
                  (i) =>
                    `<p class="small">${esc(i.text)} <span class="badge amber">${current.answers[i.id]}</span></p>`,
                )
                .join('') || '<p class="small muted">لم تُسجل إجابة موجبة في الأمثلة الحرجة.</p>'
            }<p class="small muted">تُراجع البنود الحرجة كلٌ على حدة، ولا تُجمع في درجة كلية.</p></section>`
          : ''
      }<section class="card report-card"><h2>القوة والضعف والمقارنات الزوجية</h2><p class="small muted">لا نستنتج قوة أو ضعفاً من المجاميع التوضيحية.</p><div class="table-wrap"><table><thead><tr><th>التحليل</th><th>فرق الدرجات</th><th>القيمة الحرجة</th><th>النتيجة</th></tr></thead><tbody><tr><td>المجال مقارنة بمتوسط المجالات</td>${norm}${norm}${norm}</tr><tr><td>التواصل مقابل الحياة اليومية</td>${norm}${norm}${norm}</tr><tr><td>التواصل مقابل التنشئة الاجتماعية</td>${norm}${norm}${norm}</tr><tr><td>الحياة اليومية مقابل التنشئة الاجتماعية</td>${norm}${norm}${norm}</tr></tbody></table></div></section>${current.note ? `<section class="card report-card"><h2>ملاحظة الفاحصة</h2><p style="white-space:pre-wrap">${esc(current.note)}</p></section>` : ''}<p class="footer-note">نموذج تجريبي غير سريري · بيانات اصطناعية · GSV مقياس للنمو وليست معدل نمو · التقرير المحفوظ لا يتغير بتعديل إعدادات العيادة.</p></article>`,
  );
}
