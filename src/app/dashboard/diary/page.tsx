"use client";

import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/lib/money";
import { Button, Card, EmptyState, ErrorState, Input, Select, Spinner, StatusBadge } from "@/components/ui";
import {
  type DiaryEntry, type DiaryFilters, type DiaryPerson, type DiaryStatus,
  useApproveDiaryEntry, useCreateDiaryEntry, useDiaryCustomer, useDiaryCustomers,
  useDiaryEntries, useDiaryOverview, useRejectDiaryEntry, useReverseDiaryEntry,
} from "@/features/diary/api";
import "./diary.css";

const istFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
});

function formatIst(value: string): string {
  return istFormatter.format(new Date(value));
}

function toIstIso(local: string): string {
  return new Date(`${local}:00+05:30`).toISOString();
}

function initialIstDateTime(): string {
  const pieces = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => pieces.find((piece) => piece.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

function personLabel(person: DiaryPerson): string {
  return person.name?.trim() || person.phone || person.id;
}

type Action = { kind: "approve" | "reject" | "reverse"; entry: DiaryEntry };

export default function DiaryPage() {
  const { account } = useAuth();
  const [filters, setFilters] = useState<DiaryFilters>({ page: 1, limit: 20 });
  const [action, setAction] = useState<Action | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const overview = useDiaryOverview();
  const list = useDiaryEntries(filters);

  if (account?.role !== "ADMIN") {
    return <ErrorState message="Diary management is available to admins only." />;
  }

  function updateFilter(patch: Partial<DiaryFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  return (
    <div className="diary-page mx-auto w-full max-w-7xl space-y-6">
      <div className="diary-head">
        <div>
          <p className="diary-eyebrow">Cash receipt records</p>
          <h1>Diary management</h1>
          <p>Review cash entries, record confirmed handovers, and trace every correction.</p>
        </div>
        <a href="#start-diary" className="diary-head__action">Start diary</a>
      </div>

      {overview.isLoading ? <div className="diary-loading"><Spinner className="h-5 w-5" /></div> : overview.isError ? (
        <ErrorState message={overview.error instanceof Error ? overview.error.message : "Could not load diary overview"} onRetry={() => void overview.refetch()} />
      ) : overview.data && (
        <div className="diary-summary">
          <Card className="diary-stat diary-stat--primary">
            <span>Approved collections</span>
            <strong>{formatMoney(overview.data.approvedTotal)}</strong>
            <small>Approved, non-reversed entries only</small>
          </Card>
          <Card className="diary-stat"><span>Awaiting review</span><strong>{overview.data.pendingCount}</strong><small>Distributor submissions</small></Card>
          <Card className="diary-stat"><span>Approved records</span><strong>{overview.data.approvedEntryCount}</strong><small>Individual cash handovers</small></Card>
        </div>
      )}

      {overview.data && overview.data.recentEntries.length > 0 && <section className="diary-recent" aria-label="Recent diary activity">
        <strong>Recent activity</strong>
        <div>{overview.data.recentEntries.slice(0, 3).map((entry) => <span key={entry.id}>{entry.referenceCode} · {personLabel(entry.customer)} · <StatusBadge status={entry.status} /></span>)}</div>
      </section>}

      <CreateEntry />

      <section className="diary-panel" aria-labelledby="entries-heading">
        <div className="diary-panel__head">
          <div><h2 id="entries-heading">Entry register</h2><p>Dates and times use India Standard Time.</p></div>
          <Button variant="secondary" size="sm" onClick={() => { void list.refetch(); void overview.refetch(); }}>Refresh</Button>
        </div>
        <div className="diary-filters">
          <label>Status<Select value={filters.status ?? ""} onChange={(event) => updateFilter({ status: (event.target.value || undefined) as DiaryStatus | undefined })}>
            <option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="REVERSED">Reversed</option>
          </Select></label>
          <label>From<Input type="date" value={filters.from ?? ""} max={filters.to} onChange={(event) => updateFilter({ from: event.target.value || undefined })} /></label>
          <label>To<Input type="date" value={filters.to ?? ""} min={filters.from} onChange={(event) => updateFilter({ to: event.target.value || undefined })} /></label>
          <label>Customer ID<Input value={filters.customerAccountId ?? ""} onChange={(event) => updateFilter({ customerAccountId: event.target.value || undefined })} placeholder="Account ID" /></label>
          <label>Distributor ID<Input value={filters.distributorAccountId ?? ""} onChange={(event) => updateFilter({ distributorAccountId: event.target.value || undefined })} placeholder="Account ID" /></label>
          <Button variant="ghost" size="sm" onClick={() => setFilters({ page: 1, limit: 20 })}>Clear filters</Button>
        </div>
        {list.isLoading ? <div className="diary-loading"><Spinner className="h-5 w-5" /></div> : list.isError ? (
          <ErrorState message={list.error instanceof Error ? list.error.message : "Could not load entries"} onRetry={() => void list.refetch()} />
        ) : list.data?.data.entries.length ? (
          <>
            <div className="diary-table-wrap"><table className="diary-table"><thead><tr><th>Receipt</th><th>Customer</th><th>Collector</th><th>Cash received</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>
              {list.data.data.entries.map((entry) => <tr key={entry.id}>
                <td><strong>{entry.referenceCode}</strong><small>{entry.notes || "No note"}</small></td>
                <td><button className="diary-link" onClick={() => setHistoryId(entry.customer.id)}>{personLabel(entry.customer)}</button><small>{entry.customer.phone}</small></td>
                <td>{entry.collectorDistributor ? personLabel(entry.collectorDistributor) : "Admin"}</td>
                <td>{formatIst(entry.cashReceivedAt)}</td>
                <td className="diary-amount">{formatMoney(entry.amount)}</td>
                <td><StatusBadge status={entry.status} /></td>
                <td><div className="diary-actions">
                  {entry.status === "PENDING" && <><Button size="sm" onClick={() => setAction({ kind: "approve", entry })}>Approve</Button><Button size="sm" variant="danger" onClick={() => setAction({ kind: "reject", entry })}>Reject</Button></>}
                  {entry.status === "APPROVED" && <Button size="sm" variant="secondary" onClick={() => setAction({ kind: "reverse", entry })}>Reverse</Button>}
                  {entry.status === "REJECTED" || entry.status === "REVERSED" ? <span className="diary-muted">{entry.reason || "Recorded"}</span> : null}
                </div></td>
              </tr>)}
            </tbody></table></div>
            <div className="diary-pagination"><span>{list.data.meta?.total ?? list.data.data.entries.length} records · Page {filters.page} of {list.data.meta?.totalPages ?? 1}</span><div><Button variant="secondary" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</Button><Button variant="secondary" size="sm" disabled={filters.page >= (list.data.meta?.totalPages ?? 1)} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</Button></div></div>
          </>
        ) : <EmptyState title="No diary entries found" hint="Try a different date or status, or record a confirmed cash receipt." />}
      </section>

      {action && <ReviewDialog action={action} onClose={() => setAction(null)} />}
      {historyId && <CustomerHistory id={historyId} onClose={() => setHistoryId(null)} />}
    </div>
  );
}

function CreateEntry() {
  const create = useCreateDiaryEntry();
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState<DiaryPerson | null>(null);
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(initialIstDateTime);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const customers = useDiaryCustomers(search);
  const history = useDiaryCustomer(customer?.id ?? null, 1);
  const hasEntries = (history.data?.meta?.total ?? history.data?.data.entries.length ?? 0) > 0;

  function prepare(event: FormEvent) {
    event.preventDefault();
    setReceipt(null);
    if (customer && Number(amount) > 0 && Number.isFinite(Number(amount)) && receivedAt) {
      requestKey.current = crypto.randomUUID();
      setConfirming(true);
    }
  }

  async function confirm() {
    if (!customer || create.isPending) return;
    try {
      const result = await create.mutateAsync({
        customerAccountId: customer.id, amount, cashReceivedAt: toIstIso(receivedAt),
        notes: notes.trim() || undefined, idempotencyKey: requestKey.current!, confirmed: true,
      }) as { entry: DiaryEntry };
      setReceipt(result.entry.referenceCode);
      requestKey.current = null;
      setConfirming(false); setCustomer(null); setSearch(""); setAmount(""); setNotes("");
    } catch { /* error shown in dialog */ }
  }

  return <section id="start-diary" className="diary-panel diary-create" aria-labelledby="start-diary-heading">
    <div className="diary-panel__head"><div><h2 id="start-diary-heading">Start a customer diary</h2><p>Select an active customer, then record their first actual cash installment. Use the same flow for later receipts.</p></div></div>
    <div className="diary-create__steps" aria-label="Diary start steps"><span>1. Select customer</span><span>2. Enter cash receipt</span><span>3. Confirm</span></div>
    {receipt && <p className="diary-success" role="status">Receipt {receipt} recorded and approved.</p>}
    {customer && <p className="diary-create__status" role="status">{history.isLoading ? "Checking this customer’s diary…" : history.isError ? "Could not check existing diary records. You can still record a confirmed cash receipt." : hasEntries ? "This customer already has diary entries. The receipt below will add another entry." : "No diary entries yet. Their first confirmed cash receipt will start the diary."}</p>}
    <form onSubmit={prepare} className="diary-create__form">
      <div className="diary-customer-search"><label htmlFor="diary-customer">Customer</label><Input id="diary-customer" value={customer ? personLabel(customer) : search} onChange={(event) => { setCustomer(null); setSearch(event.target.value); }} placeholder="Search customer by name or phone" required />
        {!customer && search.trim().length >= 2 && <div className="diary-search-results" role="listbox" aria-label="Matching customers">
          {customers.isLoading ? <p>Searching…</p> : customers.isError ? <p>Customer search failed. Try again.</p> : customers.data?.data.customers.length ? customers.data.data.customers.map((item) => <button type="button" key={item.id} role="option" aria-selected={false} onClick={() => { setCustomer(item); setSearch(""); }}>{personLabel(item)} <span>{item.phone}</span></button>) : <p>No active customers found.</p>}
        </div>}
      </div>
      <div><label htmlFor="diary-amount">Amount (INR)</label><Input id="diary-amount" type="number" min="0.01" max="999999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="2000.00" required /></div>
      <div><label htmlFor="diary-date">Cash received (IST)</label><Input id="diary-date" type="datetime-local" value={receivedAt} max={initialIstDateTime()} onChange={(event) => setReceivedAt(event.target.value)} required /></div>
      <div className="diary-create__note"><label htmlFor="diary-note">Note (optional)</label><Input id="diary-note" value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="Cash handover details" /></div>
      <Button type="submit" disabled={!customer || create.isPending}>Review cash installment</Button>
    </form>
    {confirming && <div className="diary-backdrop" role="presentation"><div className="diary-dialog" role="dialog" aria-modal="true" aria-labelledby="diary-confirm-title">
      <h3 id="diary-confirm-title">Confirm cash received</h3><p>This will immediately approve one {formatMoney(amount)} cash receipt for <strong>{customer && personLabel(customer)}</strong>, received on {formatIst(toIstIso(receivedAt))}. Approved amounts cannot be edited; corrections require a reversal.</p>
      {create.isError && <p className="diary-error" role="alert">{create.error instanceof Error ? create.error.message : "Could not record receipt"}</p>}
      <div className="diary-dialog__actions"><Button variant="secondary" disabled={create.isPending} onClick={() => setConfirming(false)}>Go back</Button><Button disabled={create.isPending} onClick={() => void confirm()}>{create.isPending ? "Recording…" : "Confirm and record"}</Button></div>
    </div></div>}
  </section>;
}

function ReviewDialog({ action, onClose }: { action: Action; onClose: () => void }) {
  const approve = useApproveDiaryEntry();
  const reject = useRejectDiaryEntry();
  const reverse = useReverseDiaryEntry();
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const mutation = action.kind === "approve" ? approve : action.kind === "reject" ? reject : reverse;
  const title = action.kind === "approve" ? "Approve cash receipt" : action.kind === "reject" ? "Reject submission" : "Reverse approved receipt";

  async function submit() {
    if (mutation.isPending || (action.kind !== "approve" && !reason.trim())) return;
    try {
      if (action.kind === "approve") await approve.mutateAsync(action.entry.id);
      else if (action.kind === "reject") await reject.mutateAsync({ id: action.entry.id, reason: reason.trim() });
      else await reverse.mutateAsync({ id: action.entry.id, reason: reason.trim() });
      setDone(true);
    } catch { /* error shown below */ }
  }

  return <div className="diary-backdrop" role="presentation"><div className="diary-dialog" role="dialog" aria-modal="true" aria-labelledby="diary-review-title">
    <h3 id="diary-review-title">{done ? "Action recorded" : title}</h3>
    {done ? <p>The register and totals have been refreshed.</p> : <>
      <p><strong>{action.entry.referenceCode}</strong> · {personLabel(action.entry.customer)} · {formatMoney(action.entry.amount)} · cash received {formatIst(action.entry.cashReceivedAt)}.</p>
      {action.entry.notes && <p className="diary-dialog__note">Collector note: {action.entry.notes}</p>}
      {action.kind !== "approve" && <label className="diary-reason">Reason for {action.kind === "reject" ? "rejection" : "reversal"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} required placeholder="Record the reason for the audit trail" /></label>}
      {action.kind === "reverse" && <p className="diary-warning">Reversal removes this receipt from approved totals while preserving its history.</p>}
      {mutation.isError && <p className="diary-error" role="alert">{mutation.error instanceof Error ? mutation.error.message : "Could not update entry"}</p>}
    </>}
    <div className="diary-dialog__actions"><Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>{done ? "Close" : "Cancel"}</Button>{!done && <Button variant={action.kind === "approve" ? "primary" : "danger"} disabled={mutation.isPending || (action.kind !== "approve" && !reason.trim())} onClick={() => void submit()}>{mutation.isPending ? "Saving…" : title}</Button>}</div>
  </div></div>;
}

function CustomerHistory({ id, onClose }: { id: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const query = useDiaryCustomer(id, page);
  return <div className="diary-backdrop" role="presentation"><div className="diary-dialog diary-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="diary-history-title">
    <div className="diary-panel__head"><div><h3 id="diary-history-title">Customer history</h3>{query.data && <p>{personLabel(query.data.data.customer)} · Approved total {formatMoney(query.data.data.approvedTotal)}</p>}</div><Button variant="secondary" size="sm" onClick={onClose}>Close</Button></div>
    {query.isLoading ? <div className="diary-loading"><Spinner className="h-5 w-5" /></div> : query.isError ? <ErrorState message={query.error instanceof Error ? query.error.message : "Could not load history"} onRetry={() => void query.refetch()} /> : query.data?.data.entries.length ? <>
      <div className="diary-history-list">{query.data.data.entries.map((entry) => <article key={entry.id}><div><strong>{entry.referenceCode}</strong><span>{formatIst(entry.cashReceivedAt)} · {formatMoney(entry.amount)}</span></div><StatusBadge status={entry.status} /><p>{entry.notes || "No note"}</p>{entry.reason && <p>Reason: {entry.reason}</p>}{entry.auditEvents?.map((event) => <p className="diary-audit" key={event.id}>{event.action} · {formatIst(event.createdAt)} · actor {event.actorAccountId}</p>)}</article>)}</div>
      <div className="diary-pagination"><span>Page {page} of {query.data.meta?.totalPages ?? 1}</span><div><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= (query.data.meta?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    </> : <EmptyState title="No entries for this customer" />}
  </div></div>;
}
