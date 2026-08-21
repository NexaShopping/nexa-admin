"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAddVariant, useAttributeDefs, useDeleteProductMedia, useMoveProductMedia, useProduct, useUpdateProduct, useUploadProductMedia } from "@/features/catalog/api";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Button, Card, ErrorState, Input, Label, Select, Spinner, StatusBadge } from "@/components/ui";
import type { ProductStatus } from "@/lib/types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useProduct(id);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-ink-soft">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState message="Could not load this product" onRetry={refetch} />;
  }

  return <ProductDetail id={id} product={data.product} />;
}

function ProductDetail({ id, product }: { id: string; product: NonNullable<ReturnType<typeof useProduct>["data"]>["product"] }) {
  const update = useUpdateProduct(id);
  const deleteMedia = useDeleteProductMedia(id);
  const uploadMedia = useUploadProductMedia(id);
  const moveMedia = useMoveProductMedia(id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    brand: product.brand,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  async function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setMediaError(null);
    try {
      await uploadMedia.mutateAsync({ files, primaryIndex: 0 });
    } catch (err) {
      setMediaError(err instanceof ApiError ? err.message : "Could not upload images");
    }
  }

  async function removeImage(mediaId: string) {
    if (!window.confirm("Delete this product image? It will also be removed from Cloudinary.")) return;
    setMediaError(null);
    try {
      await deleteMedia.mutateAsync(mediaId);
    } catch (err) {
      setMediaError(err instanceof ApiError ? err.message : "Could not delete image");
    }
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nameChanged = form.name.trim() !== product.name.trim();
    const moveConfirmed = nameChanged && product.media.length > 0
      ? window.confirm("Move the existing product images to the new Cloudinary product folder?")
      : false;
    try {
      await update.mutateAsync(form);
      if (moveConfirmed) await moveMedia.mutateAsync(product.name);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes or move product images");
    }
  }

  async function setStatus(status: ProductStatus) {
    try {
      await update.mutateAsync({ status });
    } catch {
      /* surfaced via the badge staying the same; acceptable for a first pass */
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/catalog" className="text-sm text-ink-soft hover:text-ink">
        ← Back to catalog
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{product.brand}</p>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {product.category.name} · /{product.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={product.status} />
          {product.status !== "ACTIVE" && (
            <Button size="sm" variant="secondary" onClick={() => setStatus("ACTIVE")}>
              Publish
            </Button>
          )}
          {product.status === "ACTIVE" && (
            <Button size="sm" variant="secondary" onClick={() => setStatus("DRAFT")}>
              Move to draft
            </Button>
          )}
          {product.status !== "ARCHIVED" && (
            <Button size="sm" variant="danger" onClick={() => setStatus("ARCHIVED")}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Details</p>
              {!editing && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <form onSubmit={saveDetails} className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Brand</Label>
                    <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Short description</Label>
                  <Input
                    value={form.shortDescription}
                    onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={update.isPending}>
                    {update.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <p>{product.shortDescription}</p>
                {product.description && <p className="text-ink-soft">{product.description}</p>}
              </div>
            )}
          </Card>

          <VariantsCard product={product} />
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Media</p>
                <p className="mt-1 text-xs text-ink-soft">{product.media.length}/10 images</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand">
                Add images
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={addImages} disabled={uploadMedia.isPending || product.media.length >= 10} />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
              <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:block sm:space-y-2">
                {product.media.map((m, index) => (
                  <button key={m.id} type="button" aria-label={`View product image ${index + 1}`} onClick={() => setActiveMediaIndex(index)} className={`relative block h-14 w-14 shrink-0 overflow-hidden rounded-md border sm:h-[68px] sm:w-[68px] ${index === activeMediaIndex ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-brand/60"}`}>
                    <Image src={m.url} alt="" fill unoptimized className="object-cover" />
                    {m.isPrimary && <span className="absolute inset-x-0 bottom-0 bg-brand/90 px-0.5 py-0.5 text-[8px] font-semibold text-white">PRIMARY</span>}
                  </button>
                ))}
              </div>
              <div className="order-1 min-w-0 sm:order-2">
                {product.media.length === 0 ? <p className="text-sm text-ink-soft">No images yet.</p> : (() => {
                  const active = product.media[Math.min(activeMediaIndex, product.media.length - 1)];
                  return <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-canvas"><Image src={active.url} alt={active.alt ?? product.name} fill unoptimized className="object-contain" /><span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">{active.isPrimary ? "Primary image" : `Image ${active.position + 1}`}</span><button type="button" className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-1 text-[10px] text-red-100 hover:text-white" onClick={() => removeImage(active.id)}>Delete image</button></div>;
                })()}
              </div>
            </div>
            {uploadMedia.isPending && <p className="mt-2 text-xs text-ink-soft">Uploading images…</p>}
            {mediaError && <p className="mt-2 text-xs text-red-600">{mediaError}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function VariantsCard({ product }: { product: NonNullable<ReturnType<typeof useProduct>["data"]>["product"] }) {
  const attrs = useAttributeDefs(product.category.id);
  const axes = (attrs.data?.attributes ?? []).filter((a) => a.isVariantAxis);
  const addVariant = useAddVariant(product.id);

  const [showForm, setShowForm] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [mrp, setMrp] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addVariant.mutateAsync({
        sku,
        name,
        mrp,
        options: axes.length
          ? axes.map((a) => ({ attributeDefId: a.id, value: values[a.id] ?? "" })).filter((o) => o.value)
          : undefined,
      });
      setSku("");
      setName("");
      setMrp("");
      setValues({});
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add variant");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Variants ({product.variants.length})</p>
        {!showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            Add variant
          </Button>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft">
              <th className="pb-2 font-medium">SKU</th>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Options</th>
              <th className="pb-2 pr-0 text-right font-medium">MRP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {product.variants.map((v) => (
              <tr key={v.id}>
                <td className="py-2 font-mono text-xs">{v.sku}</td>
                <td className="py-2">{v.name}</td>
                <td className="py-2 text-ink-soft">{v.options.map((o) => o.value).join(", ") || "—"}</td>
                <td className="py-2 text-right font-medium">{formatMoney(v.mrp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
            </div>
            <div>
              <Label>Variant name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>MRP (₹)</Label>
              <Input value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="499.00" required />
            </div>
          </div>
          {axes.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {axes.map((a) => (
                <div key={a.id}>
                  <Label>{a.name}</Label>
                  {a.options.length > 0 ? (
                    <Select value={values[a.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}>
                      <option value="">—</option>
                      {a.options.map((o) => (
                        <option key={o.id} value={o.value}>
                          {o.value}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={values[a.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={addVariant.isPending || !sku || !name || !mrp}>
              {addVariant.isPending ? "Adding…" : "Add variant"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
