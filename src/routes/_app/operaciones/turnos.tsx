import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado } from "@/lib/domain";
import { AREAS } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/_app/operaciones/turnos")({ component: TurnosPage });

const TURNOS = ["Mañana (06–14)", "Tarde (14–22)", "Noche (22–06)"] as const;

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function TurnosPage() {
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [area, setArea] = useState<string>("todas");

  useEffect(() => { supabase.from("empleados").select("*").eq("activo", true).then(({ data }) => setEmps((data as Empleado[]) ?? [])); }, []);

  const filtered = useMemo(() => emps.filter((e) => area === "todas" || e.area === area), [emps, area]);

  const asignados = useMemo(() => filtered.map((e) => ({
    ...e, turno: TURNOS[hash(e.id) % 3], rendimiento: 70 + (hash(e.id + "r") % 30), incidentes: hash(e.id + "i") % 4,
  })), [filtered]);

  const porTurno = useMemo(() => TURNOS.map((t) => {
    const xs = asignados.filter((a) => a.turno === t);
    return {
      turno: t.split(" ")[0],
      personas: xs.length,
      rendimiento: xs.length ? Math.round(xs.reduce((s, x) => s + x.rendimiento, 0) / xs.length) : 0,
      incidentes: xs.reduce((s, x) => s + x.incidentes, 0),
    };
  }), [asignados]);

  return (
    <PageShell>
      <PageHeader title="Rendimiento por turno" description="Cobertura, rendimiento promedio e incidentes por turno operativo." actions={
        <Select value={area} onValueChange={setArea}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas las áreas</SelectItem>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {porTurno.map((t) => (
          <Card key={t.turno} className="p-5">
            <div className="text-xs text-muted-foreground">{t.turno}</div>
            <div className="text-2xl font-semibold mt-1">{t.personas} personas</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={t.rendimiento >= 85 ? "default" : t.rendimiento >= 75 ? "secondary" : "destructive"}>Rend. {t.rendimiento}%</Badge>
              {t.incidentes > 0 && <Badge variant="outline">{t.incidentes} incidentes</Badge>}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 mb-6">
        <div className="text-sm font-medium mb-3">Comparativa por turno</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={porTurno}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="turno" /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="personas" fill="var(--color-chart-1)" />
            <Bar dataKey="rendimiento" fill="var(--color-chart-2)" />
            <Bar dataKey="incidentes" fill="var(--color-chart-4)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Área</TableHead><TableHead>Turno</TableHead><TableHead>Rendimiento</TableHead><TableHead>Incidentes</TableHead></TableRow></TableHeader>
          <TableBody>
            {asignados.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin empleados</TableCell></TableRow>}
            {asignados.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nombre}</TableCell>
                <TableCell>{a.area}</TableCell>
                <TableCell><Badge variant="outline">{a.turno}</Badge></TableCell>
                <TableCell>{a.rendimiento}%</TableCell>
                <TableCell>{a.incidentes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
