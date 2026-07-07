-- HOMI Development Log — esquema de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Se puede pegar de una vez, es idempotente (usa IF NOT EXISTS donde aplica).

-- ============================================================
-- 1. TABLAS
-- ============================================================

create table if not exists public.development_months (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.development_tasks (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  title text not null,
  description text default '',
  details text default '',
  status text not null check (status in ('Completado', 'Progreso', 'Revisado', 'Pendiente', 'Arrastrada')),
  priority text default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  area text default '',
  is_roadmap boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists development_tasks_month_idx on public.development_tasks (month);
create index if not exists development_tasks_status_idx on public.development_tasks (status);

-- Lista blanca de administradores: solo estos emails pueden crear, editar
-- o borrar tareas/meses. El email debe coincidir con el de un usuario
-- creado en Supabase Auth (Authentication > Users).
create table if not exists public.admin_users (
  email text primary key
);

-- Sustituye por tu email real antes o después de ejecutar el script:
-- insert into public.admin_users (email) values ('tu-email@dominio.com');

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

alter table public.development_months enable row level security;
alter table public.development_tasks enable row level security;
alter table public.admin_users enable row level security;

-- Lectura pública (cualquier visitante, autenticado o no, puede leer)
drop policy if exists "public read months" on public.development_months;
create policy "public read months"
  on public.development_months for select
  using (true);

drop policy if exists "public read tasks" on public.development_tasks;
create policy "public read tasks"
  on public.development_tasks for select
  using (true);

-- Un usuario autenticado puede comprobar si SU propio email está en la
-- lista de administradores (necesario para que el frontend sepa si debe
-- mostrar el modo edición). No puede ver la lista completa.
drop policy if exists "read own admin row" on public.admin_users;
create policy "read own admin row"
  on public.admin_users for select
  using (auth.email() = email);

-- Escritura (insert/update/delete) solo para usuarios autenticados que
-- además figuren en admin_users.
drop policy if exists "admins write months" on public.development_months;
create policy "admins write months"
  on public.development_months for all
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.admin_users a where a.email = auth.email())
  )
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.admin_users a where a.email = auth.email())
  );

drop policy if exists "admins write tasks" on public.development_tasks;
create policy "admins write tasks"
  on public.development_tasks for all
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.admin_users a where a.email = auth.email())
  )
  with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.admin_users a where a.email = auth.email())
  );

-- ============================================================
-- 3. DATOS INICIALES DE EJEMPLO (opcional)
-- ============================================================
-- Puedes generar INSERTs reales a partir de js/data.js con el botón
-- "Exportar SQL de ejemplo" del modo edición (ver README), o crear los
-- meses a mano aquí:

-- insert into public.development_months (title, sort_order) values
--   ('Mayo 2026', 0),
--   ('Junio 2026', 1),
--   ('Julio 2026', 2)
-- on conflict (title) do nothing;
