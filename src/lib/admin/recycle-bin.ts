import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  deleteRegistrations,
  removeProofFiles,
  type DeletionStats,
} from "@/lib/admin/delete-records";

/**
 * Tempat sampah ("Terhapus") untuk event, pendamping, dan anak.
 *
 * Cara kerjanya: sebelum data benar-benar dihapus, salinan baris-barisnya
 * (event/pendamping/anak beserta pendaftaran, pembayaran, kehadiran, sertifikat,
 * pemakaian voucher, dan catatan keuangannya) disimpan sebagai JSON di tabel
 * `recycle_bin`. Bagian lain aplikasi tetap melihat data itu sebagai sudah
 * hilang, jadi laporan, kuota, dan halaman publik tidak perlu tahu apa-apa.
 * Memulihkan berarti memasukkan baris-baris itu kembali dengan id aslinya.
 *
 * Setelah 30 hari barisnya dibuang untuk selamanya, bersama berkas bukti
 * transfernya. Berkas itu sengaja tidak dihapus dari disk selama masih ada di
 * tempat sampah, supaya pembayaran yang dipulihkan masih punya buktinya.
 */

type Tx = Prisma.TransactionClient;
type Row = Record<string, unknown>;

export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type BinKind = "EVENT" | "CUSTOMER" | "CHILD";

export interface Snapshot {
  version: 1;
  events: Row[];
  customers: Row[];
  children: Row[];
  registrations: Row[];
  payments: Row[];
  attendance_records: Row[];
  certificates: Row[];
  voucher_redemptions: Row[];
  financial_transactions: Row[];
}

const emptySnapshot = (): Snapshot => ({
  version: 1,
  events: [],
  customers: [],
  children: [],
  registrations: [],
  payments: [],
  attendance_records: [],
  certificates: [],
  voucher_redemptions: [],
  financial_transactions: [],
});

export interface BinDetails extends DeletionStats {
  children?: number;
  whatsapp?: string;
}

/* ------------------------------------------------------------------ */
/* Menyalin                                                            */
/* ------------------------------------------------------------------ */

async function rowsOf(tx: Tx, query: Prisma.Sql): Promise<Row[]> {
  const result = await tx.$queryRaw<{ data: Row[] }[]>(query);
  return result[0]?.data ?? [];
}

/** Salinan pendaftaran beserta seluruh ekornya, diambil sebelum dihapus. */
async function captureRegistrations(tx: Tx, ids: string[], into: Snapshot): Promise<void> {
  if (ids.length === 0) return;
  into.registrations = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from registrations t where t.id = any(${ids}::uuid[])`,
  );
  into.payments = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from payments t where t.registration_id = any(${ids}::uuid[])`,
  );
  into.attendance_records = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from attendance_records t where t.registration_id = any(${ids}::uuid[])`,
  );
  into.certificates = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from certificates t where t.registration_id = any(${ids}::uuid[])`,
  );
  into.voucher_redemptions = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from voucher_redemptions t where t.registration_id = any(${ids}::uuid[])`,
  );

  const referenceIds = [...ids, ...into.payments.map((payment) => String(payment.id))];
  into.financial_transactions = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from financial_transactions t where t.reference_id = any(${referenceIds}::uuid[])`,
  );
}

async function store(
  tx: Tx,
  entry: {
    kind: BinKind;
    label: string;
    code: string;
    details: BinDetails;
    snapshot: Snapshot;
    proofFiles: string[];
    userName: string;
  },
): Promise<void> {
  await tx.recycle_bin.create({
    data: {
      kind: entry.kind,
      label: entry.label,
      code: entry.code,
      details: entry.details as unknown as Prisma.InputJsonValue,
      snapshot: entry.snapshot as unknown as Prisma.InputJsonValue,
      proof_files: entry.proofFiles,
      deleted_by_name: entry.userName,
      expires_at: new Date(Date.now() + RETENTION_DAYS * DAY_MS),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Memindahkan ke tempat sampah (menggantikan hapus langsung)          */
/* ------------------------------------------------------------------ */

export async function moveEventToBin(tx: Tx, eventId: string, userName: string): Promise<BinDetails | null> {
  const snapshot = emptySnapshot();
  snapshot.events = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from events t where t.id = ${eventId}`,
  );
  const event = snapshot.events[0];
  if (!event) return null;

  const registrations = await tx.registrations.findMany({ where: { event_id: eventId }, select: { id: true } });
  const ids = registrations.map((row) => row.id);
  await captureRegistrations(tx, ids, snapshot);

  const removed = await deleteRegistrations(tx, ids);
  await tx.events.delete({ where: { id: eventId } });
  await store(tx, {
    kind: "EVENT",
    label: String(event.title ?? ""),
    code: String(event.slug ?? ""),
    details: removed.stats,
    snapshot,
    proofFiles: removed.proofFiles,
    userName,
  });
  return removed.stats;
}

export async function moveCustomerToBin(tx: Tx, customerId: string, userName: string): Promise<BinDetails | null> {
  const snapshot = emptySnapshot();
  snapshot.customers = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from customers t where t.id = ${customerId}::uuid`,
  );
  const customer = snapshot.customers[0];
  if (!customer) return null;

  snapshot.children = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from children t where t.customer_id = ${customerId}::uuid`,
  );
  const registrations = await tx.registrations.findMany({ where: { customer_id: customerId }, select: { id: true } });
  const ids = registrations.map((row) => row.id);
  await captureRegistrations(tx, ids, snapshot);

  const removed = await deleteRegistrations(tx, ids);
  // Anak ikut terhapus bersama induknya (CASCADE).
  await tx.customers.delete({ where: { id: customerId } });
  const details: BinDetails = {
    ...removed.stats,
    children: snapshot.children.length,
    whatsapp: String(customer.whatsapp ?? ""),
  };
  await store(tx, {
    kind: "CUSTOMER",
    label: String(customer.full_name ?? ""),
    code: String(customer.customer_number ?? ""),
    details,
    snapshot,
    proofFiles: removed.proofFiles,
    userName,
  });
  return details;
}

export async function moveChildToBin(tx: Tx, childId: string, userName: string): Promise<BinDetails | null> {
  const snapshot = emptySnapshot();
  snapshot.children = await rowsOf(
    tx,
    Prisma.sql`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as data from children t where t.id = ${childId}::uuid`,
  );
  const child = snapshot.children[0];
  if (!child) return null;

  const registrations = await tx.registrations.findMany({ where: { child_id: childId }, select: { id: true } });
  const ids = registrations.map((row) => row.id);
  await captureRegistrations(tx, ids, snapshot);

  const removed = await deleteRegistrations(tx, ids);
  await tx.children.delete({ where: { id: childId } });
  await store(tx, {
    kind: "CHILD",
    label: String(child.full_name ?? ""),
    code: String(child.child_number ?? ""),
    details: removed.stats,
    snapshot,
    proofFiles: removed.proofFiles,
    userName,
  });
  return removed.stats;
}

/* ------------------------------------------------------------------ */
/* Memulihkan                                                          */
/* ------------------------------------------------------------------ */

type Table =
  | "events"
  | "customers"
  | "children"
  | "registrations"
  | "payments"
  | "attendance_records"
  | "certificates"
  | "voucher_redemptions"
  | "financial_transactions";

async function idsThatExist(tx: Tx, table: "events" | "customers" | "children" | "vouchers" | "users", ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Set<string>();
  // Kolom id events bertipe teks, yang lain uuid. Dibandingkan sebagai teks
  // supaya satu kueri cukup untuk semuanya.
  const key = table === "vouchers" ? "code" : "id";
  const found = await tx.$queryRawUnsafe<{ id: string }[]>(
    `select "${key}"::text as id from "${table}" where "${key}"::text = any($1::text[])`,
    unique,
  );
  return new Set(found.map((row) => row.id));
}

/** Memasukkan baris salinan kembali ke tabelnya; kolom yang sudah tidak ada dilewati. */
async function insertRows(tx: Tx, table: Table, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const known = await tx.$queryRaw<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = ${table}`;
  const allowed = new Set(known.map((column) => column.column_name));
  const keys = Object.keys(rows[0]).filter((key) => allowed.has(key) && /^[a-z0-9_]+$/.test(key));
  const list = keys.map((key) => `"${key}"`).join(", ");
  await tx.$executeRawUnsafe(
    `insert into "${table}" (${list}) select ${list} from jsonb_populate_recordset(null::"${table}", $1::jsonb)`,
    JSON.stringify(rows),
  );
}

const str = (value: unknown) => String(value ?? "");

export type RestoreResult =
  | { ok: true; message: string; kind: BinKind; slug?: string }
  | { ok: false; error: string };

export async function restoreFromBin(binId: string): Promise<RestoreResult> {
  const entry = await db.recycle_bin.findUnique({ where: { id: binId } });
  if (!entry) return { ok: false, error: "Data ini sudah tidak ada di Terhapus." };
  if (entry.expires_at.getTime() <= Date.now()) {
    return { ok: false, error: "Batas 30 hari sudah lewat, data ini tidak bisa dipulihkan lagi." };
  }

  const kind = entry.kind as BinKind;
  const snap = { ...emptySnapshot(), ...(entry.snapshot as unknown as Partial<Snapshot>) };

  try {
    return await db.$transaction(
      async (tx): Promise<RestoreResult> => {
        let slug: string | undefined;

        /* --- baris utama --- */
        const wantEvents = snap.events.map((row) => str(row.id));
        const wantCustomers = snap.customers.map((row) => str(row.id));
        const wantChildren = snap.children.map((row) => str(row.id));

        if ((await idsThatExist(tx, "events", wantEvents)).size > 0) {
          return { ok: false, error: "Event ini sudah ada lagi di daftar Event, jadi tidak dipulihkan dua kali." };
        }
        if ((await idsThatExist(tx, "customers", wantCustomers)).size > 0) {
          return { ok: false, error: "Pendamping ini sudah ada lagi di daftar Pendamping, jadi tidak dipulihkan dua kali." };
        }
        if ((await idsThatExist(tx, "children", wantChildren)).size > 0) {
          return { ok: false, error: "Anak ini sudah ada lagi di daftar Anak, jadi tidak dipulihkan dua kali." };
        }

        if (kind === "CHILD") {
          const owner = str(snap.children[0]?.customer_id);
          if ((await idsThatExist(tx, "customers", [owner])).size === 0) {
            return {
              ok: false,
              error:
                "Pendamping anak ini sudah tidak ada. Pulihkan pendampingnya dulu dari daftar Terhapus (kalau masih ada), lalu pulihkan anaknya.",
            };
          }
        }

        // Alamat (slug) event bisa sudah dipakai event baru. Event yang dipulihkan
        // mengalah dan diberi akhiran, bukan menimpa atau gagal.
        if (snap.events[0]) {
          const base = str(snap.events[0].slug);
          let candidate = base;
          for (let n = 0; ; n += 1) {
            const taken = await tx.events.findUnique({ where: { slug: candidate }, select: { id: true } });
            if (!taken) break;
            candidate = `${base}-pulih${n > 0 ? `-${n + 1}` : ""}`;
          }
          snap.events[0].slug = candidate;
          slug = candidate;
        }

        await insertRows(tx, "events", snap.events);
        await insertRows(tx, "customers", snap.customers);
        await insertRows(tx, "children", snap.children);

        /* --- pendaftaran: hanya yang induknya masih ada --- */
        const regs = snap.registrations;
        const [haveEvents, haveCustomers, haveChildren] = await Promise.all([
          idsThatExist(tx, "events", regs.map((row) => str(row.event_id))),
          idsThatExist(tx, "customers", regs.map((row) => str(row.customer_id))),
          idsThatExist(tx, "children", regs.map((row) => str(row.child_id))),
        ]);
        // Yang baru saja dimasukkan di atas ikut dihitung ada (transaksi yang sama).
        const kept = regs.filter(
          (row) =>
            haveEvents.has(str(row.event_id)) &&
            haveCustomers.has(str(row.customer_id)) &&
            haveChildren.has(str(row.child_id)),
        );
        const keptIds = new Set(kept.map((row) => str(row.id)));
        const skipped = regs.length - kept.length;

        const payments = snap.payments.filter(
          (row) => keptIds.has(str(row.registration_id)) && haveCustomers.has(str(row.customer_id)),
        );
        const paymentIds = new Set(payments.map((row) => str(row.id)));
        const voucherCodes = await idsThatExist(
          tx,
          "vouchers",
          snap.voucher_redemptions.map((row) => str(row.voucher_code)),
        );
        const redemptions = snap.voucher_redemptions.filter(
          (row) => keptIds.has(str(row.registration_id)) && voucherCodes.has(str(row.voucher_code)),
        );
        const finance = snap.financial_transactions.filter(
          (row) => keptIds.has(str(row.reference_id)) || paymentIds.has(str(row.reference_id)),
        );

        // Penanda siapa yang memverifikasi/mencatat: kalau akunnya sudah dihapus,
        // dikosongkan supaya pemulihan tidak gagal karena itu.
        const userIds = [
          ...payments.map((row) => str(row.verified_by)),
          ...finance.map((row) => str(row.created_by)),
        ];
        const haveUsers = await idsThatExist(tx, "users", userIds);
        for (const row of payments) if (row.verified_by && !haveUsers.has(str(row.verified_by))) row.verified_by = null;
        for (const row of finance) if (row.created_by && !haveUsers.has(str(row.created_by))) row.created_by = null;

        await insertRows(tx, "registrations", kept);
        await insertRows(tx, "payments", payments);
        await insertRows(tx, "attendance_records", snap.attendance_records.filter((row) => keptIds.has(str(row.registration_id))));
        await insertRows(tx, "certificates", snap.certificates.filter((row) => keptIds.has(str(row.registration_id))));
        await insertRows(tx, "voucher_redemptions", redemptions);
        await insertRows(tx, "financial_transactions", finance);

        // Voucher yang dipakai pendaftaran ini terhitung terpakai lagi (kebalikan saat dihapus).
        const perVoucher = new Map<string, number>();
        for (const row of redemptions) {
          perVoucher.set(str(row.voucher_code), (perVoucher.get(str(row.voucher_code)) ?? 0) + 1);
        }
        for (const [code, used] of perVoucher) {
          await tx.$executeRaw`update vouchers set used_count = used_count + ${used} where code = ${code}`;
        }

        // Kuota "terdaftar" dihitung ulang, termasuk saat event kembali tanpa pendaftaran.
        const eventIds = [...new Set([...wantEvents, ...kept.map((row) => str(row.event_id))])];
        if (eventIds.length > 0) {
          await tx.$executeRaw`update events e set registered = (
            select count(*) from registrations r where r.event_id = e.id and r.status <> 'CANCELLED'
          ) where e.id = any(${eventIds}::text[])`;
        }

        await tx.recycle_bin.delete({ where: { id: binId } });

        const parts: string[] = [];
        if (kept.length > 0) parts.push(`${kept.length} pendaftaran`);
        if (snap.children.length > 0 && kind === "CUSTOMER") parts.push(`${snap.children.length} anak`);
        let message = `${entry.label} dipulihkan${parts.length ? `, beserta ${parts.join(" dan ")}` : ""}.`;
        if (skipped > 0) {
          message += ` ${skipped} pendaftaran tidak ikut pulih karena event, pendamping, atau anaknya sudah tidak ada.`;
        }
        return { ok: true, message, kind, slug };
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
  } catch {
    return { ok: false, error: "Pemulihan gagal dan tidak ada yang berubah. Coba lagi, atau hubungi pengembang." };
  }
}

/* ------------------------------------------------------------------ */
/* Membuang untuk selamanya                                            */
/* ------------------------------------------------------------------ */

/** Membuang satu atau beberapa entri beserta berkas buktinya. Mengembalikan jumlah yang dibuang. */
async function purge(where: Prisma.recycle_binWhereInput): Promise<number> {
  const entries = await db.recycle_bin.findMany({ where, select: { id: true, proof_files: true } });
  if (entries.length === 0) return 0;
  await db.recycle_bin.deleteMany({ where: { id: { in: entries.map((entry) => entry.id) } } });
  await removeProofFiles(entries.flatMap((entry) => entry.proof_files));
  return entries.length;
}

export const purgeEntry = (id: string) => purge({ id });

/**
 * Membuang yang melewati 30 hari. Tidak ada penjadwal di server ini, jadi
 * dipanggil tiap kali halaman Terhapus dibuka dan tiap kali ada yang dihapus.
 * Entri yang kedaluwarsa tidak pernah ditampilkan atau bisa dipulihkan walau
 * pembersihannya belum sempat berjalan.
 */
export async function purgeExpired(): Promise<number> {
  try {
    return await purge({ expires_at: { lte: new Date() } });
  } catch {
    return 0;
  }
}

export async function listBin() {
  return db.recycle_bin.findMany({
    where: { expires_at: { gt: new Date() } },
    select: {
      id: true,
      kind: true,
      label: true,
      code: true,
      details: true,
      deleted_by_name: true,
      deleted_at: true,
      expires_at: true,
    },
    orderBy: { deleted_at: "desc" },
  });
}

export function daysLeft(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS));
}

