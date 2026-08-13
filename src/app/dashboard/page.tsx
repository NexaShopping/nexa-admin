"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { status, account, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === "anon") router.replace("/login");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="grid flex-1 place-items-center text-sm text-ink-soft">Loading…</div>
    );
  }

  async function handleLogout() {
    setSigningOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={28} height={27} className="h-7 w-auto" />
          <span className="font-semibold tracking-tight">
            Nexa<span className="text-brand">Shopping</span>
            <span className="ml-1.5 text-ink-soft">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-soft sm:inline">
            {account?.email ?? account?.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="rounded-md border border-line px-3 py-1.5 text-sm transition-colors hover:bg-canvas disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </header>

      <main className="grid flex-1 place-items-center p-8">
        <p className="text-sm text-ink-soft">Dashboard — coming soon.</p>
      </main>
    </div>
  );
}
