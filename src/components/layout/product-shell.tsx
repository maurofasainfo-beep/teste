"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  ChevronRight,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MonitorUp,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { signOutAction } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type ProductShellProps = {
  context: "tenant" | "platform";
  workspaceName: string;
  workspaceLabel: string;
  status?: string;
  userName: string;
  userEmail: string;
  role: string;
  children: React.ReactNode;
};

const tenantEmployeeLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operation", label: "Operacao", icon: MonitorUp },
];

const tenantAdminLinks = [
  { href: "/companies", label: "Empresa", icon: Building2 },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];

const platformLinks = [
  { href: "/platform/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/platform/companies", label: "Empresas", icon: Building2 },
  { href: "/platform/users", label: "Equipe", icon: Users },
];

export function ProductShell({
  context,
  workspaceName,
  workspaceLabel,
  status = "active",
  userName,
  userEmail,
  role,
  children,
}: ProductShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(() => {
    if (context === "platform") return platformLinks;
    return role === "admin"
      ? [...tenantEmployeeLinks, ...tenantAdminLinks]
      : tenantEmployeeLinks;
  }, [context, role]);

  return (
    <div
      className="min-h-screen bg-background text-foreground lg:grid"
      style={{
        gridTemplateColumns: collapsed
          ? "5.5rem minmax(0, 1fr)"
          : "17.5rem minmax(0, 1fr)",
      }}
    >
      <aside className="sticky top-0 hidden h-screen min-h-0 bg-sidebar text-white lg:flex lg:flex-col">
        <SidebarContent
          collapsed={collapsed}
          context={context}
          links={links}
          pathname={pathname}
          role={role}
          status={status}
          userEmail={userEmail}
          userName={userName}
          workspaceLabel={workspaceLabel}
          workspaceName={workspaceName}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="Abrir navegacao"
              className="rounded-lg border bg-card p-2 text-foreground shadow-sm"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <Menu aria-hidden className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{workspaceName}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
            <StatusBadge status={status} />
          </div>
        </header>

        <AnimatePresence>
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.button
                aria-label="Fechar navegacao"
                className="absolute inset-0 bg-sidebar/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                type="button"
              />
              <motion.aside
                className="absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col bg-sidebar text-white shadow-[var(--shadow-panel)]"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="absolute right-3 top-3">
                  <Button
                    aria-label="Fechar"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setMobileOpen(false)}
                    className="text-white hover:bg-white/10"
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
                <SidebarContent
                  collapsed={false}
                  context={context}
                  links={links}
                  pathname={pathname}
                  role={role}
                  status={status}
                  userEmail={userEmail}
                  userName={userName}
                  workspaceLabel={workspaceLabel}
                  workspaceName={workspaceName}
                  onNavigate={() => setMobileOpen(false)}
                />
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

type SidebarContentProps = {
  collapsed: boolean;
  context: "tenant" | "platform";
  links: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
  }>;
  pathname: string;
  role: string;
  status: string;
  userName: string;
  userEmail: string;
  workspaceName: string;
  workspaceLabel: string;
  onToggle?: () => void;
  onNavigate?: () => void;
};

function SidebarContent({
  collapsed,
  context,
  links,
  pathname,
  role,
  status,
  userEmail,
  userName,
  workspaceLabel,
  workspaceName,
  onToggle,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      <div className="border-b border-white/10 p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20">
            {context === "platform" ? (
              <Shield aria-hidden className="h-5 w-5" />
            ) : (
              <MonitorUp aria-hidden className="h-5 w-5" />
            )}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-white/50">
                {workspaceLabel}
              </p>
              <h1 className="truncate text-sm font-semibold text-white">
                {workspaceName}
              </h1>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs text-white/60">Status</span>
            <StatusBadge status={status} />
          </div>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {links.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/65 transition-all hover:bg-white/10 hover:text-white",
                active && "bg-white text-sidebar shadow-sm hover:bg-white hover:text-sidebar",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon aria-hidden className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
              {active && !collapsed ? (
                <ChevronRight aria-hidden className="ml-auto h-4 w-4" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {!collapsed && context === "platform" ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
            <Headset aria-hidden className="h-4 w-4" />
            Suporte e logs preparados
          </div>
        ) : null}
        {!collapsed ? (
          <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <Avatar
              className="[&_p]:text-white [&_p+p]:text-white/55 [&>div:first-child]:bg-white/10 [&>div:first-child]:text-white"
              label={`${role} | ${userEmail}`}
              name={userName}
            />
          </div>
        ) : null}
        <div className={cn("flex gap-2", collapsed && "flex-col")}>
          {onToggle ? (
            <Button
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="text-white hover:bg-white/10"
              size="icon"
              type="button"
              variant="ghost"
              onClick={onToggle}
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden className="h-4 w-4" />
              ) : (
                <PanelLeftClose aria-hidden className="h-4 w-4" />
              )}
            </Button>
          ) : null}
          <form action={signOutAction} className="flex-1">
            <Button
              className={cn(
                "w-full justify-start text-white hover:bg-white/10",
                collapsed && "justify-center px-0",
              )}
              type="submit"
              variant="ghost"
              title="Sair"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              {!collapsed ? "Sair" : null}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
