import { supabase } from "@/lib/supabase";
import type { PackingType, ShippingBreakdown } from "@/lib/shipping";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchApi<T>(path: string, options: RequestInit, retries: number): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ApiError(payload.error || payload.message || res.statusText || "Permintaan gagal.", res.status);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof ApiError && error.status !== 503) {
        throw error;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }

      throw new ApiError("Layanan data sedang tidak tersedia. Silakan coba beberapa saat lagi.", 503);
    }
  }

  throw new ApiError("Layanan data sedang tidak tersedia. Silakan coba beberapa saat lagi.", 503);
}

// React StrictMode memanggil effect dua kali saat development. Gabungkan GET
// yang identik yang sedang berjalan agar tidak ada request kembar.
const getInFlight = new Map<string, Promise<unknown>>();

export async function api<T>(path: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" || options.signal) return fetchApi<T>(path, options, retries);

  const existing = getInFlight.get(path);
  if (existing) return existing as Promise<T>;

  const pending = fetchApi<T>(path, options, retries).finally(() => {
    getInFlight.delete(path);
  });
  getInFlight.set(path, pending);
  return pending;
}

export type ShippingAddress = {
  id: string;
  user_id: string;
  label: "home" | "office" | "other";
  recipient: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal: string;
  is_default: boolean;
};

export type UserProfile = {
  id: string;
  role: "buyer" | "seller" | "admin";
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  avatar_url: string | null;
  store_name: string | null;
  store_address: string | null;
  store_description: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  account_status: string | null;
  seller_status: string | null;
  created_at?: string;
  product_count?: number;
};

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon?: string | null;
  sort_order?: number;
  subcategories: string[];
  attributes: string[];
  product_count?: number;
};

export type ProductRecord = {
  id: string;
  seller_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  price: number;
  stock: number;
  status: "active" | "out_of_stock" | "draft";
  image_url: string | null;
  images?: string[] | null;
  weight_kg?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  sold?: number;
  is_flash_sale?: boolean;
  flash_sale_quota?: number;
  flash_sale_sold?: number;
  flash_sale_remaining?: number;
};

export type ReviewMedia = {
  type: "image" | "video";
  url: string;
};

export type ReviewRecord = {
  id: string;
  product_id: string | null;
  product_name: string;
  order_id: string | null;
  order_item_id: string | null;
  buyer_id: string | null;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  media: ReviewMedia[] | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string | null;
  seller_id: string | null;
  product_name: string;
  product_image: string | null;
  price: number;
  qty: number;
  subtotal: number;
  product_stock?: number | null;
  product_status?: string | null;
  seller_fee?: number;
  seller_fee_rate?: number;
  seller_net?: number;
  seller_tenure_months?: number;
  seller_sold_qty?: number;
  review?: ReviewRecord | null;
};

export type OrderTrackingEvent = {
  id: string;
  order_id: string;
  code: string;
  status: string;
  location: string | null;
  meta: {
    courier?: string | null;
    tracking_number?: string | null;
    eta?: string | null;
    reason?: string | null;
    sellerNote?: string | null;
  };
  created_at: string;
};

export type OrderRecord = {
  id: string;
  buyer_id: string;
  order_number: string;
  status: string;
  payment_method: string | null;
  payment_group: string | null;
  courier: string | null;
  shipping_address: {
    recipient?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postal?: string;
  } | null;
  shipping_eta: string | null;
  shipping_zone: string | null;
  shipping_region: string | null;
  tracking_number: string | null;
  shipping_deadline: string | null;
  cancel_reason: string | null;
  subtotal: number;
  product_fee: number;
  seller_fee: number;
  seller_fee_rate: number;
  platform_revenue: number;
  insurance_fee: number;
  shipping_fee: number;
  packing_type?: PackingType;
  packing_fee?: number;
  distance_km?: number | null;
  insurance_selected?: boolean;
  shipping_breakdown?: ShippingBreakdown | null;
  stock_decremented?: boolean;
  total: number;
  payment_mode: string | null;
  payment_status: string;
  midtrans_order_id: string | null;
  midtrans_redirect_url: string | null;
  paid_at: string | null;
  processed_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemRecord[];
  buyer?: {
    id?: string;
    full_name?: string | null;
    username?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
};

export const PROVINCES = [
  "Jawa Timur",
  "Jawa Barat",
  "Jawa Tengah",
  "DKI Jakarta",
  "Banten",
  "DI Yogyakarta",
  "Bali",
  "Sumatera Utara",
  "Riau",
  "Kalimantan Timur",
  "Sulawesi Selatan",
  "Papua",
];
