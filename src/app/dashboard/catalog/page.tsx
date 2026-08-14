"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCategories, useProducts, type ProductFilters } from "@/features/catalog/api";
import { formatMoney } from "@/lib/money";
import { Button, Card, EmptyState, ErrorState, Input, Select, Spinner, StatusBadge } from "@/components/ui";
import type { ProductStatus } from "@/lib/types";

export default function CatalogPage() {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [qInput, setQInput] = useState("");
  const [cursors, setCursors] = useState<string[]>([]); // stack of previous cursors, for "back"
  const cursor = cursors.at(-1);

  const categories = useCategories();
  const { data, isLoading, isFetching, isError, error, refetch } = useProducts(filters, cursor);
  const products = data?.data.products ?? [];
  const meta = data?.meta;

  function updateFilters(next: Partial<ProductFilters>) {
    setCursors([]);
    setFilters((f) => ({ ...f, ...next }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ q: qInput || undefined });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Catalog</h1>
          <p className="mt-1 text-sm text-ink-soft">Products and variants across the central catalog.</p>
        </div>
        <Link href="/dashboard/catalog/new">
          <Button>
            <PlusIcon className="h-4 w-4" /> New product
          </Button>
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={search} className="flex-1 sm:max-w-xs">
          <Input
            placeholder="Search products…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </form>
        <Select
          className="sm:w-48"
          value={filters.categoryId ?? ""}
          onChange={(e) => updateFilters({ categoryId: e.target.value || undefined })}
        >
          <option value="">All categories</option>
          {(categories.data?.categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          className="sm:w-40"
          value={filters.status ?? ""}
          onChange={(e) => updateFilters({ status: (e.target.value || undefined) as ProductStatus | undefined })}
        >
          <option value="">Any status</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid place-items-center py-20 text-ink-soft">
            <Spinner className="h-5 w-5" />
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : "Could not load products"} onRetry={refetch} />
        ) : products.length === 0 ? (
          <EmptyState
            title={filters.q || filters.categoryId || filters.status ? "No products match these filters" : "No products yet"}
            hint="Create your first product to start building the catalog."
            action={
              <Link href="/dashboard/catalog/new">
                <Button size="sm">New product</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link key={p.id} href={`/dashboard/catalog/${p.id}`}>
                <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
                  <div className="aspect-square w-full bg-canvas">
                    {p.image ? (
                      <Image
                        src={p.image.url}
                        alt={p.image.alt ?? p.name}
                        width={400}
                        height={400}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-ink-soft">
                        <BoxIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{p.brand}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className="text-xs text-ink-soft">
                      {p.category.name} · {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-auto pt-2 text-sm font-semibold">
                      {p.minMrp
                        ? p.minMrp === p.maxMrp
                          ? formatMoney(p.minMrp)
                          : `${formatMoney(p.minMrp)} – ${formatMoney(p.maxMrp!)}`
                        : "—"}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {(cursors.length > 0 || meta?.hasMore) && products.length > 0 && (
        <div className="mt-6 flex justify-center gap-3">
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
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z M3.5 7.5 12 12l8.5-4.5M12 12v9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
