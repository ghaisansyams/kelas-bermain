import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventQrView } from "@/components/admin/event-qr-view";
import { events } from "@/data/events";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = { title: "QR Registrasi" };

export default async function AdminEventQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();

  return <EventQrView event={event} baseUrl={siteConfig.url} />;
}
