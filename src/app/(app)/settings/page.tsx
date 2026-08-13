import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MailboxForm } from "@/components/settings/mailbox-form";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { ProfileForm } from "@/components/settings/profile-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const defaultTab = params.tab === "account" ? "account" : "mailbox";
  const [mailbox, categories] = await Promise.all([
    prisma.mailboxConfig.findFirst(),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" description="Correo, categorías y tu cuenta." />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="mailbox">Correo</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="account">Mi cuenta</TabsTrigger>
        </TabsList>

        <TabsContent value="mailbox" className="pt-6">
          <MailboxForm
            hasCredentials={Boolean(mailbox)}
            defaultValues={{
              name: mailbox?.name ?? "Bandeja principal",
              imapHost: mailbox?.imapHost ?? "",
              imapPort: mailbox?.imapPort ?? 993,
              imapUser: mailbox?.imapUser ?? "",
              imapUseTls: mailbox?.imapUseTls ?? true,
              smtpHost: mailbox?.smtpHost ?? "",
              smtpPort: mailbox?.smtpPort ?? 465,
              smtpUser: mailbox?.smtpUser ?? "",
              smtpUseTls: mailbox?.smtpUseTls ?? true,
              fromAddress: mailbox?.fromAddress ?? "",
              enabled: mailbox?.enabled ?? false,
            }}
          />
        </TabsContent>

        <TabsContent value="categories" className="pt-6">
          <CategoriesManager categories={categories} />
        </TabsContent>

        <TabsContent value="account" className="pt-6">
          <ProfileForm
            name={session?.user?.name ?? ""}
            email={session?.user?.email ?? ""}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
