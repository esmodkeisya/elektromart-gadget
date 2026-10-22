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

const app = express();
const port = Number(process.env.PORT || 4000);
const apiBaseUrl = process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://localhost:${port}`;

function normalizeOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set([...normalizeOrigins(process.env.CLIENT_ORIGIN), "http://localhost:3000"]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      try {
        const hostname = new URL(origin).hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1" || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
      } catch {
        /* fallthrough */
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
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    tracking_number: row.tracking_number,
    shipping_deadline: row.shipping_deadline,
    cancel_reason: row.cancel_reason,
    subtotal: Number(row.subtotal || 0),
    product_fee: Number(row.product_fee || 0),
    insurance_fee: Number(row.insurance_fee || 0),
    shipping_fee: Number(row.shipping_fee || 0),
    total: Number(row.total || 0),
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
    })),
  };
}

function orderNumber() {
  return "EM-" + Date.now().toString().slice(-9) + Math.floor(Math.random() * 90 + 10);
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
        update: category,
        create: category,
      });
    }
  } catch (err) {
    console.warn("Gagal sinkron kategori default:", err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Upload (pengganti Supabase Storage)                                 */
/* ------------------------------------------------------------------ */

const uploadRoot = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadRoot, { recursive: true });
const ALLOWED_BUCKETS = ["avatars", "products", "chat-files"];

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
/* Auth lokal (pengganti Supabase Auth)                                */
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
/* Profiles (dipakai shim supabase.from("profiles"))                   */
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
/* Produk                                                              */
/* ------------------------------------------------------------------ */

app.get("/api/products", optionalUser, async (req, res) => {
  const where = {};
  if (req.profile?.role === "seller" && req.query.catalog !== "1") where.seller_id = req.user.id;
  if (req.query.sellerId) where.seller_id = String(req.query.sellerId);
  const products = await prisma.product.findMany({ where, orderBy: { created_at: "desc" } });
  res.json({ products: products.map(mapProduct) });
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
  if (body.stock !== undefined) {
    payload.stock = Number(body.stock);
    if (!body.status) payload.status = payload.stock <= 0 ? "out_of_stock" : existing.status === "draft" ? "draft" : "active";
  }
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: payload });
    res.json({ product: mapProduct(product) });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Produk dengan nama ini sudah ada di toko Anda." });
    res.status(400).json({ error: err.message });
  }
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
  const products = await prisma.product.findMany({ select: { seller_id: true, status: true } });
  const countBySeller = {};
  const activeBySeller = {};
  products.forEach((p) => {
    countBySeller[p.seller_id] = (countBySeller[p.seller_id] || 0) + 1;
    if (p.status === "active") activeBySeller[p.seller_id] = (activeBySeller[p.seller_id] || 0) + 1;
  });

  res.json({
    stores: stores.map((s) => ({
      ...s,
      email: emailById[s.id] || null,
      product_count: countBySeller[s.id] || 0,
      active_product_count: activeBySeller[s.id] || 0,
      rating: 4.8,
      verified: s.seller_status === "verified",
    })),
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

    res.json({
      orders: orders.map((o) => {
        const mapped = mapOrder(o, byOrder[o.id] || []);
        if (role !== "buyer") mapped.buyer = buyers[o.buyer_id] || null;
        mapped.items = (mapped.items || []).map((it) => {
          const p = it.product_id ? productMap[it.product_id] : null;
          return { ...it, product_stock: p ? Number(p.stock || 0) : null, product_status: p ? p.status : null };
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
      if (!orderIds.length) return res.json({ notifications: [] });
    }

    const where = { status: "completed", completed_at: { not: null } };
    if (orderIds) where.id = { in: orderIds };

    const orders = await prisma.order.findMany({
      where,
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

    res.json({
      notifications: orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        total: Number(o.total || 0),
        completed_at: o.completed_at,
        buyer_name: nameById[o.buyer_id] || null,
      })),
    });
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
      const allowed = {
        buyer: ["paid", "completed", "cancelled"],
        seller: ["paid", "shipped", "cancelled"],
        admin: ORDER_STATUSES,
      };
      if (role !== "admin" && !allowed[role]?.includes(nextStatus)) {
        return res.status(403).json({ error: "Anda tidak dapat mengubah ke status ini." });
      }
      if (nextStatus !== order.status) {
        data.status = nextStatus;
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

    const updated = await prisma.order.update({ where: { id }, data });

    if (willCancel) {
      for (const item of orderItems) {
        if (item.product_id) {
          void (async () => {
            try {
              const current = await prisma.product.findUnique({ where: { id: item.product_id }, select: { stock: true } });
              if (current) {
                await prisma.product.update({
                  where: { id: item.product_id },
                  data: { stock: Number(current.stock || 0) + Number(item.qty || 0), updated_at: new Date() },
                });
              }
            } catch {
              /* abaikan */
            }
          })();
        }
      }
    }

    res.json({ order: mapOrder(updated, orderItems) });
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

  const subtotal = Number(body.subtotal || 0);
  const productFee = Number(body.product_fee || 0);
  const insuranceFee = Number(body.insurance_fee || 0);
  const shippingFee = Number(body.shipping_fee || 0);
  const courier = body.courier || "";
  const total = Number(body.total || subtotal + productFee + insuranceFee + shippingFee);

  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      if (isUuid(item.product_id)) return { ...item, product_id: item.product_id };
      if (!item.product_name && !item.name) return { ...item, product_id: null };
      const product = await prisma.product.findFirst({
        where: { name: item.product_name || item.name },
        select: { id: true, seller_id: true },
      });
      return {
        ...item,
        product_id: product?.id || null,
        seller_id: item.seller_id || product?.seller_id || null,
      };
    })
  );

  let order;
  try {
    order = await prisma.order.create({
      data: {
        buyer_id: req.user.id,
        order_number: orderNumber(),
        status: body.status || "waiting_payment",
        payment_method: body.payment_method,
        payment_group: body.payment_group || "bank",
        courier,
        shipping_address: body.address,
        subtotal,
        product_fee: productFee,
        insurance_fee: insuranceFee,
        shipping_fee: shippingFee,
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
    product_name: i.product_name || i.name || "Produk",
    product_image: i.product_image || i.image || null,
    price: Number(i.price || 0),
    qty: Number(i.qty || 1),
    subtotal: Number(i.price || 0) * Number(i.qty || 1),
  }));

  let inserted;
  try {
    await prisma.orderItem.createMany({ data: orderItems });
    inserted = await prisma.orderItem.findMany({ where: { order_id: order.id }, orderBy: { created_at: "asc" } });
  } catch (err) {
    await prisma.order.delete({ where: { id: order.id } });
    return res.status(400).json({ error: err.message });
  }

  for (const i of resolvedItems) {
    if (i.product_id) {
      void (async () => {
        try {
          const current = await prisma.product.findUnique({ where: { id: i.product_id }, select: { stock: true } });
          if (current) {
            await prisma.product.update({
              where: { id: i.product_id },
              data: { stock: Math.max(0, Number(current.stock || 0) - Number(i.qty || 1)), updated_at: new Date() },
            });
          }
        } catch {
          /* abaikan */
        }
      })();
    }
  }

  res.status(201).json({ order: mapOrder(order, inserted || []) });
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

app.post("/api/bank-accounts", requireUser, requireRole("buyer", "admin"), async (req, res) => {
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
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

app.get("/api/dashboard/admin", requireUser, requireRole("admin"), async (_req, res) => {
  const [sellers, buyers, products, categoryRows, productRows, sellerRows] = await Promise.all([
    prisma.profile.count({ where: { role: "seller" } }),
    prisma.profile.count({ where: { role: "buyer" } }),
    prisma.product.count(),
    prisma.category.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({
      select: { id: true, name: true, stock: true, category: true, price: true, status: true, seller_id: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.profile.findMany({ where: { role: "seller" }, select: { id: true, full_name: true, store_name: true, role: true } }),
  ]);

  const productsList = productRows;
  const categories = categoryRows.map((category) => {
    const related = productsList.filter((product) => product.category === category.name || product.category === category.slug);
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      color: category.color || "#94a3b8",
      icon: category.icon,
      product_count: related.length,
      stock_total: related.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    };
  });

  const topProducts = [...productsList]
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      stock: Number(product.stock || 0),
      category: product.category,
    }));

  const countBySeller = {};
  productsList.forEach((product) => {
    if (product.seller_id) countBySeller[product.seller_id] = (countBySeller[product.seller_id] || 0) + 1;
  });
  const topSellers = sellerRows
    .map((seller) => ({
      id: seller.id,
      name: seller.store_name || seller.full_name || "Seller",
      products: countBySeller[seller.id] || 0,
    }))
    .sort((a, b) => b.products - a.products)
    .slice(0, 5);

  const ordersList = await prisma.order.findMany({
    select: {
      id: true, buyer_id: true, order_number: true, status: true, payment_method: true, payment_group: true,
      courier: true, shipping_address: true, subtotal: true, product_fee: true, insurance_fee: true,
      shipping_fee: true, total: true, created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });
  const paidStatuses = ["paid", "shipped", "completed"];
  const revenueOrders = ordersList.filter((o) => paidStatuses.includes(o.status));
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const commissionRevenue = revenueOrders.reduce((sum, o) => sum + Number(o.product_fee || 0), 0);
  const now = new Date();
  const ordersThisMonth = ordersList.filter(
    (o) => o.created_at && new Date(o.created_at).getMonth() === now.getMonth() && new Date(o.created_at).getFullYear() === now.getFullYear()
  );
  const escrowHeldFunds = ordersList
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalPayoutToSellers = totalRevenue - commissionRevenue;

  const paymentCounts = {};
  ordersList.forEach((o) => {
    const key = o.payment_method || o.payment_group || "Lainnya";
    paymentCounts[key] = (paymentCounts[key] || 0) + 1;
  });
  const paymentMethods = Object.entries(paymentCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  res.json({
    stats: { sellers, buyers, products, categories: categories.length },
    categories,
    products: topProducts,
    sellers: topSellers,
    orders: {
      total: ordersList.length,
      thisMonth: ordersThisMonth.length,
      totalRevenue,
      commissionRevenue,
      escrowHeldFunds,
      totalPayoutToSellers,
      revenueOrders: revenueOrders.length,
    },
    paymentMethods,
  });
});

app.get("/api/dashboard/seller", requireUser, requireRole("seller", "admin"), async (req, res) => {
  const sellerId = req.profile.role === "admin" && req.query.sellerId ? String(req.query.sellerId) : req.user.id;
  const products = await prisma.product.findMany({ where: { seller_id: sellerId } });

  const sellerItems = await prisma.orderItem.findMany({ where: { seller_id: sellerId }, select: { order_id: true, subtotal: true } });
  const orderIds = [...new Set(sellerItems.map((i) => i.order_id))];

  let revenue = 0;
  let activeOrders = 0;
  let totalOrders = 0;
  let orderMap = {};

  if (orderIds.length) {
    const sellerOrderRows = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, status: true, created_at: true },
    });
    orderMap = Object.fromEntries(sellerOrderRows.map((o) => [o.id, o]));
    const activeStats = new Set();
    sellerItems.forEach((i) => {
      const order = orderMap[i.order_id];
      if (!order) return;
      totalOrders += 1;
      if (["paid", "shipped", "completed"].includes(order.status)) {
        revenue += Number(i.subtotal || 0);
      }
      if (["waiting_payment", "paid", "shipped"].includes(order.status)) {
        activeStats.add(order.id);
      }
    });
    activeOrders = activeStats.size;
  }

  const sorted = [...products].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
  const recentProducts = sorted.slice(0, 5).map((p) => ({
    id: p.id,
    name: p.name,
    stock: Number(p.stock || 0),
    price: Number(p.price || 0),
    status: p.status,
    category: p.category,
    image_url: p.image_url,
  }));

  const weekdayMeta = [
    { day: "Min", key: "seller.daySun" },
    { day: "Sen", key: "seller.dayMon" },
    { day: "Sel", key: "seller.dayTue" },
    { day: "Rab", key: "seller.dayWed" },
    { day: "Kam", key: "seller.dayThu" },
    { day: "Jum", key: "seller.dayFri" },
    { day: "Sab", key: "seller.daySat" },
  ];
  const weekly = weekdayMeta.map((w) => ({ ...w, value: 0 }));
  const nowRef = new Date();
  sellerItems.forEach((i) => {
    const order = orderMap[i.order_id];
    if (!order || !order.created_at) return;
    const d = new Date(order.created_at);
    if (nowRef.getTime() - d.getTime() >= 0 && nowRef.getTime() - d.getTime() <= 7 * 24 * 3600 * 1000) {
      weekly[d.getDay()].value += Number(i.subtotal || 0);
    }
  });

  res.json({
    stats: {
      products: products.length,
      active: products.filter((p) => p.status === "active").length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
      outOfStock: products.filter((p) => p.stock <= 0 || p.status === "out_of_stock").length,
      totalRevenue: revenue,
      totalOrders,
      activeOrders,
    },
    recentProducts,
    weekly,
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message || "Kesalahan server." });
});

app.listen(port, () => {
  console.log(`ElektroMart API berjalan di http://localhost:${port}`);
  void ensureDefaultCategories();
});
