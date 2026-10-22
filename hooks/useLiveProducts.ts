"use client";

import { useApiData } from "@/hooks/useApiData";
import { type ProductRecord } from "@/lib/api";
import type { Product } from "@/lib/data";

/**
 * Daftar produk live dari database (dipakai untuk menimpa mock data website).
 * Di-cache via SWR sehingga navigasi berikutnya tampil instan.
 */
export function useLiveProducts(): ProductRecord[] {
  const { data } = useApiData<{ products: ProductRecord[] }>("/api/products");
  return data?.products ?? [];
}

/** Sama seperti useLiveProducts, plus flag apakah data sudah terisi (untuk hindari kedip "tidak ditemukan"). */
export function useLiveProductsState(): { products: ProductRecord[]; ready: boolean } {
  const { data, isLoading } = useApiData<{ products: ProductRecord[] }>("/api/products");
  return { products: data?.products ?? [], ready: Boolean(data) && !isLoading };
}

/** Ubah record produk dari database ke bentuk Product yang dikenali komponen UI. */
export function recordToProduct(record: ProductRecord): Product {
  const images = [record.image_url, ...(record.images ?? [])].filter(
    (v): v is string => Boolean(v)
  );
  return {
    id: record.id,
    name: record.name || "Produk",
    price: Number(record.price) || 0,
    image: record.image_url || images[0] || "",
    images: images.length ? images : undefined,
    rating: 4.8,
    sold: 0,
    location: "Jakarta",
    category: record.category || undefined,
    description: record.description || undefined,
    stock: record.stock,
    store: {
      name: "Jaya store",
      location: "Jakarta",
      rating: 4.8,
      verified: true,
    },
  };
}

/** Timpa field produk mock dengan data live dari database (cocokkan via nama produk). */
export function applyLiveProduct(product: Product, live: ProductRecord[]): Product {
  const db = live.find(
    (p) => p.name && p.name.toLowerCase() === product.name.toLowerCase()
  );
  if (!db) return product;
  const images = [db.image_url, ...(db.images ?? [])].filter(Boolean) as string[];
  return {
    ...product,
    name: db.name || product.name,
    price: Number(db.price) || product.price,
    stock: db.stock,
    category: db.category || product.category,
    description: db.description || product.description,
    image: db.image_url || images[0] || product.image,
    images: images.length ? images : product.images,
  };
}

export function applyLiveProducts(products: Product[], live: ProductRecord[]): Product[] {
  return products.map((p) => applyLiveProduct(p, live));
}
