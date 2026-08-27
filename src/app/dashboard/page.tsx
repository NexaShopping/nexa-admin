"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useProducts } from "@/features/catalog/api";
import { Card } from "@/components/ui";
import "./dashboard-modern.css";

export default function DashboardPage() {
  const { account } = useAuth();
  const { data } = useProducts({});
  const products = data?.data.products ?? [];
  const active = products.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="admin-dashboard mx-auto w-full max-w-7xl">
      <div className="admin-dashboard__heading">
        <div>
          <p className="admin-dashboard__eyebrow">NEXA ADMIN · OPERATIONS</p>
          <h1>Welcome back{account?.name ? `, ${account.name.split(" ")[0]}` : ""}</h1>
          <p>Keep your catalog, inventory, and distributor operations moving.</p>
        </div>
        <span className="admin-dashboard__status"><i /> Systems operational</span>
      </div>

      <div className="admin-dashboard__metrics">
        <Stat label="Products in catalog" value={products.length} tone="orange" />
        <Stat label="Active products" value={active} tone="green" />
        <Stat label="Draft / archived" value={products.length - active} tone="sand" />
      </div>

      <div className="admin-dashboard__grid">
      <Card className="admin-dashboard__hero">
        <div>
          <p className="admin-dashboard__eyebrow">CATALOG CONTROL CENTER</p>
          <h2>Everything your team needs to keep supply moving.</h2>
          <p>Manage categories, product details, pricing, and variants from one focused workspace.</p>
        </div>
        <Link href="/dashboard/catalog" className="admin-dashboard__primary">Open catalog <span>↗</span></Link>
      </Card>
      <Card className="admin-dashboard__actions">
        <div className="admin-dashboard__section-title"><h2>Quick actions</h2><span>→</span></div>
        <Action href="/dashboard/catalog/new" label="Add product" detail="Create a new catalog item" icon="＋" />
        <Action href="/dashboard/catalog/categories" label="Manage categories" detail="Organize your assortment" icon="⌁" />
        <Action href="/dashboard/inventory" label="Review inventory" detail="Check stock health" icon="▦" />
      </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className={`admin-dashboard__metric admin-dashboard__metric--${tone}`}>
      <span className="admin-dashboard__metric-dot" />
      <p>{label}</p>
      <strong>{value}</strong>
    </Card>
  );
}

function Action({ href, label, detail, icon }: { href: string; label: string; detail: string; icon: string }) {
  return <Link href={href} className="admin-dashboard__action"><span className="admin-dashboard__action-icon">{icon}</span><span><b>{label}</b><small>{detail}</small></span><em>↗</em></Link>;
}
