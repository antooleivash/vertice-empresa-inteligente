import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Wallet, Activity, Brain, ShieldCheck, Smartphone, UserSearch,
  Check, Sparkles, LineChart, ShieldQuestion, Building2, Truck, Anchor,
  ShoppingBag, HardHat, Factory, ArrowRight, Mail,
  Scale, MapPin, MessageCircle, Link as LinkIcon, BarChart,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vértice — Plataforma empresarial inteligente para Chile" },
      { name: "description", content: "Vértice une RRHH, finanzas, operaciones e IA en un solo sistema. Tu negocio conectado, con decisiones predictivas en tiempo real." },
      { property: "og:title", content: "Vértice — Tu negocio conectado" },
      { property: "og:description", content: "Plataforma empresarial inteligente con IA predictiva para empresas operativas en Chile." },
    ],
  }),
  component: Landing,
});

const modulos = [
  { icon: Users, title: "Recursos Humanos", desc: "Asistencia, turnos, liquidaciones y cartas de amonestación." },
  { icon: Wallet, title: "Finanzas", desc: "Costos, ingresos, flujo de caja y presupuesto vs real." },
  { icon: Activity, title: "Operaciones", desc: "Productividad, rendimiento por turno y por área." },
  { icon: Brain, title: "Inteligencia IA", desc: "Alertas automáticas, predicciones y detección de riesgos." },
  { icon: ShieldCheck, title: "Cumplimiento DT", desc: "Contratos, jornada laboral y documentos legales." },
  { icon: Smartphone, title: "Portal del empleado", desc: "Marcaje con GPS, vacaciones y liquidaciones propias." },
  { icon: UserSearch, title: "Reclutamiento IA", desc: "Publicación, filtro de CV y ranking de candidatos." },
];

const sectores = [
  { icon: Factory, label: "Salmoneras" },
  { icon: Truck, label: "Logística" },
  { icon: Anchor, label: "Puertos" },
  { icon: ShoppingBag, label: "Retail" },
  { icon: HardHat, label: "Constructoras" },
  { icon: Building2, label: "PYMEs" },
];

const planes = [
  {
    nombre: "Básico", precio: "$49.990", popular: false,
    desc: "Hasta 50 trabajadores",
    features: ["Módulo RRHH", "Asistencia con GPS", "Soporte por correo"],
  },
  {
    nombre: "Empresa", precio: "$99.990", popular: true,
    desc: "Hasta 200 trabajadores",
    features: ["Todos los módulos", "IA predictiva básica", "Soporte prioritario"],
  },
  {
    nombre: "Corporativo", precio: "$199.990", popular: false,
    desc: "Trabajadores ilimitados",
    features: ["IA completa", "Integraciones a medida", "Soporte 24/7"],
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5">
            <Sparkles className="mr-1 h-3 w-3" /> Plataforma empresarial inteligente
          </Badge>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-primary">
            Vértice
          </h1>
          <p className="mt-3 text-xl md:text-2xl font-medium tracking-tight">
            Tu negocio conectado
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            La plataforma empresarial inteligente que une operaciones, finanzas, personas e IA en un solo sistema.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="px-7">
              <Link to="/login">Ver demo gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-7">
              <a href="#propuesta">Conocer más</a>
            </Button>
          </div>
        </div>
      </section>

      {/* PROPUESTA */}
      <section id="propuesta" className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Más que un software, tu asesor digital
            </h2>
            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
              Nuestro software no es solo una herramienta de gestión, sino un asesor digital proactivo. A diferencia de las soluciones genéricas, nuestro sistema se integra con los datos específicos de tu empresa, aprendiendo de cada acción. Ofrecemos simulaciones inmersivas, donde puedes visualizar tu negocio en tiempo real, experimentar escenarios y recibir recomendaciones anticipadas. Más que un reporte, te damos un camino a seguir. Esta inteligencia predictiva y personalizada te permite tomar decisiones con confianza, proyectando no solo tu presente, sino el futuro de tu negocio.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Brain, title: "Inteligencia predictiva", desc: "Anticipa riesgos y oportunidades antes de que ocurran." },
              { icon: LineChart, title: "Datos en tiempo real", desc: "Visualiza el pulso completo de tu empresa al instante." },
              { icon: ShieldQuestion, title: "Decisiones con confianza", desc: "Recomendaciones claras basadas en tu propia operación." },
            ].map((f) => (
              <Card key={f.title} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIADORES */}
      <DiferenciadoresSection />

      {/* MÓDULOS */}
      <section id="modulos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Todo lo que tu empresa necesita en un solo lugar
          </h2>
          <p className="mt-4 text-muted-foreground">
            Siete módulos integrados que conversan entre sí en tiempo real.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <Card key={m.title} className="p-6 transition-shadow hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PARA QUIÉN */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Diseñado para empresas operativas
          </h2>
          <p className="mt-4 text-muted-foreground">
            Pensado para industrias con turnos, terreno y muchas personas en movimiento.
          </p>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {sectores.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-background text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Planes simples y transparentes
          </h2>
          <p className="mt-4 text-muted-foreground">Sin letra chica. Cancela cuando quieras.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {planes.map((p) => (
            <Card
              key={p.nombre}
              className={`p-7 flex flex-col ${p.popular ? "border-primary shadow-lg ring-1 ring-primary/20 relative" : ""}`}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Más popular</Badge>
              )}
              <h3 className="text-lg font-semibold">Plan {p.nombre}</h3>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{p.precio}</span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-7" variant={p.popular ? "default" : "outline"}>
                <Link to="/login">Comenzar ahora</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            ¿Listo para transformar tu empresa?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comienza con 30 días gratis, sin tarjeta de crédito.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button asChild size="lg" className="px-8">
              <Link to="/login">Solicitar demo gratuita</Link>
            </Button>
            <a
              href="mailto:contacto@verticeapp.cl"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <Mail className="h-4 w-4" /> contacto@verticeapp.cl
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Vértice</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#modulos" className="hover:text-foreground">Módulos</a>
          <a href="#precios" className="hover:text-foreground">Precios</a>
          <a href="#contacto" className="hover:text-foreground">Contacto</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/login">Demo gratis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Vértice</span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Inicio</a>
            <a href="#modulos" className="hover:text-foreground">Módulos</a>
            <a href="#precios" className="hover:text-foreground">Precios</a>
            <a href="#contacto" className="hover:text-foreground">Contacto</a>
            <Link to="/login" className="hover:text-foreground">Iniciar sesión</Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-muted-foreground text-center md:text-left">
          © 2026 Vértice · Chile · Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}
