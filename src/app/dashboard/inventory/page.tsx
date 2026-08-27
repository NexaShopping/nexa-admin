"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useInventory, type InventoryFilters } from "@/features/inventory/api";
import { ReceiveStockForm } from "@/features/inventory/receive-stock-form";
import { StockItemDetail } from "@/features/inventory/stock-item-detail";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, EmptyState, ErrorState, Input, Select, Spinner } from "@/components/ui";
import "./inventory-modern.css";

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
        <label className="flex flex-col gap-1 text-xs text-ink-soft">From<Input type="date" className="h-8" value={ledgerFrom} max={ledgerTo} onChange={(e) => setLedgerFrom(e.target.value)} aria-label="Ledger export from date" /></label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">To<Input type="date" className="h-8" value={ledgerTo} min={ledgerFrom} max={todayIso} onChange={(e) => setLedgerTo(e.target.value)} aria-label="Ledger export to date" /></label>
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
    <div className="admin-inventory mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-inventory__eyebrow">CATALOG OPERATIONS</p>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Your own stock — {isAdmin ? "the central catalog's stock." : "what you bought from admin."}
          </p>
        </div>
        <Button onClick={() => setShowReceive((s) => !s)}>{showReceive ? "Close" : "Receive stock"}</Button>
      </div>

      <div className="mt-4">
        <InventoryExports />
      </div>

      <div className="admin-inventory__metrics">
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
          <p className="mt-1 text-[11px] leading-4 text-ink-soft">Controls whether this stock appears in the storefront.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={filters.lowStock ?? false}
            onChange={(e) => updateFilters({ lowStock: e.target.checked || undefined })}
            className="h-4 w-4 rounded border-line accent-[var(--brand)]"
          />
          Low stock only
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {isLoading ? (
            <div className="grid place-items-center py-20 text-ink-soft">
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
            <div className="admin-inventory__desktop-table overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-canvas">
                  <tr className="text-left text-xs text-ink-soft">
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-4 py-2.5 font-medium">SKU</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium">Available</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reserved</th>
                    <th className="px-4 py-2.5 text-right font-medium">Sell price</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {items.map((item) => {
                    const lowStock = item.lowStockAt !== null && item.available <= item.lowStockAt;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer transition-colors hover:bg-canvas ${
                          selectedId === item.id ? "bg-brand/5" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{item.variant.product.name}</p>
                          <p className="text-xs text-ink-soft">{item.variant.name}</p>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{item.variant.sku}</td>
                        <td className="px-4 py-2.5 text-xs text-ink-soft">—</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${lowStock ? "font-medium text-amber-700" : ""}`}>
                          {item.available}
                          {lowStock && " ⚠"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{item.reserved}</td>
                        <td className="px-4 py-2.5 text-right">{formatMoney(item.sellPrice)}</td>
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
            <div className="admin-inventory__mobile-list">{items.map((item) => { const lowStock = item.lowStockAt !== null && item.available <= item.lowStockAt; return <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`admin-inventory__mobile-item ${selectedId === item.id ? "is-selected" : ""}`}><div className="admin-inventory__mobile-item-head"><span>{item.variant.product.name}</span><span className={`admin-inventory__stock-pill ${item.isListed ? "is-listed" : ""}`}>{item.isListed ? "Listed" : "Unlisted"}</span></div><p>{item.variant.name} · {item.variant.sku}</p><div className="admin-inventory__mobile-meta"><span>Available <b className={lowStock ? "is-low" : ""}>{item.available}</b></span><span>Reserved <b>{item.reserved}</b></span><span>Sell price <b>{formatMoney(item.sellPrice)}</b></span></div></button>; })}</div>
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
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
              Select a row to see pricing, adjustments, and its ledger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`admin-inventory__metric admin-inventory__metric--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}
