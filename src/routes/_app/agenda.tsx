import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusPill } from "@/components/status-pill";
import { useEventos, useClientes, type EventoAgenda, type EventoTipo, TIPO_COLOR } from "@/lib/crm-store";
import { uid } from "@/lib/local-store";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/agenda")({ component: AgendaPage });

const TIPOS: EventoTipo[] = ["Cita con cliente", "Vencimiento", "Recordatorio", "Reunión", "Otro"];
const RECORDATORIOS = ["15 min", "30 min", "1 hora", "1 día"] as const;
const REPETIR = ["No repetir", "Diario", "Semanal", "Mensual"] as const;

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AgendaPage() {
  const [eventos, setEventos] = useEventos();
  const [clientes] = useClientes();
  const [tab, setTab] = useState("calendario");

  return (
    <PageShell>
      <PageHeader
        title="Agenda y calendario"
        description="Gestiona citas, vencimientos y recordatorios."
        actions={<NuevoEventoDialog onCreate={(e) => setEventos((p) => [e, ...p])} clientes={clientes} />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="calendario"><CalendarDays className="h-4 w-4 mr-1.5" />Calendario</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <CalendarioTab eventos={eventos} setEventos={setEventos} clientes={clientes} />
        </TabsContent>

        <TabsContent value="eventos">
          <EventosTab eventos={eventos} setEventos={setEventos} clientes={clientes} />
        </TabsContent>

        <TabsContent value="hoy">
          <HoyTab eventos={eventos} setEventos={setEventos} clientes={clientes} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* ---------------- Calendario ---------------- */

function CalendarioTab({
  eventos, setEventos, clientes,
}: {
  eventos: EventoAgenda[];
  setEventos: (next: EventoAgenda[] | ((p: EventoAgenda[]) => EventoAgenda[])) => void;
  clientes: { id: string; nombre: string }[];
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventosDeDia = (d: Date) => eventos.filter((e) => sameDay(new Date(e.fecha_inicio), d));
  const tiposEnDia = (d: Date) => Array.from(new Set(eventosDeDia(d).map((e) => e.tipo)));

  const monthLabel = cursor.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] mt-2">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-muted rounded-md">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="font-medium capitalize">{monthLabel}</div>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-muted rounded-md">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
          {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="h-16" />;
            const isToday = sameDay(d, new Date());
            const isSelected = selected && sameDay(d, selected);
            const tipos = tiposEnDia(d);
            return (
              <button
                key={i}
                onClick={() => setSelected(d)}
                className={`h-16 rounded-md border p-1.5 text-left text-xs flex flex-col transition-colors ${
                  isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`text-[11px] ${isToday ? "font-bold text-primary" : ""}`}>{d.getDate()}</div>
                <div className="flex gap-1 mt-auto flex-wrap">
                  {tipos.slice(0, 4).map((t) => (
                    <span key={t} style={{ backgroundColor: TIPO_COLOR[t], width: 6, height: 6, borderRadius: 99 }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-2">
          {selected ? selected.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }) : "Selecciona un día"}
        </h3>
        <div className="space-y-2">
          {selected && eventosDeDia(selected).length === 0 && (
            <p className="text-sm text-muted-foreground">Sin eventos.</p>
          )}
          {selected && eventosDeDia(selected).map((e) => (
            <EventoCard key={e.id} ev={e} clientes={clientes} setEventos={setEventos} />
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Eventos ---------------- */

function EventosTab({
  eventos, setEventos, clientes,
}: {
  eventos: EventoAgenda[];
  setEventos: (next: EventoAgenda[] | ((p: EventoAgenda[]) => EventoAgenda[])) => void;
  clientes: { id: string; nombre: string }[];
}) {
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(() => {
    return eventos
      .filter((e) => tipoFiltro === "todos" || e.tipo === tipoFiltro)
      .filter((e) => !desde || e.fecha_inicio >= desde)
      .filter((e) => !hasta || e.fecha_inicio <= hasta + "T23:59")
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  }, [eventos, tipoFiltro, desde, hasta]);

  return (
    <Card className="p-4 mt-2">
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtrados.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin eventos.</TableCell></TableRow>
          )}
          {filtrados.map((e) => {
            const cli = clientes.find((c) => c.id === e.cliente_id);
            return (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{fmtFecha(e.fecha_inicio)}</TableCell>
                <TableCell className="font-medium">{e.titulo}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: TIPO_COLOR[e.tipo] }} />
                    {e.tipo}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{cli?.nombre ?? "—"}</TableCell>
                <TableCell><StatusPill label={e.estado} /></TableCell>
                <TableCell className="text-right">
                  {e.estado === "Pendiente" && (
                    <Button size="sm" variant="outline" onClick={() =>
                      setEventos((p) => p.map((x) => x.id === e.id ? { ...x, estado: "Completado" } : x))
                    }>Completar</Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ---------------- Hoy ---------------- */

function HoyTab({
  eventos, setEventos, clientes,
}: {
  eventos: EventoAgenda[];
  setEventos: (next: EventoAgenda[] | ((p: EventoAgenda[]) => EventoAgenda[])) => void;
  clientes: { id: string; nombre: string }[];
}) {
  const hoy = new Date();
  const eventosHoy = eventos
    .filter((e) => sameDay(new Date(e.fecha_inicio), hoy))
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));

  const ahora = Date.now();
  const enUnaHora = eventosHoy.filter((e) => {
    const t = new Date(e.fecha_inicio).getTime();
    return e.estado === "Pendiente" && t > ahora && t - ahora <= 60 * 60 * 1000;
  });

  return (
    <div className="mt-2 space-y-3">
      {enUnaHora.length > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertTitle>Eventos en la próxima hora</AlertTitle>
          <AlertDescription>
            {enUnaHora.map((e) => `${new Date(e.fecha_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} — ${e.titulo}`).join(" · ")}
          </AlertDescription>
        </Alert>
      )}

      {eventosHoy.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">No hay eventos para hoy.</Card>
      )}

      {eventosHoy.map((e) => (
        <EventoCard key={e.id} ev={e} clientes={clientes} setEventos={setEventos} expanded />
      ))}
    </div>
  );
}

/* ---------------- Evento Card ---------------- */

function EventoCard({
  ev, clientes, setEventos, expanded,
}: {
  ev: EventoAgenda;
  clientes: { id: string; nombre: string }[];
  setEventos: (next: EventoAgenda[] | ((p: EventoAgenda[]) => EventoAgenda[])) => void;
  expanded?: boolean;
}) {
  const cli = clientes.find((c) => c.id === ev.cliente_id);
  return (
    <div className="rounded-lg border p-3 text-sm" style={{ borderLeft: `3px solid ${TIPO_COLOR[ev.tipo]}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(ev.fecha_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <StatusPill label={ev.estado} />
          </div>
          <div className="font-medium mt-0.5">{ev.titulo}</div>
          {cli && <div className="text-xs text-muted-foreground">Cliente: {cli.nombre}</div>}
          {expanded && ev.descripcion && <div className="text-xs mt-1.5">{ev.descripcion}</div>}
        </div>
        {ev.estado === "Pendiente" && (
          <Button size="sm" variant="outline" onClick={() =>
            setEventos((p) => p.map((x) => x.id === ev.id ? { ...x, estado: "Completado" } : x))
          }>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Nuevo Evento ---------------- */

function NuevoEventoDialog({
  onCreate, clientes, defaultClienteId,
}: {
  onCreate: (e: EventoAgenda) => void;
  clientes: { id: string; nombre: string }[];
  defaultClienteId?: string;
}) {
  const [open, setOpen] = useState(false);
  const empty = () => ({
    titulo: "",
    tipo: "Cita con cliente" as EventoTipo,
    fecha_inicio: toLocalInput(new Date().toISOString()),
    fecha_fin: "",
    cliente_id: defaultClienteId ?? "",
    descripcion: "",
    recordatorio: "30 min" as const,
    repetir: "No repetir" as const,
  });
  const [f, setF] = useState(empty());

  const submit = () => {
    if (!f.titulo.trim()) return toast.error("Ingresa un título");
    if (!f.fecha_inicio) return toast.error("Ingresa fecha de inicio");
    const nuevo: EventoAgenda = {
      id: uid(),
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      fecha_inicio: new Date(f.fecha_inicio).toISOString(),
      fecha_fin: f.fecha_fin ? new Date(f.fecha_fin).toISOString() : undefined,
      cliente_id: f.cliente_id || undefined,
      descripcion: f.descripcion || undefined,
      recordatorio: f.recordatorio,
      repetir: f.repetir,
      estado: "Pendiente",
      created_at: new Date().toISOString(),
    };
    onCreate(nuevo);
    setOpen(false);
    setF(empty());
    toast.success("Evento creado");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1.5" />Nuevo evento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo evento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as EventoTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={f.cliente_id || "none"} onValueChange={(v) => setF({ ...f, cliente_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin cliente —</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inicio</Label>
              <Input type="datetime-local" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} />
            </div>
            <div>
              <Label>Fin (opcional)</Label>
              <Input type="datetime-local" value={f.fecha_fin} onChange={(e) => setF({ ...f, fecha_fin: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Recordatorio</Label>
              <Select value={f.recordatorio} onValueChange={(v) => setF({ ...f, recordatorio: v as typeof f.recordatorio })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RECORDATORIOS.map((r) => <SelectItem key={r} value={r}>{r} antes</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Repetir</Label>
              <Select value={f.repetir} onValueChange={(v) => setF({ ...f, repetir: v as typeof f.repetir })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPETIR.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea rows={3} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
