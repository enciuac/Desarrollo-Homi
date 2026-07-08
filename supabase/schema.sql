-- HOMI Development Log — esquema de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Es SEGURO volver a pegar y ejecutar este archivo completo aunque ya hayas
-- ejecutado una versión anterior: usa IF NOT EXISTS / DO blocks para migrar
-- en lugar de fallar. No borra tareas ni meses existentes.

-- ============================================================
-- 1. TABLA DE MESES
-- ============================================================

create table if not exists public.development_months (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.development_months add column if not exists summary text default '';
alter table public.development_months add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- 2. TABLA DE TAREAS
-- ============================================================

create table if not exists public.development_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  details text default '',
  status text not null default 'Pendiente',
  priority text default 'Media',
  area text default '',
  is_roadmap boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- Migración: pasar de `month text` a `month_id uuid` referenciando development_months ---

alter table public.development_tasks add column if not exists month_id uuid;

-- Si la tabla venía de una versión anterior con columna `month` de texto,
-- crea los meses que falten y enlaza las tareas por título antes de forzar
-- la relación.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'development_tasks' and column_name = 'month'
  ) then
    insert into public.development_months (title, sort_order)
    select distinct t.month, 999
    from public.development_tasks t
    where t.month is not null and t.month_id is null
    on conflict (title) do nothing;

    update public.development_tasks t
    set month_id = m.id
    from public.development_months m
    where t.month_id is null and t.month = m.title;

    alter table public.development_tasks drop column month;
  end if;
end $$;

-- Constraint de FK (bloquea borrar un mes que todavía tiene tareas)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'development_tasks_month_id_fkey'
  ) then
    alter table public.development_tasks
      add constraint development_tasks_month_id_fkey
      foreign key (month_id) references public.development_months(id) on delete restrict;
  end if;
end $$;

-- Constraints de valores permitidos para status y priority
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'development_tasks_status_check') then
    alter table public.development_tasks
      add constraint development_tasks_status_check
      check (status in ('Completado', 'Progreso', 'Revisado', 'Pendiente', 'Arrastrada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'development_tasks_priority_check') then
    alter table public.development_tasks
      add constraint development_tasks_priority_check
      check (priority is null or priority in ('Alta', 'Media', 'Baja'));
  end if;
end $$;

create index if not exists development_tasks_month_id_idx on public.development_tasks (month_id);
create index if not exists development_tasks_status_idx on public.development_tasks (status);
create index if not exists development_tasks_priority_idx on public.development_tasks (priority);
create index if not exists development_tasks_is_roadmap_idx on public.development_tasks (is_roadmap);

-- ============================================================
-- 3. PROPUESTAS DEL EQUIPO (buzon de sugerencias)
-- ============================================================
-- Cualquiera puede crear una propuesta (sin login). Solo un admin puede
-- leerlas, revisarlas y borrarlas. No hay edicion: al aceptar una
-- propuesta el admin crea la tarea real desde el editor y la propuesta
-- se borra; al rechazarla, se borra directamente.

create table if not exists public.development_proposals (
  id uuid primary key default gen_random_uuid()
);

alter table public.development_proposals add column if not exists title text not null default '';
alter table public.development_proposals alter column title drop default;
alter table public.development_proposals add column if not exists description text default '';
alter table public.development_proposals add column if not exists priority text default 'Media';
alter table public.development_proposals add column if not exists reporter_name text default '';
alter table public.development_proposals add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'development_proposals_priority_check') then
    alter table public.development_proposals
      add constraint development_proposals_priority_check
      check (priority is null or priority in ('Alta', 'Media', 'Baja'));
  end if;
end $$;

-- ============================================================
-- 4. LISTA BLANCA DE ADMINISTRADORES
-- ============================================================
-- Solo estos emails pueden crear, editar o borrar meses/tareas. El email
-- debe coincidir con el de un usuario creado en Supabase Auth
-- (Authentication > Users).

create table if not exists public.admin_users (
  email text primary key
);

-- Sustituye por tu email real:
-- insert into public.admin_users (email) values ('tu-email@dominio.com');

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.development_months enable row level security;
alter table public.development_tasks enable row level security;
alter table public.development_proposals enable row level security;
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

-- Propuestas: cualquiera (incluso sin login) puede crear una, pero solo
-- un admin puede aceptarlas (crear la tarea real) o borrarlas. La lectura
-- es publica a proposito: todo el equipo ve lo que ya se ha propuesto,
-- para no duplicar propuestas de fallos o ideas repetidas.
drop policy if exists "public insert proposals" on public.development_proposals;
create policy "public insert proposals"
  on public.development_proposals for insert
  with check (true);

drop policy if exists "admins read proposals" on public.development_proposals;
drop policy if exists "public read proposals" on public.development_proposals;
create policy "public read proposals"
  on public.development_proposals for select
  using (true);

drop policy if exists "admins delete proposals" on public.development_proposals;
create policy "admins delete proposals"
  on public.development_proposals for delete
  using (
    auth.role() = 'authenticated'
    and exists (select 1 from public.admin_users a where a.email = auth.email())
  );

-- Escritura (insert/update/delete) solo para usuarios autenticados que
-- además figuren en admin_users. La seguridad vive aquí, no en el
-- frontend: aunque alguien fuerce los botones por consola, Postgres
-- rechaza la escritura si no cumple esta condición.
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
-- 6. DATOS INICIALES DE EJEMPLO (opcional)
-- ============================================================
-- Puedes usar supabase/seed-example-data.sql (generado a partir de
-- js/data.js) o crear los meses a mano aquí:

-- insert into public.development_months (title, sort_order) values
--   ('Mayo 2026', 0),
--   ('Junio 2026', 1),
--   ('Julio 2026', 2)
-- on conflict (title) do nothing;
