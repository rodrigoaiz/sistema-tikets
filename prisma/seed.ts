import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEFAULT_CATEGORIES: Array<{ key: string; label: string; order: number }> = [
  { key: "acceso_login", label: "Acceso / Inicio de sesión", order: 0 },
  { key: "reproduccion_multimedia", label: "Reproducción de video o audio", order: 1 },
  { key: "envio_examen_tarea", label: "Envío de examen o tarea", order: 2 },
  { key: "carga_archivos", label: "Carga de archivos", order: 3 },
  { key: "calificaciones_certificados", label: "Calificaciones y certificados", order: 4 },
  { key: "compatibilidad_navegador", label: "Compatibilidad de navegador", order: 5 },
  { key: "cuenta_perfil", label: "Cuenta / Perfil", order: 6 },
  { key: "otro", label: "Otro", order: 7 },
];

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@helpdesk.local").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const adminName = process.env.ADMIN_NAME ?? "Administrador";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Usuario admin listo: ${admin.email}`);

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { key: category.key },
      update: { label: category.label, order: category.order },
      create: category,
    });
  }

  console.log(`Categorías por defecto: ${DEFAULT_CATEGORIES.length} listas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
