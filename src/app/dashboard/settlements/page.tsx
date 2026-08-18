import { SettlementTable } from "@/features/settlements/settlement-table";

export default function SettlementsPage() {
  return <div className="mx-auto max-w-6xl"><div className="mb-6"><p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">Money owed to distributors</p><h1 className="mt-2 text-2xl font-semibold">Settlements</h1><p className="mt-1 max-w-2xl text-sm text-ink-soft">PhonePe-paid customer orders wait here until delivery. Record the bank or UPI payout only after they become payable.</p></div><SettlementTable /></div>;
}

