"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, ChevronDown } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { BestSellerCard } from "@/components/produk/ProductCard";
import {
  categories,
  bestSellerProducts,
  flashSaleProducts,
  heroProducts,
  uniqueProducts,
  type Product,
} from "@/lib/data";
import { slugify } from "@/lib/slugify";
import { useLanguage } from "@/lib/i18n";
import { api, type ProductRecord } from "@/lib/api";


function useAllProducts(): Product[] {
  return useMemo(() => {
    return uniqueProducts([...bestSellerProducts, ...flashSaleProducts, ...heroProducts]);
  }, []);
}

const ratingOptions = [4, 3, 2, 1];

export default function KategoriPageClient({ slug }: { slug: string }) {
  const { t } = useLanguage();
  const catalogProducts = useAllProducts();
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [catalogCategories, setCatalogCategories] = useState(categories);
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase();

  useEffect(() => {
    void api<{ categories: { id: string; name: string; icon?: string | null }[] }>("/api/categories")
      .then(({ categories: databaseCategories }) => {
        if (databaseCategories.length) {
          setCatalogCategories(databaseCategories.map((category) => ({
            id: category.id,
            name: category.name,
            icon: category.icon || "Smartphone",
          })));
        }
      })
      .catch(() => undefined);

    void api<{ products: ProductRecord[] }>("/api/products?catalog=1")
      .then(({ products }) => {
        setLiveProducts(products.filter((product) => product.status === "active").map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image_url || product.images?.[0] || "/products/samsung-s24.svg",
          images: product.images || undefined,
          description: product.description || undefined,
          stock: product.stock,
          category: product.category || undefined,
          rating: 0,
          sold: 0,
          location: "Indonesia",
          store: { name: "ElektroMart Seller", location: "Indonesia", rating: 4.8, verified: true },
        })));
      })
      .catch(() => setLiveProducts([]));
  }, []);

  const allProducts = useMemo(
    () => uniqueProducts([...liveProducts, ...catalogProducts]),
    [catalogProducts, liveProducts]
  );

  const activeCategory = useMemo(
    () => catalogCategories.find((c) => slugify(c.name) === normalizedSlug),
    [catalogCategories, normalizedSlug]
  );

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = allProducts;

    if (normalizedSlug !== "semua") {
      list = list.filter(
        (p) => p.category && slugify(p.category) === normalizedSlug
      );
    }

    if (minPrice) list = list.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
    if (minRating) list = list.filter((p) => (p.rating ?? 0) >= minRating);

    const sorted = [...list];
    if (sortBy === "lowestPrice") sorted.sort((a, b) => a.price - b.price);
    if (sortBy === "highestPrice") sorted.sort((a, b) => b.price - a.price);
    if (sortBy === "bestSelling")
      sorted.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));

    return sorted;
  }, [allProducts, normalizedSlug, minPrice, maxPrice, minRating, sortBy]);

  const pageTitle =
    normalizedSlug === "semua" ? t("allProducts") : activeCategory?.name ?? t("categoryFallback");
  const sortOptions = [
    { key: "newest", label: t("newest") },
    { key: "lowestPrice", label: t("lowestPrice") },
    { key: "highestPrice", label: t("highestPrice") },
    { key: "bestSelling", label: t("bestSelling") },
  ];
  const selectedSortLabel = sortOptions.find((option) => option.key === sortBy)?.label ?? t("newest");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-navy-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {filtered.length} {t("productsFound")}
        </p>

        {/* Pills kategori + sort */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/kategori/semua"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              normalizedSlug === "semua"
                ? "bg-brand-blue text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t("all")}
          </Link>
          {catalogCategories.map((cat) => {
            const catSlug = slugify(cat.name);
            return (
              <Link
                key={cat.id}
                href={`/kategori/${catSlug}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  catSlug === normalizedSlug
                    ? "bg-brand-blue text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}

          <div className="relative ml-auto">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              {selectedSortLabel}
              <ChevronDown className="h-4 w-4" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-slate-100 bg-white py-1 shadow-card">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSortBy(opt.key);
                      setSortOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                      opt.key === sortBy
                        ? "font-semibold text-brand-blue"
                        : "text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar filter */}
          <aside className="h-max rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <h3 className="font-semibold text-navy-900">{t("priceRange")}</h3>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <h3 className="mt-6 font-semibold text-navy-900">{t("minimumRating")}</h3>
            <div className="mt-3 space-y-2">
              {ratingOptions.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                >
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === r}
                    onChange={() => setMinRating(minRating === r ? null : r)}
                    className="h-4 w-4 accent-brand-blue"
                  />
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {r.toFixed(1)} {t("andAbove")}
                </label>
              ))}
            </div>
          </aside>

          {/* Grid produk */}
          <div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
                {t("noMatchingProducts")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((product) => (
                  <BestSellerCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}