"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Store, Mail, Phone, MapPin, Lock, Eye, EyeOff } from "lucide-react";
import { localAuth } from "@/lib/localAuth";
import { useLanguage } from "@/lib/i18n";
import AuthLayout, { AuthField, RoleToggle } from "@/components/auth/AuthLayout";

interface FormState {
  namaToko: string;
  email: string;
  telepon: string;
  alamatToko: string;
  password: string;
}

export default function RegisterPenjualPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    namaToko: "",
    email: "",
    telepon: "",
    alamatToko: "",
    password: "",
  });

  const handleChange =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isFormComplete = Object.values(form).every((value) => value.trim() !== "");

    if (!isFormComplete) {
      alert(t("auth.alertCompleteData"));
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
          role: "seller",
          store_name: form.namaToko.trim(),
          phone: form.telepon.trim(),
          store_address: form.alamatToko.trim(),
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
    <AuthLayout mode="seller">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-navy-900">
            {t("auth.registerAs")}
          </label>
          <RoleToggle active="seller" />
        </div>

        <AuthField
          label={t("auth.storeName")}
          icon={<Store className="h-[18px] w-[18px]" />}
          placeholder={t("auth.placeholderStoreName")}
          type="text"
          value={form.namaToko}
          onChange={handleChange("namaToko")}
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

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-navy-900">
            {t("auth.warehouseAddress")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400">
              <MapPin className="h-[18px] w-[18px]" />
            </span>
            <textarea
              placeholder={t("auth.placeholderFullAddress")}
              value={form.alamatToko}
              onChange={handleChange("alamatToko")}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-navy-900 outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
            />
          </div>
        </div>

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
              <Store className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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