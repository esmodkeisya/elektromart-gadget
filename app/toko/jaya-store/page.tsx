"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, Store as StoreIcon, BadgeCheck, CalendarDays, Package, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BestSellerCard } from "@/components/produk/ProductCard";
import { api } from "@/lib/api";
import { slugify } from "@/lib/slugify";
import { recordToProduct, useLiveProducts } from "@/hooks/useLiveProducts";
import { useLanguage } from "@/lib/i18n";

type StoreRecord = {
  id: string;
  name?: string;
  store_name?: string | null;
  store_address?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  seller_status?: string | null;
  rating?: number;
  verified?: boolean;
  created_at?: string;
  product_count?: number;
  active_product_count?: number;
};

const STORE_SLUG = "jaya-store";

const ratingBars = [
  { star: 5, percent: 80, count: 250 },
  { star: 4, percent: 18, count: 56 },
  { star: 3, percent: 2, count: 6 },
  { star: 2, percent: 0, count: 0 },
  { star: 1, percent: 0, count: 0 },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export default function StorePage() {
  const { t } = useLanguage();
  const liveProducts = useLiveProducts();
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void api<{ stores: StoreRecord[] }>("/api/stores")
      .then((data) => {
        if (!active) return;
        const found = (data.stores || []).find(
          (s) => (s.store_name && slugify(s.store_name) === STORE_SLUG) || slugify(s.name || "") === STORE_SLUG
        );
        setStore(found || null);
      })
      .catch(() => {
        if (active) setStore(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const products = useMemo(() => {
    let list = store ? liveProducts.filter((p) => p.seller_id === store.id) : liveProducts;
    return list.filter((p) => p.status === "active").map(recordToProduct);
  }, [liveProducts, store]);

  const storeName = store?.store_name || "Jaya store";
  const location = store?.store_address || "Jakarta";
  const rating = store?.rating ?? 4.8;
  const joinedAt = formatDate(store?.created_at || new Date().toISOString());
  const productCount = store?.active_product_count ?? products.length;
  const verified = store?.verified ?? true;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-sm text-slate-500">
          <Link href="/beranda" className="hover:text-navy-900">{t("home")}</Link>
          <span>/</span>
          <span className="text-slate-700">{storeName}</span>
        </nav>

        {/* Header Toko */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />
          <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
            <span className="-mt-9 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-blue-50 text-brand-blue">
              {store?.avatar_url ? (
                <img src={store.avatar_url} alt={storeName} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <StoreIcon className="h-9 w-9" />
              )}
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-navy-900">{storeName}</h1>
                {verified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" /> {t("store.verified")}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {location}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {t("store.joined")} {joinedAt}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> {t("store.productsCount", { count: productCount })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <div>
                <p className="text-lg font-bold leading-none text-navy-900">{rating.toFixed(1)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t("store.reviews", { count: ratingBars.reduce((sum, b) => sum + b.count, 0) })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Produk Toko */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{t("store.storeProducts")} ({products.length})</h2>
            </div>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">{t("store.loading")}</p>
            ) : products.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t("store.noProducts")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {products.map((product) => (
                  <BestSellerCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* Penilaian Toko */}
          <div className="h-max space-y-5 lg:sticky lg:top-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-bold text-navy-900">{t("store.ratingTitle")}</h2>
              <div className="mt-4 flex items-center gap-4">
                <p className="text-5xl font-extrabold text-navy-900">{rating.toFixed(1)}</p>
                <div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t("store.ratingBasedOn")}</p>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                {ratingBars.map((bar) => (
                  <div key={bar.star} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-6 shrink-0">{bar.star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${bar.percent}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right">{bar.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <h3 className="font-bold text-navy-900">{t("store.guarantees")}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• {t("store.guarantee1")}</li>
                <li>• {t("store.guarantee2")}</li>
                <li>• {t("store.guarantee3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}