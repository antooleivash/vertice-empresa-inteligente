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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/finanzas/gastos")({ component: GastosPage });

const CATEGORIAS = ["Administrativo", "Operacional", "Comercial", "Otros"] as const;
const TIPOS = ["Fijo", "Variable"] as const;

type Gasto = {
  id: string; concepto: string; categoria: string; tipo: string;
  monto: number; mes: string; descripcion: string | null; created_at?: string;
};

function GastosPage() {
  const [items, setItems] = useState<Gasto[]>([]);
  const [open, setOpen] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState<Partial<Gasto>>({
    concepto: "", categoria: CATEGORIAS[0], tipo: TIPOS[0],
    monto: 0, mes: new Date().toISOString().slice(0, 7), descripcion: "",
  });

  const load = async () => {
    const { data } = await supabase.from("gastos").select("*").order("mes", { ascending: false });
    setItems((data as Gasto[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((i) =>
    (!filtroMes || i.mes === filtroMes) && (filtroTipo === "todos" || i.tipo === filtroTipo)
  ), [items, filtroMes, filtroTipo]);

  const periodo = new Date().toISOString().slice(0, 7);
  const totalMes = items.filter((i) => i.mes === periodo).reduce((s, i) => s + i.monto, 0);

  const submit = async () => {
    if (!form.concepto || !form.monto) return toast.error("Completa concepto y monto");
    const { error } = await supabase.from("gastos").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Gasto registrado"); setOpen(false);
    setForm({ concepto: "", categoria: CATEGORIAS[0], tipo: TIPOS[0], monto: 0, mes: periodo, descripcion: "" });
    load();
  };
  const remove = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("gastos").delete().eq("id", id); load(); };

  return (
    <PageShell>
      <PageHeader
        title="Gastos"
        description="Registra gastos administrativos, operacionales y comerciales."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nuevo gasto</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar gasto</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Concepto</Label><Input value={form.concepto ?? ""} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Categoría</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Monto</Label><Input inputMode="numeric" value={form.monto ? new Intl.NumberFormat("es-CL").format(form.monto) : ""} onChange={(e) => setForm({ ...form, monto: parseInt(e.target.value.replace(/\D/g, "")) || 0 })} /></div>
                <div className="space-y-1.5"><Label>Mes</Label><Input type="month" value={form.mes ?? ""} onChange={(e) => setForm({ ...form, mes: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Descripción</Label><Textarea rows={2} value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Gastos del mes</div><div className="text-2xl font-semibold">{formatCLP(totalMes)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Total registros</div><div className="text-2xl font-semibold">{items.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Acumulado histórico</div><div className="text-2xl font-semibold">{formatCLP(items.reduce((s, i) => s + i.monto, 0))}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b flex flex-wrap gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">Filtrar por mes</Label><Input type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="w-44" /></div>
          <div className="space-y-1"><Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(filtroMes || filtroTipo !== "todos") && <Button variant="ghost" size="sm" onClick={() => { setFiltroMes(""); setFiltroTipo("todos"); }}>Limpiar</Button>}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Mes</TableHead><TableHead>Concepto</TableHead><TableHead>Categoría</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Registrado</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">{g.mes}</TableCell>
                <TableCell className="font-medium">{g.concepto}</TableCell>
                <TableCell>{g.categoria}</TableCell>
                <TableCell><Badge variant={g.tipo === "Fijo" ? "default" : "secondary"}>{g.tipo}</Badge></TableCell>
                <TableCell className="text-right">{formatCLP(g.monto)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(g.created_at)}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin gastos registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
