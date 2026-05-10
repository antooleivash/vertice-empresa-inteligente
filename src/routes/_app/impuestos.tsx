import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEmpresa } from "@/hooks/use-empresa";
import { Plus, FileDown, Info, CheckCircle2, History } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend, ResponsiveContainer, CartesianGrid, ComposedChart, Line,
} from "recharts";

export const Route = createFileRoute("/_app/impuestos")({ component: ImpuestosPage });

type Doc = {
  id: string;
  tipo_operacion: "Venta" | "Compra";
  tipo_documento: string;
  numero_documento: string;
  fecha: string;
  rut_contraparte: string;
  nombre_contraparte: string;
  concepto: string;
  monto_neto: number;
  monto_iva: number;
  total: number;
  mes: string;
  estado: string;
  created_at?: string;
};

type Declaracion = {
  id: string;
  mes: string;
  iva_debito: number;
  iva_credito: number;
  balance: number;
  estado: "Pendiente" | "Declarado";
  fecha_declaracion?: string | null;
};

const TIPOS_VENTA = ["Boleta", "Factura", "Boleta exenta", "Factura exenta"];
const TIPOS_COMPRA = ["Factura", "Boleta de compra", "Nota de débito", "Nota de crédito"];
const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmtCLP = (n: number) =>
  "$" + new Intl.NumberFormat("es-CL").format(Math.round(n || 0));

const mesKey = (iso: string) => iso?.slice(0, 7) ?? "";
const mesLabel = (k: string) => {
  if (!k) return "";
  const [y, m] = k.split("-");
  return `${MESES_NOMBRE[parseInt(m, 10) - 1]} ${y}`;
};
const currentMes = () => new Date().toISOString().slice(0, 7);
const nextMonthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `12 de ${MESES_NOMBRE[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
};

function MontoInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Input
      inputMode="numeric"
      placeholder="0"
      value={value ? new Intl.NumberFormat("es-CL").format(value) : ""}
      onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
    />
  );
}

function ImpuestosPage() {
  const { empresa } = useEmpresa();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [decls, setDecls] = useState<Declaracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMes, setFilterMes] = useState<string>(currentMes());
  const [balanceMes, setBalanceMes] = useState<string>(currentMes());

  const [openVenta, setOpenVenta] = useState(false);
  const [openCompra, setOpenCompra] = useState(false);

  const emptyVenta = (): Omit<Doc, "id" | "created_at"> => ({
    tipo_operacion: "Venta",
    tipo_documento: "Boleta",
    numero_documento: "",
    fecha: new Date().toISOString().slice(0, 10),
    rut_contraparte: "",
    nombre_contraparte: "",
    concepto: "",
    monto_neto: 0,
    monto_iva: 0,
    total: 0,
    mes: currentMes(),
    estado: "Vigente",
  });
  const emptyCompra = (): Omit<Doc, "id" | "created_at"> => ({
    ...emptyVenta(),
    tipo_operacion: "Compra",
    tipo_documento: "Factura",
  });
  const [formV, setFormV] = useState(emptyVenta());
  const [formC, setFormC] = useState(emptyCompra());

  // recompute IVA & total when neto changes
  const setNetoV = (neto: number) => {
    const iva = Math.round(neto * 0.19);
    setFormV((f) => ({ ...f, monto_neto: neto, monto_iva: iva, total: neto + iva }));
  };
  const setNetoC = (neto: number) => {
    const iva = Math.round(neto * 0.19);
    setFormC((f) => ({ ...f, monto_neto: neto, monto_iva: iva, total: neto + iva }));
  };

  const load = async () => {
    setLoading(true);
    const [d1, d2] = await Promise.all([
      supabase.from("documentos_tributarios").select("*").order("fecha", { ascending: false }),
      supabase.from("declaraciones_iva").select("*").order("mes", { ascending: false }),
    ]);
    if (d1.error) {
      console.warn(d1.error);
      toast.error("Tabla 'documentos_tributarios' no disponible. Aplica la migración SQL del módulo Impuestos.");
    } else setDocs((d1.data as Doc[]) ?? []);
    if (!d2.error) setDecls((d2.data as Declaracion[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveVenta = async () => {
    if (!formV.numero_documento) return toast.error("Ingresa el número de documento");
    if (!formV.monto_neto) return toast.error("Ingresa el monto neto");
    const payload = { ...formV, mes: mesKey(formV.fecha) };
    const { error } = await supabase.from("documentos_tributarios").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Venta registrada");
    setOpenVenta(false);
    setFormV(emptyVenta());
    load();
  };
  const saveCompra = async () => {
    if (!formC.numero_documento) return toast.error("Ingresa el número de documento");
    if (!formC.monto_neto) return toast.error("Ingresa el monto neto");
    const payload = { ...formC, mes: mesKey(formC.fecha) };
    const { error } = await supabase.from("documentos_tributarios").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Compra registrada");
    setOpenCompra(false);
    setFormC(emptyCompra());
    load();
  };

  const ventas = useMemo(() => docs.filter((d) => d.tipo_operacion === "Venta"), [docs]);
  const compras = useMemo(() => docs.filter((d) => d.tipo_operacion === "Compra"), [docs]);

  const ventasMes = ventas.filter((d) => mesKey(d.fecha) === filterMes);
  const comprasMes = compras.filter((d) => mesKey(d.fecha) === filterMes);

  const totalDebito = ventasMes.reduce((s, d) => s + (d.monto_iva || 0), 0);
  const totalCredito = comprasMes.reduce((s, d) => s + (d.monto_iva || 0), 0);

  // F29 balance
  const ventasBal = ventas.filter((d) => mesKey(d.fecha) === balanceMes);
  const comprasBal = compras.filter((d) => mesKey(d.fecha) === balanceMes);
  const netoVentasBal = ventasBal.reduce((s, d) => s + (d.monto_neto || 0), 0);
  const netoComprasBal = comprasBal.reduce((s, d) => s + (d.monto_neto || 0), 0);
  const debitoBal = ventasBal.reduce((s, d) => s + (d.monto_iva || 0), 0);
  const creditoBal = comprasBal.reduce((s, d) => s + (d.monto_iva || 0), 0);
  const resultado = debitoBal - creditoBal;

  // Annual breakdown
  const annualData = useMemo(() => {
    const map = new Map<string, { mes: string; debito: number; credito: number }>();
    docs.forEach((d) => {
      const m = mesKey(d.fecha);
      if (!m) return;
      const cur = map.get(m) ?? { mes: m, debito: 0, credito: 0 };
      if (d.tipo_operacion === "Venta") cur.debito += d.monto_iva || 0;
      else cur.credito += d.monto_iva || 0;
      map.set(m, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [docs]);

  const totalAnnualDebito = annualData.reduce((s, r) => s + r.debito, 0);
  const totalAnnualCredito = annualData.reduce((s, r) => s + r.credito, 0);

  const declMap = useMemo(() => {
    const m = new Map<string, Declaracion>();
    decls.forEach((d) => m.set(d.mes, d));
    return m;
  }, [decls]);

  const marcarDeclarado = async (mes: string, debito: number, credito: number) => {
    const balance = debito - credito;
    const existing = declMap.get(mes);
    const payload = {
      mes,
      iva_debito: debito,
      iva_credito: credito,
      balance,
      estado: "Declarado" as const,
      fecha_declaracion: new Date().toISOString().slice(0, 10),
    };
    if (existing) {
      const { error } = await supabase.from("declaraciones_iva").update(payload).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("declaraciones_iva").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(`${mesLabel(mes)} marcado como declarado`);
    load();
  };

  const exportarF29 = () => {
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>F29 ${mesLabel(balanceMes)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:40px;max-width:780px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#64748b;font-size:13px;margin-bottom:24px}
  .box{border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-top:16px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e2e8f0}
  .row:last-child{border:0}
  .lbl{color:#475569}
  .val{font-variant-numeric:tabular-nums;font-weight:600}
  .h2{font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#185FA5;margin:18px 0 8px;font-weight:700}
  .res{font-size:18px;font-weight:700;padding:14px;border-radius:8px;margin-top:12px;display:flex;justify-content:space-between}
  .pagar{background:#fee2e2;color:#991b1b}
  .favor{background:#dcfce7;color:#166534}
  .footer{margin-top:24px;color:#64748b;font-size:12px;text-align:center}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #185FA5;padding-bottom:12px}
</style></head><body>
<div class="head">
  <div>
    <h1>${empresa.nombre || "Empresa"}</h1>
    <div class="sub">${empresa.rut || ""} · ${empresa.direccion || ""}</div>
  </div>
  <div style="text-align:right">
    <div style="font-weight:700">FORMULARIO 29</div>
    <div class="sub">Declaración mensual de IVA</div>
  </div>
</div>
<div class="box">
  <div style="font-size:18px;font-weight:700;text-align:center">DECLARACIÓN IVA — ${mesLabel(balanceMes).toUpperCase()}</div>
</div>
<div class="box">
  <div class="h2">Débito Fiscal (Ventas)</div>
  <div class="row"><span class="lbl">Ventas afectas (neto)</span><span class="val">${fmtCLP(netoVentasBal)}</span></div>
  <div class="row"><span class="lbl">IVA débito 19%</span><span class="val">${fmtCLP(debitoBal)}</span></div>

  <div class="h2">Crédito Fiscal (Compras)</div>
  <div class="row"><span class="lbl">Compras afectas (neto)</span><span class="val">${fmtCLP(netoComprasBal)}</span></div>
  <div class="row"><span class="lbl">IVA crédito 19%</span><span class="val">${fmtCLP(creditoBal)}</span></div>

  <div class="res ${resultado >= 0 ? "pagar" : "favor"}">
    <span>${resultado >= 0 ? "IVA a pagar al SII" : "Remanente IVA a favor"}</span>
    <span>${fmtCLP(Math.abs(resultado))}</span>
  </div>
</div>
<div class="footer">Fecha límite de declaración: ${nextMonthLabel(balanceMes)} · Documento informativo generado por Vértice</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`);
    w.document.close();
  };

  return (
    <PageShell>
      <PageHeader title="Impuestos" description="Documentos tributarios, IVA débito y crédito, balance F29 mensual." />
      <UTMBanner />


      <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-900">
        <Info className="h-4 w-4" />
        <AlertTitle>IVA Chile · 19%</AlertTitle>
        <AlertDescription>
          Vértice calcula tu balance de IVA mensual a partir de los documentos registrados. La declaración oficial debe presentarse en el SII hasta el día 12 del mes siguiente.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ventas">Ventas (Débito)</TabsTrigger>
          <TabsTrigger value="compras">Compras (Crédito)</TabsTrigger>
          <TabsTrigger value="balance">Balance IVA (F29)</TabsTrigger>
          <TabsTrigger value="historial">Historial anual</TabsTrigger>
        </TabsList>

        {/* Ventas */}
        <TabsContent value="ventas" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Label>Filtrar por mes</Label>
              <Input type="month" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Card className="px-4 py-2 border-blue-200 bg-blue-50">
                <div className="text-xs text-blue-700">IVA débito {mesLabel(filterMes)}</div>
                <div className="text-xl font-bold text-blue-900">{fmtCLP(totalDebito)}</div>
              </Card>
              <Dialog open={openVenta} onOpenChange={setOpenVenta}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" />Agregar venta manual</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar venta</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Fecha</Label><Input type="date" value={formV.fecha} onChange={(e) => setFormV({ ...formV, fecha: e.target.value })} /></div>
                      <div>
                        <Label>Tipo documento</Label>
                        <Select value={formV.tipo_documento} onValueChange={(v) => setFormV({ ...formV, tipo_documento: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS_VENTA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>N° documento</Label><Input value={formV.numero_documento} onChange={(e) => setFormV({ ...formV, numero_documento: e.target.value })} /></div>
                      <div><Label>Cliente</Label><Input value={formV.nombre_contraparte} onChange={(e) => setFormV({ ...formV, nombre_contraparte: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Monto neto</Label><MontoInput value={formV.monto_neto} onChange={setNetoV} /></div>
                      <div><Label>IVA 19%</Label><MontoInput value={formV.monto_iva} onChange={(n) => setFormV((f) => ({ ...f, monto_iva: n, total: f.monto_neto + n }))} /></div>
                      <div><Label>Total</Label><Input readOnly value={fmtCLP(formV.total)} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={saveVenta}>Guardar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>N°</TableHead>
                <TableHead>Cliente</TableHead><TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">IVA</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ventasMes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{loading ? "Cargando..." : "Sin ventas registradas en este mes."}</TableCell></TableRow>}
                {ventasMes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.fecha}</TableCell>
                    <TableCell><Badge variant="outline">{d.tipo_documento}</Badge></TableCell>
                    <TableCell>{d.numero_documento}</TableCell>
                    <TableCell>{d.nombre_contraparte}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCLP(d.monto_neto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCLP(d.monto_iva)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtCLP(d.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Compras */}
        <TabsContent value="compras" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Label>Filtrar por mes</Label>
              <Input type="month" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Card className="px-4 py-2 border-red-200 bg-red-50">
                <div className="text-xs text-red-700">IVA crédito {mesLabel(filterMes)}</div>
                <div className="text-xl font-bold text-red-900">{fmtCLP(totalCredito)}</div>
              </Card>
              <Dialog open={openCompra} onOpenChange={setOpenCompra}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" />Agregar compra/gasto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar compra</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Fecha</Label><Input type="date" value={formC.fecha} onChange={(e) => setFormC({ ...formC, fecha: e.target.value })} /></div>
                      <div>
                        <Label>Tipo documento</Label>
                        <Select value={formC.tipo_documento} onValueChange={(v) => setFormC({ ...formC, tipo_documento: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS_COMPRA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>N° documento</Label><Input value={formC.numero_documento} onChange={(e) => setFormC({ ...formC, numero_documento: e.target.value })} /></div>
                      <div><Label>RUT proveedor</Label><Input value={formC.rut_contraparte} onChange={(e) => setFormC({ ...formC, rut_contraparte: e.target.value })} placeholder="76.xxx.xxx-x" /></div>
                    </div>
                    <div><Label>Proveedor</Label><Input value={formC.nombre_contraparte} onChange={(e) => setFormC({ ...formC, nombre_contraparte: e.target.value })} /></div>
                    <div><Label>Concepto</Label><Input value={formC.concepto} onChange={(e) => setFormC({ ...formC, concepto: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Monto neto</Label><MontoInput value={formC.monto_neto} onChange={setNetoC} /></div>
                      <div><Label>IVA 19%</Label><MontoInput value={formC.monto_iva} onChange={(n) => setFormC((f) => ({ ...f, monto_iva: n, total: f.monto_neto + n }))} /></div>
                      <div><Label>Total</Label><Input readOnly value={fmtCLP(formC.total)} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={saveCompra}>Guardar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>N°</TableHead>
                <TableHead>Proveedor</TableHead><TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">IVA</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {comprasMes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{loading ? "Cargando..." : "Sin compras registradas en este mes."}</TableCell></TableRow>}
                {comprasMes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.fecha}</TableCell>
                    <TableCell><Badge variant="outline">{d.tipo_documento}</Badge></TableCell>
                    <TableCell>{d.numero_documento}</TableCell>
                    <TableCell>{d.nombre_contraparte}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCLP(d.monto_neto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCLP(d.monto_iva)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtCLP(d.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Balance F29 */}
        <TabsContent value="balance" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Mes a declarar</Label>
              <Input type="month" value={balanceMes} onChange={(e) => setBalanceMes(e.target.value)} className="w-48" />
            </div>
            <Button variant="outline" onClick={exportarF29}><FileDown className="h-4 w-4 mr-1" />Exportar F29 PDF</Button>
            <Button variant="outline" onClick={() => marcarDeclarado(balanceMes, debitoBal, creditoBal)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Marcar como declarado
            </Button>
          </div>

          <Card className="p-6">
            <div className="text-center mb-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Declaración IVA mensual</div>
              <div className="text-2xl font-bold">{mesLabel(balanceMes)}</div>
            </div>
            <div className="border-t border-dashed pt-4 space-y-1">
              <div className="text-sm font-semibold text-blue-700 uppercase tracking-wider mt-2">Débito fiscal (ventas)</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ventas afectas</span><span className="tabular-nums">{fmtCLP(netoVentasBal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA débito 19%</span><span className="tabular-nums font-semibold">{fmtCLP(debitoBal)}</span></div>

              <div className="text-sm font-semibold text-red-700 uppercase tracking-wider mt-4">Crédito fiscal (compras)</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Compras afectas</span><span className="tabular-nums">{fmtCLP(netoComprasBal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IVA crédito 19%</span><span className="tabular-nums font-semibold">{fmtCLP(creditoBal)}</span></div>

              <div className="border-t border-dashed mt-4 pt-4">
                <div className={`flex justify-between items-center p-4 rounded-lg ${resultado >= 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
                  <span className="font-semibold">{resultado >= 0 ? "IVA a pagar al SII" : "Remanente IVA a favor"}</span>
                  <span className="text-2xl font-bold tabular-nums">{fmtCLP(Math.abs(resultado))}</span>
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground mt-3">
                Fecha límite de declaración: <span className="font-medium">{nextMonthLabel(balanceMes)}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial" className="space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4" />IVA débito vs crédito por mes</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={annualData.map((r) => ({ ...r, mes: mesLabel(r.mes), balance: r.debito - r.credito }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => new Intl.NumberFormat("es-CL", { notation: "compact" }).format(v as number)} />
                  <RTooltip formatter={(v: number) => fmtCLP(v)} />
                  <Legend />
                  <Bar dataKey="debito" name="IVA débito" fill="#185FA5" />
                  <Bar dataKey="credito" name="IVA crédito" fill="#dc2626" />
                  <Line dataKey="balance" name="Balance" stroke="#0f172a" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">IVA débito</TableHead>
                <TableHead className="text-right">IVA crédito</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {annualData.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin datos.</TableCell></TableRow>}
                {annualData.map((r) => {
                  const bal = r.debito - r.credito;
                  const decl = declMap.get(r.mes);
                  return (
                    <TableRow key={r.mes}>
                      <TableCell>{mesLabel(r.mes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCLP(r.debito)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCLP(r.credito)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${bal >= 0 ? "text-red-600" : "text-green-600"}`}>
                        {fmtCLP(Math.abs(bal))} {bal >= 0 ? "a pagar" : "a favor"}
                      </TableCell>
                      <TableCell>
                        {decl?.estado === "Declarado"
                          ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Declarado</Badge>
                          : <Badge variant="outline">Pendiente</Badge>}
                      </TableCell>
                      <TableCell>
                        {decl?.estado !== "Declarado" && (
                          <Button size="sm" variant="ghost" onClick={() => marcarDeclarado(r.mes, r.debito, r.credito)}>
                            Marcar declarado
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {annualData.length > 0 && (
                <tfoot>
                  <TableRow>
                    <TableCell className="font-semibold">Total anual</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtCLP(totalAnnualDebito)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtCLP(totalAnnualCredito)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${totalAnnualDebito - totalAnnualCredito >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {fmtCLP(Math.abs(totalAnnualDebito - totalAnnualCredito))}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function UTMBanner() {
  // import inline pour éviter circular - server-fn ok with ESM
  const mod = require("@/hooks/use-indicadores") as typeof import("@/hooks/use-indicadores");
  const { data } = mod.useIndicadores();
  const utm = data.utm?.valor;
  if (!utm) return null;
  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
      <Info className="h-4 w-4" />
      <AlertTitle>UTM vigente: {fmtCLP(utm)}</AlertTitle>
      <AlertDescription>
        Las multas y reajustes del SII se calculan en UTM. Mantén este valor a la vista al evaluar contingencias tributarias.
      </AlertDescription>
    </Alert>
  );
}
