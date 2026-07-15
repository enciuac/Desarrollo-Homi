const HOMI_LOG = {
  project: {
    name: "HOMI Development Log",
    eyebrow: "Producto / Roadmap / Sprints",
    title: "Registro de desarrollo de HOMI",
    description: "Seguimiento visual de las tareas, mejoras, correcciones y decisiones que han ido dando forma a HOMI mes a mes.",
    lastUpdated: "15 julio 2026",
    owner: "HOMI",
    sourceNote: "Registro reiniciado con el listado de 28 tareas activas: arrastres de junio 2026 y tareas nuevas de julio 2026."
  },
  months: [
    {
      id: "junio-2026",
      name: "Junio 2026",
      period: "1 junio - 30 junio 2026",
      summary: "",
      tasks: [
        { id: "jun-001", title: "Solucionar error al subir vídeos a los anuncios", status: "Arrastrada", priority: "Alta", area: "", description: "Investigar y solucionar el error que impide o dificulta subir vídeos correctamente durante la creación o edición de los anuncios.", details: [] },
        { id: "jun-002", title: "Revisar por qué solo aparecen provincias y no municipios", status: "Arrastrada", priority: "Media-alta", area: "", description: "Revisar el sistema de ubicaciones para que, además de provincias, se puedan mostrar y seleccionar correctamente los municipios. Mejorar el buscador y la ubicación de los anuncios.", details: [] },
        { id: "jun-003", title: "Permitir subir fotos arrastrándolas", status: "Arrastrada", priority: "Media-alta", area: "", description: "Añadir funcionalidad drag and drop para que los usuarios puedan subir fotografías arrastrándolas hasta el área de carga de imágenes.", details: [] },
        { id: "jun-004", title: "Revisar botones de otras preferencias de los anuncios", status: "Arrastrada", priority: "Media-alta", area: "", description: "Revisar el funcionamiento, comportamiento y visualización de los botones correspondientes a las otras preferencias de los anuncios.", details: [] },
        { id: "jun-005", title: "Revisar sección del tipo de plan en el perfil", status: "Arrastrada", priority: "Media-alta", area: "", description: "Revisar la sección del perfil en la que se muestra el tipo de plan del usuario y corregir cualquier problema de funcionamiento, información o visualización.", details: [] },
        { id: "jun-006", title: "Crear perfil público para usuarios y profesionales", status: "Arrastrada", priority: "Media-alta", area: "", description: "Crear una página de perfil público que pueda utilizarse tanto para usuarios como para profesionales dentro de HOMI.", details: [] },
        { id: "jun-007", title: "Revisar responsive del header", status: "Arrastrada", priority: "Media", area: "", description: "Revisar y corregir el comportamiento responsive del header para que funcione y se visualice correctamente en los diferentes dispositivos.", details: [] },
        { id: "jun-008", title: "Revisar puntos de ruptura responsive", status: "Arrastrada", priority: "Media", area: "", description: "Revisar los breakpoints del diseño responsive y corregir los cambios de distribución o visualización que no se produzcan correctamente.", details: [] },
        { id: "jun-009", title: "Añadir botones de paginación para ir directamente al primero o al último", status: "Arrastrada", priority: "Media", area: "", description: "Añadir controles en la paginación que permitan al usuario ir directamente a la primera página o a la última página de los resultados.", details: [] },
        { id: "jun-010", title: "Mejorar la home page", status: "Arrastrada", priority: "Media-baja", area: "", description: "Revisar y mejorar la página de inicio de HOMI, tanto en presentación como en experiencia de usuario y comunicación del producto.", details: [] },
        { id: "jun-011", title: "Rehacer la descripción de HOMI", status: "Arrastrada", priority: "Media-baja", area: "", description: "Reescribir la descripción general de HOMI para que explique de forma más clara y adecuada qué es la plataforma y qué valor ofrece.", details: [] },
        { id: "jun-012", title: "Crear o configurar un Linktree en nuestro dominio", status: "Arrastrada", priority: "Baja", area: "", description: "Crear o configurar una página similar a Linktree utilizando el dominio propio de HOMI.", details: [] },
        { id: "jun-013", title: "Crear landing page para QR", status: "Arrastrada", priority: "Baja", area: "", description: "Crear una landing page específica que pueda utilizarse como destino de los códigos QR de HOMI.", details: [] },
        { id: "jun-014", title: "Reordenar la página Cómo funciona — Enterprise-signup", status: "Arrastrada", priority: "Baja", area: "", description: "En la página «Cómo funciona — Enterprise-signup», colocar primero la sección de beneficios y situar el formulario debajo.", details: [] }
      ]
    },
    {
      id: "julio-2026",
      name: "Julio 2026",
      period: "1 julio - 31 julio 2026",
      summary: "",
      tasks: [
        { id: "jul-001", title: "Pasar todo el proyecto de HOMI a nuestro repositorio de GitHub", status: "Pendiente", priority: "Máxima", area: "", description: "Migrar todo el proyecto de HOMI al repositorio de GitHub definido por el equipo, dejando correctamente versionado el código necesario del proyecto.", details: [] },
        { id: "jul-002", title: "Redirigir homi-app.es a homi-app.com con redirección 301", status: "Pendiente", priority: "Máxima", area: "", description: "Configurar una redirección permanente 301 desde homi-app.es hacia homi-app.com, incluyendo las rutas correspondientes cuando sea posible.", details: [] },
        { id: "jul-003", title: "Crear y configurar robots.txt", status: "Pendiente", priority: "Máxima", area: "", description: "Crear y configurar correctamente el archivo robots.txt del proyecto para controlar el acceso de los rastreadores y enlazar el sitemap cuando corresponda.", details: [] },
        { id: "jul-004", title: "Crear y configurar sitemap.xml", status: "Pendiente", priority: "Máxima", area: "", description: "Crear y configurar el sitemap.xml del proyecto con las URLs que deban ser indexadas por los motores de búsqueda.", details: [] },
        { id: "jul-005", title: "Meter en el footer una página ya diseñada por nosotros", status: "Pendiente", priority: "Máxima", area: "", description: "Implementar la página ya diseñada por el equipo y enlazarla correctamente desde el footer. Revisar que la página y su enlace funcionen correctamente tanto en desktop como en mobile.", details: [] },
        { id: "jul-006", title: "Cambiar el flujo de usuario en los anuncios", status: "Pendiente", priority: "Máxima", area: "", description: "Permitir que los usuarios no autenticados puedan abrir y ver los anuncios antes de registrarse. Mostrar un número determinado de tarjetas desbloqueadas con la foto, la zona y el precio visibles. Los usuarios no registrados o no logueados no deben poder contactar, enviar mensajes, guardar anuncios, solicitar información ni realizar acciones equivalentes. Cuando intenten realizar una de estas acciones, por ejemplo al pulsar «Ver contacto», debe aparecer el registro o login. Después de autenticarse, el usuario podrá completar la acción y contactar. El objetivo es que el usuario vea valor antes de encontrarse con el muro de registro.", details: [] },
        { id: "jul-007", title: "Cambiar todos los planes de pago a modalidad bajo consulta y redirigirlos a la página de contacto", status: "Pendiente", priority: "Máxima", area: "", description: "Todos los botones y CTAs correspondientes a planes de pago deben redirigir a la página de contacto. No debe existir compra directa de planes desde la web. El usuario deberá rellenar el formulario para enviarnos sus datos. El equipo decidirá manualmente si concede el plan gratis, con condiciones especiales o como plan de pago. Revisar y retocar Resend si es necesario para que el formulario envíe correctamente el mensaje al equipo. Enviar también al usuario un correo de confirmación indicando que hemos recibido su mensaje y que nos pondremos en contacto lo antes posible.", details: [] },
        { id: "jul-008", title: "Mover el chat de sitio y crear un botón más accesible", status: "Pendiente", priority: "Máxima", area: "", description: "En desktop, colocar el botón del chat junto al perfil. En mobile, colocar el botón del chat en el menú inferior, junto al botón de Publicar.", details: [] },
        { id: "jul-009", title: "Revisar y definir bien los filtros para que ayuden a la experiencia de usuario y al SEO", status: "Pendiente", priority: "Alta", area: "", description: "Revisar el sistema de filtros y comentar con Aurelio qué filtros deben existir. Definir cuáles pueden generar URLs útiles para SEO y cuáles deben funcionar únicamente como filtros internos. Evitar la generación de URLs duplicadas, vacías o sin valor SEO.", details: [] },
        { id: "jul-010", title: "Actualizar el año del footer de 2025 a 2026", status: "Pendiente", priority: "Media", area: "", description: "Cambiar el año que aparece en el footer, sustituyendo 2025 por 2026.", details: [] },
        { id: "jul-011", title: "Permitir ordenar los artículos del blog por fecha de publicación", status: "Pendiente", priority: "Media-baja", area: "", description: "Añadir una opción que permita ordenar los artículos del blog según su fecha de publicación.", details: [] },
        { id: "jul-012", title: "Añadir tiempo de lectura aproximado en cada artículo", status: "Pendiente", priority: "Media-baja", area: "", description: "Calcular y mostrar en cada artículo del blog una estimación del tiempo necesario para leerlo.", details: [] },
        { id: "jul-013", title: "Sustituir la foto de autor genérica por el logo de HOMI", status: "Pendiente", priority: "Media-baja", area: "", description: "Sustituir la imagen genérica utilizada como foto de autor por el logo de HOMI. Utilizar un logo cuadrado de 200 x 200 píxeles, con fondo #ff7f40, y subirlo o utilizarlo desde Supabase.", details: [] },
        { id: "jul-014", title: "Añadir bio del autor debajo del badge Autor Verificado", status: "Pendiente", priority: "Media-baja", area: "", description: "Añadir debajo del badge «Autor Verificado» la siguiente biografía: «El equipo de HOMI — portal especializado en pisos compartidos fundado en Cuenca. Escribimos sobre alquiler, convivencia y búsqueda de compañeros de piso en España.»", details: [] }
      ]
    }
  ]
};
