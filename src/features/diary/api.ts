import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { diaryDateBounds } from "./date-filter";

export type DiaryStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVERSED";

export interface DiaryPerson {
  id: string;
  name: string | null;
  phone: string | null;
}

export interface DiaryAuditEvent {
  id: string;
  action: string;
  actorAccountId: string;
  fromStatus: DiaryStatus | null;
  toStatus: DiaryStatus;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface DiaryEntry {
  id: string;
  referenceCode: string;
  customer: DiaryPerson;
  collectorDistributorAccountId: string | null;
  collectorDistributor: DiaryPerson | null;
  createdByAccountId: string;
  amount: string;
  currency: "INR";
  cashReceivedAt: string;
  createdAt: string;
  status: DiaryStatus;
  notes: string | null;
  reason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  auditEvents?: DiaryAuditEvent[];
}

export interface DiaryOverview {
  approvedTotal: string;
  currency: "INR";
  approvedEntryCount: number;
  pendingCount: number;
  recentEntries: DiaryEntry[];
}

export interface DiaryFilters {
  page: number;
  limit: number;
  status?: DiaryStatus;
  customerAccountId?: string;
  distributorAccountId?: string;
  from?: string;
  to?: string;
}

export interface DiaryPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function diaryQueryString(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export function useDiaryOverview() {
  return useQuery({ queryKey: ["diary", "overview"], queryFn: () => api.get<DiaryOverview>("/diary/admin/overview") });
}

export function useDiaryEntries(filters: DiaryFilters) {
  return useQuery({
    queryKey: ["diary", "entries", filters],
    queryFn: () => api.getPage<{ entries: DiaryEntry[] }>(`/diary/admin/entries?${diaryQueryString({ ...filters, ...diaryDateBounds(filters) })}`) as Promise<{ data: { entries: DiaryEntry[] }; meta?: DiaryPageMeta }>,
    placeholderData: (previous) => previous,
  });
}

export function useDiaryCustomers(query: string) {
  return useQuery({
    queryKey: ["diary", "customers", query],
    queryFn: () => api.getPage<{ customers: (DiaryPerson & { status: string })[] }>(`/diary/admin/customers?${diaryQueryString({ query, page: 1, limit: 20 })}`),
    enabled: query.trim().length >= 2,
  });
}

export function useDiaryCustomer(id: string | null, page: number) {
  return useQuery({
    queryKey: ["diary", "customer", id, page],
    queryFn: () => api.getPage<{ customer: DiaryPerson; approvedTotal: string; entries: DiaryEntry[] }>(`/diary/admin/customers/${id}?page=${page}&limit=20`) as Promise<{ data: { customer: DiaryPerson; approvedTotal: string; entries: DiaryEntry[] }; meta?: DiaryPageMeta }>,
    enabled: Boolean(id),
  });
}

function useDiaryMutation<T>(request: (body: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => client.invalidateQueries({ queryKey: ["diary"] }),
  });
}

export function useCreateDiaryEntry() {
  return useDiaryMutation((body: { customerAccountId: string; amount: string; cashReceivedAt: string; notes?: string; idempotencyKey: string; confirmed: true }) => api.post("/diary/admin/entries", body));
}

export function useApproveDiaryEntry() {
  return useDiaryMutation((id: string) => api.post(`/diary/admin/entries/${id}/approve`, {}));
}

export function useRejectDiaryEntry() {
  return useDiaryMutation(({ id, reason }: { id: string; reason: string }) => api.post(`/diary/admin/entries/${id}/reject`, { reason }));
}

export function useReverseDiaryEntry() {
  return useDiaryMutation(({ id, reason }: { id: string; reason: string }) => api.post(`/diary/admin/entries/${id}/reverse`, { reason }));
}
