// ── AUTH CHECK ───────────────────────────────────────────────────
const SESSION_USER = localStorage.getItem('hub:session');
if (!SESSION_USER) { window.location.href = 'auth.html'; }

// ── STORAGE HELPERS ─────────────────────────────────────────────
// Per-user prefix so each account has isolated data
const PREFIX = SESSION_USER + ':';
const save = (key, data) => localStorage.setItem(PREFIX + key, JSON.stringify(data));
const load = (key, fallback) => { try { const v = localStorage.getItem(PREFIX + key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } };
// ── DEFAULT STATE ────────────────────────────────────────────────
const DEFAULT_STATE = {
  classes: [],
  assignments: [],
  subjects: [],
  notes: [],
  skills: [],
  certs: [],
  careerGoals: [],
  expenses: { budget: 5000, transactions: [] },
  tasks: [],
  habits: [],
  habitLog: {},
  sleepLog: [],
  clubs: [],
  events: [],
  mood: { emoji: '', label: '', date: '' },
  marks: [],
  lcProblems: [],
  projects: [],
  resumeBullets: [],
  commuteLog: [],
  readingList: [],
  darkMode: false,
  pomodoro: { sessions: 0, date: '' }
};

let state = {};

function loadAll() {
  state = {};
  for (const key of Object.keys(DEFAULT_STATE)) {
    state[key] = load(key, JSON.parse(JSON.stringify(DEFAULT_STATE[key])));
  }
}

function saveKey(key) {
  save(key, state[key]);
}

// ── NAVIGATION ───────────────────────────────────────────────────
const PAGE_IDS = ['dashboard', 'academics', 'career', 'money', 'daily', 'clubs', 'timetable'];

function showPage(id) {
  PAGE_IDS.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) { el.classList.toggle('active', p === id); }
  });
  document.querySelectorAll('.nav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', PAGE_IDS[i] === id);
  });
  renderAll();
}

// ── MODALS ───────────────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── DARK MODE ────────────────────────────────────────────────────
function toggleDark() {
  state.darkMode = !state.darkMode;
  saveKey('darkMode');
  applyDark();
}

function applyDark() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : '');
}

// ── GREETING ─────────────────────────────────────────────────────
function renderGreeting() {
  const hours = new Date().getHours();
  const greet = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const user = JSON.parse(localStorage.getItem('hub:profile') || '{}');
  const name = user.name ? user.name.split(' ')[0] : '';
  const el = document.getElementById('greet-text');
  if (el) el.textContent = greet + (name ? ', ' + name : '') + ' 👋';
  const dateEl = document.getElementById('greet-date');
  if (dateEl) {
    const now = new Date();
    const day = now.toLocaleDateString('en-IN', { weekday: 'long' });
    const date = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    dateEl.textContent = `${day}, ${date}`;
  }
  const navProfile = document.getElementById('nav-profile');
  if (navProfile && user.avatar) navProfile.textContent = user.avatar;
}

// ── MOOD ─────────────────────────────────────────────────────────
function setMood(emoji, label) {
  state.mood = { emoji, label, date: today() };
  saveKey('mood');
  renderMood();
}

function renderMood() {
  const el = document.getElementById('mood-display');
  if (!el) return;
  if (state.mood.emoji && state.mood.date === today()) {
    el.textContent = state.mood.emoji + ' ' + state.mood.label;
  } else {
    el.textContent = 'How are you feeling today?';
  }
}

// ── CLASSES ──────────────────────────────────────────────────────
function addClass() {
  const name = v('class-name'); const day = v('class-day');
  const time = v('class-time'); const room = v('class-room');
  if (!name || !day || !time) return;
  state.classes.push({ id: uid(), name, day, time, room });
  saveKey('classes');
  closeModal('modal-class');
  clearInputs(['class-name', 'class-day', 'class-time', 'class-room']);
  renderClasses();
  renderTimetable();
}

function renderClasses() {
  const el = document.getElementById('classes-list');
  if (!el) return;
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = state.classes.filter(c => c.day === todayDay)
    .sort((a, b) => a.time.localeCompare(b.time));
  if (!todayClasses.length) { el.innerHTML = '<div class="empty">No classes today 🎉</div>'; return; }
  el.innerHTML = todayClasses.map(c => `
    <div class="assign-item">
      <span><strong>${c.time}</strong> — ${c.name}${c.room ? ' <small>('+c.room+')</small>' : ''}</span>
      <button class="btn btn-sm btn-danger" onclick="deleteClass('${c.id}')">✕</button>
    </div>`).join('');
}

function deleteClass(id) {
  state.classes = state.classes.filter(c => c.id !== id);
  saveKey('classes'); renderClasses(); renderTimetable();
}

// ── ASSIGNMENTS ──────────────────────────────────────────────────
function addAssignment() {
  const title = v('assign-title'); const subject = v('assign-subject');
  const due = v('assign-due');
  if (!title || !due) return;
  state.assignments.push({ id: uid(), title, subject, due, done: false });
  saveKey('assignments');
  closeModal('modal-assign');
  clearInputs(['assign-title', 'assign-subject', 'assign-due']);
  renderAssignments(); renderDueSoon();
}

function completeAssignment(id) {
  const a = state.assignments.find(x => x.id === id);
  if (a) { a.done = !a.done; saveKey('assignments'); renderAssignments(); renderDueSoon(); }
}

function deleteAssignment(id) {
  state.assignments = state.assignments.filter(x => x.id !== id);
  saveKey('assignments'); renderAssignments(); renderDueSoon();
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date(today());
  return Math.ceil(diff / 86400000);
}

function renderAssignments() {
  const el = document.getElementById('assignments-list');
  if (!el) return;
  const pending = state.assignments.filter(a => !a.done).sort((a, b) => new Date(a.due) - new Date(b.due));
  const done = state.assignments.filter(a => a.done);
  if (!state.assignments.length) { el.innerHTML = '<div class="empty">No assignments yet</div>'; return; }
  el.innerHTML = [...pending, ...done].map(a => {
    const d = daysUntil(a.due);
    const color = a.done ? 'var(--success)' : d < 0 ? 'var(--danger)' : d <= 2 ? 'var(--warning)' : 'var(--success)';
    return `<div class="assign-item" style="border-left:3px solid ${color};${a.done ? 'opacity:.6' : ''}">
      <div>
        <strong>${a.title}</strong>${a.subject ? ' <small>'+a.subject+'</small>' : ''}
        <div style="font-size:12px;color:var(--text-muted)">${a.done ? '✅ Done' : d < 0 ? '⚠️ Overdue' : 'Due in '+d+' day'+(d===1?'':'s')}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="completeAssignment('${a.id}')">${a.done ? 'Undo' : '✓'}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAssignment('${a.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderDueSoon() {
  const el = document.getElementById('due-soon-list');
  if (!el) return;
  const upcoming = state.assignments.filter(a => !a.done && daysUntil(a.due) <= 7)
    .sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 5);
  if (!upcoming.length) { el.innerHTML = '<div class="empty">Nothing due soon 🎉</div>'; return; }
  el.innerHTML = upcoming.map(a => {
    const d = daysUntil(a.due);
    const cls = d < 0 ? 'danger' : d <= 2 ? 'warning' : 'success';
    return `<div class="due-item"><span>${a.title}</span><span class="due-badge badge-${cls}">${d < 0 ? 'Overdue' : d === 0 ? 'Today' : 'In '+d+'d'}</span></div>`;
  }).join('');
}

// ── ATTENDANCE ───────────────────────────────────────────────────
function addSubject() {
  const name = v('subject-name');
  if (!name) return;
  state.subjects.push({ id: uid(), name, present: 0, absent: 0 });
  saveKey('subjects');
  closeModal('modal-subject');
  clearInputs(['subject-name']);
  renderAttendance();
}

function markAttendance(id, type) {
  const s = state.subjects.find(x => x.id === id);
  if (!s) return;
  if (type === 'P') s.present++; else s.absent++;
  saveKey('subjects'); renderAttendance();
}

function renderAttendance() {
  const el = document.getElementById('attendance-list');
  if (!el) return;
  if (!state.subjects.length) { el.innerHTML = '<div class="empty">No subjects added</div>'; return; }
  el.innerHTML = state.subjects.map(s => {
    const total = s.present + s.absent;
    const pct = total ? Math.round((s.present / total) * 100) : 100;
    const danger = pct < 75;
    return `<div class="att-item${danger ? ' att-danger' : ''}">
      <div>
        <strong>${s.name}</strong>
        <span style="margin-left:8px;color:${danger ? 'var(--danger)' : 'var(--success)'};font-weight:600">${pct}%</span>
        ${danger ? '<span style="color:var(--danger);font-size:11px;margin-left:4px">⚠️ Low</span>' : ''}
        <div style="font-size:12px;color:var(--text-muted)">${s.present}P / ${s.absent}A</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="att-btn" onclick="markAttendance('${s.id}','P')">P</button>
        <button class="att-btn" style="background:var(--danger);color:#fff" onclick="markAttendance('${s.id}','A')">A</button>
      </div>
    </div>`;
  }).join('');
}

// ── NOTES ────────────────────────────────────────────────────────
function addNote() {
  const subject = v('note-subject'); const content = v('note-content');
  if (!content) return;
  state.notes.push({ id: uid(), subject, content, date: today() });
  saveKey('notes');
  closeModal('modal-note');
  clearInputs(['note-subject', 'note-content']);
  renderNotes();
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveKey('notes'); renderNotes();
}

function renderNotes() {
  const el = document.getElementById('notes-list');
  if (!el) return;
  if (!state.notes.length) { el.innerHTML = '<div class="empty">No notes yet</div>'; return; }
  el.innerHTML = [...state.notes].reverse().map(n => `
    <div class="assign-item">
      <div>
        ${n.subject ? '<span class="chip">'+n.subject+'</span> ' : ''}
        <span>${n.content}</span>
        <div style="font-size:11px;color:var(--text-muted)">${n.date}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteNote('${n.id}')">✕</button>
    </div>`).join('');
}

// ── MARKS ────────────────────────────────────────────────────────
function addMarks() {
  const subject = v('marks-subject'); const test = v('marks-test');
  const score = parseFloat(v('marks-score')); const max = parseFloat(v('marks-max'));
  if (!subject || isNaN(score) || isNaN(max) || max === 0) return;
  state.marks.push({ id: uid(), subject, test, score, max });
  saveKey('marks');
  closeModal('modal-marks');
  clearInputs(['marks-subject', 'marks-test', 'marks-score', 'marks-max']);
  renderMarks();
}

function renderMarks() {
  const el = document.getElementById('marks-list');
  if (!el) return;
  if (!state.marks.length) { el.innerHTML = '<div class="empty">No marks recorded</div>'; return; }
  el.innerHTML = state.marks.map(m => {
    const pct = Math.round((m.score / m.max) * 100);
    const color = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    return `<div class="marks-item">
      <div><strong>${m.subject}</strong>${m.test ? ' — '+m.test : ''}</div>
      <div class="marks-score" style="color:${color}">${m.score}/${m.max} <small>(${pct}%)</small></div>
    </div>`;
  }).join('');
}

// ── POMODORO ─────────────────────────────────────────────────────
let pomoInterval = null;
let pomoSeconds = 25 * 60;
let pomoIsBreak = false;

function togglePomo() {
  if (pomoInterval) {
    clearInterval(pomoInterval);
    pomoInterval = null;
    const btn = document.getElementById('pomo-btn');
    if (btn) btn.textContent = '▶ Start';
  } else {
    const btn = document.getElementById('pomo-btn');
    if (btn) btn.textContent = '⏸ Pause';
    pomoInterval = setInterval(() => {
      pomoSeconds--;
      updatePomoDisplay();
      if (pomoSeconds <= 0) {
        clearInterval(pomoInterval);
        pomoInterval = null;
        beep();
        if (!pomoIsBreak) {
          const d = today();
          if (state.pomodoro.date !== d) { state.pomodoro.sessions = 0; state.pomodoro.date = d; }
          state.pomodoro.sessions++;
          saveKey('pomodoro');
          renderPomo();
          pomoIsBreak = true;
          pomoSeconds = 5 * 60;
          const lbl = document.getElementById('pomo-label');
          if (lbl) lbl.textContent = '☕ Break time!';
        } else {
          pomoIsBreak = false;
          pomoSeconds = 25 * 60;
          const lbl = document.getElementById('pomo-label');
          if (lbl) lbl.textContent = '🍅 Focus';
        }
        updatePomoDisplay();
        const b = document.getElementById('pomo-btn');
        if (b) b.textContent = '▶ Start';
      }
    }, 1000);
  }
}

function resetPomo() {
  clearInterval(pomoInterval);
  pomoInterval = null;
  pomoSeconds = 25 * 60;
  pomoIsBreak = false;
  updatePomoDisplay();
  const btn = document.getElementById('pomo-btn');
  if (btn) btn.textContent = '▶ Start';
  const lbl = document.getElementById('pomo-label');
  if (lbl) lbl.textContent = '🍅 Focus';
}

function updatePomoDisplay() {
  const el = document.getElementById('pomo-display');
  if (!el) return;
  const m = String(Math.floor(pomoSeconds / 60)).padStart(2, '0');
  const s = String(pomoSeconds % 60).padStart(2, '0');
  el.textContent = m + ':' + s;
}

function renderPomo() {
  const el = document.getElementById('pomo-count');
  if (!el) return;
  const d = today();
  const sessions = state.pomodoro.date === d ? state.pomodoro.sessions : 0;
  el.textContent = sessions + ' session' + (sessions !== 1 ? 's' : '') + ' today';
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
}

// ── SKILLS ───────────────────────────────────────────────────────
function addSkill() {
  const name = v('skill-name'); const level = v('skill-level') || 'Learning';
  if (!name) return;
  state.skills.push({ id: uid(), name, level });
  saveKey('skills');
  closeModal('modal-skill');
  clearInputs(['skill-name', 'skill-level']);
  renderSkills();
}

function cycleSkill(id) {
  const s = state.skills.find(x => x.id === id);
  if (!s) return;
  const levels = ['Learning', 'Intermediate', 'Done'];
  s.level = levels[(levels.indexOf(s.level) + 1) % levels.length];
  saveKey('skills'); renderSkills();
}

function deleteSkill(id) {
  state.skills = state.skills.filter(x => x.id !== id);
  saveKey('skills'); renderSkills();
}

function renderSkills() {
  const el = document.getElementById('skills-list');
  if (!el) return;
  if (!state.skills.length) { el.innerHTML = '<div class="empty">No skills added</div>'; return; }
  el.innerHTML = state.skills.map(s => {
    const cls = s.level === 'Done' ? 'badge-done' : s.level === 'Intermediate' ? 'badge-planned' : 'badge-learning';
    return `<div class="skill-item">
      <span>${s.name}</span>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="skill-badge ${cls}" onclick="cycleSkill('${s.id}')" style="cursor:pointer">${s.level}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteSkill('${s.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ── CERTS ────────────────────────────────────────────────────────
function addCert() {
  const name = v('cert-name'); const issuer = v('cert-issuer'); const date = v('cert-date');
  if (!name) return;
  state.certs.push({ id: uid(), name, issuer, date });
  saveKey('certs');
  closeModal('modal-cert');
  clearInputs(['cert-name', 'cert-issuer', 'cert-date']);
  renderCerts();
}

function deleteCert(id) {
  state.certs = state.certs.filter(x => x.id !== id);
  saveKey('certs'); renderCerts();
}

function renderCerts() {
  const el = document.getElementById('certs-list');
  if (!el) return;
  if (!state.certs.length) { el.innerHTML = '<div class="empty">No certifications added</div>'; return; }
  el.innerHTML = state.certs.map(c => `
    <div class="assign-item">
      <div><strong>${c.name}</strong>${c.issuer ? ' <small>— '+c.issuer+'</small>' : ''}${c.date ? '<div style="font-size:11px;color:var(--text-muted)">'+c.date+'</div>' : ''}</div>
      <button class="btn btn-sm btn-danger" onclick="deleteCert('${c.id}')">✕</button>
    </div>`).join('');
}

// ── CAREER GOALS ─────────────────────────────────────────────────
function addCareerGoal() {
  const text = v('career-goal-input');
  if (!text) return;
  state.careerGoals.push({ id: uid(), text, done: false });
  saveKey('careerGoals');
  closeModal('modal-career-goal');
  clearInputs(['career-goal-input']);
  renderCareerGoals();
}

function toggleCareerGoal(id) {
  const g = state.careerGoals.find(x => x.id === id);
  if (g) { g.done = !g.done; saveKey('careerGoals'); renderCareerGoals(); }
}

function deleteCareerGoal(id) {
  state.careerGoals = state.careerGoals.filter(x => x.id !== id);
  saveKey('careerGoals'); renderCareerGoals();
}

function renderCareerGoals() {
  const el = document.getElementById('career-goals-list');
  if (!el) return;
  if (!state.careerGoals.length) { el.innerHTML = '<div class="empty">No career goals yet</div>'; return; }
  el.innerHTML = state.careerGoals.map(g => `
    <div class="task-item" style="${g.done ? 'opacity:.6' : ''}">
      <input type="checkbox" class="task-check" ${g.done ? 'checked' : ''} onchange="toggleCareerGoal('${g.id}')">
      <span style="${g.done ? 'text-decoration:line-through' : ''}">${g.text}</span>
      <button class="task-del" onclick="deleteCareerGoal('${g.id}')">✕</button>
    </div>`).join('');
}

// ── LEETCODE ─────────────────────────────────────────────────────
function addLCProblem() {
  const name = v('lc-name'); const topic = v('lc-topic');
  const diff = getSelectedChip('lc-diff-chips', 'diff') || 'Medium';
  const platform = v('lc-platform') || 'LeetCode';
  if (!name) return;
  state.lcProblems.push({ id: uid(), name, topic, diff, platform, date: today() });
  saveKey('lcProblems');
  closeModal('modal-lc');
  clearInputs(['lc-name', 'lc-topic', 'lc-platform']);
  renderLCProblems();
}

function deleteLCProblem(id) {
  state.lcProblems = state.lcProblems.filter(x => x.id !== id);
  saveKey('lcProblems'); renderLCProblems();
}

function renderLCProblems() {
  const statsEl = document.getElementById('lc-stats');
  const listEl = document.getElementById('lc-list');
  if (!statsEl || !listEl) return;
  const easy = state.lcProblems.filter(p => p.diff === 'Easy').length;
  const med = state.lcProblems.filter(p => p.diff === 'Medium').length;
  const hard = state.lcProblems.filter(p => p.diff === 'Hard').length;
  statsEl.innerHTML = `
    <span class="lc-diff lc-easy">Easy: ${easy}</span>
    <span class="lc-diff lc-medium">Med: ${med}</span>
    <span class="lc-diff lc-hard">Hard: ${hard}</span>
    <span style="color:var(--text-muted);font-size:13px">Total: ${state.lcProblems.length}</span>`;
  if (!state.lcProblems.length) { listEl.innerHTML = '<div class="empty">No problems solved yet</div>'; return; }
  listEl.innerHTML = [...state.lcProblems].reverse().map(p => `
    <div class="lc-item">
      <div>
        <strong>${p.name}</strong>
        <span class="lc-diff lc-${p.diff.toLowerCase()}" style="margin-left:6px">${p.diff}</span>
        ${p.topic ? '<span style="font-size:12px;color:var(--text-muted);margin-left:6px">'+p.topic+'</span>' : ''}
        <div style="font-size:11px;color:var(--text-muted)">${p.platform} · ${p.date}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteLCProblem('${p.id}')">✕</button>
    </div>`).join('');
}

// ── PROJECTS ─────────────────────────────────────────────────────
function addProject() {
  const name = v('proj-name'); const tech = v('proj-tech');
  const link = v('proj-link'); const status = v('proj-status') || 'planned';
  if (!name) return;
  state.projects.push({ id: uid(), name, tech, link, status });
  saveKey('projects');
  closeModal('modal-project');
  clearInputs(['proj-name', 'proj-tech', 'proj-link', 'proj-status']);
  renderProjects();
}

function deleteProject(id) {
  state.projects = state.projects.filter(x => x.id !== id);
  saveKey('projects'); renderProjects();
}

function cycleProject(id) {
  const p = state.projects.find(x => x.id === id);
  if (!p) return;
  const statuses = ['planned', 'building', 'done'];
  p.status = statuses[(statuses.indexOf(p.status) + 1) % statuses.length];
  saveKey('projects'); renderProjects();
}

function renderProjects() {
  const el = document.getElementById('projects-list');
  if (!el) return;
  if (!state.projects.length) { el.innerHTML = '<div class="empty">No projects added</div>'; return; }
  el.innerHTML = state.projects.map(p => {
    const statusColor = p.status === 'done' ? 'var(--success)' : p.status === 'building' ? 'var(--warning)' : 'var(--text-muted)';
    return `<div class="proj-item">
      <div>
        <strong>${p.name}</strong>
        <span class="chip" style="cursor:pointer;background:${statusColor};color:#fff;margin-left:6px" onclick="cycleProject('${p.id}')">${p.status}</span>
        ${p.tech ? '<div style="font-size:12px;color:var(--text-muted)">${p.tech}</div>' : ''}
        ${p.link ? '<div><a href="'+p.link+'" target="_blank" style="font-size:12px">🔗 Link</a></div>' : ''}
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">✕</button>
    </div>`;
  }).join('');
}

// ── RESUME BULLETS ───────────────────────────────────────────────
function addResumeBullet() {
  const text = v('resume-bullet-input');
  if (!text) return;
  state.resumeBullets.push({ id: uid(), text });
  saveKey('resumeBullets');
  closeModal('modal-resume');
  clearInputs(['resume-bullet-input']);
  renderResumeBullets();
}

function deleteResumeBullet(id) {
  state.resumeBullets = state.resumeBullets.filter(x => x.id !== id);
  saveKey('resumeBullets'); renderResumeBullets();
}

function renderResumeBullets() {
  const el = document.getElementById('resume-bullets-list');
  if (!el) return;
  if (!state.resumeBullets.length) { el.innerHTML = '<div class="empty">No bullets added</div>'; return; }
  el.innerHTML = state.resumeBullets.map(b => `
    <div class="assign-item">
      <span>• ${b.text}</span>
      <button class="btn btn-sm btn-danger" onclick="deleteResumeBullet('${b.id}')">✕</button>
    </div>`).join('');
}

// ── EXPENSES ─────────────────────────────────────────────────────
const catIcons = { Food: '🍕', Transport: '🚌', Academic: '📚', Personal: '🎮', Social: '👥', Health: '🏥', Other: '❓' };

function setupChips(containerId, attr) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('[data-' + attr + ']').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('[data-' + attr + ']').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

function getSelectedChip(containerId, attr) {
  const container = document.getElementById(containerId);
  if (!container) return '';
  const active = container.querySelector('[data-' + attr + '].active');
  return active ? active.getAttribute('data-' + attr) : '';
}

function addExpenseModal() {
  openModal('modal-expense');
}

function addExpense() {
  const amount = parseFloat(v('exp-amount'));
  const cat = getSelectedChip('exp-cat-chips', 'cat') || 'Other';
  const mode = getSelectedChip('exp-mode-chips', 'mode') || 'Cash';
  const note = v('exp-note');
  if (isNaN(amount) || amount <= 0) return;
  state.expenses.transactions.push({ id: uid(), amount, cat, mode, note, date: today() });
  saveKey('expenses');
  closeModal('modal-expense');
  clearInputs(['exp-amount', 'exp-note']);
  renderMoney(); renderBudgetSnapshot();
}

function deleteExpense(id) {
  state.expenses.transactions = state.expenses.transactions.filter(x => x.id !== id);
  saveKey('expenses'); renderMoney(); renderBudgetSnapshot();
}

function saveBudget() {
  const val = parseFloat(v('budget-input'));
  if (!isNaN(val) && val > 0) { state.expenses.budget = val; saveKey('expenses'); }
  closeModal('modal-budget');
  renderMoney(); renderBudgetSnapshot();
}

function renderBudgetSnapshot() {
  const el = document.getElementById('budget-snapshot');
  if (!el) return;
  const monthTx = thisMonthTx();
  const spent = monthTx.reduce((s, t) => s + t.amount, 0);
  const budget = state.expenses.budget;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
  el.innerHTML = `
    <div class="budget-meta">₹${spent.toFixed(0)} / ₹${budget} spent this month</div>
    <div class="budget-bar-wrap"><div class="budget-bar" style="width:${pct}%;background:${color}"></div></div>
    <div style="font-size:12px;color:var(--text-muted)">${pct}% used</div>`;
}

function renderMoney() {
  const el = document.getElementById('money-transactions');
  if (!el) return;
  const monthTx = thisMonthTx();
  const spent = monthTx.reduce((s, t) => s + t.amount, 0);
  const budget = state.expenses.budget;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';

  // Category breakdown
  const cats = {};
  monthTx.forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.amount; });
  const catHtml = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
    const p = Math.round((amt / spent) * 100) || 0;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="width:80px;font-size:13px">${catIcons[cat] || '❓'} ${cat}</span>
      <div class="prog-wrap" style="flex:1"><div class="prog-bar" style="width:${p}%"></div></div>
      <span style="font-size:13px;width:60px;text-align:right">₹${amt.toFixed(0)}</span>
    </div>`;
  }).join('');

  const txHtml = [...state.expenses.transactions].reverse().slice(0, 20).map(t => `
    <div class="exp-item">
      <span>${catIcons[t.cat] || '❓'} ${t.note || t.cat} <small style="color:var(--text-muted)">${t.date}</small></span>
      <div style="display:flex;gap:6px;align-items:center">
        <strong>₹${t.amount}</strong>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense('${t.id}')">✕</button>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="budget-meta">₹${spent.toFixed(0)} / ₹${budget} — ${pct}% used</div>
      <div class="budget-bar-wrap"><div class="budget-bar" style="width:${pct}%;background:${color}"></div></div>
    </div>
    ${catHtml ? '<div class="card" style="margin-bottom:12px"><div class="card-title">By Category</div>'+catHtml+'</div>' : ''}
    <div class="card-title section-label">Recent Transactions</div>
    ${txHtml || '<div class="empty">No transactions yet</div>'}`;

  renderMonthlyHistory();
}

function renderMonthlyHistory() {
  const el = document.getElementById('monthly-history');
  if (!el) return;
  const groups = {};
  state.expenses.transactions.forEach(t => {
    const d = new Date(t.date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    groups[key] = (groups[key] || 0) + t.amount;
  });
  const sorted = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  if (!sorted.length) { el.innerHTML = '<div class="empty">No history yet</div>'; return; }
  el.innerHTML = sorted.map(([key, total]) => {
    const [yr, mo] = key.split('-');
    const label = new Date(yr, mo - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return `<div class="exp-item"><span>${label}</span><strong>₹${total.toFixed(0)}</strong></div>`;
  }).join('');
}

// ── GROQ AI ──────────────────────────────────────────────────────
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function analyseExpenses() {
  const keyEl = document.getElementById('groq-key');
  const key = keyEl ? keyEl.value.trim() : '';
  if (!key) { showAIResult('⚠️ Please enter your Groq API key.'); return; }
  const btn = document.getElementById('ai-analyse-btn');
  if (btn) { btn.textContent = 'Analysing...'; btn.disabled = true; }
  const summary = state.expenses.transactions.slice(-30)
    .map(t => `${t.date}: ₹${t.amount} on ${t.cat}${t.note ? ' ('+t.note+')' : ''}`)
    .join('\n');
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful financial advisor for a college student in India. Be warm, specific, and practical. Keep your response under 150 words. Use ₹ for currency. Give 2-3 concrete suggestions.' },
          { role: 'user', content: 'Here are my recent expenses:\n' + summary + '\n\nBudget: ₹' + state.expenses.budget + '/month. What am I overspending on and what should I change?' }
        ],
        temperature: 0.7, max_tokens: 512
      })
    });
    if (!res.ok) {
      if (res.status === 401) showAIResult('⚠️ API key looks incorrect. Check it at console.groq.com.');
      else if (res.status === 429) showAIResult('⚠️ Too many requests — wait a moment and try again.');
      else showAIResult('⚠️ Something went wrong. Check your internet connection.');
    } else {
      const data = await res.json();
      showAIResult(data.choices[0].message.content);
    }
  } catch (e) {
    showAIResult('⚠️ Could not reach the AI. Check your internet connection.');
  } finally {
    if (btn) { btn.textContent = '✨ Analyse with AI'; btn.disabled = false; }
  }
}

function showAIResult(text) {
  const el = document.getElementById('ai-result');
  if (el) el.innerHTML = `<div style="padding:12px;background:var(--primary-light);border-radius:8px;font-size:14px;line-height:1.6">${text.replace(/\n/g,'<br>')}</div>`;
}

// ── TASKS ────────────────────────────────────────────────────────
function addDashTask() {
  const input = document.getElementById('dash-task-input');
  if (!input || !input.value.trim()) return;
  state.tasks.push({ id: uid(), text: input.value.trim(), done: false });
  saveKey('tasks');
  input.value = '';
  renderTasks();
}

function addDailyTask() {
  const input = document.getElementById('daily-task-input');
  if (!input || !input.value.trim()) return;
  state.tasks.push({ id: uid(), text: input.value.trim(), done: false });
  saveKey('tasks');
  input.value = '';
  renderTasks();
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; saveKey('tasks'); renderTasks(); }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(x => x.id !== id);
  saveKey('tasks'); renderTasks();
}

function renderTasks() {
  const taskHtml = state.tasks.length
    ? state.tasks.map(t => `
      <div class="task-item" style="${t.done ? 'opacity:.6' : ''}">
        <input type="checkbox" class="task-check" ${t.done ? 'checked' : ''} onchange="toggleTask('${t.id}')">
        <span style="${t.done ? 'text-decoration:line-through' : ''}">${t.text}</span>
        <button class="task-del" onclick="deleteTask('${t.id}')">✕</button>
      </div>`).join('')
    : '<div class="empty">No tasks yet</div>';
  ['dash-tasks-list', 'daily-tasks-list'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = taskHtml;
  });
}

// ── HABITS ───────────────────────────────────────────────────────
function addHabit() {
  const name = v('habit-name');
  if (!name) return;
  state.habits.push({ id: uid(), name });
  saveKey('habits');
  closeModal('modal-habit');
  clearInputs(['habit-name']);
  renderHabits();
}

function toggleHabit(id) {
  const d = today();
  if (!state.habitLog[d]) state.habitLog[d] = {};
  state.habitLog[d][id] = !state.habitLog[d][id];
  saveKey('habitLog'); renderHabits();
}

function deleteHabit(id) {
  state.habits = state.habits.filter(x => x.id !== id);
  saveKey('habits'); renderHabits();
}

function renderHabits() {
  const el = document.getElementById('habits-list');
  if (!el) return;
  if (!state.habits.length) { el.innerHTML = '<div class="empty">No habits added</div>'; return; }
  const d = today();
  const log = state.habitLog[d] || {};
  el.innerHTML = state.habits.map(h => `
    <div class="habit-item">
      <input type="checkbox" class="habit-check" ${log[h.id] ? 'checked' : ''} onchange="toggleHabit('${h.id}')">
      <span style="${log[h.id] ? 'text-decoration:line-through;opacity:.6' : ''}">${h.name}</span>
      <button class="task-del" onclick="deleteHabit('${h.id}')">✕</button>
    </div>`).join('');
}

// ── SLEEP ────────────────────────────────────────────────────────
function logSleep() {
  const bedtime = v('sleep-bed'); const wake = v('sleep-wake');
  if (!bedtime || !wake) return;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let hrs = (wh + wm / 60) - (bh + bm / 60);
  if (hrs < 0) hrs += 24;
  state.sleepLog.push({ id: uid(), date: today(), bedtime, wake, hrs: Math.round(hrs * 10) / 10 });
  saveKey('sleepLog');
  clearInputs(['sleep-bed', 'sleep-wake']);
  renderSleep();
}

function renderSleep() {
  const el = document.getElementById('sleep-list');
  if (!el) return;
  if (!state.sleepLog.length) { el.innerHTML = '<div class="empty">No sleep logged</div>'; return; }
  const recent = [...state.sleepLog].reverse().slice(0, 7);
  const avg = recent.reduce((s, e) => s + e.hrs, 0) / recent.length;
  el.innerHTML = `<div style="margin-bottom:8px;font-size:13px;color:var(--text-muted)">7-day avg: <strong>${avg.toFixed(1)}h</strong></div>` +
    recent.map(e => `<div class="exp-item"><span>${e.date} · ${e.bedtime}→${e.wake}</span><strong style="color:${e.hrs>=7?'var(--success)':e.hrs>=6?'var(--warning)':'var(--danger)'}">${e.hrs}h</strong></div>`).join('');
}

// ── COMMUTE ──────────────────────────────────────────────────────
function addCommute() {
  const time = parseFloat(v('commute-time'));
  const cost = parseFloat(v('commute-cost')) || 0;
  const mode = getSelectedChip('commute-mode-chips', 'mode') || 'Bus';
  if (isNaN(time)) return;
  state.commuteLog.push({ id: uid(), time, cost, mode, date: today() });
  saveKey('commuteLog');
  clearInputs(['commute-time', 'commute-cost']);
  renderCommute();
}

function renderCommute() {
  const listEl = document.getElementById('commute-list');
  const statsEl = document.getElementById('commute-stats');
  if (!listEl) return;
  const recent = [...state.commuteLog].reverse().slice(0, 10);
  if (!recent.length) { listEl.innerHTML = '<div class="empty">No commute logged</div>'; }
  else {
    listEl.innerHTML = recent.map(c => `
      <div class="commute-item exp-item">
        <span>${c.mode} · ${c.date}</span>
        <span>${c.time} min${c.cost ? ' · ₹'+c.cost : ''}</span>
      </div>`).join('');
  }
  if (statsEl) {
    const m = thisMonth();
    const monthLog = state.commuteLog.filter(c => c.date.startsWith(m));
    const avgTime = monthLog.length ? (monthLog.reduce((s, c) => s + c.time, 0) / monthLog.length).toFixed(1) : 0;
    const totalCost = monthLog.reduce((s, c) => s + c.cost, 0);
    statsEl.innerHTML = `<span>Avg: <strong>${avgTime} min</strong></span> <span>This month: <strong>₹${totalCost.toFixed(0)}</strong></span>`;
  }
}

// ── READING ──────────────────────────────────────────────────────
function addReading() {
  const title = v('read-title');
  const type = getSelectedChip('read-type-chips', 'type') || 'Book';
  const status = v('read-status') || 'planned';
  if (!title) return;
  state.readingList.push({ id: uid(), title, type, status });
  saveKey('readingList');
  closeModal('modal-reading');
  clearInputs(['read-title', 'read-status']);
  renderReading();
}

function cycleReading(id) {
  const r = state.readingList.find(x => x.id === id);
  if (!r) return;
  const statuses = ['planned', 'reading', 'done'];
  r.status = statuses[(statuses.indexOf(r.status) + 1) % statuses.length];
  saveKey('readingList'); renderReading();
}

function deleteReading(id) {
  state.readingList = state.readingList.filter(x => x.id !== id);
  saveKey('readingList'); renderReading();
}

function renderReading() {
  const el = document.getElementById('reading-list');
  if (!el) return;
  if (!state.readingList.length) { el.innerHTML = '<div class="empty">No reading list items</div>'; return; }
  el.innerHTML = state.readingList.map(r => {
    const statusColor = r.status === 'done' ? 'var(--success)' : r.status === 'reading' ? 'var(--warning)' : 'var(--text-muted)';
    return `<div class="read-item assign-item">
      <div>
        <strong>${r.title}</strong>
        <span class="chip" style="margin-left:6px">${r.type}</span>
        <span class="chip" style="cursor:pointer;background:${statusColor};color:#fff;margin-left:4px" onclick="cycleReading('${r.id}')">${r.status}</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteReading('${r.id}')">✕</button>
    </div>`;
  }).join('');
}

// ── CLUBS ────────────────────────────────────────────────────────
function addClub() {
  const name = v('club-name'); const role = v('club-role');
  if (!name) return;
  state.clubs.push({ id: uid(), name, role });
  saveKey('clubs');
  closeModal('modal-club');
  clearInputs(['club-name', 'club-role']);
  renderClubs();
}

function deleteClub(id) {
  state.clubs = state.clubs.filter(x => x.id !== id);
  saveKey('clubs'); renderClubs();
}

function renderClubs() {
  const el = document.getElementById('clubs-list');
  if (!el) return;
  if (!state.clubs.length) { el.innerHTML = '<div class="empty">No clubs added</div>'; return; }
  el.innerHTML = state.clubs.map(c => `
    <div class="club-item assign-item">
      <div><strong>${c.name}</strong>${c.role ? ' <small>— '+c.role+'</small>' : ''}</div>
      <button class="btn btn-sm btn-danger" onclick="deleteClub('${c.id}')">✕</button>
    </div>`).join('');
}

// ── EVENTS ───────────────────────────────────────────────────────
function addEvent() {
  const name = v('event-name'); const date = v('event-date'); const desc = v('event-desc');
  if (!name || !date) return;
  state.events.push({ id: uid(), name, date, desc });
  saveKey('events');
  closeModal('modal-event');
  clearInputs(['event-name', 'event-date', 'event-desc']);
  renderEvents();
}

function deleteEvent(id) {
  state.events = state.events.filter(x => x.id !== id);
  saveKey('events'); renderEvents();
}

function renderEvents() {
  const el = document.getElementById('events-list');
  if (!el) return;
  if (!state.events.length) { el.innerHTML = '<div class="empty">No events added</div>'; return; }
  const sorted = [...state.events].sort((a, b) => new Date(a.date) - new Date(b.date));
  el.innerHTML = sorted.map(e => {
    const d = daysUntil(e.date);
    const color = d < 0 ? 'var(--text-muted)' : d <= 3 ? 'var(--danger)' : 'var(--primary)';
    return `<div class="assign-item" style="border-left:3px solid ${color}">
      <div>
        <strong>${e.name}</strong>
        <div style="font-size:12px;color:var(--text-muted)">${e.date}${e.desc ? ' · '+e.desc : ''}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">✕</button>
    </div>`;
  }).join('');
}

// ── TIMETABLE ────────────────────────────────────────────────────
function renderTimetable() {
  const el = document.getElementById('timetable-grid');
  if (!el) return;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18

  let html = '<div class="tt-grid">';
  // Header row
  html += '<div class="tt-time"></div>';
  days.forEach(d => { html += `<div class="tt-head">${d.slice(0, 3)}</div>`; });

  // Time rows
  hours.forEach(h => {
    html += `<div class="tt-time">${String(h).padStart(2,'0')}:00</div>`;
    days.forEach(d => {
      const cls = state.classes.find(c => c.day === d && c.time && parseInt(c.time.split(':')[0]) === h);
      html += `<div class="tt-cell">${cls ? '<span class="tt-cell-text">'+cls.name+'</span>' : ''}</div>`;
    });
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── RENDER ALL ───────────────────────────────────────────────────
function renderAll() {
  renderGreeting();
  renderMood();
  renderClasses();
  renderAssignments();
  renderDueSoon();
  renderAttendance();
  renderNotes();
  renderMarks();
  renderPomo();
  updatePomoDisplay();
  renderSkills();
  renderCerts();
  renderCareerGoals();
  renderLCProblems();
  renderProjects();
  renderResumeBullets();
  renderMoney();
  renderBudgetSnapshot();
  renderTasks();
  renderHabits();
  renderSleep();
  renderCommute();
  renderReading();
  renderClubs();
  renderEvents();
  renderTimetable();
}

// ── UTILS ────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() { return new Date().toISOString().slice(0, 10); }
function thisMonth() { return new Date().toISOString().slice(0, 7); }
function thisMonthTx() { const m = thisMonth(); return state.expenses.transactions.filter(t => t.date.startsWith(m)); }
function v(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function clearInputs(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  applyDark();

  // Setup all chip containers
  setupChips('exp-cat-chips', 'cat');
  setupChips('exp-mode-chips', 'mode');
  setupChips('lc-diff-chips', 'diff');
  setupChips('commute-mode-chips', 'mode');
  setupChips('read-type-chips', 'type');

  // Budget modal: pre-fill current budget
  const budgetModal = document.getElementById('modal-budget');
  if (budgetModal) {
    const observer = new MutationObserver(() => {
      if (budgetModal.classList.contains('open')) {
        const inp = document.getElementById('budget-input');
        if (inp) inp.value = state.expenses.budget;
      }
    });
    observer.observe(budgetModal, { attributes: true, attributeFilter: ['class'] });
  }

  renderAll();
  showPage('dashboard');
});
