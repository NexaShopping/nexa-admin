"use client";

import { useState } from "react";
import { useAdjustStock, useLedger, useTransferStock, useUpdateStockItem } from "@/features/inventory/api";
import { ApiError } from "@/lib/api";
import { Button, Card, Input, Label, Select, Spinner } from "@/components/ui";
import type { AdjustStockBody, StockItemView } from "@/lib/types";

export function StockItemDetail({
  item,
  isAdmin,
  onClose,
}: {
  item: StockItemView;
  isAdmin: boolean;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{item.variant.product.brand}</p>
          <p className="font-medium">{item.variant.product.name} — {item.variant.name}</p>
          <p className="font-mono text-xs text-ink-soft">{item.variant.sku}</p>
        </div>
        <button onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
          Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="On hand" value={item.onHand} />
        <Stat label="Reserved" value={item.reserved} />
        <Stat label="Available" value={item.available} accent />
      </div>

      <PricingForm item={item} />
      <AdjustForm item={item} />
      {isAdmin && <TransferForm item={item} />}
      <LedgerPanel itemId={item.id} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-3">
      <p className={`text-lg font-semibold tabular-nums ${accent ? "text-brand" : ""}`}>{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </Card>
  );
}

function PricingForm({ item }: { item: StockItemView }) {
  const update = useUpdateStockItem(item.id);
  const [sellPrice, setSellPrice] = useState(item.sellPrice);
  const [discountPrice, setDiscountPrice] = useState(item.discountPrice ?? "");
  const [lowStockAt, setLowStockAt] = useState(item.lowStockAt?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        sellPrice,
        discountPrice: discountPrice || undefined,
        lowStockAt: lowStockAt ? Number(lowStockAt) : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function toggleListed() {
    try {
      await update.mutateAsync({ isListed: !item.isListed });
    } catch {
      /* surfaced via the toggle not changing */
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Pricing & listing</p>
        <button
          type="button"
          onClick={toggleListed}
          disabled={update.isPending}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.isListed ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {item.isListed ? "Listed" : "Unlisted"}
        </button>
      </div>
      <form onSubmit={save} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <Label>Sell price (₹)</Label>
          <Input value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
        </div>
        <div>
          <Label>Discount price</Label>
          <Input value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} />
        </div>
        <div>
          <Label>Low-stock alert at</Label>
          <Input value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value)} inputMode="numeric" />
        </div>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full">
          <Button type="submit" size="sm" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save pricing"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AdjustForm({ item }: { item: StockItemView }) {
  const adjust = useAdjustStock(item.id);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<AdjustStockBody["reason"]>("ADJUSTMENT");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adjust.mutateAsync({ delta: Number(delta), reason, note: note || undefined });
      setDelta("");
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not adjust stock");
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-medium">Manual adjustment</p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label>Delta (+/-)</Label>
          <Input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="-5" required />
        </div>
        <div>
          <Label>Reason</Label>
          <Select value={reason} onChange={(e) => setReason(e.target.value as AdjustStockBody["reason"])}>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="DAMAGE">Damage</option>
            <option value="RETURN_IN">Return in</option>
          </Select>
        </div>
        <div className="col-span-2 sm:col-span-2">
          <Label>Note{reason === "ADJUSTMENT" && " (required)"}</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full">
          <Button type="submit" size="sm" variant="secondary" disabled={adjust.isPending || !delta}>
            {adjust.isPending ? "Applying…" : "Apply adjustment"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TransferForm({ item }: { item: StockItemView }) {
  const transfer = useTransferStock();
  const [toAccountId, setToAccountId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    try {
      await transfer.mutateAsync({
        variantId: item.variant.id,
        toAccountId,
        quantity: Number(quantity),
        sellPrice: sellPrice || undefined,
      });
      setQuantity("");
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not transfer stock");
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-medium">Transfer to distributor</p>
      <p className="text-xs text-ink-soft">
        Distributor accounts don&apos;t have a picker yet — paste the account ID until the
        accounts module ships.
      </p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2">
          <Label>Distributor account ID</Label>
          <Input value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} placeholder="uuid" required />
        </div>
        <div>
          <Label>Quantity</Label>
          <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" required />
        </div>
        <div className="col-span-full sm:col-span-1">
          <Label>Sell price for them (optional)</Label>
          <Input value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder={`defaults to MRP (${item.variant.mrp})`} />
        </div>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        {done && <p className="col-span-full text-sm text-emerald-700">Transferred.</p>}
        <div className="col-span-full">
          <Button type="submit" size="sm" variant="secondary" disabled={transfer.isPending || !toAccountId || !quantity}>
            {transfer.isPending ? "Transferring…" : "Transfer"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LedgerPanel({ itemId }: { itemId: string }) {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const { data, isLoading } = useLedger(itemId, cursor);
  const entries = data?.data.entries ?? [];
  const meta = data?.meta;

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">Ledger</p>
      {isLoading ? (
        <Spinner className="mt-3 h-4 w-4 text-ink-soft" />
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No movements yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-soft">
                <th className="pb-2 font-medium">When</th>
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 font-medium text-right">Delta</th>
                <th className="pb-2 pr-0 text-right font-medium">On hand after</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 text-xs text-ink-soft">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="py-2 capitalize">{e.reason.toLowerCase().replace("_", " ")}</td>
                  <td className={`py-2 text-right font-medium ${e.delta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </td>
                  <td className="py-2 text-right">{e.onHandAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(cursors.length > 0 || meta?.hasMore) && entries.length > 0 && (
        <div className="mt-3 flex justify-center gap-2">
          {cursors.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setCursors((c) => c.slice(0, -1))}>
              Previous
            </Button>
          )}
          {meta?.hasMore && meta.cursor && (
            <Button size="sm" variant="ghost" onClick={() => setCursors((c) => [...c, meta.cursor!])}>
              Older
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
