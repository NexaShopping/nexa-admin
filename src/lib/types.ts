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
  resourceType?: "image";
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

// --- Inventory (from API.md · Inventory Phase 3) ---

export interface StockItemView {
  id: string;
  variant: {
    id: string;
    sku: string;
    name: string;
    mrp: string;
    product: { id: string; name: string; slug: string; brand: string };
  };
  onHand: number;
  reserved: number;
  available: number;
  sellPrice: string;
  discountPrice: string | null;
  minimumRetailPrice: string | null;
  customerPrice: string | null;
  taxRatePct: string;
  isListed: boolean;
  lowStockAt: number | null;
}

export interface StockLedgerEntry {
  id: string;
  delta: number;
  onHandAfter: number;
  reservedAfter: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  unitCost: string | null;
  batchNo: string | null;
  note: string | null;
  createdAt: string;
}

export interface ReceiveStockBody {
  variantId: string;
  quantity: number;
  sellPrice: string;
  discountPrice?: string;
  minimumRetailPrice: string;
  customerPrice: string;
  taxRatePct?: string;
  unitCost?: string;
  batchNo?: string;
  expiryAt?: string;
  note?: string;
}

export interface UpdateStockItemBody {
  sellPrice?: string;
  discountPrice?: string | null;
  minimumRetailPrice?: string;
  customerPrice?: string;
  taxRatePct?: string;
  isListed?: boolean;
  lowStockAt?: number;
}

export interface AdjustStockBody {
  delta: number;
  reason: "ADJUSTMENT" | "DAMAGE" | "RETURN_IN";
  note?: string;
}

export interface TransferStockBody {
  variantId: string;
  toAccountId: string;
  quantity: number;
  unitCost?: string;
  sellPrice?: string;
  note?: string;
}

// --- Accounts (from API.md · Accounts Phase 1) ---

export interface AccountSummary {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
  distributor: {
    businessName: string;
    referralCode: string;
    territory: string | null;
    onboardedAt: string | null;
  } | null;
}

export interface CreateDistributorBody {
  name: string;
  phone: string;
  businessName: string;
  territory?: string;
  referredByAccountId?: string;
  status?: "PENDING" | "ACTIVE";
  credit?: { enabled: boolean; limit: string };
}

export type CreditAccountStatus = "ACTIVE" | "SUSPENDED";
export interface CreditSummary {
  accountId: string; distributorAccountId: string; creditLimit: string; currentBalance: string;
  availableCredit: string; status: CreditAccountStatus; termDays: number; hasOverdueCharges: boolean; nextDueAt: string | null;
}
export interface CreditCharge {
  id: string; orderId: string; principalAmount: string; outstandingAmount: string; dueAt: string;
  status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "REVERSED"; createdAt: string; updatedAt: string;
}
export interface CreditLedgerEntry {
  id: string; direction: "DEBIT" | "CREDIT"; reason: string; amount: string; balanceAfter: string;
  sourceType: string; sourceId: string; note: string | null; createdAt: string;
}
export interface CreditRepayment {
  id: string; amount: string; method: "PHONEPE" | "OFFLINE"; status: "PENDING" | "SUCCESS" | "FAILED";
  externalReference: string | null; paidAt: string | null; createdAt: string; updatedAt: string;
}
export interface DistributorPayable {
  id: string; orderId: string; distributorAccountId: string; amount: string; status: "HELD" | "PAYABLE" | "PAID";
  eligibleAt: string | null; paidAt: string | null; createdAt: string; updatedAt: string;
  order: { orderNo: string; deliveredAt: string | null; grandTotal: string };
  distributor: { name: string | null; phone: string | null; distributorProfile: { businessName: string } | null };
}
export interface DistributorPayout {
  id: string; distributorAccountId: string; amount: string; method: string; externalReference: string;
  paidAt: string; createdAt: string; allocations: Array<{ id: string; payableId: string; amount: string; createdAt: string }>;
}

export interface UpdateAccountBody {
  name?: string;
  avatarUrl?: string;
  status?: AccountStatus;
  businessName?: string;
  territory?: string;
}

// --- Orders (from API.md · Cart & Orders Phase 4) ---

export type OrderStatus = "AWAITING_PAYMENT" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type OrderChannel = "WEB" | "APP" | "DISTRIBUTOR_ASSISTED";

export interface OrderAddress {
  contactName: string;
  contactPhone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface OrderItemView {
  id: string;
  sku: string;
  productName: string;
  variantLabel: string;
  unitPrice: string;
  quantity: number;
  discount: string;
  taxRatePct: string;
  taxAmount: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  orderNo: string;
  buyerAccountId: string;
  sellerAccountId: string;
  channel: OrderChannel;
  status: OrderStatus;
  paymentStatus: "UNPAID";
  fulfilmentStatus: "PENDING" | "SHIPPED" | "DELIVERED";
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  shippingTotal: string;
  grandTotal: string;
  currency: string;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  items: OrderItemView[];
  placedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}
