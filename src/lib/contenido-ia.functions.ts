import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  tipo: z.string().min(1).max(80),
  tono: z.string().min(1).max(80),
  tema: z.string().min(1).max(2000),
  empresa: z.string().max(120).default(""),
});

export const generarContenidoInstagram = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no está configurada.");

    const system = `Eres un experto creador de contenido para Instagram, especializado en empresas chilenas.
Generas publicaciones atractivas, con español de Chile, tono ${data.tono}.
Responde SIEMPRE y SOLO con un objeto JSON válido (sin markdown, sin texto extra) con estos campos exactos:
{
  "titulo": "título corto y potente (máx 60 caracteres)",
  "cuerpo": "cuerpo de la publicación, 2-4 párrafos cortos con saltos de línea",
  "hashtags": "string con 6-10 hashtags separados por espacio, todos comenzando con #",
  "emoji_principal": "un solo emoji representativo",
  "cta": "llamada a la acción corta (máx 50 caracteres)"
}`;

    const user = `Tipo de contenido: ${data.tipo}
${data.empresa ? `Empresa: ${data.empresa}` : ""}
Tema/descripción: ${data.tema}

Genera la publicación en formato JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Demasiadas consultas. Intenta en unos segundos.");
    if (res.status === 402) throw new Error("Sin créditos. Recarga en Settings → Workspace → Usage.");
    if (!res.ok) {
      const txt = await res.text();
      console.error("AI error", res.status, txt);
      throw new Error("No se pudo generar el contenido.");
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";
    let parsed: { titulo?: string; cuerpo?: string; hashtags?: string; emoji_principal?: string; cta?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    return {
      titulo: parsed.titulo ?? "",
      cuerpo: parsed.cuerpo ?? "",
      hashtags: parsed.hashtags ?? "",
      emoji_principal: parsed.emoji_principal ?? "✨",
      cta: parsed.cta ?? "",
    };
  });
