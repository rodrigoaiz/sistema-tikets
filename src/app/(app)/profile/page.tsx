import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/settings/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mi cuenta" description="Actualiza tu nombre y contraseña." />
      <ProfileForm name={session.user.name ?? ""} email={session.user.email ?? ""} />
    </div>
  );
}
