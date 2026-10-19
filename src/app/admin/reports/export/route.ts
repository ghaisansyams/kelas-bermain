import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getEvents } from "@/lib/services/content";
import { buildReport, sanitiseRange, toCsv } from "@/lib/services/report";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * CSV export for the three reports the team asked for. Authorization is
 * re-checked here, not just in the page that links to it.
 */
export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const range = sanitiseRange({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  const type = url.searchParams.get("type") ?? "events";
  // Rentang dibaca menurut Jakarta, sama dengan halaman laporannya — kalau
  // batasnya beda, ekspor dan layar menghitung baris yang berbeda.
  const from = new Date(`${range.from}T00:00:00+07:00`);
  const until = new Date(`${range.to}T23:59:59.999+07:00`);

  const events = await getEvents();
  const titles = new Map(
    events.map((item) => [item.id, { title: item.title, startDate: item.startDate }]),
  );

  let rows: (string | number)[][];

  if (type === "registrations") {
    const data = await db.registrations.findMany({
      where: { registration_date: { gte: from, lte: until } },
      select: {
        registration_number: true,
        event_id: true,
        status: true,
        payment_status: true,
        attendance_status: true,
        certificate_status: true,
        registration_date: true,
        children: { select: { full_name: true } },
        customers: { select: { full_name: true, whatsapp: true } },
      },
      orderBy: { registration_date: "asc" },
    });

    rows = [
      [
        "Nomor Registrasi",
        "Event",
        "Anak",
        "Pendamping",
        "WhatsApp",
        "Status",
        "Pembayaran",
        "Kehadiran",
        "Sertifikat",
        "Dibuat",
      ],
      ...data.map((row) => [
        row.registration_number,
        titles.get(row.event_id)?.title ?? row.event_id,
        row.children?.full_name ?? "",
        row.customers?.full_name ?? "",
        row.customers?.whatsapp ?? "",
        row.status,
        row.payment_status,
        row.attendance_status,
        row.certificate_status,
        row.registration_date.toISOString(),
      ]),
    ];
  } else if (type === "payments") {
    const data = await db.payments.findMany({
      where: { created_at: { gte: from, lte: until } },
      select: {
        invoice_number: true,
        event_id: true,
        amount: true,
        status: true,
        method: true,
        paid_at: true,
        verified_at: true,
        created_at: true,
        registrations: { select: { registration_number: true } },
      },
      orderBy: { created_at: "asc" },
    });

    rows = [
      [
        "Invoice",
        "Registrasi",
        "Event",
        "Nominal",
        "Status",
        "Metode",
        "Dibayar",
        "Diverifikasi",
        "Dibuat",
      ],
      ...data.map((row) => [
        row.invoice_number ?? "",
        row.registrations?.registration_number ?? "",
        titles.get(row.event_id)?.title ?? row.event_id,
        Number(row.amount),
        row.status,
        row.method ?? "",
        row.paid_at?.toISOString() ?? "",
        row.verified_at?.toISOString() ?? "",
        row.created_at.toISOString(),
      ]),
    ];
  } else {
    const report = await buildReport(range, titles);
    rows = [
      [
        "Event",
        "Tanggal",
        "Registrasi",
        "Lunas",
        "Menunggu",
        "Batal",
        "Hadir",
        "Sertifikat",
        "Pendapatan",
      ],
      ...report.events.map((row) => [
        row.eventTitle,
        row.startDate,
        row.registrations,
        row.paid,
        row.pending,
        row.cancelled,
        row.present,
        row.certificates,
        row.revenue,
      ]),
      [],
      ["Total pendapatan", report.revenue],
      ["Total refund", report.refunds],
      ["Pendapatan bersih", report.net],
      ["Tingkat kehadiran (%)", report.attendanceRate],
      ["Konversi bayar (%)", report.conversionRate],
    ];
  }

  // BOM so Excel on Windows reads the UTF-8 names correctly.
  const csv = `﻿${toCsv(rows)}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kelas-bermain-${type}-${range.from}-${range.to}.csv"`,
    },
  });
}
