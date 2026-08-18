// ─── CONSTANTS ───
const KEY = 'bunkbuddy';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CONFETTI_COLORS = ['#38bdf8', '#c084fc', '#fb923c', '#34d399', '#fbbf24', '#f43f5e'];

// ─── STATE ───
let data = null;
let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();
let pendingAbsent = [];   // uncommitted — affects calculations but not saved until confirmed
let holidayMode = false;

// ─── DOM ───
const $ = id => document.getElementById(id);

// ─── UTILS ───
function isWeekday(d) { const w = d.getDay(); return w >= 1 && w <= 5; }
function dayName(d) { return DAYS[d.getDay() - 1]; }
function ds(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function pd(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function today() { const t = new Date(); t.setHours(0,0,0,0); return t; }
function fmtShort(s) { const d = pd(s); return `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`; }
function fmtFull(s) {
  const d = pd(s);
  const dl = d.getDay() >= 1 && d.getDay() <= 5 ? DAY_LABELS[d.getDay()-1] : 'Weekend';
  return `${dl}, ${fmtShort(s)}`;
}
function allSubjects(tt) {
  const s = new Set();
  for (const day of DAYS) (tt[day]||[]).forEach(e => s.add(e.subject));
  return [...s];
}
function classesOn(tt, day, subj) {
  return (tt[day]||[]).filter(e => e.subject === subj).reduce((a,e) => a + e.classes, 0);
}

// ─── DATA LAYER ───
function load() { const r = localStorage.getItem(KEY) || localStorage.getItem('bunkplanner'); return r ? JSON.parse(r) : null; }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

// ─── CALCULATION ENGINE ───
// Dynamic window: today → windowEnd or max(absentDates)
function project(absentDates, windowEnd) {
  const subjects = allSubjects(data.timetable);
  const holidays = new Set(data.holidays || []);

  // No projection — just entered attendance
  if (absentDates.length === 0 && !windowEnd) {
    const r = {};
    for (const subj of subjects) {
      const ex = data.attendance[subj] || { attended: 0, total: 0 };
      r[subj] = { attended: ex.attended, total: ex.total, percent: ex.total > 0 ? (ex.attended/ex.total)*100 : 100 };
    }
    return r;
  }

  const t = today();
  let end = windowEnd ? pd(windowEnd) : new Date(t);
  for (const d of absentDates) { const dd = pd(d); if (dd > end) end = dd; }

  const absentSet = new Set(absentDates);
  const r = {};

  for (const subj of subjects) {
    let addAtt = 0, addTot = 0;
    const c = new Date(t);

    while (c <= end) {
      if (isWeekday(c)) {
        const s = ds(c);
        if (!holidays.has(s)) {
          const n = classesOn(data.timetable, dayName(c), subj);
          addTot += n;
          if (!absentSet.has(s)) addAtt += n;
        }
      }
      c.setDate(c.getDate() + 1);
    }

    const ex = data.attendance[subj] || { attended: 0, total: 0 };
    const att = ex.attended + addAtt;
    const tot = ex.total + addTot;
    r[subj] = { attended: att, total: tot, percent: tot > 0 ? (att/tot)*100 : 100 };
  }
  return r;
}

// Color for a calendar cell: what happens if user adds this date as absent?
function dateColor(dateObj) {
  const s = ds(dateObj);
  if (pendingAbsent.includes(s)) return 'absent';

  const tempAbsent = [...pendingAbsent, s];
  const proj = project(tempAbsent);
  let min = 100;
  for (const v of Object.values(proj)) min = Math.min(min, v.percent);

  if (min < 75) return 'danger';
  if (min < 76) return 'risky';
  return 'safe';
}

// ─── DYNAMIC LONG WEEKENDS (Next 10 Weeks, 4-Day+ Only) ───
// Only shows long weekends greater than Friday-Sunday (4 days or longer)
function findLongWeekends() {
  const t = today();
  const tenWeeksLater = new Date(t);
  tenWeeksLater.setDate(tenWeeksLater.getDate() + 70);
  const semEnd = pd(data.semesterEnd);
  const end = tenWeeksLater < semEnd ? tenWeeksLater : semEnd;

  const holidays = new Set(data.holidays || []);
  const pendingSet = new Set(pendingAbsent);

  const fridays = [];
  const c = new Date(t); c.setDate(c.getDate() + 1);

  while (c <= end) {
    const s = ds(c);
    if (c.getDay() === 5) fridays.push(s);
    c.setDate(c.getDate() + 1);
  }

  const suggestions = [];
  const extra = [...pendingAbsent];

  // Check Fri + Mon pairs for 4-day long weekends (Fri, Sat, Sun, Mon)
  for (const fri of fridays) {
    const friD = pd(fri);
    const monD = new Date(friD); monD.setDate(monD.getDate() + 3);
    const mon = ds(monD);

    const friOff = holidays.has(fri) || pendingSet.has(fri);
    const monOff = holidays.has(mon) || pendingSet.has(mon);

    // If both Friday and Monday are off (Holiday or Bunk), it's an active 4-day long weekend
    if (friOff && monOff) {
      const friHol = holidays.has(fri);
      const monHol = holidays.has(mon);
      suggestions.push({
        type: '4-day',
        tag: (friHol && monHol) ? 'natural' : 'planned',
        label: `🎉 4-Day Weekend: ${fmtShort(fri)} – ${fmtShort(mon)}`
      });
    }
  }

  // Find available 4-day long weekends (user can safely skip Fri & Mon)
  for (const fri of fridays) {
    const friD = pd(fri);
    const monD = new Date(friD); monD.setDate(monD.getDate() + 3);
    const mon = ds(monD);

    const friOff = holidays.has(fri) || pendingSet.has(fri);
    const monOff = holidays.has(mon) || pendingSet.has(mon);

    if (!friOff || !monOff) {
      if (!extra.includes(fri) && !extra.includes(mon)) {
        const test = [...extra, fri, mon];
        if (Object.values(project(test, data.semesterEnd)).every(s => s.percent >= 75)) {
          suggestions.push({
            type: '4-day',
            tag: 'available',
            label: `Safe 4-Day: Skip ${fmtShort(fri)} & ${fmtShort(mon)}`
          });
          extra.push(fri, mon);
        }
      }
    }
  }

  return suggestions;
}

// ─── CONFETTI EFFECT FOR HOLIDAYS ───
function attachConfettiParticles(cell) {
  cell.querySelectorAll('.holiday-particle').forEach(p => p.remove());
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('span');
    p.className = 'holiday-particle';
    p.style.left = (15 + Math.random() * 70) + '%';
    p.style.top = (20 + Math.random() * 60) + '%';
    p.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    p.style.animationDelay = (Math.random() * 2) + 's';
    cell.appendChild(p);
  }
}

function triggerConfettiBurst(cell) {
  const rect = cell.getBoundingClientRect();
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.style.position = 'fixed';
    p.style.width = (6 + Math.random() * 4) + 'px';
    p.style.height = (6 + Math.random() * 4) + 'px';
    p.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.left = (rect.left + rect.width / 2) + 'px';
    p.style.top = (rect.top + rect.height / 2) + 'px';
    p.style.zIndex = '999';
    p.style.pointerEvents = 'none';

    const vx = (Math.random() - 0.5) * 120;
    const vy = (Math.random() - 0.8) * 120;

    document.body.appendChild(p);

    p.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${vx}px, ${vy + 80}px) rotate(${Math.random() * 360}deg) scale(0)`, opacity: 0 }
    ], {
      duration: 800 + Math.random() * 400,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }).onfinish = () => p.remove();
  }
}

// ─── SETUP ───
let isReconfigure = false;

function renderSetup() {
  isReconfigure = !!data;
  $('setup-view').classList.remove('hidden');
  $('dashboard-view').classList.add('hidden');

  // Show close button only when reconfiguring (not first setup)
  const closeBtn = $('setup-close');
  if (isReconfigure) closeBtn.classList.remove('hidden');
  else closeBtn.classList.add('hidden');

  if (data) {
    $('semester-end').value = data.semesterEnd;
  }

  const editor = $('timetable-editor');
  editor.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const day = DAYS[i];
    const block = document.createElement('div');
    block.className = 'day-block';
    block.dataset.day = day;

    const h3 = document.createElement('h3');
    h3.textContent = DAY_LABELS[i];
    block.appendChild(h3);

    const list = document.createElement('div');
    list.className = 'subjects-list';
    block.appendChild(list);

    if (data && data.timetable[day]) {
      data.timetable[day].forEach(s => addSubjectRow(list, s.subject, s.classes));
    }

    const btn = document.createElement('button');
    btn.className = 'add-subject-btn';
    btn.textContent = '+ Add Subject';
    btn.onclick = () => { addSubjectRow(list); updateAttEditor(); validate(); };
    block.appendChild(btn);
    editor.appendChild(block);
  }

  updateAttEditor();
  validate();
}

function closeSetup() {
  if (!data) return; // can't close first setup
  $('setup-view').classList.add('hidden');
  $('dashboard-view').classList.remove('hidden');
  pendingAbsent = [...data.absentDates];
  renderAll();
}

function addSubjectRow(container, name, classes) {
  const row = document.createElement('div');
  row.className = 'subject-row';

  const nameIn = document.createElement('input');
  nameIn.type = 'text';
  nameIn.placeholder = 'Subject name';
  nameIn.value = name || '';
  nameIn.oninput = () => { updateAttEditor(); validate(); };

  const classIn = document.createElement('input');
  classIn.type = 'number';
  classIn.min = 1; classIn.max = 10;
  classIn.value = classes || 1;
  classIn.oninput = validate;

  const rm = document.createElement('button');
  rm.className = 'remove-btn';
  rm.textContent = '×';
  rm.onclick = () => { row.remove(); updateAttEditor(); validate(); };

  row.append(nameIn, classIn, rm);
  container.appendChild(row);
}

// ponytail: frontend mode toggles and JSON input handlers ready -> waiting for JSON schema/parser integration in next turn
function setTimetableMode(mode) {
  const manualTab = $('tt-mode-manual');
  const jsonTab = $('tt-mode-json');
  const manualCont = $('timetable-manual-container');
  const jsonCont = $('timetable-json-container');

  if (mode === 'json') {
    manualTab.classList.remove('active');
    jsonTab.classList.add('active');
    manualCont.classList.add('hidden');
    jsonCont.classList.remove('hidden');
    $('attendance-card').style.display = '';
  } else {
    jsonTab.classList.remove('active');
    manualTab.classList.add('active');
    jsonCont.classList.add('hidden');
    manualCont.classList.remove('hidden');
  }
  updateAttEditor();
  validate();
}

function setAttendanceMode(mode) {
  const manualTab = $('att-mode-manual');
  const jsonTab = $('att-mode-json');
  const manualCont = $('attendance-manual-container');
  const jsonCont = $('attendance-json-container');

  if (mode === 'json') {
    manualTab.classList.remove('active');
    jsonTab.classList.add('active');
    manualCont.classList.add('hidden');
    jsonCont.classList.remove('hidden');
  } else {
    jsonTab.classList.remove('active');
    manualTab.classList.add('active');
    jsonCont.classList.add('hidden');
    manualCont.classList.remove('hidden');
  }
  validate();
}

function copyPrompt(id) {
  const text = $(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    toast('📋 ChatGPT Prompt copied to clipboard!');
  }).catch(() => {
    toast('Copied!');
  });
}

function updateAttEditor() {
  const subjects = formSubjects();
  const card = $('attendance-card');
  const editor = $('attendance-editor');
  const ttJsonActive = $('tt-mode-json')?.classList.contains('active');

  if (!subjects.length && !ttJsonActive) { card.style.display = 'none'; return; }

  card.style.display = '';
  editor.innerHTML = '';

  for (const subj of subjects) {
    const ex = data?.attendance?.[subj] || { attended: 0, total: 0 };
    const row = document.createElement('div');
    row.className = 'att-row';
    row.innerHTML = `
      <label>${subj}</label>
      <input type="number" min="0" class="att-attended" data-subject="${subj}" value="${ex.attended}">
      <span>out of</span>
      <input type="number" min="0" class="att-total" data-subject="${subj}" value="${ex.total}">
    `;
    editor.appendChild(row);
  }
}

function parseTimetableJson(str) {
  const tt = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] };
  if (!str || !str.trim()) return tt;
  try {
    let cleanStr = str.trim();
    if (cleanStr.startsWith('```')) {
      cleanStr = cleanStr.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    const parsed = JSON.parse(cleanStr);
    const dayMap = {
      mon: 'monday', monday: 'monday',
      tue: 'tuesday', tues: 'tuesday', tuesday: 'tuesday',
      wed: 'wednesday', wednesday: 'wednesday',
      thu: 'thursday', thur: 'thursday', thurs: 'thursday', thursday: 'thursday',
      fri: 'friday', friday: 'friday'
    };

    for (const [key, rawVal] of Object.entries(parsed)) {
      const dayNorm = dayMap[key.toLowerCase().trim()];
      if (!dayNorm) continue;

      if (Array.isArray(rawVal)) {
        const subjCount = {};
        for (const item of rawVal) {
          if (typeof item === 'string' && item.trim()) {
            subjCount[item.trim()] = (subjCount[item.trim()] || 0) + 1;
          } else if (typeof item === 'object' && item !== null) {
            const subjName = item.subject || item.name || item.subject_name || item.sub || '';
            const count = parseInt(item.classes || item.count || item.lectures || item.number || item.num || 1) || 1;
            if (subjName) subjCount[subjName.trim()] = (subjCount[subjName.trim()] || 0) + count;
          }
        }
        for (const [s, c] of Object.entries(subjCount)) {
          tt[dayNorm].push({ subject: s, classes: c });
        }
      } else if (typeof rawVal === 'object' && rawVal !== null) {
        for (const [subj, val] of Object.entries(rawVal)) {
          const count = typeof val === 'number' ? val : (parseInt(val) || 1);
          if (subj.trim() && count > 0) {
            tt[dayNorm].push({ subject: subj.trim(), classes: count });
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse timetable JSON:', err);
  }
  return tt;
}

function parseAttendanceJson(str) {
  const att = {};
  if (!str || !str.trim()) return att;
  try {
    let cleanStr = str.trim();
    if (cleanStr.startsWith('```')) {
      cleanStr = cleanStr.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    const parsed = JSON.parse(cleanStr);

    for (const [subj, val] of Object.entries(parsed)) {
      if (!subj || !subj.trim()) continue;
      const sName = subj.trim();

      if (Array.isArray(val) && val.length >= 2) {
        att[sName] = { attended: parseInt(val[0]) || 0, total: parseInt(val[1]) || 0 };
      } else if (typeof val === 'object' && val !== null) {
        const attended = parseInt(val.attended ?? val.present ?? val.att ?? val.attended_lectures ?? 0) || 0;
        const total = parseInt(val.total ?? val.delivered ?? val.lectures_delivered ?? val.held ?? val.tot ?? 0) || 0;
        att[sName] = { attended, total };
      }
    }
  } catch (err) {
    console.error('Failed to parse attendance JSON:', err);
  }
  return att;
}

function formSubjects() {
  const isJson = $('tt-mode-json')?.classList.contains('active');
  if (isJson) {
    const tt = parseTimetableJson($('timetable-json-input')?.value || '');
    const s = new Set();
    for (const day of DAYS) (tt[day] || []).forEach(e => s.add(e.subject));
    return [...s];
  }

  const s = new Set();
  document.querySelectorAll('.subject-row').forEach(r => {
    const v = r.querySelector('input[type="text"]').value.trim();
    if (v) s.add(v);
  });
  return [...s];
}

function formTimetable() {
  const isJson = $('tt-mode-json')?.classList.contains('active');
  if (isJson) {
    return parseTimetableJson($('timetable-json-input')?.value || '');
  }

  const tt = {};
  document.querySelectorAll('.day-block').forEach(b => {
    const day = b.dataset.day;
    tt[day] = [];
    b.querySelectorAll('.subject-row').forEach(r => {
      const name = r.querySelector('input[type="text"]').value.trim();
      const n = parseInt(r.querySelector('input[type="number"]').value) || 1;
      if (name) tt[day].push({ subject: name, classes: n });
    });
  });
  return tt;
}

function formAttendance() {
  const isJson = $('att-mode-json')?.classList.contains('active');
  if (isJson) {
    return parseAttendanceJson($('attendance-json-input')?.value || '');
  }

  const att = {};
  document.querySelectorAll('.att-row').forEach(r => {
    const subj = r.querySelector('.att-attended').dataset.subject;
    att[subj] = {
      attended: parseInt(r.querySelector('.att-attended').value) || 0,
      total: parseInt(r.querySelector('.att-total').value) || 0
    };
  });
  return att;
}

function validate() {
  const semEnd = $('semester-end').value;
  const hasManual = formSubjects().length > 0;
  const ttJson = $('timetable-json-input')?.value.trim();
  const hasJson = ttJson && ttJson.length > 0;
  $('save-setup').disabled = !(semEnd && (hasManual || hasJson));
}

function saveSetup() {
  data = {
    semesterEnd: $('semester-end').value,
    lastVisitDate: ds(today()),
    timetable: formTimetable(),
    attendance: formAttendance(),
    absentDates: [], // Clear absents when initializing engine / reconfiguring
    holidays: data?.holidays || []
  };
  save(data);
  showDashboard();
}

// ─── DASHBOARD ───
function showDashboard() {
  $('setup-view').classList.add('hidden');
  $('dashboard-view').classList.remove('hidden');
  pendingAbsent = [...data.absentDates];
  holidayMode = false;
  updateHolidayToggle();
  renderAll();
}

function renderAll() {
  renderCalendar();
  renderProjections();
  renderSuggestions();
  updateConfirmBar();
}

// ─── CALENDAR ───
function renderCalendar() {
  const t = today();
  $('month-label').textContent = `${MONTHS[viewMonth]} ${viewYear}`;

  const body = $('cal-body');
  body.innerHTML = '';

  const first = new Date(viewYear, viewMonth, 1);
  const last = new Date(viewYear, viewMonth + 1, 0);
  const semEnd = pd(data.semesterEnd);
  const holidays = new Set(data.holidays || []);

  // Find max absent date in pendingAbsent
  let maxAbsentObj = null;
  for (const dStr of pendingAbsent) {
    const dObj = pd(dStr);
    if (!maxAbsentObj || dObj > maxAbsentObj) maxAbsentObj = dObj;
  }

  let offset = first.getDay() - 1;
  if (offset < 0) offset = 6;

  for (let i = 0; i < offset; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    body.appendChild(cell);
  }

  for (let d = 1; d <= last.getDate(); d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const dStr = ds(dateObj);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.date = dStr;
    cell.innerHTML = `<span>${d}</span>`;

    const wkend = !isWeekday(dateObj);
    const past = dateObj < t;
    const isToday = dateObj.getTime() === t.getTime();
    const future = dateObj > t;
    const absent = pendingAbsent.includes(dStr);
    const holiday = holidays.has(dStr);
    const beyond = dateObj > semEnd;

    // Check if this date is within the active planning window (today <= dateObj <= maxAbsentObj)
    const inActiveWindow = maxAbsentObj && dateObj >= t && dateObj <= maxAbsentObj;

    if (wkend || beyond) {
      cell.classList.add('weekend');
    } else if (holiday) {
      cell.classList.add('holiday');
      attachConfettiParticles(cell);
      if (isToday || future) {
        cell.classList.add('future');
        cell.addEventListener('click', (e) => handleClick(dateObj, cell));
      } else {
        cell.classList.add('past');
      }
    } else if (past) {
      cell.classList.add('past');
      if (absent) cell.classList.add('was-absent');
    } else if (isToday || future) {
      cell.classList.add('future');
      
      if (absent) {
        cell.classList.add('absent');
      } else if (inActiveWindow) {
        // THIS DAY IS ATTENDED! LIT VIBRANT GREEN!
        cell.classList.add('attending-green');
      } else {
        // Outside the current planning window
        cell.classList.add(dateColor(dateObj));
      }

      cell.addEventListener('click', (e) => handleClick(dateObj, cell));
      cell.addEventListener('mouseenter', e => {
        showTooltip(e, dateObj);
        highlightHoverPresentRange(dateObj);
      });
      cell.addEventListener('mouseleave', () => {
        hideTooltip();
        clearHoverPresentRange();
      });
      cell.addEventListener('mousemove', moveTooltip);
    }

    if (isToday) cell.classList.add('today');
    body.appendChild(cell);
  }
}

// Highlight dates between today and hovered date as temporary hover-present
function highlightHoverPresentRange(targetDateObj) {
  const t = today();
  if (targetDateObj < t) return;
  
  const targetStr = ds(targetDateObj);
  const holidays = new Set(data.holidays || []);
  const pendingSet = new Set(pendingAbsent);

  document.querySelectorAll('.cal-cell.future').forEach(cell => {
    const dStr = cell.dataset.date;
    if (!dStr) return;
    const dObj = pd(dStr);
    if (dObj >= t && dObj < targetDateObj) {
      if (!pendingSet.has(dStr) && !holidays.has(dStr) && !cell.classList.contains('weekend') && !cell.classList.contains('auto-present')) {
        cell.classList.add('hover-present');
      }
    }
  });
}

function clearHoverPresentRange() {
  document.querySelectorAll('.cal-cell.hover-present').forEach(cell => {
    cell.classList.remove('hover-present');
  });
}

// ─── CLICK: instant toggle ───
function handleClick(dateObj, cellElement) {
  const dStr = ds(dateObj);
  hideTooltip();

  if (holidayMode) {
    const holidays = data.holidays || [];
    const idx = holidays.indexOf(dStr);
    if (idx >= 0) {
      holidays.splice(idx, 1);
    } else {
      holidays.push(dStr);
      if (cellElement) triggerConfettiBurst(cellElement);
    }
    data.holidays = holidays;
    save(data);
    const aIdx = pendingAbsent.indexOf(dStr);
    if (aIdx >= 0) pendingAbsent.splice(aIdx, 1);
    renderAll();
    return;
  }

  const idx = pendingAbsent.indexOf(dStr);
  if (idx >= 0) pendingAbsent.splice(idx, 1);
  else pendingAbsent.push(dStr);
  renderAll();
}

// ─── CONFIRM BAR ───
function updateConfirmBar() {
  const bar = $('confirm-bar');
  const savedSet = new Set(data.absentDates);
  const pendingSet = new Set(pendingAbsent);

  const hasChanges =
    pendingAbsent.length !== data.absentDates.length ||
    pendingAbsent.some(d => !savedSet.has(d)) ||
    data.absentDates.some(d => !pendingSet.has(d));

  if (!hasChanges) { bar.classList.add('hidden'); return; }

  bar.classList.remove('hidden');
  const count = pendingAbsent.length;
  $('confirm-info').textContent = `${count} day${count !== 1 ? 's' : ''} marked absent (unconfirmed)`;
}

function confirmPlan() {
  data.absentDates = [...pendingAbsent];
  save(data);
  renderAll();
  toast('⚡ Plan confirmed! Absences saved.');
}

function resetPlan() {
  pendingAbsent = [...data.absentDates];
  renderAll();
}

// ─── HOLIDAY MODE ───
function toggleHolidayMode() {
  holidayMode = !holidayMode;
  updateHolidayToggle();
}

function updateHolidayToggle() {
  const btn = $('holiday-toggle');
  if (holidayMode) {
    btn.classList.add('active');
    btn.innerHTML = '<span class="holiday-sparkle">🎉</span> Holiday Mode ON';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<span class="holiday-sparkle">🎉</span> Holiday Mode';
  }
}

// ─── PROJECTED ATTENDANCE WITH (ATTENDED/TOTAL) ───
function renderProjections() {
  const proj = project(pendingAbsent);
  const el = $('proj-bars');
  el.innerHTML = '';

  const entries = Object.entries(proj).sort((a, b) => a[1].percent - b[1].percent);

  if (!entries.length) {
    el.innerHTML = '<p class="no-suggestions">No subjects configured yet.</p>';
    return;
  }

  for (const [subj, info] of entries) {
    const status = info.percent < 75 ? 'danger' : info.percent < 76 ? 'risky' : 'safe';
    const item = document.createElement('div');
    item.className = `proj-item ${status}`;
    item.innerHTML = `
      <div class="proj-item-header">
        <span class="proj-item-name">${subj}</span>
        <span class="proj-item-pct">
          ${info.percent.toFixed(1)}%
          <span class="proj-item-counts">(${info.attended}/${info.total})</span>
        </span>
      </div>
      <div class="proj-bar">
        <div class="proj-bar-fill" style="width:${Math.min(info.percent,100)}%"></div>
      </div>
    `;
    el.appendChild(item);
  }
}

// ─── SUGGESTIONS (DYNAMIC) ───
function renderSuggestions() {
  const sugg = findLongWeekends();
  const el = $('suggestions');
  el.innerHTML = '';

  if (!sugg.length) {
    el.innerHTML = '<p class="no-suggestions">No long weekend opportunities found.</p>';
    return;
  }

  for (const s of sugg) {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    const icon = s.tag === 'natural' ? '🏖️' : s.tag === 'planned' ? '😴' : '✨';
    const tagClass = s.tag === 'natural' ? 'natural' : '';
    item.innerHTML = `
      <span class="suggestion-icon">${icon}</span>
      <span class="suggestion-text">${s.label}</span>
      <span class="suggestion-type ${tagClass}">${s.type}</span>
    `;
    el.appendChild(item);
  }
}

// ─── TOOLTIP ───
function showTooltip(e, dateObj) {
  const dStr = ds(dateObj);
  const dIdx = dateObj.getDay();
  if (dIdx < 1 || dIdx > 5) return;

  const holidays = new Set(data.holidays || []);
  if (holidays.has(dStr)) return;

  const isAbsent = pendingAbsent.includes(dStr);
  const currentProj = project(pendingAbsent);

  let altProj, title;
  if (isAbsent) {
    const without = pendingAbsent.filter(x => x !== dStr);
    altProj = project(without);
    title = `Undo skip for ${fmtFull(dStr)}?`;
  } else {
    altProj = project([...pendingAbsent, dStr]);
    title = `Skip ${fmtFull(dStr)}?`;
  }

  const tooltip = $('tooltip');
  let html = `<div class="tooltip-title">${title}</div>`;

  for (const subj of allSubjects(data.timetable)) {
    const classes = classesOn(data.timetable, DAYS[dIdx - 1], subj);
    if (classes === 0) continue;

    const cur = currentProj[subj].percent;
    const next = altProj[subj].percent;
    const status = next < 75 ? 'danger' : next < 76 ? 'risky' : 'safe';
    const arrow = isAbsent ? '↑' : '↓';
    html += `<div class="tooltip-row">
      <span class="tooltip-subj">${subj}</span>
      <span class="tooltip-val ${status}">${cur.toFixed(1)}% (${currentProj[subj].attended}/${currentProj[subj].total}) ${arrow} ${next.toFixed(1)}% (${altProj[subj].attended}/${altProj[subj].total})</span>
    </div>`;
  }

  tooltip.innerHTML = html;
  tooltip.classList.remove('hidden');
  moveTooltip(e);
}

function moveTooltip(e) {
  const tt = $('tooltip');
  const rect = tt.getBoundingClientRect();
  tt.style.left = Math.min(e.clientX + 16, window.innerWidth - rect.width - 8) + 'px';
  tt.style.top = Math.min(e.clientY + 16, window.innerHeight - rect.height - 8) + 'px';
}

function hideTooltip() { $('tooltip').classList.add('hidden'); }

// ─── AUTO-PRESENT ───
// A day counts as "done" after 5 PM. Bakes elapsed days into data.attendance.
function checkAutoPresent() {
  const now = new Date();
  const cutoff = new Date(now); // latest day we can mark
  if (now.getHours() < 17) cutoff.setDate(cutoff.getDate() - 1); // before 5 PM → yesterday is last done day
  cutoff.setHours(0, 0, 0, 0);

  const last = pd(data.lastVisitDate);
  if (last >= cutoff) return; // nothing new to mark

  let count = 0;
  const holidays = new Set(data.holidays || []);
  const c = new Date(last);
  c.setDate(c.getDate() + 1); // start day after last visit

  while (c <= cutoff) {
    if (isWeekday(c)) {
      const s = ds(c);
      if (!holidays.has(s)) {
        const day = dayName(c);
        const isAbsent = data.absentDates.includes(s);
        let dayHadClasses = false;

        for (const subj of allSubjects(data.timetable)) {
          const n = classesOn(data.timetable, day, subj);
          if (n > 0) {
            dayHadClasses = true;
            if (!data.attendance[subj]) data.attendance[subj] = { attended: 0, total: 0 };
            data.attendance[subj].total += n;
            if (!isAbsent) data.attendance[subj].attended += n;
          }
        }
        if (dayHadClasses && !isAbsent) count++;
      }
    }
    c.setDate(c.getDate() + 1);
  }

  data.lastVisitDate = ds(cutoff);
  save(data);
  if (count > 0) toast(`Welcome back! ${count} day${count > 1 ? 's' : ''} auto-marked as present.`);
}

// ─── TOAST ───
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ─── EVENTS ───
$('save-setup').addEventListener('click', saveSetup);
$('semester-end').addEventListener('change', validate);
$('edit-setup').addEventListener('click', renderSetup);
$('setup-close').addEventListener('click', closeSetup);
$('prev-month').addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});
$('next-month').addEventListener('click', () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});
$('holiday-toggle').addEventListener('click', toggleHolidayMode);
$('confirm-btn').addEventListener('click', confirmPlan);
$('reset-btn').addEventListener('click', resetPlan);
$('timetable-json-input')?.addEventListener('input', validate);
$('attendance-json-input')?.addEventListener('input', validate);

// ─── INIT ───
data = load();
if (data) { checkAutoPresent(); showDashboard(); }
else renderSetup();
