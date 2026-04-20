"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  History,
  House,
  Layers3,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopOpen,
  Rss,
  Settings2,
  UserRound,
  X,
} from "lucide-react";

import { signOutAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { ViewerAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/dashboard", label: "Today", icon: Newspaper },
  { href: "/topics", label: "Topics", icon: Layers3 },
  { href: "/sources", label: "Sources", icon: Rss },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

const DESKTOP_SIDEBAR_KEY = "daily-intel-sidebar-collapsed";

function getInitialDesktopCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DESKTOP_SIDEBAR_KEY) === "true";
}

export function AppShell({
  children,
  currentPath,
  mode,
  account,
}: {
  children: React.ReactNode;
  currentPath: string;
  mode: "demo" | "live" | "public";
  account?: ViewerAccount | null;
}) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(getInitialDesktopCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDrawerId = "mobile-navigation-drawer";

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_KEY, String(desktopCollapsed));
  }, [desktopCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    function handleDesktopViewportChange(event: MediaQueryListEvent | MediaQueryList) {
      if (event.matches) {
        setMobileOpen(false);
      }
    }

    handleDesktopViewportChange(mediaQuery);
    mediaQuery.addEventListener("change", handleDesktopViewportChange);

    return () => mediaQuery.removeEventListener("change", handleDesktopViewportChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 px-4 py-4 lg:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-controls={mobileDrawerId}
        aria-expanded={mobileOpen}
        className="fixed left-4 top-4 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-button border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)] transition-colors hover:border-[var(--text-secondary)] lg:hidden"
        onClick={() => setMobileOpen((value) => !value)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-[rgba(26,26,24,0.24)] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      >
        <div
          className={cn(
            "flex h-full max-w-[320px] p-4 transition-colors duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <SidebarPanel
            id={mobileDrawerId}
            currentPath={currentPath}
            mode={mode}
            account={account}
            collapsed={false}
            mobile
            onClose={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 transition-[width] duration-300 lg:block",
          desktopCollapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <SidebarPanel
          currentPath={currentPath}
          mode={mode}
          account={account}
          collapsed={desktopCollapsed}
          onToggleCollapse={() => setDesktopCollapsed((v) => !v)}
        />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="mb-3 flex min-h-[3rem] items-start justify-end gap-3 pl-14 lg:mb-4 lg:min-h-0 lg:pl-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge className={account ? "text-[var(--text-primary)]" : ""}>
              {account ? "Signed in" : "Public briefing"}
            </Badge>
            <Badge className={mode === "live" ? "text-[var(--text-primary)]" : ""}>
              {mode === "live" ? "Personalized" : mode === "public" ? "Live preview" : "Demo preview"}
            </Badge>
          </div>
          {mode !== "demo" ? <AccountMenu account={account} /> : null}
        </div>
        {children}
      </main>
    </div>
  );
}

function AccountMenu({ account }: { account?: ViewerAccount | null }) {
  const [open, setOpen] = useState(false);
  const signedIn = Boolean(account);

  useEffect(() => {
    if (!open) return;
    function handleWindowClick() {
      setOpen(false);
    }
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, [open]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-3 rounded-button border border-[var(--border)] bg-[var(--card)] px-2 py-2 transition-colors hover:border-[var(--text-secondary)]",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-button text-sm font-semibold",
            signedIn ? "bg-[var(--text-primary)] text-white" : "bg-[var(--sidebar)] text-[var(--text-primary)]",
          )}
        >
          {signedIn ? account?.initials : <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
            {signedIn ? account?.displayName : "Account"}
          </span>
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {signedIn ? account?.email : "Sign in to personalize your intelligence"}
          </span>
        </span>
        <ChevronDown className={cn("mr-1 h-4 w-4 text-[var(--text-secondary)] transition-colors", open && "rotate-180")} />
      </button>

      {open ? (
        <Panel className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[300px] p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-sm font-semibold",
                signedIn ? "bg-[var(--text-primary)] text-white" : "bg-[var(--sidebar)] text-[var(--text-primary)]",
              )}
            >
              {signedIn ? account?.initials : <UserRound className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {signedIn ? account?.displayName : "You&apos;re viewing the public briefing"}
              </p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {signedIn ? account?.email : "Sign in to personalize your intelligence."}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {signedIn ? (
              <>
                <Link
                  href="/settings#account-settings"
                  className="flex items-center justify-between rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--card)]"
                  onClick={() => setOpen(false)}
                >
                  <span>Account settings</span>
                  <PanelTopOpen className="h-4 w-4 text-[var(--text-secondary)]" />
                </Link>
                <Link
                  href="/settings#account-management"
                  className="flex items-center justify-between rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--card)]"
                  onClick={() => setOpen(false)}
                >
                  <span>Account management</span>
                  <PanelTopOpen className="h-4 w-4 text-[var(--text-secondary)]" />
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary" className="mt-1 w-full">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
                    Unlock with sign-in
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                    <p>Personalized topics</p>
                    <p>Saved history</p>
                    <p>Custom alerts</p>
                  </div>
                </div>
                <Link
                  href="/#email-access"
                  className="flex items-center justify-between rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--card)]"
                  onClick={() => setOpen(false)}
                >
                  <span>Sign in to personalize</span>
                  <PanelTopOpen className="h-4 w-4 text-[var(--text-secondary)]" />
                </Link>
                <p className="px-1 pt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  Use the homepage sign-in flow to continue with Google or your existing email-based auth options.
                </p>
              </>
            )}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function SidebarPanel({
  id,
  currentPath,
  mode,
  account,
  collapsed,
  mobile = false,
  onClose,
  onToggleCollapse,
}: {
  id?: string;
  currentPath: string;
  mode: "demo" | "live" | "public";
  account?: ViewerAccount | null;
  collapsed: boolean;
  mobile?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  const modeText = {
    demo: "Demo mode. Connect Supabase and your AI key in Settings to go live.",
    public: "Public briefing. Live feeds are active now, and signing in unlocks personalized topics, saved history, and custom alerts.",
    live: "Live mode. Your topics, sources, and briefings are connected.",
  }[mode];
  const handleMobileNavigation = mobile
    ? () => {
        window.setTimeout(() => onClose?.(), 0);
      }
    : undefined;

  return (
    <Panel
      id={id}
      className={cn(
        "flex w-full flex-col justify-between p-4 transition-all duration-300",
        mobile ? "min-h-full" : "sticky top-4 min-h-[calc(100vh-2rem)] lg:p-5",
      )}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          {collapsed && !mobile ? (
            <div className="flex w-full flex-col items-center gap-3">
              <Badge className="px-2.5 py-1 text-xs">DI</Badge>
              <p className="text-center text-lg font-bold text-[var(--text-primary)]">DIA</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge>Daily Intelligence</Badge>
              <div>
                <h1 className="text-2xl font-semibold leading-none text-[var(--text-primary)]">
                  Aggregator
                </h1>
                <p className="mt-1.5 text-xs leading-5 text-[var(--text-secondary)]">
                  High-signal daily briefings for fast executive scanning.
                </p>
              </div>
            </div>
          )}

          {mobile ? (
            <button
              type="button"
              aria-label="Close navigation"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              className="h-9 w-9 shrink-0 rounded-button px-0"
              onClick={onToggleCollapse}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed && !mobile ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-none border-l-2 text-sm font-medium transition-colors",
                  collapsed && !mobile
                    ? "justify-center px-0 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  active
                    ? "border-l-[var(--accent)] bg-[var(--sidebar)] text-[var(--text-primary)]"
                    : "border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
                onClick={handleMobileNavigation}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {collapsed && !mobile ? null : item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 space-y-3">
        {/* Mobile: account section */}
        {mobile ? (
          <div className="rounded-card border border-[var(--border)] bg-[var(--card)] p-4">
            {account ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-[var(--text-primary)] text-sm font-semibold text-white">
                    {account.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {account.displayName}
                    </p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">{account.email}</p>
                  </div>
                </div>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary" className="w-full text-xs">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">You&apos;re viewing the public briefing</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Sign in to personalize your intelligence.
                  </p>
                </div>
                <div className="rounded-card border border-dashed border-[var(--border)] bg-[var(--card)] px-3 py-3 text-xs leading-5 text-[var(--text-primary)]">
                  Personalized topics, saved history, and custom alerts unlock when you sign in.
                </div>
                <Link
                  href="/#email-access"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  onClick={handleMobileNavigation}
                >
                  Sign in to personalize →
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {/* Mode indicator */}
        <div
          className={cn(
            "rounded-card border border-[var(--border)] bg-[var(--sidebar)]",
            collapsed && !mobile ? "p-3" : "p-4",
          )}
        >
          {collapsed && !mobile ? (
            <p className="text-center text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
              {mode === "demo" ? "Demo" : mode === "public" ? "Pub" : "Live"}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
                  Mode
                </p>
                <span
                  className={cn(
                    "h-2 w-2 rounded-button",
                    mode === "live" ? "bg-[var(--text-primary)]" : "bg-[var(--text-secondary)]/50",
                  )}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-primary)]">{modeText}</p>
              {mode !== "live" ? (
                <Link
                  href="/settings"
                  className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline"
                  onClick={handleMobileNavigation}
                >
                  Go to Settings →
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
