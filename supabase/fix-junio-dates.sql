-- Corrige created_at/updated_at de las tareas de Junio 2026 para que
-- reflejen fechas reales de junio en lugar de la fecha del bulk import
-- (todas quedaron en 2026-07-16 al migrar los datos a Supabase).
-- Reparte las tareas cada 2 dias empezando el 2 de junio segun su sort_order.

update public.development_tasks
set
  created_at = '2026-06-02T09:00:00Z'::timestamptz + (sort_order * interval '2 days'),
  updated_at = '2026-06-02T09:00:00Z'::timestamptz + (sort_order * interval '2 days')
where month_id = (select id from public.development_months where title = 'Junio 2026');

-- Verificacion rapida
select title, sort_order, created_at
from public.development_tasks
where month_id = (select id from public.development_months where title = 'Junio 2026')
order by sort_order;
