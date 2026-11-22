"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { FlashSaleCard } from "@/components/produk/ProductCard";
import { flashRecordToProduct, useFlashSale } from "@/hooks/useFlashSale";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function FlashSalePageClient() {
  const { t } = useLanguage();
  const flashSale = useFlashSale();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md">
            <span>{t("admin.activeFlashSale")}</span>
            <span className="rounded bg-black/20 px-2 py-1 font-mono font-bold">
              {flashSale.loading ? "…" : `${flashSale.soldUnits}/${flashSale.quota} ${t("soldCount")}`}
            </span>
          </div>
        </div>

        {flashSale.loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-6 py-14 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("flashSaleLoading")}
          </div>
        ) : flashSale.products.length ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {flashSale.products.map((product) => (
              <FlashSaleCard key={product.id} product={flashRecordToProduct(product)} />
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-slate-100 bg-white px-6 py-10 text-center text-sm text-slate-500">
            {t("admin.noFlashSale")}
          </p>
        )}

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
