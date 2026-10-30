# Calel — Actualización 0.2

1. **Antes de publicar**, ejecuta `SEGURIDAD-SUPABASE.sql` en Supabase SQL Editor. Requiere que ya exista tu perfil administrador.
2. En GitHub, entra al repositorio `sistemas-calel`, selecciona **Add file → Upload files** y sube el contenido de este ZIP **descomprimido**. Conserva las carpetas `src` y `public`. GitHub mostrará archivos modificados; confirma con **Commit changes**.
3. Netlify hará el despliegue automáticamente desde `main`. Mantén las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (publishable). Nunca subas una secret key.
4. Abre el sitio, inicia sesión con el usuario que creaste en Supabase y verifica el módulo Clientes.
5. Si aparece «Cuenta sin perfil», registra el UID de Authentication → Users en `public.perfiles` como `administrador`, desde SQL Editor. No envíes contraseñas.

**Alcance:** inicio de sesión y alta/listado/edición de clientes. Las recepciones locales existentes NO se sincronizan todavía; los demás módulos permanecen deshabilitados. No uses información sensible real hasta revisar políticas, privacidad, respaldos y control de acceso.
