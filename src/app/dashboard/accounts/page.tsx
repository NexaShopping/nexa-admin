"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccounts, useCreateDistributor, useUpdateAccount, type AccountFilters } from "@/features/accounts/api";
import { ApiError } from "@/lib/api";
import { Button, Card, EmptyState, ErrorState, Input, Label, Select, Spinner } from "@/components/ui";
import type { AccountSummary, AccountStatus, Role } from "@/lib/types";

export default function AccountsPage() {
  const [filters, setFilters] = useState<AccountFilters>({});
  const [qInput, setQInput] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useAccounts(filters, cursor);
  const accounts = data?.data.accounts ?? [];
  const meta = data?.meta;
  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  function updateFilters(next: Partial<AccountFilters>) {
    setCursors([]);
    setFilters((f) => ({ ...f, ...next }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ q: qInput || undefined });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Accounts</h1>
          <p className="mt-1 text-sm text-ink-soft">Everyone with access — admins, distributors, and customers.</p>
        </div>
        <Button onClick={() => setShowCreate((s) => !s)}>{showCreate ? "Close" : "Onboard distributor"}</Button>
      </div>

      {showCreate && (
        <div className="mt-5">
          <CreateDistributorForm onDone={() => setShowCreate(false)} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={search} className="flex-1 sm:max-w-xs">
          <Input placeholder="Search name / email / phone…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </form>
        <Select
          className="sm:w-40"
          value={filters.role ?? ""}
          onChange={(e) => updateFilters({ role: (e.target.value || undefined) as Role | undefined })}
        >
          <option value="">Any role</option>
          <option value="ADMIN">Admin</option>
          <option value="COADMIN">Co-admin</option>
          <option value="DISTRIBUTOR">Distributor</option>
          <option value="CUSTOMER">Customer</option>
        </Select>
        <Select
          className="sm:w-40"
          value={filters.status ?? ""}
          onChange={(e) => updateFilters({ status: (e.target.value || undefined) as AccountStatus | undefined })}
        >
          <option value="">Any status</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {isLoading ? (
            <div className="grid place-items-center py-20 text-ink-soft">
              <Spinner className="h-5 w-5" />
            </div>
          ) : isError ? (
            <ErrorState message={error instanceof Error ? error.message : "Could not load accounts"} onRetry={refetch} />
          ) : accounts.length === 0 ? (
            <EmptyState title="No accounts match" hint="Try a different search or filter." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-canvas">
                  <tr className="text-left text-xs text-ink-soft">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Contact</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`cursor-pointer transition-colors hover:bg-canvas ${selectedId === a.id ? "bg-brand/5" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{a.name ?? "—"}</p>
                        {a.distributor && <p className="text-xs text-ink-soft">{a.distributor.businessName}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-soft">{a.email ?? a.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 capitalize">{a.role.toLowerCase()}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(cursors.length > 0 || meta?.hasMore) && accounts.length > 0 && (
            <div className="mt-4 flex justify-center gap-3">
              {cursors.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setCursors((c) => c.slice(0, -1))}>
                  Previous
                </Button>
              )}
              {meta?.hasMore && meta.cursor && (
                <Button variant="secondary" size="sm" disabled={isFetching} onClick={() => setCursors((c) => [...c, meta.cursor!])}>
                  {isFetching ? "Loading…" : "Next"}
                </Button>
              )}
            </div>
          )}
        </div>

        <div>
          {selected ? (
            <AccountDetail account={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
              Select a row to view or edit an account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: AccountStatus }) {
  const tones: Record<AccountStatus, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SUSPENDED: "bg-red-50 text-red-700",
    CLOSED: "bg-neutral-100 text-neutral-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tones[status]}`}>{status.toLowerCase()}</span>;
}

function CreateDistributorForm({ onDone }: { onDone: () => void }) {
  const create = useCreateDistributor();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [territory, setTerritory] = useState("");
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name, phone, businessName, territory: territory || undefined,
        credit: creditEnabled ? { enabled: true, limit: creditLimit } : undefined,
      });
      setName("");
      setPhone("");
      setBusinessName("");
      setTerritory("");
      setCreditEnabled(false);
      setCreditLimit("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not onboard this distributor");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-medium">Onboard a distributor</p>
      <p className="text-xs text-ink-soft">
        Manual onboarding — self sign-up by phone OTP is still blocked on DLT verification.
      </p>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Phone (E.164)</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919812345678" required />
        </div>
        <div>
          <Label>Business name</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>
        <div>
          <Label>Territory (optional)</Label>
          <Input value={territory} onChange={(e) => setTerritory(e.target.value)} />
        </div>
        <label className="flex items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2.5 text-sm">
          <input type="checkbox" checked={creditEnabled} onChange={(e) => setCreditEnabled(e.target.checked)} className="accent-brand" />
          Enable 30-day credit
        </label>
        {creditEnabled && <div><Label>Credit limit</Label><Input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} inputMode="decimal" placeholder="50000.00" required /></div>}
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={create.isPending || !name || !phone || !businessName || (creditEnabled && !creditLimit)}>
            {create.isPending ? "Onboarding…" : "Onboard distributor"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AccountDetail({ account, onClose }: { account: AccountSummary; onClose: () => void }) {
  const update = useUpdateAccount(account.id);
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [territory, setTerritory] = useState(account.distributor?.territory ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        status: status !== account.status ? status : undefined,
        territory: account.role === "DISTRIBUTOR" ? territory || undefined : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{account.name ?? "—"}</p>
          <p className="text-xs text-ink-soft">{account.email ?? account.phone}</p>
        </div>
        <button onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
          Close
        </button>
      </div>

      {account.distributor && (
        <div className="rounded-md bg-canvas p-3 text-sm">
          <p className="font-medium">{account.distributor.businessName}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Referral code <span className="font-mono">{account.distributor.referralCode}</span>
          </p>
        </div>
      )}

      {account.role === "DISTRIBUTOR" && <Link href={`/dashboard/accounts/${account.id}/credit`} className="flex items-center justify-between rounded-md border border-brand/25 bg-brand/5 px-3 py-2.5 text-sm font-medium text-brand hover:bg-brand/10"><span>Credit account</span><span aria-hidden>→</span></Link>}

      <form onSubmit={save} className="space-y-3">
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>
        {account.role === "DISTRIBUTOR" && (
          <div>
            <Label>Territory</Label>
            <Input value={territory} onChange={(e) => setTerritory(e.target.value)} />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" size="sm" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
