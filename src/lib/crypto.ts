import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Cifrado simétrico (AES-256-GCM) para las contraseñas de los buzones de
 * correo (IMAP/SMTP) guardadas en la base de datos. La llave sale de
 * MAILBOX_ENCRYPTION_KEY (.env) — nunca se guarda la contraseña en texto plano.
 */

function getKey(): Buffer {
  const secret = process.env.MAILBOX_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "Falta MAILBOX_ENCRYPTION_KEY en las variables de entorno (necesaria para cifrar credenciales de correo)."
    );
  }
  // Derivamos una llave de 32 bytes sin importar el largo del secreto original.
  return scryptSync(secret, "helpdesk-mailbox-salt", 32);
}

export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    "."
  );
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, authTagB64, dataB64] = payload.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Formato de credencial cifrada inválido.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
