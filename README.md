# HOMI Development Log

Página estática para GitHub Pages con estilo SaaS + HOMI.

## Estructura de carpetas

```txt
homi-development-log/
├── index.html
├── README.md
├── assets/
│   ├── favicon/
│   │   ├── favicon-32.png
│   │   ├── favicon-192.png
│   │   ├── favicon-512.png
│   │   └── favicon.ico
│   └── img/
│       ├── homi-logo-horizontal.webp
│       ├── homi-logo-horizontal.png
│       ├── homi-icon.webp
│       └── homi-icon.png
├── css/
│   └── styles.css
└── js/
    ├── data.js
    └── script.js
```

## Cómo subir a GitHub Pages

1. Sube todo el contenido de esta carpeta a un repositorio.
2. En GitHub: `Settings > Pages`.
3. Selecciona la rama principal y la carpeta raíz.
4. Guarda y espera a que GitHub publique la página.

## Edición actual

El modo edición funciona con guardado local en el navegador mediante `localStorage`.
Esto permite editar tarjetas, moverlas de mes, cambiar estados y mantener los cambios en el mismo navegador.

## Para guardado automático real

GitHub Pages es estático, por lo que no puede guardar cambios por sí solo en una base de datos.
Para guardar automáticamente de verdad hace falta conectar un backend o una base de datos externa, por ejemplo Supabase o Firebase.

Recomendación para HOMI: Supabase.

Se necesitaría:

- URL del proyecto de Supabase.
- Public anon key.
- Tabla para guardar el log, por ejemplo `development_log`.
- Sistema de autenticación real: Supabase Auth o Edge Function con contraseña segura.
- Reglas RLS para que solo el admin pueda editar.

No conviene dejar una contraseña real dentro del JavaScript público, porque cualquiera podría verla inspeccionando el código.
