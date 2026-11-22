// Backfill snapshot fee pada order_items lama dari fee yang sudah tersimpan di order.
// Idempoten: hanya mengisi baris dengan seller_fee = 0 dan field order yang masih kosong.
// Jalankan: node scripts/backfill-order-item-fees.cjs [--dry-run]
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { prisma } = require("../src/prisma");
const { isDryRun, rupiah, backupTables } = require("./finance-migration-utils.cjs");

const VALID = ["paid", "shipped", "completed"];
const n = (v) => Number(v || 0);

async function main() {
  const dryRun = isDryRun();
  console.log(`=== Backfill seller fee order_items (${dryRun ? "DRY RUN" : "EKSEKUSI"}) ===`);

  const orders = await prisma.order.findMany({
    where: { status: { in: VALID } },
    orderBy: { created_at: "asc" },
  });
  const orderIds = orders.map((order) => order.id);
  const items = orderIds.length
    ? await prisma.orderItem.findMany({ where: { order_id: { in: orderIds } }, orderBy: { created_at: "asc" } })
    : [];
  const itemsByOrder = new Map();
  items.forEach((item) => {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  });

  const orderUpdates = [];
  const itemUpdates = [];
  let totalFee = 0;

  for (const order of orders) {
    const orderFee = n(order.seller_fee) || n(order.product_fee) || n(order.platform_revenue) || 0;
    if (orderFee <= 0) continue;
    const orderItems = (itemsByOrder.get(order.id) || []).filter((item) => n(item.seller_fee) === 0);
    if (!orderItems.length && n(order.seller_fee) && n(order.platform_revenue) && n(order.seller_fee_rate)) continue;

    const subtotal = orderItems.reduce((sum, item) => sum + n(item.subtotal), 0);
    let allocated = 0;

    orderItems.forEach((item, index) => {
      const isLast = index === orderItems.length - 1;
      const fee = isLast
        ? orderFee - allocated
        : subtotal > 0
          ? Math.round((orderFee * n(item.subtotal)) / subtotal)
          : 0;
      allocated += fee;
      const rate = n(item.subtotal) > 0 ? fee / n(item.subtotal) : 0;
      const net = n(item.subtotal) - fee;
      totalFee += fee;
      itemUpdates.push({
        id: item.id,
        orderNumber: order.order_number,
        product: item.product_name,
        before: { seller_fee: n(item.seller_fee), seller_fee_rate: n(item.seller_fee_rate), seller_net: n(item.seller_net) },
        after: { seller_fee: fee, seller_fee_rate: Number(rate.toFixed(6)), seller_net: net },
      });
    });

    const orderAfter = {
      seller_fee: n(order.seller_fee) || orderFee,
      platform_revenue: n(order.platform_revenue) || orderFee,
      seller_fee_rate: n(order.seller_fee_rate) || (n(order.subtotal) > 0 ? Number((orderFee / n(order.subtotal)).toFixed(6)) : 0),
    };
    if (
      orderAfter.seller_fee !== n(order.seller_fee) ||
      orderAfter.platform_revenue !== n(order.platform_revenue) ||
      orderAfter.seller_fee_rate !== n(order.seller_fee_rate)
    ) {
      orderUpdates.push({ id: order.id, orderNumber: order.order_number, before: {
        seller_fee: n(order.seller_fee), platform_revenue: n(order.platform_revenue), seller_fee_rate: n(order.seller_fee_rate),
      }, after: orderAfter });
    }
  }

  console.log(`Pesanan perlu update field: ${orderUpdates.length}`);
  orderUpdates.forEach((row) => console.log(`  ${row.orderNumber}: ${JSON.stringify(row.before)} -> ${JSON.stringify(row.after)}`));
  console.log(`Order items perlu update: ${itemUpdates.length}`);
  itemUpdates.forEach((row) => console.log(`  ${row.orderNumber} | ${row.product}: fee ${rupiah(row.before.seller_fee)} -> ${rupiah(row.after.seller_fee)}, rate ${row.after.seller_fee_rate}, net ${rupiah(row.after.seller_net)}`));
  console.log(`Total fee yang dibackfill: ${rupiah(totalFee)}`);

  if (dryRun) {
    console.log("DRY RUN selesai. Tidak ada perubahan database.");
    return;
  }
  if (!orderUpdates.length && !itemUpdates.length) {
    console.log("Tidak ada perubahan. Selesai (idempoten).");
    return;
  }

  await backupTables(prisma, ["order", "orderItem"], "backfill-order-item-fees");
  await prisma.$transaction(async (tx) => {
    for (const row of orderUpdates) {
      await tx.order.update({ where: { id: row.id }, data: row.after });
    }
    for (const row of itemUpdates) {
      await tx.orderItem.update({ where: { id: row.id }, data: row.after });
    }
  });
  console.log(`Selesai: ${orderUpdates.length} order dan ${itemUpdates.length} order item diperbarui.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
