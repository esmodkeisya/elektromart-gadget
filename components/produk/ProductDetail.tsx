"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Store as StoreIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGallery from "@/components/produk/ProductGallery";
import ProductActions from "@/components/produk/ProductActions";
import ProductDetailText from "@/components/produk/ProductDetailText";
import { BestSellerCard } from "@/components/produk/ProductCard";
import {
  getProductById,
  getRelatedProducts,
  formatRupiah,
  uniqueProducts,
  bestSellerProducts,
  flashSaleProducts,
  heroProducts,
  type Product,
} from "@/lib/data";
import {
  applyLiveProduct,
  applyLiveProducts,
  recordToProduct,
  useLiveProducts,
} from "@/hooks/useLiveProducts";
import { api, type ReviewMedia, type ReviewRecord } from "@/lib/api";

export default function ProductDetail({ productId }: { productId: string }) {
  const live = useLiveProducts();
  const [resolved, setResolved] = useState<Product | null>(null);
  const [dbReviews, setDbReviews] = useState<ReviewRecord[]>([]);
  const [reviewAverage, setReviewAverage] = useState<number | null>(null);

  useEffect(() => {
    if (!productId) return;
    const mock = getProductById(productId);
    if (mock) {
      setResolved(applyLiveProduct(mock, live));
      return;
    }
    const record = live.find((p) => p.id === productId);
    if (record) {
      setResolved(recordToProduct(record));
      return;
    }
    setResolved(null);
  }, [productId, live]);

  const product = resolved;

  useEffect(() => {
    if (!product) {
      setDbReviews([]);
      setReviewAverage(null);
      return;
    }
    let active = true;
    const params = new URLSearchParams();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      params.set("productId", productId);
    }
    params.set("productName", product.name);
    api<{ reviews: ReviewRecord[]; summary: { count: number; average: number } }>(
      `/api/reviews?${params.toString()}`
    )
      .then((data) => {
        if (!active) return;
        setDbReviews(data.reviews || []);
        setReviewAverage(data.summary?.count ? data.summary.average : null);
      })
      .catch(() => {
        if (!active) return;
        setDbReviews([]);
        setReviewAverage(null);
      });
    return () => {
      active = false;
    };
  }, [product, productId]);

  const displayReviews = useMemo(() => {
    if (dbReviews.length > 0) {
      return dbReviews.map((review) => ({
        id: review.id,
        name: review.reviewer_name,
        rating: review.rating,
        comment: review.comment ?? "",
        date: review.created_at,
        media: review.media ?? [],
      }));
    }
    return (product?.reviews ?? []).map((review, index) => ({
      id: `mock-${index}`,
      name: review.name,
      rating: review.rating,
      comment: review.comment,
      date: null as string | null,
      media: [] as ReviewMedia[],
    }));
  }, [dbReviews, product]);

  const related = useMemo(() => {
    if (!product) return [];
    let list: Product[] = [];
    const mock = getProductById(productId);
    if (mock) {
      list = getRelatedProducts(applyLiveProduct(mock, live));
    } else {
      list = uniqueProducts([...bestSellerProducts, ...flashSaleProducts, ...heroProducts])
        .filter((p) => p.category && p.category === product.category)
        .slice(0, 4);
    }
    return applyLiveProducts(list, live);
  }, [product, productId, live]);

  useEffect(() => {
    if (product) document.title = `${product.name} | ElektroMart`;
  }, [product]);

  const store = product?.store ?? {
    name: "Jaya store",
    location: "Jakarta",
    rating: product?.rating ?? 4.8,
    verified: true,
  };

  if (!product) {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-lg font-semibold text-navy-900">Produk tidak ditemukan</p>
          <Link href="/beranda" className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
            <ProductDetailText id="home" />
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-slate-500">
          <Link href="/beranda" className="hover:text-navy-900">
            <ProductDetailText id="home" />
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span><ProductDetailText id="products" /></span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-700">{product.name}</span>
        </nav>

        {/* Gambar + Info utama + Toko */}
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.3fr_1.2fr_0.7fr]">
          <ProductGallery
            images={product.images ?? [product.image]}
            alt={product.name}
          />

          {/* Panel info produk */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            {product.badge === "Original" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" /> <ProductDetailText id="original" />
              </span>
            ) : product.badge === "FLASH SALE" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                <ProductDetailText id="flashSale" />
              </span>
            ) : null}

            <h1 className="mt-3 text-2xl font-bold text-navy-900">
              {product.name}
            </h1>

            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {reviewAverage ?? product.rating ?? 4.9}
              </span>
              <span>|</span>
              <span>
                {dbReviews.length > 0 ? dbReviews.length : product.reviewCount ?? product.sold ?? 0}{" "}
                <ProductDetailText id="product.reviews" />
              </span>
              <span>|</span>
              <span>{product.soldTotal ?? product.sold ?? 0} <ProductDetailText id="product.sold" /></span>
            </div>

            <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-navy-900">
                  {formatRupiah(product.price)}
                </p>
                {product.discountPercent && (
                  <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                    -{product.discountPercent}%
                  </span>
                )}
              </div>
              {product.originalPrice && (
                <p className="mt-1 text-sm text-slate-400 line-through">
                  {formatRupiah(product.originalPrice)}
                </p>
              )}
            </div>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500"><ProductDetailText id="product.stock" /></dt>
                <dd className="font-medium text-navy-900">
                  {product.stock ?? 10} <ProductDetailText id="product.units" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500"><ProductDetailText id="product.weight" /></dt>
                <dd className="font-medium text-navy-900">
                  {product.weight ?? "1 kg"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500"><ProductDetailText id="product.condition" /></dt>
                <dd className="font-medium text-navy-900">
                  {product.condition ? <ProductDetailText value={product.condition} /> : <ProductDetailText id="product.new" />}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500"><ProductDetailText id="product.category" /></dt>
                <dd className="font-medium text-brand-blue">
                  {product.category ? <ProductDetailText value={product.category} /> : <ProductDetailText id="product.electronics" />}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <ProductActions product={product} stock={product.stock ?? 10} />
            </div>
          </div>

          {/* Kartu toko + jaminan */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                  <StoreIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-navy-900">{store.name}</p>
                  <p className="text-xs text-slate-500">{store.location}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                {store.verified && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-600">
                    ✓ <ProductDetailText id="product.verified" />
                  </span>
                )}
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-600">
                  <ProductDetailText id="rating" /> {store.rating}
                </span>
              </div>
              <Link
                href="/toko/jaya-store"
                className="mt-4 block w-full rounded-lg border border-slate-200 py-2.5 text-center text-sm font-semibold text-navy-900 hover:bg-slate-50"
              >
                <ProductDetailText id="product.visitStore" />
              </Link>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    <ProductDetailText id="warrantyOriginal" />
                  </p>
                  <p className="text-xs text-slate-500"><ProductDetailText id="product.authenticGoods" /></p>
                </div>
              </div>
              <div className="flex gap-3">
                <Truck className="h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    <ProductDetailText id="product.fastShipping" />
                  </p>
                  <p className="text-xs text-slate-500">
                    <ProductDetailText id="product.sameDayJabodetabek" />
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <RotateCcw className="h-5 w-5 shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    <ProductDetailText id="product.returnable" />
                  </p>
                  <p className="text-xs text-slate-500">
                    <ProductDetailText id="product.returnWindow" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deskripsi + Ulasan */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-navy-900">
              <ProductDetailText id="product.description" />
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {product.description ? (
                <ProductDetailText value={product.description} />
              ) : (
                <ProductDetailText id="product.defaultDesc" />
              )}
            </p>

            {product.specs && (
              <>
                <h3 className="mt-5 text-sm font-bold text-navy-900">
                  <ProductDetailText id="product.specs" />
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {product.specs.map((spec) => (
                    <li key={spec}>&bull; <ProductDetailText value={spec} /></li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-navy-900">
              <ProductDetailText id="product.buyerReviews" />
            </h2>
            <div className="mt-3 space-y-4">
              {displayReviews.length > 0 ? (
                displayReviews.map((review) => (
                  <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-navy-900">
                        {review.name}
                      </p>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      <ProductDetailText value={review.comment} />
                    </p>
                    {review.media.length > 0 ? (
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {review.media.map((media, index) =>
                          media.type === "video" ? (
                            <video
                              key={`${media.url}-${index}`}
                              src={media.url}
                              controls
                              playsInline
                              className="h-20 w-full rounded-lg border border-slate-100 bg-slate-50 object-cover"
                            />
                          ) : (
                            <a
                              key={`${media.url}-${index}`}
                              href={media.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-20 overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
                            >
                              <img src={media.url} alt="" className="h-full w-full object-cover" />
                            </a>
                          )
                        )}
                      </div>
                    ) : null}
                    {review.date ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(review.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400"><ProductDetailText id="product.noReviews" /></p>
              )}
            </div>
          </div>
        </div>

        {/* Produk Serupa */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-navy-900"><ProductDetailText id="product.related" /></h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => (
                <BestSellerCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <Footer />
      </div>
    </main>
  );
}