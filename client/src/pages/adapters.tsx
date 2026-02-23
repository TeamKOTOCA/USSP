import { useState } from "react";
import { useAdapters, useCreateAdapter, useDeleteAdapter } from "@/hooks/use-adapters";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Database, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const adapterFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["local", "s3", "gdrive"]),
  configStr: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Must be valid JSON"),
  isDefault: z.boolean().default(false),
});

type AdapterFormValues = z.infer<typeof adapterFormSchema>;

export default function AdaptersPage() {
  const { data: adapters, isLoading } = useAdapters();
  const deleteMutation = useDeleteAdapter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Storage Adapters
          </h1>
          <p className="text-muted-foreground mt-1">Configure physical storage backends like Local, S3, or Google Drive.</p>
        </div>
        <CreateAdapterDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Config Snippet</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading adapters...</TableCell>
                </TableRow>
              ) : adapters?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No adapters configured. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                adapters?.map((adapter) => (
                  <TableRow key={adapter.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{adapter.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground uppercase tracking-wider">
                        {adapter.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                      {JSON.stringify(adapter.config)}
                    </TableCell>
                    <TableCell>
                      {adapter.isDefault ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(adapter.createdAt!), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Delete adapter ${adapter.name}?`)) {
                            deleteMutation.mutate(adapter.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAdapterDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreateAdapter();
  
  const form = useForm<AdapterFormValues>({
    resolver: zodResolver(adapterFormSchema),
    defaultValues: {
      name: "",
      type: "local",
      configStr: "{\n  \"path\": \"/var/ussp/data\"\n}",
      isDefault: false,
    },
  });

  function onSubmit(data: AdapterFormValues) {
    createMutation.mutate(
      {
        name: data.name,
        type: data.type,
        config: JSON.parse(data.configStr),
        isDefault: data.isDefault,
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
        <Button className="gap-2 hover-elevate">
          <Plus className="w-4 h-4" /> Create Adapter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Storage Adapter</DialogTitle>
          <DialogDescription>
            Configure a new physical storage backend for your platform.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adapter Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. primary-s3-bucket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">Local Filesystem</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="gdrive">Google Drive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="configStr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Configuration (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{"bucket": "my-bucket", "region": "us-east-1"}'
                      className="font-mono text-sm h-32 resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>Valid JSON object specific to the adapter type.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Default</FormLabel>
                    <FormDescription>
                      Use this adapter for namespaces that don't specify one.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending ? "Creating..." : "Save Adapter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
