// Capa de acceso a datos y autenticación contra Supabase.
// Expone `window.HomiSupabase` con métodos async usados por js/script.js.
// Si js/supabase-config.js sigue con los valores de ejemplo, `isConfigured`
// queda en false y script.js usa js/data.js como fallback de solo lectura.

(function (global) {
  const cfg = global.HOMI_SUPABASE_CONFIG || {};
  const looksLikePlaceholder = !cfg.url
    || !cfg.anonKey
    || /YOUR-PROJECT/i.test(cfg.url)
    || /YOUR-ANON/i.test(cfg.anonKey);

  const isConfigured = !looksLikePlaceholder;

  let client = null;
  if (isConfigured) {
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      console.error('[HomiSupabase] El SDK de supabase-js no se cargó antes de supabase-client.js.');
    } else {
      client = global.supabase.createClient(cfg.url, cfg.anonKey);
    }
  }

  function ensureClient() {
    if (!client) throw new Error('Supabase no está configurado todavía.');
    return client;
  }

  function mapMonthRow(row) {
    return { id: row.id, title: row.title, sortOrder: row.sort_order ?? 0 };
  }

  function mapTaskRow(row) {
    return {
      id: row.id,
      month: row.month,
      title: row.title,
      description: row.description || '',
      details: String(row.details || '').split('\n').map(line => line.trim()).filter(Boolean),
      status: row.status,
      priority: row.priority || 'Media',
      area: row.area || '',
      isRoadmap: !!row.is_roadmap,
      sortOrder: row.sort_order ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async function fetchMonths() {
    const sb = ensureClient();
    const { data, error } = await sb.from('development_months').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapMonthRow);
  }

  async function fetchTasks() {
    const sb = ensureClient();
    const { data, error } = await sb.from('development_tasks').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapTaskRow);
  }

  async function insertMonth(title, sortOrder) {
    const sb = ensureClient();
    const { data, error } = await sb.from('development_months').insert({ title, sort_order: sortOrder }).select().single();
    if (error) throw error;
    return mapMonthRow(data);
  }

  async function insertTask(task) {
    const sb = ensureClient();
    const payload = {
      month: task.month,
      title: task.title,
      description: task.description || '',
      details: (task.details || []).join('\n'),
      status: task.status,
      priority: task.priority || 'Media',
      area: task.area || '',
      is_roadmap: !!task.isRoadmap,
      sort_order: task.sortOrder ?? 0
    };
    const { data, error } = await sb.from('development_tasks').insert(payload).select().single();
    if (error) throw error;
    return mapTaskRow(data);
  }

  async function updateTask(id, task) {
    const sb = ensureClient();
    const payload = {
      month: task.month,
      title: task.title,
      description: task.description || '',
      details: (task.details || []).join('\n'),
      status: task.status,
      priority: task.priority || 'Media',
      area: task.area || '',
      is_roadmap: !!task.isRoadmap,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await sb.from('development_tasks').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return mapTaskRow(data);
  }

  async function deleteTask(id) {
    const sb = ensureClient();
    const { error } = await sb.from('development_tasks').delete().eq('id', id);
    if (error) throw error;
  }

  async function signIn(email, password) {
    const sb = ensureClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  // Comprueba si el usuario autenticado está en la tabla admin_users.
  // Depende de la policy de lectura "los usuarios pueden ver su propia fila".
  async function isAdminEmail(email) {
    if (!client || !email) return false;
    const { data, error } = await client
      .from('admin_users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (error) {
      console.warn('[HomiSupabase] No se pudo verificar el rol admin:', error.message);
      return false;
    }
    return !!data;
  }

  function onAuthStateChange(callback) {
    if (!client) return;
    client.auth.onAuthStateChange((_event, session) => callback(session));
  }

  global.HomiSupabase = {
    isConfigured,
    fetchMonths,
    fetchTasks,
    insertMonth,
    insertTask,
    updateTask,
    deleteTask,
    signIn,
    signOut,
    getSession,
    isAdminEmail,
    onAuthStateChange
  };
})(window);
