const STORAGE_KEY = 'homi-development-log-data-v2';
const ADMIN_KEY = 'homi-development-log-admin';
const PASSWORD_HASH = 'bb573a0c76b875b506e711f7f1a70fbe0119d6af95334de3710563f41a3e1714';

const state = {
  monthId: HOMI_LOG.months[HOMI_LOG.months.length - 1].id,
  status: 'Todos',
  query: '',
  roadmapExpanded: false,
  roadmapStatus: 'Todos',
  isAdmin: sessionStorage.getItem(ADMIN_KEY) === 'true',
  editingTaskId: null
};

let WORK_LOG = loadWorkLog();
let statusMap = getStatusMap();

const statusClass = {
  Completado: 'green',
  Progreso: 'blue',
  Revisado: 'purple',
  Pendiente: 'amber',
  Arrastrada: 'orange'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadWorkLog() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : clone(HOMI_LOG);
  } catch (error) {
    console.warn('No se pudo cargar el log guardado. Se usa la version base.', error);
    return clone(HOMI_LOG);
  }
}

function saveWorkLog() {
  WORK_LOG.project.lastUpdated = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(WORK_LOG));
  statusMap = getStatusMap();
  renderProjectHeader();
  render();
}

function getStatusMap() {
  return Object.fromEntries(WORK_LOG.statuses.map(status => [status.key, status]));
}

function allTasks() {
  return WORK_LOG.months.flatMap(month => month.tasks.map(task => ({ ...task, monthId: month.id, monthName: month.name })));
}

function getActiveMonth() {
  return WORK_LOG.months.find(month => month.id === state.monthId) || WORK_LOG.months[0];
}

function findTask(taskId) {
  for (const month of WORK_LOG.months) {
    const index = month.tasks.findIndex(task => task.id === taskId);
    if (index !== -1) return { task: month.tasks[index], month, index };
  }
  return null;
}

function countByStatus(tasks) {
  const counts = { Completado: 0, Progreso: 0, Revisado: 0, Pendiente: 0, Arrastrada: 0 };
  tasks.forEach(task => { counts[task.status] = (counts[task.status] || 0) + 1; });
  return counts;
}

function completionPercent(tasks) {
  if (!tasks.length) return 0;
  const done = tasks.filter(task => ['Completado', 'Revisado'].includes(task.status)).length;
  return Math.round((done / tasks.length) * 100);
}

function priorityWeight(priority) {
  return { Alta: 0, Media: 1, Baja: 2 }[priority] ?? 3;
}

function statusBadge(status) {
  const meta = statusMap[status] || { label: status };
  const klass = statusClass[status] || 'neutral';
  return `<span class="badge ${klass}">${meta.label}</span>`;
}

function statCard(label, value, subtext = '') {
  return `<article class="stat-card"><span>${label}</span><strong>${value}</strong>${subtext ? `<small>${subtext}</small>` : ''}</article>`;
}

function renderProjectHeader() {
  document.getElementById('projectEyebrow').textContent = WORK_LOG.project.eyebrow;
  document.getElementById('projectTitle').textContent = WORK_LOG.project.title;
  document.getElementById('projectDescription').textContent = WORK_LOG.project.description;
  document.getElementById('lastUpdated').textContent = WORK_LOG.project.lastUpdated;
  document.getElementById('sourceNote').textContent = WORK_LOG.project.sourceNote;
}

function renderGlobalStats() {
  const tasks = allTasks();
  const counts = countByStatus(tasks);
  const percent = completionPercent(tasks);
  document.getElementById('globalProgressLabel').textContent = `${percent}%`;
  document.getElementById('globalProgressBar').style.width = `${percent}%`;
  document.getElementById('globalStats').innerHTML = [
    statCard('Total tareas', tasks.length, 'Mayo - Julio 2026'),
    statCard('Completadas', counts.Completado, 'Cerradas'),
    statCard('Revisadas', counts.Revisado, 'Hechas y comprobadas'),
    statCard('En progreso', counts.Progreso, 'Abiertas ahora'),
    statCard('Pendientes / arrastradas', counts.Pendiente + counts.Arrastrada, 'Siguiente bloque')
  ].join('');
}

function renderFilters() {
  const statuses = ['Todos', ...WORK_LOG.statuses.map(status => status.key)];
  document.getElementById('statusFilters').innerHTML = statuses.map(status => (
    `<button class="filter-btn ${state.status === status ? 'active' : ''}" data-status="${status}" type="button">${status}</button>`
  )).join('');

  document.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => {
      state.status = button.dataset.status;
      render();
    });
  });
}

function renderRoadmapFilters() {
  const statuses = ['Todos', 'Progreso', 'Pendiente', 'Arrastrada', 'Revisado', 'Completado'];
  const holder = document.getElementById('roadmapFilters');
  if (!holder) return;
  holder.innerHTML = statuses.map(status => (
    `<button class="filter-btn ${state.roadmapStatus === status ? 'active' : ''}" data-roadmap-status="${status}" type="button">${status}</button>`
  )).join('');

  document.querySelectorAll('[data-roadmap-status]').forEach(button => {
    button.addEventListener('click', () => {
      state.roadmapStatus = button.dataset.roadmapStatus;
      state.roadmapExpanded = true;
      renderRoadmap();
      renderRoadmapFilters();
    });
  });
}

function renderMonthTabs() {
  document.getElementById('monthTabs').innerHTML = WORK_LOG.months.map(month => (
    `<button class="month-tab ${state.monthId === month.id ? 'active' : ''}" type="button" data-month="${month.id}">${month.name}</button>`
  )).join('');

  document.querySelectorAll('[data-month]').forEach(button => {
    button.addEventListener('click', () => {
      state.monthId = button.dataset.month;
      state.status = 'Todos';
      state.query = '';
      const search = document.getElementById('searchInput');
      if (search) search.value = '';
      render();
    });
  });
}

function renderActiveMonth() {
  const month = getActiveMonth();
  const counts = countByStatus(month.tasks);
  const percent = completionPercent(month.tasks);

  document.getElementById('activeMonthTitle').textContent = month.name;

  document.getElementById('monthStats').innerHTML = [
    statCard('Avance', `${percent}%`),
    statCard('Total', month.tasks.length, 'Tareas del mes'),
    statCard('Completado', counts.Completado, 'Cerradas'),
    statCard('Revisado', counts.Revisado, 'Validadas'),
    statCard('Progreso', counts.Progreso, 'En marcha'),
    statCard('Pendiente/Arrastrada', counts.Pendiente + counts.Arrastrada, 'Abiertas')
  ].join('');
}

function normalized(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function filteredTasks(tasks) {
  const query = normalized(state.query);
  return tasks.filter(task => {
    const matchesStatus = state.status === 'Todos' || task.status === state.status;
    const haystack = normalized([task.title, task.description, task.area, task.priority, task.origin, task.status].join(' '));
    const matchesQuery = !query || haystack.includes(query);
    return matchesStatus && matchesQuery;
  }).sort((a, b) => {
    if (a.status === 'Arrastrada' && b.status !== 'Arrastrada') return -1;
    if (a.status !== 'Arrastrada' && b.status === 'Arrastrada') return 1;
    return priorityWeight(a.priority) - priorityWeight(b.priority);
  });
}

function taskCard(task, isRoadmap = false) {
  const editButton = state.isAdmin
    ? `<button class="edit-task-btn" type="button" data-edit-task="${task.id}">Editar</button>`
    : '';

  return `
    <article class="${isRoadmap ? 'roadmap-card' : 'task-card'}" ${isRoadmap ? '' : 'data-task-card'}>
      <button class="task-button" type="button" aria-expanded="false">
        <div class="task-top">
          ${statusBadge(task.status)}
          <span class="badge neutral">${task.priority}</span>
          <span class="badge neutral">${task.area}</span>
        </div>
        <h3>${task.title}</h3>
        <p>${task.description}</p>
        <div class="task-footer">
          <span>${task.monthName || task.origin}</span>
          <span>·</span>
          <span>${task.id.toUpperCase()}</span>
        </div>
      </button>
      ${!isRoadmap ? `<div class="task-details"><div class="task-details-inner"><ul>${(task.details || []).map(item => `<li>${item}</li>`).join('')}</ul></div></div>` : ''}
      ${editButton}
    </article>
  `;
}

function renderTasks() {
  const month = getActiveMonth();
  const tasks = filteredTasks(month.tasks).map(task => ({ ...task, monthName: month.name }));
  const list = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');

  empty.hidden = tasks.length !== 0;
  list.innerHTML = tasks.map(task => taskCard(task)).join('');
  bindTaskCardEvents();
}

function bindTaskCardEvents() {
  document.querySelectorAll('[data-task-card]').forEach(card => {
    const button = card.querySelector('.task-button');
    button.addEventListener('click', event => {
      if (event.target.closest('[data-edit-task]')) return;
      const isOpen = card.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });
  document.querySelectorAll('[data-edit-task]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      openEditor(button.dataset.editTask);
    });
  });
}

function roadmapBaseTasks() {
  return allTasks().filter(task => ['Arrastrada', 'Pendiente', 'Progreso', 'Revisado', 'Completado'].includes(task.status));
}

function renderRoadmap() {
  let tasks = roadmapBaseTasks();
  if (state.roadmapStatus !== 'Todos') {
    tasks = tasks.filter(task => task.status === state.roadmapStatus);
  } else {
    tasks = tasks.filter(task => ['Arrastrada', 'Pendiente', 'Progreso'].includes(task.status));
  }

  tasks = tasks.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  const visible = state.roadmapExpanded ? tasks : tasks.slice(0, 9);
  document.getElementById('roadmapList').innerHTML = visible.map(task => taskCard(task, true)).join('');
  document.getElementById('showAllRoadmap').textContent = state.roadmapExpanded ? 'Ver menos' : `Ver todas (${tasks.length})`;
  bindTaskCardEvents();
}

function renderAdminBar() {
  const adminBar = document.getElementById('adminBar');
  if (!adminBar) return;
  adminBar.innerHTML = state.isAdmin
    ? `<span>Modo edicion activo</span><button id="addTaskBtn" class="secondary-btn small" type="button">Nueva tarea</button><button id="exportBtn" class="secondary-btn small" type="button">Exportar data.js</button><button id="resetBtn" class="secondary-btn small danger" type="button">Reset local</button><button id="logoutBtn" class="secondary-btn small" type="button">Salir</button>`
    : `<span>Modo lectura</span><button id="loginBtn" class="secondary-btn small" type="button">Acceso privado</button>`;

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', openLogin);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    state.isAdmin = false;
    sessionStorage.removeItem(ADMIN_KEY);
    render();
  });

  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) addTaskBtn.addEventListener('click', () => openEditor(null));

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm('Esto borrara tus cambios guardados en este navegador y volvera a la version base.')) return;
    localStorage.removeItem(STORAGE_KEY);
    WORK_LOG = clone(HOMI_LOG);
    renderProjectHeader();
    render();
  });

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportDataFile);
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function openLogin() {
  const modal = document.getElementById('loginModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('adminPassword').focus();
}

function closeLogin() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('loginError').textContent = '';
  document.getElementById('adminPassword').value = '';
}

function openEditor(taskId) {
  if (!state.isAdmin) return;
  state.editingTaskId = taskId;
  const modal = document.getElementById('editorModal');
  const title = document.getElementById('editorTitle');
  const monthSelect = document.getElementById('editMonth');
  const statusSelect = document.getElementById('editStatus');

  monthSelect.innerHTML = WORK_LOG.months.map(month => `<option value="${month.id}">${month.name}</option>`).join('');
  statusSelect.innerHTML = WORK_LOG.statuses.map(status => `<option value="${status.key}">${status.label}</option>`).join('');

  if (taskId) {
    const found = findTask(taskId);
    if (!found) return;
    title.textContent = 'Editar tarea';
    document.getElementById('editTaskTitle').value = found.task.title || '';
    document.getElementById('editStatus').value = found.task.status || 'Pendiente';
    document.getElementById('editMonth').value = found.month.id;
    document.getElementById('editPriority').value = found.task.priority || 'Media';
    document.getElementById('editArea').value = found.task.area || '';
    document.getElementById('editDescription').value = found.task.description || '';
    document.getElementById('editDetails').value = (found.task.details || []).join('\n');
  } else {
    title.textContent = 'Nueva tarea';
    document.getElementById('editTaskTitle').value = '';
    document.getElementById('editStatus').value = 'Pendiente';
    document.getElementById('editMonth').value = state.monthId;
    document.getElementById('editPriority').value = 'Media';
    document.getElementById('editArea').value = '';
    document.getElementById('editDescription').value = '';
    document.getElementById('editDetails').value = '';
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeEditor() {
  const modal = document.getElementById('editorModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  state.editingTaskId = null;
}

function saveEditor() {
  const targetMonthId = document.getElementById('editMonth').value;
  const targetMonth = WORK_LOG.months.find(month => month.id === targetMonthId);
  if (!targetMonth) return;

  const payload = {
    title: document.getElementById('editTaskTitle').value.trim(),
    status: document.getElementById('editStatus').value,
    priority: document.getElementById('editPriority').value,
    area: document.getElementById('editArea').value.trim() || 'General',
    description: document.getElementById('editDescription').value.trim(),
    details: document.getElementById('editDetails').value.split('\n').map(item => item.trim()).filter(Boolean),
    origin: targetMonth.name
  };

  if (!payload.title) {
    alert('La tarea necesita un titulo.');
    return;
  }

  if (state.editingTaskId) {
    const found = findTask(state.editingTaskId);
    if (!found) return;
    const updated = { ...found.task, ...payload };
    found.month.tasks.splice(found.index, 1);
    targetMonth.tasks.push(updated);
  } else {
    const safeMonth = targetMonth.id.slice(0, 3);
    const id = `${safeMonth}-${Date.now().toString(36)}`;
    targetMonth.tasks.push({ id, ...payload });
  }

  state.monthId = targetMonthId;
  closeEditor();
  saveWorkLog();
}

function deleteEditorTask() {
  if (!state.editingTaskId) return closeEditor();
  if (!confirm('Quieres eliminar esta tarea?')) return;
  const found = findTask(state.editingTaskId);
  if (found) found.month.tasks.splice(found.index, 1);
  closeEditor();
  saveWorkLog();
}

function exportDataFile() {
  const content = `const HOMI_LOG = ${JSON.stringify(WORK_LOG, null, 2)};\n`;
  const blob = new Blob([content], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.js';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', event => {
    state.query = event.target.value;
    renderTasks();
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('homi-theme', next);
  });
  document.getElementById('showAllRoadmap').addEventListener('click', () => {
    state.roadmapExpanded = !state.roadmapExpanded;
    renderRoadmap();
  });

  document.getElementById('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value;
    const hash = await hashText(password);
    if (hash === PASSWORD_HASH) {
      state.isAdmin = true;
      sessionStorage.setItem(ADMIN_KEY, 'true');
      closeLogin();
      render();
    } else {
      document.getElementById('loginError').textContent = 'Contraseña incorrecta.';
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      closeLogin();
      closeEditor();
    });
  });

  document.getElementById('editorForm').addEventListener('submit', event => {
    event.preventDefault();
    saveEditor();
  });
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteEditorTask);
}

function render() {
  renderGlobalStats();
  renderFilters();
  renderRoadmapFilters();
  renderMonthTabs();
  renderActiveMonth();
  renderTasks();
  renderRoadmap();
  renderAdminBar();
}

function init() {
  const savedTheme = localStorage.getItem('homi-theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  renderProjectHeader();
  bindEvents();
  render();
}

init();
