import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentEmpleado } from "@/hooks/use-current-empleado";
import { PortalBottomNav } from "@/components/portal-bottom-nav";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portal")({ component: PortalLayout });

function PortalLayout() {
  const { user, loading, signOut } = useAuth();
  const { empleado, isAdmin, loading: empLoading } = useCurrentEmpleado();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && !empLoading && user && isAdmin) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, empLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (pathname === "/portal") navigate({ to: "/portal/asistencia" });
  }, [pathname, navigate]);

  if (loading || empLoading) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-30 bg-background border-b">
        <div className="mx-auto max-w-md flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden shrink-0">
            {empleado?.foto_url ? (
              <img src={empleado.foto_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{empleado?.nombre ?? user.email}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {empleado ? `${empleado.cargo} · ${empleado.area}` : "Mi portal"}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate({ to: "/login" }); }} title="Salir">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        {!empleado && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            Tu cuenta aún no está vinculada a un empleado. Contacta a RRHH para que registre tu correo
            <span className="font-medium"> {user.email}</span>.
            <div className="mt-2"><Link to="/login" className="text-primary underline">Volver</Link></div>
          </div>
        )}
        <Outlet />
      </main>

      <PortalBottomNav />
    </div>
  );
}
