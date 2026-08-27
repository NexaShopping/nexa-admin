"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Select, Input } from "@/components/ui";
import { SettlementTable } from "@/features/settlements/settlement-table";
import "./settlements-modern.css";

async function downloadFile(path: string, filename: string) {
  const blob = await api.download(path);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Every distributor's payables, date-ranged on createdAt — admin sees all of them (a
// distributor calling the same endpoint only ever sees their own). See API.md.
function SettlementsExport() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayIso);
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);

  async function exportSettlements() {
    if (exporting || from > to) return;
    setExporting(true);
    try { await downloadFile(`/settlements/export?from=${from}&to=${to}&format=${format}`, `settlements-${from}-to-${to}.${format}`); }
    catch { /* mutation errors surface where they're caught below */ }
    finally { setExporting(false); }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">From<Input type="date" className="h-8" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Settlements export from date" /></label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">To<Input type="date" className="h-8" value={to} min={from} max={todayIso} onChange={(e) => setTo(e.target.value)} aria-label="Settlements export to date" /></label>
      <Select className="h-8" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "pdf")} aria-label="Export format"><option value="csv">CSV</option><option value="pdf">PDF</option></Select>
      <Button size="sm" variant="secondary" disabled={exporting || from > to} onClick={() => void exportSettlements()}>{exporting ? "Exporting…" : "Export"}</Button>
    </div>
  );
}

export default function SettlementsPage() {
  return (
    <div className="admin-settlements mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">Money owed to distributors</p>
          <h1 className="mt-2 text-2xl font-semibold">Settlements</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">PhonePe-paid customer orders wait here until delivery. Record the bank or UPI payout only after they become payable.</p>
        </div>
        <SettlementsExport />
      </div>
      <SettlementTable />
    </div>
  );
}
