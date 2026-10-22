"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { FlashSaleCard } from "@/components/produk/ProductCard";
import { flashSaleProducts } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export default function FlashSalePageClient() {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [seconds, setSeconds] = useState(7 * 3600 + 56 * 60 + 55);

  useEffect(() => {
    let active = true;
    const syncUser = () =>
      supabase.auth.getUser().then(({ data }) => {
        if (active) setIsLoggedIn(Boolean(data.user));
      });
    void syncUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void syncUser());
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <Zap className="h-7 w-7 fill-white text-white" />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold text-navy-900">{t("flashSale")}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{t("flashSaleDescription")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md">
            <span>{t("endsIn")}</span>
            <div className="flex items-center gap-1 font-mono font-bold">
              <span className="rounded bg-black/20 px-2 py-1">{pad(hrs)}</span>
              <span>:</span>
              <span className="rounded bg-black/20 px-2 py-1">{pad(mins)}</span>
              <span>:</span>
              <span className="rounded bg-black/20 px-2 py-1">{pad(secs)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {flashSaleProducts.map((product) => (
            <FlashSaleCard key={product.id} product={product} />
          ))}
        </div>

        {isLoggedIn ? (
          <div className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-6 text-center">
            <p className="text-sm font-medium text-emerald-700 sm:text-base">{t("flashSaleLoggedIn")}</p>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-slate-100 bg-white px-6 py-10 text-center shadow-card">
            <p className="text-sm text-slate-600 sm:text-base">{t("nextFlashSale")}</p>
            <Link
              href="/register-pembeli"
              className="mt-5 inline-block rounded-lg bg-brand-blue px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue/90"
            >
              {t("registerNow")}
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
