import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertNamespace } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useNamespaces() {
  return useQuery({
    queryKey: [api.namespaces.list.path],
    queryFn: async () => {
      const res = await fetch(api.namespaces.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch namespaces");
      return api.namespaces.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateNamespace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertNamespace) => {
      const res = await fetch(api.namespaces.create.path, {
        method: api.namespaces.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create" }));
        throw new Error(err.message || "Failed to create namespace");
      }
      return api.namespaces.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.namespaces.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Namespace created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create namespace", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteNamespace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.namespaces.delete.path, { id });
      const res = await fetch(url, { 
        method: api.namespaces.delete.method,
        credentials: "include" 
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to delete" }));
        throw new Error(err.message || "Failed to delete namespace");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.namespaces.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Namespace deleted successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete namespace", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateNamespace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { storageAdapterId?: number | null; quotaBytes?: number | null } }) => {
      const url = buildUrl(api.namespaces.update.path, { id });
      const res = await fetch(url, {
        method: api.namespaces.update.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to update namespace" }));
        throw new Error(err.message || "Failed to update namespace");
      }
      return api.namespaces.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.namespaces.list.path] });
      toast({ title: "Namespace updated" });
    },
    onError: (err) => {
      toast({ title: "Failed to update namespace", description: err.message, variant: "destructive" });
    }
  });
}
