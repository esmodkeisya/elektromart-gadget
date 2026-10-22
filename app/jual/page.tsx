// app/jual/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Store,
  UserPlus,
  Users,
  Wallet,
  BookOpen,
  LayoutGrid,
  Package,
  ShoppingCart,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const menuJual = [
  { id: "daftar-seller", labelKey: "jual.navDaftarSeller", icon: UserPlus },
  { id: "pusat-edukasi-seller", labelKey: "jual.navPusatEdukasi", icon: BookOpen },
];

const keuntungan = [
  { icon: Store, titleKey: "jual.benefit1Title", descKey: "jual.benefit1Desc" },
  { icon: Users, titleKey: "jual.benefit2Title", descKey: "jual.benefit2Desc" },
  { icon: Wallet, titleKey: "jual.benefit3Title", descKey: "jual.benefit3Desc" },
];

const materiEdukasi = [
  { icon: UserPlus, titleKey: "sellerHelp.step1Title", descKey: "sellerHelp.step1Desc", href: "/bantuan-penjual" },
  { icon: Package, titleKey: "sellerHelp.step3Title", descKey: "sellerHelp.step3Desc", href: "/bantuan-penjual" },
  { icon: ShoppingCart, titleKey: "sellerHelp.step4Title", descKey: "sellerHelp.step4Desc", href: "/bantuan-penjual" },
  { icon: Banknote, titleKey: "sellerHelp.step6Title", descKey: "sellerHelp.step6Desc", href: "/bantuan-penjual" },
];

export default function JualPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ==================== HEADER ==================== */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <Store className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            {t("jual.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
            {t("jual.subtitle")}
          </p>
        </div>
      </section>

      {/* ==================== NAVIGASI CEPAT ==================== */}
      <div className="sticky top-[68px] z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 px-4 py-3 sm:px-6">
          {menuJual.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white"
            >
              <item.icon className="h-3.5 w-3.5" />
              {t(item.labelKey)}
            </a>
          ))}
        </div>
      </div>

      {/* ==================== DAFTAR SELLER ==================== */}
      <section id="daftar-seller" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("daftarSeller")}
            </span>
            <p className="mt-2 text-slate-500">{t("jual.daftarSellerDesc")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
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

          <div className="mt-8 text-center">
            <Link
              href="/register-penjual"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
            >
              <UserPlus className="h-4 w-4" /> {t("jual.registerCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== PUSAT EDUKASI SELLER ==================== */}
      <section id="pusat-edukasi-seller" className="scroll-mt-32 border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("pusatEdukasiSeller")}
            </span>
            <p className="mt-2 text-slate-500">{t("jual.eduDesc")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {materiEdukasi.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="group rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-slate-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-slate-300">{String(idx + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-navy-900">{t(item.titleKey)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(item.descKey)}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/pusat-edukasi-seller"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <BookOpen className="h-4 w-4" /> {t("jual.openEducation")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/seller/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
            >
              <LayoutGrid className="h-4 w-4" /> {t("seller.sellerCentral")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}