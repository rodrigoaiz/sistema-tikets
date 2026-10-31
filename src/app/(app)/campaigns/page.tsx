import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CampaignComposer } from "@/components/campaigns/campaign-composer";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      recipients: { select: { status: true } },
    },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Campañas de correo"
        description="Envíos masivos independientes de los tickets y la bandeja de soporte."
      />
      <CampaignComposer
        campaigns={campaigns.map((campaign) => ({
          ...campaign,
          recipients: campaign.recipients.reduce(
            (counts, recipient) => ({ ...counts, [recipient.status]: counts[recipient.status] + 1 }),
            { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 }
          ),
        }))}
      />
    </div>
  );
}
