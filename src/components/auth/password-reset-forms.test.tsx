import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const push = vi.fn();
const refresh = vi.fn();
const resetPasswordForEmail = vi.fn();
const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();
const updateUser = vi.fn();
let mockedSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => mockedSearchParams,
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      resetPasswordForEmail,
      exchangeCodeForSession,
      verifyOtp,
      updateUser,
    },
  }),
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSearchParams = new URLSearchParams();
  });

  it("keeps submit inactive until email is filled", () => {
    render(<ForgotPasswordForm />);

    const submit = screen.getByRole("button", { name: "Send reset link" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });

    expect(submit).toBeEnabled();
  });

  it("shows a success state with the submitted email", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Check your inbox — we've sent a reset link to reader@example.com",
    );
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute("href", "/login");
  });

  it("shows the account-not-found error without clearing the email", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({ error: new Error("not found") });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "missing@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No account found with this email address");
    expect(screen.getByLabelText("Email")).toHaveValue("missing@example.com");
  });
});

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSearchParams = new URLSearchParams("code=recovery-code");
  });

  it("shows an expired-link error immediately when no token is present", () => {
    mockedSearchParams = new URLSearchParams();
    render(<ResetPasswordForm />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This reset link has expired. Please request a new one.",
    );
    expect(screen.getByRole("link", { name: "Request a new one" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();
  });

  it("keeps submit inactive until a password is filled", () => {
    render(<ResetPasswordForm />);

    const submit = screen.getByRole("button", { name: "Update password" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });

    expect(submit).toBeEnabled();
  });

  it("shows a validation error for short passwords", async () => {
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password too short");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges the recovery code, updates the password, and redirects to login confirmation", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    updateUser.mockResolvedValueOnce({ error: null });
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledWith("recovery-code"));
    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(push).toHaveBeenCalledWith("/login?message=password-updated");
  });

  it("verifies token_hash links before updating the password", async () => {
    mockedSearchParams = new URLSearchParams("token_hash=recovery-token&type=recovery");
    verifyOtp.mockResolvedValueOnce({ error: null });
    updateUser.mockResolvedValueOnce({ error: null });
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({
        token_hash: "recovery-token",
        type: "recovery",
      }),
    );
    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });

  it("shows the expired-link error when token exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("expired") });
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This reset link has expired. Please request a new one.",
    );
    expect(updateUser).not.toHaveBeenCalled();
  });
});
