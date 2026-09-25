import type { Metadata } from "next";
import { GalleryView } from "@/components/admin/content-views";

export const metadata: Metadata = { title: "Galeri" };

export default function AdminGalleryPage() {
  return <GalleryView />;
}
