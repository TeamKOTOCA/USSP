import { useState } from "react";
import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Dashboard from "@/pages/dashboard";
import AdaptersPage from "@/pages/adapters";
import NamespacesPage from "@/pages/namespaces";
import ClientsPage from "@/pages/clients";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/adapters" component={AdaptersPage} />
        <Route path="/namespaces" component={NamespacesPage} />
        <Route path="/clients" component={ClientsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AuthGate() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: setupStatus, isLoading: isSetupLoading, refetch: refetchSetup } = useQuery<{ requiresSetup: boolean }>({
    queryKey: ["/api/admin/setup-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/setup-status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch setup status");
      return res.json();
    },
  });

  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useQuery<{ user: { id: number; username: string; role: string } }>({
    queryKey: ["/api/admin/session"],
    enabled: setupStatus?.requiresSetup === false,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      if (!res.ok) throw new Error("No active session");
      return res.json();
    },
  });

  const handleSetup = async (formData: FormData) => {
    setError(null);
    setLoading(true);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");
    const email = String(formData.get("email") || "");

    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password, email: email || undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Setup failed" }));
      setError(body.error || "Setup failed");
      setLoading(false);
      return;
    }

    await refetchSetup();
    await refetchSession();
    setLoading(false);
  };

  const handleLogin = async (formData: FormData) => {
    setError(null);
    setLoading(true);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Login failed" }));
      setError(body.error || "Login failed");
      setLoading(false);
      return;
    }

    await refetchSession();
    setLoading(false);
  };

  if (isSetupLoading || isSessionLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (setupStatus?.requiresSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>初期管理者アカウント作成</CardTitle>
            <CardDescription>初回起動時はWeb UIから管理者アカウントを作成してください。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSetup(new FormData(e.currentTarget));
              }}
            >
              <Input name="username" placeholder="admin" required />
              <Input name="email" type="email" placeholder="admin@example.com (optional)" />
              <Input name="password" type="password" placeholder="password" required minLength={8} />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "作成中..." : "管理者を作成"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>管理者ログイン</CardTitle>
            <CardDescription>システム管理はWeb UI経由でのみ実行できます。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(new FormData(e.currentTarget));
              }}
            >
              <Input name="username" placeholder="username" required />
              <Input name="password" type="password" placeholder="password" required />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "ログイン中..." : "ログイン"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthGate />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
