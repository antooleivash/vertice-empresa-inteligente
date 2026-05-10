# Vértice — Plataforma SaaS Empresarial

Voy a construir el MVP **por fases**. Esta primera entrega cubre la base sobre la que se montará todo lo demás.

## Fase 1 (esta entrega)
1. **Conexión Supabase** con las credenciales que entregaste (`kjsjnertdcqgwbvmpqnx`).
2. **Autenticación**: pantalla de login email/password, rutas protegidas, botón de cerrar sesión en sidebar.
3. **Layout base**: sidebar blanco profesional con acento azul `#185FA5`, navegación tipo Notion/Linear, en español Chile.
4. **Dashboard gerencial**:
   - 4 KPI cards (empleados activos, asistencia hoy %, alertas críticas IA, costo RRHH mes).
   - Click en cada KPI → panel lateral con detalle de personas.
   - Panel de alertas IA con tarjetas de color (rojo/ámbar/azul).
   - Gráfico de barras: costo por área.
   - Gráfico de líneas: evolución costo últimos 6 meses.
5. **Módulo RRHH completo** con CRUD conectado a Supabase:
   - Empleados, Asistencia, Horas extras, Cartas amonestación, Liquidaciones, Vacaciones/Permisos.
   - Generación de PDF vía `window.open` + `window.print` con plantilla imprimible para cartas y liquidaciones.
6. **Módulos Finanzas / IA / Reclutamiento / Marketing / Marketplace**: ítems visibles en sidebar con páginas placeholder *"Próximamente — Fase 2"*, para que la navegación quede completa.

## Fase 2 (siguiente entrega, no incluida ahora)
- Finanzas con datos simulados y gráficos (costos, flujo caja, presupuesto vs real).
- Motor de Alertas IA: detección automática (2+ ausencias lunes, 3+ atrasos, horas extra sobre límite, licencias repetidas).

## Fase 3 (posterior)
- Operaciones, Reclutamiento, Marketing IA, Marketplace.

## Detalles técnicos
- Stack: TanStack Start + React + Tailwind v4 + shadcn + Supabase JS.
- Esquema Supabase requerido (lo creo vía migración en tu proyecto Supabase si me confirmas, o te entrego el SQL para ejecutar):
  - `empleados` (id, rut, nombre, cargo, area, fecha_ingreso, sueldo_base, activo)
  - `asistencia` (id, empleado_id, fecha, entrada, salida, estado: presente/ausente/atraso/licencia)
  - `horas_extras` (id, empleado_id, fecha, horas, autorizadas, motivo)
  - `cartas` (id, empleado_id, fecha, tipo, motivo, contenido)
  - `liquidaciones` (id, empleado_id, periodo, sueldo_base, bonos, descuentos, liquido)
  - `vacaciones_permisos` (id, empleado_id, tipo, fecha_inicio, fecha_fin, dias, estado)
- Auth: Supabase email/password, layout `_authenticated` con guard.
- PDF: ruta `/print/:tipo/:id` que renderiza HTML imprimible y dispara `window.print()`.

## Pregunta importante antes de implementar
Las credenciales que entregaste son del **proyecto Supabase de tu organización**. Para crear las tablas necesito que confirmes uno de estos caminos:

- **A)** Tú ejecutas el SQL de creación de tablas que te dejaré documentado, en tu propio dashboard Supabase.
- **B)** Activamos Lovable Cloud (un Supabase nuevo gestionado por Lovable) y olvidamos las credenciales externas — más simple, pero cambia el proyecto destino.

Por defecto seguiré con **Opción A** (uso tu Supabase existente) salvo que indiques lo contrario.

¿Apruebas este alcance para empezar Fase 1?
