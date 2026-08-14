// Response types, hand-written from nexa-docs/docs/API.md. This is the ONLY place API
// response types live in this repo. Adding a field is safe; a rename/removal in API.md means
// updating it here too. Endpoint-specific types are added as endpoints are built (Phase 1+).

export interface PageMeta {
  cursor?: string;
  hasMore: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

// Stable SCREAMING_SNAKE codes from API.md. Panels switch on `code`, never on `message`.
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL"
  // tolerate codes added server-side before this file catches up
  | (string & {});

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// --- Auth (from API.md · POST /auth/admin/login, GET /auth/me) ---

export type Role = "ADMIN" | "COADMIN" | "DISTRIBUTOR" | "CUSTOMER";
export type AccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface AuthAccount {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  status: AccountStatus;
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: string;
  account: AuthAccount;
}

export interface MeResponse {
  account: AuthAccount;
}

// --- Catalog (from API.md · Catalog Phase 2) ---

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AttributeType = "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM";

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
}

export interface AttributeOption {
  id: string;
  value: string;
  position: number;
}

export interface AttributeDef {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  type: AttributeType;
  unit: string | null;
  isVariantAxis: boolean;
  isFilterable: boolean;
  position: number;
  options: AttributeOption[];
}

export interface ProductSummary {
  id: string;
  category: { id: string; name: string; slug: string };
  brand: string;
  name: string;
  slug: string;
  shortDescription: string;
  status: ProductStatus;
  variantCount: number;
  minMrp: string | null;
  maxMrp: string | null;
  image: { url: string; alt: string | null } | null;
}

export interface VariantOptionValue {
  attributeDefId: string;
  name: string;
  code: string;
  value: string;
}

export interface Media {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
}

export interface Variant {
  id: string;
  sku: string;
  name: string;
  mrp: string;
  isActive: boolean;
  options: VariantOptionValue[];
  media: Media[];
}

export interface ProductDetail {
  id: string;
  category: { id: string; name: string; slug: string };
  brand: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  status: ProductStatus;
  archivedAt: string | null;
  variants: Variant[];
  media: Media[];
  attributes: VariantOptionValue[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryBody {
  name: string;
  slug?: string;
  parentId?: string;
  imageUrl?: string;
  position?: number;
}

export interface UpdateCategoryBody extends Partial<CreateCategoryBody> {
  isActive?: boolean;
}

export interface CreateAttributeDefBody {
  name: string;
  code: string;
  type?: AttributeType;
  unit?: string;
  isVariantAxis?: boolean;
  isFilterable?: boolean;
  position?: number;
  options?: string[];
}

export interface VariantInput {
  sku: string;
  name: string;
  mrp: string;
  options?: { attributeDefId: string; value: string }[];
}

export interface MediaInput {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface CreateProductBody {
  categoryId: string;
  brand: string;
  name: string;
  slug?: string;
  shortDescription: string;
  description?: string;
  status?: ProductStatus;
  variants: VariantInput[];
  media?: MediaInput[];
}

export interface UpdateProductBody {
  categoryId?: string;
  brand?: string;
  name?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  status?: ProductStatus;
}
