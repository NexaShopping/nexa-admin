"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccounts, useCreateDistributor, useUpdateAccount, type AccountFilters } from "@/features/accounts/api";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Card, EmptyState, ErrorState, Input, Label, Select, Spinner } from "@/components/ui";
import type { AccountSummary, AccountStatus, Role } from "@/lib/types";

const ROLES: Role[] = ["ADMIN", "COADMIN", "DISTRIBUTOR", "CUSTOMER"];

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="grid place-items-center py-20 text-on-surface-variant"><Spinner className="h-5 w-5" /></div>}>
      <AccountsPageInner />
    </Suspense>
  );
}

function AccountsPageInner() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole = ROLES.includes(roleParam as Role) ? (roleParam as Role) : undefined;
  const [filters, setFilters] = useState<AccountFilters>({ role: initialRole });
  const [qInput, setQInput] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useAccounts(filters, cursor);
  const accounts = data?.data.accounts ?? [];
  const meta = data?.meta;
  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === null && accounts.length > 0) setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

  function updateFilters(next: Partial<AccountFilters>) {
    setCursors([]);
    setFilters((f) => ({ ...f, ...next }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ q: qInput || undefined });
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin operations</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-on-surface">Accounts</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Everyone with access — admins, distributors, and customers.</p>
        </div>
        <Button onClick={() => setShowCreate((s) => !s)}>{showCreate ? "Close" : "Onboard distributor"}</Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4"><AccountMetric label="Total accounts" value={accounts.length} /><AccountMetric label="Distributors" value={accounts.filter((a) => a.role === "DISTRIBUTOR").length} /><AccountMetric label="Customers" value={accounts.filter((a) => a.role === "CUSTOMER").length} /><AccountMetric label="Pending review" value={accounts.filter((a) => a.status === "PENDING").length} /></div>

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
            <div className="grid place-items-center py-20 text-on-surface-variant">
              <Spinner className="h-5 w-5" />
            </div>
          ) : isError ? (
            <ErrorState message={error instanceof Error ? error.message : "Could not load accounts"} onRetry={refetch} />
          ) : accounts.length === 0 ? (
            <EmptyState title="No accounts match" hint="Try a different search or filter." />
          ) : (
            <>
            <div className="hidden overflow-x-auto rounded-xl border border-outline-variant sm:block">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-high">
                  <tr className="text-left text-xs text-on-surface-variant">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Contact</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`cursor-pointer transition-colors hover:bg-surface-container-high ${selectedId === a.id ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-on-surface">{a.name ?? "—"}</p>
                        {a.distributor && <p className="text-xs text-on-surface-variant">{a.distributor.businessName}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-on-surface-variant">{a.email ?? a.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 capitalize text-on-surface">{a.role.toLowerCase()}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 sm:hidden">{accounts.map((a) => <button type="button" key={a.id} onClick={() => setSelectedId(a.id)} className={`rounded-xl border p-3 text-left ${selectedId === a.id ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-lowest"}`}><div className="flex items-center justify-between gap-2"><span className="font-medium text-on-surface">{a.name ?? "—"}</span><StatusPill status={a.status} /></div><p className="mt-0.5 text-xs text-on-surface-variant">{a.email ?? a.phone ?? "—"}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant"><span>Role <b className="text-on-surface">{a.role.toLowerCase()}</b></span><span>{a.distributor?.businessName ?? "Account"}</span></div></button>)}</div>
            </>
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
            <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
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

function AccountMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface">{value}</p>
    </div>
  );
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
      <p className="text-xs text-on-surface-variant">
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
        <label className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm">
          <input type="checkbox" checked={creditEnabled} onChange={(e) => setCreditEnabled(e.target.checked)} className="accent-[var(--md-primary)]" />
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
  const { account: currentAdmin } = useAuth();
  const isSelf = currentAdmin?.id === account.id;
  const update = useUpdateAccount(account.id);
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [territory, setTerritory] = useState(account.distributor?.territory ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        status: !isSelf && status !== account.status ? status : undefined,
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
          <p className="font-medium text-on-surface">{account.name ?? "—"}</p>
          <p className="text-xs text-on-surface-variant">{account.email ?? account.phone}</p>
        </div>
        <button onClick={onClose} className="text-sm text-on-surface-variant hover:text-on-surface">
          Close
        </button>
      </div>

      {account.distributor && (
        <div className="rounded-md bg-surface-container-high p-3 text-sm">
          <p className="font-medium">{account.distributor.businessName}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Referral code <span className="font-mono">{account.distributor.referralCode}</span>
          </p>
        </div>
      )}

      {account.role === "DISTRIBUTOR" && <Link href={`/dashboard/accounts/${account.id}/credit`} className="flex items-center justify-between rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"><span>Credit account</span><span aria-hidden>→</span></Link>}

      <form onSubmit={save} className="space-y-3">
        <div>
          <Label>Status</Label>
          <Select value={status} disabled={isSelf} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CLOSED">Closed</option>
          </Select>
          {isSelf && (
            <p className="mt-1 text-xs text-on-surface-variant">
              You can&apos;t change your own status — there&apos;s no way back in once it leaves Active. Ask another admin.
            </p>
          )}
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
