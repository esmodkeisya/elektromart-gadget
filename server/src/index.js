const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { prisma } = require("./prisma");
const { signToken, requireUser, requireRole, optionalUser, publicUser } = require("./auth");
const {
  SHIPPING_SERVICES,
  getService,
  quoteShipping,
} = require("./shipping");
const finance = require("./finance");
const { calcSellerFeeRate, monthsBetween, feeOf } = finance;
const paymentPolicy = require("./payment-policy");

const app = express();
const port = Number(process.env.PORT || 4000);
const apiBaseUrl = process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://localhost:${port}`;

function normalizeOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const IS_PRODUCTION = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const configuredOrigins = normalizeOrigins(process.env.CLIENT_ORIGIN);
if (IS_PRODUCTION && configuredOrigins.length === 0) {
  throw new Error("CLIENT_ORIGIN wajib dikonfigurasi saat NODE_ENV=production.");
}
const allowedOrigins = new Set(
  IS_PRODUCTION ? configuredOrigins : [...configuredOrigins, "http://localhost:3000"]
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (!IS_PRODUCTION) {
        try {
          const hostname = new URL(origin).hostname;
          if (hostname === "localhost" || hostname === "127.0.0.1") return callback(null, true);
        } catch {
          /* fallthrough */
        }
      }
      callback(new Error("CORS tidak mengizinkan origin: " + origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "kategori";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function parseAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return Number(digits) || 0;
}

function positiveNumberField(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapProduct(row) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    description: row.description,
    price: Number(row.price || 0),
    stock: Number(row.stock || 0),
    status: row.status,
    image_url: row.image_url,
    images: Array.isArray(row.images) ? row.images : [],
    weight_kg: Number(row.weight_kg || 1),
    length_cm: Number(row.length_cm || 20),
    width_cm: Number(row.width_cm || 15),
    height_cm: Number(row.height_cm || 10),
    is_flash_sale: Boolean(row.is_flash_sale),
    flash_sale_quota: Number(row.flash_sale_quota || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const FLASH_SALE_REVENUE_STATUSES = ["paid", "shipped", "completed"];

function normalizeProductName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Data flash sale dihitung dari produk yang ditandai sebagai flash sale di DB.
 * Terjual = qty item pada order berstatus paid/shipped/completed, sehingga order
 * dibatalkan atau menunggu pembayaran tidak ikut terhitung.
 */
async function getFlashSaleSnapshot() {
  const products = await prisma.product.findMany({
    where: { is_flash_sale: true, status: "active" },
    orderBy: { name: "asc" },
  });
  const quota = products.reduce((sum, product) => sum + Math.max(0, Number(product.flash_sale_quota || 0)), 0);
  const empty = {
    products: products.map((product) => ({
      ...mapProduct(product),
      flash_sale_sold: 0,
      flash_sale_remaining: Math.max(0, Number(product.flash_sale_quota || 0)),
    })),
    soldUnits: 0,
    quota,
    remaining: quota,
  };
  if (!products.length) return empty;

  const [items, orders] = await Promise.all([
    prisma.orderItem.findMany({
      select: { order_id: true, product_id: true, product_name: true, qty: true },
    }),
    prisma.order.findMany({
      where: { status: { in: FLASH_SALE_REVENUE_STATUSES } },
      select: { id: true },
    }),
  ]);
  if (!items.length || !orders.length) return empty;

  const paidOrderIds = new Set(orders.map((order) => order.id));
  const byId = new Map(products.map((product) => [product.id, product]));
  const byName = new Map(products.map((product) => [normalizeProductName(product.name), product]));
  const soldByProduct = new Map();

  items.forEach((item) => {
    if (!paidOrderIds.has(item.order_id)) return;
    const itemName = normalizeProductName(item.product_name);
    let product = item.product_id ? byId.get(item.product_id) : null;
    if (!product && itemName) {
      product = byName.get(itemName);
      if (!product) {
        product = products.find((candidate) => {
          const name = normalizeProductName(candidate.name);
          return name.startsWith(itemName) || itemName.startsWith(name);
        });
      }
    }
    if (!product) return;
    const qty = Number(item.qty || 0);
    if (qty > 0) soldByProduct.set(product.id, (soldByProduct.get(product.id) || 0) + qty);
  });

  const enriched = products.map((product) => {
    const productQuota = Math.max(0, Number(product.flash_sale_quota || 0));
    const sold = Math.min(productQuota || Number.MAX_SAFE_INTEGER, soldByProduct.get(product.id) || 0);
    return {
      ...mapProduct(product),
      flash_sale_sold: sold,
      flash_sale_remaining: Math.max(0, productQuota - sold),
    };
  });
  const soldUnits = enriched.reduce((sum, product) => sum + product.flash_sale_sold, 0);
  return {
    products: enriched,
    soldUnits,
    quota,
    remaining: enriched.reduce((sum, product) => sum + product.flash_sale_remaining, 0),
  };
}

function mapOrder(row, items = []) {
  return {
    id: row.id,
    buyer_id: row.buyer_id,
    order_number: row.order_number,
    status: row.status,
    payment_method: row.payment_method,
    payment_group: row.payment_group,
    courier: row.courier,
    shipping_address: row.shipping_address,
    shipping_eta: row.shipping_eta,
    shipping_zone: row.shipping_zone,
    shipping_region: row.shipping_region,
    tracking_number: row.tracking_number,
    shipping_deadline: row.shipping_deadline,
    cancel_reason: row.cancel_reason,
    subtotal: Number(row.subtotal || 0),
    product_fee: Number(row.product_fee || 0),
    seller_fee: Number(row.seller_fee || row.product_fee || 0),
    seller_fee_rate: Number(row.seller_fee_rate || 0),
    platform_revenue: Number(row.platform_revenue || row.product_fee || 0),
    insurance_fee: Number(row.insurance_fee || 0),
    shipping_fee: Number(row.shipping_fee || 0),
    packing_type: row.packing_type || "none",
    packing_fee: Number(row.packing_fee || 0),
    distance_km: row.distance_km == null ? null : Number(row.distance_km),
    insurance_selected: row.insurance_selected !== false,
    shipping_breakdown: row.shipping_breakdown || null,
    stock_decremented: Boolean(row.stock_decremented),
    total: Number(row.total || 0),
    payment_mode: row.payment_mode || null,
    payment_status: row.payment_status || "pending",
    midtrans_order_id: row.midtrans_order_id || null,
    midtrans_redirect_url: row.midtrans_redirect_url || null,
    paid_at: row.paid_at,
    processed_at: row.processed_at,
    shipped_at: row.shipped_at,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id,
      seller_id: i.seller_id,
      product_name: i.product_name,
      product_image: i.product_image,
      price: Number(i.price || 0),
      qty: Number(i.qty || 0),
      subtotal: Number(i.subtotal || 0),
      seller_fee: Number(i.seller_fee || 0),
      seller_fee_rate: Number(i.seller_fee_rate || 0),
      seller_net: Number(i.seller_net || 0),
      seller_tenure_months: Number(i.seller_tenure_months || 0),
      seller_sold_qty: Number(i.seller_sold_qty || 0),
    })),
  };
}

function mapReview(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    order_id: row.order_id,
    order_item_id: row.order_item_id,
    buyer_id: row.buyer_id,
    reviewer_name: row.reviewer_name,
    rating: Number(row.rating || 0),
    comment: row.comment,
    media: Array.isArray(row.media) ? row.media : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function summarizeReviews(reviews) {
  const count = reviews.length;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => {
    const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating || 0))));
    breakdown[rating] += 1;
  });
  return {
    count,
    average: count ? Number((total / count).toFixed(1)) : 0,
    breakdown,
  };
}

function toReviewRating(value) {
  const rating = Math.round(Number(value) || 0);
  return rating >= 1 && rating <= 5 ? rating : null;
}

/** Ringkasan angka rating tanpa menggantungkan UI ke data mock. */
function summarizeRatingValues(values) {
  const ratings = values.map(toReviewRating).filter(Boolean);
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((rating) => {
    breakdown[rating] += 1;
  });
  return {
    count: ratings.length,
    average: ratings.length
      ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
      : 0,
    breakdown,
  };
}

function indexReviewRatings(reviews) {
  const byId = new Map();
  const byName = new Map();
  for (const review of reviews) {
    const rating = toReviewRating(review.rating);
    if (!rating) continue;
    if (review.product_id) {
      if (!byId.has(review.product_id)) byId.set(review.product_id, []);
      byId.get(review.product_id).push(rating);
    } else if (review.product_name) {
      const key = normalizeProductName(review.product_name);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(rating);
    }
  }
  return { byId, byName };
}

function reviewRatingsForProduct(index, product) {
  return [
    ...(index.byId.get(product.id) || []),
    ...(index.byName.get(normalizeProductName(product.name)) || []),
  ];
}

const REVIEW_MEDIA_LIMIT = 5;

// Media ulasan disimpan sebagai array JSON: [{ type: "image" | "video", url }].
function normalizeReviewMedia(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Format media ulasan tidak valid.");

  const media = [];
  let videoCount = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const type = String(item.type || "").toLowerCase();
    const url = String(item.url || "").trim();

    if ((type !== "image" && type !== "video") || !url) continue;
    if (url.length > 1000) continue;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/uploads/")) continue;

    if (type === "video") {
      videoCount += 1;
      if (videoCount > 1) {
        throw new Error("Hanya satu video yang dapat diunggah per ulasan.");
      }
    }

    if (!media.some((existing) => existing.url === url)) {
      media.push({ type, url });
    }
    if (media.length > REVIEW_MEDIA_LIMIT) {
      throw new Error(`Maksimal ${REVIEW_MEDIA_LIMIT} media per ulasan.`);
    }
  }

  return media;
}

// Cocokkan produk katalog dari id (uuid) atau nama. Nama juga dicocokkan
// dengan awalan/akhiran agar varian seperti "... 12/512GB" tetap ketemu.
async function matchCatalogProducts({ productId, productName } = {}) {
  const ids = new Set();
  if (isUuid(productId)) {
    const product = await prisma.product.findUnique({ where: { id: String(productId) }, select: { id: true } });
    if (product) ids.add(product.id);
  }

  const name = String(productName || "").trim().toLowerCase();
  if (name) {
    const products = await prisma.product.findMany({ select: { id: true, name: true } });
    for (const product of products) {
      const candidate = String(product.name || "").trim().toLowerCase();
      if (!candidate) continue;
      if (candidate === name || candidate.startsWith(name) || name.startsWith(candidate)) {
        ids.add(product.id);
      }
    }
  }

  return [...ids];
}

function orderNumber() {
  return "EM-" + Date.now().toString().slice(-9) + Math.floor(Math.random() * 90 + 10);
}

/* ------------------------------------------------------------------ */
/* Biaya admin seller — sumber tunggal ada di src/finance.js            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Status pembayaran, pelacakan, dan buku kas platform                */
/* ------------------------------------------------------------------ */

function serializeTracking(row) {
  return {
    id: row.id,
    order_id: row.order_id,
    code: row.code,
    status: row.status,
    location: row.location || null,
    meta: row.meta && typeof row.meta === "object" ? row.meta : {},
    created_at: row.created_at,
  };
}

async function addTrackingEvent(orderId, code, status, options = {}) {
  const existing = await prisma.orderTracking.findFirst({ where: { order_id: orderId, code } });
  if (existing) return existing;

  let createdAt = options.createdAt ? new Date(options.createdAt) : new Date();
  // Keep events strictly ordered, even when several transitions happen at once.
  const last = await prisma.orderTracking.findFirst({
    where: { order_id: orderId },
    orderBy: { created_at: "desc" },
  });
  if (last) {
    const lastMs = new Date(last.created_at).getTime();
    if (createdAt.getTime() <= lastMs) createdAt = new Date(lastMs + 1);
  }

  return prisma.orderTracking.create({
    data: {
      order_id: orderId,
      code,
      status,
      location: options.location || null,
      meta: options.meta || {},
      created_at: createdAt,
    },
  });
}

async function ensureOrderTracking(order) {
  if (!order?.id) return;
  const created = order.created_at || new Date();
  const paidAt = order.paid_at || (["paid", "shipped", "completed"].includes(order.status) ? order.updated_at || created : null);

  await addTrackingEvent(order.id, "order_created", "waiting_payment", { createdAt: created });

  if (paidAt) {
    await addTrackingEvent(order.id, "payment_confirmed", "paid", { createdAt: paidAt });
    await addTrackingEvent(order.id, "processing", "paid", {
      createdAt: order.processed_at || paidAt,
      meta: { sellerNote: "Pesanan sedang disiapkan oleh penjual." },
    });
  }

  if (order.shipped_at || ["shipped", "completed"].includes(order.status)) {
    const shippedAt = order.shipped_at || order.completed_at || order.updated_at || created;
    const meta = {
      courier: order.courier || null,
      tracking_number: order.tracking_number || null,
      eta: order.shipping_eta || null,
    };
    await addTrackingEvent(order.id, "shipped", "shipped", { createdAt: shippedAt, meta });
    await addTrackingEvent(order.id, "in_transit", "shipped", {
      createdAt: new Date(new Date(shippedAt).getTime() + 6 * 60 * 60 * 1000),
      meta,
    });
  }

  if (order.completed_at || order.status === "completed") {
    await addTrackingEvent(order.id, "completed", "completed", {
      createdAt: order.completed_at || order.updated_at || created,
      meta: { courier: order.courier || null, tracking_number: order.tracking_number || null },
    });
  }

  if (order.cancelled_at || order.status === "cancelled") {
    await addTrackingEvent(order.id, "cancelled", "cancelled", {
      createdAt: order.cancelled_at || order.updated_at || created,
      meta: { reason: order.cancel_reason || null },
    });
  }
}

async function syncPlatformLedger(order, status) {
  if (!order?.id) return;
  const amount = feeOf(order);
  if (amount <= 0) return;

  let sellerId = order.seller_id || null;
  if (!sellerId) {
    const firstItem = await prisma.orderItem.findFirst({
      where: { order_id: order.id, seller_id: { not: null } },
      select: { seller_id: true },
    });
    sellerId = firstItem?.seller_id || null;
  }

  const existing = await prisma.platformLedger.findFirst({
    where: { order_id: order.id, type: "seller_fee" },
  });

  // Pesanan batal tidak menghasilkan fee. Jika fee pernah ditahan/settled,
  // buat entri pembalik (kredit) dan tandai entri asal sebagai dibalik.
  if (status === "cancelled") {
    if (!existing || !["held", "settled"].includes(existing.status)) return;
    const reversal = await prisma.platformLedger.findFirst({
      where: { order_id: order.id, type: "seller_fee_reversal" },
    });
    if (!reversal) {
      await prisma.platformLedger.create({
        data: {
          order_id: order.id,
          order_number: order.order_number,
          seller_id: sellerId,
          buyer_id: order.buyer_id || null,
          type: "seller_fee_reversal",
          amount: -amount,
          status: "settled",
          description: `Pembalikan fee seller untuk pesanan batal ${order.order_number}`,
        },
      });
    }
    await prisma.platformLedger.update({
      where: { id: existing.id },
      data: { status: "reversed", updated_at: new Date() },
    });
    return;
  }

  if (existing?.status === "reversed") return;

  if (!existing) {
    await prisma.platformLedger.create({
      data: {
        order_id: order.id,
        order_number: order.order_number,
        seller_id: sellerId,
        buyer_id: order.buyer_id || null,
        type: "seller_fee",
        amount,
        status,
        description: `Biaya admin seller untuk pesanan ${order.order_number}`,
      },
    });
    return;
  }

  if (existing.status !== status) {
    await prisma.platformLedger.update({
      where: { id: existing.id },
      data: { status, updated_at: new Date() },
    });
  }
}

async function decrementStockForOrder(order) {
  if (!order || order.stock_decremented) return order;

  const items = await prisma.orderItem.findMany({
    where: { order_id: order.id },
    select: { product_id: true, qty: true },
  });

  const refreshed = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: order.id },
      select: { stock_decremented: true },
    });
    if (!currentOrder || currentOrder.stock_decremented) {
      return tx.order.findUnique({ where: { id: order.id } });
    }

    for (const item of items) {
      if (!item.product_id) continue;
      const product = await tx.product.findUnique({
        where: { id: item.product_id },
        select: { stock: true, status: true },
      });
      if (!product) continue;
      const nextStock = Math.max(0, Number(product.stock || 0) - Math.max(1, Number(item.qty || 1)));
      await tx.product.update({
        where: { id: item.product_id },
        data: {
          stock: nextStock,
          ...(nextStock <= 0 ? { status: "out_of_stock" } : {}),
          updated_at: new Date(),
        },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: { stock_decremented: true, updated_at: new Date() },
    });
  });

  return refreshed || order;
}

async function restoreStockForOrder(order) {
  if (!order || !order.stock_decremented) return order;

  const items = await prisma.orderItem.findMany({
    where: { order_id: order.id },
    select: { product_id: true, qty: true },
  });

  const refreshed = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: order.id },
      select: { stock_decremented: true },
    });
    if (!currentOrder || !currentOrder.stock_decremented) {
      return tx.order.findUnique({ where: { id: order.id } });
    }

    for (const item of items) {
      if (!item.product_id) continue;
      const product = await tx.product.findUnique({
        where: { id: item.product_id },
        select: { stock: true, status: true },
      });
      if (!product) continue;
      const nextStock = Number(product.stock || 0) + Math.max(1, Number(item.qty || 1));
      await tx.product.update({
        where: { id: item.product_id },
        data: {
          stock: nextStock,
          ...(product.status === "out_of_stock" && nextStock > 0 ? { status: "active" } : {}),
          updated_at: new Date(),
        },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: { stock_decremented: false, updated_at: new Date() },
    });
  });

  return refreshed || order;
}

async function markOrderPaid(order, options = {}) {
  if (!order) return null;
  if (!["waiting_payment", "paid", "shipped", "completed"].includes(order.status)) return order;

  const alreadyPaid = ["paid", "shipped", "completed"].includes(order.status);
  const updated =
    alreadyPaid && order.payment_status && order.payment_status !== "pending"
      ? order
      : await prisma.order.update({
          where: { id: order.id },
          data: {
            status: order.status === "waiting_payment" ? "paid" : order.status,
            payment_status: options.paymentStatus || "settlement",
            payment_mode: options.paymentMode || order.payment_mode || "simulation",
            midtrans_order_id: options.midtransOrderId || order.midtrans_order_id || null,
            paid_at: order.paid_at || new Date(),
            updated_at: new Date(),
          },
        });

  const paidOrder = await decrementStockForOrder(updated);
  await ensureOrderTracking(paidOrder);
  await syncPlatformLedger(paidOrder, "held");
  return paidOrder;
}

const PROFILE_FIELDS = [
  "role",
  "job_title",
  "full_name",
  "username",
  "store_name",
  "phone",
  "store_address",
  "avatar_url",
  "gender",
  "bio",
  "account_status",
  "seller_status",
  "store_description",
  "store_banner_url",
  "operating_hours",
];

function buildProfileData(body, { partial } = {}) {
  const data = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === "role") {
      if (["buyer", "seller", "admin"].includes(body.role)) data.role = body.role;
      continue;
    }
    if (key === "operating_hours") {
      data.operating_hours = body.operating_hours ?? null;
      continue;
    }
    data[key] = body[key];
  }
  if (body.date_of_birth !== undefined) data.date_of_birth = toDate(body.date_of_birth);
  if (!partial) data.updated_at = new Date();
  return data;
}

const DEFAULT_CATEGORIES = [
  { name: "Smartphone", slug: "smartphone", color: "#3B82F6", icon: "Smartphone", sort_order: 1, subcategories: ["Android", "iOS"], attributes: ["RAM", "Storage", "OS"] },
  { name: "Laptop", slug: "laptop", color: "#8B5CF6", icon: "Laptop", sort_order: 2, subcategories: ["Gaming", "Ultrabook", "Office"], attributes: ["Processor", "RAM", "GPU"] },
  { name: "TV & Audio", slug: "tv-audio", color: "#EC4899", icon: "Tv", sort_order: 3, subcategories: ["LED TV", "Smart TV", "Soundbar"], attributes: ["Size", "Resolution"] },
  { name: "Kamera", slug: "kamera", color: "#F59E0B", icon: "Camera", sort_order: 4, subcategories: ["Mirrorless", "DSLR", "Action Cam"], attributes: ["Sensor", "Lens"] },
  { name: "Audio", slug: "audio", color: "#10B981", icon: "Headphones", sort_order: 5, subcategories: ["TWS", "Headphone", "Speaker"], attributes: ["Connectivity", "Battery Life"] },
  { name: "Gaming", slug: "gaming", color: "#F43F5E", icon: "Gamepad2", sort_order: 6, subcategories: ["Console", "Aksesoris", "PC Gaming"], attributes: ["Platform"] },
  { name: "Smart Watch", slug: "smart-watch", color: "#06B6D4", icon: "Watch", sort_order: 7, subcategories: ["Android", "iOS"], attributes: ["Connectivity", "Battery Life"] },
  { name: "Kabel & Charger", slug: "kabel-charger", color: "#7C3AED", icon: "Cable", sort_order: 8, subcategories: ["USB-C", "Lightning", "Charger"], attributes: ["Watt", "Connector"] },
];

async function ensureDefaultCategories() {
  try {
    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        // Jangan timpa warna/nama yang sudah diubah lewat manajemen kategori.
        update: {},
        create: category,
      });
    }
  } catch (err) {
    console.warn("Gagal sinkron kategori default:", err.message);
  }
}

// Order item lama bisa memiliki seller_id null. Isi dari katalog produk agar
// daftar pesanan seller dan buyer memakai atribusi penjual yang sama.
// Status, jumlah, fee, dan stok tidak diubah.
async function backfillOrderItemSellers() {
  try {
    const pending = await prisma.orderItem.findMany({
      where: { seller_id: null },
      select: { id: true, product_id: true, product_name: true },
    });
    if (!pending.length) return;
    const products = await prisma.product.findMany({ select: { id: true, name: true, seller_id: true } });
    const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    const byId = new Map(products.map((product) => [product.id, product]));
    const byName = new Map();
    for (const product of products) {
      const key = normalize(product.name);
      if (key && !byName.has(key)) byName.set(key, product);
    }

    let updated = 0;
    for (const item of pending) {
      const key = normalize(item.product_name);
      const product =
        (item.product_id && byId.get(item.product_id)) ||
        byName.get(key) ||
        products.find((row) => {
          const name = normalize(row.name);
          return Boolean(key && name && (name.includes(key) || key.includes(name)));
        });
      if (!product?.seller_id) continue;
      await prisma.orderItem.update({ where: { id: item.id }, data: { seller_id: product.seller_id } });
      updated += 1;
    }
    if (updated) console.log(`Seller order item diselaraskan: ${updated}`);
  } catch (err) {
    console.warn("Gagal menyelaraskan seller order item:", err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Upload file ke server/uploads                                       */
/* ------------------------------------------------------------------ */

const uploadRoot = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadRoot, { recursive: true });
const ALLOWED_BUCKETS = ["avatars", "products", "chat-files", "reviews"];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const bucket = ALLOWED_BUCKETS.includes(req.body.bucket) ? req.body.bucket : "misc";
    const rel = String(req.body.path || file.originalname || "file").replace(/\\/g, "/");
    const dir = path.join(uploadRoot, bucket, path.dirname(rel));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const rel = String(req.body.path || file.originalname || "file").replace(/\\/g, "/");
    cb(null, path.basename(rel));
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

app.use("/uploads", express.static(uploadRoot));

app.post("/api/upload", requireUser, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File tidak ditemukan." });
  const bucket = ALLOWED_BUCKETS.includes(req.body.bucket) ? req.body.bucket : "misc";
  const rel = String(req.body.path || req.file.filename).replace(/\\/g, "/");
  res.status(201).json({ path: rel, url: `${apiBaseUrl}/uploads/${bucket}/${rel}` });
});

/* ------------------------------------------------------------------ */
/* Auth lokal (JWT + bcrypt)                                           */
/* ------------------------------------------------------------------ */

app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const meta = body.data || body.user_metadata || {};
  if (!email || password.length < 6) {
    return res.status(400).json({ error: "Email dan password (min. 6 karakter) wajib diisi." });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email sudah terdaftar." });
  const role = ["buyer", "seller", "admin"].includes(meta.role) ? meta.role : "buyer";
  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      phone: meta.phone || null,
      password_hash,
      user_metadata: { ...meta, role },
    },
  });
  await prisma.profile.create({
    data: {
      id: user.id,
      role,
      full_name: meta.full_name || null,
      store_name: meta.store_name || null,
      phone: meta.phone || null,
      store_address: meta.store_address || null,
      job_title: meta.job_title || null,
    },
  });
  const token = signToken(user.id);
  res.status(201).json({ user: publicUser(user), session: { access_token: token, user: publicUser(user) } });
});

app.post("/api/auth/login", async (req, res) => {
  const body = req.body || {};
  const identifier = String(body.email || body.phone || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/telepon dan password wajib diisi." });
  }
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }] },
  });
  if (!user) return res.status(400).json({ error: "Email atau password salah." });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: "Email atau password salah." });
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  const token = signToken(user.id);
  res.json({ user: publicUser(user), profile, session: { access_token: token, user: publicUser(user) } });
});

app.get("/api/auth/user", requireUser, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/update", requireUser, async (req, res) => {
  const body = req.body || {};
  const data = {};
  if (body.email) {
    const email = String(body.email).trim().toLowerCase();
    const dup = await prisma.user.findUnique({ where: { email } });
    if (dup && dup.id !== req.user.id) return res.status(400).json({ error: "Email sudah digunakan." });
    data.email = email;
  }
  if (body.password) {
    if (String(body.password).length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter." });
    }
    data.password_hash = await bcrypt.hash(String(body.password), 10);
  }
  if (!Object.keys(data).length) return res.json({ user: req.user });
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email wajib diisi." });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "Email tidak terdaftar." });
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || password.length < 6) {
    return res.status(400).json({ error: "Email dan password baru (min. 6 karakter) wajib diisi." });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "Email tidak terdaftar." });
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: await bcrypt.hash(password, 10) },
  });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Profiles (dipakai adapter lokal)                                    */
/* ------------------------------------------------------------------ */

app.get("/api/profiles", optionalUser, async (req, res) => {
  const id = req.query.id ? String(req.query.id) : null;
  if (!id) {
    const profiles = await prisma.profile.findMany({ orderBy: { created_at: "desc" } });
    return res.json({ data: profiles, profiles });
  }
  const profile = await prisma.profile.findUnique({ where: { id } });
  res.json({ data: profile, profile });
});

app.post("/api/profiles", optionalUser, async (req, res) => {
  const body = req.body || {};
  const id = body.id || req.user?.id;
  if (!id) return res.status(400).json({ error: "id profil wajib diisi." });
  try {
    const data = buildProfileData(body);
    const profile = await prisma.profile.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
    res.status(201).json({ data: profile, profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/profiles", optionalUser, async (req, res) => {
  const body = req.body || {};
  const id = (req.query.id && String(req.query.id)) || body.id;
  if (!id) return res.status(400).json({ error: "id profil wajib diisi." });
  try {
    const data = buildProfileData(body);
    const profile = await prisma.profile.update({ where: { id }, data });
    res.json({ data: profile, profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Profil pengguna (endpoint aplikasi)                                 */
/* ------------------------------------------------------------------ */

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "elektromart-api" });
});

/* ------------------------------------------------------------------ */
/* Halaman bantuan (CMS)                                               */
/* ------------------------------------------------------------------ */

const HELP_PAGE_SLUGS = ["faq", "syarat-ketentuan", "kebijakan-privasi", "hubungi-cs", "bantuan-penjual"];

function mapHelpPage(row) {
  return { slug: row.slug, data: row.data, updated_at: row.updated_at };
}

app.get("/api/help-pages", async (_req, res) => {
  const rows = await prisma.helpPage.findMany();
  res.json(rows.map(mapHelpPage));
});

app.get("/api/help-pages/:slug", async (req, res) => {
  const row = await prisma.helpPage.findUnique({ where: { slug: String(req.params.slug) } });
  if (!row) return res.status(404).json({ error: "Halaman bantuan belum diubah." });
  res.json(mapHelpPage(row));
});

app.put("/api/help-pages/:slug", requireUser, requireRole("admin"), async (req, res) => {
  const slug = String(req.params.slug);
  if (!HELP_PAGE_SLUGS.includes(slug)) {
    return res.status(400).json({ error: "Slug halaman bantuan tidak dikenal." });
  }
  const data = req.body?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ error: "Data halaman bantuan tidak valid." });
  }
  const row = await prisma.helpPage.upsert({
    where: { slug },
    update: { data },
    create: { slug, data },
  });
  res.json(mapHelpPage(row));
});

app.get("/api/profile", requireUser, async (req, res) => {
  res.json({
    profile: {
      ...(req.profile || {}),
      email: req.user.email,
    },
  });
});

app.patch("/api/profile", requireUser, async (req, res) => {
  const body = req.body || {};
  const payload = {
    username: body.username ?? req.profile?.username,
    full_name: body.full_name ?? req.profile?.full_name,
    phone: body.phone ?? req.profile?.phone,
    date_of_birth: body.date_of_birth ? toDate(body.date_of_birth) : null,
    gender: body.gender || null,
    bio: body.bio ?? req.profile?.bio,
    store_name: body.store_name ?? req.profile?.store_name,
    store_address: body.store_address ?? req.profile?.store_address,
    store_description: body.store_description ?? req.profile?.store_description,
    avatar_url: body.avatar_url ?? req.profile?.avatar_url,
    store_banner_url: body.store_banner_url ?? req.profile?.store_banner_url,
    operating_hours: body.operating_hours ?? req.profile?.operating_hours,
    updated_at: new Date(),
  };
  try {
    const data = await prisma.profile.upsert({
      where: { id: req.user.id },
      update: payload,
      create: { id: req.user.id, role: "buyer", ...payload },
    });
    res.json({ profile: { ...data, email: req.user.email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Alamat pengiriman                                                   */
/* ------------------------------------------------------------------ */

app.get("/api/addresses", requireUser, async (req, res) => {
  const userId = req.profile?.role === "admin" && req.query.userId ? String(req.query.userId) : req.user.id;
  const addresses = await prisma.shippingAddress.findMany({
    where: { user_id: userId },
    orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
  });
  res.json({ addresses });
});

app.post("/api/addresses", requireUser, async (req, res) => {
  const body = req.body || {};
  if (!body.recipient || !body.address || !body.city) {
    return res.status(400).json({ error: "Nama penerima, alamat, dan kota wajib diisi." });
  }
  if (body.is_default) {
    await prisma.shippingAddress.updateMany({ where: { user_id: req.user.id }, data: { is_default: false } });
  }
  const count = await prisma.shippingAddress.count({ where: { user_id: req.user.id } });
  try {
    const address = await prisma.shippingAddress.create({
      data: {
        user_id: req.user.id,
        label: body.label || "home",
        recipient: body.recipient,
        phone: body.phone || "",
        address: body.address,
        city: body.city,
        province: body.province || "Jawa Timur",
        postal: body.postal || "",
        is_default: Boolean(body.is_default) || count === 0,
      },
    });
    res.status(201).json({ address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/addresses/:id", requireUser, async (req, res) => {
  const body = req.body || {};
  const existing = await prisma.shippingAddress.findUnique({ where: { id: req.params.id } });
  if (!existing || (existing.user_id !== req.user.id && req.profile?.role !== "admin")) {
    return res.status(404).json({ error: "Alamat tidak ditemukan." });
  }
  if (body.is_default) {
    await prisma.shippingAddress.updateMany({ where: { user_id: existing.user_id }, data: { is_default: false } });
  }
  try {
    const address = await prisma.shippingAddress.update({
      where: { id: req.params.id },
      data: {
        label: body.label ?? existing.label,
        recipient: body.recipient ?? existing.recipient,
        phone: body.phone ?? existing.phone,
        address: body.address ?? existing.address,
        city: body.city ?? existing.city,
        province: body.province ?? existing.province,
        postal: body.postal ?? existing.postal,
        is_default: body.is_default ?? existing.is_default,
        updated_at: new Date(),
      },
    });
    res.json({ address });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/addresses/:id", requireUser, async (req, res) => {
  const existing = await prisma.shippingAddress.findUnique({ where: { id: req.params.id } });
  if (!existing || (existing.user_id !== req.user.id && req.profile?.role !== "admin")) {
    return res.status(404).json({ error: "Alamat tidak ditemukan." });
  }
  await prisma.shippingAddress.delete({ where: { id: req.params.id } });
  if (existing.is_default) {
    const next = await prisma.shippingAddress.findFirst({
      where: { user_id: existing.user_id },
      orderBy: { created_at: "asc" },
    });
    if (next) {
      await prisma.shippingAddress.update({ where: { id: next.id }, data: { is_default: true } });
    }
  }
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Kategori                                                            */
/* ------------------------------------------------------------------ */

app.get("/api/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }] });
  res.json({
    categories: categories.map((c) => ({
      ...c,
      subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
      attributes: Array.isArray(c.attributes) ? c.attributes : [],
    })),
  });
});

app.post("/api/categories", requireUser, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: "Nama kategori wajib diisi." });
  const count = await prisma.category.count();
  try {
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: slugify(body.slug || body.name),
        color: body.color || "#1a3fd6",
        icon: body.icon || null,
        sort_order: Number(body.sort_order || count + 1),
        subcategories: Array.isArray(body.subcategories) ? body.subcategories : String(body.subcategories || "").split(",").map((s) => s.trim()).filter(Boolean),
        attributes: Array.isArray(body.attributes) ? body.attributes : String(body.attributes || "").split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/categories/:id", requireUser, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  const payload = { updated_at: new Date() };
  if (body.name) payload.name = body.name;
  if (body.slug || body.name) payload.slug = slugify(body.slug || body.name);
  if (body.color) payload.color = body.color;
  if (body.icon !== undefined) payload.icon = body.icon;
  if (body.subcategories !== undefined) {
    payload.subcategories = Array.isArray(body.subcategories)
      ? body.subcategories
      : String(body.subcategories || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (body.attributes !== undefined) {
    payload.attributes = Array.isArray(body.attributes)
      ? body.attributes
      : String(body.attributes || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: payload });
    res.json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", requireUser, requireRole("admin"), async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Produk & layanan pengiriman                                         */
/* ------------------------------------------------------------------ */

app.get("/api/shipping/services", (_req, res) => {
  res.json({ services: SHIPPING_SERVICES });
});

app.get("/api/flash-sale", optionalUser, async (_req, res) => {
  try {
    res.json(await getFlashSaleSnapshot());
  } catch (err) {
    console.error("flash sale snapshot failed", err);
    res.status(500).json({ error: "Gagal memuat data flash sale." });
  }
});

app.get("/api/products", optionalUser, async (req, res) => {
  const where = {};
  if (req.profile?.role === "seller" && req.query.catalog !== "1") where.seller_id = req.user.id;
  if (req.query.sellerId) where.seller_id = String(req.query.sellerId);
  const products = await prisma.product.findMany({ where, orderBy: { created_at: "desc" } });
  let soldByProduct = new Map();
  let soldByName = new Map();
  try {
    // Satu sumber kebenaran: unit terjual dihitung dari pesanan valid (batal tidak masuk).
    const snapshot = await finance.buildPlatformFinance();
    soldByProduct = new Map(snapshot.topProducts.map((row) => [row.id, row.units_sold]));
    soldByName = new Map(snapshot.topProducts.map((row) => [row.name, row.units_sold]));
  } catch {
    /* Jika agregat gagal, produk tetap tampil dengan sold = 0. */
  }

  // Rating produk dan toko juga berasal dari ulasan di database, bukan angka mock.
  const reviews = await prisma.review.findMany({
    select: { product_id: true, product_name: true, rating: true },
  });
  const reviewIndex = indexReviewRatings(reviews);
  const storeRatingValues = new Map();
  products.forEach((row) => {
    if (!row.seller_id) return;
    if (!storeRatingValues.has(row.seller_id)) storeRatingValues.set(row.seller_id, []);
    storeRatingValues.get(row.seller_id).push(...reviewRatingsForProduct(reviewIndex, row));
  });
  const storeRatingSummary = new Map(
    [...storeRatingValues].map(([sellerId, values]) => [sellerId, summarizeRatingValues(values)])
  );

  res.json({
    products: products.map((row) => {
      const rating = summarizeRatingValues(reviewRatingsForProduct(reviewIndex, row));
      return {
        ...mapProduct(row),
        sold: soldByProduct.get(row.id) ?? soldByName.get(row.name) ?? 0,
        rating: rating.average,
        review_count: rating.count,
        store_rating: storeRatingSummary.get(row.seller_id)?.average || 0,
      };
    }),
  });
});

app.post("/api/products", requireUser, requireRole("seller", "admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: "Nama produk wajib diisi." });
  const stock = Number(body.stock || 0);
  const status = body.status || (stock <= 0 ? "out_of_stock" : "active");
  const sellerId = req.profile.role === "admin" && body.seller_id ? body.seller_id : req.user.id;
  try {
    const product = await prisma.product.create({
      data: {
        seller_id: sellerId,
        name: body.name,
        sku: body.sku || null,
        category: body.category || null,
        description: body.description || null,
        price: parseAmount(body.price),
        stock,
        status,
        image_url: body.image_url || null,
        images: Array.isArray(body.images) ? body.images.filter(Boolean) : null,
        weight_kg: positiveNumberField(body.weight_kg, 1),
        length_cm: Math.round(positiveNumberField(body.length_cm, 20)),
        width_cm: Math.round(positiveNumberField(body.width_cm, 15)),
        height_cm: Math.round(positiveNumberField(body.height_cm, 10)),
      },
    });
    res.status(201).json({ product: mapProduct(product) });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Produk dengan nama ini sudah ada di toko Anda." });
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/products/:id", requireUser, requireRole("seller", "admin"), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Produk tidak ditemukan." });
  if (req.profile.role === "seller" && existing.seller_id !== req.user.id) {
    return res.status(403).json({ error: "Akses ditolak." });
  }
  const body = req.body || {};
  const payload = { updated_at: new Date() };
  ["name", "sku", "category", "description", "image_url", "status"].forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  if (body.images !== undefined) {
    payload.images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
  }
  if (body.price !== undefined) payload.price = parseAmount(body.price);
  if (body.weight_kg !== undefined) payload.weight_kg = positiveNumberField(body.weight_kg, 1);
  if (body.length_cm !== undefined) payload.length_cm = Math.round(positiveNumberField(body.length_cm, 20));
  if (body.width_cm !== undefined) payload.width_cm = Math.round(positiveNumberField(body.width_cm, 15));
  if (body.height_cm !== undefined) payload.height_cm = Math.round(positiveNumberField(body.height_cm, 10));
  if (body.stock !== undefined) {
    payload.stock = Number(body.stock);
    if (!body.status) payload.status = payload.stock <= 0 ? "out_of_stock" : existing.status === "draft" ? "draft" : "active";
  }
  if (req.profile.role === "admin") {
    if (body.is_flash_sale !== undefined) payload.is_flash_sale = Boolean(body.is_flash_sale);
    if (body.flash_sale_quota !== undefined) {
      payload.flash_sale_quota = Math.max(0, Math.round(Number(body.flash_sale_quota) || 0));
    }
  }
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: payload });
    res.json({ product: mapProduct(product) });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Produk dengan nama ini sudah ada di toko Anda." });
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/products/:id/stock", requireUser, requireRole("seller", "admin"), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Produk tidak ditemukan." });
  if (req.profile.role === "seller" && existing.seller_id !== req.user.id) {
    return res.status(403).json({ error: "Akses ditolak." });
  }

  const delta = Math.round(Number(req.body?.delta));
  if (!Number.isFinite(delta) || delta <= 0) {
    return res.status(400).json({ error: "Jumlah stok yang ditambahkan harus lebih dari 0." });
  }

  const nextStock = Math.max(0, Number(existing.stock || 0) + delta);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      stock: nextStock,
      status: existing.status === "draft" ? "draft" : "active",
      updated_at: new Date(),
    },
  });

  res.json({ product: mapProduct(product) });
});

app.delete("/api/products/:id", requireUser, requireRole("seller", "admin"), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Produk tidak ditemukan." });
  if (req.profile.role === "seller" && existing.seller_id !== req.user.id) {
    return res.status(403).json({ error: "Akses ditolak." });
  }
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Toko & pengguna (admin)                                             */
/* ------------------------------------------------------------------ */

app.get("/api/stores", async (_req, res) => {
  const stores = await prisma.profile.findMany({ where: { role: "seller" }, orderBy: { created_at: "desc" } });
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailById = Object.fromEntries(users.map((u) => [u.id, u.email]));
  const products = await prisma.product.findMany({
    select: { id: true, seller_id: true, status: true, name: true },
  });
  const reviews = await prisma.review.findMany({
    select: { product_id: true, product_name: true, rating: true },
  });
  const reviewIndex = indexReviewRatings(reviews);
  const countBySeller = {};
  const activeBySeller = {};
  products.forEach((p) => {
    countBySeller[p.seller_id] = (countBySeller[p.seller_id] || 0) + 1;
    if (p.status === "active") activeBySeller[p.seller_id] = (activeBySeller[p.seller_id] || 0) + 1;
  });

  res.json({
    stores: stores.map((s) => {
      const sellerProducts = products.filter((p) => p.seller_id === s.id);
      const ratings = sellerProducts.flatMap((p) => reviewRatingsForProduct(reviewIndex, p));
      const summary = summarizeRatingValues(ratings);
      return {
        ...s,
        email: emailById[s.id] || null,
        product_count: countBySeller[s.id] || 0,
        active_product_count: activeBySeller[s.id] || 0,
        rating: summary.average,
        review_count: summary.count,
        rating_breakdown: summary.breakdown,
        verified: s.seller_status === "verified",
      };
    }),
  });
});

app.get("/api/users", requireUser, requireRole("admin"), async (req, res) => {
  const role = req.query.role ? String(req.query.role) : null;
  const profiles = await prisma.profile.findMany({
    where: role ? { role } : undefined,
    orderBy: { created_at: "desc" },
  });
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailById = Object.fromEntries(users.map((u) => [u.id, u.email]));
  const products = await prisma.product.findMany({ select: { seller_id: true } });
  const countBySeller = {};
  products.forEach((p) => {
    countBySeller[p.seller_id] = (countBySeller[p.seller_id] || 0) + 1;
  });

  res.json({
    users: profiles.map((p) => ({
      ...p,
      email: emailById[p.id] || null,
      product_count: countBySeller[p.id] || 0,
    })),
  });
});

app.post("/api/users", requireUser, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.email || !body.password || !body.full_name) {
    return res.status(400).json({ error: "Email, password, dan nama lengkap wajib diisi." });
  }
  const email = String(body.email).trim().toLowerCase();
  const dup = await prisma.user.findUnique({ where: { email } });
  if (dup) return res.status(400).json({ error: "Email sudah terdaftar." });
  const role = body.role === "seller" || body.role === "admin" ? body.role : "buyer";
  try {
    const user = await prisma.user.create({
      data: {
        email,
        phone: body.phone || null,
        password_hash: await bcrypt.hash(String(body.password), 10),
        user_metadata: { role, full_name: body.full_name, phone: body.phone || "", store_name: body.store_name || "" },
      },
    });
    const profile = await prisma.profile.create({
      data: {
        id: user.id,
        role,
        full_name: body.full_name,
        phone: body.phone || null,
        store_name: body.store_name || null,
        store_address: body.store_address || null,
        account_status: body.account_status || "active",
        seller_status: role === "seller" ? body.seller_status || "verified" : null,
      },
    });
    res.status(201).json({ user: { ...profile, email: user.email, product_count: 0 } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/users/:id", requireUser, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  const data = { updated_at: new Date() };
  ["full_name", "phone", "store_name", "store_address", "store_description", "account_status", "seller_status", "role", "bio", "gender"].forEach((key) => {
    if (body[key] !== undefined) data[key] = body[key];
  });
  if (body.date_of_birth !== undefined) data.date_of_birth = toDate(body.date_of_birth);
  try {
    const profile = await prisma.profile.update({ where: { id: req.params.id }, data });
    if (body.email) {
      await prisma.user.update({ where: { id: req.params.id }, data: { email: String(body.email).trim().toLowerCase() } });
    }
    res.json({ user: profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/users/:id", requireUser, requireRole("admin"), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Tidak dapat menghapus akun sendiri." });
  try {
    await prisma.profile.deleteMany({ where: { id: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Pesanan                                                            */
/* ------------------------------------------------------------------ */

app.get("/api/orders", requireUser, async (req, res) => {
  try {
    const role = req.profile?.role;
    let where = {};
    if (role === "buyer") where.buyer_id = req.user.id;
    if (role === "seller") {
      const sellerItems = await prisma.orderItem.findMany({ where: { seller_id: req.user.id }, select: { order_id: true } });
      const orderIds = [...new Set(sellerItems.map((i) => i.order_id))];
      if (!orderIds.length) return res.json({ orders: [] });
      where.id = { in: orderIds };
    }
    const orders = await prisma.order.findMany({ where, orderBy: { created_at: "desc" } });
    const ids = orders.map((o) => o.id);
    const items = ids.length
      ? await prisma.orderItem.findMany({ where: { order_id: { in: ids } }, orderBy: { created_at: "asc" } })
      : [];
    const byOrder = {};
    items.forEach((i) => {
      if (role === "seller" && i.seller_id !== req.user.id) return;
      (byOrder[i.order_id] = byOrder[i.order_id] || []).push(i);
    });

    const buyers = {};
    if (role !== "buyer") {
      const buyerIds = [...new Set(orders.map((o) => o.buyer_id))];
      const profiles = buyerIds.length
        ? await prisma.profile.findMany({
            where: { id: { in: buyerIds } },
            select: { id: true, full_name: true, username: true, phone: true, avatar_url: true },
          })
        : [];
      profiles.forEach((p) => {
        buyers[p.id] = p;
      });
    }

    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    const productRows = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, stock: true, status: true } })
      : [];
    const productMap = {};
    productRows.forEach((p) => {
      productMap[p.id] = p;
    });

    const itemIds = items.map((i) => i.id);
    const reviewRows = itemIds.length
      ? await prisma.review.findMany({ where: { order_item_id: { in: itemIds } } })
      : [];
    const reviewByItem = {};
    reviewRows.forEach((review) => {
      if (review.order_item_id) reviewByItem[review.order_item_id] = mapReview(review);
    });

    res.json({
      orders: orders.map((o) => {
        const mapped = mapOrder(o, byOrder[o.id] || []);
        if (role !== "buyer") mapped.buyer = buyers[o.buyer_id] || null;
        mapped.items = (mapped.items || []).map((it) => {
          const p = it.product_id ? productMap[it.product_id] : null;
          return {
            ...it,
            product_stock: p ? Number(p.stock || 0) : null,
            product_status: p ? p.status : null,
            review: reviewByItem[it.id] || null,
          };
        });
        return mapped;
      }),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const ORDER_STATUSES = ["waiting_payment", "paid", "shipped", "completed", "cancelled"];

app.get("/api/orders/notifications", requireUser, async (req, res) => {
  try {
    const role = req.profile?.role;
    if (role !== "seller" && role !== "admin") return res.status(403).json({ error: "Akses ditolak." });

    let orderIds = null;
    if (role === "seller") {
      const sellerItems = await prisma.orderItem.findMany({ where: { seller_id: req.user.id }, select: { order_id: true } });
      orderIds = [...new Set(sellerItems.map((i) => i.order_id))];
    }

    const orders = orderIds && !orderIds.length
      ? []
      : await prisma.order.findMany({
          where: {
            status: "completed",
            completed_at: { not: null },
            ...(orderIds ? { id: { in: orderIds } } : {}),
          },
          orderBy: { completed_at: "desc" },
          take: 20,
          select: { id: true, order_number: true, buyer_id: true, total: true, completed_at: true },
        });

    const buyerIds = [...new Set(orders.map((o) => o.buyer_id))];
    const profiles = buyerIds.length
      ? await prisma.profile.findMany({ where: { id: { in: buyerIds } }, select: { id: true, full_name: true, username: true } })
      : [];
    const nameById = {};
    profiles.forEach((p) => {
      nameById[p.id] = p.full_name || p.username || null;
    });

    const lowStockWhere = {
      stock: { lt: 10 },
      status: { in: ["active", "out_of_stock"] },
      ...(role === "seller" ? { seller_id: req.user.id } : {}),
    };
    const lowStockProducts = await prisma.product.findMany({
      where: lowStockWhere,
      orderBy: [{ stock: "asc" }, { updated_at: "desc" }],
      take: 10,
      select: { id: true, name: true, stock: true, updated_at: true, created_at: true },
    });

    const timeValue = (value) => {
      const time = new Date(value || 0).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const notifications = [
      ...orders.map((o) => ({
        id: o.id,
        type: "order_completed",
        order_number: o.order_number,
        total: Number(o.total || 0),
        completed_at: o.completed_at,
        timestamp: o.completed_at,
        buyer_name: nameById[o.buyer_id] || null,
      })),
      ...lowStockProducts.map((p) => ({
        id: `low-stock-${p.id}`,
        type: "low_stock",
        product_id: p.id,
        product_name: p.name,
        stock: Number(p.stock || 0),
        timestamp: p.updated_at || p.created_at,
        completed_at: null,
        buyer_name: null,
      })),
    ].sort((a, b) => timeValue(b.timestamp) - timeValue(a.timestamp));

    res.json({ notifications: notifications.slice(0, 30) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/orders/:id", requireUser, async (req, res) => {
  try {
    const role = req.profile?.role;
    const id = req.params.id;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });

    const orderItems = await prisma.orderItem.findMany({ where: { order_id: id }, orderBy: { created_at: "asc" } });

    const isBuyer = order.buyer_id === req.user.id;
    const isSeller = orderItems.some((i) => i.seller_id === req.user.id);
    const isAdmin = role === "admin";
    if (!isBuyer && !isSeller && !isAdmin) return res.status(403).json({ error: "Akses ditolak." });

    const body = req.body || {};
    const data = { updated_at: new Date() };
    const nextStatus = body.status;
    if (nextStatus !== undefined) {
      if (!ORDER_STATUSES.includes(nextStatus)) return res.status(400).json({ error: "Status tidak valid." });
      // Mode simulasi hanya untuk pengembangan. Di produksi, paid harus dari
      // webhook gateway dan completed dari konfirmasi/auto-complete seller.
      const simulationStatus = process.env.ALLOW_SIMULATION_STATUS === "true" || process.env.NODE_ENV !== "production";
      const allowed = simulationStatus
        ? {
            buyer: ["paid", "completed", "cancelled"],
            seller: ["paid", "shipped", "cancelled"],
            admin: ORDER_STATUSES,
          }
        : {
            buyer: ["cancelled"],
            seller: ["shipped", "cancelled"],
            admin: ORDER_STATUSES,
          };
      if (role !== "admin" && !allowed[role]?.includes(nextStatus)) {
        return res.status(403).json({ error: "Anda tidak dapat mengubah ke status ini." });
      }
      if (nextStatus !== order.status) {
        data.status = nextStatus;
        if (nextStatus === "paid") {
          data.payment_status = order.payment_status && order.payment_status !== "pending" ? order.payment_status : "settlement";
          data.payment_mode = order.payment_mode || "simulation";
          data.paid_at = order.paid_at || new Date();
        }
        if (nextStatus === "shipped") {
          data.processed_at = order.processed_at || new Date();
          data.shipped_at = new Date();
        }
        if (nextStatus === "completed") data.completed_at = new Date();
        if (nextStatus === "cancelled") data.cancelled_at = new Date();
      }
    }
    if (body.tracking_number !== undefined) data.tracking_number = body.tracking_number || null;
    if (body.courier !== undefined) data.courier = body.courier || null;
    if (body.shipping_eta !== undefined) data.shipping_eta = body.shipping_eta || null;
    if (body.shipping_deadline !== undefined) data.shipping_deadline = toDate(body.shipping_deadline);
    if (body.cancel_reason !== undefined) data.cancel_reason = body.cancel_reason || null;

    const willCancel = data.status === "cancelled" && order.status !== "cancelled";

    let resultOrder = await prisma.order.update({ where: { id }, data });

    if (data.status === "paid" && order.status !== "paid") {
      resultOrder = await decrementStockForOrder(resultOrder);
    }

    if (["paid", "shipped", "completed"].includes(resultOrder.status)) {
      await ensureOrderTracking(resultOrder);
      await syncPlatformLedger(resultOrder, resultOrder.status === "completed" ? "settled" : "held");
    } else if (resultOrder.status === "cancelled") {
      await ensureOrderTracking(resultOrder);
      await syncPlatformLedger(resultOrder, "cancelled");
    }

    if (willCancel) resultOrder = await restoreStockForOrder(resultOrder);

    res.json({ order: mapOrder(resultOrder, orderItems) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/orders", requireUser, requireRole("buyer", "admin"), async (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return res.status(400).json({ error: "Keranjang kosong." });
  if (!body.address || !body.address.city) {
    return res.status(400).json({ error: "Alamat pengiriman wajib diisi." });
  }
  if (!body.payment_method) {
    return res.status(400).json({ error: "Metode pembayaran wajib dipilih." });
  }

  const courier = body.courier || "";
  const insuranceSelected = body.insurance_selected !== false && String(body.insurance_selected).toLowerCase() !== "false";
  const packingType = ["none", "bubble", "wood"].includes(body.packing_type) ? body.packing_type : "none";
  const distanceKm = Math.max(0, Number(body.distance_km) || 0);

  const productSelect = {
    id: true,
    seller_id: true,
    price: true,
    name: true,
    image_url: true,
    weight_kg: true,
    length_cm: true,
    width_cm: true,
    height_cm: true,
  };

  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      const qty = Math.max(1, Number(item.qty || 1));
      const name = String(item.product_name || item.name || "").trim();
      let product = null;

      if (isUuid(item.product_id)) {
        product = await prisma.product.findUnique({ where: { id: item.product_id }, select: productSelect });
      }
      if (!product && name) {
        product = await prisma.product.findFirst({ where: { name }, select: productSelect });
      }

      // Harga dan atribut pengiriman selalu diambil dari database, bukan dari client.
      const price = Number(product?.price ?? 0);
      return {
        product_id: product?.id || null,
        seller_id: product?.seller_id || null,
        product_name: product?.name || name || "Produk",
        product_image: product?.image_url || item.product_image || item.image || null,
        price,
        qty,
        subtotal: Math.round(price * qty),
        weightKg: positiveNumberField(product?.weight_kg, 1),
        lengthCm: positiveNumberField(product?.length_cm, 20),
        widthCm: positiveNumberField(product?.width_cm, 15),
        heightCm: positiveNumberField(product?.height_cm, 10),
      };
    })
  );

  // Hitung biaya admin seller dari lama berjualan + jumlah produk terjual.
  const sellerIds = [...new Set(resolvedItems.map((i) => i.seller_id).filter(Boolean))];
  const sellerStats = new Map();
  await Promise.all(
    sellerIds.map(async (sellerId) => {
      const profile = await prisma.profile.findUnique({
        where: { id: sellerId },
        select: { created_at: true },
      });
      const sellerItemRows = await prisma.orderItem.findMany({
        where: { seller_id: sellerId },
        select: { qty: true, order_id: true },
      });
      const orderIds = [...new Set(sellerItemRows.map((row) => row.order_id))];
      const paidOrders = orderIds.length
        ? await prisma.order.findMany({
            where: { id: { in: orderIds }, status: { in: ["paid", "shipped", "completed"] } },
            select: { id: true },
          })
        : [];
      const paidOrderIds = new Set(paidOrders.map((row) => row.id));
      const soldQty = sellerItemRows
        .filter((row) => paidOrderIds.has(row.order_id))
        .reduce((sum, row) => sum + Number(row.qty || 0), 0);
      const tenureMonths = monthsBetween(profile?.created_at);
      sellerStats.set(sellerId, {
        tenureMonths,
        soldQty,
        rate: calcSellerFeeRate(tenureMonths, soldQty),
      });
    })
  );

  const sellerFeeTotal = resolvedItems.reduce((sum, item) => {
    const stats = item.seller_id
      ? sellerStats.get(item.seller_id)
      : { tenureMonths: 0, soldQty: 0, rate: SELLER_FEE_MIN };
    const rate = stats?.rate ?? SELLER_FEE_MIN;
    const sellerFee = Math.round(item.subtotal * rate);
    item.seller_fee = sellerFee;
    item.seller_fee_rate = rate;
    item.seller_net = item.subtotal - sellerFee;
    item.seller_tenure_months = stats?.tenureMonths || 0;
    item.seller_sold_qty = stats?.soldQty || 0;
    return sum + sellerFee;
  }, 0);

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = quoteShipping({
    service: courier,
    province: body.address.province,
    items: resolvedItems,
    insuranceEnabled: insuranceSelected,
    packingType,
    distanceKm,
  });

  const shippingFee = courier ? shipping.baseFee : 0;
  const insuranceFee = courier ? shipping.insuranceFee : 0;
  const packingFee = courier ? shipping.packingFee : 0;
  const total = subtotal + shippingFee + insuranceFee + packingFee;
  const sellerFeeRate = subtotal > 0 ? Number((sellerFeeTotal / subtotal).toFixed(4)) : 0;

  let order;
  try {
    order = await prisma.order.create({
      data: {
        buyer_id: req.user.id,
        order_number: orderNumber(),
        status: "waiting_payment",
        payment_method: body.payment_method,
        payment_group: body.payment_group || "bank",
        payment_status: "pending",
        courier,
        shipping_address: body.address,
        shipping_eta: courier ? getService(courier).eta : null,
        shipping_zone: shipping.zone.code,
        shipping_region: shipping.zone.island,
        subtotal,
        product_fee: sellerFeeTotal,
        seller_fee: sellerFeeTotal,
        seller_fee_rate: sellerFeeRate,
        platform_revenue: sellerFeeTotal,
        insurance_fee: insuranceFee,
        insurance_selected: insuranceSelected,
        shipping_fee: shippingFee,
        packing_type: packingType,
        packing_fee: packingFee,
        distance_km: shipping.distanceKm,
        shipping_breakdown: shipping,
        stock_decremented: false,
        total,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const orderItems = resolvedItems.map((i) => ({
    order_id: order.id,
    product_id: i.product_id || null,
    seller_id: i.seller_id || null,
    product_name: i.product_name || "Produk",
    product_image: i.product_image || null,
    price: Number(i.price || 0),
    qty: Number(i.qty || 1),
    subtotal: Number(i.subtotal || 0),
    seller_fee: Number(i.seller_fee || 0),
    seller_fee_rate: Number(i.seller_fee_rate || 0),
    seller_net: Number(i.seller_net || 0),
    seller_tenure_months: Number(i.seller_tenure_months || 0),
    seller_sold_qty: Number(i.seller_sold_qty || 0),
  }));

  let inserted;
  try {
    await prisma.orderItem.createMany({ data: orderItems });
    inserted = await prisma.orderItem.findMany({ where: { order_id: order.id }, orderBy: { created_at: "asc" } });
  } catch (err) {
    await prisma.order.delete({ where: { id: order.id } });
    return res.status(400).json({ error: err.message });
  }

  await ensureOrderTracking(order);

  res.status(201).json({
    order: mapOrder(order, inserted || []),
    fee: {
      seller_fee: sellerFeeTotal,
      seller_fee_rate: sellerFeeRate,
      shipping_zone: shipping.zone,
      shipping_breakdown: shipping,
    },
  });
});

/* ------------------------------------------------------------------ */
/* Pembayaran Midtrans (sandbox + simulasi lokal)                     */
/* ------------------------------------------------------------------ */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_ORIGIN || "http://localhost:3000";
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
const MIDTRANS_PRODUCTION = paymentPolicy.isLivePayment();
const MIDTRANS_SNAP_BASE = paymentPolicy.getSnapBase();

async function getOrderForUser(orderId, req) {
  if (!isUuid(orderId)) return { order: null, items: [] };
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { order: null, items: [] };
  const items = await prisma.orderItem.findMany({ where: { order_id: orderId }, orderBy: { created_at: "asc" } });
  const userId = req.user?.id;
  const isBuyer = Boolean(userId) && order.buyer_id === userId;
  const isSeller = Boolean(userId) && items.some((item) => item.seller_id === userId);
  const isAdmin = req.profile?.role === "admin";
  if (!isBuyer && !isSeller && !isAdmin) return { order: null, items: [] };
  return { order, items };
}

app.get("/api/orders/:id/tracking", requireUser, async (req, res) => {
  try {
    const { order, items } = await getOrderForUser(req.params.id, req);
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });

    await ensureOrderTracking(order);
    const events = await prisma.orderTracking.findMany({
      where: { order_id: order.id },
      orderBy: { created_at: "asc" },
    });

    res.json({
      order: mapOrder(order, items),
      events: events.map(serializeTracking),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/orders/:id/simulate-payment", requireUser, async (req, res) => {
  try {
    if (!paymentPolicy.allowSimulation()) {
      return res.status(403).json({ error: paymentPolicy.SIMULATION_DISABLED_MESSAGE });
    }
    const { order, items } = await getOrderForUser(req.params.id, req);
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (req.profile?.role !== "admin" && order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }
    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Pesanan sudah dibatalkan." });
    }

    const updated = await markOrderPaid(order, {
      paymentMode: "simulation",
      paymentStatus: "settlement",
      midtransOrderId: order.midtrans_order_id || order.order_number,
    });

    res.json({ order: mapOrder(updated, items), mode: "simulation" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/payments/create", requireUser, async (req, res) => {
  try {
    const orderId = String(req.body?.order_id || "");
    const { order, items } = await getOrderForUser(orderId, req);
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (req.profile?.role !== "admin" && order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }
    if (order.status !== "waiting_payment") {
      return res.status(400).json({ error: "Pesanan ini sudah tidak menunggu pembayaran." });
    }

    const midtransOrderId = order.midtrans_order_id || `${order.order_number}-${Date.now().toString().slice(-5)}`;

    if (!MIDTRANS_SERVER_KEY) {
      if (!paymentPolicy.allowSimulation()) {
        return res.status(503).json({
          error: "Kredensial Midtrans produksi belum dikonfigurasi. Pembayaran tidak dijatuhkan ke simulasi.",
        });
      }
      await prisma.order.update({
        where: { id: order.id },
        data: {
          payment_mode: "simulation",
          payment_status: "pending",
          midtrans_order_id: midtransOrderId,
          midtrans_token: `SIM-${midtransOrderId}`,
          midtrans_redirect_url: `${SITE_URL}/pembayaran?order=${order.id}`,
          updated_at: new Date(),
        },
      });
      return res.json({
        mode: "simulation",
        token: `SIM-${midtransOrderId}`,
        redirect_url: `${SITE_URL}/pembayaran?order=${order.id}`,
        client_key: "",
        message: "Kredensial Midtrans belum diatur. Pembayaran memakai simulasi sandbox lokal.",
      });
    }

    const feeLines = [];
    if (Number(order.shipping_fee || 0) > 0) {
      feeLines.push({ id: "ongkir", price: Number(order.shipping_fee), quantity: 1, name: `Ongkir - ${order.shipping_region || order.shipping_zone || "Indonesia"}` });
    }
    if (Number(order.insurance_fee || 0) > 0) {
      feeLines.push({ id: "asuransi", price: Number(order.insurance_fee), quantity: 1, name: "Asuransi pengiriman" });
    }
    if (Number(order.packing_fee || 0) > 0) {
      feeLines.push({ id: "packing", price: Number(order.packing_fee), quantity: 1, name: `Packing ${order.packing_type}` });
    }

    const payload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Number(order.total || 0),
      },
      item_details: [
        ...items.map((item, index) => ({
          id: item.product_id || `item-${index + 1}`,
          price: Number(item.price || 0),
          quantity: Number(item.qty || 1),
          name: String(item.product_name || "Produk").slice(0, 50),
        })),
        ...feeLines,
      ],
      customer_details: {
        first_name: req.profile?.full_name || req.profile?.username || "Pembeli",
        email: req.user.email || undefined,
        phone: req.profile?.phone || undefined,
      },
      callbacks: {
        finish: `${SITE_URL}/pembayaran/berhasil?order=${order.id}`,
      },
    };

    const response = await fetch(MIDTRANS_SNAP_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) {
      return res.status(502).json({ error: data.error_messages?.join(", ") || "Gagal membuat transaksi Midtrans." });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        payment_mode: "midtrans",
        payment_status: "pending",
        midtrans_order_id: midtransOrderId,
        midtrans_token: data.token,
        midtrans_redirect_url: data.redirect_url || null,
        updated_at: new Date(),
      },
    });

    res.json({
      mode: "midtrans",
      token: data.token,
      redirect_url: data.redirect_url || null,
      client_key: MIDTRANS_CLIENT_KEY,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/payments/midtrans/notification", async (req, res) => {
  try {
    const notification = req.body || {};
    const {
      order_id: notificationOrderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: paymentType,
    } = notification;

    if (!notificationOrderId) return res.status(400).json({ error: "order_id wajib diisi." });
    if (!MIDTRANS_SERVER_KEY) {
      return res
        .status(403)
        .json({ error: "Webhook Midtrans memerlukan kredensial server yang terkonfigurasi." });
    }
    if (
      !paymentPolicy.verifyMidtransSignature({
        orderId: notificationOrderId,
        statusCode,
        grossAmount,
        signatureKey,
        serverKey: MIDTRANS_SERVER_KEY,
      })
    ) {
      return res.status(401).json({ error: "Signature Midtrans tidak valid." });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ midtrans_order_id: notificationOrderId }, { order_number: notificationOrderId }],
      },
    });
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (!paymentPolicy.amountsMatch(order.total, grossAmount)) {
      return res
        .status(400)
        .json({ error: "Nominal notifikasi Midtrans tidak sesuai dengan total pesanan." });
    }

    if (["capture", "settlement"].includes(transactionStatus) && fraudStatus !== "deny") {
      const alreadySettled =
        ["paid", "shipped", "completed"].includes(order.status) &&
        ["settlement", "capture"].includes(String(order.payment_status || ""));
      if (alreadySettled) return res.json({ ok: true, duplicate: true });

      await markOrderPaid(order, {
        paymentMode: "midtrans",
        paymentStatus: transactionStatus,
        midtransOrderId: notificationOrderId,
      });
    } else if (["expire", "cancel", "deny", "failure"].includes(transactionStatus)) {
      const cancelledAt = new Date();
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          payment_status: transactionStatus === "expire" ? "expired" : "failed",
          ...(order.status === "waiting_payment" ? { status: "cancelled", cancelled_at: cancelledAt, cancel_reason: "Pembayaran tidak berhasil." } : {}),
          updated_at: cancelledAt,
        },
      });
      if (order.status === "waiting_payment") {
        const stockRestored = await restoreStockForOrder(updated);
        await ensureOrderTracking(stockRestored);
        await syncPlatformLedger(stockRestored, "cancelled");
      }
    } else if (transactionStatus === "pending") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          payment_status: "pending",
          payment_mode: "midtrans",
          payment_method: paymentType || order.payment_method,
          updated_at: new Date(),
        },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Ulasan produk                                                       */
/* ------------------------------------------------------------------ */

app.get("/api/reviews", optionalUser, async (req, res) => {
  try {
    const productId = req.query.productId ? String(req.query.productId) : null;
    const productName = req.query.productName ? String(req.query.productName) : null;
    const orderId = req.query.orderId ? String(req.query.orderId) : null;
    const sellerId = req.query.sellerId ? String(req.query.sellerId) : null;
    const where = {};
    if (orderId) where.order_id = orderId;

    if (sellerId) {
      const sellerProducts = await prisma.product.findMany({
        where: { seller_id: sellerId },
        select: { id: true, name: true },
      });
      const sellerConditions = [];
      if (sellerProducts.length) {
        sellerConditions.push({ product_id: { in: sellerProducts.map((p) => p.id) } });
        sellerConditions.push({ product_name: { in: sellerProducts.map((p) => p.name) } });
      }
      if (!sellerConditions.length) {
        return res.json({ reviews: [], summary: summarizeReviews([]) });
      }
      where.AND = [{ OR: sellerConditions }];
    }

    const hasProductFilter = Boolean(productId || productName);
    if (hasProductFilter) {
      const productIds = await matchCatalogProducts({ productId, productName });
      const conditions = [];
      if (productIds.length) conditions.push({ product_id: { in: productIds } });
      if (productName) conditions.push({ product_name: productName });
      if (!conditions.length) {
        return res.json({ reviews: [], summary: summarizeReviews([]) });
      }
      where.OR = conditions;
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 200,
    });

    res.json({
      reviews: reviews.map(mapReview),
      summary: summarizeReviews(reviews),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/reviews", requireUser, requireRole("buyer", "admin"), async (req, res) => {
  const body = req.body || {};
  const rating = Math.round(Number(body.rating));
  const orderId = body.order_id ? String(body.order_id) : "";
  const orderItemId = body.order_item_id ? String(body.order_item_id) : "";

  if (!orderId || !orderItemId) {
    return res.status(400).json({ error: "Pesanan dan produk yang diulas wajib diisi." });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating harus bernilai 1 sampai 5." });
  }

  try {
    const media = normalizeReviewMedia(body.media);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });

    if (req.profile?.role !== "admin" && order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    if (order.status !== "completed") {
      return res.status(400).json({
        error: "Ulasan hanya dapat diberikan setelah pesanan berstatus selesai.",
      });
    }

    const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!item || item.order_id !== order.id) {
      return res.status(404).json({ error: "Produk pada pesanan tidak ditemukan." });
    }

    const existing = await prisma.review.findFirst({ where: { order_item_id: item.id } });
    if (existing) {
      return res.status(400).json({ error: "Produk pada pesanan ini sudah diulas." });
    }

    const productIds = await matchCatalogProducts({
      productId: item.product_id,
      productName: item.product_name,
    });

    const reviewerName =
      req.profile?.full_name ||
      req.profile?.username ||
      String(req.user.email || "").split("@")[0] ||
      "Pembeli";

    const review = await prisma.review.create({
      data: {
        product_id: productIds[0] || item.product_id || null,
        product_name: item.product_name || "Produk",
        order_id: order.id,
        order_item_id: item.id,
        buyer_id: req.user.id,
        reviewer_name: reviewerName,
        rating,
        comment: String(body.comment || "").trim().slice(0, 2000) || null,
        ...(media.length ? { media } : {}),
      },
    });

    res.status(201).json({ review: mapReview(review) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Produk pada pesanan ini sudah diulas." });
    }
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Laporan                                                            */
/* ------------------------------------------------------------------ */

app.post("/api/reports", requireUser, requireRole("buyer", "admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.product_name && !body.product_id) {
    return res.status(400).json({ error: "Produk wajib diisi pada laporan." });
  }
  if (!body.reason) {
    return res.status(400).json({ error: "Alasan pelaporan wajib diisi." });
  }

  let sellerId = body.seller_id || null;
  let productName = body.product_name || null;
  let productImage = body.product_image || null;

  if (body.product_id) {
    const product = await prisma.product.findUnique({ where: { id: body.product_id } });
    if (product) {
      sellerId = sellerId || product.seller_id;
      productName = productName || product.name;
      productImage = productImage || product.image_url;
    }
  }

  if (!sellerId && productName) {
    const byName = await prisma.product.findFirst({ where: { name: productName } });
    if (byName) {
      sellerId = byName.seller_id;
      productImage = productImage || byName.image_url;
    }
  }

  try {
    const report = await prisma.report.create({
      data: {
        product_id: body.product_id || null,
        seller_id: sellerId,
        reporter_id: req.user.id,
        product_name: productName || "Produk",
        product_image: productImage,
        reason: body.reason,
        description: body.description || null,
        status: "pending",
      },
    });
    res.status(201).json({ report });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/reports", requireUser, async (req, res) => {
  const role = req.profile?.role;
  const where = {};
  if (req.query.status) where.status = String(req.query.status);
  if (role === "seller") where.seller_id = req.user.id;
  else if (role !== "admin") where.reporter_id = req.user.id;
  const reports = await prisma.report.findMany({ where, orderBy: { created_at: "desc" } });

  const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))];
  const profiles = reporterIds.length
    ? await prisma.profile.findMany({ where: { id: { in: reporterIds } }, select: { id: true, full_name: true } })
    : [];
  const nameById = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));

  res.json({
    reports: reports.map((r) => ({
      ...r,
      reporter: r.reporter_id ? nameById[r.reporter_id] || null : null,
    })),
  });
});

app.patch("/api/reports/:id", requireUser, async (req, res) => {
  const role = req.profile?.role;
  const body = req.body || {};
  const status = body.status;
  if (!["pending", "resolved", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "Status tidak valid." });
  }
  const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Laporan tidak ditemukan." });
  if (role !== "admin" && existing.seller_id !== req.user.id) {
    return res.status(403).json({ error: "Akses ditolak." });
  }
  try {
    const report = await prisma.report.update({ where: { id: req.params.id }, data: { status, updated_at: new Date() } });
    res.json({ report });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Rekening bank                                                      */
/* ------------------------------------------------------------------ */

app.get("/api/bank-accounts", requireUser, async (req, res) => {
  const accounts = await prisma.bankAccount.findMany({ where: { user_id: req.user.id }, orderBy: { created_at: "asc" } });
  res.json({ accounts });
});

app.post("/api/bank-accounts", requireUser, requireRole("buyer", "seller", "admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.bank_name || !body.account_name || !body.account_number) {
    return res.status(400).json({ error: "Nama bank, nama pemilik, dan nomor rekening wajib diisi." });
  }
  try {
    const account = await prisma.bankAccount.create({
      data: {
        user_id: req.user.id,
        type: body.type === "card" ? "card" : "account",
        bank_name: body.bank_name,
        account_name: body.account_name,
        account_number: body.account_number,
      },
    });
    res.status(201).json({ account });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/bank-accounts/:id", requireUser, async (req, res) => {
  const existing = await prisma.bankAccount.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.user_id !== req.user.id) {
    return res.status(404).json({ error: "Rekening tidak ditemukan." });
  }
  await prisma.bankAccount.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Percakapan & pesan                                                  */
/* ------------------------------------------------------------------ */

app.get("/api/conversations", requireUser, async (req, res) => {
  const me = { id: req.user.id, role: req.profile?.role };
  const where = me.role === "seller" ? { seller_id: me.id } : { buyer_id: me.id };
  const convos = await prisma.conversation.findMany({ where, orderBy: { updated_at: "desc" } });

  const conversations = [];
  for (const c of convos) {
    const otherId = c.buyer_id === me.id ? c.seller_id : c.buyer_id;
    const other = await prisma.profile.findUnique({ where: { id: otherId } });
    const otherDisplayName = other?.store_name || other?.full_name || "";
    const storeSlug =
      other?.role === "seller" && otherDisplayName ? slugify(otherDisplayName) : null;
    const last = await prisma.message.findFirst({ where: { conversation_id: c.id }, orderBy: { created_at: "desc" } });
    const lastReadAt = me.role === "seller" ? c.seller_last_read_at : c.buyer_last_read_at;
    const unread = await prisma.message.count({
      where: { conversation_id: c.id, created_at: { gt: lastReadAt }, sender_id: { not: me.id } },
    });
    const attachment = last?.attachment && typeof last.attachment === "object" ? last.attachment : null;
    conversations.push({
      id: c.id,
      other: {
        id: other?.id || otherId,
        name:
          me.role === "seller"
            ? other?.full_name || "Pembeli"
            : other?.store_name || other?.full_name || "Penjual",
        role: other?.role || "buyer",
        avatar_url: other?.avatar_url || null,
        store_slug: storeSlug,
      },
      last_message: last
        ? attachment?.type === "video"
          ? "Video"
          : attachment?.type === "image"
            ? "Foto"
            : last.text
        : "",
      from_me: last ? last.sender_id === me.id : false,
      unread: unread || 0,
      updated_at: c.updated_at,
    });
  }
  res.json({ conversations });
});

app.post("/api/conversations", requireUser, requireRole("buyer", "admin"), async (req, res) => {
  const sellerId = req.body?.seller_id;
  if (!sellerId) return res.status(400).json({ error: "Penjual wajib diisi." });
  if (sellerId === req.user.id) return res.status(400).json({ error: "Tidak dapat chat dengan diri sendiri." });

  let conversation = await prisma.conversation.findFirst({ where: { buyer_id: req.user.id, seller_id: sellerId } });
  if (!conversation) {
    conversation = await prisma.conversation.findFirst({ where: { buyer_id: sellerId, seller_id: req.user.id } });
  }
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({ data: { buyer_id: req.user.id, seller_id: sellerId } });
    } catch (err) {
      if (err.code === "P2002") {
        conversation = await prisma.conversation.findFirst({ where: { buyer_id: req.user.id, seller_id: sellerId } });
      }
      if (!conversation) return res.status(400).json({ error: err.message });
    }
  }
  res.json({ conversation });
});

app.get("/api/conversations/:id/messages", requireUser, async (req, res) => {
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!convo || (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id)) {
    return res.status(404).json({ error: "Percakapan tidak ditemukan." });
  }
  const messages = await prisma.message.findMany({
    where: { conversation_id: req.params.id },
    orderBy: { created_at: "asc" },
    take: 200,
  });
  if (req.profile?.role === "seller") {
    await prisma.conversation.update({ where: { id: req.params.id }, data: { seller_last_read_at: new Date() } });
  } else {
    await prisma.conversation.update({ where: { id: req.params.id }, data: { buyer_last_read_at: new Date() } });
  }
  res.json({ messages });
});

function normalizeAttachment(value) {
  if (!value || typeof value !== "object") return null;
  const type = ["image", "video"].includes(value.type) ? value.type : null;
  const url = String(value.url || "");
  if (!type || !/^https?:\/\//.test(url)) return null;
  return {
    type,
    url: url.slice(0, 2000),
    name: String(value.name || "").slice(0, 255),
    size: Number(value.size) || 0,
  };
}

app.post("/api/conversations/:id/messages", requireUser, async (req, res) => {
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!convo || (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id)) {
    return res.status(404).json({ error: "Percakapan tidak ditemukan." });
  }
  const body = req.body || {};
  const text = String(body.text || "").trim();
  const attachment = normalizeAttachment(body.attachment);
  if (!text && !attachment) return res.status(400).json({ error: "Pesan kosong." });
  try {
    const message = await prisma.message.create({
      data: { conversation_id: req.params.id, sender_id: req.user.id, text: text || null, attachment },
    });
    await prisma.conversation.update({ where: { id: req.params.id }, data: { updated_at: new Date() } });
    res.status(201).json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Keuangan seller & platform                                         */
/* ------------------------------------------------------------------ */

const MIN_WITHDRAWAL = 10000;

function serializeWithdrawal(row) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    amount: Number(row.amount || 0),
    status: row.status,
    bank_name: row.bank_name || null,
    account_name: row.account_name || null,
    account_number: row.account_number || null,
    note: row.note || null,
    requested_at: row.requested_at,
    processed_at: row.processed_at,
    created_at: row.created_at,
  };
}

function serializePlatformPayout(row) {
  return {
    id: row.id,
    recipient_id: row.recipient_id,
    recipient_role: row.recipient_role,
    amount: Number(row.amount || 0),
    status: row.status,
    note: row.note || null,
    created_by: row.created_by || null,
    created_at: row.created_at,
  };
}

async function platformPayoutTotal() {
  const agg = await prisma.platformPayout.aggregate({
    where: { status: "completed" },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount || 0);
}

app.get("/api/finance/seller", requireUser, requireRole("seller", "admin"), async (req, res) => {
  try {
    const sellerId = req.profile.role === "admin" && req.query.sellerId ? String(req.query.sellerId) : req.user.id;
    res.json(await finance.buildSellerFinance(sellerId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/finance/seller/withdrawals", requireUser, requireRole("seller"), async (req, res) => {
  try {
    const sellerId = req.user.id;
    const amount = Math.round(Number(req.body?.amount || 0));

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Nominal penarikan tidak valid." });
    }
    if (amount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        error: `Minimal penarikan Rp ${MIN_WITHDRAWAL.toLocaleString("id-ID")}.`,
      });
    }

    const financeData = await finance.buildSellerFinance(sellerId);
    if (financeData.summary.deficit > 0) {
      return res.status(400).json({
        error: `Saldo seller sedang minus ${financeData.summary.deficit.toLocaleString("id-ID")}. Penarikan baru diblokir sampai kekurangan tertutupi.`,
      });
    }
    if (amount > financeData.summary.availableBalance) {
      return res.status(400).json({ error: "Saldo aktif tidak mencukupi untuk penarikan ini." });
    }

    const bankAccountId = req.body?.bank_account_id ? String(req.body.bank_account_id) : "";
    let bank = null;
    if (bankAccountId) {
      bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank || bank.user_id !== sellerId) {
        return res.status(400).json({ error: "Rekening penarikan tidak ditemukan." });
      }
    }

    const bankName = (bank?.bank_name || String(req.body?.bank_name || "")).trim();
    const accountName = (bank?.account_name || String(req.body?.account_name || "")).trim();
    const accountNumber = (bank?.account_number || String(req.body?.account_number || "")).trim();
    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({ error: "Lengkapi nama bank, nama pemilik, dan nomor rekening." });
    }

    if (!bank) {
      const existing = await prisma.bankAccount.findFirst({
        where: { user_id: sellerId, bank_name: bankName, account_number: accountNumber },
      });
      if (!existing) {
        await prisma.bankAccount.create({
          data: {
            user_id: sellerId,
            type: "account",
            bank_name: bankName,
            account_name: accountName,
            account_number: accountNumber,
          },
        });
      }
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        seller_id: sellerId,
        amount,
        status: "pending",
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        note: req.body?.note ? String(req.body.note).slice(0, 500) : null,
      },
    });

    const updated = await finance.buildSellerFinance(sellerId);
    res.status(201).json({
      withdrawal: serializeWithdrawal(withdrawal),
      summary: updated.summary,
      withdrawals: updated.withdrawals,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/finance/admin", requireUser, requireRole("admin"), async (_req, res) => {
  try {
    res.json(await finance.buildAdminFinance());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/finance/admin/withdrawals/:id", requireUser, requireRole("admin"), async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim();
    const allowed = ["pending", "processing", "completed", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Status penarikan tidak valid." });
    }

    const existing = await prisma.withdrawal.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Permintaan penarikan tidak ditemukan." });
    }
    if (existing.status === "completed" || existing.status === "rejected") {
      return res.status(400).json({ error: "Penarikan ini sudah final dan tidak bisa diubah." });
    }
    if (status === "completed") {
      const financeData = await finance.buildSellerFinance(existing.seller_id);
      const otherHolds = await prisma.withdrawal.aggregate({
        where: {
          seller_id: existing.seller_id,
          status: { in: ["pending", "processing"] },
          id: { not: existing.id },
        },
        _sum: { amount: true },
      });
      const baseBalance = financeData.summary.sellerBalanceRaw + financeData.summary.pendingWithdrawal;
      const usable = baseBalance - Number(otherHolds._sum.amount || 0);
      if (usable < 0 || Number(existing.amount) > usable) {
        return res.status(400).json({ error: "Saldo seller tidak mencukupi untuk mencairkan penarikan ini." });
      }
    }

    const updated = await prisma.withdrawal.update({
      where: { id: existing.id },
      data: {
        status,
        processed_at: status === "completed" || status === "rejected" ? new Date() : existing.processed_at,
        note: req.body?.note ? String(req.body.note).slice(0, 500) : existing.note,
      },
    });

    const seller = await prisma.profile.findUnique({
      where: { id: existing.seller_id },
      select: { full_name: true, store_name: true },
    });

    res.json({
      withdrawal: {
        ...serializeWithdrawal(updated),
        seller_name: seller?.store_name || seller?.full_name || "Seller",
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/finance/admin/payout-recipients", requireUser, requireRole("admin"), async (req, res) => {
  try {
    const role = req.query.role === "seller" ? "seller" : "buyer";
    const q = String(req.query.q || "").trim();
    const where = { role };
    if (q) {
      where.OR = [
        { full_name: { contains: q } },
        { store_name: { contains: q } },
      ];
    }
    const rows = await prisma.profile.findMany({
      where,
      select: { id: true, role: true, full_name: true, store_name: true },
      orderBy: { full_name: "asc" },
      take: 30,
    });
    res.json({
      recipients: rows.map((row) => ({
        id: row.id,
        role: row.role,
        name: row.store_name || row.full_name || "User",
      })),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/finance/admin/payouts", requireUser, requireRole("admin"), async (req, res) => {
  try {
    const recipientId = String(req.body?.recipient_id || "");
    const amount = Math.round(Number(req.body?.amount || 0));

    if (!recipientId) {
      return res.status(400).json({ error: "Pilih penerima dana terlebih dahulu." });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Nominal penyaluran tidak valid." });
    }

    const recipient = await prisma.profile.findUnique({
      where: { id: recipientId },
      select: { id: true, role: true, full_name: true, store_name: true },
    });
    if (!recipient || !["seller", "buyer"].includes(recipient.role)) {
      return res.status(400).json({ error: "Penerima dana tidak ditemukan." });
    }

    const snapshot = await finance.buildPlatformFinance();
    const totalRevenue = snapshot.summary.fee;
    const totalPayouts = snapshot.summary.platformPayouts;
    const available = Math.max(0, totalRevenue - totalPayouts);
    if (amount > available) {
      return res.status(400).json({ error: "Saldo pendapatan platform tidak mencukupi untuk penyaluran ini." });
    }

    const payout = await prisma.platformPayout.create({
      data: {
        recipient_id: recipient.id,
        recipient_role: recipient.role,
        amount,
        status: "completed",
        note: req.body?.note ? String(req.body.note).slice(0, 500) : null,
        created_by: req.user.id,
      },
    });

    res.status(201).json({
      payout: {
        ...serializePlatformPayout(payout),
        recipient_name: recipient.store_name || recipient.full_name || "User",
      },
      availablePlatformBalance: available - amount,
      totalPlatformPayouts: totalPayouts + amount,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/finance/payouts", requireUser, async (req, res) => {
  try {
    const payouts = await prisma.platformPayout.findMany({
      where: { recipient_id: req.user.id },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    res.json({ payouts: payouts.map(serializePlatformPayout) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

app.get("/api/dashboard/admin", requireUser, requireRole("admin"), async (_req, res) => {
  try {
    res.json(await finance.buildAdminDashboard());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/dashboard/seller", requireUser, requireRole("seller", "admin"), async (req, res) => {
  try {
    const sellerId = req.profile.role === "admin" && req.query.sellerId ? String(req.query.sellerId) : req.user.id;
    res.json(await finance.buildSellerDashboard(sellerId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message || "Kesalahan server." });
});

app.listen(port, () => {
  console.log(`ElektroMart API berjalan di http://localhost:${port}`);
  void ensureDefaultCategories();
  void backfillOrderItemSellers();
});