import Link from "next/link";
import { Archive, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { IncomingEmailCard } from "@/components/inbox/incoming-email-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArchivedInboxPage() {
  const discardedEmails = await prisma.incomingEmail.findMany({
    where: { status: "DISCARDED" },
    orderBy: { receivedAt: "desc" },
    include: { attachments: true },
  });

  return (
    <div>
      <PageHeader
        title="Archivo de descartados"
        description={`${discardedEmails.length} correo${discardedEmails.length === 1 ? "" : "s"} descartado${discardedEmails.length === 1 ? "" : "s"}. Puedes restaurarlos en la bandeja de entrada.`}
        actions={
          <Button size="sm" variant="outline" render={<Link href="/inbox" />}>
            <ArrowLeft className="size-3.5" />
            Volver a bandeja
          </Button>
        }
      />

      {discardedEmails.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Archive className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No hay correos descartados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {discardedEmails.map((email) => (
            <IncomingEmailCard
              key={email.id}
              email={email}
              categories={[]}
              archived
            />
          ))}
        </div>
      )}
    </div>
  );
}
