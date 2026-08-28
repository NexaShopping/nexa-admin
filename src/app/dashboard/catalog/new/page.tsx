"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAttributeDefs, useCategories, useCreateProduct } from "@/features/catalog/api";
import { ProductMediaPicker } from "@/features/catalog/product-media-picker";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import type { ProductStatus, VariantInput } from "@/lib/types";

interface VariantRow {
  key: number;
  sku: string;
  name: string;
  mrp: string;
  values: Record<string, string>; // attributeDefId -> value
}

let rowSeq = 0;
function blankRow(): VariantRow {
  rowSeq += 1;
  return { key: rowSeq, sku: "", name: "", mrp: "", values: {} };
}

function skuPart(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
}

function suggestedSku(categoryName: string, productName: string, variantName: string) {
  return [categoryName, productName, variantName].map(skuPart).filter(Boolean).join("-") || "PRODUCT-VARIANT";
}

export default function NewProductPage() {
  const router = useRouter();
  const categories = useCategories();
  const create = useCreateProduct();

  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [files, setFiles] = useState<File[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [imagesReviewed, setImagesReviewed] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<VariantRow[]>([blankRow()]);
  const [error, setError] = useState<string | null>(null);

  const attrs = useAttributeDefs(categoryId || undefined);
  const axes = (attrs.data?.attributes ?? []).filter((a) => a.isVariantAxis);
  const selectedCategoryName = categories.data?.categories.find((category) => category.id === categoryId)?.name ?? "";

  function updateRow(key: number, patch: Partial<VariantRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function updateRowValue(key: number, attributeDefId: string, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, values: { ...r.values, [attributeDefId]: value } } : r)));
  }

  async function completeProduct(productId: string) {
    if (files.length) {
      setUploading(true);
      const form = new FormData();
      files.forEach((file) => form.append("images", file, file.name));
      form.append("primaryIndex", String(primaryIndex));
      try {
        await api.postForm(`/products/${productId}/media`, form);
      } finally {
        setUploading(false);
      }
    }
    if (status !== "DRAFT") await api.patch(`/products/${productId}`, { status });
    router.push(`/dashboard/catalog/${productId}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (files.length && !imagesReviewed) {
      setError("Review and confirm the selected images before creating the product.");
      return;
    }

    const variants: VariantInput[] = rows.map((r) => ({
      sku: r.sku.trim(),
      name: r.name.trim(),
      mrp: r.mrp.trim(),
      options: axes.length
        ? axes
            .map((a) => ({ attributeDefId: a.id, value: r.values[a.id]?.trim() ?? "" }))
            .filter((o) => o.value)
        : undefined,
    }));

    try {
      const { product } = await create.mutateAsync({
        categoryId,
        brand,
        name,
        shortDescription,
        description: description || undefined,
        status: "DRAFT",
        variants,
      });
      setCreatedProductId(product.id);
      await completeProduct(product.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create product or upload images");
    }
  }

  async function retryImages() {
    if (!createdProductId) return;
    setError(null);
    try {
      await completeProduct(createdProductId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload images; the draft is still saved");
    }
  }

  const detailsComplete = Boolean(categoryId && brand && name && shortDescription);
  const variantsDefined = rows.every((r) => r.sku && r.name && r.mrp) && rows.length > 0;
  const canSubmit = detailsComplete && variantsDefined;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Catalog control center</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-on-surface">New product</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        Every product needs at least one variant — even a single-SKU product gets one row below.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Product details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  <option value="">Select a category…</option>
                  {(categories.data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Short description</Label>
                <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Description (optional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          </Card>

          <ProductMediaPicker
            files={files}
            primaryIndex={primaryIndex}
            onChange={(nextFiles, nextPrimary) => { setFiles(nextFiles); setPrimaryIndex(nextPrimary); setImagesReviewed(false); }}
            onReviewed={() => setImagesReviewed(true)}
          />

          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Variants{axes.length > 0 && <span className="ml-1.5 normal-case font-normal text-on-surface-variant/80">({axes.map((a) => a.name).join(" × ")})</span>}
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])}>
                Add variant
              </Button>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.key} className="rounded-lg border border-outline-variant p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <Label>SKU</Label>
                      <Input
                        value={row.sku}
                        onChange={(e) => updateRow(row.key, { sku: e.target.value.toUpperCase() })}
                        placeholder={suggestedSku(selectedCategoryName, name, row.name)}
                        required
                      />
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                        <span className="truncate">Suggestion: {suggestedSku(selectedCategoryName, name, row.name)}</span>
                        <button
                          type="button"
                          className="shrink-0 font-medium text-primary hover:opacity-80"
                          onClick={() => updateRow(row.key, { sku: suggestedSku(selectedCategoryName, name, row.name) })}
                        >
                          Use suggestion
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>Variant name</Label>
                      <Input value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>MRP (₹)</Label>
                      <Input
                        value={row.mrp}
                        onChange={(e) => updateRow(row.key, { mrp: e.target.value })}
                        placeholder="499.00"
                        inputMode="decimal"
                        required
                      />
                    </div>
                  </div>
                  {axes.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {axes.map((a) => (
                        <div key={a.id}>
                          <Label>{a.name}</Label>
                          {a.options.length > 0 ? (
                            <Select
                              value={row.values[a.id] ?? ""}
                              onChange={(e) => updateRowValue(row.key, a.id, e.target.value)}
                            >
                              <option value="">—</option>
                              {a.options.map((o) => (
                                <option key={o.id} value={o.value}>
                                  {o.value}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Input
                              value={row.values[a.id] ?? ""}
                              onChange={(e) => updateRowValue(row.key, a.id, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                      className="mt-2 text-xs text-on-surface-variant hover:text-red-600"
                    >
                      Remove variant
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {createdProductId && files.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              The draft product is saved, but its images still need uploading.
              <Button type="button" size="sm" variant="secondary" className="ml-3" onClick={retryImages} disabled={uploading}>
                {uploading ? "Uploading..." : "Retry image upload"}
              </Button>
            </div>
          )}
        </div>

        <Card className="h-fit space-y-4 p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Publish</p>
            <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
              {status === "DRAFT" ? "Draft" : "Active"}
            </span>
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
            <option value="DRAFT">Save as draft</option>
            <option value="ACTIVE">Publish as active</option>
          </Select>

          <div className="space-y-2 border-t border-outline-variant pt-4">
            <p className="text-xs font-semibold text-on-surface-variant">Validation checklist</p>
            <ChecklistItem done={detailsComplete} label="Details complete" />
            <ChecklistItem done={files.length > 0} label="Images uploaded" />
            <ChecklistItem done={variantsDefined} label="Variants defined" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
            <Button type="submit" className="w-full" disabled={!canSubmit || create.isPending || uploading || Boolean(createdProductId)}>
              {create.isPending || uploading ? "Creating…" : "Create product"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-outline-variant text-transparent"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5"><path d="M5 12.5 10 17.5 19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className={done ? "text-on-surface" : "text-on-surface-variant"}>{label}</span>
    </div>
  );
}
