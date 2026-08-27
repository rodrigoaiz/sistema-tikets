"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { saveMailboxConfig, testMailboxConnection } from "@/lib/actions/settings";
import { Loader2, Plug, Save } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  imapHost: z.string().min(1, "Requerido"),
  imapPort: z.coerce.number().int().min(1).max(65535),
  imapUser: z.string().min(1, "Requerido"),
  imapPassword: z.string(),
  imapUseTls: z.boolean(),
  smtpHost: z.string().min(1, "Requerido"),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().min(1, "Requerido"),
  smtpPassword: z.string(),
  smtpUseTls: z.boolean(),
  fromAddress: z.string().email("Correo inválido"),
  enabled: z.boolean(),
  autoCloseEnabled: z.boolean(),
  autoCloseAfterHours: z.coerce.number().int().min(1).max(720),
});

type FormValues = z.infer<typeof schema>;

export function MailboxForm({
  defaultValues,
  hasCredentials,
}: {
  defaultValues: Omit<FormValues, "imapPassword" | "smtpPassword">;
  hasCredentials: boolean;
}) {
  const [isTesting, startTesting] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...defaultValues, imapPassword: "", smtpPassword: "" },
  });

  function handleTest() {
    startTesting(async () => {
      const values = form.getValues();
      const result = await testMailboxConnection(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Conexión IMAP y SMTP exitosa.");
    });
  }

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const result = await saveMailboxConfig(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Configuración de correo guardada.");
      form.setValue("imapPassword", "");
      form.setValue("smtpPassword", "");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Conecta el buzón de correo institucional por IMAP (para recibir) y SMTP (para
          responder). Funciona con Gmail (usando una contraseña de aplicación), Outlook/365 o
          cualquier correo con acceso IMAP/SMTP estándar.
          {hasCredentials
            ? " Ya hay credenciales guardadas — deja los campos de contraseña en blanco para conservarlas."
            : ""}
        </p>

        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Recepción (IMAP)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="imapHost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servidor IMAP</FormLabel>
                  <FormControl>
                    <Input placeholder="imap.gmail.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imapPort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puerto</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imapUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="soporte@tudominio.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imapPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={hasCredentials ? "•••••••• (guardada)" : "Contraseña"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="imapUseTls"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Usar TLS/SSL (recomendado)</FormLabel>
              </FormItem>
            )}
          />
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-6">
          <h3 className="text-sm font-medium">Envío (SMTP)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="smtpHost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servidor SMTP</FormLabel>
                  <FormControl>
                    <Input placeholder="smtp.gmail.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtpPort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puerto</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtpUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="soporte@tudominio.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtpPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={hasCredentials ? "•••••••• (guardada)" : "Contraseña"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fromAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo remitente</FormLabel>
                  <FormControl>
                    <Input placeholder="soporte@tudominio.com" {...field} />
                  </FormControl>
                  <FormDescription>El que verán los alumnos al recibir tu respuesta.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="smtpUseTls"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Usar TLS/SSL (recomendado)</FormLabel>
              </FormItem>
            )}
          />
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <h3 className="text-sm font-medium">Cierre automático</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cierra tickets en progreso cuando el alumno no responde después de una respuesta
              pública enviada correctamente por correo.
            </p>
          </div>

          <FormField
            control={form.control}
            name="autoCloseEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="font-normal">Activar cierre automático</FormLabel>
                  <FormDescription>
                    No aplica a tickets abiertos, notas internas ni respuestas que no se hayan
                    enviado.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoCloseAfterHours"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Esperar antes de cerrar (horas)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={720} {...field} />
                </FormControl>
                <FormDescription>Valor recomendado: 48 horas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0 border-t border-border pt-6">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div>
                <FormLabel className="font-normal">Buzón activo</FormLabel>
                <FormDescription>
                  Actívalo cuando quieras que el sistema empiece a recibir correos en la
                  Bandeja de entrada.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            Probar conexión
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar
          </Button>
        </div>
      </form>
    </Form>
  );
}
