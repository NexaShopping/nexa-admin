"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useCancelOrder, useConfirmOrder, useDeliverOrder, useOrder, useShipOrder } from "@/features/orders/api";
import { useAccount } from "@/features/accounts/api";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, Card, ErrorState, Input, Spinner } from "@/components/ui";
import type { OrderAddress, OrderStatus } from "@/lib/types";

const STATUS_TONES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-neutral-100 text-neutral-600",
};

const CANCELLABLE: OrderStatus[] = ["AWAITING_PAYMENT", "CONFIRMED"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useOrder(id);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-ink-soft">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState message="Could not load this order" onRetry={refetch} />;
  }

  return <OrderDetail order={data.order} />;
}

function OrderDetail({ order }: { order: NonNullable<ReturnType<typeof useOrder>["data"]>["order"] }) {
  const buyer = useAccount(order.buyerAccountId);
  const cancel = useCancelOrder(order.id);
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fulfilError, setFulfilError] = useState<string | null>(null);

  async function doCancel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await cancel.mutateAsync(reason || undefined);
      setShowCancel(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this order");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/orders" className="text-sm text-ink-soft hover:text-ink">
        ← Back to orders
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{order.orderNo}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {buyer.data ? buyer.data.account.name ?? buyer.data.account.phone ?? buyer.data.account.email : "…"}
            {order.channel === "DISTRIBUTOR_ASSISTED" && " · distributor-assisted"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONES[order.status]}`}>
            {order.status.toLowerCase().replace("_", " ")}
          </span>
          <FulfilmentAction order={order} onError={setFulfilError} />
          {CANCELLABLE.includes(order.status) && !showCancel && (
            <Button size="sm" variant="danger" onClick={() => setShowCancel(true)}>
              Cancel order
            </Button>
          )}
        </div>
      </div>

      {fulfilError && <p className="mt-2 text-sm text-red-600">{fulfilError}</p>}

      {showCancel && (
        <Card className="mt-4 p-4">
          <form onSubmit={doCancel} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">Reason (optional)</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Out of stock, customer request, …" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="danger" disabled={cancel.isPending}>
                {cancel.isPending ? "Cancelling…" : "Confirm cancellation"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowCancel(false)}>
                Never mind
              </Button>
            </div>
          </form>
        </Card>
      )}

      {order.status === "CANCELLED" && order.cancelReason && (
        <p className="mt-4 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink-soft">
          Cancelled {order.cancelledAt && new Date(order.cancelledAt).toLocaleString()} — {order.cancelReason}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr className="text-left text-xs text-ink-soft">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 text-right font-medium">Unit price</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Tax</th>
                <th className="px-4 py-2.5 pr-4 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-ink-soft">
                      {item.variantLabel} · <span className="font-mono">{item.sku}</span>
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-ink-soft">{formatMoney(item.taxAmount)}</td>
                  <td className="px-4 py-2.5 pr-4 text-right font-medium">{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-medium">Totals</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label="Subtotal" value={order.subtotal} />
              <Row label="Discount" value={order.discountTotal} negative />
              <Row label="Tax" value={order.taxTotal} />
              <Row label="Shipping" value={order.shippingTotal} />
              <div className="mt-2 border-t border-line pt-2">
                <Row label="Grand total" value={order.grandTotal} bold />
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium">Shipping address</p>
            <AddressBlock address={order.shippingAddress} />
          </Card>
        </div>
      </div>
    </div>
  );
}

// The next fulfilment step, if there is one. Delivering is the transition that moves stock —
// if the buyer is a distributor, this is what makes it appear in their own inventory.
function FulfilmentAction({
  order,
  onError,
}: {
  order: NonNullable<ReturnType<typeof useOrder>["data"]>["order"];
  onError: (message: string | null) => void;
}) {
  const confirm = useConfirmOrder(order.id);
  const ship = useShipOrder(order.id);
  const deliver = useDeliverOrder(order.id);

  async function run(mutation: typeof confirm, message: string) {
    onError(null);
    try {
      await mutation.mutateAsync();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : message);
    }
  }

  if (order.status === "AWAITING_PAYMENT") {
    return (
      <Button size="sm" variant="secondary" disabled={confirm.isPending} onClick={() => run(confirm, "Could not confirm this order")}>
        {confirm.isPending ? "Confirming…" : "Confirm order"}
      </Button>
    );
  }
  if (order.status === "CONFIRMED") {
    return (
      <Button size="sm" variant="secondary" disabled={ship.isPending} onClick={() => run(ship, "Could not mark this shipped")}>
        {ship.isPending ? "Marking shipped…" : "Mark shipped"}
      </Button>
    );
  }
  if (order.status === "SHIPPED") {
    return (
      <Button size="sm" disabled={deliver.isPending} onClick={() => run(deliver, "Could not mark this delivered")}>
        {deliver.isPending ? "Marking delivered…" : "Mark delivered"}
      </Button>
    );
  }
  return null;
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <dt className="text-ink-soft">{label}</dt>
      <dd>{negative && Number(value) > 0 ? "−" : ""}{formatMoney(value)}</dd>
    </div>
  );
}

function AddressBlock({ address }: { address: OrderAddress }) {
  return (
    <div className="mt-2 text-sm text-ink-soft">
      <p className="text-ink">{address.contactName}</p>
      <p>{address.contactPhone}</p>
      <p>
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
      </p>
      <p>
        {address.city}, {address.state} {address.pincode}
      </p>
    </div>
  );
}
