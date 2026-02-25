import { useAdminLogs } from "@/hooks/use-admin-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";

export default function LogsPage() {
  const { data: logs, isLoading } = useAdminLogs(150);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ScrollText className="w-8 h-8 text-primary" />
          各種ログ確認
        </h1>
        <p className="text-muted-foreground mt-1">直近の API リクエストログを確認できます（自動更新）。</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading logs...</TableCell>
                </TableRow>
              ) : logs?.length ? (
                logs.map((entry, idx) => (
                  <TableRow key={`${entry.timestamp}-${idx}`}>
                    <TableCell className="text-xs">{format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.method}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.path}</TableCell>
                    <TableCell className="text-xs">{entry.statusCode}</TableCell>
                    <TableCell className="text-xs">{entry.durationMs}ms</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No logs</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
