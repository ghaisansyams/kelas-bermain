import type { Metadata } from "next";
import { EventsView } from "@/components/admin/events-view";

export const metadata: Metadata = { title: "Event" };

export default function AdminEventsPage() {
  return <EventsView />;
}
