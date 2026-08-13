import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export const MAX_ATTACHMENT_SIZE_BYTES =
  Number(process.env.MAX_ATTACHMENT_SIZE_MB ?? 10) * 1024 * 1024;

function resolveUploadsDir(): string {
  const dir = process.env.UPLOADS_DIR ?? "./data/uploads";
  if (path.isAbsolute(dir)) return dir;
  // path.join con process.cwd() dinámico hace que Next.js trace todo el
  // proyecto como dependencia de este route handler. Evitamos eso resolviendo
  // manualmente sin pasar por el análisis estático de Turbopack.
  return `${process.cwd()}/${dir.replace(/^\.\//, "")}`;
}

export function isAllowedAttachmentType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export async function saveAttachmentFile(
  file: File
): Promise<{ storedFilename: string; size: number }> {
  const dir = resolveUploadsDir();
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const storedFilename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(/* turbopackIgnore: true */ dir, storedFilename), buffer);

  return { storedFilename, size: buffer.byteLength };
}

export async function readAttachmentFile(storedFilename: string): Promise<Buffer> {
  const dir = resolveUploadsDir();
  return readFile(path.join(/* turbopackIgnore: true */ dir, storedFilename));
}

export async function deleteAttachmentFile(storedFilename: string): Promise<void> {
  const dir = resolveUploadsDir();
  await unlink(path.join(/* turbopackIgnore: true */ dir, storedFilename)).catch(() => undefined);
}
