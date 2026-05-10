import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  contexto: z.string().max(20000).default(""),
});

const SYSTEM_PROMPT = `Eres Vértice IA, un asesor financiero y de recursos humanos para empresas chilenas.
Tienes acceso a los datos reales de la empresa. Cuando el usuario pregunta algo,
analiza los datos disponibles y da consejos concretos, específicos y accionables.

Si preguntan sobre precios: analiza el margen actual, compara con el mercado,
sugiere el rango óptimo de precio y explica el razonamiento.

Si preguntan sobre costos: identifica dónde está el mayor gasto y sugiere optimizaciones.

Si preguntan sobre empleados: detecta patrones de ausentismo, productividad y alertas legales.

Siempre termina con una recomendación concreta. Sé directo, usa números reales
de la empresa cuando los tengas disponibles. Responde en máximo 3 párrafos cortos.
Habla en español de Chile, tono cercano y profesional. Formatea montos en CLP (con puntos como separador de miles).`;

export const askVerticeIA = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no está configurada.");

    const systemFull = data.contexto
      ? `${SYSTEM_PROMPT}\n\n=== DATOS ACTUALES DE LA EMPRESA ===\n${data.contexto}\n=== FIN DATOS ===`
      : SYSTEM_PROMPT;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemFull }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("Demasiadas consultas. Intenta nuevamente en unos segundos.");
    if (res.status === 402) throw new Error("Sin créditos disponibles en Lovable AI. Recarga en Settings → Workspace → Usage.");
    if (!res.ok) {
      const txt = await res.text();
      console.error("AI gateway error", res.status, txt);
      throw new Error("No se pudo obtener respuesta de Vértice IA.");
    }
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "No tengo una respuesta en este momento.";
    return { reply };
  });
