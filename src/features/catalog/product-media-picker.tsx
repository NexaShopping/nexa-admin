"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Label } from "@/components/ui";

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ProductMediaPickerProps {
  files: File[];
  primaryIndex: number;
  onChange: (files: File[], primaryIndex: number) => void;
  onReviewed: () => void;
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mergeProductImageFiles(existing: File[], incoming: File[]) {
  const seen = new Set(existing.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  return [...existing, ...incoming.filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })];
}

export function ProductMediaPicker({ files, primaryIndex, onChange, onReviewed }: ProductMediaPickerProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  useEffect(() => {
    setPreviewIndex((current) => (files.length ? Math.min(current, files.length - 1) : 0));
  }, [files.length]);

  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError(null);
    if (!incoming.length) return;
    const combined = mergeProductImageFiles(files, incoming);
    if (combined.length > MAX_IMAGES) return setError(`Choose up to ${MAX_IMAGES} images in total.`);
    if (incoming.some((file) => !ACCEPTED.has(file.type))) return setError("Use JPEG, PNG, or WebP images only.");
    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) return setError("Each image must be 5 MB or smaller.");
    if (combined.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return setError("Images must be 50 MB or smaller in total.");
    onChange(combined, primaryIndex < combined.length ? primaryIndex : 0);
  }

  function removeAt(index: number) {
    const next = files.filter((_, fileIndex) => fileIndex !== index);
    const nextPrimary = next.length ? Math.min(primaryIndex === index ? 0 : primaryIndex > index ? primaryIndex - 1 : primaryIndex, next.length - 1) : 0;
    onChange(next, nextPrimary);
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Product images</p>
          <p className="mt-1 text-xs text-ink-soft">Up to 10 JPEG, PNG, or WebP images. The first image is primary by default.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-brand hover:text-brand">
          Choose images
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={selectFiles} />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {files.length > 0 && (
        <div className="space-y-4 rounded-xl border border-line bg-canvas/60 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-ink-soft">
            <span>{files.length} selected · {formatBytes(files.reduce((total, file) => total + file.size, 0))}</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => setReviewOpen(true)}>Open detailed review</Button>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-4">
            <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:block sm:space-y-2">
              {previews.map(({ file, url }, index) => (
                <button key={`${file.name}-${file.lastModified}`} type="button" aria-label={`Preview ${file.name}`} onClick={() => setPreviewIndex(index)} className={`relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-surface transition sm:h-[84px] sm:w-[84px] ${index === previewIndex ? "border-brand ring-2 ring-brand/25" : "border-line hover:border-brand/60"}`}>
                  <Image src={url} alt="" fill unoptimized className="object-cover" />
                  {index === primaryIndex && <span className="absolute inset-x-0 bottom-0 bg-brand/90 px-1 py-0.5 text-[9px] font-semibold text-white">PRIMARY</span>}
                </button>
              ))}
            </div>
            <div className="order-1 min-w-0 sm:order-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                {previews[previewIndex] && <Image src={previews[previewIndex].url} alt={previews[previewIndex].file.name} fill unoptimized className="object-contain" />}
                <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{previewIndex === primaryIndex ? "Primary image" : "Product preview"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-soft"><span className="truncate">{previews[previewIndex]?.file.name}</span><button type="button" className="shrink-0 font-medium text-brand hover:text-brand-strong" onClick={() => setReviewOpen(true)}>Review &amp; arrange</button></div>
            </div>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="image-review-title">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Final image check</p>
                <h2 id="image-review-title" className="mt-1 text-lg font-semibold">Review product images</h2>
                <p className="mt-1 text-sm text-ink-soft">Choose the primary image and remove anything you do not want to upload.</p>
              </div>
              <button type="button" aria-label="Close image review" className="text-xl text-ink-soft hover:text-ink" onClick={() => setReviewOpen(false)}>×</button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {previews.map(({ file, url }, index) => (
                <div key={`${file.name}-${file.lastModified}`} className={`group relative overflow-hidden rounded-xl border ${index === primaryIndex ? "border-brand ring-2 ring-brand/20" : "border-line"}`}>
                  <div className="aspect-square bg-canvas"><Image src={url} alt={file.name} width={240} height={240} unoptimized className="h-full w-full object-cover" /></div>
                  <div className="flex items-center justify-between gap-2 p-2">
                    <button type="button" className={`text-xs font-medium ${index === primaryIndex ? "text-brand" : "text-ink-soft"}`} onClick={() => onChange(files, index)}>
                      {index === primaryIndex ? "Primary" : "Make primary"}
                    </button>
                    <button type="button" className="text-xs text-red-600" onClick={() => removeAt(index)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => setReviewOpen(false)}>Keep editing</Button>
              <Button type="button" onClick={() => { setReviewOpen(false); onReviewed(); }}>Confirm images</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
