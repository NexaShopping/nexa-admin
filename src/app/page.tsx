"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// The root just routes to the right place once auth state is known.
export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authed") router.replace("/dashboard");
    else if (status === "anon") router.replace("/login");
  }, [status, router]);

  return <div className="grid flex-1 place-items-center text-sm text-ink-soft">Loading…</div>;
}
