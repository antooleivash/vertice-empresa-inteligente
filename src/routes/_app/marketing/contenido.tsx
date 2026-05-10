import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/marketing/contenido")({ component: ContenidoPage });

type Tipo = "Oferta laboral" | "Post LinkedIn" | "Email interno" | "Comunicado prensa";

const TEMPLATES: Record<Tipo, (t: string, c: string) => string> = {
  "Oferta laboral": (t, c) =>
    `🚀 ${t}\n\nEn ${c || "nuestra empresa"} buscamos talento operacional con foco en seguridad, eficiencia y trabajo colaborativo.\n\nQué ofrecemos:\n• Contrato indefinido y bonos por desempeño\n• Programa de desarrollo profesional\n• Equipos de trabajo de alto estándar\n\nPostula hoy y construyamos juntos el siguiente capítulo del rubro operacional chileno.`,
  "Post LinkedIn": (t, c) =>
    `${t} 🧭\n\nDesde ${c || "nuestro equipo"} compartimos un avance clave en la transformación operacional del sector.\n\nLa adopción de inteligencia artificial aplicada a RRHH, finanzas y operaciones ya no es opcional: es la frontera competitiva.\n\n#Operaciones #Innovación #Chile`,
  "Email interno": (t, c) =>
    `Asunto: ${t}\n\nEstimado equipo de ${c || "Vértice"},\n\nQueremos compartir avances importantes en nuestros procesos. La plataforma integrada nos permite tomar mejores decisiones con datos en tiempo real.\n\nAgradecemos su compromiso continuo.\n\nSaludos,\nGerencia`,
  "Comunicado prensa": (t, c) =>
    `${t}\n\n${c || "La compañía"} anuncia hoy un nuevo hito en su estrategia de digitalización operacional, consolidando su posición como referente en el ecosistema productivo chileno.\n\nEl proyecto integra HR, Finanzas, Operaciones e IA en una sola plataforma.`,
};

type Item = { id: string; tipo: Tipo; titulo: string; contenido: string; fecha: string };

function ContenidoPage() {
  const [tipo, setTipo] = useState<Tipo>("Post LinkedIn");
  const [titulo, setTitulo] = useState("");
  const [contexto, setContexto] = useState("");
  const [salida, setSalida] = useState("");
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState<Item[]>([]);

  const generar = () => {
    if (!titulo) return toast.error("Ingresa un título o tema");
    setLoading(true);
    setTimeout(() => {
      const out = TEMPLATES[tipo](titulo, contexto);
      setSalida(out);
      setHistorial([{ id: crypto.randomUUID(), tipo, titulo, contenido: out, fecha: new Date().toISOString() }, ...historial].slice(0, 10));
      setLoading(false);
    }, 600);
  };

  const copiar = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };

  return (
    <PageShell>
      <PageHeader title="Generador de contenido IA" description="Crea ofertas, posts y comunicados con plantillas inteligentes." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <div><Label>Tipo de contenido</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(TEMPLATES) as Tipo[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Título / tema</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Operador Salmonera Senior" /></div>
          <div><Label>Contexto (empresa, área, detalle)</Label><Textarea rows={3} value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Ej: Vértice, área Producción, Puerto Montt" /></div>
          <Button onClick={generar} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generar con IA
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Resultado</div>
            {salida && <Button variant="ghost" size="sm" onClick={() => copiar(salida)}><Copy className="h-3 w-3 mr-1" />Copiar</Button>}
          </div>
          <Textarea rows={14} value={salida} onChange={(e) => setSalida(e.target.value)} placeholder="El contenido generado aparecerá aquí…" className="font-mono text-sm" />
        </Card>
      </div>

      {historial.length > 0 && (
        <Card className="p-5 mt-6">
          <div className="text-sm font-medium mb-3">Historial reciente</div>
          <div className="space-y-2">
            {historial.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline">{h.tipo}</Badge>
                  <div className="text-sm truncate">{h.titulo}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSalida(h.contenido)}>Ver</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
