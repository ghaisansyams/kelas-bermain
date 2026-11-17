/**
 * Menggambar sertifikat menjadi file yang bisa diunduh, sepenuhnya di browser.
 *
 * Sertifikat adalah gambar rancangan Canva dengan dua tulisan di atasnya (nama
 * dan nomor). Alih-alih membuat PDF di server — yang butuh browser tanpa layar
 * atau pustaka font — gambar dan teks digambar ke satu kanvas dengan rumus
 * posisi yang sama seperti `TemplateCanvas`, lalu kanvas itu disimpan sebagai
 * PNG atau dibungkus menjadi PDF satu halaman. Hasil unduhan karenanya sama
 * dengan yang dilihat di layar.
 */

import {
  fieldText,
  PAGE_SIZE,
  type CertificateData,
  type CertificateTemplate,
  type FieldKey,
} from "@/lib/cms/certificate-template";

/** Lebar kanvas dalam piksel: A4 pada sekitar 200 dpi. */
const LONG_SIDE_PX = 2339;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Gambar latar dimuat sekali per alamat, supaya ratusan sertifikat tidak memuatnya ratusan kali. */
function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => {
      imageCache.delete(src);
      reject(new Error("Gambar sertifikat gagal dimuat."));
    };
    image.src = src;
  });
  imageCache.set(src, loading);
  return loading;
}

/** Keluarga huruf bawaan website, sebagaimana dipakai CSS halaman ini. */
function siteFontFamily(): string {
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const attempt = `${current} ${word}`;
    if (context.measureText(attempt).width <= maxWidth) current = attempt;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

export interface RenderOptions {
  /**
   * Nama panjang dikecilkan sampai muat satu baris (paling kecil 55% dari
   * ukuran yang diatur), baru dipecah ke dua baris kalau masih tidak muat.
   * Dipakai untuk sertifikat massal, di mana tidak ada yang memeriksa satu-satu.
   */
  fitNameToOneLine?: boolean;
}

export async function renderCertificateCanvas(
  template: CertificateTemplate,
  data: CertificateData,
  options: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const page = PAGE_SIZE[template.orientation];
  const scale = LONG_SIDE_PX / Math.max(page.width, page.height);
  const width = Math.round(page.width * scale);
  const height = Math.round(page.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ini tidak bisa membuat gambar sertifikat.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  // Latar dipotong menutupi halaman, seperti `object-cover` di layar.
  const background = await loadImage(template.backgroundUrl);
  const cover = Math.max(width / background.naturalWidth, height / background.naturalHeight);
  const drawW = background.naturalWidth * cover;
  const drawH = background.naturalHeight * cover;
  context.drawImage(background, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);

  const values: Record<FieldKey, string> = {
    participantName: data.participantName,
    certificateNumber: data.certificateNumber,
  };

  for (const key of Object.keys(template.config.fields) as FieldKey[]) {
    const field = template.config.fields[key];
    if (!field.enabled) continue;

    const family = field.fontFamily || siteFontFamily();
    let fontPx = (field.fontSize / page.width) * width;
    const font = `${field.fontWeight} ${fontPx}px ${family}`;
    // Huruf yang belum pernah dipakai di halaman ini belum terunduh; tanpa
    // menunggu, teks tergambar dengan huruf cadangan.
    await document.fonts.load(font, fieldText(field, values[key])).catch(() => []);

    context.font = font;
    context.fillStyle = field.color;
    context.textAlign = field.align;
    context.textBaseline = "middle";

    const boxWidth = (field.width / 100) * width;
    const centerX = (field.x / 100) * width;
    const centerY = (field.y / 100) * height;
    const anchorX =
      field.align === "left"
        ? centerX - boxWidth / 2
        : field.align === "right"
          ? centerX + boxWidth / 2
          : centerX;

    const text = fieldText(field, values[key]);
    if (options.fitNameToOneLine && key === "participantName") {
      const smallest = fontPx * 0.55;
      while (fontPx > smallest && context.measureText(text).width > boxWidth) {
        fontPx *= 0.95;
        context.font = `${field.fontWeight} ${fontPx}px ${family}`;
      }
    }

    const lines = wrapLines(context, text, boxWidth);
    const lineHeight = fontPx * 1.2;
    const top = centerY - (lines.length * lineHeight) / 2;
    lines.forEach((line, index) => {
      context.fillText(line, anchorX, top + lineHeight * (index + 0.5));
    });
  }

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat berkas sertifikat."))),
      type,
      quality,
    );
  });
}

export interface PdfPage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/** PDF A4 dengan satu gambar JPEG penuh per halaman. */
export function buildPdf(pages: PdfPage[], orientation: "LANDSCAPE" | "PORTRAIT"): Blob {
  const page = PAGE_SIZE[orientation];
  // Milimeter ke poin PDF (1 poin = 1/72 inci).
  const pw = ((page.width / 25.4) * 72).toFixed(2);
  const ph = ((page.height / 25.4) * 72).toFixed(2);

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  // Objek 1 = katalog, 2 = daftar halaman; tiap halaman memakai tiga objek
  // berurutan: halaman, gambar, isi.
  const pageId = (index: number) => 3 + index * 3;

  push("%PDF-1.4\n");
  startObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  startObject(2);
  push(
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`,
  );

  pages.forEach((item, index) => {
    const id = pageId(index);
    startObject(id);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] ` +
        `/Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>\nendobj\n`,
    );
    startObject(id + 1);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${item.width} /Height ${item.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${item.jpeg.length} >>\nstream\n`,
    );
    push(item.jpeg);
    push("\nendstream\nendobj\n");
    startObject(id + 2);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });

  const objectCount = 3 + pages.length * 3;
  const xrefAt = length;
  push(`xref\n0 ${objectCount}\n0000000000 65535 f \n`);
  for (let id = 1; id < objectCount; id += 1) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export async function canvasToJpegPage(canvas: HTMLCanvasElement, quality = 0.92): Promise<PdfPage> {
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
}

async function canvasToPdf(canvas: HTMLCanvasElement, orientation: "LANDSCAPE" | "PORTRAIT") {
  return buildPdf([await canvasToJpegPage(canvas)], orientation);
}

/** Nama orang menjadi bagian nama berkas: tanpa aksen, spasi, atau tanda baca. */
export function fileSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "Peserta"
  );
}

export function safeFileName(name: string, number: string, extension: string): string {
  return `Sertifikat-${fileSlug(name)}-${number}.${extension}`;
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Ditunda: Safari membatalkan unduhan kalau tautannya dicabut seketika.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadCertificate(
  template: CertificateTemplate,
  data: CertificateData,
  format: "pdf" | "png",
): Promise<void> {
  const canvas = await renderCertificateCanvas(template, data);
  if (format === "png") {
    saveBlob(
      await canvasToBlob(canvas, "image/png"),
      safeFileName(data.participantName, data.certificateNumber, "png"),
    );
    return;
  }
  saveBlob(
    await canvasToPdf(canvas, template.orientation),
    safeFileName(data.participantName, data.certificateNumber, "pdf"),
  );
}
