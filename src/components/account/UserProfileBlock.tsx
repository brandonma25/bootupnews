"use client";

import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type UserProfileBlockProps = {
  user: { name: string; email: string; avatarUrl?: string | null } | null;
  isLoading: boolean;
  onSignOut: () => void;
  isSigningOut: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserProfileBlock({
  user,
  isLoading,
  onSignOut,
  isSigningOut,
}: UserProfileBlockProps) {
  if (isLoading) {
    return (
      <section className="flex w-full flex-col gap-4 rounded-card border border-[var(--line)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-4 rounded-card border border-[var(--line)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-14 w-14">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            {!user.avatarUrl ? <AvatarFallback>{getInitials(user.name)}</AvatarFallback> : null}
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-base font-medium text-[var(--foreground)]">{user.name}</h2>
            <p className="truncate text-sm text-[var(--muted)]">{user.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onSignOut}
          disabled={isSigningOut}
          aria-busy={isSigningOut}
          className="min-h-11 w-full gap-2 sm:w-auto"
        >
          {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Sign Out
        </Button>
      </div>
    </section>
  );
}
