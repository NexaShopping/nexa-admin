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

  const canSubmit =
    categoryId &&
    brand &&
    name &&
    shortDescription &&
    rows.every((r) => r.sku && r.name && r.mrp);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">New product</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every product needs at least one variant — even a single-SKU product gets one row below.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <Card className="space-y-4 p-5">
          <p className="text-sm font-medium">Details</p>
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
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </div>
            <div>
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
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
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
            <p className="text-sm font-medium">
              Variants{axes.length > 0 && <span className="ml-1.5 font-normal text-ink-soft">({axes.map((a) => a.name).join(" × ")})</span>}
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])}>
              Add variant
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="rounded-lg border border-line p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>SKU</Label>
                    <Input value={row.sku} onChange={(e) => updateRow(row.key, { sku: e.target.value })} required />
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
                    className="mt-2 text-xs text-ink-soft hover:text-red-600"
                  >
                    Remove variant
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {createdProductId && files.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            The draft product is saved, but its images still need uploading.
            <Button type="button" size="sm" variant="secondary" className="ml-3" onClick={retryImages} disabled={uploading}>
              {uploading ? "Uploading..." : "Retry image upload"}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit || create.isPending || uploading || Boolean(createdProductId)}>
            {create.isPending || uploading ? "Creating…" : "Create product"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
