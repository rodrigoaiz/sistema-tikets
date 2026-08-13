import type { Priority, TicketStatus, TicketSource, IncomingEmailStatus } from "@prisma/client";

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

// Clases Tailwind por prioridad. Un solo acento (petróleo) se reserva para
// acciones primarias; aquí usamos colores semánticos distintos e intencionales
// para que la urgencia se lea de un vistazo, sin depender solo del color.
export const PRIORITY_BADGE_CLASS: Record<Priority, string> = {
  LOW: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  HIGH: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
};

export const PRIORITY_DOT_CLASS: Record<Priority, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-rose-500",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En progreso",
  CLOSED: "Cerrado",
};

export const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  OPEN: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

export const SOURCE_LABEL: Record<TicketSource, string> = {
  MANUAL: "Manual",
  EMAIL: "Correo",
};

export const INCOMING_EMAIL_STATUS_LABEL: Record<IncomingEmailStatus, string> = {
  PENDING: "Pendiente",
  CONVERTED: "Convertido",
  REPLIED: "Respondido",
  DISCARDED: "Descartado",
};

export const DEFAULT_CATEGORIES: Array<{ key: string; label: string; order: number }> = [
  { key: "acceso_login", label: "Acceso / Inicio de sesión", order: 0 },
  { key: "reproduccion_multimedia", label: "Reproducción de video o audio", order: 1 },
  { key: "envio_examen_tarea", label: "Envío de examen o tarea", order: 2 },
  { key: "carga_archivos", label: "Carga de archivos", order: 3 },
  { key: "calificaciones_certificados", label: "Calificaciones y certificados", order: 4 },
  { key: "compatibilidad_navegador", label: "Compatibilidad de navegador", order: 5 },
  { key: "cuenta_perfil", label: "Cuenta / Perfil", order: 6 },
  { key: "otro", label: "Otro", order: 7 },
];
