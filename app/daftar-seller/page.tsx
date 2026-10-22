// app/daftar-seller/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Store,
  UserPlus,
  Users,
  Wallet,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const keuntungan = [
  { icon: Store, titleKey: "jual.benefit1Title", descKey: "jual.benefit1Desc" },
  { icon: Users, titleKey: "jual.benefit2Title", descKey: "jual.benefit2Desc" },
  { icon: Wallet, titleKey: "jual.benefit3Title", descKey: "jual.benefit3Desc" },
];

const syarat = [
  "daftarSeller.req1",
  "daftarSeller.req2",
  "daftarSeller.req3",
  "daftarSeller.req4",
];

export default function DaftarSellerPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ==================== HEADER ==================== */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <UserPlus className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            {t("daftarSeller.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
            {t("daftarSeller.subtitle")}
          </p>
          <div className="mt-8">
            <Link
              href="/register-penjual"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" /> {t("daftarSeller.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== KEUNTUNGAN ==================== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {keuntungan.map((item) => (
              <div
                key={item.titleKey}
                className="rounded-2xl border border-slate-100 bg-white p-5 text-center transition-all duration-300 hover:border-slate-200 hover:shadow-sm"
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-navy-900">{t(item.titleKey)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SYARAT PENDAFTARAN ==================== */}
      <section className="border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("daftarSeller.requirements")}
            </span>
          </div>
          <div className="mt-8 space-y-3">
            {syarat.map((key) => (
              <div key={key} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm leading-relaxed text-slate-600">{t(key)}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/register-penjual"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
            >
              {t("daftarSeller.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}