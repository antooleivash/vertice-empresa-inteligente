import { Link, useRouterState } from "@tanstack/react-router";
import { Clock, Calendar, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/portal/asistencia", label: "Asistencia", icon: Clock },
  { to: "/portal/permisos", label: "Permisos", icon: Calendar },
  { to: "/portal/liquidaciones", label: "Pagos", icon: Receipt },
  { to: "/portal/documentos", label: "Documentos", icon: FileText },
];

export function PortalBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur z-40">
      <div className="mx-auto max-w-md grid grid-cols-4">
        {items.map((it) => {
          const active = pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
