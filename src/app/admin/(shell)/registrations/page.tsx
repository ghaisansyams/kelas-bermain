import type { Metadata } from "next";
import { RegistrationsView } from "@/components/admin/registrations-view";

export const metadata: Metadata = { title: "Pendaftaran" };

export default function AdminRegistrationsPage() {
  return <RegistrationsView />;
}
