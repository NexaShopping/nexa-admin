import Link from "next/link";
import { CreditPanel } from "@/features/credit/credit-panel";

export default async function AccountCreditPage({ params }: PageProps<"/dashboard/accounts/[id]/credit">) {
  const { id } = await params;
  return <div className="mx-auto max-w-6xl"><div className="mb-6"><Link href="/dashboard/accounts" className="text-sm text-brand hover:text-brand-strong">← Accounts</Link><h1 className="mt-3 text-2xl font-semibold">Distributor credit</h1><p className="mt-1 text-sm text-ink-soft">Limits, due charges, repayments, and the immutable credit trail.</p></div><CreditPanel accountId={id} /></div>;
}

