"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PackingType, ShippingBreakdown } from "@/lib/shipping";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  qty: number;
  stock: number;
  category?: string;
  badge?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type CheckoutDetail = {
  orderId: string;
  orderDbId?: string | null;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  insuranceFee: number;
  total: number;
  paymentMethod: string;
  paymentGroup: "bank" | "ewallet" | "qris";
  courier: string;
  address: string;
  city: string;
  shippingZone?: string | null;
  shippingRegion?: string | null;
  packingType?: PackingType;
  packingFee?: number;
  distanceKm?: number;
  insuranceSelected?: boolean;
  shippingBreakdown?: ShippingBreakdown | null;
  createdAt: number;
  expiresAt: number;
  status: "MENUNGGU PEMBAYARAN";
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  checkoutDetail: CheckoutDetail | null;
  setCheckoutDetail: (detail: CheckoutDetail | null) => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "elektromart-cart";
const CHECKOUT_STORAGE_KEY = "elektromart-checkout";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [checkoutDetail, setCheckoutDetailState] = useState<CheckoutDetail | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const rawCheckout = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (rawCheckout) setCheckoutDetailState(JSON.parse(rawCheckout));
    } catch {
      /* abaikan data korup */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutDetail));
  }, [checkoutDetail, hydrated]);

  function addItem(item: Omit<CartItem, "qty">, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: Math.min(i.qty + qty, i.stock || i.qty + qty) } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
  }

  function updateQty(id: string, qty: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock || qty)) } : i
      )
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = useMemo(() => items.reduce((acc, i) => acc + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.qty, 0), [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        updateQty,
        removeItem,
        clearCart,
        checkoutDetail,
        setCheckoutDetail: setCheckoutDetailState,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart harus dipakai di dalam CartProvider");
  return context;
}