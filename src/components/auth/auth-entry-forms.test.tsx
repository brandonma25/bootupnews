import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

const push = vi.fn();
const refresh = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword,
      signUp,
      signInWithOAuth,
    },
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps submit inactive until email and password are filled", () => {
    render(<LoginForm />);

    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });

    expect(submit).toBeEnabled();
  });

  it("shows the login error without clearing fields", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: new Error("Invalid") });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
    expect(screen.getByLabelText("Email")).toHaveValue("reader@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("wrong-password");
  });

  it("redirects home on login success", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });
});

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows field-level validation errors", async () => {
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Invalid email format")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Password too short")).toBeInTheDocument();
  });

  it("shows the API duplicate-account error", async () => {
    signUp.mockResolvedValueOnce({ error: new Error("duplicate") });
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-enough" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An account with this email already exists");
  });

  it("redirects home on signup success", async () => {
    signUp.mockResolvedValueOnce({ error: null });
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-enough" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });
});

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts the Google OAuth redirect flow", async () => {
    signInWithOAuth.mockResolvedValueOnce({ error: null });
    render(<GoogleAuthButton />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() =>
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?next=%2F",
        },
      }),
    );
  });

  it("shows an inline error if OAuth cannot start", async () => {
    signInWithOAuth.mockResolvedValueOnce({ error: new Error("cancelled") });
    render(<GoogleAuthButton />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Google sign-in could not be started");
  });
});
