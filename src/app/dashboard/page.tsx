"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useProducts } from "@/features/catalog/api";
import { Card } from "@/components/ui";

export default function DashboardPage() {
  const { account } = useAuth();
  const { data } = useProducts({});
  const products = data?.data.products ?? [];
  const active = products.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold">
        Welcome back{account?.name ? `, ${account.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Here&apos;s what&apos;s in the catalog right now.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Products (this page)" value={products.length} />
        <Stat label="Active" value={active} />
        <Stat label="Draft / archived" value={products.length - active} />
      </div>

      <Card className="mt-6 flex flex-col items-start gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Manage the catalog</p>
          <p className="text-sm text-ink-soft">Categories, attributes, products and variants.</p>
        </div>
        <Link
          href="/dashboard/catalog"
          className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Open catalog
        </Link>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{label}</p>
    </Card>
  );
}
