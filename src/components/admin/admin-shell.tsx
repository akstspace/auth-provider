"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, Users, KeyRound, Tag } from "lucide-react";
import {
  AppShellLayout,
  AppShellUtilitySection,
  AppSidebarSection,
} from "@/components/app-shell";
import { AdminRequired } from "@/components/admin-required";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/users/new", label: "Create User", icon: Plus },
  { href: "/admin/oauth-scopes", label: "OAuth Scopes", icon: Tag },
  { href: "/admin/oauth-clients", label: "OAuth Clients", icon: KeyRound },
];

const isAdminNavItemActive = (pathname: string, href: string) => {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  if (href === "/admin/users") {
    return (
      pathname === "/admin/users" ||
      (pathname.startsWith("/admin/users/") && pathname !== "/admin/users/new")
    );
  }

  if (href === "/admin/users/new") {
    return pathname === "/admin/users/new";
  }

  if (href === "/admin/oauth-clients") {
    return pathname === "/admin/oauth-clients" || pathname.startsWith("/admin/oauth-clients/");
  }

  if (href === "/admin/oauth-scopes") {
    return pathname === "/admin/oauth-scopes" || pathname.startsWith("/admin/oauth-scopes/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminRequired>
      <div className="min-h-dvh bg-background text-foreground">
        <AppShellLayout
          sidebar={({ closeSidebar }) => (
            <div className="space-y-6">
              <AppSidebarSection title="Platform admin">
                <nav className="space-y-1">
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const isActive = isAdminNavItemActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeSidebar}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </AppSidebarSection>

              <AppShellUtilitySection closeSidebar={closeSidebar} />
            </div>
          )}
        >
          {children}
        </AppShellLayout>
      </div>
    </AdminRequired>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="space-y-2 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </CardContent>
    </Card>
  );
}

export function AdminStatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClasses: Record<string, string> = {
    default: "border-border/60 bg-muted/70 text-foreground hover:bg-muted/70",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300",
    danger:
      "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10",
  };

  return (
    <Badge
      variant="outline"
      className={cn("max-w-full truncate text-[11px] font-normal", toneClasses[tone])}
    >
      {label}
    </Badge>
  );
}
