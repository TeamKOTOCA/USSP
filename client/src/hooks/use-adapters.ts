import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertStorageAdapter } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAdapters() {
  return useQuery({
    queryKey: [api.adapters.list.path],
    queryFn: async () => {
      const res = await fetch(api.adapters.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch adapters");
      return api.adapters.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAdapter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertStorageAdapter) => {
      const res = await fetch(api.adapters.create.path, {
        method: api.adapters.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create" }));
        throw new Error(err.message || "Failed to create adapter");
      }
      return api.adapters.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.adapters.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Adapter created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create adapter", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteAdapter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.adapters.delete.path, { id });
      const res = await fetch(url, { 
        method: api.adapters.delete.method,
        credentials: "include" 
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to delete" }));
        throw new Error(err.message || "Failed to delete adapter");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.adapters.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Adapter deleted successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete adapter", description: err.message, variant: "destructive" });
    }
  });
}
