"use client";

import { useEffect, useState } from "react";
import { useProducts } from "@/features/catalog/api";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { ProductDetail } from "@/lib/types";
import { Input } from "@/components/ui";

// Search a product, then pick one of its variants — used by both "receive stock" and
// "transfer stock" forms, which both need a variantId but only a human-searchable name.
export function VariantPicker({
  onSelect,
  selectedLabel,
}: {
  onSelect: (variant: { id: string; sku: string; name: string; mrp: string }) => void;
  selectedLabel: string | null;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const results = useProducts({ q: q || undefined });
  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.get<{ product: ProductDetail }>(`/products/${productId}`),
    enabled: Boolean(productId),
  });
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  return (
    <div>
      <Input
        placeholder="Search products by name…"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setProductId(null);
        }}
      />
      {selectedLabel && (
        <p className="mt-1.5 text-xs text-brand">
          Selected: <span className="font-medium">{selectedLabel}</span>
        </p>
      )}

      {q && !productId && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-line">
          {results.isFetching ? <p className="p-3 text-sm text-ink-soft">Searching products and SKUs…</p> : (results.data?.data.products ?? []).length === 0 ? (
            <p className="p-3 text-sm text-ink-soft">No products match.</p>
          ) : (
            results.data?.data.products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
              >
                <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="block truncate text-xs text-ink-soft">{p.brand} · {p.category.name}</span></span>
                <span className="shrink-0 text-xs text-ink-soft">{p.variantCount} variant{p.variantCount === 1 ? "" : "s"}</span>
              </button>
            ))
          )}
        </div>
      )}

      {productId && product.data && (
        <div className="mt-2 rounded-md border border-line">
          {product.data.product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onSelect({ id: v.id, sku: v.sku, mrp: v.mrp, name: `${product.data!.product.name} — ${v.name}` });
                setSearchInput("");
                setQ("");
                setProductId(null);
              }}
              className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-canvas"
            >
              <span className="min-w-0"><span className="block truncate font-medium">{v.name}</span><span className="font-mono text-xs text-ink-soft">{v.sku}</span></span>
              <span className="shrink-0 text-xs font-semibold text-brand">MRP ₹{v.mrp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
