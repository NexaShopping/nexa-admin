"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.35 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.2Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.54 13.83A5.85 5.85 0 0 1 6.24 12c0-.64.11-1.26.3-1.83V7.64H3.3A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.36l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.24 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z" />
    </svg>
  );
}

function StoreGlyph({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} fill="none">
      <path d="M5 13.5h22M6.5 13.5v13h19v-13M11 26.5v-7h10v7M5 13.5 7.2 6h17.6l2.2 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5 13.5c.5 1.5 1.5 2.2 3.1 2.2s2.7-.7 3.3-2.2c.6 1.5 1.6 2.2 3.2 2.2s2.8-.7 3.4-2.2c.6 1.5 1.7 2.2 3.2 2.2s2.8-.7 3.3-2.2c.5 1.5 1.5 2.2 2.5 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WarehouseArt() {
  return (
    <div className="login-art" aria-hidden="true">
      <svg className="login-art-lines" viewBox="0 0 760 760" fill="none">
        <path d="M-40 565c160-175 285-105 385-244 98-136 201-205 440-121" stroke="currentColor" strokeOpacity=".16" strokeWidth="1.5" />
        <path d="M-30 640c185-125 278-31 413-165 132-130 230-110 395-52" stroke="currentColor" strokeOpacity=".12" strokeWidth="1.5" />
        <path d="M118 180C248 74 414 66 598 169" stroke="currentColor" strokeOpacity=".34" strokeWidth="1.5" strokeDasharray="4 7" />
        <circle cx="118" cy="180" r="6" fill="currentColor" /><circle cx="598" cy="169" r="6" fill="currentColor" />
        <path d="m579 160 19 9-16 12" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="art-heading"><span>OPERATIONS, IN ONE VIEW</span><strong>Move products.<br /><em>Grow faster.</em></strong><p>Everything your team needs to keep the NexaShopping network in motion.</p></div>
      <div className="warehouse-card"><div className="warehouse-roof" /><div className="warehouse-body"><div className="warehouse-sign">NEXA<br /><small>FULFILMENT</small></div><div className="warehouse-door" /><div className="warehouse-box box-a" /><div className="warehouse-box box-b" /><div className="warehouse-box box-c" /></div></div>
      <div className="art-stat stat-credit"><span className="stat-icon">₹</span><div><small>LIVE CREDIT</small><strong>₹2,57,650</strong><p><i />Within credit limit</p></div></div>
      <div className="art-stat stat-orders"><span className="stat-icon stat-grid"><b /><b /><b /><b /></span><div><small>ORDERS TODAY</small><strong>248</strong><p>+18.4% this week</p></div></div>
      <div className="art-chip chip-stock"><span>STOCK VALUE</span><strong>₹18,74,920</strong><div className="mini-chart"><i /><i /><i /><i /><i /></div></div>
      <div className="art-badge"><span className="truck">↗</span><small>GOODS<br />FLOW</small></div>
    </div>
  );
}

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
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand"><Image src="/logo.png" alt="NexaShopping" width={38} height={37} className="login-logo" /><span>Nexa<span>Shopping</span></span></div>
          <div className="login-eyebrow"><StoreGlyph className="h-4 w-4" /> Admin workspace</div>
          <h1>Welcome back<span>.</span></h1>
          <p className="login-subtitle">Sign in to manage products, distributors, and every order moving through NexaShopping.</p>
          <button type="button" onClick={handleSignIn} disabled={busy} className="google-button"><GoogleMark />{busy ? "Signing in…" : "Continue with Google"}<span className="button-arrow">↗</span></button>
          {error && <p role="alert" className="login-error">{error}</p>}
          <div className="login-rule"><span />Secure access for authorised administrators<span /></div>
          <p className="login-footnote">By continuing, you confirm this is an approved NexaShopping admin account.</p>
        </div>
      </section>
      <section className="login-visual"><WarehouseArt /><div className="visual-footer"><span>Live network insights</span><span>Transparent ledger</span><span>Secure &amp; trusted</span></div></section>
    </main>
  );
}
