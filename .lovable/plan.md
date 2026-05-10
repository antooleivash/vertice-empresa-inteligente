## Plan: Liquidación BUK-style + Configuración de empresa con logo

### 1. Base de datos (migración SQL)

**Tabla nueva `empresa_config`** (singleton, 1 fila):
```sql
create table empresa_config (
  id uuid primary key default gen_random_uuid(),
  nombre text default 'Mi Empresa S.A.',
  rut text, direccion text, telefono text,
  web text, ciudad text default 'Puerto Montt',
  logo_url text,
  updated_at timestamptz default now()
);
-- RLS full access authenticated
```

**Bucket storage** `empresa-assets` (público) para el logo.

**Ampliar tabla `liquidaciones`** con columnas BUK:
- `afp` text default 'Habitat'
- `salud` text default 'Fonasa'  
- `salud_monto` integer default 0 (Isapre UF/CLP fijo)
- `dias_trabajados` int default 30
- `dias_inasistencia` int default 0
- `horas_extras` numeric default 0
- `gratificacion` int default 0
- `asignacion_familiar` int default 0
- `anticipo` int default 0
- `cotiz_prevision` int, `cotiz_salud` int, `seguro_cesantia` int, `impuesto_unico` int
- `total_haberes` int, `total_descuentos` int
- `otros_bonos` jsonb default '[]' — `[{concepto, monto}]`
- `otros_descuentos` jsonb default '[]`
- `uf_valor` int default 39000

### 2. Cálculos automáticos (helper `src/lib/payroll.ts`)

```
gratificacion = round(sueldo_base * 0.25), tope mensual aprox $209.396
total_imponible = sueldo_base + gratificacion + bonos imponibles + horas_extras
cotiz_prevision = total_imponible * tasa_AFP (Habitat 11.27%, Capital 11.44%, etc.)
cotiz_salud    = max(total_imponible * 0.07, salud_monto Isapre)
seguro_cesantia= total_imponible * 0.006
impuesto_unico = tabla SII simplificada (tramos UTM)
descuentos_legales = suma anteriores
total_haberes      = total_imponible + asignacion_familiar
total_descuentos   = descuentos_legales + anticipo + suma(otros_descuentos)
liquido            = total_haberes − total_descuentos
```

### 3. Configuración de empresa

- Nueva ruta `src/routes/_app/configuracion/empresa.tsx`: formulario (nombre, RUT, dirección, teléfono, web, ciudad) + uploader de logo a Storage. Guarda/actualiza fila singleton.
- Item en sidebar "Configuración → Empresa" (icono Building2).
- Hook `src/hooks/use-empresa.ts` que carga la config y la cachea.
- Header de la app (`app-sidebar.tsx`): muestra logo si existe, si no, el nombre.

### 4. Formulario de liquidación rediseñado

Reescribir `src/routes/_app/rrhh/liquidaciones.tsx` con un Dialog en pestañas o secciones:

- **Datos básicos**: empleado, periodo, sueldo base
- **Asistencia**: días trabajados, inasistencia, horas extras
- **Previsión**: AFP (select 6 opciones), Salud (Fonasa/Isapre + monto)
- **Bonos**: lista dinámica `{concepto, monto}` (botón +/–)
- **Descuentos**: anticipo + lista dinámica de otros descuentos
- Recálculo en vivo mostrando total haberes / descuentos / líquido

### 5. PDF estilo BUK

Reescribir `ContratoContent`/agregar nuevo `LiqContent` en `src/routes/print.$tipo.$id.tsx`:

```text
┌────────────────────────────────────┬──────────┐
│ LIQUIDACIÓN DE SUELDO              │  [LOGO]  │
│ Empleador: Empresa (RUT)           │          │
│ Empresa · Gerencia · Mes           │          │
├──────────────┬───────────┬─────────┴──────────┤
│ Sr(a)/RUT    │ Tipo cont │ Previsión: AFP X  │
│ Cargo/CCosto │ Días/HE   │ Salud: Fonasa     │
│ Sueldo Base  │ Inasist   │ UF: $XX.XXX       │
├──────────────┴───────────┴────────────────────┤
│ HABERES                  │ DESCUENTOS         │
│ Imponibles  (subtotal)   │ Legales (subtotal)│
│  Sueldo Base             │  Previsión 11.27% │
│  Gratificación 25%       │  Salud 7%          │
│  Horas Extras 50%        │  Cesantía 0.6%     │
│  Otros bonos…            │  Impto Único       │
│ No Imponibles            │ Otros              │
│  Asig. Familiar          │  Anticipo          │
│                          │  Otros descuentos  │
├──────────────────────────┴────────────────────┤
│ TOTAL HABERES   |  TOTAL DESCUENTOS           │
│ IMP.PREV/SALUD  |  IMP.CES  |  BASE TRIBUT.   │
│ ╔═════════════════════════════════════════╗   │
│ ║ LÍQUIDO A RECIBIR:  $X.XXX.XXX         ║   │
│ ╚═════════════════════════════════════════╝   │
│ Certifico que he recibido de [empresa]…       │
│                                               │
│           ___________________                 │
│              FIRMA CONFORME                   │
└───────────────────────────────────────────────┘
```

- Carga `empresa_config` para logo + datos
- Logo a la derecha del header (max-h 60px)
- Si no hay logo → nombre empresa en texto grande
- Formato CLP con puntos: `$1.234.567`
- Fonts: serif tipo BUK, tamaño compacto

### 6. Archivos

**Crear:**
- `src/lib/payroll.ts` (cálculos AFP/salud/cesantía/impuesto)
- `src/hooks/use-empresa.ts`
- `src/routes/_app/configuracion/empresa.tsx`

**Editar:**
- `src/routes/_app/rrhh/liquidaciones.tsx` (form completo + recálculo)
- `src/routes/print.$tipo.$id.tsx` (LiqContent BUK + carga empresa)
- `src/lib/domain.ts` (tipo Liquidacion ampliado, EmpresaConfig)
- `src/components/app-sidebar.tsx` (item Configuración + logo en header)

### 7. Acción del usuario

Después de aplicar la migración: subir el logo en **Configuración → Empresa**. Mientras no esté subido, los PDFs muestran el nombre como texto.
