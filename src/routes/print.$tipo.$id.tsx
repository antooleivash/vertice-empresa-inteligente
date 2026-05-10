import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Carta, Empleado, Liquidacion } from "@/lib/domain";
import { formatCLP, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/print/$tipo/$id")({ component: PrintPage });

function PrintPage() {
  const { tipo, id } = Route.useParams();
  const [data, setData] = useState<{ doc: Carta | Liquidacion | null; emp: Empleado | null }>({ doc: null, emp: null });

  useEffect(() => {
    (async () => {
      const tabla = tipo === "carta" ? "cartas" : "liquidaciones";
      const { data: doc } = await supabase.from(tabla).select("*").eq("id", id).single();
      if (!doc) return;
      const { data: emp } = await supabase.from("empleados").select("*").eq("id", (doc as { empleado_id: string }).empleado_id).single();
      setData({ doc: doc as Carta | Liquidacion, emp: emp as Empleado });
    })();
  }, [tipo, id]);

  useEffect(() => {
    if (data.doc && data.emp) setTimeout(() => window.print(), 350);
  }, [data]);

  if (!data.doc || !data.emp) {
    return <div className="p-10 text-center text-sm text-gray-500">Cargando documento…</div>;
  }

  return (
    <div className="bg-white text-black mx-auto max-w-3xl p-12 font-serif">
      <style>{`
        @media print { @page { size: A4; margin: 18mm; } body { background: white; } .no-print { display: none; } }
      `}</style>
      <header className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VÉRTICE</h1>
          <p className="text-xs text-gray-600">Plataforma Empresarial Inteligente</p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div>Documento generado</div>
          <div>{formatDate(new Date().toISOString())}</div>
        </div>
      </header>

      {tipo === "carta" ? <CartaContent doc={data.doc as Carta} emp={data.emp} /> : <LiqContent doc={data.doc as Liquidacion} emp={data.emp} />}

      <div className="no-print mt-10 text-center">
        <button onClick={() => window.print()} className="rounded bg-gray-900 text-white px-4 py-2 text-sm">Imprimir / Guardar PDF</button>
      </div>
    </div>
  );
}

function CartaContent({ doc, emp }: { doc: Carta; emp: Empleado }) {
  const titulo = { amonestacion: "CARTA DE AMONESTACIÓN", advertencia: "CARTA DE ADVERTENCIA", felicitacion: "CARTA DE FELICITACIÓN" }[doc.tipo];
  return (
    <article>
      <h2 className="text-center text-lg font-bold uppercase tracking-wide mb-8">{titulo}</h2>
      <div className="mb-6 text-sm">
        <p><strong>Sr(a).:</strong> {emp.nombre}</p>
        <p><strong>RUT:</strong> {emp.rut}</p>
        <p><strong>Cargo:</strong> {emp.cargo} — {emp.area}</p>
        <p><strong>Fecha:</strong> {formatDate(doc.fecha)}</p>
      </div>
      <div className="mb-6">
        <p className="font-semibold mb-2">Motivo:</p>
        <p className="text-sm">{doc.motivo}</p>
      </div>
      <div className="mb-10">
        <p className="font-semibold mb-2">Detalle:</p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{doc.contenido}</p>
      </div>
      <div className="grid grid-cols-2 gap-12 mt-20 text-center text-xs">
        <div><div className="border-t border-gray-800 pt-2">Firma Empleador</div></div>
        <div><div className="border-t border-gray-800 pt-2">Firma Trabajador</div></div>
      </div>
    </article>
  );
}

function LiqContent({ doc, emp }: { doc: Liquidacion; emp: Empleado }) {
  return (
    <article>
      <h2 className="text-center text-lg font-bold uppercase tracking-wide mb-8">Liquidación de Sueldo — {doc.periodo}</h2>
      <div className="mb-6 text-sm grid grid-cols-2 gap-2">
        <p><strong>Trabajador:</strong> {emp.nombre}</p>
        <p><strong>RUT:</strong> {emp.rut}</p>
        <p><strong>Cargo:</strong> {emp.cargo}</p>
        <p><strong>Área:</strong> {emp.area}</p>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-gray-100"><th className="text-left p-2 border">Concepto</th><th className="text-right p-2 border">Monto</th></tr></thead>
        <tbody>
          <tr><td className="p-2 border">Sueldo base</td><td className="p-2 border text-right">{formatCLP(doc.sueldo_base)}</td></tr>
          <tr><td className="p-2 border">Bonos / Haberes</td><td className="p-2 border text-right">{formatCLP(doc.bonos)}</td></tr>
          <tr><td className="p-2 border">Descuentos</td><td className="p-2 border text-right">- {formatCLP(doc.descuentos)}</td></tr>
          <tr className="font-bold bg-gray-50"><td className="p-2 border">LÍQUIDO A PAGAR</td><td className="p-2 border text-right">{formatCLP(doc.liquido)}</td></tr>
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-12 mt-20 text-center text-xs">
        <div><div className="border-t border-gray-800 pt-2">Empleador</div></div>
        <div><div className="border-t border-gray-800 pt-2">Recibí conforme</div></div>
      </div>
    </article>
  );
}
