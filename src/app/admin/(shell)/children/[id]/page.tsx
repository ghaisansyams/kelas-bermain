import type { Metadata } from "next";
import { ChildDetailView } from "@/components/admin/child-detail-view";

export const metadata: Metadata = { title: "Detail Anak" };

export default async function AdminChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChildDetailView childId={id} />;
}
