import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramChatId: true,
      telegramNotificationsEnabled: true,
      telegramNotifyStudentReplies: true,
      telegramNotifyInboxEmails: true,
    },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mi cuenta" description="Actualiza tu nombre y contraseña." />
      <ProfileForm
        name={session.user.name ?? ""}
        email={session.user.email ?? ""}
        telegram={{
          botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
          linked: Boolean(user?.telegramChatId),
          enabled: user?.telegramNotificationsEnabled ?? false,
          notifyStudentReplies: user?.telegramNotifyStudentReplies ?? true,
          notifyInboxEmails: user?.telegramNotifyInboxEmails ?? true,
        }}
      />
    </div>
  );
}
