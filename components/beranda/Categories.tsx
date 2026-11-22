"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Laptop,
  Tv,
  Camera,
  Headphones,
  Gamepad2,
  Watch,
  Cable,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { categories as fallbackCategories } from "@/lib/data";
import { slugify } from "@/lib/slugify";
import { useLanguage } from "@/lib/i18n";
import { api, type CategoryRecord } from "@/lib/api";

const iconMap: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Tv,
  Camera,
  Headphones,
  Gamepad2,
  Watch,
  Cable,
};

const colorMap: Record<string, string> = {
  Smartphone: "text-blue-600 bg-blue-50",
  Laptop: "text-purple-600 bg-purple-50",
  Tv: "text-pink-600 bg-pink-50",
  Camera: "text-amber-600 bg-amber-50",
  Headphones: "text-emerald-600 bg-emerald-50",
  Gamepad2: "text-rose-600 bg-rose-50",
  Watch: "text-cyan-600 bg-cyan-50",
  Cable: "text-violet-600 bg-violet-50",
};

function isHomepageCategory(category: { name: string }) {
  const homepageCategories = new Set([
    "smartphone",
    "laptop",
    "tv & audio",
    "kamera",
    "audio",
    "gaming",
    "smart watch",
    "kabel & charger",
  ]);
  return homepageCategories.has(category.name.trim().toLowerCase());
}

export default function Categories() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState(
    fallbackCategories.filter(isHomepageCategory),
  );

  useEffect(() => {
    void api<{ categories: CategoryRecord[] }>("/api/categories")
      .then((data) => {
        if (!data.categories?.length) return;
        setCategories(
          data.categories.filter(isHomepageCategory).map((category) => ({
            id: category.id,
            name: category.name,
            icon: category.icon || "Smartphone",
          })),
        );
      })
      .catch(() => undefined);
  }, []);
  return (
    <section id="kategori" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">{t("selectedCategories")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("findFavorite")}
          </p>
        </div>
        <Link
          href="/kategori/semua"
          className="hidden items-center gap-1 text-sm font-semibold text-brand-blue hover:underline sm:flex"
        >
          {t("viewAll")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {categories.filter(isHomepageCategory).map((cat) => {
          const Icon = iconMap[cat.icon] || Smartphone;
          return (
            <Link
              key={cat.id}
              href={`/kategori/${slugify(cat.name)}`}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-white py-6 shadow-card transition hover:shadow-cardHover"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${colorMap[cat.icon]}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-slate-700">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
