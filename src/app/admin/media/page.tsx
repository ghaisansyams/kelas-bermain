import Link from "next/link";
import { deleteMediaAction, updateAltTextAction } from "@/app/admin/media/actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { MediaUploader } from "@/components/admin/media-uploader";
import { requireAdmin } from "@/lib/admin/auth";
import { formatFileSize, type MediaItem } from "@/lib/admin/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { tone: "success" | "error"; text: string }> = {
  deleted: { tone: "success", text: "Gambar dihapus." },
  saved: { tone: "success", text: "Teks alternatif tersimpan." },
  error: { tone: "error", text: "Aksi gagal. Coba lagi." },
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("media")
    .select("id, file_name, storage_path, public_url, alt_text, mime_type, file_size, folder, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (data ?? []) as MediaItem[];
  const notice = status ? STATUS[status] : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Gambar yang diunggah di sini bisa dipakai di CMS, tersimpan di Supabase Storage."
        action={
          <Link
            href="/admin/cms/home"
            className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            Pakai di CMS — Home
          </Link>
        }
      />

      <Notice tone="info">
        Mengunggah saja belum mengubah website. Setelah unggah, buka CMS — Home, bagian
        &quot;Gambar hero (carousel)&quot;, pilih gambarnya, lalu klik Publish.
      </Notice>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? (
        <Notice tone="error">
          Media gagal dimuat. Pastikan supabase/media-schema.sql sudah dijalankan.
        </Notice>
      ) : null}

      <Card>
        <MediaUploader />
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Belum ada gambar. Unggah lewat tombol di atas.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="space-y-3 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from Supabase Storage */}
              <img
                src={item.public_url}
                alt={item.alt_text || item.file_name}
                className="aspect-[4/3] w-full rounded-xl border border-line object-cover"
              />
              <div>
                <p className="truncate text-sm font-bold text-ink">{item.file_name}</p>
                <p className="text-xs text-muted">
                  {item.folder} · {formatFileSize(item.file_size)}
                </p>
              </div>

              <form action={updateAltTextAction} className="space-y-2">
                <input type="hidden" name="id" value={item.id} />
                <label className="block text-xs font-semibold text-ink" htmlFor={`alt-${item.id}`}>
                  Teks alternatif
                </label>
                <input
                  id={`alt-${item.id}`}
                  name="altText"
                  defaultValue={item.alt_text}
                  placeholder="Jelaskan isi gambar"
                  className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
                >
                  Simpan
                </button>
              </form>

              <form action={deleteMediaAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="storagePath" value={item.storage_path} />
                <button
                  type="submit"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Hapus gambar
                </button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
