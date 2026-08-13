"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotificationCenter } from "@/components/app-shell/notification-provider";

export function NotificationPermissionButton() {
  const { permission, pendingEmailsCount, requestPermission } = useNotificationCenter();

  if (permission === "unsupported") {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            aria-label="Estado de notificaciones de tickets"
            onClick={() => void requestPermission()}
          />
        }
      >
        {permission === "denied" ? (
          <BellOff className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {pendingEmailsCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {pendingEmailsCount > 99 ? "99+" : pendingEmailsCount}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent>
        {permission === "denied"
          ? "Notificaciones bloqueadas en el navegador"
          : permission === "granted"
            ? "Notificaciones activas; revisar cada 20 segundos"
            : "Activar notificaciones de tickets nuevos"}
      </TooltipContent>
    </Tooltip>
  );
}
