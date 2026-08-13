"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createCategory, toggleCategoryActive } from "@/lib/actions/settings";
import { Loader2, Plus } from "lucide-react";

type Category = { id: string; label: string; active: boolean };

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (newLabel.trim().length < 2) return;
    startTransition(async () => {
      const result = await createCategory(newLabel);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNewLabel("");
      toast.success("Categoría agregada.");
    });
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleCategoryActive(id, active);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Las categorías desactivadas dejan de aparecer al crear o filtrar tickets, pero los
        tickets ya existentes conservan la suya.
      </p>

      <ul className="flex flex-col gap-1">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
          >
            <span className="text-sm">{category.label}</span>
            <Switch
              checked={category.active}
              onCheckedChange={(checked) => handleToggle(category.id, checked)}
              disabled={isPending}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Input
          placeholder="Nueva categoría…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={isPending || newLabel.trim().length < 2}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Agregar
        </Button>
      </div>
    </div>
  );
}
