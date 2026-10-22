"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get("email");
    if (prefill) setEmail(prefill);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !email.includes("@")) {
      setError(t("auth.forgotEmailFirst"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.minPasswordError"));
      return;
    }

    if (password !== confirmation) {
      setError(t("auth.confirmPasswordMismatch"));
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.resetPassword({ email: email.trim(), password });
    setIsSubmitting(false);

    if (updateError) {
      setError(`${t("auth.passwordUpdateFailed")}${updateError.message}`);
      return;
    }

    setMessage(t("auth.passwordUpdateSuccess"));
    window.setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold text-[#6659f2]">ElektroMart</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("auth.resetTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {t("auth.resetSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.placeholderEmail")}
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-[#6659f2] focus:ring-2 focus:ring-[#6659f2]/20"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            {t("auth.newPassword")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.min8Chars")}
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-[#6659f2] focus:ring-2 focus:ring-[#6659f2]/20"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            {t("auth.confirmPassword")}
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={t("auth.placeholderConfirmNewPassword")}
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-[#6659f2] focus:ring-2 focus:ring-[#6659f2]/20"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-[#4c3fe0] text-sm font-bold text-white transition hover:bg-[#3c2fc7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("auth.saving") : t("auth.saveNewPassword")}
          </button>
        </form>
      </section>
    </main>
  );
}
