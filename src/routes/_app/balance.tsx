import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, CheckCircle2, AlertTriangle, FileDown } from "lucide-react";
import { formatCLP } from "@/lib/domain";
import { useLocalList, useLocalValue, uid } from "@/lib/local-store";
import { useEmpresa } from "@/hooks/use-empresa";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/balance")({ component: BalancePage });

type Item = { id: string; concepto: string; valor: number; tipo: "Corriente" | "No corriente"; vencimiento?: string };

function BalancePage() {
  const { empresa } = useEmpresa();

  // Editable values
  const [caja, setCaja] = useLocalValue<number>("vertice.balance.caja", 0);
  const [porCobrar, setPorCobrar] = useLocalValue<number>("vertice.balance.porCobrar", 0);
  const [otrosActivos, setOtrosActivos] = useLocalValue<number>("vertice.balance.otrosActivos", 0);
  const [porPagar, setPorPagar] = useLocalValue<number>("vertice.balance.porPagar", 0);
  const [prestamos, setPrestamos] = useLocalValue<number>("vertice.balance.prestamos", 0);
  const [deudasLP, setDeudasLP] = useLocalValue<number>("vertice.balance.deudasLP", 0);
  const [capital, setCapital] = useLocalValue<number>("vertice.balance.capital", 0);

  const [activosExtra, setActivosExtra] = useLocalList<Item>("vertice.balance.activosExtra", []);
  const [pasivosExtra, setPasivosExtra] = useLocalList<Item>("vertice.balance.pasivosExtra", []);

  // Linked totals
  const inventarioVal = useMemo(() => {
    try {
      const ps = JSON.parse(localStorage.getItem("vertice.inventario.productos") ?? "[]");
      return (ps as Array<{ stock: number; precio: number }>).reduce((s, p) => s + p.stock * p.precio, 0);
    } catch { return 0; }
  }, []);
  const activosFijosVal = useMemo(() => {
    try {
      const as = JSON.parse(localStorage.getItem("vertice.inventario.activos") ?? "[]");
      return (as as Array<{ valor: number; vida_util: number; fecha_compra: string }>).reduce((s, a) => {
        const anios = Math.max(0, (Date.now() - new Date(a.fecha_compra).getTime()) / (365.25 * 86400000));
        const acum = Math.min(a.valor, (a.vida_util ? a.valor / a.vida_util : 0) * anios);
        return s + Math.max(0, a.valor - acum);
      }, 0);
    } catch { return 0; }
  }, []);

  const [sueldosPendientes, setSueldosPendientes] = useState(0);
  const [utilidad, setUtilidad] = useState(0);
  useEffect(() => {
    const periodo = new Date().toISOString().slice(0, 7);
    supabase.from("liquidaciones").select("liquido, periodo").eq("periodo", periodo).then(({ data }) => {
      setSueldosPendientes((data ?? []).reduce((s: number, l: { liquido: number }) => s + (l.liquido || 0), 0));
    });
    Promise.all([
      supabase.from("ingresos").select("monto"),
      supabase.from("costos").select("monto"),
      supabase.from("gastos").select("monto"),
    ]).then(([i, c, g]) => {
      const sum = (a: { data: { monto: number }[] | null }) => (a.data ?? []).reduce((s, r) => s + (r.monto || 0), 0);
      setUtilidad(sum(i as never) - sum(c as never) - sum(g as never));
    }).catch(() => { /* tables may not exist yet */ });
  }, []);

  const corrientesActivos = caja + porCobrar + inventarioVal + activosExtra.filter((a) => a.tipo === "Corriente").reduce((s, a) => s + a.valor, 0);
  const noCorrientesActivos = activosFijosVal + otrosActivos + activosExtra.filter((a) => a.tipo === "No corriente").reduce((s, a) => s + a.valor, 0);
  const totalActivos = corrientesActivos + noCorrientesActivos;

  const corrientesPasivos = porPagar + sueldosPendientes + pasivosExtra.filter((p) => p.tipo === "Corriente").reduce((s, p) => s + p.valor, 0);
  const noCorrientesPasivos = prestamos + deudasLP + pasivosExtra.filter((p) => p.tipo === "No corriente").reduce((s, p) => s + p.valor, 0);
  const totalPasivos = corrientesPasivos + noCorrientesPasivos;

  const totalPatrimonio = capital + utilidad;
  const total = totalPasivos + totalPatrimonio;
  const balanced = Math.abs(totalActivos - total) < 1;

  const exportarPDF = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const row = (l: string, v: number, b = false) => `<tr><td style="padding:6px 12px;${b ? "font-weight:600;border-top:1px solid #ddd" : ""}">${l}</td><td style="padding:6px 12px;text-align:right;${b ? "font-weight:600;border-top:1px solid #ddd" : ""}">${formatCLP(v)}</td></tr>`;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Balance</title>
<style>body{font-family:Georgia,serif;color:#1a2238;max-width:780px;margin:40px auto;padding:0 20px}
h1{color:#185FA5;margin:0 0 4px} h2{color:#185FA5;font-size:14px;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 6px;border-bottom:2px solid #185FA5;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:13px} .total{background:#f1f5f9;font-weight:700} .final{background:#185FA5;color:#fff;font-size:16px}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center">
  <div><h1>Balance General</h1><div style="font-size:12px;color:#555">${empresa.nombre} · ${empresa.rut}</div><div style="font-size:11px;color:#888">${new Date().toLocaleDateString("es-CL")}</div></div>
  ${empresa.logo_url ? `<img src="${empresa.logo_url}" style="height:60px"/>` : ""}
</div>
<h2>Activos</h2><table>${row("Caja / Banco", caja)}${row("Cuentas por cobrar", porCobrar)}${row("Inventario", inventarioVal)}${activosExtra.filter((a) => a.tipo === "Corriente").map((a) => row(a.concepto, a.valor)).join("")}${row("Total corrientes", corrientesActivos, true)}${row("Activos fijos", activosFijosVal)}${row("Otros activos", otrosActivos)}${activosExtra.filter((a) => a.tipo === "No corriente").map((a) => row(a.concepto, a.valor)).join("")}${row("Total no corrientes", noCorrientesActivos, true)}<tr class="total">${row("TOTAL ACTIVOS", totalActivos, true)}</tr></table>
<h2>Pasivos</h2><table>${row("Cuentas por pagar", porPagar)}${row("Sueldos por pagar", sueldosPendientes)}${pasivosExtra.filter((p) => p.tipo === "Corriente").map((p) => row(p.concepto, p.valor)).join("")}${row("Total corrientes", corrientesPasivos, true)}${row("Préstamos", prestamos)}${row("Deudas largo plazo", deudasLP)}${pasivosExtra.filter((p) => p.tipo === "No corriente").map((p) => row(p.concepto, p.valor)).join("")}${row("Total no corrientes", noCorrientesPasivos, true)}<tr class="total">${row("TOTAL PASIVOS", totalPasivos, true)}</tr></table>
<h2>Patrimonio</h2><table>${row("Capital", capital)}${row("Utilidad del período", utilidad)}<tr class="total">${row("TOTAL PATRIMONIO", totalPatrimonio, true)}</tr></table>
<h2>Balance final</h2><table><tr class="final"><td style="padding:14px 12px">Activos</td><td style="padding:14px 12px;text-align:right">${formatCLP(totalActivos)}</td></tr><tr class="final"><td style="padding:14px 12px">Pasivos + Patrimonio</td><td style="padding:14px 12px;text-align:right">${formatCLP(total)}</td></tr></table>
<p style="margin-top:20px;font-size:12px;color:${balanced ? "#16a34a" : "#dc2626"};font-weight:600">${balanced ? "✓ Balance cuadrado" : "⚠ Balance descuadrado: diferencia " + formatCLP(totalActivos - total)}</p>
<p style="margin-top:60px;font-size:11px;color:#666;text-align:center">${empresa.direccion ?? ""}</p>
</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  return (
    <PageShell>
      <PageHeader
        title="Balance (Activos y Pasivos)"
        description="Estado financiero consolidado al día."
        actions={<Button onClick={exportarPDF}><FileDown className="h-4 w-4" /> Exportar balance PDF</Button>}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* ACTIVOS */}
        <Card className="p-5 space-y-4">
          <SectionTitle>Activos</SectionTitle>
          <SubTitle>Corrientes</SubTitle>
          <RowInput label="Caja / Banco" value={caja} onChange={setCaja} />
          <RowInput label="Cuentas por cobrar" value={porCobrar} onChange={setPorCobrar} />
          <RowReadOnly label="Inventario (auto)" value={inventarioVal} />
          {activosExtra.filter((a) => a.tipo === "Corriente").map((a) => (
            <RowItem key={a.id} item={a} onDelete={() => setActivosExtra((p) => p.filter((x) => x.id !== a.id))} />
          ))}
          <SubTitle>No corrientes</SubTitle>
          <RowReadOnly label="Activos fijos (auto)" value={activosFijosVal} />
          <RowInput label="Otros activos" value={otrosActivos} onChange={setOtrosActivos} />
          {activosExtra.filter((a) => a.tipo === "No corriente").map((a) => (
            <RowItem key={a.id} item={a} onDelete={() => setActivosExtra((p) => p.filter((x) => x.id !== a.id))} />
          ))}
          <ItemDialog title="Agregar activo" onSave={(it) => { setActivosExtra((p) => [it, ...p]); toast.success("Activo agregado"); }} />
          <Total label="Total activos" value={totalActivos} />
        </Card>

        {/* PASIVOS */}
        <Card className="p-5 space-y-4">
          <SectionTitle>Pasivos</SectionTitle>
          <SubTitle>Corrientes</SubTitle>
          <RowInput label="Cuentas por pagar" value={porPagar} onChange={setPorPagar} />
          <RowReadOnly label="Sueldos por pagar (auto)" value={sueldosPendientes} />
          {pasivosExtra.filter((p) => p.tipo === "Corriente").map((p) => (
            <RowItem key={p.id} item={p} onDelete={() => setPasivosExtra((x) => x.filter((y) => y.id !== p.id))} />
          ))}
          <SubTitle>No corrientes</SubTitle>
          <RowInput label="Préstamos" value={prestamos} onChange={setPrestamos} />
          <RowInput label="Deudas largo plazo" value={deudasLP} onChange={setDeudasLP} />
          {pasivosExtra.filter((p) => p.tipo === "No corriente").map((p) => (
            <RowItem key={p.id} item={p} onDelete={() => setPasivosExtra((x) => x.filter((y) => y.id !== p.id))} />
          ))}
          <ItemDialog title="Agregar pasivo" withVencimiento onSave={(it) => { setPasivosExtra((p) => [it, ...p]); toast.success("Pasivo agregado"); }} />
          <Total label="Total pasivos" value={totalPasivos} />
        </Card>

        {/* PATRIMONIO */}
        <Card className="p-5 space-y-4 lg:col-span-2">
          <SectionTitle>Patrimonio</SectionTitle>
          <div className="grid md:grid-cols-2 gap-3">
            <RowInput label="Capital" value={capital} onChange={setCapital} />
            <RowReadOnly label="Utilidad del período (auto)" value={utilidad} />
          </div>
          <Total label="Total patrimonio" value={totalPatrimonio} />
        </Card>
      </div>

      {/* BALANCE FINAL */}
      <Card className={`mt-6 p-6 border-2 ${balanced ? "border-success" : "border-destructive"}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Balance final</div>
            <div className="text-2xl font-semibold">
              {formatCLP(totalActivos)} <span className="text-muted-foreground text-base font-normal">=</span> {formatCLP(total)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Total Activos = Total Pasivos + Patrimonio</div>
          </div>
          {balanced ? (
            <Badge className="bg-success text-success-foreground gap-1 px-3 py-1.5 text-sm"><CheckCircle2 className="h-4 w-4" /> Balance cuadrado</Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 px-3 py-1.5 text-sm">
              <AlertTriangle className="h-4 w-4" /> Descuadre: {formatCLP(totalActivos - total)}
            </Badge>
          )}
        </div>
      </Card>
    </PageShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight">{children}</h2>;
}
function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">{children}</div>;
}
function RowInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="flex-1 text-sm">{label}</Label>
      <Input type="number" className="w-44 text-right" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
function RowReadOnly({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="flex-1 text-sm text-muted-foreground">{label}</Label>
      <div className="w-44 text-right text-sm font-medium tabular-nums">{formatCLP(value)}</div>
    </div>
  );
}
function RowItem({ item, onDelete }: { item: Item; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm">{item.concepto}</span>
      <span className="w-44 text-right text-sm font-medium tabular-nums">{formatCLP(item.valor)}</span>
      <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}
function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-t pt-3">
      <span className="font-semibold">{label}</span>
      <span className="font-semibold tabular-nums">{formatCLP(value)}</span>
    </div>
  );
}

function ItemDialog({ title, onSave, withVencimiento }: { title: string; onSave: (it: Item) => void; withVencimiento?: boolean }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Item>({ id: uid(), concepto: "", valor: 0, tipo: "Corriente", vencimiento: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full"><Plus className="h-4 w-4" /> {title}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Concepto</Label><Input value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Valor (CLP)</Label><Input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} /></div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Item["tipo"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Corriente">Corriente</SelectItem><SelectItem value="No corriente">No corriente</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {withVencimiento && (
            <div><Label className="text-xs">Fecha vencimiento</Label><Input type="date" value={f.vencimiento} onChange={(e) => setF({ ...f, vencimiento: e.target.value })} /></div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => { onSave(f); setOpen(false); setF({ id: uid(), concepto: "", valor: 0, tipo: "Corriente", vencimiento: "" }); }} disabled={!f.concepto || !f.valor}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
