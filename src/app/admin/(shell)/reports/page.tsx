import type { Metadata } from "next";
import { ReportsView } from "@/components/admin/reports-view";

export const metadata: Metadata = { title: "Laporan" };

export default function AdminReportsPage() {
  return <ReportsView />;
}
