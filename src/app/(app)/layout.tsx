import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-shell/sidebar";
import { AppHeader } from "@/components/app-shell/header";
import { NotificationProvider } from "@/components/app-shell/notification-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <NotificationProvider>
      <div className="flex h-svh overflow-hidden">
        <div className="hidden md:flex md:shrink-0">
        <AppSidebar role={session.user.role} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
          name={session.user.name ?? "Agente"}
          email={session.user.email ?? ""}
          role={session.user.role}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
