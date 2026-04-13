"use client";

import * as React from "react";
import { Undo2 } from "lucide-react";
import { AppNavbar } from "@/components/app-navbar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { cn } from "@/lib/utils";
import { isImpersonating } from "@/lib/platform-admin";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

type SidebarRenderer = (options: { closeSidebar: () => void }) => React.ReactNode;

export function AppShellLayout({
  children,
  sidebar,
  contentClassName,
}: {
  children: React.ReactNode;
  sidebar: SidebarRenderer;
  contentClassName?: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isDesktopViewport = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  };

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleMediaQueryChange = () => {
      setIsSidebarOpen(mediaQuery.matches);
    };

    handleMediaQueryChange();
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  const closeSidebar = () => {
    if (isDesktopViewport()) return;
    setIsSidebarOpen(false);
  };
  const toggleSidebar = () => setIsSidebarOpen((current) => !current);

  return (
    <>
      <AppNavbar
        hideNavigationActions
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        sidebarLabel="Navigation"
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start gap-0 lg:gap-6">
          <div
            className={cn(
              "hidden overflow-hidden transition-[width,opacity] duration-200 ease-out lg:block",
              isSidebarOpen ? "w-60 opacity-100" : "w-0 opacity-0",
            )}
            aria-hidden={!isSidebarOpen}
          >
            <aside className="sticky top-20 max-h-[calc(100dvh-6.5rem)] overflow-y-auto pr-1">
              {sidebar({ closeSidebar })}
            </aside>
          </div>

          <main className={cn("min-w-0 flex-1", contentClassName)}>{children}</main>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#221a13]/35 transition-opacity duration-200 lg:hidden",
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden={!isSidebarOpen}
      />

      <aside
        className={cn(
          "fixed top-14 bottom-0 left-0 z-50 w-80 max-w-[85vw] border-r bg-background px-4 py-5 shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.20)] transition-transform duration-200 ease-out lg:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navigation"
      >
        <div className="h-full overflow-y-auto">{sidebar({ closeSidebar })}</div>
      </aside>
    </>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-3 text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

export function AppSidebarSection(props: React.ComponentProps<typeof SidebarSection>) {
  return <SidebarSection {...props} />;
}

export function AppShellUtilitySection({
  closeSidebar,
}: {
  closeSidebar: () => void;
}) {
  const { data: session } = authClient.useSession();
  const [adminError, setAdminError] = React.useState("");
  const [isStoppingImpersonation, setIsStoppingImpersonation] =
    React.useState(false);

  const impersonating = isImpersonating(session);

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

      closeSidebar();
      window.location.href = "/admin";
    } catch (error) {
      setAdminError(
        getAuthErrorMessage(error, "Could not restore the admin session."),
      );
    } finally {
      setIsStoppingImpersonation(false);
    }
  };

  return (
    <div className="space-y-6">
      {impersonating ? (
        <SidebarSection title="Session">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleStopImpersonating()}
            disabled={isStoppingImpersonation}
            className="w-full justify-start"
          >
            <Undo2 className="size-4" />
            {isStoppingImpersonation ? "Restoring admin" : "Stop impersonating"}
          </Button>
        </SidebarSection>
      ) : null}

      {adminError ? (
        <div className="rounded-lg border bg-[var(--danger-soft)] px-3 py-2 text-sm text-destructive">
          {adminError}
        </div>
      ) : null}
    </div>
  );
}
