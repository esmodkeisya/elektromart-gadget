"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import AuthLayout, { AuthField } from "@/components/auth/AuthLayout";

interface FormState {
  identitas: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [ingatSaya, setIngatSaya] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [form, setForm] = useState<FormState>({
    identitas: "",
    password: "",
  });

  const handleChange =
    (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleForgotPassword = async () => {
    const email = form.identitas.trim();
    setForgotMessage("");

    if (!email || !email.includes("@")) {
      setForgotMessage(t("auth.forgotEmailFirst"));
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (error) {
      setForgotMessage(`${t("auth.resetLinkFailed")}${error.message}`);
      return;
    }

    setForgotMessage(t("auth.resetLinkSent"));
    window.setTimeout(() => {
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    }, 800);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isFormComplete = Object.values(form).every((value) => value.trim() !== "");

    if (!isFormComplete) {
      alert(t("auth.alertFillCredentials"));
      return;
    }

    setIsSubmitting(true);
    const identifier = form.identitas.trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      ...(identifier.includes("@") ? { email: identifier } : { phone: identifier }),
      password: form.password,
    });

    if (error || !data.user) {
      setIsSubmitting(false);
      alert(`${t("auth.loginFailed")}${error?.message ?? t("auth.accountNotFound")}`);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    setIsSubmitting(false);
    if (profileError) {
      alert(`${t("auth.loginSuccessProfileReadFail")}${profileError.message}`);
      return;
    }

    const role = profile?.role ?? data.user.user_metadata?.role ?? "buyer";
    const isAdmin = role === "admin" || data.user.email === "esmodkeisya@gmail.com";

    if (!profile) {
      const metadata = data.user.user_metadata ?? {};
      const { error: createProfileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        role,
        full_name: metadata.full_name ?? null,
        store_name: metadata.store_name ?? null,
        phone: metadata.phone ?? null,
        store_address: metadata.store_address ?? null,
        job_title: metadata.job_title ?? null,
      });

      if (createProfileError) {
        alert(`${t("auth.loginSuccessProfileUnavailable")}${createProfileError.message}`);
        return;
      }
    }

    if (isAdmin) {
      router.push("/admin/dashboard");
    } else if (role === "seller") {
      router.push("/seller/produk/tambahproduk");
    } else {
      router.push("/beranda");
    }
  };

  return (
    <AuthLayout mode="login">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label={t("auth.emailPhone")}
          icon={<Mail className="h-[18px] w-[18px]" />}
          placeholder={t("auth.placeholderEmailPhone")}
          type="text"
          value={form.identitas}
          onChange={handleChange("identitas")}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-semibold text-navy-900">{t("auth.password")}</label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSubmitting}
              className="text-[12.5px] font-semibold text-brand-blue transition-colors hover:text-navy-900 disabled:opacity-60"
            >
              {isSubmitting ? t("auth.sending") : t("auth.forgotPassword")}
            </button>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock className="h-[18px] w-[18px]" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.placeholderPassword")}
              value={form.password}
              onChange={handleChange("password")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-navy-900 outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={t("auth.togglePasswordVisibility")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-navy-900"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
          <input
            type="checkbox"
            checked={ingatSaya}
            onChange={(e) => setIngatSaya(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded accent-brand-blue"
          />
          {t("auth.rememberMe")}
        </label>

        {forgotMessage ? (
          <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-600">
            {forgotMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-blue/25 transition-all hover:bg-navy-900 hover:shadow-xl hover:shadow-navy-900/25 disabled:opacity-60"
        >
          {isSubmitting ? t("auth.processing") : t("login")}
          {!isSubmitting && (
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>

        <p className="pt-1 text-center text-sm text-slate-500">
          {t("auth.noAccount")}{" "}
          <a
            href="/register-pembeli"
            onClick={(e) => {
              e.preventDefault();
              router.push("/register-pembeli");
            }}
            className="font-bold text-brand-blue transition-colors hover:text-navy-900"
          >
            {t("registerNow")}
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}