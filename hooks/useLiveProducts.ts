"use client";

import { useEffect, useState } from "react";
import { api, type ProductRecord } from "@/lib/api";
import type { Product } from "@/lib/data";

const PRODUCTS_UPDATED_EVENT = "elektromart-products-updated";

let cached: Promise<ProductRecord[]> | null = null;

function loadAll() {
  if (!cached) {
    cached = api<{ products: ProductRecord[] }>("/api/products")
      .then((data) => data.products || [])
      .catch(() => []);
  }
  return cached;
}

/** Hapus cache dan beri tahu semua halaman yang memakai produk live. */
export function refreshLiveProducts() {
  cached = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRODUCTS_UPDATED_EVENT));
  }
}

/** Daftar produk live dari database (dipakai untuk menimpa mock data website). */
export function useLiveProducts(): ProductRecord[] {
  const [items, setItems] = useState<ProductRecord[]>([]);
  useEffect(() => {
    let active = true;
    const update = () => {
      void loadAll().then((list) => {
        if (active) setItems(list);
      });
    };
    update();
    window.addEventListener(PRODUCTS_UPDATED_EVENT, update);
    return () => {
      active = false;
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, update);
    };
  }, []);
  return items;
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
    sold: Number(record.sold) || 0,
    location: "Jakarta",
    category: record.category || undefined,
    description: record.description || undefined,
    stock: record.stock,
    weight: record.weight_kg ? `${record.weight_kg} kg` : undefined,
    weightKg: record.weight_kg,
    lengthCm: record.length_cm,
    widthCm: record.width_cm,
    heightCm: record.height_cm,
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
    weight: db.weight_kg ? `${db.weight_kg} kg` : product.weight,
    weightKg: db.weight_kg || product.weightKg,
    lengthCm: db.length_cm || product.lengthCm,
    widthCm: db.width_cm || product.widthCm,
    heightCm: db.height_cm || product.heightCm,
  };
}

export function applyLiveProducts(products: Product[], live: ProductRecord[]): Product[] {
  return products.map((p) => applyLiveProduct(p, live));
}