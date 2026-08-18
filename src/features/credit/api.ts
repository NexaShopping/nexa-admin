import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreditCharge, CreditLedgerEntry, CreditRepayment, CreditSummary } from "@/lib/types";

export function useCredit(accountId: string) {
  return useQuery({ queryKey: ["credit", accountId], queryFn: () => api.get<{ credit: CreditSummary }>(`/credit/${accountId}`) });
}
export function useCreditCharges(accountId: string) {
  return useQuery({ queryKey: ["credit", accountId, "charges"], queryFn: () => api.get<{ charges: CreditCharge[] }>(`/credit/${accountId}/charges`) });
}
export function useCreditLedger(accountId: string) {
  return useQuery({ queryKey: ["credit", accountId, "ledger"], queryFn: () => api.get<{ entries: CreditLedgerEntry[] }>(`/credit/${accountId}/ledger`) });
}
export function useCreditRepayments(accountId: string) {
  return useQuery({ queryKey: ["credit", accountId, "repayments"], queryFn: () => api.get<{ repayments: CreditRepayment[] }>(`/credit/${accountId}/repayments`) });
}
export function useUpdateCredit(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { creditLimit?: string; status?: "ACTIVE" | "SUSPENDED"; reason: string }) => api.patch<{ credit: CreditSummary }>(`/credit/${accountId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit", accountId] }),
  });
}
export function useOfflineRepayment(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { amount: string; paidAt: string; methodLabel: string; externalReference: string }) => api.post<{ repayment: CreditRepayment }>(`/credit/${accountId}/repayments/offline`, body),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["credit", accountId] }); },
  });
}

