"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "table";

  function setView(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList>
        <TabsTrigger value="table">
          <List className="size-3.5" />
          Tabla
        </TabsTrigger>
        <TabsTrigger value="kanban">
          <LayoutGrid className="size-3.5" />
          Kanban
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
