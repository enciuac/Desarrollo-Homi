const STATUSES = ['Completado', 'Progreso', 'Revisado', 'Pendiente', 'Arrastrada'];
const STATUS_CLASS = {
  Completado: 'green',
  Progreso: 'blue',
  Revisado: 'purple',
  Pendiente: 'amber',
  Arrastrada: 'orange'
};
const ROADMAP_DEFAULT_STATUSES = ['Arrastrada', 'Pendiente', 'Progreso'];

const state = {
  months: [],
  tasks: [],
  monthTitle: null,
  status: 'Todos',
  query: '',
  roadmapExpanded: false,
  roadmapStatus: 'Todos',
  isAdmin: false,
  editingTaskId: null,
  usingFallback: true,
  lastUpdatedLabel: ''
};

function statusBadge(status) {
  const klass = STATUS_CLASS[status] || 'neutral';
  return `<span class="badge ${klass}">${status}</span>`;
}

function statCard(label, value, subtext = '') {
  return `<article class="stat-card"><span>${label}</span><strong>${value}</strong>${subtext ? `<small>${subtext}</small>` : ''}</article>`;
}

function priorityWeight(priority) {
  return { Alta: 0, Media: 1, Baja: 2 }[priority] ?? 3;
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

function normalized(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tasksForMonth(title) {
  return state.tasks.filter(task => task.month === title);
}

function getActiveMonth() {
  return state.months.find(month => month.title === state.monthTitle) || state.months[0] || null;
}

function findTask(taskId) {
  return state.tasks.find(task => task.id === taskId) || null;
}

// ---------- Carga de datos ----------

async function loadData() {
  if (window.HomiSupabase && HomiSupabase.isConfigured) {
    try {
      const [months, tasks] = await Promise.all([HomiSupabase.fetchMonths(), HomiSupabase.fetchTasks()]);
      state.months = months;
      state.tasks = tasks;
      state.usingFallback = false;
      const latest = tasks.reduce((max, task) => (task.updatedAt && task.updatedAt > max ? task.updatedAt : max), '');
      state.lastUpdatedLabel = latest
        ? new Date(latest).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';
      return;
    } catch (error) {
      console.error('[HOMI] Error cargando datos de Supabase:', error);
      showToast('No se pudo conectar con Supabase. Mostrando datos locales de ejemplo.', 'error');
    }
  }
  loadFallbackData();
}

function loadFallbackData() {
  state.usingFallback = true;
  state.months = HOMI_LOG.months.map((month, index) => ({ id: month.id, title: month.name, sortOrder: index }));
  state.tasks = HOMI_LOG.months.flatMap(month => month.tasks.map((task, index) => ({
    id: task.id,
    month: month.name,
    title: task.title,
    description: task.description || '',
    details: task.details || [],
    status: task.status,
    priority: task.priority || 'Media',
    area: task.area || '',
    isRoadmap: task.status === 'Arrastrada',
    sortOrder: index
  })));
  state.lastUpdatedLabel = HOMI_LOG.project.lastUpdated;
}

// ---------- Render: cabecera y banner ----------

function renderProjectHeader() {
  document.getElementById('projectEyebrow').textContent = HOMI_LOG.project.eyebrow;
  document.getElementById('projectTitle').textContent = HOMI_LOG.project.title;
  document.getElementById('projectDescription').textContent = HOMI_LOG.project.description;
  document.getElementById('lastUpdated').textContent = state.lastUpdatedLabel;
  document.getElementById('sourceNote').textContent = HOMI_LOG.project.sourceNote;
}

function renderDataSourceBanner() {
  const banner = document.getElementById('dataSourceBanner');
  const text = document.getElementById('dataSourceBannerText');
  if (!banner || !text) return;
  banner.hidden = !state.usingFallback;
  if (state.usingFallback) {
    text.textContent = 'Supabase no configurado. Usando datos locales de ejemplo (solo lectura). Configura js/supabase-config.js para activar la edición y el guardado automático.';
  }
}

function sqlQuote(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function generateSeedSql() {
  const monthLines = HOMI_LOG.months.map((month, index) => (
    `insert into public.development_months (title, sort_order) values (${sqlQuote(month.name)}, ${index}) on conflict (title) do nothing;`
  ));

  const taskLines = HOMI_LOG.months.flatMap((month, mIndex) => month.tasks.map((task, tIndex) => {
    const details = (task.details || []).join('\n');
    const isRoadmap = task.status === 'Arrastrada';
    return `insert into public.development_tasks (month, title, description, details, status, priority, area, is_roadmap, sort_order) values (${sqlQuote(month.name)}, ${sqlQuote(task.title)}, ${sqlQuote(task.description)}, ${sqlQuote(details)}, ${sqlQuote(task.status)}, ${sqlQuote(task.priority || 'Media')}, ${sqlQuote(task.area || '')}, ${isRoadmap}, ${tIndex});`;
  }));

  const content = [
    '-- SQL generado desde js/data.js (datos de ejemplo de HOMI Development Log).',
    '-- Pégalo en Supabase Dashboard > SQL Editor tras crear las tablas con supabase/schema.sql.',
    '',
    '-- Meses',
    ...monthLines,
    '',
    '-- Tareas',
    ...taskLines,
    ''
  ].join('\n');

  const blob = new Blob([content], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'homi-seed-data.sql';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Render: stats, filtros, meses ----------

function renderGlobalStats() {
  const counts = countByStatus(state.tasks);
  const percent = completionPercent(state.tasks);
  document.getElementById('globalProgressLabel').textContent = `${percent}%`;
  document.getElementById('globalProgressBar').style.width = `${percent}%`;
  document.getElementById('globalStats').innerHTML = [
    statCard('Total tareas', state.tasks.length, 'Todos los meses'),
    statCard('Completadas', counts.Completado, 'Cerradas'),
    statCard('Revisadas', counts.Revisado, 'Hechas y comprobadas'),
    statCard('En progreso', counts.Progreso, 'Abiertas ahora'),
    statCard('Pendientes / arrastradas', counts.Pendiente + counts.Arrastrada, 'Siguiente bloque')
  ].join('');
}

function renderFilters() {
  const statuses = ['Todos', ...STATUSES];
  document.getElementById('statusFilters').innerHTML = statuses.map(status => (
    `<button class="filter-btn ${state.status === status ? 'active' : ''}" data-status="${status}" type="button">${status}</button>`
  )).join('');

  document.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => {
      state.status = button.dataset.status;
      renderTasks();
      renderFilters();
    });
  });
}

function renderRoadmapFilters() {
  const statuses = ['Todos', ...STATUSES];
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
  const sorted = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);
  document.getElementById('monthTabs').innerHTML = sorted.map(month => (
    `<button class="month-tab ${state.monthTitle === month.title ? 'active' : ''}" type="button" data-month="${month.title}">${month.title}</button>`
  )).join('');

  document.querySelectorAll('[data-month]').forEach(button => {
    button.addEventListener('click', () => {
      state.monthTitle = button.dataset.month;
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
  const tasks = month ? tasksForMonth(month.title) : [];
  const counts = countByStatus(tasks);
  const percent = completionPercent(tasks);

  document.getElementById('activeMonthTitle').textContent = month ? month.title : 'Sin meses todavía';

  document.getElementById('monthStats').innerHTML = [
    statCard('Avance', `${percent}%`),
    statCard('Total', tasks.length, 'Tareas del mes'),
    statCard('Completado', counts.Completado, 'Cerradas'),
    statCard('Revisado', counts.Revisado, 'Validadas'),
    statCard('Progreso', counts.Progreso, 'En marcha'),
    statCard('Pendiente/Arrastrada', counts.Pendiente + counts.Arrastrada, 'Abiertas')
  ].join('');
}

// ---------- Render: tarjetas ----------

function filteredTasks(tasks) {
  const query = normalized(state.query);
  return tasks.filter(task => {
    const matchesStatus = state.status === 'Todos' || task.status === state.status;
    const haystack = normalized([task.title, task.description, task.area, task.priority, task.status].join(' '));
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
  const metaBadges = [
    task.priority ? `<span class="badge neutral">${task.priority}</span>` : '',
    task.area ? `<span class="badge neutral">${task.area}</span>` : ''
  ].join('');

  return `
    <article class="${isRoadmap ? 'roadmap-card' : 'task-card'}" ${isRoadmap ? '' : 'data-task-card'}>
      <button class="task-button" type="button" aria-expanded="false">
        <div class="task-top">
          ${statusBadge(task.status)}
          ${metaBadges}
        </div>
        <h3>${task.title}</h3>
        ${task.description ? `<p>${task.description}</p>` : ''}
        ${isRoadmap ? `<div class="task-footer"><span>${task.month}</span></div>` : ''}
      </button>
      ${!isRoadmap && task.details.length ? `<div class="task-details"><div class="task-details-inner"><ul>${task.details.map(item => `<li>${item}</li>`).join('')}</ul></div></div>` : ''}
      ${editButton}
    </article>
  `;
}

function renderTasks() {
  const month = getActiveMonth();
  const tasks = month ? filteredTasks(tasksForMonth(month.title)) : [];
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
  return state.tasks.filter(task => task.isRoadmap);
}

function renderRoadmap() {
  let tasks = roadmapBaseTasks();
  if (state.roadmapStatus !== 'Todos') {
    tasks = tasks.filter(task => task.status === state.roadmapStatus);
  } else {
    tasks = tasks.filter(task => ROADMAP_DEFAULT_STATUSES.includes(task.status));
  }

  tasks = tasks.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  const visible = state.roadmapExpanded ? tasks : tasks.slice(0, 9);
  document.getElementById('roadmapList').innerHTML = visible.map(task => taskCard(task, true)).join('');
  document.getElementById('showAllRoadmap').textContent = state.roadmapExpanded ? 'Ver menos' : `Ver todas (${tasks.length})`;
  bindTaskCardEvents();
}

// ---------- Barra de administración / autenticación ----------

function renderAdminBar() {
  const adminBar = document.getElementById('adminBar');
  if (!adminBar) return;

  if (state.isAdmin) {
    adminBar.innerHTML = `
      <span>Modo edición activo</span>
      <span>
        <button id="addTaskBtn" class="secondary-btn small" type="button">Nueva tarea</button>
        <button id="addMonthBtn" class="secondary-btn small" type="button">Nuevo mes</button>
        <button id="logoutBtn" class="secondary-btn small" type="button">Salir</button>
      </span>`;
  } else {
    adminBar.innerHTML = `<span>Modo lectura</span><button id="loginBtn" class="secondary-btn small" type="button">Acceso privado</button>`;
  }

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', openLogin);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await HomiSupabase.signOut();
    state.isAdmin = false;
    render();
  });

  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) addTaskBtn.addEventListener('click', () => openEditor(null));

  const addMonthBtn = document.getElementById('addMonthBtn');
  if (addMonthBtn) addMonthBtn.addEventListener('click', addMonth);
}

async function addMonth() {
  const title = prompt('Nombre del nuevo mes (ej. Agosto 2026):');
  if (!title || !title.trim()) return;
  const trimmed = title.trim();
  if (state.months.some(month => month.title.toLowerCase() === trimmed.toLowerCase())) {
    showToast('Ese mes ya existe.', 'error');
    return;
  }
  const sortOrder = state.months.length ? Math.max(...state.months.map(m => m.sortOrder)) + 1 : 0;
  try {
    const created = await HomiSupabase.insertMonth(trimmed, sortOrder);
    state.months.push(created);
    state.monthTitle = created.title;
    showToast('Mes creado correctamente.', 'success');
    render();
  } catch (error) {
    console.error(error);
    showToast('Error al crear el mes: ' + (error.message || error), 'error');
  }
}

function openLogin() {
  const modal = document.getElementById('loginModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('adminEmail').focus();
}

function closeLogin() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginForm').reset();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  if (!window.HomiSupabase || !HomiSupabase.isConfigured) {
    errorEl.textContent = 'Supabase no está configurado todavía. Revisa js/supabase-config.js.';
    return;
  }

  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const submitBtn = event.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    await HomiSupabase.signIn(email, password);
    const isAdmin = await HomiSupabase.isAdminEmail(email);
    if (!isAdmin) {
      await HomiSupabase.signOut();
      errorEl.textContent = 'Tu cuenta no tiene permisos de edición.';
      return;
    }
    state.isAdmin = true;
    closeLogin();
    showToast('Sesión iniciada.', 'success');
    render();
  } catch (error) {
    errorEl.textContent = 'Email o contraseña incorrectos.';
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- Editor de tareas ----------

function openEditor(taskId) {
  if (!state.isAdmin) return;
  state.editingTaskId = taskId;
  const modal = document.getElementById('editorModal');
  const title = document.getElementById('editorTitle');
  const monthSelect = document.getElementById('editMonth');
  const statusSelect = document.getElementById('editStatus');

  const sortedMonths = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);
  monthSelect.innerHTML = sortedMonths.map(month => `<option value="${month.title}">${month.title}</option>`).join('');
  statusSelect.innerHTML = STATUSES.map(status => `<option value="${status}">${status}</option>`).join('');

  if (taskId) {
    const task = findTask(taskId);
    if (!task) return;
    title.textContent = 'Editar tarea';
    document.getElementById('editTaskTitle').value = task.title || '';
    document.getElementById('editStatus').value = task.status || 'Pendiente';
    document.getElementById('editMonth').value = task.month;
    document.getElementById('editPriority').value = task.priority || 'Media';
    document.getElementById('editArea').value = task.area || '';
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editDetails').value = (task.details || []).join('\n');
    document.getElementById('editIsRoadmap').checked = !!task.isRoadmap;
    document.getElementById('deleteTaskBtn').hidden = false;
  } else {
    title.textContent = 'Nueva tarea';
    document.getElementById('editTaskTitle').value = '';
    document.getElementById('editStatus').value = 'Pendiente';
    document.getElementById('editMonth').value = state.monthTitle || (sortedMonths[0] && sortedMonths[0].title) || '';
    document.getElementById('editPriority').value = 'Media';
    document.getElementById('editArea').value = '';
    document.getElementById('editDescription').value = '';
    document.getElementById('editDetails').value = '';
    document.getElementById('editIsRoadmap').checked = false;
    document.getElementById('deleteTaskBtn').hidden = true;
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

async function saveEditor(event) {
  event.preventDefault();

  if (!window.HomiSupabase || !HomiSupabase.isConfigured) {
    showToast('Configura Supabase para poder guardar cambios.', 'error');
    return;
  }

  const monthTitle = document.getElementById('editMonth').value;
  const payload = {
    month: monthTitle,
    title: document.getElementById('editTaskTitle').value.trim(),
    status: document.getElementById('editStatus').value,
    priority: document.getElementById('editPriority').value,
    area: document.getElementById('editArea').value.trim(),
    description: document.getElementById('editDescription').value.trim(),
    details: document.getElementById('editDetails').value.split('\n').map(item => item.trim()).filter(Boolean),
    isRoadmap: document.getElementById('editIsRoadmap').checked
  };

  if (!payload.title) {
    alert('La tarea necesita un título.');
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    if (state.editingTaskId) {
      const updated = await HomiSupabase.updateTask(state.editingTaskId, payload);
      const index = state.tasks.findIndex(task => task.id === state.editingTaskId);
      if (index !== -1) state.tasks[index] = updated;
    } else {
      payload.sortOrder = tasksForMonth(monthTitle).length;
      const created = await HomiSupabase.insertTask(payload);
      state.tasks.push(created);
    }
    state.monthTitle = monthTitle;
    closeEditor();
    showToast('Tarea guardada correctamente.', 'success');
    render();
  } catch (error) {
    console.error(error);
    showToast('Error al guardar: ' + (error.message || error), 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function deleteEditorTask() {
  if (!state.editingTaskId) return closeEditor();
  if (!confirm('¿Quieres eliminar esta tarea? Esta acción no se puede deshacer.')) return;

  try {
    await HomiSupabase.deleteTask(state.editingTaskId);
    state.tasks = state.tasks.filter(task => task.id !== state.editingTaskId);
    closeEditor();
    showToast('Tarea eliminada.', 'success');
    render();
  } catch (error) {
    console.error(error);
    showToast('Error al eliminar: ' + (error.message || error), 'error');
  }
}

// ---------- Toasts ----------

function showToast(message, type = 'info') {
  const host = document.getElementById('toastHost');
  if (!host) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// ---------- Eventos generales ----------

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
  document.getElementById('exportSeedSqlBtn').addEventListener('click', generateSeedSql);

  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      closeLogin();
      closeEditor();
    });
  });

  document.getElementById('editorForm').addEventListener('submit', saveEditor);
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteEditorTask);
}

// ---------- Render principal ----------

function render() {
  renderDataSourceBanner();
  renderGlobalStats();
  renderFilters();
  renderRoadmapFilters();
  renderMonthTabs();
  renderActiveMonth();
  renderTasks();
  renderRoadmap();
  renderAdminBar();
}

async function init() {
  const savedTheme = localStorage.getItem('homi-theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  bindEvents();
  await loadData();

  if (!state.monthTitle && state.months.length) {
    const sorted = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);
    state.monthTitle = sorted[sorted.length - 1].title;
  }

  renderProjectHeader();
  render();

  if (window.HomiSupabase && HomiSupabase.isConfigured) {
    const session = await HomiSupabase.getSession();
    if (session) {
      state.isAdmin = await HomiSupabase.isAdminEmail(session.user.email);
      render();
    }
    HomiSupabase.onAuthStateChange(async session => {
      state.isAdmin = session ? await HomiSupabase.isAdminEmail(session.user.email) : false;
      renderAdminBar();
      renderTasks();
      renderRoadmap();
    });
  }
}

init();
