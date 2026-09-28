"use client";

import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const controlBase =
  "w-full rounded-xl border bg-surface px-4 text-[0.9375rem] text-ink placeholder:text-muted/60 " +
  "transition-colors duration-150 outline-none " +
  "focus:border-brand focus:ring-4 focus:ring-brand/12 " +
  "disabled:cursor-not-allowed disabled:bg-canvas-deep disabled:text-muted";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  fixed,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Prefilled and not editable — neither "required" nor "(opsional)" fits. */
  fixed?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
        {fixed ? null : required ? (
          <span className="ml-0.5 text-brand" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-medium text-muted">(opsional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-brand-dark"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface ControlProps {
  id: string;
  error?: string;
  hint?: string;
  className?: string;
}

export function TextInput({
  id,
  error,
  hint,
  className,
  ...props
}: ControlProps & React.ComponentProps<"input">) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={cn(
        controlBase,
        "h-12",
        error ? "border-brand/60 ring-2 ring-brand/15" : "border-line",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  id,
  error,
  hint,
  className,
  ...props
}: ControlProps & React.ComponentProps<"textarea">) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={cn(
        controlBase,
        "min-h-28 resize-y py-3 leading-relaxed",
        error ? "border-brand/60 ring-2 ring-brand/15" : "border-line",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  id,
  error,
  hint,
  className,
  children,
  ...props
}: ControlProps & React.ComponentProps<"select">) {
  return (
    <select
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={cn(
        controlBase,
        "h-12 appearance-none bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23756c64%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
        error ? "border-brand/60 ring-2 ring-brand/15" : "border-line",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  id,
  label,
  error,
  checked,
  onChange,
  name,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
}) {
  const describedBy = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
          error ? "border-brand/60 bg-brand-soft/40" : "border-line bg-surface hover:bg-canvas",
        )}
      >
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? describedBy : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md accent-brand"
        />
        <span className="text-[0.8125rem] leading-relaxed text-ink-soft">{label}</span>
      </label>
      {error ? (
        <p
          id={describedBy}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-brand-dark"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
