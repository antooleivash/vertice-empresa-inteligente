import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { askVerticeIA } from "@/lib/vertice-ia.functions";
import { Brain, Send, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Cuánto puedo subir el precio de mis servicios?",
  "¿Qué área de mi empresa está perdiendo plata?",
  "¿Cuánto estoy gastando en horas extras?",
];

const fmtCLP = (n: number) => "$" + new Intl.NumberFormat("es-CL").format(Math.round(n));

function readLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

async function gatherContext(): Promise<string> {
  const partes: string[] = [];

  // Local: ventas (Caja), productos/servicios y costos del simulador, activos
  const ventas = readLocal<Array<{ total: number; metodo: string; fecha: string; items: { descripcion: string; cantidad: number; precio: number }[] }>>("vertice.caja.ventas", []);
  if (ventas.length) {
    const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0);
    const top = [...ventas].sort((a, b) => b.total - a.total).slice(0, 5);
    partes.push(`VENTAS REGISTRADAS (${ventas.length}, total ${fmtCLP(totalVentas)}). Últimas top 5: ` +
      top.map((v) => `${new Date(v.fecha).toLocaleDateString("es-CL")} ${fmtCLP(v.total)} (${v.metodo})`).join("; "));
  }

  const productos = readLocal<Array<{ nombre: string; tipo: string; precio_venta: number; costo_variable: number; unidad: string }>>("vertice.simulador.items", []);
  if (productos.length) {
    const detalle = productos.map((p) => {
      const margen = p.precio_venta > 0 ? ((p.precio_venta - p.costo_variable) / p.precio_venta) * 100 : 0;
      return `${p.nombre} (${p.tipo}): precio ${fmtCLP(p.precio_venta)}, costo ${fmtCLP(p.costo_variable)}, margen ${margen.toFixed(1)}%`;
    });
    partes.push(`PRODUCTOS/SERVICIOS (${productos.length}): ${detalle.join(" | ")}`);
  }

  const costosFijos = readLocal<Array<{ concepto: string; monto: number }>>("vertice.simulador.costos_fijos", []);
  if (costosFijos.length) {
    const total = costosFijos.reduce((s, c) => s + (c.monto || 0), 0);
    partes.push(`COSTOS FIJOS (total ${fmtCLP(total)}): ${costosFijos.map((c) => `${c.concepto} ${fmtCLP(c.monto)}`).join(", ")}`);
  }

  // Supabase: empleados, asistencia, ingresos, costos, gastos, horas extras
  try {
    const [empRes, asRes, ingRes, costRes, gastRes, hxRes] = await Promise.all([
      supabase.from("empleados").select("id,nombre,cargo,area,sueldo_base,activo").limit(200),
      supabase.from("asistencia").select("empleado_id,fecha,estado").gte("fecha", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).limit(1000),
      supabase.from("ingresos").select("concepto,categoria,monto,mes").order("mes", { ascending: false }).limit(50),
      supabase.from("costos").select("concepto,categoria,tipo,monto,mes").order("mes", { ascending: false }).limit(50),
      supabase.from("gastos").select("concepto,categoria,monto,mes").order("mes", { ascending: false }).limit(50),
      supabase.from("horas_extras").select("empleado_id,fecha,horas,monto").gte("fecha", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).limit(500),
    ]);

    const emps = (empRes.data ?? []) as Array<{ id: string; nombre: string; cargo: string; area: string; sueldo_base: number; activo: boolean }>;
    if (emps.length) {
      const activos = emps.filter((e) => e.activo);
      const masaSalarial = activos.reduce((s, e) => s + (e.sueldo_base || 0), 0);
      const porArea: Record<string, number> = {};
      activos.forEach((e) => { porArea[e.area || "Sin área"] = (porArea[e.area || "Sin área"] || 0) + 1; });
      partes.push(`EMPLEADOS: ${activos.length} activos de ${emps.length}. Masa salarial mensual ${fmtCLP(masaSalarial)}. Por área: ${Object.entries(porArea).map(([a, n]) => `${a}: ${n}`).join(", ")}`);
    }

    const asis = (asRes.data ?? []) as Array<{ empleado_id: string; fecha: string; estado: string }>;
    if (asis.length) {
      const conteo: Record<string, number> = {};
      asis.forEach((a) => { conteo[a.estado] = (conteo[a.estado] || 0) + 1; });
      const total = asis.length;
      const ausencias = (conteo.ausente || 0) + (conteo.licencia || 0);
      const tasaAusencia = ((ausencias / total) * 100).toFixed(1);
      partes.push(`ASISTENCIA últimos 30 días (${total} registros): ${Object.entries(conteo).map(([k, v]) => `${k}: ${v}`).join(", ")}. Tasa ausentismo ${tasaAusencia}%`);
    }

    const ingresos = (ingRes.data ?? []) as Array<{ concepto: string; categoria: string; monto: number; mes: string }>;
    if (ingresos.length) {
      const totalIng = ingresos.reduce((s, i) => s + (i.monto || 0), 0);
      const ultimoMes = ingresos[0].mes;
      const ingMes = ingresos.filter((i) => i.mes === ultimoMes).reduce((s, i) => s + (i.monto || 0), 0);
      partes.push(`INGRESOS (${ingresos.length} registros): total histórico ${fmtCLP(totalIng)}, último mes (${ultimoMes}) ${fmtCLP(ingMes)}`);
    }

    const costos = (costRes.data ?? []) as Array<{ concepto: string; categoria: string; tipo: string; monto: number; mes: string }>;
    if (costos.length) {
      const total = costos.reduce((s, c) => s + (c.monto || 0), 0);
      const porCat: Record<string, number> = {};
      costos.forEach((c) => { porCat[c.categoria || "Otros"] = (porCat[c.categoria || "Otros"] || 0) + (c.monto || 0); });
      const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
      partes.push(`COSTOS (${costos.length} registros, total ${fmtCLP(total)}). Top categorías: ${top.map(([k, v]) => `${k}: ${fmtCLP(v)}`).join(", ")}`);
    }

    const gastos = (gastRes.data ?? []) as Array<{ concepto: string; categoria: string; monto: number; mes: string }>;
    if (gastos.length) {
      const total = gastos.reduce((s, g) => s + (g.monto || 0), 0);
      partes.push(`GASTOS: ${gastos.length} registros, total ${fmtCLP(total)}`);
    }

    const hx = (hxRes.data ?? []) as Array<{ empleado_id: string; fecha: string; horas: number; monto: number }>;
    if (hx.length) {
      const totalHoras = hx.reduce((s, h) => s + (h.horas || 0), 0);
      const totalCosto = hx.reduce((s, h) => s + (h.monto || 0), 0);
      const empleadosUnicos = new Set(hx.map((h) => h.empleado_id)).size;
      partes.push(`HORAS EXTRAS últimos 30 días: ${totalHoras.toFixed(1)} hrs en ${empleadosUnicos} empleados, costo ${fmtCLP(totalCosto)}`);
    }
  } catch (e) {
    console.warn("[Vértice IA] No se pudo cargar contexto Supabase:", e);
  }

  if (partes.length === 0) return "La empresa aún no tiene datos cargados en Vértice.";
  return partes.join("\n");
}

export function VerticeIAChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askVerticeIA);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!user) return null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const contexto = await gatherContext();
      const res = await ask({ data: { messages: next, contexto } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Lo siento, " + (e as Error).message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir Vértice IA"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all flex items-center justify-center",
          "bg-[#185FA5] text-white hover:bg-[#134c84] hover:scale-105",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Brain className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-8rem)] rounded-2xl bg-white shadow-2xl border border-border flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          role="dialog"
          aria-label="Vértice IA"
        >
          <div className="bg-[#185FA5] text-white px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Vértice IA</div>
              <div className="text-[11px] text-white/80">Tu asesor empresarial</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fb]">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Hola 👋 Soy <strong>Vértice IA</strong>. Analizo tus datos para darte recomendaciones concretas.
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Sugerencias
                  </div>
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-sm rounded-lg border border-[#185FA5]/20 bg-white px-3 py-2 hover:bg-[#185FA5]/5 hover:border-[#185FA5]/40 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm",
                    m.role === "user"
                      ? "bg-[#185FA5] text-white rounded-br-sm"
                      : "bg-white text-foreground border border-border rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#185FA5] animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-[#185FA5] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[#185FA5] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 bg-white flex gap-2"
          >
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntame sobre tu negocio…"
              className="flex-1 rounded-full border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
              disabled={loading} maxLength={500}
            />
            <button
              type="submit" disabled={loading || !input.trim()}
              className="h-9 w-9 rounded-full bg-[#185FA5] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#134c84] transition"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
