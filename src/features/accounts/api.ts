import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AccountSummary, CreateDistributorBody, Role, AccountStatus, UpdateAccountBody } from "@/lib/types";

// Typed wrappers over src/lib/api.ts + the TanStack Query hooks the accounts screens use.

export interface AccountFilters {
  role?: Role;
  status?: AccountStatus;
  q?: string;
}

function accountsQueryString(filters: AccountFilters, cursor?: string) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function useAccounts(filters: AccountFilters, cursor?: string) {
  const qs = accountsQueryString(filters, cursor);
  return useQuery({
    queryKey: ["accounts", filters, cursor],
    queryFn: () => api.getPage<{ accounts: AccountSummary[] }>(`/accounts${qs ? `?${qs}` : ""}`),
    placeholderData: (prev) => prev,
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: ["account", id],
    queryFn: () => api.get<{ account: AccountSummary }>(`/accounts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDistributorBody) => api.post<{ account: AccountSummary }>("/accounts/distributors", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAccountBody) => api.patch<{ account: AccountSummary }>(`/accounts/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
