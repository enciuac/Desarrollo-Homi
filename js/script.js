const STATUSES = ['Completado', 'Progreso', 'Revisado', 'Pendiente', 'Arrastrada'];
const PRIORITIES = ['Alta', 'Media', 'Baja'];
const STATUS_CLASS = {
  Completado: 'green',
  Progreso: 'blue',
  Revisado: 'purple',
  Pendiente: 'amber',
  Arrastrada: 'orange'
};
const PRIORITY_CLASS = {
  Alta: 'priority-alta',
  Media: 'priority-media',
  Baja: 'priority-baja'
};
const ROADMAP_DEFAULT_STATUSES = ['Arrastrada', 'Pendiente', 'Progreso'];

const state = {
  months: [],
  tasks: [],
  activeMonthId: null,
  status: 'Todos',
  priority: 'Todas',
  area: 'Todas',
  query: '',
  roadmapExpanded: false,
  roadmapStatus: 'Todos',
  roadmapPriority: 'Todas',
  roadmapArea: 'Todas',
  roadmapQuery: '',
  isAdmin: false,
  editingTaskId: null,
  editingMonthId: undefined,
  usingFallback: true,
  lastUpdatedLabel: ''
};

function statusBadge(status) {
  const klass = STATUS_CLASS[status] || 'neutral';
  return `<span class="badge ${klass}">${status}</span>`;
}

function priorityBadge(priority) {
  const klass = PRIORITY_CLASS[priority] || 'neutral';
  return `<span class="badge ${klass}">${priority}</span>`;
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
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter(ch => {
      const code = ch.codePointAt(0);
      return code < 0x300 || code > 0x36f;
    })
    .join('');
}

function tasksForMonth(monthId) {
  return state.tasks.filter(task => task.monthId === monthId);
}

function getActiveMonth() {
  return state.months.find(month => month.id === state.activeMonthId) || state.months[0] || null;
}

function findTask(taskId) {
  return state.tasks.find(task => task.id === taskId) || null;
}

function findMonth(monthId) {
  return state.months.find(month => month.id === monthId) || null;
}

function distinctAreas(tasks) {
  return [...new Set(tasks.map(task => task.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
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
        : 'Sin tareas todavia';
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
  state.months = HOMI_LOG.months.map((month, index) => ({
    id: month.id,
    title: month.name,
    sortOrder: index,
    summary: month.summary || ''
  }));
  state.tasks = HOMI_LOG.months.flatMap(month => month.tasks.map((task, index) => ({
    id: task.id,
    monthId: month.id,
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
    text.textContent = 'Supabase no configurado. Usando datos locales de ejemplo (solo lectura). Configura js/supabase-config.js para activar la edicion y el guardado automatico.';
  }
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
  const month = getActiveMonth();
  const monthTasks = month ? tasksForMonth(month.id) : [];

  document.getElementById('statusFilters').innerHTML = ['Todos', ...STATUSES].map(status => (
    `<button class="filter-btn ${state.status === status ? 'active' : ''}" data-status="${status}" type="button">${status}</button>`
  )).join('');
  document.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => {
      state.status = button.dataset.status;
      renderTasks();
      renderFilters();
    });
  });

  document.getElementById('priorityFilters').innerHTML = ['Todas', ...PRIORITIES].map(priority => (
    `<button class="filter-btn ${state.priority === priority ? 'active' : ''}" data-priority="${priority}" type="button">${priority}</button>`
  )).join('');
  document.querySelectorAll('[data-priority]').forEach(button => {
    button.addEventListener('click', () => {
      state.priority = button.dataset.priority;
      renderTasks();
      renderFilters();
    });
  });

  const areas = distinctAreas(monthTasks);
  const areaGroup = document.getElementById('areaFilterGroup');
  areaGroup.hidden = areas.length === 0;
  if (areas.length) {
    document.getElementById('areaFilters').innerHTML = ['Todas', ...areas].map(area => (
      `<button class="filter-btn ${state.area === area ? 'active' : ''}" data-area="${area}" type="button">${area}</button>`
    )).join('');
    document.querySelectorAll('[data-area]').forEach(button => {
      button.addEventListener('click', () => {
        state.area = button.dataset.area;
        renderTasks();
        renderFilters();
      });
    });
  }
}

function renderRoadmapFilters() {
  document.getElementById('roadmapFilters').innerHTML = ['Todos', ...STATUSES].map(status => (
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

  document.getElementById('roadmapPriorityFilters').innerHTML = ['Todas', ...PRIORITIES].map(priority => (
    `<button class="filter-btn ${state.roadmapPriority === priority ? 'active' : ''}" data-roadmap-priority="${priority}" type="button">${priority}</button>`
  )).join('');
  document.querySelectorAll('[data-roadmap-priority]').forEach(button => {
    button.addEventListener('click', () => {
      state.roadmapPriority = button.dataset.roadmapPriority;
      state.roadmapExpanded = true;
      renderRoadmap();
      renderRoadmapFilters();
    });
  });

  const areas = distinctAreas(roadmapBaseTasks());
  const areaGroup = document.getElementById('roadmapAreaFilterGroup');
  areaGroup.hidden = areas.length === 0;
  if (areas.length) {
    document.getElementById('roadmapAreaFilters').innerHTML = ['Todas', ...areas].map(area => (
      `<button class="filter-btn ${state.roadmapArea === area ? 'active' : ''}" data-roadmap-area="${area}" type="button">${area}</button>`
    )).join('');
    document.querySelectorAll('[data-roadmap-area]').forEach(button => {
      button.addEventListener('click', () => {
        state.roadmapArea = button.dataset.roadmapArea;
        state.roadmapExpanded = true;
        renderRoadmap();
        renderRoadmapFilters();
      });
    });
  }
}

function renderMonthTabs() {
  const container = document.getElementById('monthTabs');
  const sorted = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);

  if (!sorted.length) {
    container.innerHTML = '<span class="month-tabs-empty">Todavia no hay meses. Crea el primero con "Anadir mes".</span>';
    return;
  }

  container.innerHTML = sorted.map(month => `
    <span class="month-tab-group">
      <button class="month-tab ${state.activeMonthId === month.id ? 'active' : ''}" type="button" data-month-id="${month.id}">${month.title}</button>
      ${state.isAdmin ? `<button class="month-tab-edit" type="button" data-edit-month="${month.id}" aria-label="Editar mes ${month.title}">&#9998;</button>` : ''}
    </span>
  `).join('');

  container.querySelectorAll('[data-month-id]').forEach(button => {
    button.addEventListener('click', () => {
      state.activeMonthId = button.dataset.monthId;
      state.status = 'Todos';
      state.priority = 'Todas';
      state.area = 'Todas';
      state.query = '';
      const search = document.getElementById('searchInput');
      if (search) search.value = '';
      render();
    });
  });

  container.querySelectorAll('[data-edit-month]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      openMonthEditor(button.dataset.editMonth);
    });
  });
}

function renderActiveMonth() {
  const month = getActiveMonth();
  const tasks = month ? tasksForMonth(month.id) : [];
  const counts = countByStatus(tasks);
  const percent = completionPercent(tasks);

  document.getElementById('activeMonthTitle').textContent = month ? month.title : 'Sin meses todavia';

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

function filteredTasks(tasks, filters) {
  const query = normalized(filters.query);
  return tasks.filter(task => {
    const matchesStatus = filters.status === 'Todos' || task.status === filters.status;
    const matchesPriority = filters.priority === 'Todas' || task.priority === filters.priority;
    const matchesArea = filters.area === 'Todas' || task.area === filters.area;
    const haystack = normalized([task.title, task.description, task.area, task.priority, task.status].join(' '));
    const matchesQuery = !query || haystack.includes(query);
    return matchesStatus && matchesPriority && matchesArea && matchesQuery;
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
    task.priority ? priorityBadge(task.priority) : '',
    task.area ? `<span class="badge neutral">${task.area}</span>` : ''
  ].join('');
  const month = isRoadmap ? findMonth(task.monthId) : null;

  return `
    <article class="${isRoadmap ? 'roadmap-card' : 'task-card'}" ${isRoadmap ? '' : 'data-task-card'}>
      <button class="task-button" type="button" aria-expanded="false">
        <div class="task-top">
          ${statusBadge(task.status)}
          ${metaBadges}
        </div>
        <h3>${task.title}</h3>
        ${task.description ? `<p>${task.description}</p>` : ''}
        ${isRoadmap && month ? `<div class="task-footer"><span>${month.title}</span></div>` : ''}
      </button>
      ${!isRoadmap && task.details.length ? `<div class="task-details"><div class="task-details-inner"><ul>${task.details.map(item => `<li>${item}</li>`).join('')}</ul></div></div>` : ''}
      ${editButton}
    </article>
  `;
}

function renderTasks() {
  const month = getActiveMonth();
  const tasks = month
    ? filteredTasks(tasksForMonth(month.id), { status: state.status, priority: state.priority, area: state.area, query: state.query })
    : [];
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
  if (state.roadmapStatus === 'Todos') {
    tasks = tasks.filter(task => ROADMAP_DEFAULT_STATUSES.includes(task.status));
  }
  tasks = filteredTasks(tasks, {
    status: state.roadmapStatus,
    priority: state.roadmapPriority,
    area: state.roadmapArea,
    query: state.roadmapQuery
  });

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
        <button id="addMonthBtn" class="secondary-btn small" type="button">Añadir mes</button>
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
  if (addMonthBtn) addMonthBtn.addEventListener('click', () => openMonthEditor(null));
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

// ---------- Editor de meses ----------

function openMonthEditor(monthId) {
  if (!state.isAdmin) return;
  state.editingMonthId = monthId;
  const modal = document.getElementById('monthModal');
  const title = document.getElementById('monthEditorTitle');
  document.getElementById('monthFormError').textContent = '';

  if (monthId) {
    const month = findMonth(monthId);
    if (!month) return;
    title.textContent = 'Editar mes';
    document.getElementById('editMonthTitle').value = month.title;
    document.getElementById('editMonthSortOrder').value = month.sortOrder;
    document.getElementById('editMonthSummary').value = month.summary || '';
    document.getElementById('deleteMonthBtn').hidden = false;
  } else {
    title.textContent = 'Nuevo mes';
    document.getElementById('editMonthTitle').value = '';
    const maxOrder = state.months.length ? Math.max(...state.months.map(month => month.sortOrder)) + 1 : 0;
    document.getElementById('editMonthSortOrder').value = maxOrder;
    document.getElementById('editMonthSummary').value = '';
    document.getElementById('deleteMonthBtn').hidden = true;
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeMonthEditor() {
  const modal = document.getElementById('monthModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  state.editingMonthId = undefined;
}

async function saveMonthEditor(event) {
  event.preventDefault();
  const errorEl = document.getElementById('monthFormError');
  errorEl.textContent = '';

  if (!window.HomiSupabase || !HomiSupabase.isConfigured) {
    showToast('Configura Supabase para poder guardar cambios.', 'error');
    return;
  }

  const payload = {
    title: document.getElementById('editMonthTitle').value.trim(),
    sortOrder: Number(document.getElementById('editMonthSortOrder').value) || 0,
    summary: document.getElementById('editMonthSummary').value.trim()
  };

  if (!payload.title) {
    errorEl.textContent = 'El mes necesita un título.';
    return;
  }
  const duplicate = state.months.some(month => (
    month.title.toLowerCase() === payload.title.toLowerCase() && month.id !== state.editingMonthId
  ));
  if (duplicate) {
    errorEl.textContent = 'Ya existe un mes con ese título.';
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const wasEditing = !!state.editingMonthId;
    if (wasEditing) {
      const updated = await HomiSupabase.updateMonth(state.editingMonthId, payload);
      const index = state.months.findIndex(month => month.id === state.editingMonthId);
      if (index !== -1) state.months[index] = updated;
    } else {
      const created = await HomiSupabase.insertMonth(payload);
      state.months.push(created);
      state.activeMonthId = created.id;
    }
    closeMonthEditor();
    showToast(wasEditing ? 'Mes actualizado correctamente.' : 'Mes creado correctamente.', 'success');
    render();
  } catch (error) {
    console.error(error);
    errorEl.textContent = 'Error al guardar: ' + (error.message || error);
  } finally {
    submitBtn.disabled = false;
  }
}

async function deleteMonthEditor() {
  if (!state.editingMonthId) return closeMonthEditor();

  if (tasksForMonth(state.editingMonthId).length > 0) {
    showToast('No puedes eliminar este mes porque tiene tareas asociadas. Mueve o elimina primero esas tareas.', 'error');
    return;
  }
  if (!confirm('¿Seguro que quieres eliminar este mes? Esta acción no se puede deshacer.')) return;

  try {
    await HomiSupabase.deleteMonth(state.editingMonthId);
    state.months = state.months.filter(month => month.id !== state.editingMonthId);
    if (state.activeMonthId === state.editingMonthId) {
      const sorted = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);
      state.activeMonthId = sorted.length ? sorted[sorted.length - 1].id : null;
    }
    closeMonthEditor();
    showToast('Mes eliminado.', 'success');
    render();
  } catch (error) {
    console.error(error);
    const message = error.code === '23503'
      ? 'No puedes eliminar este mes porque tiene tareas asociadas. Mueve o elimina primero esas tareas.'
      : 'Error al eliminar el mes: ' + (error.message || error);
    showToast(message, 'error');
  }
}

// ---------- Editor de tareas ----------

function openEditor(taskId) {
  if (!state.isAdmin) return;
  if (!taskId && !state.months.length) {
    showToast('Crea primero un mes antes de añadir tareas.', 'error');
    return;
  }

  state.editingTaskId = taskId;
  const modal = document.getElementById('editorModal');
  const title = document.getElementById('editorTitle');
  const monthSelect = document.getElementById('editMonth');
  const statusSelect = document.getElementById('editStatus');

  const sortedMonths = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);
  monthSelect.innerHTML = sortedMonths.map(month => `<option value="${month.id}">${month.title}</option>`).join('');
  statusSelect.innerHTML = STATUSES.map(status => `<option value="${status}">${status}</option>`).join('');

  if (taskId) {
    const task = findTask(taskId);
    if (!task) return;
    title.textContent = 'Editar tarea';
    document.getElementById('editTaskTitle').value = task.title || '';
    document.getElementById('editStatus').value = task.status || 'Pendiente';
    document.getElementById('editMonth').value = task.monthId;
    document.getElementById('editPriority').value = task.priority || 'Media';
    document.getElementById('editArea').value = task.area || '';
    document.getElementById('editSortOrder').value = task.sortOrder ?? 0;
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editDetails').value = (task.details || []).join('\n');
    document.getElementById('editIsRoadmap').checked = !!task.isRoadmap;
    document.getElementById('deleteTaskBtn').hidden = false;
  } else {
    const defaultMonthId = state.activeMonthId || (sortedMonths[0] && sortedMonths[0].id) || '';
    title.textContent = 'Nueva tarea';
    document.getElementById('editTaskTitle').value = '';
    document.getElementById('editStatus').value = 'Pendiente';
    document.getElementById('editMonth').value = defaultMonthId;
    document.getElementById('editPriority').value = 'Media';
    document.getElementById('editArea').value = '';
    document.getElementById('editSortOrder').value = tasksForMonth(defaultMonthId).length;
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

  const monthId = document.getElementById('editMonth').value;
  const payload = {
    monthId,
    title: document.getElementById('editTaskTitle').value.trim(),
    status: document.getElementById('editStatus').value,
    priority: document.getElementById('editPriority').value,
    area: document.getElementById('editArea').value.trim(),
    sortOrder: Number(document.getElementById('editSortOrder').value) || 0,
    description: document.getElementById('editDescription').value.trim(),
    details: document.getElementById('editDetails').value.split('\n').map(item => item.trim()).filter(Boolean),
    isRoadmap: document.getElementById('editIsRoadmap').checked
  };

  if (!payload.title) {
    alert('La tarea necesita un título.');
    return;
  }
  if (!payload.monthId) {
    alert('Selecciona un mes para la tarea.');
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const wasEditing = !!state.editingTaskId;
    if (wasEditing) {
      const updated = await HomiSupabase.updateTask(state.editingTaskId, payload);
      const index = state.tasks.findIndex(task => task.id === state.editingTaskId);
      if (index !== -1) state.tasks[index] = updated;
    } else {
      const created = await HomiSupabase.insertTask(payload);
      state.tasks.push(created);
    }
    state.activeMonthId = monthId;
    closeEditor();
    showToast(wasEditing ? 'Tarea actualizada correctamente.' : 'Tarea creada correctamente.', 'success');
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
  if (!confirm('¿Seguro que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) return;

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
  document.getElementById('roadmapSearchInput').addEventListener('input', event => {
    state.roadmapQuery = event.target.value;
    renderRoadmap();
  });
  document.getElementById('clearMonthFiltersBtn').addEventListener('click', () => {
    state.status = 'Todos';
    state.priority = 'Todas';
    state.area = 'Todas';
    state.query = '';
    document.getElementById('searchInput').value = '';
    renderFilters();
    renderTasks();
  });
  document.getElementById('clearRoadmapFiltersBtn').addEventListener('click', () => {
    state.roadmapStatus = 'Todos';
    state.roadmapPriority = 'Todas';
    state.roadmapArea = 'Todas';
    state.roadmapQuery = '';
    document.getElementById('roadmapSearchInput').value = '';
    renderRoadmapFilters();
    renderRoadmap();
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

  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      closeLogin();
      closeEditor();
      closeMonthEditor();
    });
  });

  document.getElementById('editorForm').addEventListener('submit', saveEditor);
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteEditorTask);

  document.getElementById('monthForm').addEventListener('submit', saveMonthEditor);
  document.getElementById('deleteMonthBtn').addEventListener('click', deleteMonthEditor);
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

  if (!state.activeMonthId && state.months.length) {
    const sorted = [...state.months].sort((a, b) => a.sortOrder - b.sortOrder);
    state.activeMonthId = sorted[sorted.length - 1].id;
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
      render();
    });
  }
}

init();
