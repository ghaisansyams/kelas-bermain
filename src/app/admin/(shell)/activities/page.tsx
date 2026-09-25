import type { Metadata } from "next";
import { ActivitiesView } from "@/components/admin/content-views";

export const metadata: Metadata = { title: "Kegiatan" };

export default function AdminActivitiesPage() {
  return <ActivitiesView />;
}
