"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type SavePreferencesButtonProps = {
  isDirty: boolean;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isSuccess: boolean;
  error: string | null;
};

export function SavePreferencesButton({
  isDirty,
  onSave,
  isSaving,
  isSuccess,
  error,
}: SavePreferencesButtonProps) {
  return (
    <div className="w-full space-y-2">
      <Button
        type="button"
        onClick={() => void onSave()}
        disabled={!isDirty || isSaving}
        aria-busy={isSaving}
        className="min-h-11 w-full gap-2 sm:w-auto"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Save Preferences
      </Button>
      {isSuccess ? <p className="text-sm font-medium text-[var(--accent)]">Preferences saved</p> : null}
      {error ? <p className="text-sm font-medium text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
