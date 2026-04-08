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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(DESKTOP_SIDEBAR_KEY);
    setDesktopCollapsed(stored === "true");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DESKTOP_SIDEBAR_KEY, String(desktopCollapsed));
  }, [desktopCollapsed, hydrated]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 px-4 py-4 lg:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)] shadow-[0_12px_32px_rgba(19,26,34,0.12)] lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-[rgba(19,26,34,0.24)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-full max-w-[320px] p-4" onClick={(event) => event.stopPropagation()}>
            <SidebarPanel
              currentPath={currentPath}
              mode={mode}
              collapsed={false}
              mobile
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <aside
        className={cn(
          "hidden shrink-0 transition-[width] duration-300 lg:block",
          desktopCollapsed ? "w-[108px]" : "w-[280px]",
        )}
      >
        <SidebarPanel
          currentPath={currentPath}
          mode={mode}
          collapsed={desktopCollapsed}
          onToggleCollapse={() => setDesktopCollapsed((value) => !value)}
        />
      </aside>

      <main className="min-w-0 flex-1 pt-16 lg:pt-0">
        {mode !== "demo" ? (
          <div className="sticky top-4 z-30 mb-4 flex justify-end">
            <AccountMenu account={account} />
          </div>
        ) : null}
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
        aria-label="Open account management"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-3 rounded-full border px-2 py-2 shadow-[0_12px_28px_rgba(19,26,34,0.10)] backdrop-blur transition-colors",
          signedIn
            ? "border-[rgba(31,79,70,0.14)] bg-[rgba(255,255,255,0.92)]"
            : "border-[rgba(19,26,34,0.10)] bg-[rgba(231,233,236,0.92)]",
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold",
            signedIn ? "bg-[var(--foreground)] text-white" : "bg-[rgba(19,26,34,0.12)] text-[var(--foreground)]",
          )}
        >
          {signedIn ? account?.initials : <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
            {signedIn ? account?.displayName : "Account"}
          </span>
          <span className="block truncate text-xs text-[var(--muted)]">
            {signedIn ? account?.email : "Sign in to save your briefings"}
          </span>
        </span>
        <ChevronDown className="mr-2 h-4 w-4 text-[var(--muted)]" />
      </button>

      {open ? (
        <Panel className="absolute right-0 top-[calc(100%+0.75rem)] w-[320px] p-5">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                signedIn ? "bg-[var(--foreground)] text-white" : "bg-[rgba(19,26,34,0.12)] text-[var(--foreground)]",
              )}
            >
              {signedIn ? account?.initials : <UserRound className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--foreground)]">
                {signedIn ? account?.displayName : "Guest access"}
              </p>
              <p className="truncate text-sm text-[var(--muted)]">
                {signedIn ? account?.email : "Sign in with email to unlock saved topics, sources, and account tools."}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {signedIn ? (
              <>
                <Link
                  href="/settings#account-settings"
                  className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <span>Account settings</span>
                  <PanelTopOpen className="h-4 w-4" />
                </Link>
                <Link
                  href="/settings#account-management"
                  className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <span>Account management</span>
                  <PanelTopOpen className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <Link
                href="/#email-access"
                className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                onClick={() => setOpen(false)}
              >
                <span>Sign in with email</span>
                <PanelTopOpen className="h-4 w-4" />
              </Link>
            )}
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)]/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {signedIn ? "Quick access" : "New here?"}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                {signedIn
                  ? "Open your personal preferences, account controls, and session tools from this menu."
                  : "Use the email prompt on the homepage to request a secure sign-in link and activate your account."}
              </p>
            </div>
            {signedIn ? (
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" className="w-full">
                  Sign out
                </Button>
              </form>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function SidebarPanel({
  currentPath,
  mode,
  collapsed,
  mobile = false,
  onClose,
  onToggleCollapse,
}: {
  currentPath: string;
  mode: "demo" | "live" | "public";
  collapsed: boolean;
  mobile?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <Panel
      className={cn(
        "flex w-full flex-col justify-between p-4 transition-all duration-300 lg:p-6",
        mobile ? "min-h-full" : "sticky top-4 min-h-[calc(100vh-2rem)]",
      )}
    >
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("space-y-4", collapsed && !mobile ? "w-full" : "")}>
            <Badge className={cn(collapsed && !mobile ? "justify-center px-0 py-2" : "")}>
              {collapsed && !mobile ? "DI" : "Daily Intelligence"}
            </Badge>
            <div className="space-y-2">
              <h1
                className={cn(
                  "display-font leading-none text-[var(--foreground)] transition-all duration-300",
                  collapsed && !mobile ? "text-center text-2xl" : "text-3xl",
                )}
              >
                {collapsed && !mobile ? "DIA" : "Aggregator"}
              </h1>
              {collapsed && !mobile ? null : (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  High-signal daily briefings built for fast executive scanning.
                </p>
              )}
            </div>
          </div>

          {mobile ? (
            <button
              type="button"
              aria-label="Close navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/60 text-[var(--foreground)]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              className="h-11 w-11 shrink-0 rounded-2xl px-0"
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

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-2xl text-sm font-medium transition-colors",
                  collapsed && !mobile
                    ? "justify-center px-0 py-3"
                    : "gap-3 px-4 py-3",
                  active
                    ? "bg-[var(--foreground)] text-white"
                    : "text-[var(--foreground)] hover:bg-white/60",
                )}
                onClick={mobile ? onClose : undefined}
                title={collapsed && !mobile ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {collapsed && !mobile ? null : item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          "rounded-[24px] border border-[var(--line)] bg-[var(--warm)]/70 transition-all duration-300",
          collapsed && !mobile ? "p-3" : "p-4",
        )}
      >
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]",
            collapsed && !mobile ? "text-center" : "",
          )}
        >
          Mode
        </p>
        {collapsed && !mobile ? (
          <p className="mt-2 text-center text-sm font-semibold text-[var(--foreground)]">
            {mode === "demo" ? "Demo" : mode === "public" ? "Public" : "Live"}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
            {mode === "demo"
              ? "Demo mode is active. Connect Supabase and your AI key to save data and generate live briefings."
              : mode === "public"
                ? "Public live mode is active. The app is pulling current tech and finance headlines from public feeds on a 15-minute refresh cycle."
                : "Live mode is active. Your saved topics, sources, and briefings are connected."}
          </p>
        )}
      </div>
    </Panel>
  );
}
