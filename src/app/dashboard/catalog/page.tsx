"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCategories, useInfiniteProducts, type ProductFilters } from "@/features/catalog/api";
import { formatMoney } from "@/lib/money";
import { Button, Card, EmptyState, ErrorState, Input, Select, Spinner, StatusBadge } from "@/components/ui";
import type { ProductStatus, ProductSummary } from "@/lib/types";

type ViewMode = "grid" | "list";

export default function CatalogPage() {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [qInput, setQInput] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const categories = useCategories();
  const query = useInfiniteProducts(filters);
  const products = query.data?.pages.flatMap((page) => page.data.products) ?? [];
  const hasFilters = Boolean(filters.q || filters.categoryId || filters.status);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !query.hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !query.isFetchingNextPage) void query.fetchNextPage();
    }, { rootMargin: "320px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage]);

  function updateFilters(next: Partial<ProductFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function search(event: React.FormEvent) {
    event.preventDefault();
    updateFilters({ q: qInput.trim() || undefined });
  }

  function clearSearch() {
    setQInput("");
    updateFilters({ q: undefined });
  }

  return (
    <div className="mx-auto w-full max-w-[1680px]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Central catalog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Products</h1>
          <p className="mt-1 text-sm text-ink-soft">Manage products, variants, media, and selling status from one view.</p>
        </div>
        <Link href="/dashboard/catalog/new"><Button><PlusIcon className="h-4 w-4" /> New product</Button></Link>
      </header>

      <section className="mt-6 rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <form onSubmit={search} className="relative min-w-0 flex-1 xl:max-w-xl">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input aria-label="Search products" className="h-10 pl-9 pr-20" placeholder="Search by product, brand, or SKU…" value={qInput} onChange={(event) => setQInput(event.target.value)} />
            {qInput && <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-ink-soft hover:bg-canvas hover:text-ink">Clear</button>}
          </form>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select aria-label="Filter by category" className="h-10 min-w-0 sm:w-44" value={filters.categoryId ?? ""} onChange={(event) => updateFilters({ categoryId: event.target.value || undefined })}>
              <option value="">All categories</option>
              {(categories.data?.categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Select aria-label="Filter by status" className="h-10 min-w-0 sm:w-36" value={filters.status ?? ""} onChange={(event) => updateFilters({ status: (event.target.value || undefined) as ProductStatus | undefined })}>
              <option value="">Any status</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option>
            </Select>
            <div className="col-span-2 flex h-10 items-center justify-between rounded-md border border-line bg-canvas p-1 sm:col-span-1 sm:justify-start">
              <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={"flex h-8 flex-1 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium sm:flex-none " + (view === "grid" ? "bg-surface text-brand shadow-sm" : "text-ink-soft hover:text-ink")}><GridIcon className="h-3.5 w-3.5" /> Cards</button>
              <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={"flex h-8 flex-1 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium sm:flex-none " + (view === "list" ? "bg-surface text-brand shadow-sm" : "text-ink-soft hover:text-ink")}><ListIcon className="h-3.5 w-3.5" /> List</button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-soft">
          <span>{query.isLoading ? "Loading products…" : products.length + (query.hasNextPage ? "+" : "") + " product" + (products.length === 1 ? "" : "s") + (hasFilters ? " matching your filters" : "")}</span>
          {query.isFetching && !query.isFetchingNextPage && <span className="inline-flex items-center gap-1.5 text-brand"><Spinner className="h-3.5 w-3.5" /> Updating</span>}
        </div>
      </section>

      <section className="mt-5">
        {query.isLoading ? <div className="grid place-items-center py-24 text-ink-soft"><Spinner className="h-5 w-5" /></div> : query.isError ? <ErrorState message={query.error instanceof Error ? query.error.message : "Could not load products"} onRetry={() => query.refetch()} /> : products.length === 0 ? <EmptyState title={hasFilters ? "No products match these filters" : "No products yet"} hint="Create your first product to start building the catalog." action={<Link href="/dashboard/catalog/new"><Button size="sm">New product</Button></Link>} /> : view === "grid" ? <ProductGrid products={products} /> : <ProductList products={products} />}
        <div ref={sentinelRef} className="h-10" aria-hidden="true" />
        {query.isFetchingNextPage && <div className="flex items-center justify-center gap-2 pb-8 text-xs text-ink-soft"><Spinner className="h-4 w-4" /> Loading more products</div>}
        {!query.hasNextPage && products.length > 0 && <p className="pb-8 text-center text-xs text-ink-soft">You’ve reached the end of the catalog.</p>}
      </section>
    </div>
  );
}

function ProductGrid({ products }: { products: ProductSummary[] }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

function ProductCard({ product }: { product: ProductSummary }) {
  const price = product.minMrp ? product.minMrp === product.maxMrp ? formatMoney(product.minMrp) : formatMoney(product.minMrp) + " – " + formatMoney(product.maxMrp!) : "—";
  return <Link href={"/dashboard/catalog/" + product.id} className="group min-w-0"><Card className="flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg">
    <div className="relative aspect-square w-full overflow-hidden bg-canvas">{product.image ? <Image src={product.image.url} alt={product.image.alt ?? product.name} fill sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" unoptimized /> : <div className="grid h-full place-items-center text-ink-soft"><BoxIcon className="h-7 w-7" /></div>}<div className="absolute right-2 top-2"><StatusBadge status={product.status} /></div></div>
    <div className="flex min-h-[132px] flex-1 flex-col gap-1 p-3"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">{product.brand}</p><p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand">{product.name}</p><p className="truncate text-[11px] text-ink-soft">{product.category.name} · {product.variantCount} variant{product.variantCount === 1 ? "" : "s"}</p><p className="mt-auto pt-2 text-sm font-bold">{price}</p></div>
  </Card></Link>;
}

function ProductList({ products }: { products: ProductSummary[] }) {
  return <Card className="overflow-hidden"><div className="hidden grid-cols-[minmax(260px,2fr)_minmax(120px,1fr)_100px_150px_90px] gap-4 border-b border-line bg-canvas px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft sm:grid"><span>Product</span><span>Category</span><span>Variants</span><span>Price</span><span>Status</span></div><div className="divide-y divide-line">{products.map((product) => {
    const price = product.minMrp ? product.minMrp === product.maxMrp ? formatMoney(product.minMrp) : formatMoney(product.minMrp) + " – " + formatMoney(product.maxMrp!) : "—";
    return <Link key={product.id} href={"/dashboard/catalog/" + product.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-canvas sm:grid-cols-[minmax(260px,2fr)_minmax(120px,1fr)_100px_150px_90px] sm:gap-4 sm:px-4"><div className="relative h-14 w-14 overflow-hidden rounded-lg bg-canvas sm:hidden">{product.image ? <Image src={product.image.url} alt="" fill sizes="56px" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-ink-soft"><BoxIcon className="h-5 w-5" /></div>}</div><div className="flex min-w-0 items-center gap-3"><div className="relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-md bg-canvas sm:block">{product.image ? <Image src={product.image.url} alt="" fill sizes="44px" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-ink-soft"><BoxIcon className="h-4 w-4" /></div>}</div><div className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">{product.brand}</p><p className="truncate text-sm font-semibold">{product.name}</p><p className="truncate text-xs text-ink-soft sm:hidden">{product.category.name} · {product.variantCount} variants</p></div></div><span className="hidden truncate text-sm text-ink-soft sm:block">{product.category.name}</span><span className="hidden text-sm text-ink-soft sm:block">{product.variantCount}</span><span className="text-right text-sm font-semibold sm:text-left">{price}</span><span className="hidden sm:block"><StatusBadge status={product.status} /></span><span className="sm:hidden"><StatusBadge status={product.status} /></span></Link>;
  })}</div></Card>;
}

function PlusIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>; }
function SearchIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>; }
function GridIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>; }
function ListIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M8 6h12M8 12h12M8 18h12" strokeLinecap="round" /><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" strokeLinecap="round" /></svg>; }
function BoxIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="m3.5 7.5 8.5-4.5 8.5 4.5v9L12 21l-8.5-4.5v-9Z M3.5 7.5 12 12l8.5-4.5M12 12v9" strokeLinecap="round" /></svg>; }
