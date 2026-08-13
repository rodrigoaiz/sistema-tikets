import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readAttachmentFile } from "@/lib/uploads";

export async function GET(_request: Request, context: RouteContext<"/api/attachments/[id]">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = await readAttachmentFile(attachment.storedFilename).catch(() => null);
  if (!buffer) {
    return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
