"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui";
import "./admin-shell.css";
import "./sidebar.css";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/catalog", label: "Products", icon: BoxIcon },
  { href: "/dashboard/catalog/categories", label: "Categories", icon: TagIcon },
  { href: "/dashboard/inventory", label: "Inventory", icon: StackIcon },
  { href: "/dashboard/orders", label: "Orders", icon: OrdersIcon },
  { href: "/dashboard/accounts", label: "Accounts", icon: UsersIcon },
  { href: "/dashboard/accounts?role=DISTRIBUTOR", label: "Credit", icon: CreditIcon },
  { href: "/dashboard/settlements", label: "Settlements", icon: MoneyIcon },
];

// "Accounts" and "Credit" both point at /dashboard/accounts (Credit pre-filters by role via
// a query param) and so highlight together while there — reading the query param here to
// tell them apart would need a Suspense boundary around the whole shell for every page, which
// isn't worth it for a cosmetic distinction.
function navActive(pathname: string, href: string) {
  const base = href.split("?")[0]!;
  return base === "/dashboard" ? pathname === base : pathname.startsWith(base);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, account, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const displayName = account?.name?.trim() || account?.email || "Admin";
  const profileInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-shell flex h-screen w-full min-w-0 flex-1 overflow-hidden">
      <aside className="admin-sidebar sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-hidden sm:flex">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo"><Image src="/logo.png" alt="" width={26} height={25} /></div>
          <div><span>Nexa<span>Shopping</span></span><small>Admin workspace</small></div>
        </div>
        <nav className="admin-sidebar__nav">
          <p className="admin-sidebar__label">Workspace</p>
          {NAV.map((item) => {
            const active = navActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`admin-sidebar__link ${active ? "is-active" : ""}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__account">
            <Link href="/dashboard/profile" className="admin-sidebar__account-link">
              <span className="admin-sidebar__account-avatar">{profileInitial}</span>
              <span className="admin-sidebar__account-copy"><strong>{displayName}</strong><small>{account?.email ?? "Admin"}</small></span>
            </Link>
            <button type="button" onClick={handleLogout} disabled={signingOut} aria-label="Log out"><CloseIcon className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <div className="admin-shell__content flex h-screen min-h-0 w-full min-w-0 flex-1 flex-col">
        <header className="admin-shell__header flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5">
          <div className="flex items-center gap-2.5 sm:hidden">
            <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="admin-mobile-nav" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink transition-colors hover:bg-canvas">
              <span className="sr-only">{mobileMenuOpen ? "Close navigation" : "Open navigation"}</span>
              {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
            <Image src="/logo.png" alt="" width={24} height={23} className="h-6 w-auto" />
          </div>
          <div className="hidden text-sm text-ink-soft sm:block" />
          <div className="flex items-center gap-4">
            <a
              href="https://business.phonepe.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-md border border-brand/30 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/10 sm:inline-flex"
            >
              PhonePe dashboard ↗
            </a>
          </div>
        </header>
        <>
          <button type="button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} className={`fixed inset-0 z-40 bg-black/25 transition-opacity sm:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
          <div id="admin-mobile-nav" className={`admin-mobile-drawer fixed inset-y-0 left-0 z-50 flex h-screen w-[min(82vw,320px)] flex-col overflow-hidden px-4 py-5 shadow-2xl transition-transform duration-300 ease-out sm:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="admin-mobile-drawer__head"><div><strong>Nexa<span>Shopping</span></strong><small>Admin workspace</small></div><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><CloseIcon className="h-5 w-5" /></button></div>
            <nav className="admin-sidebar__nav admin-sidebar__nav--mobile">
              <p className="admin-sidebar__label">Workspace</p>
              {NAV.map((item) => {
                const active = navActive(pathname, item.href);
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`admin-sidebar__link ${active ? "is-active" : ""}`}><Icon className="h-5 w-5" />{item.label}</Link>;
              })}
            </nav>
            <div className="admin-sidebar__footer admin-sidebar__footer--mobile">
              <Link href="/dashboard/profile" onClick={() => setMobileMenuOpen(false)} className={`admin-sidebar__link ${pathname === "/dashboard/profile" ? "is-active" : ""}`}><UserIcon className="h-5 w-5" />My profile</Link>
              <button type="button" onClick={() => { setMobileMenuOpen(false); void handleLogout(); }} disabled={signingOut} className="admin-sidebar__logout"><CloseIcon className="h-4 w-4" />{signingOut ? "Signing out…" : "Log out"}</button>
            </div>
          </div>
        </>
        <main className="admin-shell__main flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
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

function OrdersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M6 3.5h9l3.5 3.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z"
        strokeLinejoin="round"
      />
      <path d="M15 3.5V7h3.5M8 11.5h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8" strokeLinecap="round" />
      <path d="M16 8.2a3 3 0 1 1 3.3 3M20.5 20c0-2.9-2-5.2-4.5-5.7" strokeLinecap="round" />
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

function MoneyIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 9h17M8 14h3" strokeLinecap="round" /></svg>;
}

function CreditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M3.5 9.5h17" strokeLinecap="round" />
      <path d="M6.5 14.5h4" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c0-3.6 3-6.5 7.5-6.5s7.5 2.9 7.5 6.5" strokeLinecap="round" />
    </svg>
  );
}
