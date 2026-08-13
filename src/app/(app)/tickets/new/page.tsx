import { PageHeader } from "@/components/page-header";
import { getActiveCategories } from "@/lib/tickets";
import { NewTicketForm } from "./new-ticket-form";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const categories = await getActiveCategories();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nuevo ticket"
        description="Crea un ticket manualmente. Útil mientras se conecta la bandeja de correo, o para reportar un caso que te compartieron por otro medio."
      />
      <NewTicketForm categories={categories.map((c) => ({ id: c.id, label: c.label }))} />
    </div>
  );
}
