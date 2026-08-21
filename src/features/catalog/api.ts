import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AttributeDef,
  Category,
  CreateAttributeDefBody,
  CreateCategoryBody,
  CreateProductBody,
  ProductDetail,
  ProductStatus,
  ProductSummary,
  UpdateCategoryBody,
  UpdateProductBody,
  VariantInput,
} from "@/lib/types";

// Typed wrappers over src/lib/api.ts + the TanStack Query hooks the catalog screens use.
// This is the only place catalog endpoints are called from.

export interface ProductFilters {
  categoryId?: string;
  status?: ProductStatus;
  q?: string;
}

function productsQueryString(filters: ProductFilters, cursor?: string) {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function useCategories(filter: { parentId?: string; isActive?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filter.parentId) params.set("parentId", filter.parentId);
  if (filter.isActive !== undefined) params.set("isActive", String(filter.isActive));
  const qs = params.toString();
  return useQuery({
    queryKey: ["categories", filter],
    queryFn: () => api.get<{ categories: Category[] }>(`/categories${qs ? `?${qs}` : ""}`),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCategoryBody) => api.post<{ category: Category }>("/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCategoryBody }) =>
      api.patch<{ category: Category }>(`/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useAttributeDefs(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["attributeDefs", categoryId],
    queryFn: () => api.get<{ attributes: AttributeDef[] }>(`/categories/${categoryId}/attributes`),
    enabled: Boolean(categoryId),
  });
}

export function useCreateAttributeDef(categoryId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAttributeDefBody) =>
      api.post<{ attribute: AttributeDef }>(`/categories/${categoryId}/attributes`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attributeDefs", categoryId] }),
  });
}

export function useProducts(filters: ProductFilters, cursor?: string) {
  const qs = productsQueryString(filters, cursor);
  return useQuery({
    queryKey: ["products", filters, cursor],
    queryFn: () => api.getPage<{ products: ProductSummary[] }>(`/products${qs ? `?${qs}` : ""}`),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<{ product: ProductDetail }>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductBody) => api.post<{ product: ProductDetail }>("/products", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProductBody) => api.patch<{ product: ProductDetail }>(`/products/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
  });
}

export function useDeleteProductPermanently(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<{ deleted: true }>(`/products/${id}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.removeQueries({ queryKey: ["product", id] });
    },
  });
}

export function useAddVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VariantInput) => api.post(`/products/${productId}/variants`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
}

export function useUploadProductMedia(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ files, primaryIndex = 0 }: { files: File[]; primaryIndex?: number }) => {
      const form = new FormData();
      files.forEach((file) => form.append("images", file, file.name));
      form.append("primaryIndex", String(primaryIndex));
      return api.postForm<{ product: ProductDetail }>(`/products/${productId}/media`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
}

export function useDeleteProductMedia(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => api.del<{ product: ProductDetail }>(`/products/${productId}/media/${mediaId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
}

export function useMoveProductMedia(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (oldProductName: string) => api.post<{ product: ProductDetail }>(`/products/${productId}/media/move`, { oldProductName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
}
