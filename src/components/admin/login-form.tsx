"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError("Email atau kata sandi salah.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" required>
        <TextInput
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@kelasbermain.id"
          value={email}
          disabled={submitting}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Kata Sandi" htmlFor="password" required>
        <TextInput
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          disabled={submitting}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Memproses…
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}
