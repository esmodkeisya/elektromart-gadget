"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ChevronDown,
  CircleHelp,
  LayoutGrid,
  Package,
  ShoppingCart,
  Wallet,
  Flag,
  MessageCircle,
  Store,
  PackagePlus,
  ShieldCheck,
  Banknote,
  UserPlus,
  Mail,
  Phone,
  LifeBuoy,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useHelpPage } from "@/hooks/useHelpPage";
import { tr } from "@/lib/helpPages";

const menuCepat = [
  { id: "panduan", labelKey: "sellerHelp.guideTitle", icon: CircleHelp },
  { id: "fitur", labelKey: "sellerHelp.featuresTitle", icon: LayoutGrid },
  { id: "faq", labelKey: "sellerHelp.faqTitle", icon: MessageCircle },
  { id: "kontak", labelKey: "sellerHelp.contactTitle", icon: Phone },
];

const langkah = [
  { icon: UserPlus, titleKey: "sellerHelp.step1Title", descKey: "sellerHelp.step1Desc", href: "/register-penjual" },
  { icon: Store, titleKey: "sellerHelp.step2Title", descKey: "sellerHelp.step2Desc", href: "/seller/profile" },
  { icon: PackagePlus, titleKey: "sellerHelp.step3Title", descKey: "sellerHelp.step3Desc", href: "/seller/produk/tambahproduk" },
  { icon: ShoppingCart, titleKey: "sellerHelp.step4Title", descKey: "sellerHelp.step4Desc", href: "/seller/pesanan" },
  { icon: ShieldCheck, titleKey: "sellerHelp.step5Title", descKey: "sellerHelp.step5Desc", href: "/seller/pesanan" },
  { icon: Banknote, titleKey: "sellerHelp.step6Title", descKey: "sellerHelp.step6Desc", href: "/seller/finance" },
];

const fitur = [
  { icon: LayoutGrid, titleKey: "sellerHelp.featDashboard", descKey: "sellerHelp.featDashboardDesc", href: "/seller/dashboard" },
  { icon: Package, titleKey: "sellerHelp.featProducts", descKey: "sellerHelp.featProductsDesc", href: "/seller/produk" },
  { icon: ShoppingCart, titleKey: "sellerHelp.featOrders", descKey: "sellerHelp.featOrdersDesc", href: "/seller/pesanan" },
  { icon: Wallet, titleKey: "sellerHelp.featFinance", descKey: "sellerHelp.featFinanceDesc", href: "/seller/finance" },
  { icon: Flag, titleKey: "sellerHelp.featReports", descKey: "sellerHelp.featReportsDesc", href: "/seller/laporan" },
  { icon: MessageCircle, titleKey: "sellerHelp.featChat", descKey: "sellerHelp.featChatDesc", href: "/seller/chat" },
];

const contactIcons = [MessageCircle, Mail, Phone];

export default function BantuanPenjual() {
  const { t, language } = useLanguage();
  const { data } = useHelpPage("bantuan-penjual");
  const { data: contactData } = useHelpPage("hubungi-cs");
  const sellerFaq = data.items;
  const contactChannels = contactData.items.slice(0, 3);
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ==================== HEADER ==================== */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            {tr(data.title, language)}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
            {tr(data.subtitle, language)}
          </p>
        </div>
      </section>

      {/* ==================== NAVIGASI CEPAT ==================== */}
      <div className="sticky top-[68px] z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 px-4 py-3 sm:px-6">
          {menuCepat.map((item) => (
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

      {/* ==================== PANDUAN MULAI JUAL ==================== */}
      <section id="panduan" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">{t("sellerHelp.guideTitle")}</span>
            <p className="mt-2 text-slate-500">{t("sellerHelp.guideSubtitle")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {langkah.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:border-slate-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-slate-300">{String(idx + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">{t(item.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t(item.descKey)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FITUR ==================== */}
      <section id="fitur" className="scroll-mt-32 border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">{t("sellerHelp.featuresTitle")}</span>
            <p className="mt-2 text-slate-500">{t("sellerHelp.featuresSubtitle")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fitur.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-slate-200 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-navy-900">{t(item.titleKey)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(item.descKey)}</p>
                <span className="mt-3 block text-xs font-semibold text-brand-blue">{t("sellerHelp.openPage")} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">{t("sellerHelp.faqTitle")}</span>
            <p className="mt-2 text-slate-500">{t("sellerHelp.faqSubtitle")}</p>
          </div>

          <div className="mt-8 space-y-3">
            {sellerFaq.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-slate-100 bg-white px-5 py-4 transition-colors open:border-slate-200 hover:border-slate-200"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-navy-900">
                  {tr(item.heading, language)}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{tr(item.body, language)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HUBUNGI CS ==================== */}
      <section id="kontak" className="scroll-mt-32 border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900">{t("sellerHelp.contactTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t("sellerHelp.contactDesc")}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {contactChannels.map((item, idx) => {
                const Icon = contactIcons[idx] ?? MessageCircle;
                return (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 text-left">
                    <Icon className="h-5 w-5 text-brand-blue" />
                    <h3 className="mt-2 text-sm font-semibold text-navy-900">{tr(item.heading, language)}</h3>
                    <p className="mt-1 break-all text-xs text-slate-500">{tr(item.body, language)}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/hubungi-cs"
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
              >
                {t("help.contactUs")}
              </Link>
              <Link
                href="/seller/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
              >
                <LayoutGrid className="h-4 w-4" /> Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
