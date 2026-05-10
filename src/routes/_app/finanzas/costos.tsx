import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP, formatDate, AREAS } from "@/lib/domain";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Repeat, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/finanzas/costos")({ component: CostosPage });

type Fijo = { id: string; concepto: string; area: string; monto: number; activo: boolean; created_at?: string };
type Variable = { id: string; concepto: string; area: string; mes: string; monto: number; created_at?: string };

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

function CostosPage() {
  const [fijos, setFijos] = useState<Fijo[]>([]);
  const [vars, setVars] = useState<Variable[]>([]);
  const [openF, setOpenF] = useState(false);
  const [openV, setOpenV] = useState(false);
  const [formF, setFormF] = useState({ concepto: "", area: AREAS[0] as string, monto: 0, activo: true });
  const [formV, setFormV] = useState({ concepto: "", area: AREAS[0] as string, mes: new Date().toISOString().slice(0, 7), monto: 0 });

  const load = async () => {
    const [{ data: f }, { data: v }] = await Promise.all([
      supabase.from("costos_fijos").select("*").order("created_at", { ascending: false }),
      supabase.from("costos_variables").select("*").order("mes", { ascending: false }),
    ]);
    setFijos((f as Fijo[]) ?? []);
    setVars((v as Variable[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const periodo = new Date().toISOString().slice(0, 7);
  const totalFijo = fijos.filter((f) => f.activo).reduce((s, f) => s + f.monto, 0);
  const totalVarMes = vars.filter((v) => v.mes === periodo).reduce((s, v) => s + v.monto, 0);

  const submitFijo = async () => {
    if (!formF.concepto || !formF.monto) return toast.error("Completa concepto y monto");
    const { error } = await supabase.from("costos_fijos").insert(formF);
    if (error) return toast.error(error.message);
    toast.success("Costo fijo creado"); setOpenF(false);
    setFormF({ concepto: "", area: AREAS[0], monto: 0, activo: true }); load();
  };
  const submitVar = async () => {
    if (!formV.concepto || !formV.monto) return toast.error("Completa concepto y monto");
    const { error } = await supabase.from("costos_variables").insert(formV);
    if (error) return toast.error(error.message);
    toast.success("Costo variable registrado"); setOpenV(false);
    setFormV({ concepto: "", area: AREAS[0], mes: periodo, monto: 0 }); load();
  };

  const toggleActivo = async (f: Fijo) => {
    await supabase.from("costos_fijos").update({ activo: !f.activo }).eq("id", f.id); load();
  };
  const removeF = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("costos_fijos").delete().eq("id", id); load(); };
  const removeV = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("costos_variables").delete().eq("id", id); load(); };

  return (
    <PageShell>
      <PageHeader title="Costos" description="Gestiona costos fijos recurrentes y costos variables del mes." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Repeat className="h-3.5 w-3.5" />Fijos mensuales</div><div className="text-2xl font-semibold">{formatCLP(totalFijo)}</div></Card>
        <Card className="p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingDown className="h-3.5 w-3.5" />Variables mes actual</div><div className="text-2xl font-semibold">{formatCLP(totalVarMes)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Total costos del mes</div><div className="text-2xl font-semibold">{formatCLP(totalFijo + totalVarMes)}</div></Card>
      </div>

      <Tabs defaultValue="fijos">
        <TabsList>
          <TabsTrigger value="fijos">Costos fijos ({fijos.length})</TabsTrigger>
          <TabsTrigger value="variables">Costos variables ({vars.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fijos" className="mt-4">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Recurrentes</h3>
                <p className="text-xs text-muted-foreground">Se aplican automáticamente cada mes mientras estén activos.</p>
              </div>
              <Dialog open={openF} onOpenChange={setOpenF}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo costo fijo</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Costo fijo recurrente</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5"><Label>Concepto</Label><Input value={formF.concepto} onChange={(e) => setFormF({ ...formF, concepto: e.target.value })} placeholder="Ej: Arriendo bodega" /></div>
                    <div className="space-y-1.5"><Label>Área</Label>
                      <Select value={formF.area} onValueChange={(v) => setFormF({ ...formF, area: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Monto mensual</Label><MontoInput value={formF.monto} onChange={(n) => setFormF({ ...formF, monto: n })} /></div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setOpenF(false)}>Cancelar</Button><Button onClick={submitFijo}>Guardar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Monto mensual</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {fijos.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.concepto}</TableCell>
                    <TableCell>{f.area}</TableCell>
                    <TableCell className="text-right">{formatCLP(f.monto)}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Switch checked={f.activo} onCheckedChange={() => toggleActivo(f)} /><Badge variant={f.activo ? "default" : "secondary"}>{f.activo ? "Activo" : "Pausado"}</Badge></div></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeF(f.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {fijos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Sin costos fijos. Crea uno para que se repita cada mes.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="mt-4">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Variables por mes</h3>
                <p className="text-xs text-muted-foreground">Costos que cambian mes a mes (insumos, reparaciones, horas extras).</p>
              </div>
              <Dialog open={openV} onOpenChange={setOpenV}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo costo variable</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Costo variable del mes</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5"><Label>Concepto</Label><Input value={formV.concepto} onChange={(e) => setFormV({ ...formV, concepto: e.target.value })} placeholder="Ej: Reparación motor" /></div>
                    <div className="space-y-1.5"><Label>Área</Label>
                      <Select value={formV.area} onValueChange={(v) => setFormV({ ...formV, area: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Mes</Label><Input type="month" value={formV.mes} onChange={(e) => setFormV({ ...formV, mes: e.target.value })} /></div>
                    <div className="col-span-2 space-y-1.5"><Label>Monto</Label><MontoInput value={formV.monto} onChange={(n) => setFormV({ ...formV, monto: n })} /></div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setOpenV(false)}>Cancelar</Button><Button onClick={submitVar}>Guardar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Mes</TableHead><TableHead>Concepto</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Registrado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {vars.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.mes}</TableCell>
                    <TableCell className="font-medium">{v.concepto}</TableCell>
                    <TableCell>{v.area}</TableCell>
                    <TableCell className="text-right">{formatCLP(v.monto)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.created_at)}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeV(v.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {vars.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin costos variables registrados.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
