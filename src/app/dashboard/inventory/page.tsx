"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useInventory, type InventoryFilters } from "@/features/inventory/api";
import { ReceiveStockForm } from "@/features/inventory/receive-stock-form";
import { StockItemDetail } from "@/features/inventory/stock-item-detail";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, EmptyState, ErrorState, Input, Select, Spinner } from "@/components/ui";

async function downloadFile(path: string, filename: string) {
  const blob = await api.download(path);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function InventoryExports() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [stockFormat, setStockFormat] = useState<"csv" | "pdf">("csv");
  const [exportingStock, setExportingStock] = useState(false);
  const [ledgerFrom, setLedgerFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [ledgerTo, setLedgerTo] = useState(todayIso);
  const [ledgerFormat, setLedgerFormat] = useState<"csv" | "pdf">("csv");
  const [exportingLedger, setExportingLedger] = useState(false);

  async function exportStockSnapshot() {
    if (exportingStock) return;
    setExportingStock(true);
    try { await downloadFile(`/inventory/export?format=${stockFormat}`, `inventory-snapshot-${todayIso}.${stockFormat}`); }
    catch { /* mutation errors surface where they're caught below */ }
    finally { setExportingStock(false); }
  }

  async function exportStockLedger() {
    if (exportingLedger || ledgerFrom > ledgerTo) return;
    setExportingLedger(true);
    try { await downloadFile(`/inventory/ledger/export?from=${ledgerFrom}&to=${ledgerTo}&format=${ledgerFormat}`, `inventory-ledger-${ledgerFrom}-to-${ledgerTo}.${ledgerFormat}`); }
    catch { /* mutation errors surface where they're caught below */ }
    finally { setExportingLedger(false); }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex items-end gap-2">
        <Select className="h-8" value={stockFormat} onChange={(e) => setStockFormat(e.target.value as "csv" | "pdf")} aria-label="Snapshot export format"><option value="csv">CSV</option><option value="pdf">PDF</option></Select>
        <Button size="sm" variant="secondary" disabled={exportingStock} onClick={() => void exportStockSnapshot()}>{exportingStock ? "Exporting…" : "Export snapshot"}</Button>
      </div>
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-on-surface-variant">From<Input type="date" className="h-8" value={ledgerFrom} max={ledgerTo} onChange={(e) => setLedgerFrom(e.target.value)} aria-label="Ledger export from date" /></label>
        <label className="flex flex-col gap-1 text-xs text-on-surface-variant">To<Input type="date" className="h-8" value={ledgerTo} min={ledgerFrom} max={todayIso} onChange={(e) => setLedgerTo(e.target.value)} aria-label="Ledger export to date" /></label>
        <Select className="h-8" value={ledgerFormat} onChange={(e) => setLedgerFormat(e.target.value as "csv" | "pdf")} aria-label="Ledger export format"><option value="csv">CSV</option><option value="pdf">PDF</option></Select>
        <Button size="sm" variant="secondary" disabled={exportingLedger || ledgerFrom > ledgerTo} onClick={() => void exportStockLedger()}>{exportingLedger ? "Exporting…" : "Export ledger"}</Button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { account } = useAuth();
  const isAdmin = account?.role === "ADMIN";

  const [filters, setFilters] = useState<InventoryFilters>({});
  const [qInput, setQInput] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReceive, setShowReceive] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useInventory(filters, cursor);
  const items = data?.data.items ?? [];
  const meta = data?.meta;
  const selected = items.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCursors([]);
      setFilters((current) => ({ ...current, q: qInput.trim() || undefined }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [qInput]);

  function updateFilters(next: Partial<InventoryFilters>) {
    setCursors([]);
    setFilters((f) => ({ ...f, ...next }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ q: qInput.trim() || undefined });
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Catalog operations</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-on-surface">Inventory</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Your own stock — {isAdmin ? "the central catalog's stock." : "what you bought from admin."}
          </p>
        </div>
        <Button onClick={() => setShowReceive((s) => !s)}>{showReceive ? "Close" : "Receive stock"}</Button>
      </div>

      <div className="mt-4">
        <InventoryExports />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Total SKUs" value={items.length} tone="neutral" />
        <Metric label="Healthy" value={items.filter((item) => item.lowStockAt === null || item.available > item.lowStockAt).length} tone="green" />
        <Metric label="Low stock" value={items.filter((item) => item.lowStockAt !== null && item.available <= item.lowStockAt && item.available > 0).length} tone="orange" />
        <Metric label="Out of stock" value={items.filter((item) => item.available <= 0).length} tone="red" />
      </div>

      {showReceive && (
        <div className="mt-5">
          <ReceiveStockForm onDone={() => setShowReceive(false)} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={search} className="flex-1 sm:max-w-xs">
          <Input placeholder="Search SKU / product…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </form>
        <div className="sm:w-48">
          <Select
          className="sm:w-40"
          value={filters.isListed === undefined ? "" : String(filters.isListed)}
          onChange={(e) => updateFilters({ isListed: e.target.value === "" ? undefined : e.target.value === "true" })}
          >
            <option value="">Any storefront visibility</option>
            <option value="true">Visible to buyers</option>
            <option value="false">Hidden from buyers</option>
          </Select>
          <p className="mt-1 text-[11px] leading-4 text-on-surface-variant">Controls whether this stock appears in the storefront.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={filters.lowStock ?? false}
            onChange={(e) => updateFilters({ lowStock: e.target.checked || undefined })}
            className="h-4 w-4 rounded border-outline-variant accent-[var(--md-primary)]"
          />
          Low stock only
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {isLoading ? (
            <div className="grid place-items-center py-20 text-on-surface-variant">
              <Spinner className="h-5 w-5" />
            </div>
          ) : isError ? (
            <ErrorState message={error instanceof Error ? error.message : "Could not load inventory"} onRetry={refetch} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No stock yet"
              hint="Receive your first batch of stock to get started."
              action={<Button size="sm" onClick={() => setShowReceive(true)}>Receive stock</Button>}
            />
          ) : (
            <>
            <div className="hidden overflow-x-auto rounded-xl border border-outline-variant sm:block">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-high">
                  <tr className="text-left text-xs text-on-surface-variant">
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-4 py-2.5 font-medium">SKU</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium">Available</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reserved</th>
                    <th className="px-4 py-2.5 text-right font-medium">Sell price</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                  {items.map((item) => {
                    const lowStock = item.lowStockAt !== null && item.available <= item.lowStockAt;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer transition-colors hover:bg-surface-container-high ${
                          selectedId === item.id ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-on-surface">{item.variant.product.name}</p>
                          <p className="text-xs text-on-surface-variant">{item.variant.name}</p>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-on-surface-variant">{item.variant.sku}</td>
                        <td className="px-4 py-2.5 text-xs text-on-surface-variant">—</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${lowStock ? "font-medium text-amber-700" : "text-on-surface"}`}>
                          {item.available}
                          {lowStock && " ⚠"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-on-surface-variant">{item.reserved}</td>
                        <td className="px-4 py-2.5 text-right text-on-surface">{formatMoney(item.sellPrice)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.isListed ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {item.isListed ? "Listed" : "Unlisted"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 sm:hidden">{items.map((item) => { const lowStock = item.lowStockAt !== null && item.available <= item.lowStockAt; return <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-3 text-left ${selectedId === item.id ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-lowest"}`}><div className="flex items-center justify-between gap-2"><span className="min-w-0 flex-1 truncate font-medium text-on-surface">{item.variant.product.name}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.isListed ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>{item.isListed ? "Listed" : "Unlisted"}</span></div><p className="mt-0.5 text-xs text-on-surface-variant">{item.variant.name} · {item.variant.sku}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant"><span>Available <b className={lowStock ? "text-amber-700" : "text-on-surface"}>{item.available}</b></span><span>Reserved <b className="text-on-surface">{item.reserved}</b></span><span>Sell price <b className="text-on-surface">{formatMoney(item.sellPrice)}</b></span></div></button>; })}</div>
            </>
          )}

          {(cursors.length > 0 || meta?.hasMore) && items.length > 0 && (
            <div className="mt-4 flex justify-center gap-3">
              {cursors.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setCursors((c) => c.slice(0, -1))}>
                  Previous
                </Button>
              )}
              {meta?.hasMore && meta.cursor && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isFetching}
                  onClick={() => setCursors((c) => [...c, meta.cursor!])}
                >
                  {isFetching ? "Loading…" : "Next"}
                </Button>
              )}
            </div>
          )}
        </div>

        <div>
          {selected ? (
            <StockItemDetail item={selected} isAdmin={isAdmin} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
              Select a row to see pricing, adjustments, and its ledger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const metricTones: Record<string, string> = {
  neutral: "text-on-surface",
  green: "text-emerald-600",
  orange: "text-amber-600",
  red: "text-red-600",
};

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${metricTones[tone] ?? "text-on-surface"}`}>{value}</p>
    </div>
  );
}
