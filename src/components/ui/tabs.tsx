"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
} from "react";

import { cn } from "@/lib/utils";

export function Tabs({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"div">>) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {children}
    </div>
  );
}

export function TabsList({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"div">>) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-5 overflow-x-auto border-b border-[var(--line)]",
        className,
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }>
>(function TabsTrigger({ children, className, active = false, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "relative min-h-11 shrink-0 whitespace-nowrap px-1 pb-3 pt-2 text-sm font-semibold text-[var(--muted)] transition-colors lg:hover:text-[var(--foreground)]",
        active && "text-[var(--foreground)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export function TabsContent({
  children,
  className,
  active = true,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"div"> & { active?: boolean }>) {
  if (!active) {
    return null;
  }

  return (
    <div className={cn("mt-5", className)} role="tabpanel" {...props}>
      {children}
    </div>
  );
}
