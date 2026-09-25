import type { Metadata } from "next";
import { ChildrenView } from "@/components/admin/children-view";

export const metadata: Metadata = { title: "Anak" };

export default function AdminChildrenPage() {
  return <ChildrenView />;
}
