"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  CircleCheckBig,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { BankTransferPanel } from "@/components/registration/bank-transfer";
import { Checkbox, Field, Select, TextInput } from "@/components/forms/field";
import { PricingSummary } from "@/components/registration/pricing-summary";
import { StepProgress, type WizardStep } from "@/components/registration/steps";
import { RegistrationReceipt } from "@/components/registration/receipt";
import { Button, buttonStyles } from "@/components/ui/button";
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
import { registrationWhatsappUrl } from "@/lib/config/whatsapp";
import { formatRupiah } from "@/lib/utils/format";
import {
  clearDraft,
  draftHasContent,
  loadDraft,
  saveDraft,
} from "@/lib/registration/draft-storage";
import type { EventView } from "@/lib/types";
import { formatAge } from "@/lib/utils/age";
import { cn } from "@/lib/utils/cn";
import {
  ageOutsideRange,
  emptyChild,
  emptyParent,
  hasErrors,
  validateChild,
  validateParent,
  type ChildFormValues,
  type FieldErrors,
  type ParentFormValues,
} from "@/lib/utils/validation";

const STEPS: WizardStep[] = [
  { key: "participants", label: "Data Peserta" },
  { key: "confirm", label: "Konfirmasi" },
  { key: "payment", label: "Pembayaran" },
  { key: "done", label: "Selesai" },
];

type StepKey = "participants" | "confirm" | "payment" | "done";
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
 * A FREE event or a THIRD_PARTY one (paid on the partner's own platform)
 * skips straight from Konfirmasi to Selesai.
 *
 * The registration/payment rows are created at the Confirm step, before the
 * bank-transfer instructions ever appear, and stay PENDING — nothing in this
 * form ever marks a payment PAID. That verification is admin's job today
 * (Supabase Table Editor) and will be the future ERP's job later; see the
 * note on set_payment_status in supabase/schema.sql.
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
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherDefinition | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batch, setBatch] = useState<RegistrationBatch | null>(null);

  const isFree = event.registration.type === "FREE";
  // The real internal price — used for the actual charge even when
  // priceDisplay is HIDDEN on the public card (see lib/types.ts).
  const unitPrice = isFree ? 0 : (event.registration.price ?? 0);
  const isThirdParty = !isFree && event.registration.method === "THIRD_PARTY";

  const totalChildren = groups.reduce((sum, g) => sum + g.children.length, 0);
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
  const [pendingVoucher, setPendingVoucher] = useState<string | null>(null);
  useEffect(() => {
    const draft = loadDraft(event.id);
    if (!draft || !draftHasContent(draft)) return;

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
    if (draft.voucherCode) setPendingVoucher(draft.voucherCode);
    setStepKey(draft.stepKey);
    setRestored(true);
    // Intentionally only on mount: a later run would fight the parent's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on every change, but only before submission. Debounced so a fast
  // typist is not writing to storage on each keystroke.
  useEffect(() => {
    if (batch) return;
    if (stepKey !== "participants" && stepKey !== "confirm") return;

    const timer = setTimeout(() => {
      saveDraft(event.id, {
        mode,
        groups: groups.map((group) => ({
          companion: group.companion,
          children: group.children,
        })),
        heardFrom,
        affiliateCode,
        voucherCode: appliedVoucher?.code ?? "",
        stepKey,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [event.id, mode, groups, heardFrom, affiliateCode, appliedVoucher, stepKey, batch]);

  // A restored voucher is checked again rather than trusted: it may have
  // expired, run out, or no longer match the number of children.
  useEffect(() => {
    if (!pendingVoucher) return;
    setPendingVoucher(null);
    void applyVoucher(pendingVoucher);
    // applyVoucher reads the freshly restored group count, which this render
    // already has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVoucher]);

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

  const pricing = useMemo(
    () =>
      calculateRegistrationPrice({
        eventPrice: unitPrice,
        childrenCount: totalChildren,
        hasActiveAffiliate: affiliateMatch?.status === "ACTIVE",
        affiliateCode: affiliateCode.trim() || undefined,
        voucher: appliedVoucher,
        config: pricingConfig,
      }),
    [unitPrice, totalChildren, affiliateMatch, affiliateCode, appliedVoucher, pricingConfig],
  );

  // The voucher catalogue stays in the database: the browser only ever asks
  // whether one typed code is usable for this cart.
  async function applyVoucher(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      setAppliedVoucher(null);
      setVoucherError(null);
      return;
    }
    setVoucherChecking(true);
    const result = await lookupVoucher(trimmed, totalChildren, event.id);
    setVoucherChecking(false);
    if (result.ok) {
      setAppliedVoucher(result.voucher);
      setVoucherError(null);
    } else {
      setAppliedVoucher(null);
      setVoucherError(result.error);
    }
  }

  // The stepper never shows "Pembayaran" for a path that can't reach it.
  const steps = useMemo(
    () => (isFree || isThirdParty ? STEPS.filter((step) => step.key !== "payment") : STEPS),
    [isFree, isThirdParty],
  );
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
    setStepKey("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitRegistration() {
    if (!consent) {
      setConsentError("Centang persetujuan untuk melanjutkan.");
      return;
    }
    setConsentError(null);
    setFormError(null);
    setSubmitting(true);

    // Claimed here, while this is still the click the parent made. A tab
    // opened after the await is a popup, and browsers block it — so the tab
    // is reserved now and pointed somewhere once the registration exists.
    const handoff = window.open("", "_blank");

    // What the parent picked outranks the channel we inferred from the URL,
    // except when they scanned a QR — that is a fact, not a recollection.
    const attributed: RegistrationSource = source === "qr" ? "qr" : heardFrom || source;

    const participants: RegistrationParticipantGroup[] = groups.map((group) => ({
      companion: {
        fullName: group.companion.fullName,
        whatsapp: group.companion.whatsapp,
        email: group.companion.email.trim() || undefined,
        domicile: group.companion.domicile,
        source: attributed,
      },
      children: group.children.map((child) => ({
        fullName: child.fullName,
        nickname: child.nickname,
        ageYears: Number(child.ageYears),
        ageMonths: child.ageMonths.trim() === "" ? 0 : Number(child.ageMonths),
        // Flagged for admin review, never blocks the submission (KONF-02).
        // The reminder banner itself was removed from this step's UI, but
        // admin still needs to know which sign-ups fall outside the class's
        // stated age range.
        ageOverride: Boolean(ageOutsideRange(child, event.ageRange)),
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
      handoff?.close();
      setFormError(result.error);
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

    // Straight into WhatsApp, carrying the link back to this registration.
    // The page behind it still advances, so closing the chat does not strand
    // anyone — and if the browser refused the tab, the button on the next
    // step is the same link.
    const lead = result.batch.registrations[0];
    if (lead) {
      const origin = window.location.origin;
      const url = registrationWhatsappUrl({
        registrationNumber: lead.registrationNumber,
        companionName: groups[0]?.companion.fullName || "Orang tua",
        childrenCount: totalChildren,
        eventName: event.title,
        formattedTotal: isFree ? "Gratis" : formatRupiah(result.batch.totalAmount),
        statusUrl: isFree ? `${origin}/cek-tiket` : `${origin}/payment/${lead.accessToken}`,
        needsPayment: !isFree,
      });
      if (handoff) handoff.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } else {
      handoff?.close();
    }

    setBatch(result.batch);
    setStepKey(isFree || isThirdParty ? "done" : "payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const leadCompanionName = groups[0]?.companion.fullName || "";

  if (stepKey === "done" && batch) {
    return (
      <div className="space-y-6">
        <StepProgress steps={steps} current={currentIndex} />
        <RegistrationReceipt event={event} batch={batch} parentName={leadCompanionName} />
      </div>
    );
  }

  if (stepKey === "payment" && batch) {
    const lead = batch.registrations[0];
    return (
      <div className="space-y-6">
        <StepProgress steps={steps} current={currentIndex} />
        <section aria-label="Pembayaran" className="space-y-5">
          <header>
            <h2 className="text-base font-extrabold text-ink">Pembayaran</h2>
          </header>

          <dl className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
            <Row label="Nama Event" value={event.title} />
            <Row label="Jumlah peserta" value={`${totalChildren} anak`} />
          </dl>

          <PricingSummary pricing={batch.pricing} isFree={false} />

          <BankTransferPanel
            amount={batch.totalAmount}
            registrationNumber={lead.registrationNumber}
            eventTitle={event.title}
            childName={groups[0]?.children[0]?.fullName}
          />

          {/* The team works in WhatsApp, so that is where a parent is sent
              next. The link carries their registration number, and the page
              it points back to survives closing the tab. */}
          <div className="space-y-3 rounded-card border border-brand/25 bg-brand-soft/35 p-5">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
              <MessageCircle className="size-4 text-brand" aria-hidden />
              Lanjutkan lewat WhatsApp
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Tim kami akan membalas dengan tautan halaman pembayaranmu. Simpan tautan itu —
              lewat situ kamu mengirim bukti transfer dan memantau statusnya.
            </p>
            <a
              href={registrationWhatsappUrl({
                registrationNumber: lead.registrationNumber,
                companionName: groups[0]?.companion.fullName || "Orang tua",
                childrenCount: totalChildren,
                eventName: event.title,
                formattedTotal: formatRupiah(batch.totalAmount),
                statusUrl:
                  typeof window === "undefined"
                    ? undefined
                    : `${window.location.origin}/payment/${lead.accessToken}`,
                needsPayment: true,
              })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setStepKey("done")}
              className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
            >
              <MessageCircle className="size-4" aria-hidden />
              Lanjut ke Pembayaran
            </a>
          </div>

          <div className="flex justify-end border-t border-line pt-5">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStepKey("done")}
              className="w-full sm:w-auto"
            >
              Lanjut tanpa WhatsApp
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
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
                setAppliedVoucher(null);
                setVoucherError(null);
                setConsent(false);
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
                    label="Email"
                    htmlFor={`companion-email-${groupIndex}`}
                    error={group.companionErrors.email}
                  >
                    <TextInput
                      id={`companion-email-${groupIndex}`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      value={group.companion.email}
                      error={group.companionErrors.email}
                      onChange={(e) => setCompanionField(groupIndex, "email", e.target.value)}
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
                        label="Usia Anak"
                        htmlFor={`ageYears-${groupIndex}-${childIndex}`}
                        error={
                          group.childErrors[childIndex]?.ageYears ??
                          group.childErrors[childIndex]?.ageMonths
                        }
                        hint="Contoh: 3 tahun 8 bulan."
                        required
                      >
                        <div className="flex items-center gap-2">
                          <TextInput
                            id={`ageYears-${groupIndex}-${childIndex}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={17}
                            placeholder="3"
                            className="w-full"
                            value={child.ageYears}
                            error={group.childErrors[childIndex]?.ageYears}
                            onChange={(e) =>
                              setChildField(groupIndex, childIndex, "ageYears", e.target.value)
                            }
                          />
                          <span className="shrink-0 text-sm text-muted">tahun</span>
                          <TextInput
                            id={`ageMonths-${groupIndex}-${childIndex}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={11}
                            placeholder="8"
                            className="w-full"
                            aria-label={`Usia anak ${childIndex + 1} dalam bulan`}
                            value={child.ageMonths}
                            error={group.childErrors[childIndex]?.ageMonths}
                            onChange={(e) =>
                              setChildField(groupIndex, childIndex, "ageMonths", e.target.value)
                            }
                          />
                          <span className="shrink-0 text-sm text-muted">bulan</span>
                        </div>
                      </Field>
                    </div>
                  </fieldset>
                ))}

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
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={goToConfirm} className="w-full sm:w-auto">
                Lanjut ke Konfirmasi
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {/* ---------------- Step 2: confirm — short, checkout-style ---------------- */}
      {stepKey === "confirm" ? (
        <section aria-label="Konfirmasi pendaftaran" className="space-y-4">
          <h2 className="text-base font-extrabold text-ink">Konfirmasi Data</h2>

          {mode === "PERSONAL" ? (
            <>
              <SummaryBlock title="Data Anak" onEdit={() => setStepKey("participants")}>
                <ul className="space-y-1">
                  {groups[0]?.children.map((child, index) => (
                    <li key={index} className="text-sm text-ink">
                      <span className="font-semibold">
                        {child.fullName || "—"} {child.nickname ? `(${child.nickname})` : ""}
                      </span>
                      <span className="text-muted">
                        {" "}
                        · {formatAge(Number(child.ageYears) || 0, Number(child.ageMonths) || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </SummaryBlock>

              <SummaryBlock title="Pendamping" onEdit={() => setStepKey("participants")}>
                <p className="text-sm font-semibold text-ink">{groups[0]?.companion.fullName}</p>
                <p className="text-sm text-muted">{groups[0]?.companion.whatsapp}</p>
                <p className="text-sm text-muted">{groups[0]?.companion.domicile}</p>
              </SummaryBlock>
            </>
          ) : (
            groups.map((group, groupIndex) => (
              <SummaryBlock
                key={groupIndex}
                title={`Pendamping ${groupIndex + 1}`}
                onEdit={() => setStepKey("participants")}
              >
                <p className="text-sm font-semibold text-ink">{group.companion.fullName}</p>
                <p className="text-sm text-muted">{group.companion.whatsapp}</p>
                <p className="text-sm text-muted">{group.companion.domicile}</p>
                <ul className="mt-2 space-y-1 border-t border-line pt-2">
                  {group.children.map((child, index) => (
                    <li key={index} className="text-sm text-ink">
                      <span className="font-semibold">
                        {child.fullName || "—"} {child.nickname ? `(${child.nickname})` : ""}
                      </span>
                      <span className="text-muted">
                        {" "}
                        · {formatAge(Number(child.ageYears) || 0, Number(child.ageMonths) || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </SummaryBlock>
            ))
          )}

          <SummaryBlock title="Sumber Informasi" onEdit={() => setStepKey("participants")}>
            <p className="text-sm text-ink">{heardFrom ? sourceLabel[heardFrom] : "—"}</p>
            {affiliateCode.trim() ? (
              <p className="mt-0.5 text-xs text-muted">Kode affiliate: {affiliateCode}</p>
            ) : null}
          </SummaryBlock>

          <div className="flex items-center justify-between rounded-card border border-line bg-surface px-5 py-4">
            <span className="text-sm font-bold text-ink">Jumlah Peserta</span>
            <span className="text-sm font-semibold text-ink">{totalChildren} anak</span>
          </div>

          <PricingSummary
            pricing={pricing}
            isFree={isFree}
            editable={!isFree}
            onApplyVoucher={(code) => void applyVoucher(code)}
            voucherError={voucherError}
            voucherChecking={voucherChecking}
          />

          {isThirdParty ? (
            <p className="rounded-xl border border-sky/25 bg-sky-soft/70 p-4 text-xs leading-relaxed text-ink-soft">
              Pembayaran kelas ini diselesaikan di platform mitra, bukan di situs Kelas
              Bermain. Setelah mendaftar kamu akan diarahkan ke sana.
            </p>
          ) : null}

          <Checkbox
            id="consent"
            checked={consent}
            error={consentError ?? undefined}
            onChange={(checked) => {
              setConsent(checked);
              if (checked) setConsentError(null);
            }}
            label={
              <>
                Saya orang tua/wali yang mendaftarkan anak di atas, menyatakan datanya benar,
                dan bersedia dihubungi panitia Kelas Bermain terkait {event.title}.
              </>
            }
          />

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStepKey("participants")}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Kembali
            </Button>
            <Button
              size="lg"
              onClick={submitRegistration}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Memproses…
                </>
              ) : isFree ? (
                "Daftar Sekarang"
              ) : (
                "Lanjut ke Pembayaran"
              )}
            </Button>
          </div>
        </section>
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

function SummaryBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          <Pencil className="size-3" aria-hidden />
          Ubah
        </button>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
