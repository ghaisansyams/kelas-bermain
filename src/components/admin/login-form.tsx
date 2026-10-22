"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/app/admin/actions";

/**
 * Masuk lewat server action, bukan dari browser.
 *
 * Password dikirim ke server dan tidak pernah disentuh kode yang berjalan di
 * browser, dan cookie sesinya dipasang httpOnly dari sana.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, null);

  return (
    <form action={action} noValidate className="space-y-4">
      {state?.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="next" value={next ?? "/admin"} />

      <Field label="Email" htmlFor="email" required>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@kelasbermain.id"
        />
      </Field>

      <Field label="Kata Sandi" htmlFor="password" required>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

/** Terpisah supaya useFormStatus melihat formulir yang membungkusnya. */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Memproses…
        </>
      ) : (
        "Masuk"
      )}
    </Button>
  );
}
