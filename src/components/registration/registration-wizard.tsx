"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  CircleCheckBig,
  Loader2,
  Minus,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Field, Select, TextInput } from "@/components/forms/field";
import { StepProgress, type WizardStep } from "@/components/registration/steps";
import { RegistrationReceipt } from "@/components/registration/receipt";
import { Button } from "@/components/ui/button";
import {
  SELECTABLE_SOURCES,
  sourceLabel,
  type RegistrationSource,
} from "@/lib/repositories/types";
import { findAffiliateByCode, type AffiliateLookup } from "@/lib/services/affiliate";
import {
  createRegistration,
  type RegistrationBatch,
  type RegistrationParticipantGroup,
} from "@/lib/services/registration";
import { calculateRegistrationPrice, type PricingConfig, type VoucherDefinition } from "@/lib/pricing";
import { lookupVoucher, redeemVoucher } from "@/lib/services/voucher";
import {
  pricingToLines,
  registrationWhatsappUrl,
  type HandoffCompanion,
} from "@/lib/config/whatsapp";
import { paymentAccounts } from "@/data/payment-accounts";
import { formatDateRange } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";
import {
  clearDraft,
  draftHasContent,
  loadDraft,
  saveDraft,
} from "@/lib/registration/draft-storage";
import type { EventView } from "@/lib/types";
import {
  FREE_CHILD_UNDER_AGE,
  ageFromBirthDate,
  formatAgeFromBirthDate,
  freeChildFlags,
  todayIso,
} from "@/lib/utils/age";
import { cn } from "@/lib/utils/cn";
import {
  ageOutsideRange,
  emptyChild,
  emptyParent,
  hasErrors,
  MAX_EXTRA_COMPANIONS,
  validateChild,
  validateParent,
  type ChildFormValues,
  type FieldErrors,
  type ParentFormValues,
} from "@/lib/utils/validation";

// Dua langkah saja. Pembayaran dilakukan lewat WhatsApp, jadi tidak ada lagi
// langkah pembayaran di formulir; langkah kedua adalah halaman rincian yang
// tampil begitu pendaftarannya tercatat.
const STEPS: WizardStep[] = [
  { key: "participants", label: "Data Peserta" },
  { key: "confirm", label: "Konfirmasi" },
];

type StepKey = "participants" | "confirm";
type RegistrationMode = "PERSONAL" | "GROUP";

interface ParticipantGroup {
  companion: ParentFormValues;
  companionErrors: FieldErrors<ParentFormValues>;
  children: ChildFormValues[];
  childErrors: FieldErrors<ChildFormValues>[];
}

function emptyGroup(): ParticipantGroup {
  return {
    companion: { ...emptyParent },
    companionErrors: {},
    children: [{ ...emptyChild }],
    childErrors: [{}],
  };
}

/**
 * Public sign-up form.
 *
 * Flow: Data Peserta (Personal — one companion, one or more children — or
 * Group — several companions, each bringing their own child/children) ->
 * Konfirmasi (a compact, checkout-style recap with pricing) -> Pembayaran
 * (bank transfer instructions — see PRD, not a payment gateway) -> Selesai.
 * A FREE event skips straight from Konfirmasi to Selesai.
 *
 * The registration/payment rows are created at the Confirm step, before the
 * bank-transfer instructions ever appear, and stay PENDING — nothing in this
 * form ever marks a payment PAID. That verification is an admin's job, done
 * on the Pembayaran page after the transfer proof has been checked.
 */
export function RegistrationWizard({
  event,
  source,
  qrSource,
  pricingConfig,
}: {
  event: EventView;
  source: RegistrationSource;
  qrSource?: string;
  /** Live discount rules from the admin; falls back inside the engine. */
  pricingConfig?: PricingConfig;
}) {
  const [stepKey, setStepKey] = useState<StepKey>("participants");
  const [mode, setModeState] = useState<RegistrationMode>("PERSONAL");
  const [groups, setGroups] = useState<ParticipantGroup[]>([emptyGroup()]);
  const [heardFrom, setHeardFrom] = useState<RegistrationSource | "">("");
  const [heardFromError, setHeardFromError] = useState<string | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batch, setBatch] = useState<RegistrationBatch | null>(null);

  const isFree = event.registration.type === "FREE";
  // The real internal price — used for the actual charge even when
  // priceDisplay is HIDDEN on the public card (see lib/types.ts).
  const unitPrice = isFree ? 0 : (event.registration.price ?? 0);

  const totalChildren = groups.reduce((sum, g) => sum + g.children.length, 0);

  // Anak di bawah 3 tahun pada hari kelas gratis kalau kelompoknya membawa
  // anak berusia 3 tahun ke atas. Aturan yang sama dipakai server saat menagih.
  const freeFlags = useMemo(
    () =>
      freeChildFlags(
        groups.map((g) => g.children.map((c) => c.dateOfBirth)),
        event.startDate,
      ),
    [groups, event.startDate],
  );
  const freeChildrenCount = freeFlags.flat().filter(Boolean).length;
  const extraCompanions = groups.reduce((sum, g) => sum + g.companion.extraCompanions, 0);
  const extraCompanionPrice = isFree ? 0 : (event.registration.extraCompanionPrice ?? 0);
  // Capacity is the only real limit on how many children one submission can
  // add — no arbitrary frontend cap, since Group pricing needs 5+ to ever
  // be reachable at all.
  const maxChildren = Math.max(1, event.seatsLeft);

  function setMode(next: RegistrationMode) {
    setModeState(next);
    // Switching back to Personal keeps only the first companion's group —
    // their data stays, the rest (if any) is dropped along with the mode.
    if (next === "PERSONAL") setGroups((current) => current.slice(0, 1));
  }

  // Restore anything typed before a refresh. Runs once, and only while the
  // parent is still filling the form — never after a registration exists.
  const [restored, setRestored] = useState(false);
  // Penyimpanan baru boleh jalan setelah pemulihan selesai. Tanpa ini, render
  // pertama yang masih kosong akan menimpa draft sebelum sempat dibaca.
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const draft = loadDraft(event.id);
    if (!draft || !draftHasContent(draft)) {
      setDraftReady(true);
      return;
    }

    setModeState(draft.mode);
    setGroups(
      draft.groups.map((group) => ({
        companion: group.companion,
        companionErrors: {},
        children: group.children,
        childErrors: group.children.map(() => ({})),
      })),
    );
    setHeardFrom(draft.heardFrom);
    setAffiliateCode(draft.affiliateCode);
    setVoucherCode(draft.voucherCode ?? "");
    setRestored(true);
    setDraftReady(true);
    // Intentionally only on mount: a later run would fight the parent's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on every change, but only before submission. Tidak lagi ditunda:
  // draftnya kecil, dan penundaan 0,4 detik dulu membuat isian yang baru saja
  // diketik hilang kalau halaman di-refresh seketika.
  useEffect(() => {
    if (!draftReady || batch) return;

    saveDraft(event.id, {
      mode,
      groups: groups.map((group) => ({
        companion: group.companion,
        children: group.children,
      })),
      heardFrom,
      affiliateCode,
      voucherCode,
      stepKey: "participants",
    });
  }, [draftReady, event.id, mode, groups, heardFrom, affiliateCode, voucherCode, batch]);

  const [affiliateMatch, setAffiliateMatch] = useState<AffiliateLookup | null>(null);
  useEffect(() => {
    const code = affiliateCode.trim();
    if (!code) {
      setAffiliateMatch(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void findAffiliateByCode(code).then((result) => {
        if (!cancelled) setAffiliateMatch(result);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [affiliateCode]);

  /**
   * Harga untuk keranjang ini dengan voucher tertentu (atau tanpa). Dihitung
   * saat mengirim, karena voucher baru diperiksa ke database di saat itu juga.
   */
  function priceWith(voucher: VoucherDefinition | null) {
    return calculateRegistrationPrice({
      eventPrice: unitPrice,
      childrenCount: totalChildren,
      freeChildrenCount,
      extraCompanions,
      extraCompanionPrice,
      hasActiveAffiliate: affiliateMatch?.status === "ACTIVE",
      affiliateCode: affiliateCode.trim() || undefined,
      voucher,
      config: pricingConfig,
    });
  }

  const steps = STEPS;
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === stepKey),
  );

  function setCompanionField<K extends keyof ParentFormValues>(
    groupIndex: number,
    key: K,
    value: string,
  ) {
    setGroups((current) =>
      current.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              companion: { ...group.companion, [key]: value },
              companionErrors: group.companionErrors[key]
                ? { ...group.companionErrors, [key]: undefined }
                : group.companionErrors,
            }
          : group,
      ),
    );
  }

  function setExtraCompanions(groupIndex: number, value: number) {
    const next = Number.isFinite(value)
      ? Math.min(MAX_EXTRA_COMPANIONS, Math.max(0, Math.floor(value)))
      : 0;
    setGroups((current) =>
      current.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              companion: { ...group.companion, extraCompanions: next },
              companionErrors: { ...group.companionErrors, extraCompanions: undefined },
            }
          : group,
      ),
    );
  }

  function setChildField(
    groupIndex: number,
    childIndex: number,
    key: keyof ChildFormValues,
    value: string,
  ) {
    setGroups((current) =>
      current.map((group, gi) =>
        gi !== groupIndex
          ? group
          : {
              ...group,
              children: group.children.map((child, ci) =>
                ci === childIndex ? { ...child, [key]: value } : child,
              ),
              childErrors: group.childErrors.map((errors, ci) =>
                ci === childIndex && errors[key] ? { ...errors, [key]: undefined } : errors,
              ),
            },
      ),
    );
  }

  function addChild(groupIndex: number) {
    if (totalChildren >= maxChildren) return;
    setGroups((current) =>
      current.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              children: [...group.children, { ...emptyChild }],
              childErrors: [...group.childErrors, {}],
            }
          : group,
      ),
    );
  }

  function removeChild(groupIndex: number, childIndex: number) {
    setGroups((current) =>
      current.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              children: group.children.filter((_, ci) => ci !== childIndex),
              childErrors: group.childErrors.filter((_, ci) => ci !== childIndex),
            }
          : group,
      ),
    );
  }

  function addGroup() {
    if (totalChildren >= maxChildren) return;
    setGroups((current) => [...current, emptyGroup()]);
  }

  function removeGroup(groupIndex: number) {
    setGroups((current) => current.filter((_, i) => i !== groupIndex));
  }

  function goToConfirm() {
    const groupErrors = groups.map((group) => ({
      companion: validateParent(group.companion),
      children: group.children.map(validateChild),
    }));
    setGroups((current) =>
      current.map((group, i) => ({
        ...group,
        companionErrors: groupErrors[i].companion,
        childErrors: groupErrors[i].children,
      })),
    );

    const missingSource = !heardFrom;
    setHeardFromError(missingSource ? "Pilih salah satu." : null);

    const firstBadGroup = groupErrors.findIndex(
      (g) => hasErrors(g.companion) || g.children.some(hasErrors),
    );
    if (firstBadGroup !== -1) {
      const g = groupErrors[firstBadGroup];
      if (hasErrors(g.companion)) {
        const key = Object.keys(g.companion).find(
          (k) => g.companion[k as keyof ParentFormValues],
        );
        document.getElementById(`companion-${key}-${firstBadGroup}`)?.focus();
        return;
      }
      const childIndex = g.children.findIndex(hasErrors);
      const key = Object.keys(g.children[childIndex]).find(
        (k) => g.children[childIndex][k as keyof ChildFormValues],
      );
      if (key) document.getElementById(`${key}-${firstBadGroup}-${childIndex}`)?.focus();
      return;
    }
    if (missingSource) {
      document.getElementById("heardFrom")?.focus();
      return;
    }

    // Tidak ada lagi layar rekap sebelum mengirim: tombol ini langsung mencatat
    // pendaftarannya dan pindah ke Konfirmasi. WhatsApp tidak dibuka di sini;
    // itu baru terjadi saat orang tua menekan Selesai di halaman Konfirmasi.
    void submitRegistration();
  }

  async function submitRegistration() {
    setFormError(null);
    setVoucherError(null);
    setSubmitting(true);

    // Voucher diperiksa ke database di sini, bukan dipercaya dari browser:
    // bisa saja sudah kedaluwarsa, habis, atau tidak cocok dengan jumlah anak.
    let voucher: VoucherDefinition | null = null;
    const typedVoucher = voucherCode.trim();
    if (typedVoucher && !isFree) {
      const checked = await lookupVoucher(typedVoucher, totalChildren, event.id);
      if (!checked.ok) {
        setSubmitting(false);
        setVoucherError(checked.error);
        document.getElementById("voucherCode")?.focus();
        return;
      }
      voucher = checked.voucher;
    }
    const pricing = priceWith(voucher);

    // What the parent picked outranks the channel we inferred from the URL,
    // except when they scanned a QR — that is a fact, not a recollection.
    const attributed: RegistrationSource = source === "qr" ? "qr" : heardFrom || source;

    const participants: RegistrationParticipantGroup[] = groups.map((group) => ({
      companion: {
        fullName: group.companion.fullName,
        whatsapp: group.companion.whatsapp,
        domicile: group.companion.domicile,
        source: attributed,
      },
      extraCompanions: group.companion.extraCompanions,
      children: group.children.map((child) => ({
        fullName: child.fullName,
        nickname: child.nickname,
        dateOfBirth: child.dateOfBirth,
        // Flagged for admin review, never blocks the submission (KONF-02).
        ageOverride: Boolean(ageOutsideRange(child, event.ageRange, event.startDate)),
      })),
    }));

    const result = await createRegistration({
      event,
      source: attributed,
      qrSource,
      heardFrom: heardFrom || undefined,
      affiliateCode: affiliateCode.trim().toUpperCase() || undefined,
      participants,
      pricing,
    });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Recorded only now, against the registration that actually exists, so a
    // voucher is never burned by someone who abandoned the form.
    if (pricing.voucher && result.batch.registrations[0]) {
      await redeemVoucher(
        pricing.voucher.code,
        result.batch.registrations[0].id,
        pricing.voucher.amount,
      );
    }

    // The registration exists now; a leftover draft would re-offer data the
    // parent has already submitted.
    clearDraft(event.id);

    setBatch(result.batch);
    setStepKey("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Pesan lengkap ke admin untuk pendaftaran yang sudah tercatat: data peserta,
   * rincian harga, dan rekening tujuan transfer. Nomor pendaftaran dipasangkan
   * ke anak menurut urutan dibuatnya (kelompok demi kelompok).
   */
  function buildWhatsappUrl(created: RegistrationBatch): string {
    const lead = created.registrations[0];
    const origin = window.location.origin;
    let cursor = 0;

    const companions: HandoffCompanion[] = groups.map((group, groupIndex) => ({
      name: group.companion.fullName,
      whatsapp: group.companion.whatsapp,
      domicile: group.companion.domicile,
      extraCompanions: group.companion.extraCompanions,
      children: group.children.map((child, childIndex) => ({
        name: child.fullName,
        registrationNumber: created.registrations[cursor++]?.registrationNumber ?? "",
        age: formatAgeFromBirthDate(child.dateOfBirth, event.startDate),
        free: !isFree && Boolean(freeFlags[groupIndex]?.[childIndex]),
      })),
    }));

    return registrationWhatsappUrl({
      eventName: event.title,
      eventDate: formatDateRange(event.startDate, event.endDate),
      eventTime: `${event.timeStart} ${event.timezone}`,
      eventLocation: `${event.location.venue}, ${event.location.city}`,
      companions,
      priceLines: pricingToLines(created.pricing),
      formattedTotal: isFree ? "Gratis" : formatRupiah(created.totalAmount),
      needsPayment: !isFree,
      bankAccounts: paymentAccounts.map((account) => ({
        bank: account.bank,
        number: account.number,
      })),
      accountHolder: paymentAccounts[0]?.holder ?? "",
      statusUrl: isFree ? `${origin}/cek-tiket` : `${origin}/payment/${lead.accessToken}`,
    });
  }

  const leadCompanionName = groups[0]?.companion.fullName || "";

  // Batas kalender: tidak bisa memilih hari esok, dan tidak lebih tua dari 18 tahun.
  const today = todayIso();
  const minBirthDate = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;

  function dobHint(birthDate: string, free: boolean | undefined): string {
    if (!birthDate) return "Pilih dari kalender. Usia dihitung otomatis.";
    const age = ageFromBirthDate(birthDate, event.startDate);
    if (!age) return "";
    const text = `Usia saat kelas: ${formatAgeFromBirthDate(birthDate, event.startDate)}.`;
    return free
      ? `${text} Gratis: di bawah ${FREE_CHILD_UNDER_AGE} tahun dan datang bersama anak yang membayar.`
      : text;
  }

  // Langkah "Konfirmasi": isinya persis halaman rincian yang dulu bernama
  // "Selesai". Hanya ada setelah pendaftarannya tercatat.
  if (stepKey === "confirm" && batch) {
    return (
      <div className="space-y-6">
        <StepProgress steps={steps} current={currentIndex} />
        <RegistrationReceipt
          event={event}
          batch={batch}
          parentName={leadCompanionName}
          whatsappUrl={buildWhatsappUrl(batch)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepProgress steps={steps} current={currentIndex} />

      {/* Say so when data came back, rather than letting a parent wonder why
          fields are already filled on what looks like a fresh page. */}
      {restored ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine/25 bg-pine-soft/50 p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-ink">
            <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden />
            Data pendaftaran Anda sebelumnya masih tersimpan.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRestored(false)}
              className="text-xs font-bold text-pine underline-offset-2 hover:underline"
            >
              Lanjutkan
            </button>
            <button
              type="button"
              onClick={() => {
                clearDraft(event.id);
                setGroups([emptyGroup()]);
                setModeState("PERSONAL");
                setHeardFrom("");
                setAffiliateCode("");
                setVoucherCode("");
                setVoucherError(null);
                setStepKey("participants");
                setRestored(false);
              }}
              className="text-xs font-bold text-muted underline-offset-2 hover:text-brand hover:underline"
            >
              Mulai Baru
            </button>
          </div>
        </div>
      ) : null}

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </p>
      ) : null}

      {/* ---------------- Step 1: companion(s) + children ---------------- */}
      {stepKey === "participants" ? (
        <div className="space-y-8">
          <section aria-label="Tipe pendaftaran" className="space-y-3">
            <h2 className="text-base font-extrabold text-ink">Tipe Pendaftaran</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeCard
                active={mode === "PERSONAL"}
                icon={UserRound}
                title="Personal"
                description="Satu pendamping, satu atau lebih anak."
                onClick={() => setMode("PERSONAL")}
              />
              <ModeCard
                active={mode === "GROUP"}
                icon={Users}
                title="Group"
                description="Lebih dari satu pendamping, masing-masing dengan anaknya sendiri."
                onClick={() => setMode("GROUP")}
              />
            </div>
          </section>

          {groups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={cn(
                "space-y-8",
                mode === "GROUP" && "rounded-card border border-line bg-canvas-deep/20 p-4 sm:p-6",
              )}
            >
              {mode === "GROUP" ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-ink">
                    Pendamping {groupIndex + 1}
                  </span>
                  {groups.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeGroup(groupIndex)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Hapus
                    </button>
                  ) : null}
                </div>
              ) : null}

              <section aria-label="Data pendamping" className="space-y-5">
                <header className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <UserRound className="size-[1.125rem]" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Data Pendamping</h2>
                    <p className="text-xs text-muted">Kontak ini yang akan kami hubungi.</p>
                  </div>
                </header>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Nama Pendamping / Orang Tua"
                    htmlFor={`companion-fullName-${groupIndex}`}
                    error={group.companionErrors.fullName}
                    hint="Boleh dua nama, contoh: Annisa / Adam."
                    required
                    className="sm:col-span-2"
                  >
                    <TextInput
                      id={`companion-fullName-${groupIndex}`}
                      autoComplete="name"
                      placeholder="Contoh: Annisa / Adam"
                      value={group.companion.fullName}
                      error={group.companionErrors.fullName}
                      onChange={(e) => setCompanionField(groupIndex, "fullName", e.target.value)}
                    />
                  </Field>

                  <Field
                    label="No. WhatsApp Aktif"
                    htmlFor={`companion-whatsapp-${groupIndex}`}
                    error={group.companionErrors.whatsapp}
                    hint="Dipakai untuk konfirmasi pembayaran dan info lokasi."
                    required
                  >
                    <TextInput
                      id={`companion-whatsapp-${groupIndex}`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="08123456789"
                      value={group.companion.whatsapp}
                      error={group.companionErrors.whatsapp}
                      onChange={(e) => setCompanionField(groupIndex, "whatsapp", e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Domisili"
                    htmlFor={`companion-domicile-${groupIndex}`}
                    error={group.companionErrors.domicile}
                    hint="Cukup kecamatan dan kota."
                    required
                  >
                    <TextInput
                      id={`companion-domicile-${groupIndex}`}
                      autoComplete="address-level2"
                      placeholder="Contoh: Pekayon, Jakarta Timur"
                      value={group.companion.domicile}
                      error={group.companionErrors.domicile}
                      onChange={(e) => setCompanionField(groupIndex, "domicile", e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Pendamping Tambahan"
                    htmlFor={`companion-extraCompanions-${groupIndex}`}
                    error={group.companionErrors.extraCompanions}
                    hint={
                      extraCompanionPrice > 0
                        ? `Pendamping lain yang ikut datang, cukup jumlahnya. Biaya ${formatRupiah(extraCompanionPrice)} per orang${
                            group.companion.extraCompanions > 0
                              ? ` — ${formatRupiah(extraCompanionPrice * group.companion.extraCompanions)} untuk ${group.companion.extraCompanions} orang`
                              : ""
                          }.`
                        : "Pendamping lain yang ikut datang, cukup jumlahnya. Tanpa biaya tambahan."
                    }
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Kurangi pendamping tambahan"
                        onClick={() =>
                          setExtraCompanions(groupIndex, group.companion.extraCompanions - 1)
                        }
                        disabled={group.companion.extraCompanions <= 0}
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <TextInput
                        id={`companion-extraCompanions-${groupIndex}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_EXTRA_COMPANIONS}
                        className="w-20 text-center"
                        value={String(group.companion.extraCompanions)}
                        error={group.companionErrors.extraCompanions}
                        onChange={(e) => setExtraCompanions(groupIndex, Number(e.target.value))}
                      />
                      <button
                        type="button"
                        aria-label="Tambah pendamping tambahan"
                        onClick={() =>
                          setExtraCompanions(groupIndex, group.companion.extraCompanions + 1)
                        }
                        disabled={group.companion.extraCompanions >= MAX_EXTRA_COMPANIONS}
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
                      >
                        <Plus className="size-4" aria-hidden />
                      </button>
                      <span className="text-sm text-muted">orang</span>
                    </div>
                  </Field>
                </div>
              </section>

              <section aria-label="Data anak" className="space-y-5 border-t border-line pt-8">
                <header className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-sun-soft text-sun-dark">
                    <Baby className="size-[1.125rem]" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Data Anak</h2>
                    <p className="text-xs text-muted">
                      Kelas ini untuk usia {event.ageRange[0]}–{event.ageRange[1]} tahun.
                    </p>
                  </div>
                </header>

                {group.children.map((child, childIndex) => (
                  <fieldset
                    key={childIndex}
                    className="space-y-5 rounded-card border border-line bg-canvas-deep/30 p-4 sm:p-5"
                  >
                    <legend className="flex w-full items-center justify-between gap-3 px-1">
                      <span className="text-sm font-extrabold text-ink">
                        Anak {childIndex + 1}
                      </span>
                      {group.children.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeChild(groupIndex, childIndex)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Hapus
                        </button>
                      ) : null}
                    </legend>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Nama Anak"
                        htmlFor={`fullName-${groupIndex}-${childIndex}`}
                        error={group.childErrors[childIndex]?.fullName}
                        required
                        className="sm:col-span-2"
                      >
                        <TextInput
                          id={`fullName-${groupIndex}-${childIndex}`}
                          placeholder="Contoh: Adyatama Hamizan Nur Adam"
                          value={child.fullName}
                          error={group.childErrors[childIndex]?.fullName}
                          onChange={(e) =>
                            setChildField(groupIndex, childIndex, "fullName", e.target.value)
                          }
                        />
                      </Field>

                      <Field
                        label="Nama Panggilan"
                        htmlFor={`nickname-${groupIndex}-${childIndex}`}
                        error={group.childErrors[childIndex]?.nickname}
                        required
                      >
                        <TextInput
                          id={`nickname-${groupIndex}-${childIndex}`}
                          placeholder="Contoh: Tama"
                          value={child.nickname}
                          error={group.childErrors[childIndex]?.nickname}
                          onChange={(e) =>
                            setChildField(groupIndex, childIndex, "nickname", e.target.value)
                          }
                        />
                      </Field>

                      <Field
                        label="Tanggal Lahir"
                        htmlFor={`dateOfBirth-${groupIndex}-${childIndex}`}
                        error={group.childErrors[childIndex]?.dateOfBirth}
                        hint={dobHint(child.dateOfBirth, freeFlags[groupIndex]?.[childIndex])}
                        required
                      >
                        <TextInput
                          id={`dateOfBirth-${groupIndex}-${childIndex}`}
                          type="date"
                          min={minBirthDate}
                          max={today}
                          value={child.dateOfBirth}
                          error={group.childErrors[childIndex]?.dateOfBirth}
                          onChange={(e) =>
                            setChildField(groupIndex, childIndex, "dateOfBirth", e.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </fieldset>
                ))}

                {!isFree ? (
                  <p className="text-xs text-muted">
                    Anak di bawah {FREE_CHILD_UNDER_AGE} tahun gratis kalau datang bersama anak
                    berusia {FREE_CHILD_UNDER_AGE} tahun ke atas. Usia dihitung pada hari kelas.
                  </p>
                ) : null}

                {totalChildren < maxChildren ? (
                  <button
                    type="button"
                    onClick={() => addChild(groupIndex)}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    <Plus className="size-4" aria-hidden />
                    Daftarkan anak lain
                  </button>
                ) : null}
              </section>
            </div>
          ))}

          {mode === "GROUP" && totalChildren < maxChildren ? (
            <button
              type="button"
              onClick={addGroup}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
            >
              <Plus className="size-4" aria-hidden />
              Tambah Pendamping & Anak
            </button>
          ) : null}

          {totalChildren >= maxChildren ? (
            <p className="text-center text-xs text-muted">
              Sisa kuota kelas ini tinggal {maxChildren} anak.
            </p>
          ) : null}

          <section aria-label="Sumber informasi" className="space-y-5 border-t border-line pt-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Mengetahui Kelas Bermain dari"
                htmlFor="heardFrom"
                error={heardFromError ?? undefined}
                required
              >
                <Select
                  id="heardFrom"
                  value={heardFrom}
                  error={heardFromError ?? undefined}
                  onChange={(e) => {
                    setHeardFrom(e.target.value as RegistrationSource | "");
                    setHeardFromError(null);
                  }}
                >
                  <option value="">Pilih salah satu</option>
                  {SELECTABLE_SOURCES.map((key) => (
                    <option key={key} value={key}>
                      {sourceLabel[key]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Kode Affiliate" htmlFor="affiliateCode">
                <TextInput
                  id="affiliateCode"
                  placeholder="Contoh: FIKA10"
                  autoCapitalize="characters"
                  value={affiliateCode}
                  onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                />
                {affiliateCode.trim() ? (
                  affiliateMatch && affiliateMatch.status === "ACTIVE" ? (
                    <p className="mt-1 text-xs font-semibold text-pine-dark">
                      Kode {affiliateMatch.code} milik {affiliateMatch.fullName} ✓
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-sun-dark">
                      Kode tidak dikenal atau belum aktif. Pendaftaran tetap bisa dilanjutkan.
                    </p>
                  )
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    Belum punya kode?{" "}
                    <Link href="/affiliate" className="font-semibold text-brand hover:underline">
                      Jadi affiliator
                    </Link>{" "}
                    dan dapatkan komisi dari share-anmu sendiri.
                  </p>
                )}
              </Field>

              {!isFree ? (
                <Field
                  label="Kode Voucher"
                  htmlFor="voucherCode"
                  error={voucherError ?? undefined}
                  hint="Kalau punya. Diperiksa saat kamu menekan Lanjut."
                >
                  <TextInput
                    id="voucherCode"
                    placeholder="Contoh: KELASBERMAIN"
                    autoCapitalize="characters"
                    value={voucherCode}
                    error={voucherError ?? undefined}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase());
                      setVoucherError(null);
                    }}
                  />
                </Field>
              ) : null}
            </div>

            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-muted">
                Dengan melanjutkan, kamu menyatakan data di atas benar dan bersedia dihubungi
                panitia Kelas Bermain terkait {event.title}. Pembayaran dilakukan lewat
                WhatsApp setelah ini.
              </p>
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={goToConfirm}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Memproses…
                    </>
                  ) : (
                    <>
                      Lanjut
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

    </div>
  );
}

function ModeCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof UserRound;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
        active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/30",
      )}
    >
      <Icon className={cn("size-5", active ? "text-brand" : "text-muted")} aria-hidden />
      <span className={cn("text-sm font-bold", active ? "text-brand-ink" : "text-ink")}>
        {title}
      </span>
      <span className="text-xs text-muted">{description}</span>
    </button>
  );
}
