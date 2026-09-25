"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertTriangle, LogIn } from "lucide-react";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { login, type LoginState } from "@/lib/auth/actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/dashboard";
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-3.5 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}

      <Field label="Username" htmlFor="username" required>
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          placeholder="admin"
          required
        />
      </Field>

      <Field label="Kata Sandi" htmlFor="password" required>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      <LogIn className="size-4" aria-hidden />
      {pending ? "Memproses…" : "Masuk"}
    </Button>
  );
}
