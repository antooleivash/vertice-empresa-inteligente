import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentEmpleado } from "@/hooks/use-current-empleado";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: empLoading } = useCurrentEmpleado();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && !empLoading && user && !isAdmin) {
      navigate({ to: "/portal/asistencia" });
    }
  }, [loading, empLoading, user, isAdmin, navigate]);

  if (loading || empLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
