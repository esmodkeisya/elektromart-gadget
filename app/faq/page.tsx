// app/faq/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useHelpPage } from "@/hooks/useHelpPage";
import { tr } from "@/lib/helpPages";

export default function FaqPage() {
  const { t, language } = useLanguage();
  const { data } = useHelpPage("faq");
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <CircleHelp className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            {tr(data.title, language)}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
            {tr(data.subtitle, language)}
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-3">
          {data.items.map((item, idx) => (
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

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-100 bg-slate-50/60 p-6 text-center">
          <p className="text-sm text-slate-500">{tr(data.subtitle, language)}</p>
          <Link
            href="/hubungi-cs"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-800"
          >
            {t("contactPage.title")}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
