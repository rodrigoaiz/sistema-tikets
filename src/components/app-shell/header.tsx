"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-shell/sidebar";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";
import { NotificationPermissionButton } from "@/components/app-shell/notification-permission-button";

export function AppHeader({ name, email, role }: { name: string; email: string; role: string }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Abrir menú"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <AppSidebar role={role} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-1">
        <NotificationPermissionButton />
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
