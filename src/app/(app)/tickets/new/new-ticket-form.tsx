"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { createTicket } from "@/lib/actions/tickets";
import { uploadTicketAttachment } from "@/lib/actions/attachments";
import { PRIORITY_LABEL } from "@/lib/constants";
import { Loader2, Paperclip, X } from "lucide-react";

const formSchema = z.object({
  subject: z.string().trim().min(5, "El asunto debe tener al menos 5 caracteres."),
  description: z.string().trim().min(10, "Describe el problema con más detalle."),
  studentEmail: z.string().trim().email("Correo del alumno inválido."),
  studentName: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function NewTicketForm({ categories }: { categories: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      description: "",
      studentEmail: "",
      studentName: "",
      priority: "MEDIUM",
      categoryId: undefined,
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createTicket(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      for (const file of files) {
        const uploadResult = await uploadTicketAttachment(result.data.ticketId, file);
        if (!uploadResult.ok) {
          toast.error(`No se pudo adjuntar "${file.name}": ${uploadResult.error}`);
        }
      }

      toast.success(`Ticket #${result.data.number} creado.`);
      router.push(`/tickets/${result.data.ticketId}`);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto</FormLabel>
              <FormControl>
                <Input placeholder="Ej. No puedo entrar al examen de la unidad 3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción del problema</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Describe qué intentaba hacer el alumno, qué error aparece, en qué navegador, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="studentEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo del alumno</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="alumno@correo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="studentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nombre del alumno <span className="text-muted-foreground">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Nombre completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          value ? PRIORITY_LABEL[value as keyof typeof PRIORITY_LABEL] ?? value : "Prioridad"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Categoría <span className="text-muted-foreground">(opcional)</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          value
                            ? categories.find((category) => category.id === value)?.label ?? "Categoría"
                            : "Sin categoría"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>
            Adjuntos <span className="font-normal text-muted-foreground">(opcional)</span>
          </FormLabel>
          <FormDescription>Capturas de pantalla del error, PDFs. Máx. 10 MB c/u.</FormDescription>
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-ring hover:text-foreground">
            <Paperclip className="size-4" />
            Adjuntar archivos
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
          </label>
          {files.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {files.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-xs"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar ${file.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Crear ticket
          </Button>
        </div>
      </form>
    </Form>
  );
}
