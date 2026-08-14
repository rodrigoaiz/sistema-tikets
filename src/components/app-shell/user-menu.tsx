"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, UserRound } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <details className="group relative">
      <summary
        className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-medium outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"
        aria-label="Abrir menú de usuario"
      >
        <Avatar className="size-6">
          <AvatarFallback className="text-[11px]">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">{name}</span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
        >
          <UserRound className="size-4" />
          Mi cuenta
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive outline-none hover:bg-destructive/10 focus-visible:bg-destructive/10"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </div>
    </details>
  );
}
