# HOMI Development Log

App interna (GitHub Pages) con estilo SaaS + identidad HOMI para llevar el registro de desarrollo del producto: meses, tareas, estados, prioridades, roadmap, vista Kanban, buzón de propuestas del equipo y modo edición.

La persistencia real es **Supabase** (Postgres + Auth + RLS). `js/data.js` solo se usa como **dato de ejemplo de solo lectura** cuando Supabase todavía no está configurado — no es el sistema de guardado. No existe edición basada en `localStorage`.

## Estructura de carpetas

```txt
homi-development-log/
├── index.html
├── README.md
├── assets/
│   ├── favicon/
│   │   ├── favicon.ico
│   │   ├── favicon-32.png
│   │   ├── favicon-192.png
│   │   └── favicon-512.png
│   └── img/
│       ├── homi-logo-horizontal.webp / .png
│       └── homi-icon.webp / .png
├── css/
│   └── styles.css
├── js/
│   ├── data.js              # datos de ejemplo / fallback de solo lectura
│   ├── supabase-config.js   # URL + anon key de tu proyecto (pública)
│   ├── supabase-client.js   # capa de acceso a datos y auth
│   └── script.js            # UI: render, filtros, editor, login
└── supabase/
    ├── schema.sql             # tablas + constraints + RLS + policies (idempotente)
    └── seed-example-data.sql  # opcional: inserta las tareas de ejemplo como datos reales
```

## 1. Desplegar en GitHub Pages

1. Sube todo el contenido de esta carpeta a un repositorio de GitHub.
2. En el repo: `Settings > Pages`.
3. Selecciona la rama principal (`main`) y la carpeta raíz (`/`).
4. Guarda y espera a que GitHub publique la URL.

No hace falta build ni bundler: es HTML/CSS/JS plano.

## 2. Configurar Supabase

### 2.1. Crear el proyecto

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a `Project Settings > API` y copia:
   - **Project URL**
   - **anon public key** (⚠️ nunca la `service_role key`)

### 2.2. Crear las tablas, constraints, RLS y policies

1. Ve a `SQL Editor > New query`.
2. Pega y ejecuta el contenido completo de [`supabase/schema.sql`](supabase/schema.sql).

Es **seguro volver a pegarlo y ejecutarlo** aunque ya tengas datos: usa `create table if not exists` y bloques `do $$ ... $$` que comprueban si algo existe antes de crearlo, así que sirve tanto para instalar desde cero como para migrar una instalación anterior sin perder filas.

Crea:

- **`development_months`**: `id uuid`, `title text unique`, `sort_order integer`, `summary text`, `created_at`, `updated_at`.
- **`development_tasks`**: `id uuid`, `month_id uuid` (referencia a `development_months.id`, `on delete restrict`), `title`, `description`, `details`, `status`, `priority`, `area`, `is_roadmap boolean`, `sort_order`, `created_at`, `updated_at`.
- **`development_proposals`**: `id uuid`, `title`, `description`, `priority`, `reporter_name`, `created_at` — el buzón de propuestas del equipo (ver sección 4.2).
- **`admin_users`** (`email`): lista blanca de quién puede editar.
- **Constraints**: `status` solo admite `Completado | Progreso | Revisado | Pendiente | Arrastrada`; `priority` (en tareas y propuestas) solo admite `Alta | Media | Baja` (o vacío).
- **`on delete restrict`** en `month_id`: Postgres bloquea a nivel de base de datos borrar un mes que todavía tiene tareas asociadas, aunque alguien se salte el frontend.
- **Row Level Security** activado en las cuatro tablas, con estas políticas:
  - **Lectura pública** de meses y tareas (cualquier visitante, sin login).
  - **Escritura (insert/update/delete)** en meses y tareas solo si el usuario está autenticado **y** su email aparece en `admin_users`.
  - **Propuestas**: cualquiera (incluso sin login) puede crear una (`insert`) y leer la lista completa (para evitar duplicados entre compañeros), pero solo un admin puede borrarlas o aceptarlas.
  - Un usuario autenticado solo puede leer su propia fila de `admin_users` (para que el frontend sepa si debe mostrar el modo edición), nunca la lista completa.

La seguridad depende de estas políticas, **no** de ocultar botones en el frontend ni la `anon key` (esa clave está pensada para ser pública).

> Si ya tenías una versión anterior de la tabla `development_tasks` con una columna `month` de texto (en vez de `month_id`), el script migra solas las filas: crea los meses que falten, enlaza cada tarea por título y borra la columna `month` antigua.

### 2.3. Crear tu usuario admin

1. Ve a `Authentication > Users > Add user` y crea tu usuario con tu email y una contraseña.
2. En `SQL Editor`, autorízalo para editar:
   ```sql
   insert into public.admin_users (email) values ('tu-email@dominio.com');
   ```
3. Repite el `insert` por cada persona que deba poder editar.

Para quitarle el acceso a alguien: `delete from public.admin_users where email = '...'`.

### 2.4. Conectar el frontend

Edita [`js/supabase-config.js`](js/supabase-config.js):

```js
window.HOMI_SUPABASE_CONFIG = {
  url: "https://tu-proyecto.supabase.co",
  anonKey: "tu-anon-public-key"
};
```

Sube el cambio a GitHub. En cuanto estos valores dejen de ser los de ejemplo, la página empieza a leer y guardar directamente en Supabase.

### 2.5. (Opcional) Sembrar los datos de ejemplo

Si quieres partir de las ~85 tareas de ejemplo (Mayo/Junio/Julio 2026) como datos reales en vez de una tabla vacía: pega y ejecuta una vez el contenido de [`supabase/seed-example-data.sql`](supabase/seed-example-data.sql) en el `SQL Editor`, **después** de haber ejecutado `schema.sql`.

Esto es una migración puntual (no hay ningún botón en la web para generarlo, a propósito). Si no lo ejecutas, la app arranca con Supabase vacío y vas añadiendo meses y tareas tú mismo desde el modo edición.

## 3. Cómo usar el modo edición

1. Con Supabase ya configurado, pulsa **"Acceso privado"** en la cabecera (arriba a la derecha, junto al selector de tema).
2. Introduce el email y la contraseña de un usuario que esté en `admin_users`.
3. En modo edición aparecen botones contextuales:
   - **"Añadir mes"** (junto a las pestañas de mes): título (ej. "Agosto 2026"), orden y un resumen opcional.
   - **Lápiz (✎)** junto a cada pestaña de mes: edita título, orden o resumen; o elimínalo si no tiene tareas asociadas (si tiene, la app avisa y hay que mover o borrar antes las tareas; la base de datos lo bloquea igualmente).
   - **"Nueva tarea"** (junto al título del mes activo): título, mes, estado, prioridad, área, orden, descripción, detalles/notas y si aparece en el roadmap.
   - **"Editar"** en cualquier tarjeta o tarjeta del Kanban: mismos campos, incluido mover la tarea a otro mes.
   - **Eliminar tarea**: dentro del editor, pide confirmación antes de borrar.
   - El botón de la cabecera cambia a **"Salir"** para cerrar sesión.
4. Cada acción se guarda automáticamente en Supabase al instante; verás un aviso de confirmación o de error abajo a la derecha. Al recargar la página, los cambios siguen ahí.

Los visitantes sin sesión solo pueden ver, filtrar y buscar: no ven botones de edición y, aunque los forzaran por consola, la base de datos rechaza cualquier escritura que no venga de un usuario en `admin_users` (lo aplica RLS, no el frontend).

## 4. Filtros

### Vista mensual (`Timeline`)

Se combinan entre sí (mes + estado + prioridad + búsqueda de texto):

- **Estado**: Todos / Completado / Progreso / Revisado / Pendiente / Arrastrada.
- **Prioridad**: Todas / Alta / Media / Baja.
- **Buscar dentro del mes**: por título, descripción, mes, área, prioridad o estado.
- **Mostrar completadas**: toggle apagado por defecto — las tareas `Completado` quedan ocultas de la vista mensual y del Kanban hasta que lo actives (o filtres explícitamente por estado `Completado`).
- **Limpiar filtros**: resetea estado, prioridad y búsqueda.

### Roadmap

Filtros independientes de la vista mensual, con la misma lógica (estado, prioridad, búsqueda y "Limpiar filtros"). Una tarea aparece en el roadmap si:

- tiene `is_roadmap = true` (marcado manualmente desde el editor con el checkbox "Mostrar en el roadmap"), **y**
- si no se ha elegido un estado concreto en el filtro, además se limita por defecto a estados `Pendiente`, `Arrastrada` o `Progreso` (para no mezclar con tareas ya cerradas). Si filtras por un estado concreto (incluido `Completado` o `Revisado`), se muestran esas exactamente.

## 4.1. Vista Kanban

Sección "Kanban" (enlace en la cabecera), con el mismo mes activo que el Timeline:

- **Por prioridad**: columnas Alta / Media / Baja.
- **Por estado**: columnas Completado / Progreso / Revisado / Pendiente / Arrastrada.
- Respeta el toggle **"Mostrar completadas"** (compartido con la vista mensual).
- Cada tarjeta muestra el badge que no se usa para agrupar (estado si agrupas por prioridad, o viceversa) más el área si la tiene.
- En modo edición, las tarjetas son clicables y abren el mismo editor de tareas que el resto de la app.

## 4.2. Buzón de propuestas del equipo

Sección "Propuestas" (enlace en la cabecera), pensada para que cualquier compañero reporte fallos o ideas sin necesitar login:

1. **Cualquier visitante** pulsa "Proponer tarea" y rellena título, descripción, la prioridad que él cree que tiene, y opcionalmente su nombre. Al enviarla, se guarda directamente en Supabase.
2. **Todo el equipo ve la lista de propuestas pendientes** (título, descripción, fecha de envío, quién la mandó si lo indicó, y su prioridad sugerida) — así nadie propone dos veces el mismo fallo o idea. Es de solo lectura para quien no ha iniciado sesión: no hay botones de acción.
3. **Solo el admin** ve además los botones de acción en cada propuesta:
   - **"Aceptar y publicar"**: abre el editor de tareas normal, precargado con el título, la descripción y la prioridad de la propuesta. El admin completa mes, estado, área, etc. y guarda — se crea como tarea real y la propuesta original se borra automáticamente.
   - **"Descartar"**: pide confirmación y la borra sin crear ninguna tarea.

Nada de una propuesta llega al log real hasta que el admin la acepta explícitamente.

## 5. Si Supabase no está configurado

Mientras `js/supabase-config.js` tenga los valores de ejemplo, la página:

- Muestra un aviso: *"Supabase no configurado. Usando datos locales de ejemplo."*
- Carga los meses y tareas desde `js/data.js` en modo **solo lectura** (filtros y búsqueda funcionan igual).
- Desactiva el modo edición (el login informa de que Supabase no está listo).

## 6. Estados y prioridades permitidos

Fijos en el código (`js/script.js`) y reforzados por `check constraints` en la base de datos — no se pueden guardar otros valores:

- **Estados**: Completado, Progreso, Revisado, Pendiente, Arrastrada.
- **Prioridades**: Alta (rojo/naranja), Media (ámbar), Baja (verde suave).

## 7. Logo y favicon

- Logo horizontal en la cabecera: `assets/img/homi-logo-horizontal.webp`.
- Favicons enlazados en `index.html`: `favicon.ico`, `favicon-32.png`, `favicon-192.png` (también como `apple-touch-icon`) y `favicon-512.png`.

## 8. Responsive

Probado en desktop, tablet y mobile: el selector de meses hace scroll horizontal si no caben todos, los grupos de filtros pasan a 2 columnas (tablet) o 1 columna (mobile), y las tarjetas pasan a una sola columna por debajo de 980px.
