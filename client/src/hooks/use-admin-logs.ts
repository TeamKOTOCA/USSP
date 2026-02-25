import { useQuery } from "@tanstack/react-query";

export interface AdminLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  response?: unknown;
}

export function useAdminLogs(limit = 100) {
  return useQuery({
    queryKey: ["/api/admin/logs", limit],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logs?limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admin logs");
      return (await res.json()) as AdminLogEntry[];
    },
    refetchInterval: 5000,
  });
}
