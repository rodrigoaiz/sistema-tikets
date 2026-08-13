"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isAllowedAttachmentType,
  MAX_ATTACHMENT_SIZE_BYTES,
  saveAttachmentFile,
  deleteAttachmentFile,
} from "@/lib/uploads";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  return session;
}

export async function uploadTicketAttachment(
  ticketId: string,
  file: File
): Promise<ActionResult<{ id: string; filename: string }>> {
  await requireSession();

  if (!isAllowedAttachmentType(file.type)) {
    return {
      ok: false,
      error: "Tipo de archivo no permitido. Solo imágenes (PNG/JPG/WEBP/GIF) o PDF.",
    };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, error: "El archivo excede el tamaño máximo permitido." };
  }

  const { storedFilename, size } = await saveAttachmentFile(file);

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      filename: file.name,
      storedFilename,
      mimeType: file.type,
      size,
    },
  });

  revalidatePath(`/tickets/${ticketId}`);

  return { ok: true, data: { id: attachment.id, filename: attachment.filename } };
}

export async function uploadReplyAttachment(
  ticketId: string,
  replyId: string,
  file: File
): Promise<ActionResult<{ id: string; filename: string }>> {
  await requireSession();

  if (!isAllowedAttachmentType(file.type)) {
    return {
      ok: false,
      error: "Tipo de archivo no permitido. Solo imágenes (PNG/JPG/WEBP/GIF) o PDF.",
    };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, error: "El archivo excede el tamaño máximo permitido." };
  }

  const { storedFilename, size } = await saveAttachmentFile(file);

  const attachment = await prisma.attachment.create({
    data: {
      ticketReplyId: replyId,
      filename: file.name,
      storedFilename,
      mimeType: file.type,
      size,
    },
  });

  revalidatePath(`/tickets/${ticketId}`);

  return { ok: true, data: { id: attachment.id, filename: attachment.filename } };
}

export async function deleteTicketAttachment(attachmentId: string): Promise<ActionResult> {
  await requireSession();

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) {
    return { ok: false, error: "Adjunto no encontrado." };
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteAttachmentFile(attachment.storedFilename);

  if (attachment.ticketId) {
    revalidatePath(`/tickets/${attachment.ticketId}`);
  }

  return { ok: true, data: undefined };
}
