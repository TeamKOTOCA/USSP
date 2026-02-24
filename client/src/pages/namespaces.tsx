import { useState } from "react";
import { useNamespaces, useCreateNamespace, useDeleteNamespace } from "@/hooks/use-namespaces";
import { useAdapters } from "@/hooks/use-adapters";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderTree, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";

const namespaceFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  storageAdapterId: z.coerce.number().optional().nullable(),
  quotaBytesStr: z.string().optional(),
});

type NamespaceFormValues = z.infer<typeof namespaceFormSchema>;

export default function ネームスペースPage() {
  const { data: namespaces, isLoading } = useNamespaces();
  const { data: adapters } = useAdapters();
  const deleteMutation = useDeleteNamespace();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderTree className="w-8 h-8 text-primary" />
            ネームスペース
          </h1>
          <p className="text-muted-foreground mt-1">Logical buckets that organize files and apply quotas.</p>
        </div>
        <CreateNamespaceDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} adapters={adapters || []} />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Adapter</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading namespaces...</TableCell>
                </TableRow>
              ) : namespaces?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No namespaces created yet.
                  </TableCell>
                </TableRow>
              ) : (
                namespaces?.map((ns) => {
                  const adapter = adapters?.find(a => a.id === ns.storageAdapterId);
                  return (
                    <TableRow key={ns.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-primary">
                        {ns.name}
                      </TableCell>
                      <TableCell>
                        {adapter ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{adapter.name}</span>
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded uppercase text-secondary-foreground">{adapter.type}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Default</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {ns.quotaBytes ? formatBytes(ns.quotaBytes) : <span className="text-muted-foreground">Unlimited</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ns.createdAt!), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`削除 namespace ${ns.name}?`)) {
                              deleteMutation.mutate(ns.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateNamespaceDialog({ 
  open, 
  onOpenChange, 
  adapters 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  adapters: any[]
}) {
  const createMutation = useCreateNamespace();
  
  const form = useForm<NamespaceFormValues>({
    resolver: zodResolver(namespaceFormSchema),
    defaultValues: {
      name: "",
      storageAdapterId: undefined,
      quotaBytesStr: "",
    },
  });

  function onSubmit(data: NamespaceFormValues) {
    const quotaBytes = data.quotaBytesStr ? parseInt(data.quotaBytesStr, 10) : null;
    
    createMutation.mutate(
      {
        name: data.name,
        storageAdapterId: data.storageAdapterId || null,
        quotaBytes: isNaN(quotaBytes as number) ? null : quotaBytes,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        }
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> ネームスペースを作成
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ネームスペース追加</DialogTitle>
          <DialogDescription>
            Create a logical boundary for storing files.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namespace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. user-uploads" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storageAdapterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ストレージアダプター</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === "default" ? null : parseInt(val))} 
                    value={field.value?.toString() || "default"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Use Default Adapter" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="default">Use Default Adapter</SelectItem>
                      {adapters.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name} ({a.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Which physical backend should host these files.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quotaBytesStr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quota (Bytes) - Optional</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Leave blank for unlimited" {...field} />
                  </FormControl>
                  <FormDescription>Maximum storage allowed in bytes.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending ? "Creating..." : "Save Namespace"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
