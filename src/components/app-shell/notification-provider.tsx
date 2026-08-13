"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTicketNotifications } from "@/hooks/use-ticket-notifications";

type NotificationPermissionState = NotificationPermission | "unsupported";

type NotificationCenter = {
  pendingEmailsCount: number;
  permission: NotificationPermissionState;
  requestPermission: () => Promise<void>;
};

const NotificationCenterContext = createContext<NotificationCenter | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { pendingEmailsCount } = useTicketNotifications();
  const [permission, setPermission] = useState<NotificationPermissionState>("default");

  useEffect(() => {
    // Notification solo existe en el navegador.
    if ("Notification" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  async function requestPermission() {
    if (permission === "unsupported") return;

    if (permission === "denied") {
      toast.error("Las notificaciones están bloqueadas en el navegador.");
      return;
    }

    if (permission === "granted") {
      toast.info("Las notificaciones de tickets están activas.");
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission === "granted") {
      toast.success("Notificaciones activadas.");
    }
  }

  return (
    <NotificationCenterContext.Provider
      value={{ pendingEmailsCount, permission, requestPermission }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("useNotificationCenter debe usarse dentro de NotificationProvider");
  }
  return context;
}
