"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/data";
import { recordToProduct } from "@/hooks/useLiveProducts";

export type FlashSaleProductRecord = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  images?: string[] | null;
  category: string | null;
  description: string | null;
  is_flash_sale: boolean;
  flash_sale_quota: number;
  flash_sale_sold: number;
  flash_sale_remaining: number;
};

export type FlashSaleResponse = {
  products: FlashSaleProductRecord[];
  soldUnits: number;
  quota: number;
  remaining: number;
};

const EMPTY: FlashSaleResponse = { products: [], soldUnits: 0, quota: 0, remaining: 0 };
const CACHE_MS = 30_000;
let inFlight: Promise<FlashSaleResponse> | null = null;
let cached: { at: number; data: FlashSaleResponse } | null = null;

function loadFlashSale() {
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.data);
  if (!inFlight) {
    inFlight = api<FlashSaleResponse>("/api/flash-sale")
      .then((data) => {
        cached = { at: Date.now(), data };
        return data;
      })
      .catch(() => EMPTY)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function refreshFlashSale() {
  cached = null;
}

export function flashRecordToProduct(record: FlashSaleProductRecord): Product {
  return {
    ...recordToProduct(record as Parameters<typeof recordToProduct>[0]),
    badge: "FLASH SALE",
    sold: record.flash_sale_sold,
    soldOf: record.flash_sale_quota,
  };
}

/** Flash sale live dari database; terjual dihitung dari order yang dibayar. */
export function useFlashSale(): FlashSaleResponse & { loading: boolean } {
  const [data, setData] = useState<FlashSaleResponse>(cached?.data ?? EMPTY);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;
    void loadFlashSale().then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { ...data, loading };
}
