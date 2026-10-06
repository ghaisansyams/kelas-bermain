import type { EventView } from "@/lib/types";
import { resolvePriceDisplay } from "@/lib/types";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Single source of truth for how an event's price reads on a card, detail
 * page, or anywhere else that shows the short label rather than the full
 * "Biaya Registrasi" breakdown (see registration-panel.tsx for that one —
 * a customer paying still needs the real number even when the card hides it).
 * Renders nothing for HIDDEN so callers can skip wrapping chrome entirely.
 */
export function EventPrice({ event }: { event: Pick<EventView, "registration"> }) {
  const display = resolvePriceDisplay(event.registration);
  if (display === "HIDDEN") return null;
  if (display === "FREE") return "Gratis";
  return formatRupiah(event.registration.price ?? 0);
}
