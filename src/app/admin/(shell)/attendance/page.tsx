import type { Metadata } from "next";
import { AttendanceView } from "@/components/admin/attendance-view";

export const metadata: Metadata = { title: "Kehadiran" };

export default function AdminAttendancePage() {
  return <AttendanceView />;
}
