"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

const sections = {
  security: { title: "Security & sessions", description: "Manage authentication and active sessions.", items: ["Two-factor authentication", "Active sessions", "Sign out of other devices"] },
  notifications: { title: "Notifications", description: "Choose which workspace alerts you receive.", items: ["Order updates", "Payment reminders", "Low-stock alerts", "Email and push preferences"] },
} as const;

export default function ProfileSectionPage() {
  const { section } = useParams<{ section: string }>();
  const content = sections[section as keyof typeof sections] ?? sections.security;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/dashboard/profile" className="text-sm text-on-surface-variant hover:text-on-surface">
        ← Back to profile
      </Link>
      <Card className="mt-4 p-6">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-lg text-primary">✦</div>
        <h1 className="mt-3 font-display text-xl font-bold text-on-surface">{content.title}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{content.description}</p>
        <div className="mt-4 flex flex-col gap-2">
          {content.items.map((item) => (
            <div key={item} className="flex items-center justify-between rounded-lg border border-outline-variant px-3 py-2.5 text-sm text-on-surface">
              <span>{item}</span>
              <span className="text-on-surface-variant">›</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-on-surface-variant">These profile controls are ready to be configured in the next profile settings update.</p>
      </Card>
    </div>
  );
}
