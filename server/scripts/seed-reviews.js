/*
 * Ulasan contoh anonim tidak dipakai lagi. Script ini hanya membuat ulasan
 * Asep Mulyadi untuk produk yang benar-benar ia beli (pesanan completed) di
 * Jaya store, maksimal satu ulasan per produk, dan hanya untuk produk yang
 * masih aktif serta memiliki penjualan valid yang tampil di profil toko.
 *
 * Jalankan dari folder server: npm run seed:reviews
 * Aman dijalankan berulang kali (idempoten).
 */

const { prisma } = require("../src/prisma");
const finance = require("../src/finance");

const ASEP_EMAIL = "secretbaik010@gmail.com";
const STORE_NAME = "Jaya store";

const REVIEW_CONTENT = {
  "samsung galaxy s24 ultra 12/512gb": {
    rating: 5,
    comment: "Barang original, kamera jernih banget. Pengiriman cepat!",
  },
  "xiaomi 14t pro 12/512gb hyperos": {
    rating: 5,
    comment: "Charging 120W gila cepat. Kamera Leica ok banget.",
  },
  "jbl charge 5 portable speaker": {
    rating: 5,
    comment: "Bass-nya tebel, tahan air beneran. Dipakai sehari-hari aman.",
  },
  "playstation 5 slim 1tb + 2 controller": {
    rating: 5,
    comment: "Paket lengkap, 2 stik langsung main. Mantap!",
  },
  "sony wh-1000xm5 wireless noise": {
    rating: 5,
    comment: "ANC-nya the best! Nyaman dipakai seharian.",
  },
  "iphone 15 pro max 256gb natural titanium": {
    rating: 5,
    comment: "iPhone original, seal masih utuh. Seller responsif.",
  },
  "nubia redmagic 11 pro": {
    rating: 5,
    comment: "HP gaming kencang dan pengiriman aman. Sesuai deskripsi.",
  },
};

const FALLBACK_REVIEW = {
  rating: 5,
  comment: "Barang sesuai pesanan, kualitas bagus dan pengiriman aman.",
};

const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: ASEP_EMAIL },
    select: { id: true, email: true },
  });
  if (!user) throw new Error(`Akun pembeli ${ASEP_EMAIL} tidak ditemukan.`);

  const buyer = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, full_name: true, username: true },
  });
  if (!buyer) throw new Error("Profil pembeli tidak ditemukan.");
  const reviewerName = buyer.full_name || buyer.username || "Asep Mulyadi";

  const sellers = await prisma.profile.findMany({
    where: { role: "seller" },
    select: { id: true, store_name: true, full_name: true },
  });
  const store = sellers.find(
    (s) => normalize(s.store_name || s.full_name) === normalize(STORE_NAME)
  );
  if (!store) throw new Error(`Toko ${STORE_NAME} tidak ditemukan.`);

  // Hanya produk dengan penjualan valid yang memang tampil di profil toko.
  const snapshot = await finance.buildPlatformFinance();
  const soldRows = snapshot.topProducts.filter((row) => Number(row.units_sold) > 0);
  const soldIds = new Set(soldRows.map((row) => row.id).filter(Boolean));
  const soldNames = new Set(soldRows.map((row) => normalize(row.name)));
  const products = await prisma.product.findMany({
    where: { seller_id: store.id, status: "active" },
    select: { id: true, name: true },
  });
  const soldProducts = products.filter(
    (product) => soldIds.has(product.id) || soldNames.has(normalize(product.name))
  );

  // Ulasan hanya boleh berasal dari pesanan selesai milik Asep di toko ini.
  const completedOrders = await prisma.order.findMany({
    where: { buyer_id: user.id, status: "completed" },
    select: { id: true },
  });
  const orderIds = completedOrders.map((order) => order.id);
  const items = orderIds.length
    ? await prisma.orderItem.findMany({
        where: { order_id: { in: orderIds } },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          order_id: true,
          product_id: true,
          product_name: true,
          seller_id: true,
        },
      })
    : [];

  const selections = [];
  const seenProducts = new Set();
  for (const item of items) {
    if (item.seller_id && item.seller_id !== store.id) continue;
    const product = soldProducts.find(
      (p) =>
        (item.product_id && p.id === item.product_id) ||
        normalize(p.name) === normalize(item.product_name)
    );
    if (!product || seenProducts.has(product.id)) continue;
    seenProducts.add(product.id);
    selections.push({ product, item });
  }

  // Ulasan contoh lama tidak punya pembeli; hapus semuanya.
  const legacyRemoved = await prisma.review.deleteMany({
    where: { buyer_id: null, order_item_id: null },
  });

  // Asep hanya boleh punya satu ulasan per produk, pada item yang masih valid.
  const asepReviews = await prisma.review.findMany({
    where: { buyer_id: user.id },
    select: { id: true, product_id: true, order_item_id: true },
  });
  const validItemIds = new Set(selections.map((selection) => selection.item.id));
  const obsolete = asepReviews.filter(
    (review) => !review.order_item_id || !validItemIds.has(review.order_item_id)
  );
  for (const review of obsolete) {
    await prisma.review.delete({ where: { id: review.id } });
  }

  const remaining = asepReviews.filter((review) => !obsolete.includes(review));
  const byProduct = new Map();
  for (const review of remaining) {
    const key = review.product_id || "tanpa-produk";
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(review);
  }
  let duplicatesRemoved = 0;
  for (const rows of byProduct.values()) {
    for (const review of rows.slice(1)) {
      await prisma.review.delete({ where: { id: review.id } });
      duplicatesRemoved += 1;
    }
  }

  let inserted = 0;
  let skipped = 0;
  for (const { product, item } of selections) {
    const existing = await prisma.review.findFirst({ where: { order_item_id: item.id } });
    if (existing) {
      skipped += 1;
      continue;
    }
    const content = REVIEW_CONTENT[normalize(product.name)] || FALLBACK_REVIEW;
    const now = new Date();
    await prisma.review.create({
      data: {
        product_id: product.id,
        product_name: product.name,
        order_id: item.order_id,
        order_item_id: item.id,
        buyer_id: user.id,
        reviewer_name: reviewerName,
        rating: content.rating,
        comment: content.comment,
        created_at: now,
        updated_at: now,
      },
    });
    inserted += 1;
  }

  console.log(`Ulasan contoh dihapus: ${legacyRemoved.count}.`);
  console.log(`Ulasan Asep tidak relevan dihapus: ${obsolete.length}. Duplikat dihapus: ${duplicatesRemoved}.`);
  console.log(`Ulasan baru: ${inserted}, sudah ada: ${skipped}.`);
  selections.forEach(({ product }) => console.log(`- ${product.name}`));
}

main()
  .catch((err) => {
    console.error("Gagal menyiapkan ulasan:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
