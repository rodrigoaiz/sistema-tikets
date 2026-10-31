"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, ImagePlus, Loader2, MailCheck, Send, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, queueHalloweenCampaign, sendCampaignTestEmail } from "@/lib/actions/campaigns";

type Campaign = {
  id: string;
  title: string;
  status: "DRAFT" | "QUEUED" | "SENDING" | "COMPLETED";
  createdAt: Date;
  recipients: Record<"PENDING" | "PROCESSING" | "SENT" | "FAILED", number>;
};

type CsvData = { headers: string[]; rows: string[][] };

const DEFAULT_BODY = [
  "Happy Halloween! 🎃👻",
  "",
  "Dear {{name}},",
  "",
  "Wishing you a fun and spooky Halloween!",
  "",
  "Keep learning, keep practicing, and remember: learning English is a wonderful adventure!",
  "",
  "Have a spook-tacular day!",
  "",
  "Your English Course Team",
].join("\n");

const STATUS_LABELS: Record<Campaign["status"], string> = {
  DRAFT: "Borrador",
  QUEUED: "En cola",
  SENDING: "Enviando",
  COMPLETED: "Finalizada",
};

function parseCsvRow(row: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function suggestColumn(headers: string[], names: string[]) {
  return headers.find((header) => names.includes(header.toLowerCase())) ?? "";
}

export function CampaignComposer({ campaigns }: { campaigns: Campaign[] }) {
  const csvInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [emailColumn, setEmailColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [roleColumn, setRoleColumn] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [title, setTitle] = useState("Happy Halloween 2026");
  const [subject, setSubject] = useState("Happy Halloween!");
  const [bodyText, setBodyText] = useState(DEFAULT_BODY);
  const [testAddress, setTestAddress] = useState("");
  const [testName, setTestName] = useState("Rodrigo");
  const [confirmation, setConfirmation] = useState<Record<string, string>>({});
  const [isCreating, startCreating] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [isQueueing, startQueueing] = useTransition();

  const emailIndex = csvData?.headers.indexOf(emailColumn) ?? -1;
  const nameIndex = csvData?.headers.indexOf(nameColumn) ?? -1;
  const roleIndex = csvData?.headers.indexOf(roleColumn) ?? -1;
  const availableRoles = csvData && roleIndex >= 0
    ? [...new Set(csvData.rows.map((row) => row[roleIndex]).filter(Boolean))].sort()
    : [];
  const recipients = csvData && emailIndex >= 0
    ? [...csvData.rows.reduce((items, row) => {
        const role = roleIndex >= 0 ? row[roleIndex] : "";
        const email = row[emailIndex]?.trim().toLowerCase();
        if (email && (roleIndex < 0 || selectedRoles.includes(role)) && !items.has(email)) {
          items.set(email, nameIndex >= 0 ? row[nameIndex]?.trim() || undefined : undefined);
        }
        return items;
      }, new Map<string, string | undefined>())].map(([email, name]) => ({ email, name }))
    : [];

  async function handleCsvChange(file: File | undefined) {
    if (!file) return;
    try {
      const rows = (await file.text()).split(/\r?\n/).filter((row) => row.trim().length > 0).map(parseCsvRow);
      const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "").trim()) ?? [];
      if (headers.length === 0 || rows.length === 0) throw new Error("El CSV no contiene encabezados ni registros.");
      const nextEmailColumn = suggestColumn(headers, ["email", "correo", "mail"]);
      const nextNameColumn = suggestColumn(headers, ["firstname", "name", "nombre"]);
      const nextRoleColumn = suggestColumn(headers, ["role1", "role", "rol"]);
      setCsvData({ headers, rows });
      setEmailColumn(nextEmailColumn);
      setNameColumn(nextNameColumn);
      setRoleColumn(nextRoleColumn);
      const nextRoleIndex = headers.indexOf(nextRoleColumn);
      const roles = nextRoleIndex >= 0 ? [...new Set(rows.map((row) => row[nextRoleIndex]).filter(Boolean))] : [];
      setSelectedRoles(roles.includes("student") ? ["student"] : roles);
    } catch (error) {
      setCsvData(null);
      toast.error(error instanceof Error ? error.message : "No se pudo leer el CSV.");
    }
  }

  function toggleRole(role: string, checked: boolean) {
    setSelectedRoles((current) => checked ? [...current, role] : current.filter((item) => item !== role));
  }

  function sendTest() {
    const image = imageInput.current?.files?.[0];
    if (!image) return toast.error("Selecciona la imagen antes de enviar la prueba.");
    startTesting(async () => {
      const result = await sendCampaignTestEmail(image, {
        recipientEmail: testAddress,
        recipientName: testName,
        subject,
        bodyText,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Prueba enviada a ${testAddress.trim()}.`);
    });
  }

  function createDraft() {
    const image = imageInput.current?.files?.[0];
    if (!csvData) return toast.error("Carga primero el CSV de destinatarios.");
    if (!image) return toast.error("Selecciona la imagen de la campaña.");
    if (!emailColumn) return toast.error("Selecciona la columna que contiene los correos.");
    if (roleColumn && selectedRoles.length === 0) return toast.error("Selecciona al menos un rol.");
    if (recipients.length === 0) return toast.error("No hay destinatarios con los filtros elegidos.");
    startCreating(async () => {
      const result = await createCampaign(image, { title, subject, bodyText, recipients });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Borrador creado para ${result.data.recipientCount} destinatarios únicos.`);
    });
  }

  function queueCampaign(campaignId: string) {
    startQueueing(async () => {
      const result = await queueHalloweenCampaign(campaignId, confirmation[campaignId] ?? "");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmation((current) => ({ ...current, [campaignId]: "" }));
      toast.success("Campaña puesta en cola. El envío se realizará gradualmente.");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Nueva campaña</CardTitle>
          <CardDescription>Configura destinatarios, contenido y prueba antes de programar un envío.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-7">
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="size-4 text-primary" /> 1. Destinatarios desde CSV</div>
            <Input ref={csvInput} type="file" accept=".csv,text/csv" onChange={(event) => handleCsvChange(event.target.files?.[0])} disabled={isCreating} />
            {csvData ? (
              <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">Correo
                  <select value={emailColumn} onChange={(event) => setEmailColumn(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Selecciona una columna</option>
                    {csvData.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">Nombre
                  <select value={nameColumn} onChange={(event) => setNameColumn(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">No personalizar</option>
                    {csvData.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">Rol
                  <select value={roleColumn} onChange={(event) => { setRoleColumn(event.target.value); setSelectedRoles([]); }} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">No filtrar por rol</option>
                    {csvData.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
                {availableRoles.length > 0 ? <div className="sm:col-span-3"><p className="mb-2 text-sm font-medium">Incluir roles</p><div className="flex flex-wrap gap-x-5 gap-y-2">{availableRoles.map((role) => <label key={role} className="flex items-center gap-2 text-sm"><Checkbox checked={selectedRoles.includes(role)} onCheckedChange={(checked) => toggleRole(role, checked === true)} />{role}</label>)}</div></div> : null}
              </div>
            ) : null}
            {csvData ? <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm"><div className="flex items-center gap-2 font-medium text-primary"><Users className="size-4" />{recipients.length} destinatarios únicos</div><p className="mt-1 truncate text-muted-foreground">{recipients.slice(0, 4).map((recipient) => recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email).join(" · ") || "Ajusta las columnas o los roles para obtener destinatarios."}</p></div> : null}
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <div className="text-sm font-medium">2. Contenido</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">Nombre interno<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Asunto<Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={250} /></label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">Mensaje<Textarea value={bodyText} onChange={(event) => setBodyText(event.target.value)} rows={10} maxLength={5000} /></label>
            <p className="text-xs text-muted-foreground">Usa <code className="rounded bg-muted px-1 py-0.5">{"{{name}}"}</code> para insertar el nombre de la columna seleccionada. Si no existe, se mostrará “student”.</p>
            <label className="flex flex-col gap-1.5 text-sm font-medium">Imagen de la campaña<Input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={isCreating || isTesting} /></label>
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-6">
            <div className="text-sm font-medium">3. Prueba</div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input type="email" value={testAddress} onChange={(event) => setTestAddress(event.target.value)} placeholder="correo de prueba" disabled={isTesting} />
              <Input value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="nombre para la prueba" disabled={isTesting} />
              <Button type="button" variant="outline" onClick={sendTest} disabled={isTesting || testAddress.trim().length === 0}>{isTesting ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}Enviar prueba</Button>
            </div>
            <p className="text-xs text-muted-foreground">La prueba usa el contenido actual y no crea campaña ni envía a los destinatarios del CSV.</p>
          </section>

          <div className="flex justify-end border-t border-border pt-6"><Button onClick={createDraft} disabled={isCreating || recipients.length === 0}>{isCreating ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}Crear borrador</Button></div>
        </CardContent>
      </Card>

      {campaigns.length > 0 ? <section className="flex flex-col gap-3"><h2 className="text-base font-semibold">Campañas recientes</h2>{campaigns.map((campaign) => <Card key={campaign.id}><CardContent className="pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{campaign.title}</p><p className="mt-1 text-sm text-muted-foreground">{STATUS_LABELS[campaign.status]} · {campaign.recipients.SENT} enviados · {campaign.recipients.PENDING + campaign.recipients.PROCESSING} pendientes · {campaign.recipients.FAILED} fallidos</p></div><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.createdAt))}</span></div>{campaign.status === "DRAFT" ? <div className="mt-5 border-t border-border pt-4"><div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p>Esta acción envía a todos los destinatarios del borrador y no se puede deshacer.</p></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={confirmation[campaign.id] ?? ""} onChange={(event) => setConfirmation((current) => ({ ...current, [campaign.id]: event.target.value }))} placeholder="Escribe ENVIAR CAMPANA" aria-label="Confirmación de envío" disabled={isQueueing} /><Button onClick={() => queueCampaign(campaign.id)} disabled={isQueueing || (confirmation[campaign.id] ?? "").trim().toUpperCase() !== "ENVIAR CAMPANA"}>{isQueueing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Iniciar envío</Button></div></div> : null}</CardContent></Card>)}</section> : null}
    </div>
  );
}
