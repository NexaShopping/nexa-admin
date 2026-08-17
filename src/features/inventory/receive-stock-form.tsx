"use client";

import { useState } from "react";
import { useReceiveStock } from "@/features/inventory/api";
import { VariantPicker } from "@/features/inventory/variant-picker";
import { ApiError } from "@/lib/api";
import { Button, Card, Input, Label } from "@/components/ui";

export function ReceiveStockForm({ onDone }: { onDone: () => void }) {
  const receive = useReceiveStock();
  const [variant, setVariant] = useState<{ id: string; sku: string; name: string } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [minimumRetailPrice, setMinimumRetailPrice] = useState("");
  const [customerPrice, setCustomerPrice] = useState("");
  const [taxRatePct, setTaxRatePct] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!variant) {
      setError("Pick a variant first");
      return;
    }
    try {
      await receive.mutateAsync({
        variantId: variant.id,
        quantity: Number(quantity),
        sellPrice,
        discountPrice: discountPrice || undefined,
        minimumRetailPrice,
        customerPrice,
        taxRatePct: taxRatePct || undefined,
        unitCost: unitCost || undefined,
        batchNo: batchNo || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not receive stock");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-medium">Receive stock</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Variant</Label>
          <VariantPicker onSelect={setVariant} selectedLabel={variant?.name ?? null} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <Label>Quantity</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" required />
          </div>
          <div>
            <Label>Distributor wholesale price (₹)</Label>
            <Input value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="22.00" required />
          </div>
          <div>
            <Label>Minimum customer price (₹)</Label>
            <Input value={minimumRetailPrice} onChange={(e) => setMinimumRetailPrice(e.target.value)} placeholder="25.00" required />
          </div>
          <div>
            <Label>Default customer price (₹)</Label>
            <Input value={customerPrice} onChange={(e) => setCustomerPrice(e.target.value)} placeholder="28.00" required />
          </div>
          <div>
            <Label>Unit cost (optional)</Label>
            <Input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="15.00" />
          </div>
          <div>
            <Label>Discount price (optional)</Label>
            <Input value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} />
          </div>
          <div>
            <Label>Tax rate % (optional)</Label>
            <Input value={taxRatePct} onChange={(e) => setTaxRatePct(e.target.value)} placeholder="18.00" />
          </div>
          <div>
            <Label>Batch no. (optional)</Label>
            <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={receive.isPending || !variant || !quantity || !sellPrice || !minimumRetailPrice || !customerPrice}
          >
            {receive.isPending ? "Receiving…" : "Receive stock"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
