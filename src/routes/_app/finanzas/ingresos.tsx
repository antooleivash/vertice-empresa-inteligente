import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/finanzas/ingresos")({ component: IngresosPage });

const CATEGORIAS = ["Ventas", "Servicios", "Otros"] as const;

type Ingreso = {
  id: string; concepto: string; categoria: string;
  monto: number; mes: string; descripcion: string | null; created_at?: string;
};

function IngresosPage() {
  const [items, setItems] = useState<Ingreso[]>([]);
  const [open, setOpen] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");
  const [form, setForm] = useState<Partial<Ingreso>>({
    concepto: "", categoria: CATEGORIAS[0], monto: 0,
    mes: new Date().toISOString().slice(0, 7), descripcion: "",
  });

  const load = async () => {
    const { data } = await supabase.from("ingresos").select("*").order("mes", { ascending: false });
    setItems((data as Ingreso[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((i) => !filtroMes || i.mes === filtroMes), [items, filtroMes]);
  const periodo = new Date().toISOString().slice(0, 7);
  const totalMes = items.filter((i) => i.mes === periodo).reduce((s, i) => s + i.monto, 0);
  const totalAcum = items.reduce((s, i) => s + i.monto, 0);

  const submit = async () => {
    if (!form.concepto || !form.monto) return toast.error("Completa concepto y monto");
    const { error } = await supabase.from("ingresos").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Ingreso registrado"); setOpen(false);
    setForm({ concepto: "", categoria: CATEGORIAS[0], monto: 0, mes: periodo, descripcion: "" });
    load();
  };
  const remove = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("ingresos").delete().eq("id", id); load(); };

  return (
    <PageShell>
      <PageHeader
        title="Ingresos"
        description="Registra ventas, servicios y otros ingresos de la empresa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nuevo ingreso</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar ingreso</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Concepto</Label><Input value={form.concepto ?? ""} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Categoría</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Mes</Label><Input type="month" value={form.mes ?? ""} onChange={(e) => setForm({ ...form, mes: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Monto</Label><Input inputMode="numeric" value={form.monto ? new Intl.NumberFormat("es-CL").format(form.monto) : ""} onChange={(e) => setForm({ ...form, monto: parseInt(e.target.value.replace(/\D/g, "")) || 0 })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Descripción</Label><Textarea rows={2} value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingUp className="h-3.5 w-3.5" />Ingresos del mes</div><div className="text-2xl font-semibold text-success">{formatCLP(totalMes)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Registros</div><div className="text-2xl font-semibold">{items.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Acumulado histórico</div><div className="text-2xl font-semibold">{formatCLP(totalAcum)}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b flex flex-wrap gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">Filtrar por mes</Label><Input type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="w-44" /></div>
          {filtroMes && <Button variant="ghost" size="sm" onClick={() => setFiltroMes("")}>Limpiar</Button>}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Mes</TableHead><TableHead>Concepto</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Descripción</TableHead><TableHead>Registrado</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.mes}</TableCell>
                <TableCell className="font-medium">{i.concepto}</TableCell>
                <TableCell><Badge variant="secondary">{i.categoria}</Badge></TableCell>
                <TableCell className="text-right text-success font-medium">{formatCLP(i.monto)}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{i.descripcion ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(i.created_at)}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin ingresos registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
