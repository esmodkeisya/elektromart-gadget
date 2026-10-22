// app/bantuan/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ChevronDown,
  HelpCircle,
  Search,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Lock,
  LifeBuoy,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useHelpPage } from "@/hooks/useHelpPage";
import { tr } from "@/lib/helpPages";

// Menu navigasi cepat, sesuai 4 link di footer "BANTUAN"
const menuBantuan = [
  { id: "panduan", labelKey: "gettingStarted", icon: Search },
  { id: "faq", labelKey: "faq", icon: HelpCircle },
  { id: "syarat-ketentuan", labelKey: "syaratKetentuan", icon: FileText },
  { id: "kebijakan-privasi", labelKey: "kebijakanPrivasi", icon: Lock },
  { id: "hubungi-cs", labelKey: "hubungiCS", icon: MessageCircle },
];

// Data panduan langkah-langkah
const panduanAwal = [
  { icon: Search, titleKey: "help.step1Title", descKey: "help.step1Desc" },
  { icon: ShoppingBag, titleKey: "help.step2Title", descKey: "help.step2Desc" },
  { icon: CreditCard, titleKey: "help.step3Title", descKey: "help.step3Desc" },
  { icon: Truck, titleKey: "help.step4Title", descKey: "help.step4Desc" },
  { icon: ShieldCheck, titleKey: "help.step5Title", descKey: "help.step5Desc" },
];

const contactIcons = [MessageCircle, Mail, Phone];

export default function BantuanPage() {
  const { t, language } = useLanguage();
  const { data: faqData } = useHelpPage("faq");
  const { data: tosData } = useHelpPage("syarat-ketentuan");
  const { data: privacyData } = useHelpPage("kebijakan-privasi");
  const { data: contactData } = useHelpPage("hubungi-cs");
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
            {t("helpCenter")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
            {t("helpIntro")}
          </p>
        </div>
      </section>

      {/* ==================== NAVIGASI CEPAT ==================== */}
      <div className="sticky top-[68px] z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 px-4 py-3 sm:px-6">
          {menuBantuan.map((item) => (
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

      {/* ==================== PANDUAN MEMULAI ==================== */}
      <section id="panduan" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
              {t("gettingStarted")}
            </span>
            <p className="mt-2 text-slate-500">{t("gettingStartedIntro")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {panduanAwal.map((item, idx) => (
              <div
                key={idx}
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq" className="scroll-mt-32 border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">{t("faq")}</span>
            <p className="mt-2 text-slate-500">{t("faqIntro")}</p>
          </div>

          <div className="mt-8 space-y-3">
            {faqData.items.map((item, idx) => (
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

      {/* ==================== SYARAT & KETENTUAN ==================== */}
      <section id="syarat-ketentuan" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">{t("syaratKetentuan")}</span>
            <p className="mt-2 text-slate-500">{t("help.tosIntro")}</p>
          </div>

          <div className="mt-8 space-y-3">
            {tosData.items.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-navy-900/5 text-[10px] font-bold text-navy-900">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-navy-900">{tr(item.heading, language)}</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-500">{tr(item.body, language)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== KEBIJAKAN PRIVASI ==================== */}
      <section id="kebijakan-privasi" className="scroll-mt-32 border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">{t("kebijakanPrivasi")}</span>
            <p className="mt-2 text-slate-500">{t("help.privacyIntro")}</p>
          </div>

          <div className="mt-8 space-y-3">
            {privacyData.items.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5">
                <h3 className="text-sm font-semibold text-navy-900">{tr(item.heading, language)}</h3>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-500">{tr(item.body, language)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HUBUNGI CS ==================== */}
      <section id="hubungi-cs" className="scroll-mt-32 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/80 px-6 py-12 text-center sm:px-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900">{t("hubungiCS")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t("help.csDesc")}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {contactChannels.map((item, idx) => {
                const Icon = contactIcons[idx] ?? MessageCircle;
                return (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 text-left transition-colors hover:border-slate-200">
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
                href="/beranda"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
              >
                {t("admin.backHome")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}