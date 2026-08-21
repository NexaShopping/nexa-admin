"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, Card, EmptyState, ErrorState, Input, Label, Select, Spinner } from "@/components/ui";
import { useCredit, useCreditCharges, useCreditLedger, useCreditRepayments, useOfflineRepayment, useUpdateCredit } from "./api";

export function CreditPanel({ accountId }: { accountId: string }) {
  const summary = useCredit(accountId);
  const hasCreditAccount = Boolean(summary.data?.credit);
  const charges = useCreditCharges(accountId, hasCreditAccount);
  const ledger = useCreditLedger(accountId, hasCreditAccount);
  const repayments = useCreditRepayments(accountId, hasCreditAccount);
  const update = useUpdateCredit(accountId);
  const repay = useOfflineRepayment(accountId);
  const [limit, setLimit] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (summary.isLoading) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6 text-brand" /></div>;
  if (summary.isError && !(summary.error instanceof ApiError && summary.error.status === 404)) return <ErrorState message={summary.error instanceof Error ? summary.error.message : "Could not load credit"} onRetry={summary.refetch} />;
  const credit = summary.data?.credit;
  if (!credit) return <CreditApproval accountId={accountId} />;

  async function saveCredit(e: React.FormEvent) {
    e.preventDefault(); setMessage(null);
    try {
      await update.mutateAsync({ creditLimit: limit || undefined, status, reason });
      setLimit(""); setReason(""); setMessage("Credit settings saved.");
    } catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not save credit settings"); }
  }
  async function saveRepayment(e: React.FormEvent) {
    e.preventDefault(); setMessage(null);
    try {
      await repay.mutateAsync({ amount, methodLabel: method, externalReference: reference, paidAt: new Date().toISOString() });
      setAmount(""); setReference(""); setMessage("Offline repayment recorded.");
    } catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not record repayment"); }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Credit limit" value={formatMoney(credit.creditLimit)} />
        <Metric label="Outstanding" value={formatMoney(credit.currentBalance)} tone={credit.hasOverdueCharges ? "danger" : "default"} />
        <Metric label="Available" value={formatMoney(credit.availableCredit)} tone="positive" />
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-line p-5"><h2 className="font-semibold">Credit control</h2><p className="mt-1 text-sm text-ink-soft">Thirty-day terms. Every change requires an audit reason.</p></div>
        <form onSubmit={saveCredit} className="grid gap-3 p-5 sm:grid-cols-3">
          <div><Label>New limit (optional)</Label><Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={credit.creditLimit} inputMode="decimal" /></div>
          <div><Label>Status</Label><Select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "SUSPENDED")}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></Select></div>
          <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
          <div className="sm:col-span-3"><Button disabled={update.isPending || !reason}>{update.isPending ? "Saving…" : "Save credit settings"}</Button></div>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-line p-5"><h2 className="font-semibold">Record offline repayment</h2><p className="mt-1 text-sm text-ink-soft">Use the bank or UPI reference exactly as shown in the payment record.</p></div>
        <form onSubmit={saveRepayment} className="grid gap-3 p-5 sm:grid-cols-4">
          <div><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required /></div>
          <div><Label>Method</Label><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank transfer</option><option>Cash</option></Select></div>
          <div className="sm:col-span-2"><Label>External reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} required /></div>
          <div className="sm:col-span-4"><Button disabled={repay.isPending || !amount || !reference}>{repay.isPending ? "Recording…" : "Record repayment"}</Button></div>
        </form>
      </Card>
      {message && <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm">{message}</p>}
      <DataTable title="Charges" loading={charges.isLoading} error={charges.error} empty={!charges.data?.charges.length} headers={["Order", "Principal", "Outstanding", "Due", "Status"]} rows={(charges.data?.charges ?? []).map((c) => [c.orderId.slice(0, 8), formatMoney(c.principalAmount), formatMoney(c.outstandingAmount), new Date(c.dueAt).toLocaleDateString("en-IN"), c.status.replaceAll("_", " ")])} />
      <DataTable title="Repayments" loading={repayments.isLoading} error={repayments.error} empty={!repayments.data?.repayments.length} headers={["Date", "Method", "Amount", "Reference", "Status"]} rows={(repayments.data?.repayments ?? []).map((r) => [new Date(r.createdAt).toLocaleDateString("en-IN"), r.method, formatMoney(r.amount), r.externalReference ?? "PhonePe", r.status])} />
      <DataTable title="Credit ledger" loading={ledger.isLoading} error={ledger.error} empty={!ledger.data?.entries.length} headers={["Date", "Entry", "Amount", "Balance after"]} rows={(ledger.data?.entries ?? []).map((e) => [new Date(e.createdAt).toLocaleDateString("en-IN"), e.reason.replaceAll("_", " "), formatMoney(e.amount), formatMoney(e.balanceAfter)])} />
    </div>
  );
}

function CreditApproval({ accountId }: { accountId: string }) {
  const update = useUpdateCredit(accountId);
  const [limit, setLimit] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function approve(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await update.mutateAsync({ creditLimit: limit, status: "ACTIVE", reason });
      setMessage("Credit approved and account created.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not approve credit");
    }
  }

  return <Card className="overflow-hidden"><div className="border-b border-line p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Approval required</p><h2 className="mt-1 text-lg font-semibold">Enable distributor credit</h2><p className="mt-1 text-sm text-ink-soft">This distributor does not have a credit account yet. Set the approved limit to create one with an audit trail.</p></div><form onSubmit={approve} className="grid gap-4 p-5 sm:grid-cols-2"><div><Label>Approved credit limit</Label><Input value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="50000.00" inputMode="decimal" required /></div><div><Label>Approval reason</Label><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Approved after verification" required /></div><div className="sm:col-span-2"><Button disabled={update.isPending || !limit || !reason}>{update.isPending ? "Approving…" : "Approve credit"}</Button></div>{message && <p className="sm:col-span-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm">{message}</p>}</form></Card>;
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "danger" }) {
  const color = tone === "positive" ? "text-emerald-700" : tone === "danger" ? "text-red-700" : "text-ink";
  return <Card className="p-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">{label}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p></Card>;
}

function DataTable({ title, loading, error, empty, headers, rows }: { title: string; loading: boolean; error: unknown; empty: boolean; headers: string[]; rows: string[][] }) {
  return <Card className="overflow-hidden"><div className="border-b border-line p-5"><h2 className="font-semibold">{title}</h2></div>{loading ? <div className="grid place-items-center py-12"><Spinner className="h-5 w-5" /></div> : error ? <div className="p-5 text-sm text-red-700">{error instanceof Error ? error.message : `Could not load ${title.toLowerCase()}`}</div> : empty ? <div className="p-5 text-sm text-ink-soft">No {title.toLowerCase()} yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-canvas text-left text-xs text-ink-soft"><tr>{headers.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody></table></div>}</Card>;
}

