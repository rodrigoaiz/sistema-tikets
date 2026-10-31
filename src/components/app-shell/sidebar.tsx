"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Ticket, Inbox, Settings, LifeBuoy, Send } from "lucide-react";
import { useNotificationCenter } from "@/components/app-shell/notification-provider";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/inbox", label: "Bandeja de entrada", icon: Inbox },
  { href: "/campaigns", label: "Campañas", icon: Send, adminOnly: true },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { pendingEmailsCount } = useNotificationCenter();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <LifeBuoy className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Help Desk SEP
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.filter((item) => role === "ADMIN" || (!item.adminOnly && item.href !== "/settings")).map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/inbox" && pendingEmailsCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showBadge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold tabular-nums text-primary-foreground">
                  {pendingEmailsCount > 99 ? "99+" : pendingEmailsCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[11px] leading-snug text-sidebar-foreground/50">
          Soporte técnico — no académico.
          <br />
          Prepa en Línea SEP · Curso de inglés
        </p>
      </div>
    </aside>
  );
}
