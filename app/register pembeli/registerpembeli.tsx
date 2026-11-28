"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, KeyRound, Eye, EyeOff, UserPlus } from "lucide-react";
import { localAuth } from "@/lib/localAuth";
import { useLanguage } from "@/lib/i18n";
import AuthLayout, { AuthField, RoleToggle } from "@/components/auth/AuthLayout";

interface FormState {
  nama: string;
  email: string;
  telepon: string;
  password: string;
  konfirmasi: string;
}

export default function RegisterPembeliPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    nama: "",
    email: "",
    telepon: "",
    password: "",
    konfirmasi: "",
  });

  const handleChange =
    (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isFormComplete = Object.values(form).every((value) => value.trim() !== "");

    if (!isFormComplete) {
      alert(t("auth.alertCompleteData"));
      return;
    }

    if (form.password !== form.konfirmasi) {
      alert(t("auth.alertPasswordMismatch"));
      return;
    }

    if (!agree) {
      alert(t("auth.alertAgreeTerms"));
      return;
    }

    setIsSubmitting(true);
    const { error } = await localAuth.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          role: "buyer",
          full_name: form.nama.trim(),
          phone: form.telepon.trim(),
        },
      },
    });

    setIsSubmitting(false);
    if (error) {
      alert(`${t("auth.registerFailed")}${error.message}`);
      return;
    }

    alert(t("auth.registerSuccess"));
    router.push("/login");
  };

  return (
    <AuthLayout mode="buyer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-navy-900">
            {t("auth.registerAs")}
          </label>
          <RoleToggle active="buyer" />
        </div>

        <AuthField
          label={t("auth.fullName")}
          icon={<User className="h-[18px] w-[18px]" />}
          placeholder={t("auth.placeholderFullName")}
          type="text"
          value={form.nama}
          onChange={handleChange("nama")}
        />

        <AuthField
          label={t("auth.email")}
          icon={<Mail className="h-[18px] w-[18px]" />}
          placeholder={t("auth.placeholderEmail")}
          type="email"
          value={form.email}
          onChange={handleChange("email")}
        />

        <AuthField
          label={t("auth.phone")}
          icon={<Phone className="h-[18px] w-[18px]" />}
          placeholder={t("auth.placeholderPhone")}
          type="tel"
          value={form.telepon}
          onChange={handleChange("telepon")}
        />

        <AuthField
          label={t("auth.password")}
          icon={<Lock className="h-[18px] w-[18px]" />}
          placeholder={t("auth.min8Chars")}
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={handleChange("password")}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={t("auth.toggleKataSandiVisibility")}
              className="text-slate-400 transition-colors hover:text-navy-900"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          }
        />

        <AuthField
          label={t("auth.confirmPassword")}
          icon={<KeyRound className="h-[18px] w-[18px]" />}
          placeholder={t("auth.placeholderConfirmPassword")}
          type={showConfirm ? "text" : "password"}
          value={form.konfirmasi}
          onChange={handleChange("konfirmasi")}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={t("auth.toggleConfirmPasswordVisibility")}
              className="text-slate-400 transition-colors hover:text-navy-900"
            >
              {showConfirm ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          }
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-slate-600">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-brand-blue"
          />
          <span>
            {t("auth.agreeTerms1")}
            <a href="#" className="font-semibold text-brand-blue hover:text-navy-900">
              {t("syaratKetentuan")}
            </a>
            {t("auth.agreeTerms2")}
            <a href="#" className="font-semibold text-brand-blue hover:text-navy-900">
              {t("kebijakanPrivasi")}
            </a>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-blue/25 transition-all hover:bg-navy-900 hover:shadow-xl hover:shadow-navy-900/25 disabled:opacity-60"
        >
          {isSubmitting ? (
            t("auth.registering")
          ) : (
            <>
              {t("registerNow")}
              <UserPlus className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>

        <p className="pt-1 text-center text-sm text-slate-500">
          {t("auth.alreadyHaveAccount")}{" "}
          <a
            href="/login"
            className="font-bold text-brand-blue transition-colors hover:text-navy-900"
          >
            {t("auth.loginHere")}
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}