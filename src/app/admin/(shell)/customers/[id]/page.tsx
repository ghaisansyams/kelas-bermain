import type { Metadata } from "next";
import { CustomerDetailView } from "@/components/admin/customer-detail-view";

export const metadata: Metadata = { title: "Detail Orang Tua" };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerDetailView customerId={id} />;
}
