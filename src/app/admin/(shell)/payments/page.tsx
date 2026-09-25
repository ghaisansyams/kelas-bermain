import type { Metadata } from "next";
import { PaymentsView } from "@/components/admin/payments-view";

export const metadata: Metadata = { title: "Pembayaran" };

export default function AdminPaymentsPage() {
  return <PaymentsView />;
}
