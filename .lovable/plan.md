# Portal de Autoservicio del Empleado

Construiremos un sistema de roles que separa la experiencia entre **Admin/RRHH** (dashboard Vértice completo) y **Empleado** (portal móvil simplificado). El sistema reutiliza el login actual y redirige según el rol detectado.

## 1. Cambios en base de datos (SQL a ejecutar)

Necesitas ejecutar en Lovable Cloud:

```sql
-- Rol y vínculo con auth.users
alter table empleados add column if not exists rol text default 'empleado';
alter table empleados add column if not exists user_id uuid references auth.users(id);
alter table empleados add column if not exists foto_url text;

create index if not exists empleados_user_id_idx on empleados(user_id);

-- Solicitudes de permisos/vacaciones (si no existe ya vacaciones_permisos)
create table if not exists solicitudes_permisos (
  id uuid default gen_random_uuid() primary key,
  empleado_id uuid references empleados(id) on delete cascade,
  tipo text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  motivo text,
  estado text default 'Pendiente',
  created_at timestamptz default now()
);

alter table solicitudes_permisos enable row level security;

-- Función security definer para evitar recursión
create or replace function public.is_admin(_uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from empleados where user_id = _uid and rol in ('admin','supervisor'))
$$;

-- Políticas: empleado ve lo suyo, admin ve todo
create policy "emp own solicitudes" on solicitudes_permisos for all to authenticated
  using (empleado_id in (select id from empleados where user_id = auth.uid()) or public.is_admin(auth.uid()))
  with check (empleado_id in (select id from empleados where user_id = auth.uid()) or public.is_admin(auth.uid()));

-- Liquidaciones: empleado solo las suyas
drop policy if exists "auth full" on liquidaciones;
create policy "liq access" on liquidaciones for all to authenticated
  using (empleado_id in (select id from empleados where user_id = auth.uid()) or public.is_admin(auth.uid()));

-- Asistencia: empleado puede marcar la suya
drop policy if exists "auth full" on asistencia;
create policy "asist access" on asistencia for all to authenticated
  using (empleado_id in (select id from empleados where user_id = auth.uid()) or public.is_admin(auth.uid()))
  with check (empleado_id in (select id from empleados where user_id = auth.uid()) or public.is_admin(auth.uid()));
```

## 2. Detección de rol en el login

Extender `useAuth` para cargar el registro de `empleados` por `user_id` cuando hay sesión. Expone `empleado` y `rol`.

`/_app.tsx` (layout actual) → si `rol === 'empleado'`, redirige a `/portal`. Si admin/supervisor, mantiene dashboard.

## 3. Nuevo layout `/portal` (móvil)

Estructura:

```text
src/routes/_portal.tsx          → layout con guard de rol empleado
src/routes/_portal/index.tsx    → redirige a asistencia
src/routes/_portal/asistencia.tsx
src/routes/_portal/permisos.tsx
src/routes/_portal/liquidaciones.tsx
src/routes/_portal/documentos.tsx
```

Layout:
- Header con foto + nombre del empleado
- `<Outlet />` para sección activa
- Bottom nav fija con 4 íconos: Asistencia, Permisos, Liquidaciones, Documentos
- Diseño optimizado para 375px (iPhone), botones grandes (h-14), tipografía legible

## 4. Las 4 secciones

**Asistencia (`/portal/asistencia`)**
- Botón grande "Marcar entrada" o "Marcar salida" (según último registro del día)
- Solicita cámara → captura foto → solicita GPS → guarda en tabla `asistencia` con `foto_url`, `lat`, `lng`
- Lista de marcas del mes en curso con hora entrada/salida

**Permisos (`/portal/permisos`)**
- Botón "Solicitar permiso o vacaciones" → modal con tipo, fechas, motivo
- Lista de solicitudes con badge de estado
- Admin ve un panel nuevo en `/rrhh/vacaciones` para aprobar/rechazar

**Liquidaciones (`/portal/liquidaciones`)**
- Lista de sus liquidaciones (filtradas por RLS)
- Botón descarga PDF reutilizando `/print/liquidacion/:id`

**Documentos (`/portal/documentos`)**
- Lista contratos del empleado con descarga PDF
- Lista documentos legales (ODI, reglamento) con estado entregado/pendiente

## 5. Vinculación auth.users ↔ empleados

En `/rrhh/empleados`, agregar campo "Email" al crear empleado y un botón "Crear acceso" que invoca un server function (admin) para crear el usuario en Supabase Auth y guardar el `user_id` en empleados. También campo "Rol" en el formulario.

## Detalles técnicos

- Hook `useCurrentEmpleado()` que lee `empleados` por `user_id` y cachea
- `_app.tsx` y `_portal.tsx` se gatean entre sí según rol; ambos requieren sesión
- Subida de fotos a bucket `asistencia-fotos` (crear bucket público)
- `solicitudes_permisos` reemplaza/complementa `vacaciones_permisos` actual; mantenemos el nombre nuevo para evitar conflictos con la página existente
- RLS reescrita para liquidaciones y asistencia (antes era `auth full`)
- Aprobación: pantalla admin en `/rrhh/vacaciones` muestra solicitudes con botones Aprobar/Rechazar que actualizan `estado`

## Archivos a crear/editar

Crear:
- `src/routes/_portal.tsx`, `_portal/index.tsx`, `_portal/asistencia.tsx`, `_portal/permisos.tsx`, `_portal/liquidaciones.tsx`, `_portal/documentos.tsx`
- `src/components/portal-bottom-nav.tsx`
- `src/hooks/use-current-empleado.ts`

Editar:
- `src/hooks/use-auth.tsx` (exponer empleado/rol)
- `src/routes/_app.tsx` (redirigir empleados a /portal)
- `src/routes/_app/rrhh/empleados.tsx` (campos rol, email, user_id)
- `src/routes/_app/rrhh/vacaciones.tsx` (panel aprobación)
