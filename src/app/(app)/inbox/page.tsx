import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { getActiveCategories } from "@/lib/tickets";
import { IncomingEmailCard } from "@/components/inbox/incoming-email-card";
import { Button } from "@/components/ui/button";
import { Inbox as InboxIcon, Settings, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [pendingEmails, categories, mailbox] = await Promise.all([
    prisma.incomingEmail.findMany({
      where: { status: "PENDING" },
      orderBy: { receivedAt: "desc" },
    }),
    getActiveCategories(),
    prisma.mailboxConfig.findFirst(),
  ]);

  return (
    <div>
      <PageHeader
        title="Bandeja de entrada"
        description="Correos de alumnos pendientes de triage. Decide si se convierten en ticket, se resuelven sin ticket, o se descartan."
      />

      {!mailbox?.enabled ? (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-6">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <InboxIcon className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">El buzón de correo aún no está conectado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando conectes el correo institucional desde Ajustes, los mensajes de los
              alumnos aparecerán aquí automáticamente para que decidas qué hacer con cada uno.
              Mientras tanto, puedes seguir creando tickets manualmente.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" render={<Link href="/settings" />}>
              <Settings className="size-3.5" />
              Ir a Ajustes
            </Button>
            <Button size="sm" render={<Link href="/tickets/new" />}>
              <Plus className="size-3.5" />
              Crear ticket manual
            </Button>
          </div>
        </div>
      ) : null}

      {pendingEmails.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No hay correos pendientes de triage.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingEmails.map((email) => (
            <IncomingEmailCard
              key={email.id}
              email={email}
              categories={categories.map((c) => ({ id: c.id, label: c.label }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
