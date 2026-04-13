"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, Users, KeyRound, Tag, Shield } from "lucide-react";
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
  { href: "/admin/config", label: "Config", icon: Shield },
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

  if (href === "/admin/config") {
    return (
      pathname === "/admin/config" ||
      pathname.startsWith("/admin/config/") ||
      pathname === "/admin/invite-only" ||
      pathname.startsWith("/admin/invite-only/")
    );
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
                            ? "border border-border bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-[#c94b1f]",
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
        <h1 className="text-xl font-bold text-balance sm:text-2xl">
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
    <Card className="h-full rounded-xl border-border bg-card">
      <CardContent className="flex min-h-44 h-full flex-col justify-between p-6 sm:p-7">
        <div className="space-y-4">
          <p className="text-[15px] font-semibold leading-none text-muted-foreground">{label}</p>
          <p className="text-4xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <p className="mt-5 max-w-[24ch] text-[15px] leading-7 text-muted-foreground text-pretty">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function AdminSectionCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <Card className={cn("rounded-xl border-border bg-card shadow-none", className)}>{children}</Card>;
}

export function AdminSectionHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("flex flex-col gap-2 px-6 pt-6 sm:px-7 sm:pt-7", className)}>{children}</div>;
}

export function AdminSectionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-6 pb-6 pt-5 sm:px-7 sm:pb-7", className)}>{children}</div>;
}

export function AdminSectionFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-t px-6 py-5 sm:px-7", className)}>
      {children}
    </div>
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
    default: "border-border bg-muted text-foreground hover:bg-muted",
    success:
      "border-[color:var(--success)]/25 bg-[var(--success-soft)] text-[color:var(--success)] hover:bg-[var(--success-soft)]",
    warning:
      "border-[color:var(--warning)]/25 bg-[var(--warning-soft)] text-[color:var(--warning)] hover:bg-[var(--warning-soft)]",
    danger:
      "border-destructive/25 bg-[var(--danger-soft)] text-destructive hover:bg-[var(--danger-soft)]",
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
