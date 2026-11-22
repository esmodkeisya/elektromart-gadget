// Hapus pesanan contoh DEMO-0001..0003 beserta data terkait dan kembalikan stok.
// Idempoten, punya --dry-run, mencadangkan tabel terkait, dan menghapus dalam satu transaksi.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { prisma } = require("../src/prisma");
const { isDryRun, rupiah, backupTables } = require("./finance-migration-utils.cjs");

const n = (v) => Number(v || 0);

async function main() {
  const dryRun = isDryRun();
  console.log(`=== Hapus pesanan DEMO-* (${dryRun ? "DRY RUN" : "EKSEKUSI"}) ===`);

  const orders = await prisma.order.findMany({
    where: { order_number: { startsWith: "DEMO-" } },
    orderBy: { order_number: "asc" },
  });
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) {
    console.log("Tidak ada pesanan DEMO-*. Selesai (idempoten).");
    return;
  }

  const [items, tracking, ledger, reviews] = await Promise.all([
    prisma.orderItem.findMany({ where: { order_id: { in: orderIds } } }),
    prisma.orderTracking.findMany({ where: { order_id: { in: orderIds } } }),
    prisma.platformLedger.findMany({ where: { order_id: { in: orderIds } } }),
    prisma.review.findMany({ where: { order_id: { in: orderIds } } }),
  ]);
  const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
  const allProducts = await prisma.product.findMany({ select: { id: true, name: true, stock: true } });
  const productById = new Map(allProducts.map((product) => [product.id, product]));
  const normalizeName = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const productsByName = new Map();
  allProducts.forEach((product) => {
    const key = normalizeName(product.name);
    if (!productsByName.has(key)) productsByName.set(key, []);
    productsByName.get(key).push(product);
  });
  const resolveProduct = (item) => {
    if (item.product_id && productById.has(item.product_id)) return productById.get(item.product_id);
    const matches = productsByName.get(normalizeName(item.product_name)) || [];
    return matches.length === 1 ? matches[0] : null;
  };

  let gross = 0;
  for (const order of orders) {
    const orderItems = items.filter((item) => item.order_id === order.id);
    const orderLedger = ledger.filter((row) => row.order_id === order.id);
    const orderTracking = tracking.filter((row) => row.order_id === order.id);
    const orderReviews = reviews.filter((row) => row.order_id === order.id);
    gross += orderItems.reduce((sum, item) => sum + n(item.subtotal), 0);

    console.log(`\nPesanan ${order.order_number} | ${order.status} | ${order.created_at.toISOString()}`);
    console.log(`  Stok dikurangi: ${order.stock_decremented ? "ya" : "tidak"}`);
    orderItems.forEach((item) => {
      const product = resolveProduct(item);
      console.log(`  Item: ${item.product_name} | qty ${n(item.qty)} | ${rupiah(item.subtotal)} | stok produk ${product ? `${n(product.stock)} -> ${n(product.stock) + n(item.qty)}` : " tidak dapat dipetakan ke produk master"}`);
    });
    orderLedger.forEach((row) => console.log(`  Ledger: ${row.type} | ${row.status} | ${rupiah(row.amount)}`));
    orderTracking.forEach((row) => console.log(`  Tracking: ${row.code} | ${row.status}`));
    orderReviews.forEach((row) => console.log(`  Review: ${row.id} | rating ${n(row.rating)}`));
  }
  console.log(`\nTotal pesanan: ${orders.length}`);
  console.log(`Total kotor: ${rupiah(gross)}`);
  console.log(`Total item: ${items.length}, tracking: ${tracking.length}, ledger: ${ledger.length}, review: ${reviews.length}`);

  if (dryRun) {
    console.log("DRY RUN selesai. Tidak ada perubahan database.");
    return;
  }

  await backupTables(prisma, ["order", "orderItem", "orderTracking", "platformLedger", "review", "product"], "delete-demo-orders");
  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      if (order.stock_decremented) {
        for (const item of items.filter((row) => row.order_id === order.id)) {
          const product = resolveProduct(item);
          if (!product) {
            console.warn(`  Peringatan: stok tidak dikembalikan untuk ${item.product_name} (produk master tidak ditemukan).`);
            continue;
          }
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: n(item.qty) } },
          });
        }
      }
      if (reviews.some((row) => row.order_id === order.id)) {
        await tx.review.deleteMany({ where: { order_id: order.id } });
      }
      if (ledger.some((row) => row.order_id === order.id)) {
        await tx.platformLedger.deleteMany({ where: { order_id: order.id } });
      }
      if (tracking.some((row) => row.order_id === order.id)) {
        await tx.orderTracking.deleteMany({ where: { order_id: order.id } });
      }
      if (items.some((row) => row.order_id === order.id)) {
        await tx.orderItem.deleteMany({ where: { order_id: order.id } });
      }
      await tx.order.delete({ where: { id: order.id } });
    }
  });
  console.log(`Selesai: ${orders.length} pesanan DEMO dihapus dan stok dikembalikan.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
