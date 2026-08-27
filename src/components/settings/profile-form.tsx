"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updateProfileName, updatePassword } from "@/lib/actions/settings";
import { TelegramSettings } from "@/components/settings/telegram-settings";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({ name: z.string().min(2, "Muy corto") });
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requerido"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export function ProfileForm({
  name,
  email,
  telegram,
}: {
  name: string;
  email: string;
  telegram: {
    botConfigured: boolean;
    linked: boolean;
    enabled: boolean;
    notifyStudentReplies: boolean;
    notifyInboxEmails: boolean;
  };
}) {
  const [isSavingName, startSavingName] = useTransition();
  const [isSavingPassword, startSavingPassword] = useTransition();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSaveName(values: z.infer<typeof profileSchema>) {
    startSavingName(async () => {
      const result = await updateProfileName(values.name);
      if (!result.ok) toast.error(result.error);
      else toast.success("Nombre actualizado.");
    });
  }

  function onChangePassword(values: z.infer<typeof passwordSchema>) {
    startSavingPassword(async () => {
      const result = await updatePassword(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Contraseña actualizada.");
      passwordForm.reset();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Form {...profileForm}>
        <form
          onSubmit={profileForm.handleSubmit(onSaveName)}
          className="flex flex-col gap-4 sm:max-w-sm"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Correo</span>
            <p className="text-sm">{email}</p>
          </div>
          <FormField
            control={profileForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="self-start" disabled={isSavingName}>
            {isSavingName ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar nombre
          </Button>
        </form>
      </Form>

      <TelegramSettings {...telegram} />

      <Form {...passwordForm}>
        <form
          onSubmit={passwordForm.handleSubmit(onChangePassword)}
          className="flex flex-col gap-4 border-t border-border pt-6 sm:max-w-sm"
        >
          <h3 className="text-sm font-medium">Cambiar contraseña</h3>
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña actual</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={passwordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar nueva contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="self-start" disabled={isSavingPassword}>
            {isSavingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
            Actualizar contraseña
          </Button>
        </form>
      </Form>
    </div>
  );
}
