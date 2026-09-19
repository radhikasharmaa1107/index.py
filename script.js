const STORAGE_KEY = 'focusflow-planner-v1';
const state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { subjects: [], examDate: '', tasks: {}, generated: false };
const $ = id => document.getElementById(id);
const today = new Date(); today.setHours(0, 0, 0, 0);

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function dateKey(date) { return date.toISOString().slice(0, 10); }
function formatDate(value, options = { month: 'short', day: 'numeric' }) { return value ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, options) : '—'; }
function daysLeft() { if (!state.examDate) return null; return Math.max(0, Math.ceil((new Date(state.examDate + 'T00:00:00') - today) / 86400000)); }
function escapeHTML(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function renderSubjects() {
  const list = $('subjectList');
  if (!state.subjects.length) { list.innerHTML = '<div class="empty-state">Add your subjects above to get started.</div>'; return; }
  list.innerHTML = state.subjects.map((subject, index) => `<div class="subject-item"><i class="subject-dot"></i><b>${escapeHTML(subject.name)}</b><span class="difficulty ${subject.difficulty}">${subject.difficulty[0].toUpperCase() + subject.difficulty.slice(1)}</span><button class="delete-subject" data-index="${index}" aria-label="Delete ${escapeHTML(subject.name)}">×</button></div>`).join('');
  document.querySelectorAll('.delete-subject').forEach(button => button.addEventListener('click', () => { state.subjects.splice(Number(button.dataset.index), 1); state.generated = false; save(); render(); }));
}
function generateTasks() {
  if (!state.subjects.length || !state.examDate) return;
  state.tasks = {};
  const end = new Date(state.examDate + 'T00:00:00');
  const available = Math.max(1, Math.ceil((end - today) / 86400000));
  const slots = [['10:00 AM', '11:00 AM'], ['2:00 PM', '3:00 PM'], ['6:00 PM', '7:00 PM']];
  for (let day = 0; day < available; day++) {
    const date = new Date(today); date.setDate(today.getDate() + day); const key = dateKey(date);
    state.tasks[key] = state.subjects.map((subject, i) => ({ id: `${key}-${i}`, subject: subject.name, time: slots[i % slots.length], completed: false }));
  }
  state.generated = true; save();
}
function renderTimetable() {
  const key = dateKey(today), tasks = state.tasks[key] || [];
  const done = tasks.filter(task => task.completed).length;
  $('taskCount').textContent = `${done} of ${tasks.length} complete`;
  $('todayPercent').textContent = `${tasks.length ? Math.round(done / tasks.length * 100) : 0}%`;
  $('todayProgressBar').style.width = `${tasks.length ? done / tasks.length * 100 : 0}%`;
  if (!tasks.length) { $('timetable').innerHTML = '<div class="empty-plan"><span>✧</span><b>Your plan is waiting</b><p>Add subjects and an exam date, then generate your personalized timetable.</p></div>'; return; }
  $('timetable').innerHTML = tasks.map((task, index) => `<div class="task ${task.completed ? 'completed' : ''}"><input class="task-check" type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''} aria-label="Complete ${escapeHTML(task.subject)}"><div class="task-info"><b>${escapeHTML(task.subject)}</b><small>${state.subjects.find(s => s.name === task.subject)?.difficulty || 'Study'} focus session</small></div><span class="task-time">${task.time} ${index === 0 ? '·' : ''}</span></div>`).join('');
  document.querySelectorAll('.task-check').forEach(check => check.addEventListener('change', () => { tasks[Number(check.dataset.index)].completed = check.checked; save(); renderTimetable(); renderStats(); }));
}
function renderStats() {
  const remaining = daysLeft(); $('daysRemaining').textContent = remaining === null ? '—' : remaining;
  $('examLabel').textContent = state.examDate ? `Exam · ${formatDate(state.examDate)}` : 'Set an exam date';
  $('examDate').value = state.examDate;
  const allTasks = Object.values(state.tasks).flat(), complete = allTasks.filter(task => task.completed).length;
  $('overallProgress').textContent = `${allTasks.length ? Math.round(complete / allTasks.length * 100) : 0}%`;
  const completedDays = Object.values(state.tasks).filter(tasks => tasks.length && tasks.every(task => task.completed)).length;
  $('studyStreak').textContent = `${completedDays} day${completedDays === 1 ? '' : 's'}`;
}
function render() { renderSubjects(); renderTimetable(); renderStats(); $('todayDate').textContent = today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
$('subjectForm').addEventListener('submit', event => { event.preventDefault(); const name = $('subjectName').value.trim(); if (!name || state.subjects.some(subject => subject.name.toLowerCase() === name.toLowerCase())) return; state.subjects.push({ name, difficulty: $('difficulty').value }); $('subjectName').value = ''; state.generated = false; save(); render(); });
$('examDate').addEventListener('change', event => { state.examDate = event.target.value; state.generated = false; save(); renderStats(); });
$('generatePlan').addEventListener('click', () => { if (!state.subjects.length || !state.examDate) { alert('Please add at least one subject and choose your exam date.'); return; } generateTasks(); render(); $('today').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
$('clearData').addEventListener('click', () => { if (confirm('Reset all subjects and progress?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } });
$('mobileMenu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
$('examDate').min = dateKey(today); render();
