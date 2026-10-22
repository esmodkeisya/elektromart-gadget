/*
 * Import server/prisma/supabase-export.json ke MySQL (db_elektromart) via Prisma.
 * Jalankan dari folder server:  npm run import:mysql
 * Idempotent: tabel dibersihkan dulu lalu diisi ulang.
 *
 * Catatan password: hash password Supabase tidak bisa diekspor, jadi semua user
 * yang dimigrasi diberi password default di bawah ini (harap diganti setelah login).
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "password123";

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toInt = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const toJson = (value) => (value === undefined ? null : value);

async function main() {
  const file = path.resolve(__dirname, "../prisma/supabase-export.json");
  if (!fs.existsSync(file)) {
    console.error(`File export tidak ditemukan: ${file}\nJalankan dulu: npm run export:supabase`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log("Membersihkan tabel...");
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.report.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shippingAddress.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Users
  const users = (data.users || []).filter((u) => u && u.id && u.email);
  if (users.length) {
    await prisma.user.createMany({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone || null,
        password_hash: passwordHash,
        user_metadata: toJson(u.user_metadata || {}),
        created_at: toDate(u.created_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`users: ${users.length}`);

  const userIds = new Set(users.map((u) => u.id));

  // 2. Profiles
  const profiles = (data.profiles || []).filter((p) => p && p.id);
  if (profiles.length) {
    await prisma.profile.createMany({
      data: profiles.map((p) => ({
        id: p.id,
        role: ["buyer", "seller", "admin"].includes(p.role) ? p.role : "buyer",
        job_title: p.job_title ?? null,
        full_name: p.full_name ?? null,
        username: p.username ?? null,
        store_name: p.store_name ?? null,
        phone: p.phone ?? null,
        store_address: p.store_address ?? null,
        avatar_url: p.avatar_url ?? null,
        created_at: toDate(p.created_at) || new Date(),
        updated_at: toDate(p.updated_at) || new Date(),
        date_of_birth: toDate(p.date_of_birth),
        gender: p.gender ?? null,
        bio: p.bio ?? null,
        account_status: p.account_status ?? "active",
        seller_status: p.seller_status ?? null,
        store_description: p.store_description ?? null,
        store_banner_url: p.store_banner_url ?? null,
        operating_hours: toJson(p.operating_hours),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`profiles: ${profiles.length}`);

  // 3. Categories
  const categories = (data.categories || []).filter((c) => c && c.slug);
  if (categories.length) {
    await prisma.category.createMany({
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        color: c.color ?? "#1a3fd6",
        icon: c.icon ?? null,
        sort_order: toInt(c.sort_order),
        subcategories: toJson(c.subcategories || []),
        attributes: toJson(c.attributes || []),
        created_at: toDate(c.created_at) || new Date(),
        updated_at: toDate(c.updated_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`categories: ${categories.length}`);

  // 4. Products (lewati bila seller-nya tidak ada)
  const products = (data.products || []).filter((p) => p && p.id && p.seller_id && userIds.has(p.seller_id));
  const skippedProducts = (data.products || []).length - products.length;
  if (products.length) {
    await prisma.product.createMany({
      data: products.map((p) => ({
        id: p.id,
        seller_id: p.seller_id,
        name: p.name,
        sku: p.sku ?? null,
        category: p.category ?? null,
        description: p.description ?? null,
        price: toInt(p.price),
        stock: toInt(p.stock),
        status: p.status || "active",
        image_url: p.image_url ?? null,
        images: toJson(p.images),
        created_at: toDate(p.created_at) || new Date(),
        updated_at: toDate(p.updated_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`products: ${products.length}${skippedProducts ? ` (${skippedProducts} dilewati: seller tidak ada)` : ""}`);

  // 5. Orders
  const orders = (data.orders || []).filter((o) => o && o.id && o.buyer_id && userIds.has(o.buyer_id));
  if (orders.length) {
    await prisma.order.createMany({
      data: orders.map((o) => ({
        id: o.id,
        buyer_id: o.buyer_id,
        order_number: o.order_number,
        status: o.status || "waiting_payment",
        payment_method: o.payment_method ?? null,
        payment_group: o.payment_group ?? null,
        courier: o.courier ?? null,
        shipping_address: toJson(o.shipping_address),
        subtotal: toInt(o.subtotal),
        product_fee: toInt(o.product_fee),
        insurance_fee: toInt(o.insurance_fee),
        shipping_fee: toInt(o.shipping_fee),
        total: toInt(o.total),
        created_at: toDate(o.created_at) || new Date(),
        updated_at: toDate(o.updated_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  const orderIds = new Set(orders.map((o) => o.id));
  console.log(`orders: ${orders.length}`);

  // 6. Order items
  const items = (data.order_items || []).filter((i) => i && i.id && i.order_id && orderIds.has(i.order_id));
  if (items.length) {
    await prisma.orderItem.createMany({
      data: items.map((i) => ({
        id: i.id,
        order_id: i.order_id,
        product_id: i.product_id ?? null,
        seller_id: i.seller_id ?? null,
        product_name: i.product_name || "Produk",
        product_image: i.product_image ?? null,
        price: toInt(i.price),
        qty: toInt(i.qty) || 1,
        subtotal: toInt(i.subtotal),
        created_at: toDate(i.created_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`order_items: ${items.length}`);

  // 7. Bank accounts
  const banks = (data.bank_accounts || []).filter((b) => b && b.user_id && userIds.has(b.user_id));
  if (banks.length) {
    await prisma.bankAccount.createMany({
      data: banks.map((b) => ({
        id: b.id,
        user_id: b.user_id,
        type: b.type || "account",
        bank_name: b.bank_name,
        account_name: b.account_name,
        account_number: b.account_number,
        created_at: toDate(b.created_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`bank_accounts: ${banks.length}`);

  // 8. Reports
  const reports = (data.reports || []).filter((r) => r && r.id);
  if (reports.length) {
    await prisma.report.createMany({
      data: reports.map((r) => ({
        id: r.id,
        product_id: r.product_id ?? null,
        seller_id: r.seller_id ?? null,
        reporter_id: r.reporter_id ?? null,
        product_name: r.product_name || "Produk",
        product_image: r.product_image ?? null,
        reason: r.reason || "-",
        description: r.description ?? null,
        status: r.status || "pending",
        created_at: toDate(r.created_at) || new Date(),
        updated_at: toDate(r.updated_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`reports: ${reports.length}`);

  // 9. Conversations
  const convos = (data.conversations || []).filter(
    (c) => c && c.id && userIds.has(c.buyer_id) && userIds.has(c.seller_id)
  );
  if (convos.length) {
    await prisma.conversation.createMany({
      data: convos.map((c) => ({
        id: c.id,
        buyer_id: c.buyer_id,
        seller_id: c.seller_id,
        buyer_last_read_at: toDate(c.buyer_last_read_at) || new Date(),
        seller_last_read_at: toDate(c.seller_last_read_at) || new Date(),
        created_at: toDate(c.created_at) || new Date(),
        updated_at: toDate(c.updated_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  const convoIds = new Set(convos.map((c) => c.id));
  console.log(`conversations: ${convos.length}`);

  // 10. Messages
  const messages = (data.messages || []).filter(
    (m) => m && m.id && m.conversation_id && convoIds.has(m.conversation_id)
  );
  if (messages.length) {
    await prisma.message.createMany({
      data: messages.map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        text: m.text ?? null,
        attachment: toJson(m.attachment),
        created_at: toDate(m.created_at) || new Date(),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`messages: ${messages.length}`);

  console.log("\n=== Import selesai ===");
  console.log(`Login untuk ${users.length} user memakai password default: ${DEFAULT_PASSWORD}`);
  for (const u of users) console.log(`  - ${u.email}`);
}

main()
  .catch((err) => {
    console.error("Import gagal:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
