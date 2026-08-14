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

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <h1 className="text-xl font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Categories organise products. Each one can define attributes — some are just
          filters, others (variant axes) are what make a product multi-variant.
        </p>

        <div className="mt-5">
          {categories.isLoading ? (
            <div className="grid place-items-center py-16 text-ink-soft">
              <Spinner className="h-5 w-5" />
            </div>
          ) : categories.isError ? (
            <ErrorState message="Could not load categories" onRetry={categories.refetch} />
          ) : categories.data!.categories.length === 0 ? (
            <EmptyState title="No categories yet" hint="Create the first one on the right." />
          ) : (
            <Card className="divide-y divide-line">
              {categories.data!.categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-canvas ${
                    selected === c.id ? "bg-brand/5" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-neutral-300"}`} />
                    {c.name}
                  </span>
                  <span className="text-xs text-ink-soft">/{c.slug}</span>
                </button>
              ))}
            </Card>
          )}
        </div>

        {selected && <AttributesPanel categoryId={selected} categoryName={categories.data?.categories.find((c) => c.id === selected)?.name ?? ""} />}
      </div>

      <NewCategoryForm />
    </div>
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
      <p className="text-sm font-medium">New category</p>
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
      <p className="text-sm font-medium">Attributes — {categoryName}</p>
      <p className="mt-1 text-xs text-ink-soft">
        Mark an attribute as a variant axis (e.g. Size, Colour) to use it when building product variants.
      </p>

      <div className="mt-4">
        {attrs.isLoading ? (
          <Spinner className="h-4 w-4 text-ink-soft" />
        ) : attrs.data!.attributes.length === 0 ? (
          <p className="text-sm text-ink-soft">No attributes defined yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attrs.data!.attributes.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-xs"
              >
                <span className="font-medium">{a.name}</span>
                {a.isVariantAxis && <span className="text-brand">axis</span>}
                {a.options.length > 0 && <span className="text-ink-soft">({a.options.length} options)</span>}
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isVariantAxis}
              onChange={(e) => setIsVariantAxis(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-[var(--brand)]"
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
