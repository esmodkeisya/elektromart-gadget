// app/hubungi-cs/page.tsx
"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MessageCircle, Mail, Phone, MapPin, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useHelpPage } from "@/hooks/useHelpPage";
import { tr } from "@/lib/helpPages";

const channelIcons = [MessageCircle, Mail, Phone];
const infoIcons = [MapPin, Clock, Mail];

export default function HubungiCsPage() {
  const { language } = useLanguage();
  const { data } = useHelpPage("hubungi-cs");

  const channels = data.items.slice(0, 3);
  const infos = data.items.slice(3);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
            <MessageCircle className="h-6 w-6" />
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
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {channels.map((item, idx) => {
              const Icon = channelIcons[idx] ?? MessageCircle;
              return (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 text-sm font-semibold text-navy-900">{tr(item.heading, language)}</h2>
                  <p className="mt-1 break-all text-xs text-slate-500">{tr(item.body, language)}</p>
                </div>
              );
            })}
          </div>

          {infos.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {infos.map((item, idx) => {
                const Icon = infoIcons[idx] ?? MapPin;
                return (
                  <div key={idx} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5">
                    <Icon className="h-5 w-5 shrink-0 text-brand-blue" />
                    <div>
                      <h3 className="text-sm font-semibold text-navy-900">{tr(item.heading, language)}</h3>
                      <p className="text-xs text-slate-500">{tr(item.body, language)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
