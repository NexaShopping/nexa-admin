"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { status, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authed") router.replace("/dashboard");
  }, [status, router]);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // user closed the popup — no error to show
      } else if (err instanceof ApiError) {
        setError(
          err.code === "FORBIDDEN"
            ? "This Google account isn't authorised for admin access."
            : err.message,
        );
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={32} height={31} className="h-8 w-auto" />
          <span className="text-lg font-semibold tracking-tight">
            Nexa<span className="text-brand">Shopping</span>
          </span>
        </div>

        <h1 className="mt-8 text-xl font-semibold">Admin sign in</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Sign in with your authorised Google account to continue.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in with Google"}
        </button>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
