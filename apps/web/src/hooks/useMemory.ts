import { useQuery } from "@tanstack/react-query";
import type { MemoryFact } from "@lubna/shared/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function getMemory() {
  const res = await fetch(`${API_BASE}/memory`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch memory");
  return (await res.json()) as { facts: MemoryFact[] };
}

export function useMemory() {
  return useQuery({
    queryKey: ["memory"],
    queryFn: getMemory,
    staleTime: 60_000
  });
}
