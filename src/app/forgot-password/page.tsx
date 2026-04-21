import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getViewerAccount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Forgot Password — Daily Intelligence",
};

export default async function ForgotPasswordPage() {
  const viewer = await getViewerAccount("/forgot-password");

  if (viewer) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <ForgotPasswordForm />
    </main>
  );
}
