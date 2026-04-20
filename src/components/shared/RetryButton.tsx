"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type RetryButtonProps = {
  onRetry: () => void;
  isRetrying: boolean;
};

export function RetryButton({ onRetry, isRetrying }: RetryButtonProps) {
  return (
    <Button
      type="button"
      onClick={onRetry}
      disabled={isRetrying}
      aria-busy={isRetrying}
      className="min-h-11 w-full gap-2 px-5 hover:translate-y-0 lg:w-auto lg:hover:-translate-y-0.5"
    >
      {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      Try again
    </Button>
  );
}
