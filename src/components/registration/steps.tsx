import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface WizardStep {
  key: string;
  label: string;
}

export function StepProgress({
  steps,
  current,
}: {
  steps: WizardStep[];
  current: number;
}) {
  const percent = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div>
      <ol className="flex items-start gap-1" aria-label="Langkah pendaftaran">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-colors",
                  done && "bg-pine text-white",
                  active && "bg-brand text-white ring-4 ring-brand/15",
                  !done && !active && "bg-canvas-deep text-muted",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[0.6875rem] font-semibold sm:text-xs",
                  active ? "text-ink" : "text-muted",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-canvas-deep">
        <div
          className="h-full rounded-pill bg-brand transition-[width] duration-500"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  );
}
