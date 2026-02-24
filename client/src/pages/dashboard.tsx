import { useStats } from "@/hooks/use-stats";
import { useFiles } from "@/hooks/use-files";
import { useNamespaces } from "@/hooks/use-namespaces";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database, FolderTree, KeyRound, HardDrive, FileText } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: files, isLoading: filesLoading } = useFiles();
  const { data: namespaces } = useNamespaces();

  const chartData = [
    { name: "アダプター", value: stats?.activeAdapters || 0 },
    { name: "ネームスペース", value: stats?.activeNamespaces || 0 },
    { name: "クライアント", value: stats?.activeClients || 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ダッシュボード</h1>
        <p className="text-muted-foreground">Universal Structured Storage Platform の概要です。</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="使用中ストレージ容量" 
            value={formatBytes(stats?.totalStorage || 0)} 
            icon={HardDrive} 
            trend="先月比 +12%"
          />
          <StatCard 
            title="有効アダプター数" 
            value={stats?.activeAdapters || 0} 
            icon={Database} 
            trend="安定稼働"
          />
          <StatCard 
            title="ネームスペース数" 
            value={stats?.activeNamespaces || 0} 
            icon={FolderTree} 
            trend="2件が上限付近"
          />
          <StatCard 
            title="OAuthクライアント数" 
            value={stats?.activeClients || 0} 
            icon={KeyRound} 
            trend="すべて有効"
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>プラットフォーム指標</CardTitle>
            <CardDescription>リソースの分布</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip 
                      cursor={{fill: 'var(--muted)', opacity: 0.4}}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/50 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>最近のファイル</CardTitle>
            <CardDescription>ネームスペースで最近同期されたオブジェクト</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {filesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : files?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <FileText className="w-10 h-10 mb-2 opacity-20" />
                <p>まだファイルがありません。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {files?.slice(0, 5).map((file) => {
                  const ns = namespaces?.find(n => n.id === file.namespaceId);
                  return (
                    <div key={file.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-2 bg-primary/10 rounded-md text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.path.split('/').pop()}</p>
                        <p className="text-xs text-muted-foreground truncate">{ns?.name || '不明なネームスペース'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(file.createdAt!), 'yyyy/MM/dd HH:mm')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend: string }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-md">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground font-mono">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
}
