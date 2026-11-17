"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { TemplateCanvas } from "@/components/certificate/template-canvas";
import {
  buildPdf,
  canvasToJpegPage,
  fileSlug,
  renderCertificateCanvas,
  saveBlob,
  type PdfPage,
} from "@/lib/certificate/render";
import {
  cleanName,
  findNameColumns,
  readSpreadsheet,
  titleCase,
  type NameColumn,
} from "@/lib/certificate/spreadsheet";
import {
  defaultConfig,
  FONT_CHOICES,
  normaliseConfig,
  PAGE_SIZE,
  type CertificateTemplate,
  type TemplateConfig,
} from "@/lib/cms/certificate-template";
import { uploadMediaFile } from "@/lib/admin/upload";

type Design = Pick<CertificateTemplate, "id" | "name" | "backgroundUrl" | "orientation" | "config">;

const UPLOAD = "__upload";
/** PDF gabungan dipecah tiap sekian halaman agar memori komputer lama tidak habis. */
const PAGES_PER_PDF = 100;
const inputClass = "h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-sm font-medium text-ink";

/** Hanya nama peserta yang dicetak; nomor sertifikat tidak dipakai di sini. */
function nameOnly(config: TemplateConfig): TemplateConfig {
  return {
    ...config,
    fields: { ...config.fields, certificateNumber: { ...config.fields.certificateNumber, enabled: false } },
  };
}

function tick() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * Sertifikat massal dari Excel.
 *
 * Untuk sekolah atau instansi yang datanya sudah ada di Excel dan tidak
 * mendaftar lewat website. Desain Canva yang sama dipakai untuk semua nama:
 * unggah daftar, periksa, lalu satu klik menghasilkan ratusan sertifikat.
 *
 * Semuanya berjalan di browser (Excel dibaca di sini, sertifikat digambar di
 * sini) dan tidak ditulis ke database: ini bukan sertifikat peserta event,
 * hanya berkas untuk diunduh dan dicetak.
 */
export function BulkCertificates({ designs }: { designs: Design[] }) {
  const usable = designs.filter((d) => d.backgroundUrl);

  const [designId, setDesignId] = useState(usable[0]?.id ?? UPLOAD);
  const [uploaded, setUploaded] = useState<{ url: string; orientation: "LANDSCAPE" | "PORTRAIT" } | null>(null);
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [designError, setDesignError] = useState<string | null>(null);

  const initialDesign = usable[0];
  const [config, setConfig] = useState<TemplateConfig>(() =>
    nameOnly(initialDesign ? normaliseConfig(initialDesign.config) : defaultConfig()),
  );

  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<NameColumn[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [caseMode, setCaseMode] = useState<"asli" | "kapital">("asli");
  const [dedupe, setDedupe] = useState(true);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [format, setFormat] = useState<"pdf" | "zip">("pdf");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const selected = designs.find((d) => d.id === designId);
  const backgroundUrl = designId === UPLOAD ? (uploaded?.url ?? "") : (selected?.backgroundUrl ?? "");
  const orientation = designId === UPLOAD ? (uploaded?.orientation ?? "LANDSCAPE") : (selected?.orientation ?? "LANDSCAPE");
  const designName = designId === UPLOAD ? "Desain unggahan" : (selected?.name ?? "Sertifikat");

  /** Daftar akhir: kolom yang dicentang, dirapikan, tanpa kembar, tanpa yang dibuang. */
  const entries = useMemo(() => {
    const seen = new Map<string, number>();
    const out: { id: string; name: string }[] = [];
    for (const column of columns) {
      if (!checked.has(column.key)) continue;
      for (const raw of column.names) {
        const name = caseMode === "kapital" ? titleCase(raw) : raw;
        const lower = name.toLocaleLowerCase("id-ID");
        const occurrence = (seen.get(lower) ?? 0) + 1;
        seen.set(lower, occurrence);
        if (dedupe && occurrence > 1) continue;
        out.push({ id: `${lower}#${occurrence}`, name });
      }
    }
    return out;
  }, [columns, checked, caseMode, dedupe]);

  const visible = entries.filter((entry) => !removed.has(entry.id));
  const duplicates = useMemo(() => {
    const names = columns.filter((c) => checked.has(c.key)).flatMap((c) => c.names);
    return names.length - new Set(names.map((n) => n.toLocaleLowerCase("id-ID"))).size;
  }, [columns, checked]);
  const preview = visible.find((entry) => entry.id === previewId) ?? visible[0];
  const longest = visible.reduce<(typeof visible)[number] | null>(
    (best, entry) => (!best || entry.name.length > best.name.length ? entry : best),
    null,
  );
  const running = progress !== null;

  function chooseDesign(id: string) {
    setDesignId(id);
    setDesignError(null);
    const next = designs.find((d) => d.id === id);
    setConfig(nameOnly(next ? normaliseConfig(next.config) : defaultConfig()));
  }

  async function uploadDesign(file: File) {
    setDesignError(null);
    if (!file.type.startsWith("image/")) {
      setDesignError("Desain harus berupa gambar (PNG atau JPG hasil ekspor Canva).");
      return;
    }
    setUploadingDesign(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", "certificate");
      const response = await uploadMediaFile(form);
      if (!response.ok) {
        setDesignError(response.error);
        return;
      }
      // Arah halaman dibaca dari gambarnya, jadi tidak perlu dipilih manual.
      const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
        image.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
        image.src = response.url;
      });
      setUploaded({ url: response.url, orientation: size.w >= size.h ? "LANDSCAPE" : "PORTRAIT" });
      setDesignId(UPLOAD);
      setConfig(nameOnly(defaultConfig()));
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : "Desain gagal diunggah.");
    } finally {
      setUploadingDesign(false);
    }
  }

  async function loadSheet(file: File) {
    setSheetError(null);
    setResult(null);
    setRunError(null);
    setReading(true);
    try {
      const sheets = await readSpreadsheet(file);
      const found = findNameColumns(sheets);
      if (found.length === 0) {
        setColumns([]);
        setSheetError("Tidak ada kolom nama yang ditemukan. Pastikan ada kolom berjudul \"Nama\" atau kolom yang berisi nama peserta.");
        return;
      }
      setFileName(file.name);
      setColumns(found);
      // Kolom berjudul "Nama" langsung dicentang; tanpa judul, hanya yang terbanyak.
      const headed = found.filter((c) => c.fromHeading);
      setChecked(new Set((headed.length > 0 ? headed : found.slice(0, 1)).map((c) => c.key)));
      setRemoved(new Set());
      setPreviewId(null);
    } catch (error) {
      setColumns([]);
      setSheetError(error instanceof Error ? error.message : "Berkas tidak bisa dibaca.");
    } finally {
      setReading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadSheet(file);
  }

  function patchName(changes: Partial<TemplateConfig["fields"]["participantName"]>) {
    setConfig((current) => ({
      ...current,
      fields: { ...current.fields, participantName: { ...current.fields.participantName, ...changes } },
    }));
  }

  async function generate() {
    if (visible.length === 0 || !backgroundUrl) return;
    cancelled.current = false;
    setRunError(null);
    setResult(null);
    setProgress({ done: 0, total: visible.length });

    const template: CertificateTemplate = {
      id: designId,
      name: designName,
      description: "",
      backgroundUrl,
      orientation,
      config,
      status: "PUBLISHED",
      isDefault: false,
    };

    try {
      let pages: PdfPage[] = [];
      const files: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      const stamp = fileSlug(designName);
      const parts = Math.ceil(visible.length / PAGES_PER_PDF);

      // Satu bagian PDF langsung diunduh begitu penuh, lalu dibuang dari memori.
      const flushPdf = async () => {
        if (pages.length === 0) return;
        const partNo = Math.ceil(saved / PAGES_PER_PDF) + 1;
        const label = parts > 1 ? `bagian-${partNo}-dari-${parts}` : `${visible.length}-nama`;
        saveBlob(buildPdf(pages, orientation), `Sertifikat-${stamp}-${label}.pdf`);
        saved += pages.length;
        pages = [];
        // Jeda antarunduhan: browser menolak beberapa unduhan yang mulai di detik yang sama.
        await new Promise((resolve) => setTimeout(resolve, 600));
      };
      let saved = 0;

      for (let index = 0; index < visible.length; index += 1) {
        if (cancelled.current) {
          setResult(saved > 0 ? `Dibatalkan. ${saved} sertifikat pertama sudah terunduh.` : "Dibatalkan. Tidak ada berkas yang diunduh.");
          return;
        }
        const { name } = visible[index];
        const canvas = await renderCertificateCanvas(
          template,
          { participantName: name, certificateNumber: "" },
          { fitNameToOneLine: true },
        );
        const page = await canvasToJpegPage(canvas, 0.85);
        // Kanvas besar tidak dilepas otomatis; tanpa ini ratusan kanvas menumpuk di memori.
        canvas.width = 0;
        canvas.height = 0;

        if (format === "pdf") {
          pages.push(page);
          if (pages.length >= PAGES_PER_PDF) await flushPdf();
        } else {
          // Nama kembar yang sengaja dipertahankan tetap mendapat berkas sendiri.
          let base = `Sertifikat-${fileSlug(name)}`;
          for (let n = 2; used.has(base); n += 1) base = `Sertifikat-${fileSlug(name)}-${n}`;
          used.add(base);
          files[`${base}.pdf`] = new Uint8Array(await buildPdf([page], orientation).arrayBuffer());
        }

        setProgress({ done: index + 1, total: visible.length });
        await tick();
      }

      if (format === "pdf") await flushPdf();
      else {
        const { zipSync } = await import("fflate");
        // PDF berisi JPEG yang sudah terkompresi; mengompresnya lagi hanya memperlambat.
        const zipped = zipSync(files, { level: 0 });
        saveBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), `Sertifikat-${stamp}-${visible.length}-nama.zip`);
      }
      setResult(`Selesai: ${visible.length} sertifikat dibuat dan diunduh.`);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Sertifikat gagal dibuat.");
    } finally {
      setProgress(null);
    }
  }

  const nameField = config.fields.participantName;
  const page = PAGE_SIZE[orientation];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-extrabold text-ink">Sertifikat massal dari Excel</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Untuk sekolah atau instansi yang daftar namanya sudah di Excel. Pilih desain, unggah
          Excel, dan ratusan sertifikat dibuat sekaligus dengan desain yang sama. Hanya nama
          yang diisi, tanpa nomor registrasi. Berkasnya diproses di browser ini dan tidak
          disimpan di database.
        </p>
      </div>

      {/* 1. Desain */}
      <section className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted">1. Desain sertifikat</h4>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-xs font-bold text-ink">
            Pakai desain
            <select value={designId} onChange={(e) => chooseDesign(e.target.value)} className={`${inputClass} mt-1`} disabled={running}>
              {usable.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value={UPLOAD}>Unggah desain baru dari Canva…</option>
            </select>
          </label>
          <label
            className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-pill border border-line px-4 text-xs font-bold text-ink-soft hover:border-brand/40 hover:text-brand ${running ? "pointer-events-none opacity-50" : ""}`}
          >
            {uploadingDesign ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            Unggah desain (PNG/JPG)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadDesign(file);
              }}
            />
          </label>
        </div>
        {designError ? (
          <p role="alert" className="text-xs font-medium text-brand-ink">
            {designError}
          </p>
        ) : null}
        <p className="text-xs leading-relaxed text-muted">
          Ekspor desain dari Canva sebagai gambar yang <strong>kosong di bagian nama</strong>, lalu
          unggah. Desain yang pernah diunggah ada di daftar, dan template di bawah juga muncul di sini.
        </p>
      </section>

      {/* 2. Excel */}
      <section className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted">2. Daftar nama (Excel)</h4>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? "border-brand bg-brand-soft/60" : "border-line bg-canvas-deep/30 hover:border-brand/40"
          } ${running ? "pointer-events-none opacity-50" : ""}`}
        >
          {reading ? (
            <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
          ) : (
            <FileSpreadsheet className="size-6 text-brand" aria-hidden />
          )}
          <span className="text-sm font-bold text-ink">
            {fileName ? `${fileName} — klik atau seret untuk mengganti` : "Seret berkas Excel ke sini, atau klik untuk memilih"}
          </span>
          <span className="text-xs text-muted">
            .xlsx atau .csv. Kolom nama dicari otomatis dari judul &quot;Nama …&quot;; beberapa tabel
            berdampingan juga terbaca.
          </span>
          <input
            type="file"
            accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void loadSheet(file);
            }}
          />
        </label>
        {sheetError ? (
          <p role="alert" className="text-xs font-medium text-brand-ink">
            {sheetError}
          </p>
        ) : null}

        {columns.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold text-ink">Ambil nama dari kolom:</p>
            <ul className="space-y-1.5">
              {columns.map((column) => (
                <li key={column.key}>
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      checked={checked.has(column.key)}
                      disabled={running}
                      onChange={(e) => {
                        setChecked((current) => {
                          const next = new Set(current);
                          if (e.target.checked) next.add(column.key);
                          else next.delete(column.key);
                          return next;
                        });
                        setRemoved(new Set());
                      }}
                      className="mt-0.5 size-4 accent-[var(--color-brand)]"
                    />
                    <span>
                      <span className="font-bold text-ink">
                        {columns.length > 1 || column.sheet !== "CSV" ? `${column.sheet} · ` : ""}Kolom {column.columnLetter}
                        {column.heading ? ` (${column.heading})` : ""}
                      </span>
                      {" "}
                      — {column.names.length} nama, mis. {column.names.slice(0, 2).join(", ")}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 3. Periksa */}
      {visible.length > 0 || entries.length > 0 ? (
        <section className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted">3. Periksa nama dan posisi</h4>

          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3">
              <TemplateCanvas
                config={config}
                backgroundUrl={backgroundUrl}
                orientation={orientation}
                data={{ participantName: preview?.name ?? "Nama Peserta", certificateNumber: "" }}
                selected="participantName"
                onSelect={() => {}}
                onMove={(_, x, y) => patchName({ x, y })}
                onResize={(_, fontSize) => patchName({ fontSize })}
              />
              <p className="text-xs leading-relaxed text-muted">
                Seret nama di atas desain ke tempat yang pas, dan seret bulatan merah di sudutnya
                untuk mengubah ukuran. Pengaturan ini hanya untuk unduhan ini dan tidak mengubah
                template. Nama yang terlalu panjang otomatis dikecilkan agar muat satu baris.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block text-xs font-bold text-ink">
                  Ukuran huruf
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={nameField.fontSize}
                    onChange={(e) => patchName({ fontSize: Math.min(120, Math.max(6, Number(e.target.value) || 6)) })}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Warna
                  <input
                    type="color"
                    value={nameField.color}
                    onChange={(e) => patchName({ color: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-surface p-1"
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Huruf
                  <select value={nameField.fontFamily} onChange={(e) => patchName({ fontFamily: e.target.value })} className={`${inputClass} mt-1`}>
                    {FONT_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold text-ink">
                  Tebal
                  <select value={nameField.fontWeight} onChange={(e) => patchName({ fontWeight: Number(e.target.value) })} className={`${inputClass} mt-1`}>
                    <option value={400}>Normal</option>
                    <option value={600}>Agak tebal</option>
                    <option value={700}>Tebal</option>
                    <option value={800}>Sangat tebal</option>
                  </select>
                </label>
              </div>
              <p className="text-xs text-muted">
                Halaman {orientation === "LANDSCAPE" ? "lanskap" : "potret"} A4 ({page.width}×{page.height} mm), terbaca dari desain.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-ink">{visible.length} nama</p>
                {longest ? (
                  <button
                    type="button"
                    onClick={() => setPreviewId(longest.id)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Lihat nama terpanjang
                  </button>
                ) : null}
              </div>

              <label className="block text-xs font-bold text-ink">
                Huruf nama
                <select value={caseMode} onChange={(e) => setCaseMode(e.target.value as "asli" | "kapital")} className={`${inputClass} mt-1`}>
                  <option value="asli">Sesuai Excel</option>
                  <option value="kapital">Huruf Awal Kapital Semua (Budi Santoso)</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-ink-soft">
                <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
                <span>
                  Buang nama kembar
                  {duplicates > 0 ? ` (${duplicates} nama sama ditemukan)` : " (tidak ada yang kembar)"}
                </span>
              </label>

              <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line text-sm">
                {visible.map((entry, index) => (
                  <li key={entry.id} className={`flex items-center gap-2 px-2.5 py-1.5 ${preview?.id === entry.id ? "bg-brand-soft/50" : ""}`}>
                    <span className="w-7 shrink-0 text-right text-[0.6875rem] text-muted">{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewId(entry.id)}
                      className="min-w-0 flex-1 truncate text-left font-medium text-ink hover:text-brand"
                      title="Lihat di pratinjau"
                    >
                      {cleanName(entry.name)}
                    </button>
                    <button
                      type="button"
                      aria-label={`Buang ${entry.name} dari daftar`}
                      disabled={running}
                      onClick={() => setRemoved((current) => new Set(current).add(entry.id))}
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-brand"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              {removed.size > 0 ? (
                <button type="button" onClick={() => setRemoved(new Set())} className="text-xs font-semibold text-brand hover:underline">
                  Kembalikan {removed.size} nama yang dibuang
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. Buat */}
      {visible.length > 0 ? (
        <section className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted">4. Buat sertifikat</h4>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-bold text-ink">
              Hasil unduhan
              <select value={format} onChange={(e) => setFormat(e.target.value as "pdf" | "zip")} className={`${inputClass} mt-1 block sm:w-96`} disabled={running}>
                <option value="pdf">PDF berisi semua halaman, siap cetak (dipecah per {PAGES_PER_PDF} halaman)</option>
                <option value="zip">ZIP berisi satu PDF per nama (untuk dikirim satu-satu)</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={running || !backgroundUrl}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-pill bg-brand px-5 text-sm font-bold text-white hover:bg-brand-ink disabled:opacity-60"
            >
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
              {running ? "Membuat…" : `Buat ${visible.length} sertifikat`}
            </button>
            {running ? (
              <button
                type="button"
                onClick={() => {
                  cancelled.current = true;
                }}
                className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink-soft hover:border-brand/40"
              >
                Batalkan
              </button>
            ) : null}
          </div>

          {!backgroundUrl ? (
            <p className="text-xs font-medium text-brand-ink">Pilih atau unggah desain dulu.</p>
          ) : null}

          {progress ? (
            <div aria-live="polite" className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-pill bg-canvas-deep">
                <div className="h-full rounded-pill bg-brand transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-muted">
                {progress.done} dari {progress.total} selesai. Jangan tutup atau pindah dari halaman ini
                sampai berkasnya terunduh.
              </p>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              Sekitar 1 detik per sertifikat di komputer biasa, jadi 300 nama bisa memakan beberapa
              menit. Berkas diunduh otomatis begitu selesai.
              {visible.length > PAGES_PER_PDF && format === "pdf"
                ? ` Karena lebih dari ${PAGES_PER_PDF} nama, hasilnya beberapa file PDF; kalau browser bertanya, izinkan unduhan berganda.`
                : ""}
            </p>
          )}

          {result ? (
            <p role="status" className="rounded-xl border border-pine/30 bg-pine-soft/60 p-3 text-sm font-medium text-pine-dark">
              {result}
            </p>
          ) : null}
          {runError ? (
            <p role="alert" className="rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm font-medium text-brand-ink">
              {runError}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
