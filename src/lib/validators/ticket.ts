import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().trim().min(5, "El asunto debe tener al menos 5 caracteres.").max(200),
  description: z.string().trim().min(10, "Describe el problema con más detalle.").max(5000),
  studentEmail: z.string().trim().email("Correo del alumno inválido."),
  studentName: z.string().trim().max(150).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  categoryId: z.string().optional().or(z.literal("")),
});

export const addReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "Escribe una respuesta o nota.").max(5000),
  isInternalNote: z.boolean().default(false),
});

export const updateTicketSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  categoryId: z.string().nullable().optional(),
});
