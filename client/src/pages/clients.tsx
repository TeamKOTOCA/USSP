import { useState } from "react";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/use-clients";
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
  DialogFooter,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Plus, Trash2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { OauthClient } from "@shared/schema";

const clientFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  redirectUris: z.string().min(5, "Provide at least one redirect URI"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const deleteMutation = useDeleteClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClientDetails, setNewClientDetails] = useState<OauthClient | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <KeyRound className="w-8 h-8 text-primary" />
            OAuthクライアント
          </h1>
          <p className="text-muted-foreground mt-1">Manage applications authorized to use the USSP SDK.</p>
        </div>
        <CreateClientDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          on作成日時={(client) => setNewClientDetails(client)}
        />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>App Name</TableHead>
                <TableHead>クライアントID</TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading clients...</TableCell>
                </TableRow>
              ) : clients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No OAuth clients registered.
                  </TableCell>
                </TableRow>
              ) : (
                clients?.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-primary">
                      {client.name}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground border border-border">
                        {client.clientId}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {client.redirectUris}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(client.createdAt!), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`削除 client ${client.name}? Applications using this will instantly lose access.`)) {
                            deleteMutation.mutate(client.id);
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

      {/* Secret Display Modal - Shown only immediately after creation */}
      {newClientDetails && (
        <SecretRevealDialog 
          client={newClientDetails} 
          onClose={() => setNewClientDetails(null)} 
        />
      )}
    </div>
  );
}

function CreateClientDialog({ 
  open, 
  onOpenChange,
  on作成日時
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  on作成日時: (client: OauthClient) => void
}) {
  const createMutation = useCreateClient();
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      redirectUris: "http://localhost:3000/callback",
    },
  });

  function onSubmit(data: ClientFormValues) {
    createMutation.mutate(
      data,
      {
        onSuccess: (newClient) => {
          onOpenChange(false);
          form.reset();
          // Pass the returned client (which includes the unhashed secret) to parent
          on作成日時(newClient as unknown as OauthClient); 
        }
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> クライアント登録
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>OAuthクライアント登録</DialogTitle>
          <DialogDescription>
            Create credentials for a new application to use the USSP API.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My Next.js Frontend" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="redirectUris"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Redirect URIs (comma separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://app.com/api/auth/callback" {...field} />
                  </FormControl>
                  <FormDescription>Where to send users after authorization.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending ? "生成中..." : "認証情報を生成"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SecretRevealDialog({ client, onClose }: { client: OauthClient, onClose: () => void }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-6 h-6" /> Client Registered
          </DialogTitle>
          <DialogDescription>
            Store these credentials securely. <strong className="text-destructive">The クライアントシークレット will never be shown again.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4 p-4 bg-muted/30 border border-border rounded-lg">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">クライアントID</label>
            <div className="flex gap-2">
              <Input readOnly value={client.clientId} className="font-mono bg-background text-sm" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(client.clientId, setCopiedId)}>
                {copiedId ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">クライアントシークレット</label>
            <div className="flex gap-2">
              <Input readOnly value={client.clientSecret} className="font-mono bg-background text-sm" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(client.clientSecret, setCopiedSecret)}>
                {copiedSecret ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>シークレットは今すぐコピーしてください。紛失した場合はクライアントを再作成してください。</p>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} className="w-full sm:w-auto">認証情報をコピーしました</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
