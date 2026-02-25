import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Database, 
  FolderTree, 
  KeyRound, 
  LayoutDashboard, 
  Settings2,
  UserCog,
  ScrollText
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "ダッシュボード", url: "/", icon: LayoutDashboard },
  { title: "ストレージアダプター", url: "/adapters", icon: Database },
  { title: "ネームスペース", url: "/namespaces", icon: FolderTree },
  { title: "OAuthクライアント", url: "/clients", icon: KeyRound },
  { title: "ユーザー", url: "/users", icon: UserCog },
  { title: "各種ログ", url: "/logs", icon: ScrollText },
];

function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-sm">USSP Manager</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">管理パネル</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            プラットフォーム
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        transition-all duration-200 rounded-lg px-3 py-2.5
                        ${isActive ? 'bg-primary/10 text-primary font-medium shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="h-16 flex items-center px-6 border-b border-border/50 bg-background sticky top-0 z-30">
            <SidebarTrigger className="hover:bg-muted" />
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            <div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
