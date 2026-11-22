"use client";

import { Loader2, Zap } from "lucide-react";
import { FlashSaleCard } from "@/components/produk/ProductCard";
import { flashRecordToProduct, useFlashSale } from "@/hooks/useFlashSale";
import { useLanguage } from "@/lib/i18n";

export default function FlashSale() {
  const { t } = useLanguage();
  const flashSale = useFlashSale();

  return (
    <section id="flash-sale" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
          <div className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 fill-white" />
            <h2 className="text-lg font-bold">{t("flashSale")}</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>{t("admin.activeFlashSale")}</span>
            <span className="rounded bg-black/20 px-2 py-1 font-mono">
              {flashSale.loading ? "…" : `${flashSale.soldUnits}/${flashSale.quota} ${t("soldCount")}`}
            </span>
          </div>
        </div>

        {flashSale.loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("flashSaleLoading")}
          </div>
        ) : flashSale.products.length ? (
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-6">
            {flashSale.products.map((product) => (
              <FlashSaleCard key={product.id} product={flashRecordToProduct(product)} />
            ))}
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-slate-500">{t("admin.noFlashSale")}</p>
        )}
      </div>
    </section>
  );
}
