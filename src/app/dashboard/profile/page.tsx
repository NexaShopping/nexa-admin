"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUpdateAccount } from "@/features/accounts/api";
import { ApiError } from "@/lib/api";
import { Button, Card, Input, Label, Spinner } from "@/components/ui";

export default function ProfilePage() {
  const { account, refreshAccount } = useAuth();

  if (!account) {
    return (
      <div className="grid place-items-center py-20 text-on-surface-variant">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  return <ProfileForm accountId={account.id} name={account.name} avatarUrl={account.avatarUrl} email={account.email} phone={account.phone} onSaved={refreshAccount} />;
}

interface ProfileFormProps {
  accountId: string;
  name: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  onSaved: () => Promise<void>;
}

function ProfileForm({ accountId, name, avatarUrl, email, phone, onSaved }: Readonly<ProfileFormProps>) {
  const update = useUpdateAccount(accountId);
  const [nameInput, setNameInput] = useState(name ?? "");
  const [avatarInput, setAvatarInput] = useState(avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initial = (nameInput.trim() || email || phone || "A").charAt(0).toUpperCase();
  const dirty = nameInput.trim() !== (name ?? "") || avatarInput.trim() !== (avatarUrl ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({
        name: nameInput.trim() || undefined,
        avatarUrl: avatarInput.trim() || undefined,
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-on-surface">My profile</h1>
      <p className="mt-1 text-sm text-on-surface-variant">How your name and avatar appear across the admin panel.</p>

      <Card className="mt-6 space-y-5 p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high text-xl font-semibold text-on-surface-variant">
            {avatarInput.trim() ? (
              <Image src={avatarInput.trim()} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-on-surface">{name ?? "Unnamed admin"}</p>
            <p className="truncate text-sm text-on-surface-variant">{email ?? phone ?? "—"}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label>Avatar URL</Label>
            <Input value={avatarInput} onChange={(e) => setAvatarInput(e.target.value)} placeholder="https://…" />
            <p className="mt-1 text-xs text-on-surface-variant">Paste a link to an image — there&apos;s no upload here yet.</p>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email ?? ""} disabled placeholder="—" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone ?? ""} disabled placeholder="—" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}

          <Button type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
