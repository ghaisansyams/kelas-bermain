"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Megaphone, X } from "lucide-react";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatCard, type Column,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import {
  affiliateStatusLabel,
  type Affiliate,
  type AffiliateStatus,
} from "@/lib/repositories/types";
import {
  approveAffiliate,
  listAffiliates,
  rejectAffiliate,
  setAffiliateStatus,
  statsForAffiliate,
} from "@/lib/services/affiliate";
import { cn } from "@/lib/utils/cn";
import { formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

const STATUSES: AffiliateStatus[] = ["PENDING", "ACTIVE", "INACTIVE", "REJECTED"];

const STATUS_TONE: Record<AffiliateStatus, string> = {
  PENDING: "bg-sun-soft text-sun-dark",
  ACTIVE: "bg-pine-soft text-pine-dark",
  INACTIVE: "bg-canvas-deep text-muted",
  REJECTED: "bg-brand-soft text-brand-ink",
};

function AffiliateStatusPill({ status }: { status: AffiliateStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2 py-0.5 text-[0.6875rem] font-bold",
        STATUS_TONE[status],
      )}
    >
      {affiliateStatusLabel[status]}
    </span>
  );
}

/**
 * Affiliate applications and roster.
 *
 * `canSeeBank` gates the account number and holder name behind SUPER_ADMIN —
 * this is a third party's financial data, not the class's own (PRD v2.0, N-06).
 * Everyone with the `affiliates` permission can still see the rest: who
 * applied, their code once approved, and how many paid participants it has
 * brought in.
 */
export function AffiliatesView({
  verifiedBy,
  canSeeBank,
}: {
  verifiedBy: string;
  canSeeBank: boolean;
}) {
  const { data, loading, reload } = useCollection(() => listAffiliates(), []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
    const s = params.get("status");
    if (s && (STATUSES as string[]).includes(s.toUpperCase())) setStatus(s.toUpperCase());
  }, []);

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        [row.fullName, row.affiliateNumber, row.code, row.whatsapp].some((v) =>
          (v ?? "").toLowerCase().includes(q),
        );
      return matchesQuery && (status === "all" || row.status === status);
    });
  }, [rows, query, status]);

  const totals = useMemo(() => {
    const active = rows.filter((a) => a.status === "ACTIVE");
    const pending = rows.filter((a) => a.status === "PENDING");
    const commission = active.reduce(
      (sum, a) => sum + statsForAffiliate(a.code).estimatedCommission,
      0,
    );
    return { activeCount: active.length, pendingCount: pending.length, commission };
  }, [rows]);

  async function approve(id: string) {
    setWorking(id);
    await approveAffiliate(id, verifiedBy);
    await reload();
    setWorking(null);
  }

  async function reject(id: string) {
    // `null` means the admin clicked Cancel — abort rather than reject with
    // no reason. An empty string (OK with a blank prompt) still goes through.
    const reason = typeof window !== "undefined" ? window.prompt("Alasan penolakan (opsional):", "") : "";
    if (reason === null) return;
    setWorking(id);
    await rejectAffiliate(id, verifiedBy, reason);
    await reload();
    setWorking(null);
  }

  async function toggleActive(affiliate: Affiliate) {
    setWorking(affiliate.id);
    await setAffiliateStatus(
      affiliate.id,
      affiliate.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    );
    await reload();
    setWorking(null);
  }

  const columns: Column<Affiliate>[] = [
    {
      key: "number",
      header: "No. Affiliate",
      render: (a) => (
        <span className="whitespace-nowrap font-mono text-xs font-bold text-ink">
          {a.affiliateNumber}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nama",
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{a.fullName}</p>
          <p className="truncate text-xs text-muted">{a.whatsapp}</p>
        </div>
      ),
    },
    {
      key: "code",
      header: "Kode",
      render: (a) =>
        a.code ? (
          <span className="whitespace-nowrap rounded-pill bg-canvas-deep px-2 py-0.5 font-mono text-xs font-bold text-ink">
            {a.code}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: "domicile",
      header: "Domisili",
      hideBelow: "md",
      render: (a) => (
        <span className="block max-w-[10rem] truncate text-xs text-ink-soft">
          {a.domicile}
        </span>
      ),
    },
    ...(canSeeBank
      ? [
          {
            key: "bank",
            header: "Rekening",
            hideBelow: "lg" as const,
            render: (a: Affiliate) => (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{a.bankName}</p>
                <p className="truncate font-mono text-[0.6875rem] text-muted">
                  {a.bankAccountNumber} · {a.bankAccountName}
                </p>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "referrals",
      header: "Peserta",
      hideBelow: "lg",
      render: (a) => {
        const stats = statsForAffiliate(a.code);
        return (
          <span className="whitespace-nowrap text-xs text-ink-soft">
            {stats.paidReferrals} lunas / {stats.referrals} masuk
          </span>
        );
      },
    },
    {
      key: "commission",
      header: "Estimasi Komisi",
      hideBelow: "lg",
      render: (a) => (
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-ink">
          {formatRupiah(statsForAffiliate(a.code).estimatedCommission)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (a) => <AffiliateStatusPill status={a.status} /> },
    {
      key: "applied",
      header: "Mendaftar",
      hideBelow: "md",
      render: (a) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {formatDateShort(a.appliedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (a) => {
        if (working === a.id) {
          return <Loader2 className="size-4 animate-spin text-muted" aria-hidden />;
        }
        if (a.status === "PENDING") {
          return (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => approve(a.id)}
                className="inline-flex min-h-8 items-center gap-1 rounded-pill bg-pine px-2.5 text-xs font-bold text-white transition-colors hover:bg-pine-dark"
              >
                <Check className="size-3.5" aria-hidden />
                Setujui
              </button>
              <button
                type="button"
                onClick={() => reject(a.id)}
                className="inline-flex min-h-8 items-center gap-1 rounded-pill border border-line px-2.5 text-xs font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
              >
                <X className="size-3.5" aria-hidden />
                Tolak
              </button>
            </div>
          );
        }
        if (a.status === "ACTIVE" || a.status === "INACTIVE") {
          return (
            <button
              type="button"
              onClick={() => toggleActive(a)}
              className="inline-flex min-h-8 items-center rounded-pill border border-line px-2.5 text-xs font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
            >
              {a.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
            </button>
          );
        }
        return <span className="text-xs text-muted">{a.notes ?? "—"}</span>;
      },
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Affiliate"
        description="Pendaftaran affiliator, verifikasi, dan performa kode masing-masing. Komisi Rp10.000 per peserta lunas — nominal akhir dan aturan pencairan menunggu keputusan klien (PRD F13)."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Affiliator Aktif" value={String(totals.activeCount)} tone="pine" />
        <StatCard label="Menunggu Verifikasi" value={String(totals.pendingCount)} tone="sun" />
        <StatCard label="Estimasi Komisi Berjalan" value={formatRupiah(totals.commission)} tone="brand" />
      </div>

      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Nama, kode, WhatsApp…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Semua" },
            ...STATUSES.map((s) => ({ value: s, label: affiliateStatusLabel[s] })),
          ]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="affiliator" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(a) => a.id}
          loading={loading}
          caption="Daftar affiliator"
          empty={
            <EmptyState
              icon={<Megaphone className="size-6" aria-hidden />}
              title="Belum ada affiliator"
              description="Pendaftaran affiliator dari halaman publik akan muncul di sini."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
