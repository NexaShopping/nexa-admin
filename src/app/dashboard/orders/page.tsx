"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOrders, type OrderFilters } from "@/features/orders/api";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, EmptyState, ErrorState, Input, Select, Spinner } from "@/components/ui";
import type { OrderStatus } from "@/lib/types";
import "./orders-modern.css";

const STATUS_TONES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-neutral-100 text-neutral-600",
};

const CHANNEL_LABELS: Record<string, string> = {
  WEB: "Web",
  APP: "App",
  DISTRIBUTOR_ASSISTED: "Distributor-assisted",
};

async function downloadFile(path: string, filename: string) {
  const blob = await api.download(path);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// GST sales register — one row per invoiced order, date-ranged by the invoice's own issuedAt
// (the accounting date), not placedAt. See ADR-0016 / API.md.
function SalesRegisterExport() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayIso);
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);

  async function exportSalesRegister() {
    if (exporting || from > to) return;
    setExporting(true);
    try { await downloadFile(`/orders/export?from=${from}&to=${to}&format=${format}`, `sales-register-${from}-to-${to}.${format}`); }
    catch { /* mutation errors surface where they're caught below */ }
    finally { setExporting(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">From<Input type="date" className="h-8" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Sales register from date" /></label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">To<Input type="date" className="h-8" value={to} min={from} max={todayIso} onChange={(e) => setTo(e.target.value)} aria-label="Sales register to date" /></label>
      <Select className="h-8 self-end" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "pdf")} aria-label="Export format"><option value="csv">CSV</option><option value="pdf">PDF</option></Select>
      <Button size="sm" variant="secondary" className="self-end" disabled={exporting || from > to} onClick={() => void exportSalesRegister()}>{exporting ? "Exporting…" : "Export sales register"}</Button>
    </div>
  );
}

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({ role: "seller" });
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);

  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(filters, cursor);
  const orders = data?.data.orders ?? [];
  const meta = data?.meta;
  const visibleOrders = useMemo(() => orders.filter((order) => order.orderNo.toLowerCase().includes(query.toLowerCase())), [orders, query]);

  function updateFilters(next: Partial<OrderFilters>) {
    setCursors([]);
    setFilters((f) => ({ ...f, ...next }));
  }

  return (
    <div className="admin-orders mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-ink-soft">Sales from the central catalog to distributors.</p>
        </div>
        <SalesRegisterExport />
      </div>

      <div className="admin-orders__metrics"><OrderMetric label="Total orders" value={orders.length} /><OrderMetric label="Pending payment" value={orders.filter((o) => o.status === "AWAITING_PAYMENT").length} /><OrderMetric label="Processing" value={orders.filter((o) => o.status === "CONFIRMED" || o.status === "SHIPPED").length} /><OrderMetric label="Completed" value={orders.filter((o) => o.status === "DELIVERED").length} /></div>

      <div className="admin-orders__toolbar mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input aria-label="Search orders" placeholder="Search order number..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select
          className="sm:w-48"
          value={filters.status ?? ""}
          onChange={(e) => updateFilters({ status: (e.target.value || undefined) as OrderStatus | undefined })}
        >
          <option value="">Any status</option>
          <option value="AWAITING_PAYMENT">Awaiting payment</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid place-items-center py-20 text-ink-soft">
            <Spinner className="h-5 w-5" />
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : "Could not load orders"} onRetry={refetch} />
        ) : visibleOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            hint="Orders placed against your stock will show up here."
          />
          ) : (
          <>
          <div className="admin-orders__desktop-table overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr className="text-left text-xs text-ink-soft">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Channel</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                  {visibleOrders.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-canvas">
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/orders/${o.id}`} className="font-medium text-brand hover:underline">
                        {o.orderNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{CHANNEL_LABELS[o.channel] ?? o.channel}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONES[o.status]}`}>
                        {o.status.toLowerCase().replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(o.grandTotal)}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">{new Date(o.placedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-orders__mobile-list">{visibleOrders.map((o) => <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="admin-orders__mobile-card"><div className="admin-orders__mobile-head"><span>{o.orderNo}</span><span className={`admin-orders__status ${o.status === "DELIVERED" ? "is-success" : o.status === "CANCELLED" ? "is-error" : "is-pending"}`}>{o.status.toLowerCase().replace("_", " ")}</span></div><p>{CHANNEL_LABELS[o.channel] ?? o.channel}</p><div className="admin-orders__mobile-meta"><span>Total <b>{formatMoney(o.grandTotal)}</b></span><span>Placed <b>{new Date(o.placedAt).toLocaleDateString("en-IN")}</b></span></div></Link>)}</div>
          </>
        )}
      </div>

      {(cursors.length > 0 || meta?.hasMore) && orders.length > 0 && (
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
  );
}

function OrderMetric({ label, value }: { label: string; value: number }) { return <div className="admin-orders__metric"><span>{label}</span><strong>{value}</strong></div>; }
