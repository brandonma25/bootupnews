"use client";

import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import type { ViewerAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/account", label: "Account" },
];

export function AppShell({
  children,
  currentPath,
  account,
  isAdmin = false,
}: {
  children: React.ReactNode;
  currentPath: string;
  mode: "demo" | "live" | "public";
  account?: ViewerAccount | null;
  isAdmin?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-6 px-4 py-4 pb-24 lg:px-6 lg:pb-4">
      <aside className="hidden w-[240px] shrink-0 lg:block">
        <SidebarPanel
          currentPath={currentPath}
          account={account}
          isAdmin={isAdmin}
        />
      </aside>

      <main className="min-w-0 flex-1">{children}</main>

      <MobileBottomTabs currentPath={currentPath} />
    </div>
  );
}

function isActivePath(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function SidebarPanel({
  currentPath,
  account,
  isAdmin,
}: {
  currentPath: string;
  account?: ViewerAccount | null;
  isAdmin: boolean;
}) {
  return (
    <div className="sticky top-4 flex min-h-[calc(100vh-2rem)] w-full flex-col justify-between border-r border-[var(--bu-border-subtle)] bg-[var(--bu-bg-page)] p-[var(--bu-space-5)]">
      <div className="space-y-6">
        <div>
          <Wordmark />
          <p className="mt-[var(--bu-space-2)] text-[var(--bu-size-meta)] font-normal leading-[1.5] text-[var(--bu-text-secondary)]">
            For people who want to understand the world, not just consume it.
          </p>
        </div>

        <nav className="space-y-1" aria-label="Primary">
          {navItems.map((item) => {
            const active = isActivePath(currentPath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center rounded-none border-l-[3px] py-[var(--bu-space-2)] pr-[var(--bu-space-3)] text-[var(--bu-size-ui)] transition-colors",
                  active
                    ? "border-l-[var(--bu-accent)] pl-[calc(var(--bu-space-3)-3px)] font-medium text-[var(--bu-accent)]"
                    : "border-l-transparent pl-[calc(var(--bu-space-3)-3px)] font-normal text-[var(--bu-text-secondary)] hover:text-[var(--bu-text-primary)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        {isAdmin ? (
          <Link
            href="/dashboard/signals/editorial-review"
            prefetch={false}
            className="block text-[var(--bu-size-meta)] font-medium leading-5 text-[var(--bu-text-tertiary)] transition-colors hover:text-[var(--bu-accent)]"
          >
            Editorial Review
          </Link>
        ) : null}

        <div className="rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-4">
          {account ? (
          <div className="space-y-3">
            <Link href="/account" prefetch={false} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-[var(--bu-text-primary)] text-sm font-medium text-white">
                {account.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)]">
                  {account.displayName}
                </p>
                <p className="truncate text-[var(--bu-size-meta)] text-[var(--bu-text-secondary)]">{account.email}</p>
              </div>
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <div>
            <p className="text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)]">Public briefing</p>
            <p className="mt-1 text-[var(--bu-size-meta)] leading-5 text-[var(--bu-text-secondary)]">
              Sign in to unlock History and Account.
            </p>
            <Link
              href={`/login?redirectTo=${encodeURIComponent(currentPath || "/")}`}
              prefetch={false}
              className="mt-3 inline-flex text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-secondary)] transition-colors hover:text-[var(--bu-accent)]"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function MobileBottomTabs({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {navItems.map((item) => {
          const active = isActivePath(currentPath, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-button px-2 py-1 text-[var(--bu-size-meta)] transition-colors",
                active
                  ? "font-medium text-[var(--bu-accent)]"
                  : "font-normal text-[var(--bu-text-secondary)] hover:text-[var(--bu-text-primary)]",
              )}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
