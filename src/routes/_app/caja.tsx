import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/domain";
import { useLocalList, useLocalValue, uid } from "@/lib/local-store";
import { useEmpresa, type EmpresaConfig } from "@/hooks/use-empresa";
import { Plus, Printer, FileText, Trash2, Info, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/caja")({ component: CajaPage });

type Item = { descripcion: string; cantidad: number; precio: number };
type MetodoPago = "Efectivo" | "Débito" | "Crédito" | "Transferencia" | "Otro";

type Venta = {
  id: string;
  numero: number;
  fecha: string; // ISO
  cliente: string;
  metodo: MetodoPago;
  items: Item[];
  total: number;
  notas: string;
};

const METODOS: MetodoPago[] = ["Efectivo", "Débito", "Crédito", "Transferencia", "Otro"];

function CajaPage() {
  const { empresa } = useEmpresa();
  const [ventas, setVentas] = useLocalList<Venta>("vertice.caja.ventas", []);
  const [contador, setContador] = useLocalValue<number>("vertice.caja.contador", 1);
  const [open, setOpen] = useState(false);

  const emptyForm = (): Omit<Venta, "id" | "numero" | "total"> => ({
    fecha: new Date().toISOString(),
    cliente: "",
    metodo: "Efectivo",
    items: [{ descripcion: "", cantidad: 1, precio: 0 }],
    notas: "",
  });
  const [form, setForm] = useState(emptyForm());

  const total = useMemo(
    () => form.items.reduce((s, it) => s + (it.cantidad || 0) * (it.precio || 0), 0),
    [form.items],
  );

  const totalDia = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return ventas.filter((v) => v.fecha.slice(0, 10) === hoy).reduce((s, v) => s + v.total, 0);
  }, [ventas]);

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const addRow = () => setForm((f) => ({ ...f, items: [...f.items, { descripcion: "", cantidad: 1, precio: 0 }] }));
  const removeRow = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const submit = () => {
    const items = form.items.filter((it) => it.descripcion.trim() && it.cantidad > 0);
    if (items.length === 0) return toast.error("Agrega al menos un ítem con descripción y cantidad.");
    const nueva: Venta = { ...form, items, id: uid(), numero: contador, total };
    setVentas((prev) => [nueva, ...prev]);
    setContador((n) => n + 1);
    setOpen(false);
    setForm(emptyForm());
    toast.success(`Venta #${nueva.numero} registrada`);
    // Auto-open print preview
    setTimeout(() => printDocumento(nueva, empresa, "comprobante"), 200);
  };

  const remove = (id: string) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    setVentas((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <PageShell>
      <PageHeader
        title="Caja y ventas"
        description="Registra ventas, genera comprobantes internos y cotizaciones."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva venta</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Registrar venta</DialogTitle></DialogHeader>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Cliente (opcional)</Label>
                  <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nombre del cliente" />
                </div>
                <div className="space-y-1.5">
                  <Label>Método de pago</Label>
                  <Select value={form.metodo} onValueChange={(v) => setForm({ ...form, metodo: v as MetodoPago })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METODOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-2 border rounded-md overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-36">Precio unit.</TableHead>
                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Input value={it.descripcion} onChange={(e) => updateItem(idx, { descripcion: e.target.value })} placeholder="Producto o servicio" /></TableCell>
                        <TableCell><Input type="number" min="0" value={it.cantidad} onChange={(e) => updateItem(idx, { cantidad: parseFloat(e.target.value) || 0 })} /></TableCell>
                        <TableCell><Input inputMode="numeric" value={it.precio ? new Intl.NumberFormat("es-CL").format(it.precio) : ""} onChange={(e) => updateItem(idx, { precio: parseInt(e.target.value.replace(/\D/g, "")) || 0 })} /></TableCell>
                        <TableCell className="text-right font-medium">{formatCLP(it.cantidad * it.precio)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={form.items.length === 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center px-3 py-2 border-t bg-muted/30">
                  <Button variant="ghost" size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" />Agregar ítem</Button>
                  <div className="text-sm">Total: <span className="font-semibold text-base">{formatCLP(total)}</span></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit}>Guardar y generar comprobante</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Alert className="mb-6 border-[#185FA5]/30 bg-[#185FA5]/5">
        <Info className="h-4 w-4" style={{ color: "#185FA5" }} />
        <AlertTitle style={{ color: "#185FA5" }}>Documentos tributarios</AlertTitle>
        <AlertDescription className="text-foreground/80">
          Las boletas y facturas electrónicas requieren certificación SII. Vértice se integrará próximamente con el SII para emisión de documentos tributarios oficiales.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Wallet className="h-3.5 w-3.5" />Ventas del día</div><div className="text-2xl font-semibold text-success">{formatCLP(totalDia)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Total ventas registradas</div><div className="text-2xl font-semibold">{ventas.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Próximo comprobante N°</div><div className="text-2xl font-semibold">{String(contador).padStart(5, "0")}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-24">N°</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Ítems</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {ventas.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono">{String(v.numero).padStart(5, "0")}</TableCell>
                <TableCell className="text-xs">{new Date(v.fecha).toLocaleString("es-CL")}</TableCell>
                <TableCell>{v.cliente || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><Badge variant="secondary">{v.metodo}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.items.length} ítem(s)</TableCell>
                <TableCell className="text-right font-medium">{formatCLP(v.total)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="outline" size="sm" onClick={() => printDocumento(v, empresa, "comprobante")}>
                      <Printer className="h-3.5 w-3.5 mr-1" />Comprobante
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => printDocumento(v, empresa, "cotizacion")}>
                      <FileText className="h-3.5 w-3.5 mr-1" />Cotización
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {ventas.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin ventas registradas.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function printDocumento(v: Venta, empresa: EmpresaConfig, tipo: "comprobante" | "cotizacion") {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return toast.error("Permite ventanas emergentes para imprimir.");

  const fmt = (n: number) => "$" + new Intl.NumberFormat("es-CL").format(n);
  const fecha = new Date(v.fecha);
  const fechaStr = fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  const horaStr = fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const numero = String(v.numero).padStart(5, "0");

  const esCot = tipo === "cotizacion";
  const titulo = esCot ? "COTIZACIÓN" : "COMPROBANTE DE PAGO";
  const prefijo = esCot ? "COT" : "CMP";
  const subtitulo = esCot
    ? "Documento referencial — válido por 30 días desde la fecha de emisión"
    : "Documento interno — no válido como boleta o factura tributaria";

  const itemsRows = v.items.map((it) => `
    <tr>
      <td>${escapeHtml(it.descripcion)}</td>
      <td class="num">${it.cantidad}</td>
      <td class="num">${fmt(it.precio)}</td>
      <td class="num">${fmt(it.cantidad * it.precio)}</td>
    </tr>`).join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>${titulo} ${prefijo}-${numero}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #185FA5; padding-bottom: 14px; margin-bottom: 18px; }
  .empresa h2 { margin: 0 0 4px; font-size: 18px; color: #185FA5; }
  .empresa p { margin: 1px 0; font-size: 12px; color: #555; }
  .logo { max-height: 60px; max-width: 160px; object-fit: contain; }
  h1.titulo { text-align: center; font-size: 26px; letter-spacing: 2px; margin: 18px 0 4px; color: #1a1a1a; }
  .subtitulo { text-align: center; font-size: 11px; color: #777; font-style: italic; margin-bottom: 18px; }
  .meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 14px; }
  .meta .box { background: #f6f8fb; border: 1px solid #e3e8ef; border-radius: 6px; padding: 8px 12px; }
  .meta .box strong { color: #185FA5; display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  table.items { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table.items th { background: #185FA5; color: #fff; padding: 8px 10px; font-size: 12px; text-align: left; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
  .totales { margin-top: 14px; display: flex; justify-content: flex-end; }
  .totales .box { min-width: 280px; background: #185FA5; color: #fff; padding: 14px 18px; border-radius: 8px; }
  .totales .box .lbl { font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
  .totales .box .val { font-size: 24px; font-weight: 700; }
  .pago { font-size: 13px; margin-top: 12px; color: #444; }
  .footer { margin-top: 30px; font-size: 11px; color: #666; border-top: 1px dashed #ccc; padding-top: 12px; text-align: center; }
  .firma { margin-top: 50px; display: flex; justify-content: flex-end; }
  .firma .line { width: 260px; border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 11px; color: #555; }
  .notas { margin-top: 12px; font-size: 12px; color: #444; background: #fafbfc; padding: 8px 10px; border-left: 3px solid #185FA5; }
  .vigencia { margin-top: 10px; padding: 8px 10px; background: #fff8e1; border-left: 3px solid #f0b400; font-size: 12px; color: #6b4f00; }
  @media print { body { padding: 18px; } .no-print { display: none; } }
  .toolbar { position: fixed; top: 10px; right: 10px; }
  .toolbar button { background: #185FA5; color: #fff; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
</style>
</head><body>
  <div class="toolbar no-print"><button onclick="window.print()">Imprimir</button></div>
  <div class="header">
    <div class="empresa">
      <h2>${escapeHtml(empresa.nombre || "Mi Empresa")}</h2>
      ${empresa.rut ? `<p>RUT: ${escapeHtml(empresa.rut)}</p>` : ""}
      ${empresa.direccion ? `<p>${escapeHtml(empresa.direccion)}${empresa.ciudad ? ", " + escapeHtml(empresa.ciudad) : ""}</p>` : ""}
      ${empresa.telefono ? `<p>Tel: ${escapeHtml(empresa.telefono)}</p>` : ""}
      ${empresa.web ? `<p>${escapeHtml(empresa.web)}</p>` : ""}
    </div>
    ${empresa.logo_url ? `<img src="${escapeHtml(empresa.logo_url)}" class="logo" alt="Logo" />` : ""}
  </div>

  <h1 class="titulo">${titulo}</h1>
  <div class="subtitulo">${subtitulo}</div>

  <div class="meta">
    <div class="box"><strong>N° ${prefijo}</strong>${prefijo}-${numero}</div>
    <div class="box"><strong>Fecha</strong>${fechaStr} · ${horaStr}</div>
    <div class="box"><strong>Cliente</strong>${escapeHtml(v.cliente || "Consumidor final")}</div>
  </div>

  <table class="items">
    <thead><tr>
      <th>Descripción</th>
      <th class="num">Cantidad</th>
      <th class="num">Precio unitario</th>
      <th class="num">Subtotal</th>
    </tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="pago"><strong>Forma de pago:</strong> ${escapeHtml(v.metodo)}</div>

  <div class="totales">
    <div class="box">
      <div class="lbl">Total ${esCot ? "cotizado" : "pagado"}</div>
      <div class="val">${fmt(v.total)}</div>
    </div>
  </div>

  ${v.notas ? `<div class="notas"><strong>Notas:</strong> ${escapeHtml(v.notas)}</div>` : ""}

  ${esCot ? `<div class="vigencia"><strong>Vigencia:</strong> Esta cotización es válida por 30 días desde la fecha de emisión. Los precios pueden variar después de este período.</div>` : ""}

  ${!esCot ? `<div class="firma"><div class="line">Recibido conforme</div></div>` : ""}

  <div class="footer">
    ${esCot
      ? "Documento referencial sin valor tributario · Para emitir boleta o factura electrónica contacte a su ejecutivo"
      : "Para factura o boleta electrónica contacte a su ejecutivo"}
  </div>

  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 300));</script>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
