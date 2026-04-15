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

  // Close mobile nav on route change / resize
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 px-4 py-4 lg:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)] shadow-[0_12px_32px_rgba(19,26,34,0.12)] lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-[rgba(19,26,34,0.24)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="flex h-full max-w-[320px] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <SidebarPanel
              currentPath={currentPath}
              mode={mode}
              account={account}
              collapsed={false}
              mobile
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

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
            <Badge className={account ? "text-[var(--accent)]" : ""}>
              {account ? "Signed in" : "Guest mode"}
            </Badge>
            <Badge className={mode === "live" ? "text-[var(--accent)]" : ""}>
              {mode === "live" ? "Live mode" : mode === "public" ? "Public mode" : "Demo mode"}
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
          "flex items-center gap-3 rounded-full border px-2 py-2 shadow-[0_12px_28px_rgba(19,26,34,0.10)] backdrop-blur transition-colors",
          signedIn
            ? "border-[rgba(31,79,70,0.14)] bg-[rgba(255,255,255,0.92)]"
            : "border-[rgba(19,26,34,0.10)] bg-[rgba(231,233,236,0.92)]",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
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
        <ChevronDown className={cn("mr-1 h-4 w-4 text-[var(--muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <Panel className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[300px] p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                signedIn ? "bg-[var(--foreground)] text-white" : "bg-[rgba(19,26,34,0.12)] text-[var(--foreground)]",
              )}
            >
              {signedIn ? account?.initials : <UserRound className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {signedIn ? account?.displayName : "Guest access"}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {signedIn ? account?.email : "Sign in to unlock saved topics and briefings."}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {signedIn ? (
              <>
                <Link
                  href="/settings#account-settings"
                  className="flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <span>Account settings</span>
                  <PanelTopOpen className="h-4 w-4 text-[var(--muted)]" />
                </Link>
                <Link
                  href="/settings#account-management"
                  className="flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <span>Account management</span>
                  <PanelTopOpen className="h-4 w-4 text-[var(--muted)]" />
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary" className="mt-1 w-full">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/#email-access"
                  className="flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  <span>Sign in with email</span>
                  <PanelTopOpen className="h-4 w-4 text-[var(--muted)]" />
                </Link>
                <p className="px-1 pt-1 text-xs leading-5 text-[var(--muted)]">
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
  currentPath,
  mode,
  account,
  collapsed,
  mobile = false,
  onClose,
  onToggleCollapse,
}: {
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
    public: "Public mode. Live feeds active — sign in to personalise your briefings.",
    live: "Live mode. Your topics, sources, and briefings are connected.",
  }[mode];

  return (
    <Panel
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
              <p className="text-center text-lg font-bold text-[var(--foreground)]">DIA</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge>Daily Intelligence</Badge>
              <div>
                <h1 className="display-font text-2xl leading-none text-[var(--foreground)]">
                  Aggregator
                </h1>
                <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                  High-signal daily briefings for fast executive scanning.
                </p>
              </div>
            </div>
          )}

          {mobile ? (
            <button
              type="button"
              aria-label="Close navigation"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white/60 text-[var(--foreground)]"
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
              className="h-9 w-9 shrink-0 rounded-xl px-0"
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
                  "flex items-center rounded-xl text-sm font-medium transition-colors",
                  collapsed && !mobile
                    ? "justify-center px-0 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-[var(--foreground)] text-white"
                    : "text-[var(--foreground)] hover:bg-white/60",
                )}
                onClick={mobile ? onClose : undefined}
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
          <div className="rounded-[20px] border border-[var(--line)] bg-white/60 p-4">
            {account ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white">
                    {account.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {account.displayName}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">{account.email}</p>
                  </div>
                </div>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary" className="w-full text-xs">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--foreground)]">Not signed in</p>
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Sign in to save topics, sources, and your briefing history.
                </p>
                <Link
                  href="/#email-access"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  onClick={onClose}
                >
                  Sign in →
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {/* Mode indicator */}
        <div
          className={cn(
            "rounded-[20px] border border-[var(--line)] bg-[var(--warm)]/70",
            collapsed && !mobile ? "p-3" : "p-4",
          )}
        >
          {collapsed && !mobile ? (
            <p className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
              {mode === "demo" ? "Demo" : mode === "public" ? "Pub" : "Live"}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Mode
                </p>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    mode === "live" ? "bg-[var(--accent)]" : "bg-[var(--muted)]/50",
                  )}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--foreground)]">{modeText}</p>
              {mode !== "live" ? (
                <Link
                  href="/settings"
                  className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline"
                  onClick={mobile ? onClose : undefined}
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
