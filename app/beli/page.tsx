// app/beli/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ShoppingBag,
  Search,
  CreditCard,
  Truck,
  ShieldCheck,
  MapPin,
  PackageSearch,
  FileText,
  Lock,
  MessageCircle,
  LifeBuoy,
  Package,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const menuBeli = [
  { id: "cara-belanja", labelKey: "beli.navCaraBelanja", icon: ShoppingBag },
  { id: "lacak-pesanan", labelKey: "beli.navLacakPesanan", icon: Truck },
  { id: "bantuan-buyer", labelKey: "beli.navBantuanBuyer", icon: LifeBuoy },
];

const langkahBelanja = [
  { icon: Search, titleKey: "help.step1Title", descKey: "help.step1Desc" },
  { icon: ShoppingBag, titleKey: "help.step2Title", descKey: "help.step2Desc" },
  { icon: CreditCard, titleKey: "help.step3Title", descKey: "help.step3Desc" },
  { icon: Truck, titleKey: "help.step4Title", descKey: "help.step4Desc" },
  { icon: ShieldCheck, titleKey: "help.step5Title", descKey: "help.step5Desc" },
];

const langkahLacak = [
  { icon: PackageSearch, titleKey: "beli.lacak1Title", descKey: "beli.lacak1Desc" },
  { icon: MapPin, titleKey: "beli.lacak2Title", descKey: "beli.lacak2Desc" },
  { icon: Package, titleKey: "beli.lacak3Title", descKey: "beli.lacak3Desc" },
];

const quickHelp = [
  { icon: MessageCircle, labelKey: "faq", href: "/faq" },
  { icon: FileText, labelKey: "syaratKetentuan", href: "/syarat-ketentuan" },
  { icon: Lock, labelKey: "kebijakanPrivasi", href: "/kebijakan-privasi" },
  { icon: LifeBuoy, labelKey: "hubungiCS", href: "/hubungi-cs" },
];

export default function BeliPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ==================== HEADER ==================== */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <ShoppingBag className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            {t("beli.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
            {t("beli.subtitle")}
          </p>
        </div>
      </section>

      {/* ==================== NAVIGASI CEPAT ==================== */}
      <div className="sticky top-[68px] z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 px-4 py-3 sm:px-6">
          {menuBeli.map((item) => (
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

      {/* ==================== CARA BELANJA ==================== */}
      <section id="cara-belanja" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("caraBelanja")}
            </span>
            <p className="mt-2 text-slate-500">{t("beli.caraBelanjaDesc")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {langkahBelanja.map((item, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:border-slate-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">{t(item.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== LACAK PESANAN ==================== */}
      <section id="lacak-pesanan" className="scroll-mt-32 border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("lacakPesanan")}
            </span>
            <p className="mt-2 text-slate-500">{t("beli.lacakDesc")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {langkahLacak.map((item, idx) => (
              <div
                key={idx}
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
              href="/profil"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
            >
              <Truck className="h-4 w-4" /> {t("beli.trackNow")}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== BANTUAN BUYER ==================== */}
      <section id="bantuan-buyer" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("bantuanBuyer")}
            </span>
            <p className="mt-2 text-slate-500">{t("beli.bantuanBuyerDesc")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {quickHelp.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-slate-200 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-navy-900">{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/bantuan"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <LifeBuoy className="h-4 w-4" /> {t("beli.openHelp")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}