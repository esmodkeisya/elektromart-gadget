import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}, retries = 2): Promise<T> {
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
  tracking_number: string | null;
  shipping_deadline: string | null;
  cancel_reason: string | null;
  subtotal: number;
  product_fee: number;
  insurance_fee: number;
  shipping_fee: number;
  total: number;
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
