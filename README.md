# HOMI Development Log

Página estática (GitHub Pages) con estilo SaaS + identidad HOMI para llevar el registro visual de desarrollo del producto: tareas por mes, estados, roadmap y modo edición.

La persistencia real es **Supabase** (Postgres + Auth + RLS). `js/data.js` solo se usa como **dato de ejemplo de solo lectura** cuando Supabase todavía no está configurado — no es el sistema de guardado.

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
    └── schema.sql           # tablas + RLS + policies listas para pegar
```

## 1. Subir a GitHub Pages

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

### 2.2. Crear las tablas, RLS y policies

1. Ve a `SQL Editor > New query`.
2. Pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql). Crea:
   - `development_months` (id, title, sort_order, created_at)
   - `development_tasks` (id, month, title, description, details, status, priority, area, is_roadmap, sort_order, created_at, updated_at)
   - `admin_users` (email) — lista blanca de quién puede editar
   - Row Level Security activado en las tres tablas
   - Políticas:
     - **Lectura pública** de meses y tareas (cualquier visitante, sin login).
     - **Escritura (insert/update/delete)** solo si el usuario está autenticado **y** su email aparece en `admin_users`.
     - Un usuario autenticado solo puede leer su propia fila de `admin_users` (para que el frontend sepa si debe mostrar el modo edición), nunca la lista completa.

La seguridad depende de estas políticas, **no** de ocultar la `anon key` (esa clave está pensada para ser pública).

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

Sube el cambio a GitHub Pages. En cuanto estos valores dejen de ser los de ejemplo, la página empieza a leer y guardar directamente en Supabase.

### 2.5. (Opcional) Migrar los datos de ejemplo a Supabase

Si quieres partir de las ~85 tareas ya cargadas en `js/data.js` en vez de escribir todo de cero:

1. Abre la página **sin** Supabase configurado (o con el banner de aviso visible).
2. Pulsa **"Descargar SQL de estos datos"** en el aviso superior. Genera un `homi-seed-data.sql` con `insert` para meses y tareas.
3. Pégalo en `SQL Editor` de Supabase y ejecútalo (una sola vez).

Esto es una migración puntual, no un mecanismo recurrente: a partir de ahí, todos los cambios se hacen desde el modo edición y se guardan solos.

## 3. Cómo usar el modo edición

1. Con Supabase ya configurado, pulsa **"Acceso privado"** en la barra superior.
2. Introduce el email y la contraseña de un usuario que esté en `admin_users`.
3. En modo edición puedes:
   - Pulsar **"Editar"** en cualquier tarjeta: cambiar título, descripción, detalles, estado, prioridad, área, mes, o marcarla/desmarcarla para el roadmap.
   - Pulsar **"Eliminar"** dentro del editor (pide confirmación).
   - Pulsar **"Nueva tarea"** para crear una tarea desde cero.
   - Pulsar **"Nuevo mes"** para añadir un mes nuevo (ej. "Agosto 2026") al selector.
   - Pulsar **"Salir"** para cerrar sesión.
4. Cada acción se guarda automáticamente en Supabase al instante; verás un aviso de confirmación o de error abajo a la derecha. Al recargar la página, los cambios siguen ahí.

Los visitantes sin sesión solo pueden ver, filtrar y buscar: no ven botones de edición y, aunque los forzaran por consola, la base de datos rechaza cualquier escritura que no venga de un usuario en `admin_users` (lo aplica RLS, no el frontend).

## 4. Añadir nuevos meses y tareas

- **Meses**: botón "Nuevo mes" en la barra de administración, o insertando una fila en `development_months` desde Supabase.
- **Tareas**: botón "Nueva tarea" (usa el mes activo por defecto, pero puedes elegir cualquier otro desde el propio formulario).

No hace falta tocar ningún archivo del repositorio ni volver a desplegar nada para añadir contenido: todo vive en Supabase.

## 5. Si Supabase no está configurado

Mientras `js/supabase-config.js` tenga los valores de ejemplo, la página:

- Muestra un aviso: *"Supabase no configurado. Usando datos locales de ejemplo."*
- Carga los meses y tareas desde `js/data.js` en modo **solo lectura** (filtros y búsqueda funcionan igual).
- Desactiva el modo edición (el login informa de que Supabase no está listo).

Esto es intencional: no existe un modo de edición "de mentira" basado en `localStorage`. El almacenamiento local solo se usa para preferencias sin importancia como el tema claro/oscuro.

## 6. Estados permitidos

Solo existen estos 5 estados, fijos en el código (`js/script.js`) y reforzados por un `check` en la base de datos:

- Completado
- Progreso
- Revisado
- Pendiente
- Arrastrada

## 7. Logo y favicon

- Logo horizontal en la cabecera: `assets/img/homi-logo-horizontal.webp`.
- Favicons enlazados en `index.html`: `favicon.ico`, `favicon-32.png`, `favicon-192.png` (también como `apple-touch-icon`) y `favicon-512.png`.

## 8. Responsive

Probado en desktop, tablet y mobile: el selector de meses hace scroll horizontal si no caben todos, los filtros se envuelven en varias líneas y las tarjetas pasan a una sola columna por debajo de 980px.
