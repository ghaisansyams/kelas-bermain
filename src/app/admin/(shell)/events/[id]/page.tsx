import type { Metadata } from "next";
import { EventDetailView } from "@/components/admin/event-detail-view";

export const metadata: Metadata = { title: "Detail Event" };

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventDetailView eventId={id} />;
}
