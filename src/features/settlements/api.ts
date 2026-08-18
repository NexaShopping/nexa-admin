import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DistributorPayable, DistributorPayout } from "@/lib/types";

export function useSettlements(status?: string) {
  return useQuery({
    queryKey: ["settlements", status],
    queryFn: () => api.get<{ payables: DistributorPayable[] }>(`/settlements${status ? `?status=${status}` : ""}`),
  });
}
export function useRecordPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { payableIds: string[]; method: string; paidAt: string; externalReference: string }) => api.post<{ payout: DistributorPayout }>("/settlements/payouts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settlements"] }),
  });
}

