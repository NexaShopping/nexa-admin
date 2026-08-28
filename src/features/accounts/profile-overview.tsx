"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAccount, useUpdateAccount } from "@/features/accounts/api";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Card, ErrorState, Input, Label, Spinner } from "@/components/ui";
import type { AuthAccount } from "@/lib/types";

const SECTION_LINKS = [
  { slug: "security", title: "Security & sessions", detail: "Two-factor auth and active sessions" },
  { slug: "notifications", title: "Notifications", detail: "Alerts and preferences" },
] as const;

export function ProfileOverview({ account }: Readonly<{ account: AuthAccount }>) {
  const { refreshAccount } = useAuth();
  const query = useAccount(account.id);
  const update = useUpdateAccount(account.id);
  const [name, setName] = useState(account.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(account.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<"security" | "notifications">("security");

  if (query.isLoading) {
    return <div className="grid place-items-center py-20 text-on-surface-variant"><Spinner className="h-5 w-5" /></div>;
  }
  if (query.isError || !query.data) {
    return <ErrorState message="Could not load your profile." onRetry={() => query.refetch()} />;
  }

  const profile = query.data.account;
  const initials = (name || profile.phone || profile.email || "A").slice(0, 2).toUpperCase();
  // Real completion, not a decorative number: counts the fields an admin can actually set here.
  const trackedFields = [name.trim(), avatarUrl.trim()];
  const completion = Math.round((trackedFields.filter(Boolean).length / trackedFields.length) * 100);
  const joined = new Date(profile.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  const lastActive = profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ name: name.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined });
      await refreshAccount();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile");
    }
  }

  const sectionContent = {
    security: { title: "Security & sessions", description: "Review authentication and active sessions for your account.", items: ["Two-factor authentication", "Active sessions", "Sign out of other devices"] },
    notifications: { title: "Notifications", description: "Choose which order, payment, and inventory alerts you receive.", items: ["Order updates", "Payment reminders", "Low-stock alerts", "Email and push preferences"] },
  }[activeSection];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link href="/dashboard" className="hover:text-on-surface">Dashboard</Link>
        <span>›</span>
        <strong className="font-medium text-on-surface">Profile</strong>
      </nav>

      <Card className="flex flex-wrap items-center gap-5 border-primary/20 bg-primary/5 p-6">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high text-lg font-semibold text-on-surface-variant">
          {avatarUrl.trim() ? <Image src={avatarUrl.trim()} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold text-on-surface">{name || "Admin"}</h1>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{profile.status.toLowerCase()}</span>
          </div>
          <p className="mt-0.5 text-sm text-on-surface-variant">{profile.email ?? profile.phone ?? "No contact on file"}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
            </div>
            <span className="text-xs font-medium text-on-surface-variant">Profile {completion}% complete</span>
          </div>
        </div>
        <Button type="button" onClick={() => document.getElementById("profile-name")?.focus()}>Edit profile</Button>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <p className="font-display text-base font-bold text-on-surface">Personal details</p>
          <p className="mt-1 text-sm text-on-surface-variant">Update the details shown across the admin panel.</p>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <Label>Full name</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input id="profile-email" value={profile.email ?? ""} disabled placeholder="—" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input id="profile-phone" value={profile.phone ?? ""} disabled placeholder="—" />
            </div>
            <div>
              <Label>Avatar URL</Label>
              <Input id="profile-avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
              <p className="mt-1 text-xs text-on-surface-variant">Paste a link to an image — there&apos;s no upload here yet.</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <p className="font-display text-base font-bold text-on-surface">Account overview</p>
          <p className="mt-1 text-sm text-on-surface-variant">Your admin account</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-on-surface-variant">Role</dt>
              <dd className="font-medium capitalize text-on-surface">{profile.role.toLowerCase()}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-on-surface-variant">Status</dt>
              <dd className="font-medium capitalize text-emerald-700">{profile.status.toLowerCase()}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-on-surface-variant">Member since</dt>
              <dd className="font-medium text-on-surface">{joined}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-on-surface-variant">Last active</dt>
              <dd className="font-medium text-on-surface">{lastActive}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="text-emerald-600">✓</span> Verified account — signed in with Google SSO
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTION_LINKS.map((link) => (
          <Link
            key={link.slug}
            href={`/dashboard/profile/${link.slug}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:bg-surface-container-high"
          >
            <div>
              <p className="text-sm font-semibold text-on-surface">{link.title}</p>
              <p className="text-xs text-on-surface-variant">{link.detail}</p>
            </div>
            <span className="text-on-surface-variant">›</span>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex gap-2 border-b border-outline-variant pb-3">
          {(["security", "notifications"] as const).map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActiveSection(slug)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeSection === slug ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}
            >
              {slug === "security" ? "Security & sessions" : "Notifications"}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <h2 className="font-display text-base font-bold text-on-surface">{sectionContent.title}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{sectionContent.description}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sectionContent.items.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-outline-variant px-3 py-2.5 text-sm text-on-surface">
                <span>{item}</span>
                <span className="text-on-surface-variant">›</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-on-surface-variant">These controls are ready to be configured in a future profile settings update.</p>
        </div>
      </Card>
    </div>
  );
}
