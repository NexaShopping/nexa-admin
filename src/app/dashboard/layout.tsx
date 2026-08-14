"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/catalog", label: "Catalog", icon: BoxIcon },
  { href: "/dashboard/catalog/categories", label: "Categories", icon: TagIcon },
  { href: "/dashboard/inventory", label: "Inventory", icon: StackIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, account, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === "anon") router.replace("/login");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="grid flex-1 place-items-center text-ink-soft">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  async function handleLogout() {
    setSigningOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface sm:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-5">
          <Image src="/logo.png" alt="" width={26} height={25} className="h-6.5 w-auto" />
          <span className="font-semibold tracking-tight">
            Nexa<span className="text-brand">Shopping</span>
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand/10 text-brand" : "text-ink-soft hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-5">
          <div className="flex items-center gap-2.5 sm:hidden">
            <Image src="/logo.png" alt="" width={24} height={23} className="h-6 w-auto" />
            <span className="font-semibold tracking-tight">
              Nexa<span className="text-brand">Shopping</span>
            </span>
          </div>
          <div className="hidden text-sm text-ink-soft sm:block" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-soft sm:inline">{account?.email ?? account?.name}</span>
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
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z M3.5 7.5 12 12l8.5-4.5M12 12v9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z M3.5 12 12 16.5 20.5 12 M3.5 16 12 20.5 20.5 16"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M12.6 3.5H5a1.5 1.5 0 0 0-1.5 1.5v7.6c0 .4.16.78.44 1.06l9.4 9.4c.58.58 1.53.58 2.12 0l7.1-7.1c.58-.58.58-1.53 0-2.12l-9.4-9.4a1.5 1.5 0 0 0-1.06-.44Z"
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="8.25" r="1.25" />
    </svg>
  );
}
