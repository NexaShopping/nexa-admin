import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";

// Typed wrappers over src/lib/api.ts + the TanStack Query hooks the orders screens use.
// Admin has no "buy" side, so the list defaults to role=seller — admin's own sales to
// distributors. GET /orders scopes to the caller (buyer or seller), same endpoint for
// everyone (CONVENTIONS.md) — there is no "all orders platform-wide" view.

export interface OrderFilters {
  role?: "buyer" | "seller";
  status?: OrderStatus;
}

function ordersQueryString(filters: OrderFilters, cursor?: string) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function useOrders(filters: OrderFilters, cursor?: string) {
  const qs = ordersQueryString(filters, cursor);
  return useQuery({
    queryKey: ["orders", filters, cursor],
    queryFn: () => api.getPage<{ orders: Order[] }>(`/orders${qs ? `?${qs}` : ""}`),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order }>(`/orders/${id}`),
    enabled: Boolean(id),
  });
}

export function useCancelOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => api.post<{ order: Order }>(`/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}

// Fulfilment state machine: AWAITING_PAYMENT -> CONFIRMED -> SHIPPED -> DELIVERED. Delivering
// is the transition that actually moves stock (see API.md) — if the buyer is a distributor,
// this is what makes it show up in their own inventory.
function useOrderTransition(id: string, step: "confirm" | "ship" | "deliver") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ order: Order }>(`/orders/${id}/${step}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}

export const useConfirmOrder = (id: string) => useOrderTransition(id, "confirm");
export const useShipOrder = (id: string) => useOrderTransition(id, "ship");
export const useDeliverOrder = (id: string) => useOrderTransition(id, "deliver");
