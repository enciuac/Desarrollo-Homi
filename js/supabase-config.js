// Configuración pública de Supabase.
//
// Rellena estos dos valores con los de tu proyecto:
// Supabase Dashboard > Project Settings > API
//   - Project URL          -> url
//   - anon / public key    -> anonKey
//
// IMPORTANTE: la "anon key" está pensada para ser pública (va en el
// navegador de cualquier visitante). NO pongas aquí la "service_role key".
// La seguridad real la da Row Level Security (RLS) en la base de datos,
// no el hecho de ocultar esta clave. Ver README.md para las políticas SQL.
//
// Mientras estos valores sigan siendo los de ejemplo, la página funcionará
// en modo lectura con los datos de js/data.js y mostrará un aviso.

window.HOMI_SUPABASE_CONFIG = {
  url: "https://ntgtrnfnhtaqxrcjwuut.supabase.co",
  anonKey: "sb_publishable_aHJs20GOBrc-_Z72lhhclw_dXHi1CyA"
};
