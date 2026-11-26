"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Star, Store as StoreIcon, BadgeCheck, CalendarDays, Package, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BestSellerCard } from "@/components/produk/ProductCard";
import { api, type ReviewRecord } from "@/lib/api";
import { slugify } from "@/lib/slugify";
import { recordToProduct, useLiveProducts } from "@/hooks/useLiveProducts";
import { useLanguage } from "@/lib/i18n";

type StoreRecord = {
  id: string;
  name?: string;
  full_name?: string | null;
  store_name?: string | null;
  store_address?: string | null;
  avatar_url?: string | null;
  store_banner_url?: string | null;
  email?: string | null;
  seller_status?: string | null;
  rating?: number;
  review_count?: number;
  rating_breakdown?: Record<"1" | "2" | "3" | "4" | "5", number>;
  verified?: boolean;
  created_at?: string;
  product_count?: number;
  active_product_count?: number;
};

/** URL upload dari API bisa absolut (localhost:4000); samakan ke path relatif agar proxy Next.js dipakai. */
function normalizeMediaUrl(value?: string | null) {
  if (!value) return null;
  const marker = "/uploads/";
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index) : value;
}

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
  const params = useParams<{ slug: string }>();
  const storeSlug = String(params?.slug || "");
  const liveProducts = useLiveProducts();
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void api<{ stores: StoreRecord[] }>("/api/stores")
      .then((data) => {
        if (!active) return;
        const found = (data.stores || []).find((s) =>
          [s.store_name, s.full_name, s.name].some(
            (value) => value && slugify(value) === storeSlug
          )
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
  }, [storeSlug]);

  useEffect(() => {
    setBannerFailed(false);
  }, [store?.store_banner_url]);

  useEffect(() => {
    if (!store?.id) {
      setReviews([]);
      return;
    }
    let active = true;
    void api<{ reviews: ReviewRecord[] }>(`/api/reviews?sellerId=${encodeURIComponent(store.id)}`)
      .then((data) => {
        if (active) setReviews(data.reviews || []);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    return () => {
      active = false;
    };
  }, [store?.id]);

  const products = useMemo(() => {
    let list = store ? liveProducts.filter((p) => p.seller_id === store.id) : [];
    return list.filter((p) => p.status === "active").map(recordToProduct);
  }, [liveProducts, store]);

  const storeName = store?.store_name || store?.full_name || storeSlug || "Toko";
  const location = store?.store_address || "Jakarta";
  const rating = Number(store?.rating) || 0;
  const reviewCount = Number(store?.review_count) || 0;
  const ratingBars = useMemo(() => {
    const breakdown: Partial<Record<"1" | "2" | "3" | "4" | "5", number>> =
      store?.rating_breakdown || {};
    return [5, 4, 3, 2, 1].map((star) => {
      const count = Number(breakdown[String(star) as "1" | "2" | "3" | "4" | "5"]) || 0;
      return { star, count, percent: reviewCount ? (count / reviewCount) * 100 : 0 };
    });
  }, [store, reviewCount]);
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
          {store?.store_banner_url && !bannerFailed ? (
            <img
              src={normalizeMediaUrl(store.store_banner_url) || undefined}
              alt={`Banner ${storeName}`}
              onError={() => setBannerFailed(true)}
              className="h-32 w-full object-cover sm:h-44"
            />
          ) : (
            <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 sm:h-44" />
          )}
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                <span className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-50 text-brand-blue shadow-sm">
                  {store?.avatar_url ? (
                    <img src={store.avatar_url} alt={storeName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <StoreIcon className="h-10 w-10" />
                  )}
                </span>
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-navy-900">{storeName}</h1>
                    {verified && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                        <BadgeCheck className="h-3.5 w-3.5" /> {t("store.verified")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {reviewCount > 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 sm:mb-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <div>
                    <p className="text-lg font-bold leading-none text-navy-900">{rating.toFixed(1)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t("store.reviews", { count: reviewCount })}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 px-4 py-2.5 sm:mb-1">
                  <p className="text-xs text-slate-500">{t("product.noReviews")}</p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr]">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{t("store.location")}</p>
                  <p className="line-clamp-2 font-medium text-navy-900">{location}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{t("store.joined")}</p>
                  <p className="font-medium text-navy-900">{joinedAt}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Package className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{t("store.products")}</p>
                  <p className="font-medium text-navy-900">{t("store.productsCount", { count: productCount })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Produk Toko */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{t("store.storeProducts")} ({products.length})</h2>
            </div>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">{t("store.loading")}</p>
            ) : !store ? (
              <p className="py-10 text-center text-sm text-slate-400">{t("store.notFound")}</p>
            ) : products.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t("store.noProducts")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <BestSellerCard key={product.id} product={product} imageContain />
                ))}
              </div>
            )}
          </div>

          {/* Penilaian Toko */}
          <div className="h-max space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:self-start">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="text-lg font-bold text-navy-900">{t("store.ratingTitle")}</h2>
              {reviewCount > 0 ? (
                <>
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
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">{t("product.noReviews")}</p>
              )}

              {reviews.length > 0 ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t("product.reviews")}
                  </p>
                  <div className="mt-3 space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-navy-900">{review.reviewer_name}</p>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {new Date(review.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{review.product_name}</p>
                        {review.comment ? (
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{review.comment}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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