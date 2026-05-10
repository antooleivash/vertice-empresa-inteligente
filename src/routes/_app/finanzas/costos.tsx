import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado, Liquidacion } from "@/lib/domain";
import { formatCLP, formatDate } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/finanzas/costos")({ component: CostosPage });

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
const AREAS_OP = ["Producción", "Bodega", "Calidad", "Administración", "Logística"] as const;
const CATEGORIAS = ["Sueldos", "Horas extras", "Licencias", "Otros"] as const;

type Costo = {
  id: string; area: string; categoria: string; monto: number;
  mes: string; descripcion: string | null; created_at?: string;
};

const emptyCosto: Partial<Costo> = {
  area: AREAS_OP[0], categoria: CATEGORIAS[0], monto: 0,
  mes: new Date().toISOString().slice(0, 7), descripcion: "",
};

function CostosPage() {
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);
  const [costos, setCostos] = useState<Costo[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Costo>>(emptyCosto);

  const load = async () => {
    const [{ data: e }, { data: l }, { data: c }] = await Promise.all([
      supabase.from("empleados").select("*"),
      supabase.from("liquidaciones").select("*"),
      supabase.from("costos_operacionales").select("*").order("created_at", { ascending: false }),
    ]);
    setEmps((e as Empleado[]) ?? []);
    setLiqs((l as Liquidacion[]) ?? []);
    setCostos((c as Costo[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const periodo = new Date().toISOString().slice(0, 7);
  const empMap = useMemo(() => new Map(emps.map((e) => [e.id, e])), [emps]);

  const porArea = useMemo(() => {
    const m = new Map<string, number>();
    liqs.filter((l) => l.periodo === periodo).forEach((l) => {
      const a = empMap.get(l.empleado_id)?.area ?? "Sin área";
      m.set(a, (m.get(a) ?? 0) + Number(l.liquido || 0));
    });
    costos.filter((c) => c.mes === periodo).forEach((c) => {
      m.set(c.area, (m.get(c.area) ?? 0) + Number(c.monto || 0));
    });
    return Array.from(m, ([area, total]) => ({ area, total })).sort((a, b) => b.total - a.total);
  }, [liqs, empMap, periodo, costos]);

  const total = porArea.reduce((s, r) => s + r.total, 0);

  const submit = async () => {
    if (!form.area || !form.categoria || !form.monto || !form.mes) {
      return toast.error("Completa los campos requeridos");
    }
    const { error } = await supabase.from("costos_operacionales").insert({
      area: form.area, categoria: form.categoria,
      monto: Number(form.monto), mes: form.mes, descripcion: form.descripcion ?? "",
    });
    if (error) return toast.error(error.message);
    toast.success("Costo registrado");
    setOpen(false); setForm(emptyCosto); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este costo?")) return;
    const { error } = await supabase.from("costos_operacionales").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <PageShell>
      <PageHeader
        title="Costos por área"
        description="Distribución de remuneraciones y costos operacionales del mes en curso."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar costo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar costo operacional</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Área</Label>
                  <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AREAS_OP.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Monto (CLP)</Label>
                  <Input
                    inputMode="numeric"
                    value={form.monto ? new Intl.NumberFormat("es-CL").format(form.monto) : ""}
                    onChange={(e) => setForm({ ...form, monto: parseInt(e.target.value.replace(/\D/g, "")) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mes</Label>
                  <Input type="month" value={form.mes ?? ""} onChange={(e) => setForm({ ...form, mes: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Descripción</Label>
                  <Textarea value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Total mes</div><div className="text-2xl font-semibold">{formatCLP(total)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Áreas con gasto</div><div className="text-2xl font-semibold">{porArea.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Mayor área</div><div className="text-2xl font-semibold truncate">{porArea[0]?.area ?? "—"}</div></Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Costo por área (mes actual)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porArea}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="area" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatCLP(v)} />
              <Bar dataKey="total" name="Costo" radius={[6, 6, 0, 0]}>
                {porArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b"><h3 className="text-sm font-semibold">Costos operacionales registrados</h3></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead><TableHead>Área</TableHead><TableHead>Categoría</TableHead>
              <TableHead className="text-right">Monto</TableHead><TableHead>Descripción</TableHead><TableHead>Registrado</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.mes}</TableCell>
                <TableCell>{c.area}</TableCell>
                <TableCell>{c.categoria}</TableCell>
                <TableCell className="text-right font-medium">{formatCLP(c.monto)}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{c.descripcion ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {costos.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin costos registrados. Usa "Registrar costo" para empezar.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
