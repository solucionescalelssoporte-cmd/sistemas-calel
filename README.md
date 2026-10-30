# Soluciones Tecnológicas Calel — versión inicial

## Qué incluye esta entrega
- Interfaz adaptable a computadora y teléfono.
- Menú base para los módulos principales.
- Formulario inicial de recepción de equipos.
- Captura de varias fotografías y almacenamiento local temporal mediante IndexedDB.
- Indicador de conexión y estructura PWA.
- Esquema SQL inicial con organizaciones, perfiles, clientes, órdenes, fotos, inventario, proveedores, ventas y caja.

## Requisitos
- Node.js 20 o superior.
- Proyecto Supabase.
- Cuenta Netlify para publicar.

## Ejecutar en tu computadora
1. Descomprime el ZIP.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `npm install`.
4. Copia `.env.example` como `.env`.
5. Agrega la URL del proyecto Supabase y la clave pública `anon` en `.env`.
6. Ejecuta `npm run dev`.
7. Abre la dirección local que indique Vite.

## Configuración inicial de Supabase
1. Crea un proyecto Supabase.
2. En SQL Editor, ejecuta `supabase/schema.sql`.
3. En Storage, crea un bucket llamado `service-evidence` y déjalo **privado**.
4. Crea el primer usuario administrador en Authentication.
5. Crea una organización en `public.organizations`.
6. Crea el perfil del primer usuario en `public.profiles`, usando el UUID de Authentication, el ID de organización y role `admin`.
7. Guarda la URL y la clave pública `anon` en `.env`.

**Importante:** no pongas nunca la clave `service_role` en el frontend ni compartas el archivo `.env`. No uses datos reales de clientes hasta terminar autenticación, permisos, políticas de Storage y sincronización.

## Estado honesto de esta versión
Esta es una base de construcción, no un sistema empresarial terminado. El formulario de recepción guarda localmente en el dispositivo; la sincronización real con Supabase, autenticación completa, carga privada de fotos, punto de venta, inventario transaccional, permisos detallados y reportes deben implementarse y probarse en las siguientes etapas. No se debe asumir que los datos locales están respaldados en la nube.

## Próximas tareas técnicas
1. Alta de organización y login.
2. Crear/consultar clientes y órdenes en Supabase.
3. Subir fotografías a Storage privado con URLs firmadas.
4. Implementar cola de sincronización idempotente y resolución de conflictos.
5. Inventario y movimientos mediante funciones transaccionales.
6. POS, caja, reportes y roles granulares.
7. Pruebas de seguridad, copias de respaldo y despliegue Netlify.
