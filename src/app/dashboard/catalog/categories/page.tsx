"use client";

import { useState } from "react";
import {
  useAttributeDefs,
  useCategories,
  useCreateAttributeDef,
  useCreateCategory,
} from "@/features/catalog/api";
import { ApiError } from "@/lib/api";
import { Button, Card, EmptyState, ErrorState, Input, Label, Select, Spinner } from "@/components/ui";
import type { AttributeType } from "@/lib/types";

export default function CategoriesPage() {
  const categories = useCategories();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const categoryRows = (categories.data?.categories ?? []).filter((category) =>
    category.name.toLowerCase().includes(query.toLowerCase()) &&
    (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? category.isActive : !category.isActive))
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Categories</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Categories organise products. Each one can define attributes — some are just
          filters, others (variant axes) are what make a product multi-variant.
        </p>

        <div className="mt-5">
          {categories.isLoading ? (
            <div className="grid place-items-center py-16 text-on-surface-variant">
              <Spinner className="h-5 w-5" />
            </div>
          ) : categories.isError ? (
            <ErrorState message="Could not load categories" onRetry={categories.refetch} />
          ) : categories.data!.categories.length === 0 ? (
            <EmptyState title="No categories yet" hint="Create the first one on the right." />
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-outline-variant p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input aria-label="Search categories" className="pl-9" placeholder="Search categories..." value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
                <Select aria-label="Filter categories" className="sm:w-40" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="ALL">All states</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Category name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {categoryRows.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className={`cursor-pointer transition-colors hover:bg-surface-container-high ${selected === c.id ? "bg-surface-container-high" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.isActive ? "text-emerald-600" : "text-on-surface-variant"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-outline"}`} />
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-on-surface">{c.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">/{c.slug}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{c.position + 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 p-2 sm:hidden">
                {categoryRows.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c.id)}
                    className={`rounded-xl border p-3 text-left ${selected === c.id ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-lowest"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold text-on-surface">{c.name}</span>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${c.isActive ? "text-emerald-600" : "text-on-surface-variant"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-outline"}`} />
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-on-surface-variant">/{c.slug}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Position {c.position + 1}</p>
                  </button>
                ))}
              </div>
              {!categoryRows.length && <p className="p-6 text-center text-sm text-on-surface-variant">No categories match your filters.</p>}
            </Card>
          )}
        </div>

        {selected && <AttributesPanel categoryId={selected} categoryName={categories.data?.categories.find((c) => c.id === selected)?.name ?? ""} />}
      </div>

      <NewCategoryForm />
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="m15.3 15.3 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function NewCategoryForm() {
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name });
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category");
    }
  }

  return (
    <Card className="h-fit p-5">
      <p className="font-display text-base font-bold text-on-surface">New category</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beverages" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={create.isPending || !name}>
          {create.isPending ? "Creating…" : "Create category"}
        </Button>
      </form>
    </Card>
  );
}

function AttributesPanel({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const attrs = useAttributeDefs(categoryId);
  const create = useCreateAttributeDef(categoryId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<AttributeType>("ENUM");
  const [isVariantAxis, setIsVariantAxis] = useState(true);
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name,
        code,
        type,
        isVariantAxis,
        isFilterable: true,
        options: options ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      });
      setName("");
      setCode("");
      setOptions("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create attribute");
    }
  }

  return (
    <Card className="mt-4 p-5">
      <p className="font-display text-base font-bold text-on-surface">Attributes — {categoryName}</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Mark an attribute as a variant axis (e.g. Size, Colour) to use it when building product variants.
      </p>

      <div className="mt-4">
        {attrs.isLoading ? (
          <Spinner className="h-4 w-4 text-on-surface-variant" />
        ) : attrs.data!.attributes.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No attributes defined yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attrs.data!.attributes.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-on-surface">{a.name}</span>
                {a.isVariantAxis && <span className="text-primary">axis</span>}
                {a.options.length > 0 && <span className="text-on-surface-variant">({a.options.length} options)</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Size" required />
        </div>
        <div>
          <Label>Code (camelCase)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="size" required />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as AttributeType)}>
            <option value="ENUM">Enum (choose from options)</option>
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="BOOLEAN">Boolean</option>
          </Select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={isVariantAxis}
              onChange={(e) => setIsVariantAxis(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-[var(--md-primary)]"
            />
            Variant axis
          </label>
        </div>
        {type === "ENUM" && (
          <div className="sm:col-span-2">
            <Label>Options (comma-separated)</Label>
            <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="250 ml, 500 ml, 1 L" />
          </div>
        )}
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={create.isPending || !name || !code}>
            {create.isPending ? "Adding…" : "Add attribute"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
