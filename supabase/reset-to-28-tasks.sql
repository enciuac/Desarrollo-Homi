-- HOMI — Reemplazo completo del roadmap por las 28 tareas vigentes
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- IMPORTANTE:
--   1. Ejecuta primero (o de nuevo) supabase/schema.sql completo. Este script
--      depende de que el constraint de prioridad ya acepte los 6 niveles
--      ('Máxima', 'Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja').
--   2. Este script BORRA todas las filas de development_tasks y todos los
--      meses que no sean "Junio 2026" / "Julio 2026" (p. ej. "Mayo 2026").
--      No borra tablas, ni la lista de administradores, ni las propuestas
--      del buzón de sugerencias (development_proposals).
--   3. Es seguro volver a ejecutar este script: usa upsert por título de mes
--      y borra/reinserta las tareas cada vez, así que el resultado final es
--      siempre exactamente estas 28 tareas.

begin;

-- 1. Borra todas las tareas actuales (de cualquier mes)
delete from public.development_tasks;

-- 2. Borra cualquier mes que no sea Junio 2026 / Julio 2026 (p. ej. Mayo 2026)
--    Ya no tiene tareas asociadas tras el paso 1, así que el FK no lo bloquea.
delete from public.development_months
where title not in ('Junio 2026', 'Julio 2026');

-- 3. Asegura que existen exactamente estos dos meses, con el orden correcto
insert into public.development_months (title, sort_order) values
  ('Junio 2026', 0),
  ('Julio 2026', 1)
on conflict (title) do update set sort_order = excluded.sort_order;

-- 4. Inserta las 14 tareas arrastradas de Junio 2026 (status Arrastrada -> is_roadmap true)
insert into public.development_tasks
  (month_id, title, description, details, status, priority, area, is_roadmap, sort_order)
values
  ((select id from public.development_months where title = 'Junio 2026'), 'Solucionar error al subir vídeos a los anuncios', 'Investigar y solucionar el error que impide o dificulta subir vídeos correctamente durante la creación o edición de los anuncios.', '', 'Arrastrada', 'Alta', '', true, 0),
  ((select id from public.development_months where title = 'Junio 2026'), 'Revisar por qué solo aparecen provincias y no municipios', 'Revisar el sistema de ubicaciones para que, además de provincias, se puedan mostrar y seleccionar correctamente los municipios. Mejorar el buscador y la ubicación de los anuncios.', '', 'Arrastrada', 'Media-alta', '', true, 1),
  ((select id from public.development_months where title = 'Junio 2026'), 'Permitir subir fotos arrastrándolas', 'Añadir funcionalidad drag and drop para que los usuarios puedan subir fotografías arrastrándolas hasta el área de carga de imágenes.', '', 'Arrastrada', 'Media-alta', '', true, 2),
  ((select id from public.development_months where title = 'Junio 2026'), 'Revisar botones de otras preferencias de los anuncios', 'Revisar el funcionamiento, comportamiento y visualización de los botones correspondientes a las otras preferencias de los anuncios.', '', 'Arrastrada', 'Media-alta', '', true, 3),
  ((select id from public.development_months where title = 'Junio 2026'), 'Revisar sección del tipo de plan en el perfil', 'Revisar la sección del perfil en la que se muestra el tipo de plan del usuario y corregir cualquier problema de funcionamiento, información o visualización.', '', 'Arrastrada', 'Media-alta', '', true, 4),
  ((select id from public.development_months where title = 'Junio 2026'), 'Crear perfil público para usuarios y profesionales', 'Crear una página de perfil público que pueda utilizarse tanto para usuarios como para profesionales dentro de HOMI.', '', 'Arrastrada', 'Media-alta', '', true, 5),
  ((select id from public.development_months where title = 'Junio 2026'), 'Revisar responsive del header', 'Revisar y corregir el comportamiento responsive del header para que funcione y se visualice correctamente en los diferentes dispositivos.', '', 'Arrastrada', 'Media', '', true, 6),
  ((select id from public.development_months where title = 'Junio 2026'), 'Revisar puntos de ruptura responsive', 'Revisar los breakpoints del diseño responsive y corregir los cambios de distribución o visualización que no se produzcan correctamente.', '', 'Arrastrada', 'Media', '', true, 7),
  ((select id from public.development_months where title = 'Junio 2026'), 'Añadir botones de paginación para ir directamente al primero o al último', 'Añadir controles en la paginación que permitan al usuario ir directamente a la primera página o a la última página de los resultados.', '', 'Arrastrada', 'Media', '', true, 8),
  ((select id from public.development_months where title = 'Junio 2026'), 'Mejorar la home page', 'Revisar y mejorar la página de inicio de HOMI, tanto en presentación como en experiencia de usuario y comunicación del producto.', '', 'Arrastrada', 'Media-baja', '', true, 9),
  ((select id from public.development_months where title = 'Junio 2026'), 'Rehacer la descripción de HOMI', 'Reescribir la descripción general de HOMI para que explique de forma más clara y adecuada qué es la plataforma y qué valor ofrece.', '', 'Arrastrada', 'Media-baja', '', true, 10),
  ((select id from public.development_months where title = 'Junio 2026'), 'Crear o configurar un Linktree en nuestro dominio', 'Crear o configurar una página similar a Linktree utilizando el dominio propio de HOMI.', '', 'Arrastrada', 'Baja', '', true, 11),
  ((select id from public.development_months where title = 'Junio 2026'), 'Crear landing page para QR', 'Crear una landing page específica que pueda utilizarse como destino de los códigos QR de HOMI.', '', 'Arrastrada', 'Baja', '', true, 12),
  ((select id from public.development_months where title = 'Junio 2026'), 'Reordenar la página Cómo funciona — Enterprise-signup', 'En la página «Cómo funciona — Enterprise-signup», colocar primero la sección de beneficios y situar el formulario debajo.', '', 'Arrastrada', 'Baja', '', true, 13);

-- 5. Inserta las 14 tareas nuevas de Julio 2026 (status Pendiente -> is_roadmap false)
insert into public.development_tasks
  (month_id, title, description, details, status, priority, area, is_roadmap, sort_order)
values
  ((select id from public.development_months where title = 'Julio 2026'), 'Pasar todo el proyecto de HOMI a nuestro repositorio de GitHub', 'Migrar todo el proyecto de HOMI al repositorio de GitHub definido por el equipo, dejando correctamente versionado el código necesario del proyecto.', '', 'Pendiente', 'Máxima', '', false, 0),
  ((select id from public.development_months where title = 'Julio 2026'), 'Redirigir homi-app.es a homi-app.com con redirección 301', 'Configurar una redirección permanente 301 desde homi-app.es hacia homi-app.com, incluyendo las rutas correspondientes cuando sea posible.', '', 'Pendiente', 'Máxima', '', false, 1),
  ((select id from public.development_months where title = 'Julio 2026'), 'Crear y configurar robots.txt', 'Crear y configurar correctamente el archivo robots.txt del proyecto para controlar el acceso de los rastreadores y enlazar el sitemap cuando corresponda.', '', 'Pendiente', 'Máxima', '', false, 2),
  ((select id from public.development_months where title = 'Julio 2026'), 'Crear y configurar sitemap.xml', 'Crear y configurar el sitemap.xml del proyecto con las URLs que deban ser indexadas por los motores de búsqueda.', '', 'Pendiente', 'Máxima', '', false, 3),
  ((select id from public.development_months where title = 'Julio 2026'), 'Meter en el footer una página ya diseñada por nosotros', 'Implementar la página ya diseñada por el equipo y enlazarla correctamente desde el footer. Revisar que la página y su enlace funcionen correctamente tanto en desktop como en mobile.', '', 'Pendiente', 'Máxima', '', false, 4),
  ((select id from public.development_months where title = 'Julio 2026'), 'Cambiar el flujo de usuario en los anuncios', 'Permitir que los usuarios no autenticados puedan abrir y ver los anuncios antes de registrarse. Mostrar un número determinado de tarjetas desbloqueadas con la foto, la zona y el precio visibles. Los usuarios no registrados o no logueados no deben poder contactar, enviar mensajes, guardar anuncios, solicitar información ni realizar acciones equivalentes. Cuando intenten realizar una de estas acciones, por ejemplo al pulsar «Ver contacto», debe aparecer el registro o login. Después de autenticarse, el usuario podrá completar la acción y contactar. El objetivo es que el usuario vea valor antes de encontrarse con el muro de registro.', '', 'Pendiente', 'Máxima', '', false, 5),
  ((select id from public.development_months where title = 'Julio 2026'), 'Cambiar todos los planes de pago a modalidad bajo consulta y redirigirlos a la página de contacto', 'Todos los botones y CTAs correspondientes a planes de pago deben redirigir a la página de contacto. No debe existir compra directa de planes desde la web. El usuario deberá rellenar el formulario para enviarnos sus datos. El equipo decidirá manualmente si concede el plan gratis, con condiciones especiales o como plan de pago. Revisar y retocar Resend si es necesario para que el formulario envíe correctamente el mensaje al equipo. Enviar también al usuario un correo de confirmación indicando que hemos recibido su mensaje y que nos pondremos en contacto lo antes posible.', '', 'Pendiente', 'Máxima', '', false, 6),
  ((select id from public.development_months where title = 'Julio 2026'), 'Mover el chat de sitio y crear un botón más accesible', 'En desktop, colocar el botón del chat junto al perfil. En mobile, colocar el botón del chat en el menú inferior, junto al botón de Publicar.', '', 'Pendiente', 'Máxima', '', false, 7),
  ((select id from public.development_months where title = 'Julio 2026'), 'Revisar y definir bien los filtros para que ayuden a la experiencia de usuario y al SEO', 'Revisar el sistema de filtros y comentar con Aurelio qué filtros deben existir. Definir cuáles pueden generar URLs útiles para SEO y cuáles deben funcionar únicamente como filtros internos. Evitar la generación de URLs duplicadas, vacías o sin valor SEO.', '', 'Pendiente', 'Alta', '', false, 8),
  ((select id from public.development_months where title = 'Julio 2026'), 'Actualizar el año del footer de 2025 a 2026', 'Cambiar el año que aparece en el footer, sustituyendo 2025 por 2026.', '', 'Pendiente', 'Media', '', false, 9),
  ((select id from public.development_months where title = 'Julio 2026'), 'Permitir ordenar los artículos del blog por fecha de publicación', 'Añadir una opción que permita ordenar los artículos del blog según su fecha de publicación.', '', 'Pendiente', 'Media-baja', '', false, 10),
  ((select id from public.development_months where title = 'Julio 2026'), 'Añadir tiempo de lectura aproximado en cada artículo', 'Calcular y mostrar en cada artículo del blog una estimación del tiempo necesario para leerlo.', '', 'Pendiente', 'Media-baja', '', false, 11),
  ((select id from public.development_months where title = 'Julio 2026'), 'Sustituir la foto de autor genérica por el logo de HOMI', 'Sustituir la imagen genérica utilizada como foto de autor por el logo de HOMI. Utilizar un logo cuadrado de 200 x 200 píxeles, con fondo #ff7f40, y subirlo o utilizarlo desde Supabase.', '', 'Pendiente', 'Media-baja', '', false, 12),
  ((select id from public.development_months where title = 'Julio 2026'), 'Añadir bio del autor debajo del badge Autor Verificado', 'Añadir debajo del badge «Autor Verificado» la siguiente biografía: «El equipo de HOMI — portal especializado en pisos compartidos fundado en Cuenca. Escribimos sobre alquiler, convivencia y búsqueda de compañeros de piso en España.»', '', 'Pendiente', 'Media-baja', '', false, 13);

commit;

-- Comprobación rápida (debe devolver 28):
-- select count(*) from public.development_tasks;
