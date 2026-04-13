"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  Coffee,
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Shield,
  Sun,
  Undo2,
  User,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { appName } from "@/lib/app-config";
import { isImpersonating, isPlatformAdmin } from "@/lib/platform-admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppNavbar({
  hideNavigationActions = false,
  isSidebarOpen = false,
  onToggleSidebar,
  sidebarLabel = "Sidebar",
}: {
  hideNavigationActions?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  sidebarLabel?: string;
}) {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [adminError, setAdminError] = React.useState("");
  const [isStoppingImpersonation, setIsStoppingImpersonation] =
    React.useState(false);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      console.error(
        "Sign out failed:",
        getAuthErrorMessage(error, "Sign out failed."),
      );
      return;
    }

    window.location.href = "/login";
  };

  const handleStopImpersonating = async () => {
    setIsStoppingImpersonation(true);
    setAdminError("");

    try {
      const { error } = await authClient.admin.stopImpersonating();
      if (error) {
        setAdminError(
          getAuthErrorMessage(error, "Could not restore the admin session."),
        );
        return;
      }

      window.location.href = "/admin";
    } catch (error) {
      setAdminError(
        getAuthErrorMessage(error, "Could not restore the admin session."),
      );
    } finally {
      setIsStoppingImpersonation(false);
    }
  };

  const canAccessAdmin = isPlatformAdmin(session?.user?.role);
  const impersonating = isImpersonating(session);
  const displayName =
    session?.user?.name?.trim() || session?.user?.email || "Profile";
  const themeValue = mounted ? theme ?? "system" : "system";

  return (
    <>
      <nav className="sticky top-0 z-[60] border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {onToggleSidebar ? (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-[#c94b1f]"
                aria-label={`${isSidebarOpen ? "Close" : "Open"} ${sidebarLabel}`}
                aria-pressed={isSidebarOpen}
              >
                <Menu className="size-4 lg:hidden" aria-hidden="true" />
                {isSidebarOpen ? (
                  <PanelLeftClose className="hidden size-4 lg:block" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="hidden size-4 lg:block" aria-hidden="true" />
                )}
              </button>
            ) : null}
            <Link href="/org" className="flex items-center gap-2.5">
              <span className="text-[15px] font-semibold text-foreground">
                {appName}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {impersonating && !hideNavigationActions ? (
              <span className="hidden rounded-md border px-2.5 py-1 text-xs font-medium text-[var(--warning)] bg-[var(--warning-soft)] sm:inline-flex">
                Impersonating
              </span>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                  aria-label="Open profile menu"
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
                    <User className="size-4" aria-hidden="true" />
                  </span>
                  <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Profile</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">
                    {session?.user?.email || "Signed in"}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">
                    <User />
                    Account
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/login?addAccount=1";
                  }}
                >
                  <Plus />
                  Add account
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/select-account?switchAccount=1";
                  }}
                >
                  <User />
                  Switch account
                </DropdownMenuItem>

                {canAccessAdmin ? (
                  <>
                    <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield />
                      Platform Admin
                    </Link>
                  </DropdownMenuItem>
                  </>
                ) : null}

                {impersonating ? (
                  <DropdownMenuItem
                    onClick={() => void handleStopImpersonating()}
                    disabled={isStoppingImpersonation}
                  >
                    <Undo2 />
                    {isStoppingImpersonation ? "Restoring admin" : "Stop impersonating"}
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Theme
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={themeValue}
                  onValueChange={(value) => setTheme(value)}
                >
                  <DropdownMenuRadioItem value="light">
                    <Sun />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="chai">
                    <Coffee />
                    Chai
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => void handleSignOut()} variant="destructive">
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {adminError ? (
        <div className="border-b bg-[var(--danger-soft)]">
          <div className="mx-auto max-w-7xl px-4 py-2 text-sm text-destructive sm:px-6">
            {adminError}
          </div>
        </div>
      ) : null}
    </>
  );
}
