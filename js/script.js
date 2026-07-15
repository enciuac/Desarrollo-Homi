const STATUSES = ['Completado', 'Progreso', 'Revisado', 'Pendiente', 'Arrastrada'];
const PRIORITIES = ['Máxima', 'Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja'];
const STATUS_CLASS = {
  Completado: 'green',
  Progreso: 'blue',
  Revisado: 'purple',
  Pendiente: 'amber',
  Arrastrada: 'orange'
};
const PRIORITY_CLASS = {
  'Máxima': 'priority-maxima',
  Alta: 'priority-alta',
  'Media-alta': 'priority-media-alta',
  Media: 'priority-media',
  'Media-baja': 'priority-media-baja',
  Baja: 'priority-baja'
};
const PRIORITY_WEIGHT = {
  'Máxima': 0,
  Alta: 1,
  'Media-alta': 2,
  Media: 3,
  'Media-baja': 4,
  Baja: 5
};
const ROADMAP_DEFAULT_STATUSES = ['Arrastrada', 'Pendiente', 'Progreso'];

const LOCK_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';
const LOCK_OPEN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 7.6-1.8"></path></svg>';

const state = {
  months: [],
  tasks: [],
  proposals: [],
  activeMonthId: null,
  status: 'Todos',
  priority: 'Todas',
  query: '',
  sortMode: 'priority',
  showCompleted: false,
  taskListExpanded: false,
  roadmapExpanded: false,
  roadmapStatus: 'Todos',
  roadmapPriority: 'Todas',
  roadmapSortMode: 'priority',
  roadmapQuery: '',
  kanbanMode: 'priority',
  kanbanExpanded: new Set(),
  proposalsExpanded: false,
  isAdmin: false,
  editingTaskId: null,
  editingMonthId: undefined,
  convertingProposalId: null,
  usingFallback: true,
  lastUpdatedLabel: ''
};

const CARDS_PER_SECTION = 3;
const SORT_MODES = [
  { key: 'priority', label: 'Prioridad' },
  { key: 'recent', label: 'Más reciente' }
];

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function renderShowMore(buttonId, totalCount, expanded, onToggle) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (totalCount <= CARDS_PER_SECTION) {
    btn.hidden = true;
    btn.onclick = null;
    return;
  }
  btn.hidden = false;
  btn.textContent = expanded ? 'Ver menos' : `Ver todas (${totalCount})`;
  btn.onclick = onToggle;
}

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
  return PRIORITY_WEIGHT[priority] ?? 6;
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

  document.getElementById('sortFilters').innerHTML = SORT_MODES.map(mode => (
    `<button class="filter-btn ${state.sortMode === mode.key ? 'active' : ''}" data-sort-mode="${mode.key}" type="button">${mode.label}</button>`
  )).join('');
  document.querySelectorAll('[data-sort-mode]').forEach(button => {
    button.addEventListener('click', () => {
      state.sortMode = button.dataset.sortMode;
      renderTasks();
      renderFilters();
    });
  });
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

  document.getElementById('roadmapSortFilters').innerHTML = SORT_MODES.map(mode => (
    `<button class="filter-btn ${state.roadmapSortMode === mode.key ? 'active' : ''}" data-roadmap-sort-mode="${mode.key}" type="button">${mode.label}</button>`
  )).join('');
  document.querySelectorAll('[data-roadmap-sort-mode]').forEach(button => {
    button.addEventListener('click', () => {
      state.roadmapSortMode = button.dataset.roadmapSortMode;
      renderRoadmap();
      renderRoadmapFilters();
    });
  });
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
      state.query = '';
      state.taskListExpanded = false;
      state.kanbanExpanded = new Set();
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
  const filtered = tasks.filter(task => {
    const matchesStatus = filters.status === 'Todos' || task.status === filters.status;
    const matchesPriority = filters.priority === 'Todas' || task.priority === filters.priority;
    const hidingCompleted = !filters.showCompleted && task.status === 'Completado' && filters.status !== 'Completado';
    const monthTitle = findMonth(task.monthId)?.title || '';
    const haystack = normalized([task.title, task.description, task.area, task.priority, task.status, monthTitle].join(' '));
    const matchesQuery = !query || haystack.includes(query);
    return matchesStatus && matchesPriority && !hidingCompleted && matchesQuery;
  });

  if (filters.sortMode === 'recent') {
    return filtered.sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || '';
      const dateB = b.updatedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }

  return filtered.sort((a, b) => {
    if (a.status === 'Arrastrada' && b.status !== 'Arrastrada') return -1;
    if (a.status !== 'Arrastrada' && b.status === 'Arrastrada') return 1;
    return priorityWeight(a.priority) - priorityWeight(b.priority);
  });
}

function taskCard(task, isRoadmap = false) {
  const editButton = state.isAdmin
    ? `<button class="edit-task-btn" type="button" data-edit-task="${task.id}">Editar</button>`
    : '';
  const shortDate = formatShortDate(task.updatedAt || task.createdAt);
  const metaBadges = [
    task.priority ? priorityBadge(task.priority) : '',
    task.area ? `<span class="badge neutral">${task.area}</span>` : '',
    shortDate ? `<span class="badge neutral">${shortDate}</span>` : ''
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
    ? filteredTasks(tasksForMonth(month.id), { status: state.status, priority: state.priority, query: state.query, showCompleted: state.showCompleted, sortMode: state.sortMode })
    : [];
  const list = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');

  empty.hidden = tasks.length !== 0;
  const visible = state.taskListExpanded ? tasks : tasks.slice(0, CARDS_PER_SECTION);
  list.innerHTML = visible.map(task => taskCard(task)).join('');
  bindTaskCardEvents();

  renderShowMore('taskListShowMoreBtn', tasks.length, state.taskListExpanded, () => {
    state.taskListExpanded = !state.taskListExpanded;
    renderTasks();
  });
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
    query: state.roadmapQuery,
    showCompleted: true,
    sortMode: state.roadmapSortMode
  });

  const visible = state.roadmapExpanded ? tasks : tasks.slice(0, CARDS_PER_SECTION);
  document.getElementById('roadmapList').innerHTML = visible.map(task => taskCard(task, true)).join('');
  document.getElementById('showAllRoadmap').textContent = state.roadmapExpanded ? 'Ver menos' : `Ver todas (${tasks.length})`;
  bindTaskCardEvents();
}

// ---------- Render: Kanban ----------

function tasksForKanban() {
  const month = getActiveMonth();
  if (!month) return [];
  return tasksForMonth(month.id).filter(task => state.showCompleted || task.status !== 'Completado');
}

function kanbanCard(task) {
  const secondaryBadge = state.kanbanMode === 'priority' ? statusBadge(task.status) : priorityBadge(task.priority);
  const areaBadge = task.area ? `<span class="badge neutral">${task.area}</span>` : '';
  return state.isAdmin
    ? `<button class="kanban-card" type="button" data-edit-task="${task.id}"><span class="task-top">${secondaryBadge}${areaBadge}</span><h4>${task.title}</h4></button>`
    : `<div class="kanban-card kanban-card-static"><span class="task-top">${secondaryBadge}${areaBadge}</span><h4>${task.title}</h4></div>`;
}

function renderKanban() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;
  const tasks = tasksForKanban();
  const columns = state.kanbanMode === 'priority' ? PRIORITIES : STATUSES;

  board.innerHTML = columns.map(columnValue => {
    const columnTasks = tasks.filter(task => (state.kanbanMode === 'priority' ? task.priority : task.status) === columnValue);
    const badge = state.kanbanMode === 'priority' ? priorityBadge(columnValue) : statusBadge(columnValue);
    const expanded = state.kanbanExpanded.has(columnValue);
    const visible = expanded ? columnTasks : columnTasks.slice(0, CARDS_PER_SECTION);
    const showMore = columnTasks.length > CARDS_PER_SECTION
      ? `<button class="secondary-btn small show-more-btn" type="button" data-kanban-expand="${columnValue}">${expanded ? 'Ver menos' : `Ver todas (${columnTasks.length})`}</button>`
      : '';
    return `
      <div class="kanban-column">
        <div class="kanban-column-head">
          ${badge}
          <span class="kanban-column-count">${columnTasks.length}</span>
        </div>
        <div class="kanban-column-body">
          ${visible.length ? visible.map(kanbanCard).join('') : '<p class="kanban-empty">Sin tareas</p>'}
        </div>
        ${showMore}
      </div>
    `;
  }).join('');

  document.querySelectorAll('#kanbanBoard [data-edit-task]').forEach(button => {
    button.addEventListener('click', () => openEditor(button.dataset.editTask));
  });
  document.querySelectorAll('#kanbanBoard [data-kanban-expand]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.kanbanExpand;
      if (state.kanbanExpanded.has(key)) state.kanbanExpanded.delete(key);
      else state.kanbanExpanded.add(key);
      renderKanban();
    });
  });
}

// ---------- Propuestas del equipo ----------

async function refreshProposals() {
  if (!window.HomiSupabase || !HomiSupabase.isConfigured) {
    state.proposals = [];
    return;
  }
  try {
    state.proposals = await HomiSupabase.fetchProposals();
  } catch (error) {
    console.error('[HOMI] Error cargando propuestas:', error);
    state.proposals = [];
  }
}

function proposalCard(proposal) {
  const date = proposal.createdAt
    ? new Date(proposal.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const metaBadges = [
    priorityBadge(proposal.priority),
    date ? `<span class="badge neutral">${date}</span>` : '',
    proposal.reporterName ? `<span class="badge neutral">${proposal.reporterName}</span>` : ''
  ].join('');
  const adminActions = state.isAdmin
    ? `<div class="editor-actions">
        <button class="secondary-btn small danger" type="button" data-discard-proposal="${proposal.id}">Descartar</button>
        <button class="primary-btn small" type="button" data-accept-proposal="${proposal.id}">Aceptar y publicar</button>
      </div>`
    : '';

  return `
    <article class="proposal-card">
      <div class="task-top">${metaBadges}</div>
      <h3>${proposal.title}</h3>
      ${proposal.description ? `<p>${proposal.description}</p>` : ''}
      ${adminActions}
    </article>
  `;
}

function renderProposals() {
  const list = document.getElementById('proposalsList');
  if (!list) return;

  const visible = state.proposalsExpanded ? state.proposals : state.proposals.slice(0, CARDS_PER_SECTION);
  list.innerHTML = visible.length
    ? visible.map(proposalCard).join('')
    : '<p class="kanban-empty">No hay propuestas pendientes.</p>';

  renderShowMore('proposalsShowMoreBtn', state.proposals.length, state.proposalsExpanded, () => {
    state.proposalsExpanded = !state.proposalsExpanded;
    renderProposals();
  });

  if (!state.isAdmin) return;
  list.querySelectorAll('[data-accept-proposal]').forEach(button => {
    button.addEventListener('click', () => openProposalToTask(button.dataset.acceptProposal));
  });
  list.querySelectorAll('[data-discard-proposal]').forEach(button => {
    button.addEventListener('click', () => discardProposal(button.dataset.discardProposal));
  });
}

function openProposalToTask(proposalId) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) return;
  if (!state.months.length) {
    showToast('Crea primero un mes antes de aceptar propuestas.', 'error');
    return;
  }

  state.convertingProposalId = proposalId;
  openEditor(null);
  document.getElementById('editorTitle').textContent = 'Publicar propuesta como tarea';
  document.getElementById('editTaskTitle').value = proposal.title;
  document.getElementById('editDescription').value = proposal.description || '';
  document.getElementById('editPriority').value = proposal.priority || 'Media';
}

async function discardProposal(proposalId) {
  if (!confirm('¿Descartar esta propuesta? Esta acción no se puede deshacer.')) return;
  try {
    await HomiSupabase.deleteProposal(proposalId);
    state.proposals = state.proposals.filter(item => item.id !== proposalId);
    showToast('Propuesta descartada.', 'success');
    renderProposals();
  } catch (error) {
    console.error(error);
    showToast('Error al descartar: ' + (error.message || error), 'error');
  }
}

function openProposalModal() {
  document.getElementById('proposalForm').reset();
  document.getElementById('proposalFormError').textContent = '';
  const modal = document.getElementById('proposalModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeProposalModal() {
  const modal = document.getElementById('proposalModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

async function handleProposalSubmit(event) {
  event.preventDefault();
  const errorEl = document.getElementById('proposalFormError');
  errorEl.textContent = '';

  if (!window.HomiSupabase || !HomiSupabase.isConfigured) {
    errorEl.textContent = 'Las propuestas no están disponibles todavía (Supabase no configurado).';
    return;
  }

  const payload = {
    title: document.getElementById('proposalTitle').value.trim(),
    description: document.getElementById('proposalDescription').value.trim(),
    priority: document.getElementById('proposalPriority').value,
    reporterName: document.getElementById('proposalReporter').value.trim()
  };
  if (!payload.title) {
    errorEl.textContent = 'La propuesta necesita un título.';
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    await HomiSupabase.insertProposal(payload);
    closeProposalModal();
    showToast('¡Gracias! Tu propuesta se ha enviado correctamente.', 'success');
  } catch (error) {
    console.error(error);
    errorEl.textContent = 'Error al enviar: ' + (error.message || error);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- Administración / autenticación ----------

function updateAdminVisibility() {
  const authBtn = document.getElementById('authToggleBtn');
  if (authBtn) {
    const label = state.isAdmin ? 'Salir (modo edición activo)' : 'Acceso privado';
    authBtn.querySelector('.auth-icon').innerHTML = state.isAdmin ? LOCK_OPEN_SVG : LOCK_CLOSED_SVG;
    authBtn.setAttribute('aria-label', label);
    authBtn.title = label;
    authBtn.classList.toggle('active', state.isAdmin);
  }

  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) addTaskBtn.hidden = !state.isAdmin;

  const addMonthBtn = document.getElementById('addMonthBtn');
  if (addMonthBtn) addMonthBtn.hidden = !state.isAdmin;
}

function syncShowCompletedToggles() {
  const monthToggle = document.getElementById('hideCompletedToggle');
  const kanbanToggle = document.getElementById('kanbanHideCompletedToggle');
  if (monthToggle) monthToggle.checked = state.showCompleted;
  if (kanbanToggle) kanbanToggle.checked = state.showCompleted;
}

async function handleAuthToggle() {
  if (state.isAdmin) {
    await HomiSupabase.signOut();
    state.isAdmin = false;
    await refreshProposals();
    render();
  } else {
    openLogin();
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
    await refreshProposals();
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
  state.convertingProposalId = null;
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
      if (state.convertingProposalId) {
        try {
          await HomiSupabase.deleteProposal(state.convertingProposalId);
          state.proposals = state.proposals.filter(item => item.id !== state.convertingProposalId);
        } catch (proposalError) {
          console.error('[HOMI] La tarea se creó pero no se pudo borrar la propuesta original:', proposalError);
        }
      }
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
    state.query = '';
    state.sortMode = 'priority';
    state.taskListExpanded = false;
    document.getElementById('searchInput').value = '';
    renderFilters();
    renderTasks();
  });
  document.getElementById('clearRoadmapFiltersBtn').addEventListener('click', () => {
    state.roadmapStatus = 'Todos';
    state.roadmapPriority = 'Todas';
    state.roadmapSortMode = 'priority';
    state.roadmapQuery = '';
    document.getElementById('roadmapSearchInput').value = '';
    renderRoadmapFilters();
    renderRoadmap();
  });
  document.getElementById('hideCompletedToggle').addEventListener('change', event => {
    state.showCompleted = event.target.checked;
    syncShowCompletedToggles();
    renderTasks();
    renderKanban();
  });
  document.getElementById('kanbanHideCompletedToggle').addEventListener('change', event => {
    state.showCompleted = event.target.checked;
    syncShowCompletedToggles();
    renderTasks();
    renderKanban();
  });
  document.querySelectorAll('[data-kanban-mode]').forEach(button => {
    button.addEventListener('click', () => {
      state.kanbanMode = button.dataset.kanbanMode;
      state.kanbanExpanded = new Set();
      document.querySelectorAll('[data-kanban-mode]').forEach(b => b.classList.toggle('active', b === button));
      renderKanban();
    });
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('homi-theme', next);
  });

  const navToggleBtn = document.getElementById('navToggleBtn');
  const topNav = document.getElementById('topNav');
  function setNavOpen(open) {
    topNav.classList.toggle('open', open);
    navToggleBtn.classList.toggle('active', open);
    navToggleBtn.setAttribute('aria-expanded', String(open));
  }
  navToggleBtn.addEventListener('click', () => {
    setNavOpen(!topNav.classList.contains('open'));
  });
  topNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setNavOpen(false));
  });
  document.addEventListener('click', event => {
    if (!topNav.classList.contains('open')) return;
    if (topNav.contains(event.target) || navToggleBtn.contains(event.target)) return;
    setNavOpen(false);
  });
  document.getElementById('showAllRoadmap').addEventListener('click', () => {
    state.roadmapExpanded = !state.roadmapExpanded;
    renderRoadmap();
  });

  document.getElementById('authToggleBtn').addEventListener('click', handleAuthToggle);
  document.getElementById('addTaskBtn').addEventListener('click', () => openEditor(null));
  document.getElementById('addMonthBtn').addEventListener('click', () => openMonthEditor(null));
  document.getElementById('openProposalBtn').addEventListener('click', openProposalModal);

  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      closeLogin();
      closeEditor();
      closeMonthEditor();
      closeProposalModal();
    });
  });

  document.getElementById('editorForm').addEventListener('submit', saveEditor);
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteEditorTask);

  document.getElementById('monthForm').addEventListener('submit', saveMonthEditor);
  document.getElementById('deleteMonthBtn').addEventListener('click', deleteMonthEditor);

  document.getElementById('proposalForm').addEventListener('submit', handleProposalSubmit);
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
  renderKanban();
  renderRoadmap();
  renderProposals();
  updateAdminVisibility();
  syncShowCompletedToggles();
}

async function init() {
  const savedTheme = localStorage.getItem('homi-theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  bindEvents();
  await loadData();
  await refreshProposals();

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
      await refreshProposals();
      render();
    }
    HomiSupabase.onAuthStateChange(async session => {
      state.isAdmin = session ? await HomiSupabase.isAdminEmail(session.user.email) : false;
      await refreshProposals();
      render();
    });
  }
}

init();
