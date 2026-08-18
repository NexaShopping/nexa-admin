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

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-4"><Select className="max-w-48" value={status} onChange={(e) => { setStatus(e.target.value); setSelected([]); }}><option value="">All states</option><option value="HELD">Held</option><option value="PAYABLE">Payable</option><option value="PAID">Paid</option></Select><p className="text-sm text-ink-soft">{selected.length} selected</p></div>
    {query.isLoading ? <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div> : query.isError ? <ErrorState message={query.error instanceof Error ? query.error.message : "Could not load settlements"} onRetry={query.refetch} /> : payables.length === 0 ? <EmptyState title="No settlements in this state" hint="Paid customer orders appear here automatically." /> : groups.map(([distributorId, items]) => items && <Card key={distributorId} className="overflow-hidden"><div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3"><div><p className="font-medium">{items[0]?.distributor.distributorProfile?.businessName ?? items[0]?.distributor.name ?? "Distributor"}</p><p className="text-xs text-ink-soft">{items[0]?.distributor.phone}</p></div><span className="text-xs text-ink-soft">{items.length} order{items.length === 1 ? "" : "s"}</span></div><div className="divide-y divide-line">{items.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-canvas"><input type="checkbox" checked={selected.includes(item.id)} disabled={item.status !== "PAYABLE"} onChange={() => toggle(item.id, item.distributorAccountId)} className="accent-brand" /><div className="min-w-0 flex-1"><p className="font-medium">{item.order.orderNo}</p><p className="text-xs text-ink-soft">{item.status} · {new Date(item.createdAt).toLocaleDateString("en-IN")}</p></div><p className="font-semibold tabular-nums">{formatMoney(item.amount)}</p></label>)}</div></Card>)}
    {selected.length > 0 && <Card className="border-brand/30 p-5"><form onSubmit={submit} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"><div><Label>Method</Label><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Bank transfer</option></Select></div><div><Label>External reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} required /></div><div className="self-end"><Button disabled={payout.isPending || !reference}>{payout.isPending ? "Recording…" : `Pay ${selected.length} order${selected.length === 1 ? "" : "s"}`}</Button></div></form></Card>}
    {message && <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm">{message}</p>}
  </div>;
}
