"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Select, Input } from "@/components/ui";

// A statement export, ordered oldest-first (unlike the panel's newest-first list) so it reads
// top-to-bottom as a running balance, the same way a bank statement does. Admin can pull this
// for any distributor — the server only rejects a distributor pulling someone else's.
export function CreditLedgerExport({ accountId }: { accountId: string }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayIso);
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);

  async function exportLedger() {
    if (exporting || from > to || !accountId) return;
    setExporting(true);
    try {
      const blob = await api.download(`/credit/${accountId}/ledger/export?from=${from}&to=${to}&format=${format}`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `credit-ledger-${from}-to-${to}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch { /* mutation errors surface where they're caught below */ }
    finally { setExporting(false); }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">From<Input type="date" className="h-8" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Ledger export from date" /></label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">To<Input type="date" className="h-8" value={to} min={from} max={todayIso} onChange={(e) => setTo(e.target.value)} aria-label="Ledger export to date" /></label>
      <Select className="h-8" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "pdf")} aria-label="Export format"><option value="csv">CSV</option><option value="pdf">PDF</option></Select>
      <Button size="sm" variant="secondary" disabled={exporting || from > to} onClick={() => void exportLedger()}>{exporting ? "Exporting…" : "Export ledger"}</Button>
    </div>
  );
}
