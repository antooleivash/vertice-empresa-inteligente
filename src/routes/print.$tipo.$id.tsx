import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Carta, Empleado, Liquidacion } from "@/lib/domain";
import { formatCLP, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/print/$tipo/$id")({ component: PrintPage });

type Contrato = {
  id: string; empleado_id: string; tipo: string;
  fecha_inicio: string; fecha_vencimiento: string | null;
  cargo: string; sueldo_base: number;
};

const EMPRESA = {
  nombre: "Mi Empresa S.A.",
  rut: "76.000.000-0",
  direccion: "Av. Principal 1234, Puerto Montt, Región de Los Lagos",
  ciudad: "Puerto Montt",
};

function PrintPage() {
  const { tipo, id } = Route.useParams();
  const [data, setData] = useState<{ doc: Carta | Liquidacion | Contrato | null; emp: Empleado | null }>({ doc: null, emp: null });

  useEffect(() => {
    (async () => {
      const tabla = tipo === "carta" ? "cartas" : tipo === "contrato" ? "contratos" : "liquidaciones";
      const { data: doc } = await supabase.from(tabla).select("*").eq("id", id).single();
      if (!doc) return;
      const { data: emp } = await supabase.from("empleados").select("*").eq("id", (doc as { empleado_id: string }).empleado_id).single();
      setData({ doc: doc as Carta | Liquidacion | Contrato, emp: emp as Empleado });
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
          <h1 className="text-2xl font-bold tracking-tight">{tipo === "contrato" ? EMPRESA.nombre.toUpperCase() : "VÉRTICE"}</h1>
          <p className="text-xs text-gray-600">{tipo === "contrato" ? `RUT ${EMPRESA.rut}` : "Plataforma Empresarial Inteligente"}</p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div>Documento generado</div>
          <div>{formatDate(new Date().toISOString())}</div>
        </div>
      </header>

      {tipo === "carta" && <CartaContent doc={data.doc as Carta} emp={data.emp} />}
      {tipo === "liquidacion" && <LiqContent doc={data.doc as Liquidacion} emp={data.emp} />}
      {tipo === "contrato" && <ContratoContent doc={data.doc as Contrato} emp={data.emp} />}

      <footer className="mt-12 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500">
        {EMPRESA.nombre} · {EMPRESA.direccion}
      </footer>

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

function ContratoContent({ doc, emp }: { doc: Contrato; emp: Empleado }) {
  const hoy = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const tipoTxt =
    doc.tipo === "Indefinido"
      ? "de carácter INDEFINIDO"
      : doc.tipo === "Plazo fijo"
        ? `a PLAZO FIJO, con vencimiento el ${formatDate(doc.fecha_vencimiento)}`
        : `por OBRA Y FAENA${doc.fecha_vencimiento ? `, con término estimado el ${formatDate(doc.fecha_vencimiento)}` : ""}`;

  return (
    <article className="text-sm leading-relaxed">
      <h2 className="text-center text-xl font-bold uppercase tracking-wide mb-6">Contrato de Trabajo</h2>
      <p className="text-right mb-6">{EMPRESA.ciudad}, {hoy}</p>

      <p className="mb-4 text-justify">
        En <strong>{EMPRESA.ciudad}</strong>, con fecha {hoy}, entre <strong>{EMPRESA.nombre}</strong>,
        RUT <strong>{EMPRESA.rut}</strong>, con domicilio en {EMPRESA.direccion}, en adelante
        "<strong>el Empleador</strong>", y don(ña) <strong>{emp.nombre}</strong>, RUT
        <strong> {emp.rut}</strong>, en adelante "<strong>el Trabajador</strong>", se conviene el siguiente
        contrato de trabajo {tipoTxt}, regido por las disposiciones del Código del Trabajo de Chile.
      </p>

      <Clausula n="PRIMERO" titulo="Funciones">
        El Trabajador se compromete a desempeñar el cargo de <strong>{emp.cargo}</strong> en el área de
        <strong> {emp.area}</strong>, ejecutando todas las labores propias del cargo y aquellas que el Empleador
        le encomiende dentro del giro de la empresa.
      </Clausula>

      <Clausula n="SEGUNDO" titulo="Vigencia del contrato">
        El presente contrato comenzará a regir el <strong>{formatDate(doc.fecha_inicio)}</strong> y tendrá la
        modalidad {tipoTxt}.
      </Clausula>

      <Clausula n="TERCERO" titulo="Remuneración">
        El Empleador pagará al Trabajador un sueldo base mensual de <strong>{formatCLP(doc.sueldo_base)}</strong>{" "}
        (pesos chilenos), pagaderos por mes vencido conforme a la legislación vigente, con los descuentos
        legales correspondientes.
      </Clausula>

      <Clausula n="CUARTO" titulo="Jornada de trabajo">
        La jornada ordinaria de trabajo será de <strong>42 horas semanales</strong>, distribuidas de lunes a
        viernes según lo establecido por la <strong>Ley N° 21.561</strong>, que reduce gradualmente la jornada
        laboral en Chile.
      </Clausula>

      <Clausula n="QUINTO" titulo="Horas extraordinarias">
        Las horas extraordinarias se pactarán por escrito y no podrán exceder de <strong>2 horas diarias</strong>{" "}
        ni de <strong>10 horas semanales</strong>, conforme al artículo 31 del Código del Trabajo. Serán
        remuneradas con el recargo legal del 50% sobre el sueldo convenido.
      </Clausula>

      <Clausula n="SEXTO" titulo="Obligaciones del Trabajador">
        El Trabajador se obliga a cumplir las instrucciones que reciba del Empleador, respetar el Reglamento
        Interno de Orden, Higiene y Seguridad, asistir puntualmente a sus labores y mantener la debida
        confidencialidad sobre la información de la empresa.
      </Clausula>

      <Clausula n="SÉPTIMO" titulo="Feriado anual">
        El Trabajador tendrá derecho a un feriado anual de 15 días hábiles con remuneración íntegra, conforme
        al artículo 67 del Código del Trabajo.
      </Clausula>

      <Clausula n="OCTAVO" titulo="Previsión y salud">
        El Trabajador se encontrará afiliado al sistema previsional y de salud que corresponda según la ley,
        efectuándose las cotizaciones legales por parte del Empleador.
      </Clausula>

      <Clausula n="NOVENO" titulo="Terminación">
        El presente contrato podrá terminar por las causales establecidas en los artículos 159, 160 y 161 del
        Código del Trabajo, con los procedimientos y avisos que la ley señala.
      </Clausula>

      <p className="mt-6 text-justify">
        En comprobante y previa lectura, firman las partes en dos ejemplares de idéntico tenor, quedando uno en
        poder de cada parte.
      </p>

      <div className="grid grid-cols-2 gap-12 mt-24 text-center text-xs">
        <div>
          <div className="border-t border-gray-800 pt-2">
            <div className="font-semibold">{emp.nombre}</div>
            <div>RUT: {emp.rut}</div>
            <div className="text-gray-600 mt-1">Trabajador</div>
          </div>
        </div>
        <div>
          <div className="border-t border-gray-800 pt-2">
            <div className="font-semibold">p.p. {EMPRESA.nombre}</div>
            <div>RUT: {EMPRESA.rut}</div>
            <div className="text-gray-600 mt-1">Empleador</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Clausula({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 text-justify">
      <p><strong>{n}: {titulo}.</strong> {children}</p>
    </div>
  );
}
