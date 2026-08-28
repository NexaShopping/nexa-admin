"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, Card, EmptyState, ErrorState, Input, Label, Select, Spinner } from "@/components/ui";
import { useRecordPayout, useSettlements } from "./api";

export function SettlementTable() {
  const [status, setStatus] = useState("PAYABLE");
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const query = useSettlements(status || undefined);
  const allQuery = useSettlements();
  const payout = useRecordPayout();
  const payablesFromQuery = query.data?.payables;
  const payables = useMemo(() => payablesFromQuery ?? [], [payablesFromQuery]);
  const selectedDistributor = payables.find((item) => selected.includes(item.id))?.distributorAccountId;
  const groups = useMemo(() => Object.entries(Object.groupBy(payables, (item) => item.distributorAccountId)), [payables]);

  function toggle(id: string, distributorAccountId: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : selectedDistributor && selectedDistributor !== distributorAccountId ? [id] : [...current, id]);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage(null);
    try {
      const result = await payout.mutateAsync({ payableIds: selected, method, externalReference: reference, paidAt: new Date().toISOString() });
      setSelected([]); setReference(""); setMessage(`Payout ${formatMoney(result.payout.amount)} recorded.`);
    } catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not record payout"); }
  }

  const allRows = allQuery.data?.payables ?? [];
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Metric label="Payable now" value={allRows.filter((item) => item.status === "PAYABLE").reduce((sum, item) => sum + Number(item.amount), 0)} /><Metric label="Held" value={allRows.filter((item) => item.status === "HELD").reduce((sum, item) => sum + Number(item.amount), 0)} /><Metric label="Paid this period" value={allRows.filter((item) => item.status === "PAID").reduce((sum, item) => sum + Number(item.amount), 0)} /><Metric label="Distributors" value={new Set(allRows.map((item) => item.distributorAccountId)).size} /></div>
    <div className="flex items-center justify-between gap-3"><Select className="max-w-48" value={status} onChange={(e) => { setStatus(e.target.value); setSelected([]); }}><option value="">All states</option><option value="HELD">Held</option><option value="PAYABLE">Payable</option><option value="PAID">Paid</option></Select><p className="text-sm text-on-surface-variant">{selected.length} selected</p></div>
    {query.isLoading ? <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div> : query.isError ? <ErrorState message={query.error instanceof Error ? query.error.message : "Could not load settlements"} onRetry={query.refetch} /> : payables.length === 0 ? <EmptyState title="No settlements in this state" hint="Paid customer orders appear here automatically." /> : groups.map(([distributorId, items]) => items && <Card key={distributorId} className="overflow-hidden"><div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-5 py-3"><div><p className="font-medium text-on-surface">{items[0]?.distributor.distributorProfile?.businessName ?? items[0]?.distributor.name ?? "Distributor"}</p><p className="text-xs text-on-surface-variant">{items[0]?.distributor.phone}</p></div><span className="text-xs text-on-surface-variant">{items.length} order{items.length === 1 ? "" : "s"}</span></div><div className="divide-y divide-outline-variant">{items.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-surface-container-high"><input type="checkbox" checked={selected.includes(item.id)} disabled={item.status !== "PAYABLE"} onChange={() => toggle(item.id, item.distributorAccountId)} className="accent-[var(--md-primary)]" /><div className="min-w-0 flex-1"><p className="font-medium text-on-surface">{item.order.orderNo}</p><p className="text-xs text-on-surface-variant">{item.status} · {new Date(item.createdAt).toLocaleDateString("en-IN")}</p></div><p className="font-semibold tabular-nums text-on-surface">{formatMoney(item.amount)}</p></label>)}</div></Card>)}
    {selected.length > 0 && <Card className="border-primary/30 p-5"><form onSubmit={submit} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"><div><Label>Method</Label><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank transfer</option></Select></div><div><Label>External reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} required /></div><div className="self-end"><Button disabled={payout.isPending || !reference}>{payout.isPending ? "Recording…" : `Pay ${selected.length} order${selected.length === 1 ? "" : "s"}`}</Button></div></form></Card>}
    {message && <p className="rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">{message}</p>}
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface">{label === "Distributors" ? value : `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</p>
    </div>
  );
}
