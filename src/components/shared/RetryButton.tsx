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
      className="min-h-11 w-full px-5 hover:translate-y-0 lg:w-auto lg:hover:-translate-y-0.5"
      disabled={isRetrying}
      onClick={onRetry}
    >
      {isRetrying ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Try again
        </span>
      ) : (
        "Try again"
      )}
    </Button>
  );
}
