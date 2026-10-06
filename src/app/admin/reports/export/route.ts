import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getEvents } from "@/lib/services/content";
import { buildReport, defaultRange, toCsv } from "@/lib/services/report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * CSV export for the three reports the team asked for. Authorization is
 * re-checked here, not just in the page that links to it.
 */
export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const fallback = defaultRange();
  const range = {
    from: url.searchParams.get("from") ?? fallback.from,
    to: url.searchParams.get("to") ?? fallback.to,
  };
  const type = url.searchParams.get("type") ?? "events";
  const until = `${range.to}T23:59:59.999Z`;

  const supabase = await createSupabaseServerClient();
  const events = await getEvents();
  const titles = new Map(
    events.map((item) => [item.id, { title: item.title, startDate: item.startDate }]),
  );

  let rows: (string | number)[][];

  if (type === "registrations") {
    const { data } = await supabase
      .from("registrations")
      .select(
        "registration_number, event_id, status, payment_status, attendance_status, certificate_status, created_at, children(full_name), customers(full_name, whatsapp)",
      )
      .gte("created_at", range.from)
      .lte("created_at", until)
      .order("created_at");

    type RegRow = {
      registration_number: string;
      event_id: string;
      status: string;
      payment_status: string;
      attendance_status: string;
      certificate_status: string;
      created_at: string;
      children: { full_name: string } | null;
      customers: { full_name: string; whatsapp: string } | null;
    };

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
      ...((data ?? []) as unknown as RegRow[]).map((row) => [
        row.registration_number,
        titles.get(row.event_id)?.title ?? row.event_id,
        row.children?.full_name ?? "",
        row.customers?.full_name ?? "",
        row.customers?.whatsapp ?? "",
        row.status,
        row.payment_status,
        row.attendance_status,
        row.certificate_status,
        row.created_at,
      ]),
    ];
  } else if (type === "payments") {
    const { data } = await supabase
      .from("payments")
      .select(
        "invoice_number, event_id, amount, status, method, paid_at, verified_at, created_at, registrations(registration_number)",
      )
      .gte("created_at", range.from)
      .lte("created_at", until)
      .order("created_at");

    type PayRow = {
      invoice_number: string | null;
      event_id: string;
      amount: number;
      status: string;
      method: string | null;
      paid_at: string | null;
      verified_at: string | null;
      created_at: string;
      registrations: { registration_number: string } | null;
    };

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
      ...((data ?? []) as unknown as PayRow[]).map((row) => [
        row.invoice_number ?? "",
        row.registrations?.registration_number ?? "",
        titles.get(row.event_id)?.title ?? row.event_id,
        row.amount,
        row.status,
        row.method ?? "",
        row.paid_at ?? "",
        row.verified_at ?? "",
        row.created_at,
      ]),
    ];
  } else {
    const report = await buildReport(supabase, range, titles);
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
