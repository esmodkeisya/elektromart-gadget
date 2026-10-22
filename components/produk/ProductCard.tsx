"use client";

import Link from "next/link";
import ProductImage from "./ProductImage";
import { Star, MapPin, ShieldCheck } from "lucide-react";
import { Product, formatRupiah } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";
import { applyLiveProduct, useLiveProducts } from "@/hooks/useLiveProducts";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function FlashSaleCard({ product }: { product: Product }) {
  const { t } = useLanguage();
  const live = useLiveProducts();
  const item = applyLiveProduct(product, live);
  const discount =
    item.discountPercent && item.discountPercent > 0
      ? item.discountPercent
      : 20 + (hashString(item.id) % 51);
  const originalPrice =
    item.originalPrice && item.originalPrice > item.price
      ? item.originalPrice
      : Math.round(item.price / (1 - discount / 100));
  const progress = item.soldOf
    ? Math.round(((item.sold ?? 0) / item.soldOf) * 100)
    : 0;

  return (
    <Link
      href={`/produk/${item.id}`}
      className="block overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card transition hover:shadow-cardHover"
    >
      <div className="relative aspect-square w-full">
        <ProductImage
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 16vw"
          className="object-cover"
        />
        <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
          -{discount}%
        </span>
        <span className="absolute right-2 top-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">
          {t("flashSaleTag")}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 h-9 text-sm font-medium text-slate-700">
          {item.name}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-base font-bold text-red-600">
            {formatRupiah(item.price)}
          </p>
        </div>
        {originalPrice > item.price && (
          <p className="text-xs text-slate-400 line-through">{formatRupiah(originalPrice)}</p>
        )}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {t("sold")} {item.sold} {t("of")} {item.soldOf}
        </p>
      </div>
    </Link>
  );
}

export function BestSellerCard({ product }: { product: Product }) {
  const { t } = useLanguage();
  const live = useLiveProducts();
  const item = applyLiveProduct(product, live);
  return (
    <Link
      href={`/produk/${item.id}`}
      className="block overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card transition hover:shadow-cardHover"
    >
      <div className="relative aspect-square w-full">
        <ProductImage
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 16vw"
          className="object-cover"
        />
        {item.discountPercent && (
          <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            -{item.discountPercent}%
          </span>
        )}
        <span className="absolute right-2 top-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {t("original")}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 h-9 text-sm font-medium text-slate-700">
          {item.name}
        </p>
        <p className="mt-2 text-base font-bold text-brand-blue">
          {formatRupiah(item.price)}
        </p>
        {item.originalPrice && (
          <p className="text-xs text-slate-400 line-through">
            {formatRupiah(item.originalPrice)}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-slate-700">{item.rating}</span>
          <span>&middot;</span>
          <span>{item.sold} {t("soldCount")}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {item.location}
          </span>
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        </div>
      </div>
    </Link>
  );
}
