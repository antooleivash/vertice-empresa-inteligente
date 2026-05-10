import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Carta, Empleado } from "@/lib/domain";
import { formatCLP, formatDate } from "@/lib/domain";
import type { EmpresaConfig } from "@/hooks/use-empresa";

export const Route = createFileRoute("/print/$tipo/$id")({ component: PrintPage });

type Contrato = {
  id: string; empleado_id: string; tipo: string;
  fecha_inicio: string; fecha_vencimiento: string | null;
  cargo: string; sueldo_base: number;
};

type ItemMonto = { concepto: string; monto: number };

type LiqFull = {
  id: string; empleado_id: string; periodo: string;
  sueldo_base: number; bonos: number; descuentos: number; liquido: number;
  dias_trabajados?: number; dias_inasistencia?: number;
  horas_extras?: number; gratificacion?: number; asignacion_familiar?: number;
  afp?: string; salud?: string; salud_monto?: number;
  anticipo?: number; uf_valor?: number;
  cotiz_prevision?: number; cotiz_salud?: number; seguro_cesantia?: number; impuesto_unico?: number;
  total_haberes?: number; total_descuentos?: number;
  otros_bonos?: ItemMonto[]; otros_descuentos?: ItemMonto[];
};

const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre: "Mi Empresa S.A.", rut: "76.000.000-0",
  direccion: "Av. Principal 1234, Puerto Montt", telefono: null, web: null,
  ciudad: "Puerto Montt", logo_url: null,
};

function PrintPage() {
  const { tipo, id } = Route.useParams();
  const [doc, setDoc] = useState<Carta | LiqFull | Contrato | null>(null);
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaConfig>(DEFAULT_EMPRESA);
  const [contrato, setContrato] = useState<{ tipo: string; fecha_inicio: string } | null>(null);

  useEffect(() => {
    (async () => {
      const tabla = tipo === "carta" ? "cartas" : tipo === "contrato" ? "contratos" : "liquidaciones";
      const [{ data: d }, { data: e }] = await Promise.all([
        supabase.from(tabla).select("*").eq("id", id).single(),
        Promise.resolve({ data: null }),
      ]);
      if (!d) return;
      setDoc(d as Carta | LiqFull | Contrato);
      const empId = (d as { empleado_id: string }).empleado_id;
      const [{ data: empData }, { data: cfg }, { data: contr }] = await Promise.all([
        supabase.from("empleados").select("*").eq("id", empId).single(),
        supabase.from("empresa_config").select("*").limit(1).maybeSingle(),
        tipo === "liquidacion"
          ? supabase.from("contratos").select("tipo,fecha_inicio").eq("empleado_id", empId).order("fecha_inicio", { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setEmp(empData as Empleado);
      if (cfg) setEmpresa(cfg as EmpresaConfig);
      if (contr) setContrato(contr as { tipo: string; fecha_inicio: string });
      void e;
    })();
  }, [tipo, id]);

  useEffect(() => {
    if (doc && emp) setTimeout(() => window.print(), 400);
  }, [doc, emp]);

  if (!doc || !emp) return <div className="p-10 text-center text-sm text-gray-500">Cargando documento…</div>;

  return (
    <div className="bg-white text-black mx-auto max-w-4xl p-10 font-sans text-[12px]">
      <style>{`
        @media print { @page { size: A4; margin: 12mm; } body { background: white; } .no-print { display: none; } }
      `}</style>

      {tipo === "carta" && <CartaContent doc={doc as Carta} emp={emp} empresa={empresa} />}
      {tipo === "liquidacion" && <LiqContent doc={doc as LiqFull} emp={emp} empresa={empresa} contrato={contrato} />}
      {tipo === "contrato" && <ContratoContent doc={doc as Contrato} emp={emp} empresa={empresa} />}

      <div className="no-print mt-8 text-center">
        <button onClick={() => window.print()} className="rounded bg-gray-900 text-white px-4 py-2 text-sm">Imprimir / Guardar PDF</button>
      </div>
    </div>
  );
}

function EmpresaHeader({ empresa, titulo }: { empresa: EmpresaConfig; titulo: string }) {
  return (
    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 mb-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">{titulo}</h1>
        <p className="text-[11px] text-gray-600">{empresa.nombre}</p>
      </div>
      <div className="text-right">
        {empresa.logo_url
          ? <img src={empresa.logo_url} alt="Logo" className="max-h-16 max-w-[180px] object-contain ml-auto" />
          : <div className="text-base font-bold">{empresa.nombre}</div>}
      </div>
    </div>
  );
}

/* ============ LIQUIDACIÓN BUK-STYLE ============ */
function LiqContent({ doc, emp, empresa, contrato }: { doc: LiqFull; emp: Empleado; empresa: EmpresaConfig; contrato: { tipo: string; fecha_inicio: string } | null }) {
  const periodoLabel = (() => {
    const [y, m] = doc.periodo.split("-");
    const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return `${meses[Number(m) - 1] ?? m} ${y}`;
  })();

  const otrosBonos = doc.otros_bonos ?? [];
  const otrosDesc = doc.otros_descuentos ?? [];
  const totalH = doc.total_haberes ?? doc.sueldo_base + doc.bonos;
  const totalD = doc.total_descuentos ?? doc.descuentos;
  const baseTrib = (doc.sueldo_base + (doc.gratificacion ?? 0) + (doc.horas_extras ?? 0) + otrosBonos.reduce((s,b)=>s+(b.monto||0),0))
    - (doc.cotiz_prevision ?? 0) - (doc.cotiz_salud ?? 0) - (doc.seguro_cesantia ?? 0);
  const impPrev = (doc.cotiz_prevision ?? 0) + (doc.cotiz_salud ?? 0);

  return (
    <article>
      <EmpresaHeader empresa={empresa} titulo="Liquidación de Sueldo" />

      <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
        <div>
          <Row k="Empleador" v={`${empresa.nombre} (${empresa.rut ?? "—"})`} />
          <Row k="Empresa" v={empresa.nombre} />
          <Row k="Gerencia/Área" v={emp.area} />
        </div>
        <div className="text-right">
          <Row k="Mes" v={periodoLabel} right />
          <Row k="Ciudad" v={empresa.ciudad ?? "—"} right />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border border-gray-300 p-3 mb-3 text-[11px]">
        <div>
          <Row k="Sr(a)" v={emp.nombre} />
          <Row k="RUT" v={emp.rut} />
          <Row k="Cargo" v={emp.cargo} />
          <Row k="Centro de Costo" v={emp.area} />
          <Row k="Sueldo Base" v={formatCLP(doc.sueldo_base)} />
        </div>
        <div>
          <Row k="Tipo Contrato" v={contrato?.tipo ?? "Indefinido"} />
          <Row k="Inicio Contrato" v={formatDate(contrato?.fecha_inicio ?? emp.fecha_ingreso)} />
          <Row k="Días Trabajados" v={String(doc.dias_trabajados ?? 30)} />
          <Row k="Inasistencia" v={`${doc.dias_inasistencia ?? 0} días`} />
          <Row k="Horas Extras" v={formatCLP(doc.horas_extras ?? 0)} />
          <Row k="Horas no Trab." v="0" />
        </div>
        <div>
          <Row k="Previsión" v={`AFP ${doc.afp ?? "Habitat"}`} />
          <Row k="Salud" v={doc.salud ?? "Fonasa"} />
          <Row k="UF" v={formatCLP(doc.uf_valor ?? 39000)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* HABERES */}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-800 text-white"><th className="text-left p-1.5">HABERES</th><th className="text-right p-1.5">Monto</th></tr>
          </thead>
          <tbody>
            <tr className="bg-gray-100 font-semibold"><td className="p-1.5 border">Imponibles</td><td className="p-1.5 border text-right">{formatCLP(doc.sueldo_base + (doc.gratificacion ?? 0) + (doc.horas_extras ?? 0) + otrosBonos.reduce((s,b)=>s+(b.monto||0),0))}</td></tr>
            <Item k="Sueldo Base" v={doc.sueldo_base} />
            <Item k="Gratificación 25%" v={doc.gratificacion ?? 0} />
            <Item k="Horas Extras 50%" v={doc.horas_extras ?? 0} />
            {otrosBonos.map((b, i) => <Item key={i} k={b.concepto || "Bono"} v={b.monto} />)}
            <tr className="bg-gray-100 font-semibold"><td className="p-1.5 border">No Imponibles</td><td className="p-1.5 border text-right">{formatCLP(doc.asignacion_familiar ?? 0)}</td></tr>
            {(doc.asignacion_familiar ?? 0) > 0 && <Item k="Asig. Familiar" v={doc.asignacion_familiar ?? 0} />}
          </tbody>
        </table>

        {/* DESCUENTOS */}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-800 text-white"><th className="text-left p-1.5">DESCUENTOS</th><th className="text-right p-1.5">Monto</th></tr>
          </thead>
          <tbody>
            <tr className="bg-gray-100 font-semibold"><td className="p-1.5 border">Legales</td><td className="p-1.5 border text-right">{formatCLP((doc.cotiz_prevision ?? 0) + (doc.cotiz_salud ?? 0) + (doc.seguro_cesantia ?? 0) + (doc.impuesto_unico ?? 0))}</td></tr>
            <Item k={`Cotiz. Previ. AFP ${doc.afp ?? ""}`} v={doc.cotiz_prevision ?? 0} />
            <Item k={`Cotiz. Salud ${doc.salud ?? ""} 7%`} v={doc.cotiz_salud ?? 0} />
            <Item k="Seguro Cesantía 0,6%" v={doc.seguro_cesantia ?? 0} />
            {(doc.impuesto_unico ?? 0) > 0 && <Item k="Impuesto Único" v={doc.impuesto_unico ?? 0} />}
            <tr className="bg-gray-100 font-semibold"><td className="p-1.5 border">Otros</td><td className="p-1.5 border text-right">{formatCLP((doc.anticipo ?? 0) + otrosDesc.reduce((s,d)=>s+(d.monto||0),0))}</td></tr>
            {(doc.anticipo ?? 0) > 0 && <Item k="Anticipo de sueldo" v={doc.anticipo ?? 0} />}
            {otrosDesc.map((d, i) => <Item key={i} k={d.concepto || "Otro"} v={d.monto} />)}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-[11px]">
        <div className="border p-2 flex justify-between"><span className="font-semibold">TOTAL HABERES</span><span>{formatCLP(totalH)}</span></div>
        <div className="border p-2 flex justify-between"><span className="font-semibold">TOTAL DESCUENTOS</span><span>{formatCLP(totalD)}</span></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-[10px]">
        <div className="border p-1.5 flex justify-between"><span>Imp. Prev./Salud</span><span>{formatCLP(impPrev)}</span></div>
        <div className="border p-1.5 flex justify-between"><span>Imp. Cesantía</span><span>{formatCLP(doc.seguro_cesantia ?? 0)}</span></div>
        <div className="border p-1.5 flex justify-between"><span>Base Tributable</span><span>{formatCLP(baseTrib)}</span></div>
      </div>

      <div className="border-2 border-gray-900 bg-gray-100 p-3 text-center mb-6">
        <div className="text-xs text-gray-700">LÍQUIDO A RECIBIR</div>
        <div className="text-3xl font-extrabold tracking-tight">{formatCLP(doc.liquido)}</div>
      </div>

      <p className="text-[10px] text-justify mb-10 text-gray-700">
        Certifico que he recibido de <strong>{empresa.nombre}</strong> a mi entera satisfacción la suma indicada
        como líquido a pagar correspondiente al periodo <strong>{periodoLabel}</strong>, por concepto de remuneraciones
        y beneficios devengados en dicho mes, no quedando deuda pendiente entre las partes por este concepto.
      </p>

      <div className="grid grid-cols-2 gap-12 mt-12 text-center text-[10px]">
        <div></div>
        <div>
          <div className="border-t border-gray-800 pt-1.5">
            <div className="font-semibold">{emp.nombre}</div>
            <div>RUT: {emp.rut}</div>
            <div className="text-gray-600 mt-1">FIRMA CONFORME</div>
          </div>
        </div>
      </div>

      <footer className="mt-8 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500">
        {empresa.nombre} · {empresa.direccion ?? ""} {empresa.telefono ? `· ${empresa.telefono}` : ""}
      </footer>
    </article>
  );
}

function Row({ k, v, right }: { k: string; v: string; right?: boolean }) {
  return <div className={right ? "text-right" : ""}><span className="text-gray-600">{k}: </span><span className="font-medium">{v}</span></div>;
}
function Item({ k, v }: { k: string; v: number }) {
  return <tr><td className="p-1.5 border pl-4">{k}</td><td className="p-1.5 border text-right">{formatCLP(v)}</td></tr>;
}

/* ============ CARTA ============ */
function CartaContent({ doc, emp, empresa }: { doc: Carta; emp: Empleado; empresa: EmpresaConfig }) {
  const titulo = { amonestacion: "CARTA DE AMONESTACIÓN", advertencia: "CARTA DE ADVERTENCIA", felicitacion: "CARTA DE FELICITACIÓN" }[doc.tipo];
  return (
    <article className="font-serif">
      <EmpresaHeader empresa={empresa} titulo={titulo} />
      <div className="mb-6 text-sm">
        <p><strong>Sr(a).:</strong> {emp.nombre}</p>
        <p><strong>RUT:</strong> {emp.rut}</p>
        <p><strong>Cargo:</strong> {emp.cargo} — {emp.area}</p>
        <p><strong>Fecha:</strong> {formatDate(doc.fecha)}</p>
      </div>
      <div className="mb-6"><p className="font-semibold mb-2">Motivo:</p><p className="text-sm">{doc.motivo}</p></div>
      <div className="mb-10"><p className="font-semibold mb-2">Detalle:</p><p className="text-sm whitespace-pre-wrap leading-relaxed">{doc.contenido}</p></div>
      <div className="grid grid-cols-2 gap-12 mt-20 text-center text-xs">
        <div><div className="border-t border-gray-800 pt-2">Firma Empleador</div></div>
        <div><div className="border-t border-gray-800 pt-2">Firma Trabajador</div></div>
      </div>
      <footer className="mt-12 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500">
        {empresa.nombre} · {empresa.direccion ?? ""}
      </footer>
    </article>
  );
}

/* ============ CONTRATO ============ */
function ContratoContent({ doc, emp, empresa }: { doc: Contrato; emp: Empleado; empresa: EmpresaConfig }) {
  const hoy = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const tipoTxt = doc.tipo === "Indefinido" ? "de carácter INDEFINIDO"
    : doc.tipo === "Plazo fijo" ? `a PLAZO FIJO, con vencimiento el ${formatDate(doc.fecha_vencimiento)}`
    : `por OBRA Y FAENA${doc.fecha_vencimiento ? `, con término estimado el ${formatDate(doc.fecha_vencimiento)}` : ""}`;

  return (
    <article className="text-sm leading-relaxed font-serif">
      <EmpresaHeader empresa={empresa} titulo="Contrato de Trabajo" />
      <p className="text-right mb-6">{empresa.ciudad ?? ""}, {hoy}</p>
      <p className="mb-4 text-justify">
        En <strong>{empresa.ciudad ?? ""}</strong>, con fecha {hoy}, entre <strong>{empresa.nombre}</strong>,
        RUT <strong>{empresa.rut ?? ""}</strong>, con domicilio en {empresa.direccion ?? ""}, en adelante
        "<strong>el Empleador</strong>", y don(ña) <strong>{emp.nombre}</strong>, RUT <strong> {emp.rut}</strong>,
        en adelante "<strong>el Trabajador</strong>", se conviene el siguiente contrato de trabajo {tipoTxt},
        regido por las disposiciones del Código del Trabajo de Chile.
      </p>
      <Clausula n="PRIMERO" titulo="Funciones">
        El Trabajador se compromete a desempeñar el cargo de <strong>{emp.cargo}</strong> en el área de <strong> {emp.area}</strong>.
      </Clausula>
      <Clausula n="SEGUNDO" titulo="Vigencia">
        Comenzará a regir el <strong>{formatDate(doc.fecha_inicio)}</strong>, modalidad {tipoTxt}.
      </Clausula>
      <Clausula n="TERCERO" titulo="Remuneración">
        Sueldo base mensual de <strong>{formatCLP(doc.sueldo_base)}</strong>, pagaderos por mes vencido.
      </Clausula>
      <Clausula n="CUARTO" titulo="Jornada">
        Jornada ordinaria de <strong>42 horas semanales</strong>, según <strong>Ley N° 21.561</strong>.
      </Clausula>
      <Clausula n="QUINTO" titulo="Horas extraordinarias">
        Máximo <strong>2 horas diarias</strong> y <strong>10 semanales</strong>, recargo 50% (Art. 31 C.T.).
      </Clausula>
      <Clausula n="SEXTO" titulo="Feriado">15 días hábiles con remuneración íntegra (Art. 67 C.T.).</Clausula>
      <Clausula n="SÉPTIMO" titulo="Terminación">Causales artículos 159, 160 y 161 del Código del Trabajo.</Clausula>
      <p className="mt-6 text-justify">En comprobante firman las partes en dos ejemplares de idéntico tenor.</p>
      <div className="grid grid-cols-2 gap-12 mt-24 text-center text-xs">
        <div><div className="border-t border-gray-800 pt-2"><div className="font-semibold">{emp.nombre}</div><div>RUT: {emp.rut}</div><div className="text-gray-600 mt-1">Trabajador</div></div></div>
        <div><div className="border-t border-gray-800 pt-2"><div className="font-semibold">p.p. {empresa.nombre}</div><div>RUT: {empresa.rut ?? ""}</div><div className="text-gray-600 mt-1">Empleador</div></div></div>
      </div>
      <footer className="mt-12 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500">
        {empresa.nombre} · {empresa.direccion ?? ""}
      </footer>
    </article>
  );
}

function Clausula({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return <div className="mb-3 text-justify"><p><strong>{n}: {titulo}.</strong> {children}</p></div>;
}
