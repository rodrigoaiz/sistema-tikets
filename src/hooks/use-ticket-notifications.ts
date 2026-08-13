"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PRIORITY_LABEL } from "@/lib/constants";

type NewTicket = {
  id: string;
  number: number;
  subject: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  studentEmail: string;
};

type PollResponse = {
  serverTime: string;
  newTickets: NewTicket[];
  pendingEmailsCount: number;
};

const POLL_INTERVAL_MS = 20_000;

/**
 * Hace polling de tickets nuevos y correos pendientes de triage. Muestra un
 * toast (y una notificación del navegador, si el usuario dio permiso) cuando
 * llega un ticket nuevo, priorizando no interrumpir con ruido: una sola
 * notificación por ticket nuevo, nunca repetida.
 */
export function useTicketNotifications() {
  const [pendingEmailsCount, setPendingEmailsCount] = useState(0);
  const lastCheckedRef = useRef(new Date().toISOString());
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/notifications/poll?since=${encodeURIComponent(lastCheckedRef.current)}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const data: PollResponse = await res.json();

        setPendingEmailsCount(data.pendingEmailsCount);

        for (const t of data.newTickets) {
          if (seenIdsRef.current.has(t.id)) continue;
          seenIdsRef.current.add(t.id);

          const title = `Ticket #${t.number} · ${PRIORITY_LABEL[t.priority]}`;
          const body = t.subject;

          toast(title, { description: body });

          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(title, { body });
            }
          }
        }

        lastCheckedRef.current = data.serverTime;
      } catch {
        // Silencioso: si falla el polling no interrumpimos la UI.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { pendingEmailsCount };
}

export function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}
