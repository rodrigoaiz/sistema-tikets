"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAgent } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  createdAt: Date;
};

export function UsersManager({ users }: { users: UserItem[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createAgent({ name, email, password });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      toast.success(`Agente ${result.data.email} creado.`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-medium">Usuarios del help desk</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Los agentes pueden administrar tickets, pero no modificar correo, categorías ni usuarios.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-name">Nombre</Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre del agente"
            required
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-email">Correo</Label>
          <Input
            id="agent-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="agente@ejemplo.com"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-password">Contraseña inicial</Label>
          <Input
            id="agent-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
          />
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Crear agente
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_1.2fr_100px_120px] gap-3 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
          <span>Nombre</span>
          <span>Correo</span>
          <span>Rol</span>
          <span>Creado</span>
        </div>
        <div className="divide-y divide-border">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_1.2fr_100px_120px] gap-3 px-4 py-3 text-sm"
            >
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-muted-foreground">{user.email}</span>
              <span>{user.role === "ADMIN" ? "Administrador" : "Agente"}</span>
              <span className="text-xs text-muted-foreground">
                {format(user.createdAt, "d MMM yyyy", { locale: es })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
