"use client";

import { useOrderInvoice } from "@/features/orders/api";
import { Button } from "@/components/ui";

// `ready` should be true from SHIPPED onward: the server generates the invoice at shipment
// (dispatch), not delivery — GST law requires the invoice at or before removal of goods.
export function InvoiceDownload({ orderId, ready }: { orderId: string; ready: boolean }) {
  const invoice = useOrderInvoice(orderId, ready);
  if (!ready) return null;
  if (invoice.isLoading) return <Button size="sm" variant="secondary" disabled>Loading invoice…</Button>;
  if (invoice.isError || !invoice.data) return <Button size="sm" variant="secondary" disabled>Preparing invoice…</Button>;
  return (
    <a href={invoice.data.invoice.pdfUrl} target="_blank" rel="noreferrer">
      <Button size="sm" variant="secondary">Download invoice · {invoice.data.invoice.invoiceNo}</Button>
    </a>
  );
}
