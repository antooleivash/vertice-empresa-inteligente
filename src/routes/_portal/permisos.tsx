import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpleado } from "@/hooks/use-current-empleado";
import type { SolicitudPermiso } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/permisos")({ component: PortalPermisos });

const TIPOS = ["Vacaciones", "Permiso con goce", "Permiso sin goce", "Licencia médica"];

function PortalPermisos() {
  const { empleado } = useCurrentEmpleado();
  const [items, setItems] = useState<SolicitudPermiso[]>([]);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ tipo: TIPOS[0], fecha_inicio: today, fecha_fin: today, motivo: "" });

  const load = async () => {
    if (!empleado) return;
    const { data } = await supabase
      .from("solicitudes_permisos").select("*")
      .eq("empleado_id", empleado.id)
      .order("created_at", { ascending: false });
    setItems((data as SolicitudPermiso[]) ?? []);
  };
  useEffect(() => { load(); }, [empleado?.id]);

  const submit = async () => {
    if (!empleado) return;
    const { error } = await supabase.from("solicitudes_permisos").insert({
      empleado_id: empleado.id, ...form, estado: "Pendiente",
    });
    if (error) return toast.error(error.message);
    toast.success("Solicitud enviada"); setOpen(false);
    setForm({ tipo: TIPOS[0], fecha_inicio: today, fecha_fin: today, motivo: "" });
    load();
  };

  const tone = (e: string) => ({
    Pendiente: "bg-warning/20 text-warning-foreground",
    Aprobado: "bg-success/15 text-success",
    Rechazado: "bg-destructive/15 text-destructive",
  }[e] ?? "");

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full h-14 text-base gap-2"><Plus className="h-5 w-5" />Solicitar permiso o vacaciones</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva solicitud</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Inicio</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Motivo</Label><Textarea rows={3} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Enviar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {items.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="font-medium text-sm">{s.tipo}</div>
              <Badge className={tone(s.estado)}>{s.estado}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(s.fecha_inicio)} → {formatDate(s.fecha_fin)}
            </div>
            {s.motivo && <div className="text-xs mt-2 text-muted-foreground">{s.motivo}</div>}
          </Card>
        ))}
        {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Sin solicitudes.</div>}
      </div>
    </div>
  );
}
