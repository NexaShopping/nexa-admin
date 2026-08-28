"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProducts } from "@/features/catalog/api";
import { useInventory } from "@/features/inventory/api";
import { useOrders } from "@/features/orders/api";
import { useSettlements } from "@/features/settlements/api";

interface MetricTileProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "warn" | "ok";
}

function MetricTile({ label, value, detail, tone = "default" }: Readonly<MetricTileProps>) {
  const detailTone = tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-on-surface-variant";
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-on-surface">{value}</p>
      {detail && <p className={`mt-1 text-xs font-medium ${detailTone}`}>{detail}</p>}
    </div>
  );
}

interface QuickActionProps {
  href: string;
  label: string;
  icon: ReactNode;
}

function QuickAction({ href, label, icon }: Readonly<QuickActionProps>) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-5 text-center transition-colors hover:bg-surface-container-low"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-container text-on-primary-container">{icon}</span>
      <span className="text-sm font-medium text-on-surface">{label}</span>
    </Link>
  );
}

interface OperationalAlertProps {
  title: string;
  detail: string;
  actionHref: string;
  actionLabel: string;
}

function OperationalAlert({ title, detail, actionHref, actionLabel }: Readonly<OperationalAlertProps>) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-high px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant">{detail}</p>
      </div>
      <Link href={actionHref} className="shrink-0 text-sm font-semibold text-primary hover:underline">
        {actionLabel}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { account } = useAuth();
  const { data: productsData } = useProducts({});
  const { data: inventoryData } = useInventory({ lowStock: true });
  const { data: ordersData } = useOrders({ role: "seller" });
  const { data: settlementsData } = useSettlements("PAYABLE");

  const products = productsData?.data.products ?? [];
  const activeProducts = products.filter((p) => p.status === "ACTIVE").length;
  const catalogHealth = products.length ? Math.round((activeProducts / products.length) * 100) : 0;

  const lowStockItems = inventoryData?.data.items ?? [];
  const openOrders = ordersData?.data.orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED") ?? [];
  const payablesPending = settlementsData?.payables ?? [];

  const firstName = account?.name?.trim().split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> All services operational
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile label="Products in catalog" value={String(products.length)} />
        <MetricTile label="Active products" value={String(activeProducts)} detail={`${catalogHealth}% of catalog`} tone="ok" />
        <MetricTile
          label="Low stock items"
          value={String(lowStockItems.length)}
          detail={lowStockItems.length > 0 ? "Needs restock" : "All healthy"}
          tone={lowStockItems.length > 0 ? "warn" : "ok"}
        />
        <MetricTile label="Open orders" value={String(openOrders.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-on-surface">Catalog health</h2>
            <span className="text-sm font-medium text-on-surface-variant">{catalogHealth}% active</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${catalogHealth}%` }} />
          </div>
          <p className="text-sm text-on-surface-variant">
            {activeProducts} active · {products.length - activeProducts} draft or archived
          </p>

          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Operational alerts</p>
            {lowStockItems.length === 0 && openOrders.length === 0 && payablesPending.length === 0 && (
              <p className="text-sm text-on-surface-variant">No alerts — everything is on track.</p>
            )}
            {lowStockItems.length > 0 && (
              <OperationalAlert
                title="Low stock detected"
                detail={`${lowStockItems.length} item${lowStockItems.length === 1 ? "" : "s"} at or below the low-stock threshold.`}
                actionHref="/dashboard/inventory"
                actionLabel="Review"
              />
            )}
            {payablesPending.length > 0 && (
              <OperationalAlert
                title="Pending settlements"
                detail={`${payablesPending.length} distributor payable${payablesPending.length === 1 ? " is" : "s are"} ready to process.`}
                actionHref="/dashboard/settlements"
                actionLabel="Process"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="font-display text-lg font-bold text-on-surface">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/dashboard/catalog/new" label="Add product" icon={<PlusIcon />} />
            <QuickAction href="/dashboard/catalog/categories" label="Categories" icon={<TagIcon />} />
            <QuickAction href="/dashboard/inventory" label="Inventory" icon={<StackIcon />} />
            <QuickAction href="/dashboard/orders" label="Orders" icon={<OrdersIcon />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path
        d="M12.6 3.5H5a1.5 1.5 0 0 0-1.5 1.5v7.6c0 .4.16.78.44 1.06l9.4 9.4c.58.58 1.53.58 2.12 0l7.1-7.1c.58-.58.58-1.53 0-2.12l-9.4-9.4a1.5 1.5 0 0 0-1.06-.44Z"
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="8.25" r="1.25" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z M3.5 12 12 16.5 20.5 12 M3.5 16 12 20.5 20.5 16" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 3.5h9l3.5 3.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" strokeLinejoin="round" />
      <path d="M15 3.5V7h3.5M8 11.5h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}
