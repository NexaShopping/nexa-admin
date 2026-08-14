"use client";

import Link from "next/link";
import { useState } from "react";
import { useOrders, type OrderFilters } from "@/features/orders/api";
import { formatMoney } from "@/lib/money";
import { Button, EmptyState, ErrorState, Select, Spinner } from "@/components/ui";
import type { OrderStatus } from "@/lib/types";

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

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({ role: "seller" });
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);

  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(filters, cursor);
  const orders = data?.data.orders ?? [];
  const meta = data?.meta;

  function updateFilters(next: Partial<OrderFilters>) {
    setCursors([]);
    setFilters((f) => ({ ...f, ...next }));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-ink-soft">Sales from the central catalog to distributors.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            hint="Orders placed against your stock will show up here."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
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
                {orders.map((o) => (
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
