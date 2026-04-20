"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type GoogleAuthButtonProps = {
  className?: string;
  redirectPath?: string;
};

function getRedirectTo(redirectPath: string) {
  if (typeof window === "undefined") {
    return `/auth/callback?next=${encodeURIComponent(redirectPath)}`;
  }

  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", redirectPath);
  return callbackUrl.toString();
}

export function GoogleAuthButton({
  className,
  redirectPath = "/",
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGoogleAuth() {
    setErrorMessage(null);
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage("Google sign-in could not be started");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectTo(redirectPath),
      },
    });

    if (error) {
      setErrorMessage("Google sign-in could not be started");
      setIsLoading(false);
    }
  }

  return (
    <div className={className ?? "mx-auto w-full max-w-sm space-y-2"}>
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 w-full"
        disabled={isLoading}
        onClick={handleGoogleAuth}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Continue with Google
          </span>
        ) : (
          "Continue with Google"
        )}
      </Button>
      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
