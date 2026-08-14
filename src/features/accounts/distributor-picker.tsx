"use client";

import { useState } from "react";
import { useAccounts } from "@/features/accounts/api";
import { Input } from "@/components/ui";

// Search-and-pick a distributor account — used wherever a flow needs a distributor's account
// id but only has a human-searchable name/phone (e.g. inventory transfer).
export function DistributorPicker({
  onSelect,
  selectedLabel,
}: {
  onSelect: (account: { id: string; name: string | null; phone: string | null }) => void;
  selectedLabel: string | null;
}) {
  const [q, setQ] = useState("");
  const results = useAccounts({ role: "DISTRIBUTOR", q: q || undefined });

  return (
    <div>
      <Input placeholder="Search distributors by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      {selectedLabel && (
        <p className="mt-1.5 text-xs text-brand">
          Selected: <span className="font-medium">{selectedLabel}</span>
        </p>
      )}
      {q && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-line">
          {(results.data?.data.accounts ?? []).length === 0 ? (
            <p className="p-3 text-sm text-ink-soft">No distributors match.</p>
          ) : (
            results.data?.data.accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onSelect(a);
                  setQ("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
              >
                <span>
                  {a.name ?? "—"}
                  {a.distributor && <span className="text-ink-soft"> · {a.distributor.businessName}</span>}
                </span>
                <span className="text-xs text-ink-soft">{a.phone}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
