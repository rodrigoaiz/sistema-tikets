"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Search } from "lucide-react";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/constants";

type Category = { id: string; label: string };

export function TicketFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "ALL") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:w-auto lg:flex-1">
      <div className="relative col-span-2 sm:col-span-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Buscar por asunto o correo…"
          className="w-full pl-8 sm:w-60"
          onChange={(e) => updateParam("q", e.target.value)}
        />
      </div>

      <Select
        defaultValue={searchParams.get("status") ?? "ALL"}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-full sm:w-36" size="sm">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los estados</SelectItem>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("priority") ?? "ALL"}
        onValueChange={(v) => updateParam("priority", v)}
      >
        <SelectTrigger className="w-full sm:w-36" size="sm">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Toda prioridad</SelectItem>
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("categoryId") ?? "ALL"}
        onValueChange={(v) => updateParam("categoryId", v)}
      >
        <SelectTrigger className="w-full sm:w-48" size="sm">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Toda categoría</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("sort") ?? "newest"}
        onValueChange={(v) => updateParam("sort", v === "newest" ? null : v)}
      >
        <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:w-48" size="sm">
          <ArrowUpDown className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Más recientes</SelectItem>
          <SelectItem value="updated">Actividad reciente</SelectItem>
          <SelectItem value="status">Por estado</SelectItem>
          <SelectItem value="category">Por categoría</SelectItem>
          <SelectItem value="priority">Por prioridad</SelectItem>
          <SelectItem value="oldest">Más antiguos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
