import { createFileRoute } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLocalList, uid } from "@/lib/local-store";
import { Download, Upload, AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracion/importar")({ component: ImportarPage });

type Column = { key: string; label: string; required?: boolean; type?: "string" | "number" | "date" | "time" };
type ImportSpec = {
  id: string;
  label: string;
  desc: string;
  columns: Column[];
  /** Returns { ok, errors } per row after parsing into normalized objects */
  validate: (rows: Record<string, unknown>[]) => { row: Record<string, unknown>; errors: string[] }[];
  /** Performs import. Returns { inserted, failed } */
  importer: (rows: Record<string, unknown>[]) => Promise<{ inserted: number; failed: number; details?: string }>;
};

// --- Storage adapters for local-list modules ---
function localImporter(key: string) {
  return async (rows: Record<string, unknown>[]) => {
    try {
      const raw = localStorage.getItem(key);
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
      const withIds = rows.map((r) => ({ id: uid(), ...r }));
      localStorage.setItem(key, JSON.stringify([...withIds, ...prev]));
      return { inserted: rows.length, failed: 0 };
    } catch (e) {
      return { inserted: 0, failed: rows.length, details: (e as Error).message };
    }
  };
}

function reqString(v: unknown) { return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : ""; }
function toNumber(v: unknown) { if (v == null || v === "") return NaN; const n = Number(String(v).replace(/\./g, "").replace(",", ".")); return n; }
function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // dd-mm-yyyy or dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const yyyy = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${yyyy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function toMonth(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 7);
  const iso = toIsoDate(v);
  if (iso) return iso.slice(0, 7);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return null;
}

const SPECS: ImportSpec[] = [
  {
    id: "empleados",
    label: "Empleados",
    desc: "Carga masiva de empleados con datos de contrato y remuneraciones.",
    columns: [
      { key: "nombre", label: "nombre", required: true },
      { key: "rut", label: "rut", required: true },
      { key: "cargo", label: "cargo" },
      { key: "area", label: "area" },
      { key: "sueldo_base", label: "sueldo_base", type: "number", required: true },
      { key: "turno", label: "turno" },
      { key: "horas_extras_autorizadas", label: "horas_extras_autorizadas", type: "number" },
      { key: "estado", label: "estado" },
    ],
    validate: (rows) => rows.map((r) => {
      const errors: string[] = [];
      const norm = {
        nombre: reqString(r.nombre), rut: reqString(r.rut),
        cargo: reqString(r.cargo) || "—", area: reqString(r.area) || "—",
        sueldo_base: toNumber(r.sueldo_base),
        turno: reqString(r.turno) || null,
        horas_extras_autorizadas: r.horas_extras_autorizadas != null && r.horas_extras_autorizadas !== "" ? toNumber(r.horas_extras_autorizadas) : 0,
        estado: reqString(r.estado) || "Activo",
      };
      if (!norm.nombre) errors.push("nombre vacío");
      if (!norm.rut) errors.push("rut vacío");
      if (Number.isNaN(norm.sueldo_base)) errors.push("sueldo_base inválido");
      return { row: norm, errors };
    }),
    importer: async (rows) => {
      const payload = rows.map((r) => ({
        nombre: r.nombre, rut: r.rut, cargo: r.cargo, area: r.area,
        sueldo_base: r.sueldo_base, fecha_ingreso: new Date().toISOString().slice(0, 10),
        activo: String(r.estado).toLowerCase() !== "inactivo",
      }));
      const { error, data } = await supabase.from("empleados").insert(payload).select();
      if (error) return { inserted: 0, failed: rows.length, details: error.message };
      return { inserted: data?.length ?? 0, failed: rows.length - (data?.length ?? 0) };
    },
  },
  {
    id: "asistencia",
    label: "Asistencia",
    desc: "Importa marcajes desde Geovictoria u otros sistemas. Se asocia por RUT.",
    columns: [
      { key: "nombre", label: "nombre" },
      { key: "rut", label: "rut", required: true },
      { key: "fecha", label: "fecha", required: true, type: "date" },
      { key: "hora_entrada", label: "hora_entrada", required: true },
      { key: "hora_salida", label: "hora_salida", required: true },
    ],
    validate: (rows) => rows.map((r) => {
      const errors: string[] = [];
      const fecha = toIsoDate(r.fecha);
      const norm = {
        nombre: reqString(r.nombre),
        rut: reqString(r.rut),
        fecha,
        hora_entrada: reqString(r.hora_entrada),
        hora_salida: reqString(r.hora_salida),
      };
      if (!norm.rut) errors.push("rut vacío");
      if (!fecha) errors.push("fecha inválida");
      if (!norm.hora_entrada) errors.push("hora_entrada vacía");
      if (!norm.hora_salida) errors.push("hora_salida vacía");
      return { row: norm, errors };
    }),
    importer: async (rows) => {
      const ruts = Array.from(new Set(rows.map((r) => r.rut as string)));
      const { data: emps } = await supabase.from("empleados").select("id,rut").in("rut", ruts);
      const map = new Map((emps ?? []).map((e: { id: string; rut: string }) => [e.rut, e.id]));
      const payload = rows.flatMap((r) => {
        const empleado_id = map.get(r.rut as string);
        if (!empleado_id) return [];
        return [{
          empleado_id, fecha: r.fecha as string,
          entrada: r.hora_entrada as string,
          salida: r.hora_salida as string,
          estado: "presente",
        }];
      });
      if (payload.length === 0) return { inserted: 0, failed: rows.length, details: "Ningún RUT coincide con un empleado existente." };
      const { error, data } = await supabase.from("asistencia").insert(payload).select();
      if (error) return { inserted: 0, failed: rows.length, details: error.message };
      return { inserted: data?.length ?? 0, failed: rows.length - (data?.length ?? 0) };
    },
  },
  {
    id: "productos",
    label: "Productos / Servicios",
    desc: "Carga catálogo para usar en Caja y Simulador financiero.",
    columns: [
      { key: "nombre", label: "nombre", required: true },
      { key: "tipo", label: "tipo" },
      { key: "precio_venta", label: "precio_venta", type: "number", required: true },
      { key: "costo_variable", label: "costo_variable", type: "number" },
      { key: "unidad", label: "unidad" },
    ],
    validate: (rows) => rows.map((r) => {
      const errors: string[] = [];
      const norm = {
        nombre: reqString(r.nombre),
        tipo: reqString(r.tipo) || "Servicio",
        precio_venta: toNumber(r.precio_venta),
        costo_variable: r.costo_variable != null && r.costo_variable !== "" ? toNumber(r.costo_variable) : 0,
        unidad: reqString(r.unidad) || "Unidad",
        activo: true,
      };
      if (!norm.nombre) errors.push("nombre vacío");
      if (Number.isNaN(norm.precio_venta)) errors.push("precio_venta inválido");
      return { row: norm, errors };
    }),
    importer: localImporter("vertice.simulador.items"),
  },
  {
    id: "costos",
    label: "Costos históricos",
    desc: "Importa costos por mes para análisis financiero.",
    columns: [
      { key: "concepto", label: "concepto", required: true },
      { key: "area", label: "area" },
      { key: "categoria", label: "categoria" },
      { key: "tipo", label: "tipo" },
      { key: "monto", label: "monto", type: "number", required: true },
      { key: "mes", label: "mes", required: true },
    ],
    validate: (rows) => rows.map((r) => {
      const errors: string[] = [];
      const mes = toMonth(r.mes);
      const norm = {
        concepto: reqString(r.concepto),
        area: reqString(r.area) || "—",
        categoria: reqString(r.categoria) || "Otros",
        tipo: reqString(r.tipo) || "Variable",
        monto: toNumber(r.monto),
        mes,
      };
      if (!norm.concepto) errors.push("concepto vacío");
      if (Number.isNaN(norm.monto)) errors.push("monto inválido");
      if (!mes) errors.push("mes inválido (use AAAA-MM)");
      return { row: norm, errors };
    }),
    importer: async (rows) => {
      const { error, data } = await supabase.from("costos").insert(rows).select();
      if (error) return { inserted: 0, failed: rows.length, details: error.message };
      return { inserted: data?.length ?? 0, failed: rows.length - (data?.length ?? 0) };
    },
  },
  {
    id: "ingresos",
    label: "Ingresos históricos",
    desc: "Importa ingresos por mes para reportes y balance.",
    columns: [
      { key: "concepto", label: "concepto", required: true },
      { key: "categoria", label: "categoria" },
      { key: "monto", label: "monto", type: "number", required: true },
      { key: "mes", label: "mes", required: true },
    ],
    validate: (rows) => rows.map((r) => {
      const errors: string[] = [];
      const mes = toMonth(r.mes);
      const norm = {
        concepto: reqString(r.concepto),
        categoria: reqString(r.categoria) || "Ventas",
        monto: toNumber(r.monto),
        mes,
      };
      if (!norm.concepto) errors.push("concepto vacío");
      if (Number.isNaN(norm.monto)) errors.push("monto inválido");
      if (!mes) errors.push("mes inválido (use AAAA-MM)");
      return { row: norm, errors };
    }),
    importer: async (rows) => {
      const { error, data } = await supabase.from("ingresos").insert(rows).select();
      if (error) return { inserted: 0, failed: rows.length, details: error.message };
      return { inserted: data?.length ?? 0, failed: rows.length - (data?.length ?? 0) };
    },
  },
  {
    id: "activos",
    label: "Activos fijos",
    desc: "Carga activos fijos para el módulo Inventario y Balance.",
    columns: [
      { key: "nombre", label: "nombre", required: true },
      { key: "tipo", label: "tipo" },
      { key: "valor_compra", label: "valor_compra", type: "number", required: true },
      { key: "fecha_compra", label: "fecha_compra", required: true, type: "date" },
      { key: "vida_util_anos", label: "vida_util_anos", type: "number" },
      { key: "estado", label: "estado" },
    ],
    validate: (rows) => rows.map((r) => {
      const errors: string[] = [];
      const fecha = toIsoDate(r.fecha_compra);
      const norm = {
        nombre: reqString(r.nombre),
        tipo: reqString(r.tipo) || "Otro",
        valor: toNumber(r.valor_compra),
        fecha_compra: fecha,
        vida_util: r.vida_util_anos != null && r.vida_util_anos !== "" ? toNumber(r.vida_util_anos) : 5,
        estado: reqString(r.estado) || "En uso",
        ubicacion: "", serie: "",
      };
      if (!norm.nombre) errors.push("nombre vacío");
      if (Number.isNaN(norm.valor)) errors.push("valor_compra inválido");
      if (!fecha) errors.push("fecha_compra inválida");
      return { row: norm, errors };
    }),
    importer: localImporter("vertice.inventario.activos"),
  },
];

function ImportarPage() {
  return (
    <PageShell>
      <PageHeader
        title="Importar datos"
        description="Carga masiva desde planillas Excel. Descarga la plantilla, completa y vuelve a subirla."
      />
      <Tabs defaultValue={SPECS[0].id} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          {SPECS.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
        </TabsList>
        {SPECS.map((s) => (
          <TabsContent key={s.id} value={s.id}>
            <ImportTab spec={s} />
          </TabsContent>
        ))}
      </Tabs>
    </PageShell>
  );
}

type ParsedRow = { row: Record<string, unknown>; errors: string[] };

function ImportTab({ spec }: { spec: ImportSpec }) {
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number; details?: string } | null>(null);

  const downloadTemplate = () => {
    const headers = spec.columns.map((c) => c.label);
    const example: Record<string, string> = {};
    headers.forEach((h) => (example[h] = ""));
    const ws = XLSX.utils.json_to_sheet([example], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spec.label);
    XLSX.writeFile(wb, `plantilla_${spec.id}.xlsx`);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
      if (rows.length === 0) { toast.error("La planilla está vacía."); return; }
      setParsed(spec.validate(rows));
    } catch (err) {
      toast.error("No se pudo leer la planilla: " + (err as Error).message);
    } finally {
      e.target.value = "";
    }
  };

  const valid = parsed?.filter((p) => p.errors.length === 0) ?? [];
  const invalid = parsed?.filter((p) => p.errors.length > 0) ?? [];

  const confirmar = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    const r = await spec.importer(valid.map((v) => v.row));
    setImporting(false);
    setResult(r);
    if (r.inserted > 0) toast.success(`${r.inserted} registros importados`);
    if (r.details) toast.error(r.details);
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" />{spec.label}</h3>
          <p className="text-sm text-muted-foreground">{spec.desc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" />Descargar plantilla Excel</Button>
          <label className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90">
            <Upload className="h-4 w-4" />Subir archivo
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
          </label>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Columnas esperadas:&nbsp;
        {spec.columns.map((c, i) => (
          <span key={c.key}>
            <code className="px-1 py-0.5 rounded bg-muted">{c.label}</code>{c.required && <span className="text-destructive">*</span>}
            {i < spec.columns.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>

      {parsed && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />{valid.length} válidos</Badge>
            {invalid.length > 0 && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{invalid.length} con errores</Badge>}
            <span className="text-muted-foreground">Vista previa de las primeras 5 filas:</span>
          </div>

          <div className="border rounded-md overflow-auto max-h-96">
            <Table>
              <TableHeader><TableRow>
                {spec.columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead>Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {parsed.slice(0, 5).map((p, i) => (
                  <TableRow key={i} className={p.errors.length ? "bg-destructive/5" : ""}>
                    {spec.columns.map((c) => (
                      <TableCell key={c.key} className={p.errors.some((e) => e.toLowerCase().includes(c.key)) ? "text-destructive" : ""}>
                        {String((p.row[c.key] ?? "") as string | number)}
                      </TableCell>
                    ))}
                    <TableCell>
                      {p.errors.length === 0
                        ? <span className="text-success text-xs">OK</span>
                        : <span className="text-destructive text-xs">{p.errors.join(", ")}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => { setParsed(null); setResult(null); }}>Cancelar</Button>
            <Button onClick={confirmar} disabled={valid.length === 0 || importing}>
              {importing ? "Importando…" : `Confirmar e importar ${valid.length} registros`}
            </Button>
          </div>
        </>
      )}

      {result && (
        <Alert className="border-success/40 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle>Importación finalizada</AlertTitle>
          <AlertDescription>
            {result.inserted} registros importados correctamente
            {result.failed > 0 ? `, ${result.failed} con errores` : ""}.
            {result.details && <div className="mt-1 text-destructive text-xs">{result.details}</div>}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
