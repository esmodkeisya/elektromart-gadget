// app/kebijakan-privasi/page.tsx
"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useHelpPage } from "@/hooks/useHelpPage";
import { tr } from "@/lib/helpPages";

export default function KebijakanPrivasiPage() {
  const { language } = useLanguage();
  const { data } = useHelpPage("kebijakan-privasi");
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
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
        <div className="mx-auto max-w-2xl space-y-4">
          {data.items.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-6">
              <h2 className="text-base font-semibold text-navy-900">{tr(item.heading, language)}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">
                {tr(item.body, language)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
