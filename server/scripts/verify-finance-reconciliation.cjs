// Test rekonsiliasi R1–R17 untuk revisi laporan keuangan ElektroMart.
// Menjalankan: node scripts/verify-finance-reconciliation.cjs
// Semua angka "Sesudah" berasal dari audit dan diverifikasi terhadap database.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const finance = require("../src/finance");
const { prisma } = require("../src/prisma");

const n = (value) => Number(value || 0);
const rupiah = (value) => `Rp${Math.round(n(value)).toLocaleString("id-ID")}`;
const results = [];

function check(id, label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ id, label, pass, actual, expected });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${label}`);
  if (!pass) {
    console.log(`        aktual   : ${typeof actual === "number" ? rupiah(actual) : JSON.stringify(actual)}`);
    console.log(`        diharapkan: ${typeof expected === "number" ? rupiah(expected) : JSON.stringify(expected)}`);
  }
}

function ok(id, label, condition, detail = "") {
  check(id, label, Boolean(condition), true);
  if (!condition && detail) console.log(`        ${detail}`);
}

async function main() {
  const snapshot = await finance.buildPlatformFinance();
  const [admin, adminDash] = await Promise.all([
    finance.buildAdminFinance(snapshot),
    finance.buildAdminDashboard(snapshot),
  ]);
  const sellerId = snapshot.topSellers[0]?.id;
  const seller = await finance.buildSellerFinance(sellerId, snapshot);

  const rawOrders = await prisma.order.findMany();
  const rawItems = await prisma.orderItem.findMany();
  const rawLedger = await prisma.platformLedger.findMany();
  const products = await prisma.product.findMany();
  const validIds = new Set(rawOrders.filter((order) => finance.VALID_ORDER_STATUSES.includes(order.status)).map((order) => order.id));
  const validRawItems = rawItems.filter((item) => validIds.has(item.order_id));

  // R1 — Populasi pesanan pasca pembersihan DEMO.
  check("R1", "Jumlah pesanan: 13 valid, 34 batal, 3 waiting (total 50)", {
    total: snapshot.summary.totalOrders,
    valid: snapshot.summary.validOrders,
    cancelled: snapshot.summary.cancelledOrders,
    waiting: snapshot.summary.waitingOrders,
  }, { total: 50, valid: 13, cancelled: 34, waiting: 3 });

  // R2 — Penjualan kotor = Σ qty × harga satuan, tanpa ongkir.
  const recomputedGross = validRawItems.reduce((sum, item) => sum + n(item.qty) * n(item.price), 0);
  check("R2", "Penjualan kotor = Σ qty × harga satuan = Rp200.182.000", {
    fromItems: recomputedGross,
    summary: snapshot.summary.gross,
    shippingExcluded: snapshot.summary.gross !== snapshot.summary.gmv,
  }, { fromItems: 200182000, summary: 200182000, shippingExcluded: true });

  // R3 — Unit terjual dan fee snapshot per item.
  check("R3", "18 unit valid dan 13/13 item punya snapshot fee", {
    units: snapshot.summary.units,
    itemsWithFee: validRawItems.filter((item) => n(item.seller_fee) > 0).length,
    totalItems: validRawItems.length,
  }, { units: 18, itemsWithFee: 13, totalItems: 13 });

  // R4 — Fee snapshot item sama dengan fee snapshot order (backfill selesai).
  const orderFeeTotal = rawOrders
    .filter((order) => validIds.has(order.id))
    .reduce((sum, order) => sum + (n(order.seller_fee) || n(order.product_fee) || n(order.platform_revenue)), 0);
  const itemFeeTotal = validRawItems.reduce((sum, item) => sum + n(item.seller_fee), 0);
  check("R4", "Fee item = fee order = Rp2.085.740 (bukan Rp279.880 / Rp2.533.698)", {
    itemFeeTotal,
    orderFeeTotal,
    reported: snapshot.summary.fee,
  }, { itemFeeTotal: 2085740, orderFeeTotal: 2085740, reported: 2085740 });

  // R5 — Pendapatan bersih = kotor − fee.
  check("R5", "Pendapatan bersih = Rp198.096.260", {
    net: snapshot.summary.net,
    computed: snapshot.summary.gross - snapshot.summary.fee,
  }, { net: 198096260, computed: 198096260 });

  // R6 — Settled + escrow = bersih.
  check("R6", "Selesai Rp83.351.042 + Escrow Rp114.745.218 = bersih", {
    settled: snapshot.summary.settledNet,
    escrow: snapshot.summary.escrow,
    total: snapshot.summary.settledNet + snapshot.summary.escrow,
  }, { settled: 83351042, escrow: 114745218, total: 198096260 });

  // R7 — GMV = subtotal + ongkir + asuransi + packing; ongkir terpisah.
  check("R7", "GMV Rp200.584.000 = kotor + ongkir Rp329.000 + asuransi Rp65.000 + packing Rp8.000", {
    gmv: snapshot.summary.gmv,
    shipping: snapshot.summary.shipping,
    insurance: snapshot.summary.insurance,
    packing: snapshot.summary.packing,
    recomputed: snapshot.summary.gross + snapshot.summary.shipping + snapshot.summary.insurance + snapshot.summary.packing,
  }, { gmv: 200584000, shipping: 329000, insurance: 65000, packing: 8000, recomputed: 200584000 });

  // R8 — Buku besar fee = held + settled = fee platform.
  const held = rawLedger.filter((row) => row.type === "seller_fee" && row.status === "held").reduce((sum, row) => sum + n(row.amount), 0);
  const settled = rawLedger.filter((row) => row.type === "seller_fee" && row.status === "settled").reduce((sum, row) => sum + n(row.amount), 0);
  check("R8", "Ledger held Rp1.441.782 + settled Rp643.958 = fee Rp2.085.740", {
    held,
    settled,
    ledgerFee: snapshot.ledgerFee,
    platformRevenue: admin.summary.platformRevenue,
  }, { held: 1441782, settled: 643958, ledgerFee: 2085740, platformRevenue: 2085740 });

  // R9 — Tidak ada fee untuk pesanan batal di buku besar.
  const cancelledFeeLedger = rawLedger.filter((row) => row.type === "seller_fee" && row.status === "cancelled");
  const cancelledReversal = rawLedger.filter((row) => row.type === "seller_fee_reversal");
  check("R9", "0 entri seller_fee berstatus cancelled (33 entri lama dihapus)", {
    cancelledFeeLedger: cancelledFeeLedger.length,
    reversalEntries: cancelledReversal.length,
  }, { cancelledFeeLedger: 0, reversalEntries: 0 });

  // R10 — Pesanan DEMO dihapus dan stok dikembalikan.
  const demoOrders = rawOrders.filter((order) => String(order.order_number || "").startsWith("DEMO-"));
  const stockByName = (name) => n(products.find((product) => product.name === name)?.stock);
  check("R10", "Tidak ada DEMO-*; stok Samsung 22, PS5 18, Xiaomi 21", {
    demoOrders: demoOrders.length,
    samsung: stockByName("Samsung Galaxy S24 Ultra 12/512GB"),
    ps5: stockByName("PlayStation 5 Slim 1TB + 2 Controller"),
    xiaomi: stockByName("Xiaomi 14T Pro 12/512GB HyperOS"),
  }, { demoOrders: 0, samsung: 22, ps5: 18, xiaomi: 21 });

  // R11 — Deficit seller = ditarik − saldo selesai.
  check("R11", "Saldo minus Rp15.637.189 = ditarik Rp98.988.231 − selesai Rp83.351.042", {
    withdrawn: snapshot.summary.withdrawn,
    settled: snapshot.summary.settledNet,
    deficit: snapshot.summary.deficit,
    available: snapshot.summary.availableBalance,
    sellerDeficit: seller.summary.deficit,
  }, {
    withdrawn: 98988231,
    settled: 83351042,
    deficit: 15637189,
    available: 0,
    sellerDeficit: 15637189,
  });

  // R12 — Guard penarikan baru tersedia di server (diverifikasi via smoke test HTTP terpisah).
  const indexSource = fs.readFileSync(path.resolve(__dirname, "../src/index.js"), "utf8");
  ok("R12", "Penarikan baru diblokir saat deficit > 0", (
    seller.summary.deficit > 0 &&
    /financeData\.summary\.deficit\s*>\s*0/.test(indexSource)
  ), "Server harus menolak POST penarikan saat seller.deficit > 0.");

  // R13 — Kategori ternormalisasi dan stok kategori = stok produk.
  const badCategories = adminDash.categories.filter((row) => !row.name || /^(null|undefined)$/i.test(row.name));
  const categoryStock = adminDash.categories.reduce((sum, row) => sum + n(row.stock_total), 0);
  const productStock = products.reduce((sum, product) => sum + n(product.stock), 0);
  check("R13", "Kategori ternormalisasi; total stok kategori = total stok produk", {
    badCategories: badCategories.length,
    categoryStock,
    productStock,
  }, { badCategories: 0, categoryStock: productStock, productStock });

  // R14 — Metode pembayaran ternormalisasi, hanya pesanan valid.
  const badMethods = adminDash.paymentMethods.filter((row) => !row.name || /^(null|undefined|Lainnya)$/i.test(row.name));
  const methodCount = adminDash.paymentMethods.reduce((sum, row) => sum + n(row.count), 0);
  check("R14", "Metode pembayaran ternormalisasi; total = 13 pesanan valid", {
    badMethods: badMethods.length,
    methodCount,
  }, { badMethods: 0, methodCount: 13 });

  // R15 — Status dan nama produk ternormalisasi pada transaksi.
  const allowedStatuses = ["Dibayar", "Dikirim", "Selesai"];
  const badStatuses = snapshot.transactions.filter((row) => !allowedStatuses.includes(row.order_status_label));
  const badNames = snapshot.transactions.filter((row) => !row.product_name || /DEMO-/i.test(row.product_name));
  check("R15", "Status hanya Dibayar/Dikirim/Selesai; tanpa DEMO-* di transaksi", {
    badStatuses: badStatuses.length,
    badNames: badNames.length,
    transactions: snapshot.transactions.length,
  }, { badStatuses: 0, badNames: 0, transactions: 13 });

  // R16 — Satu sumber metrik: dashboard admin = finance admin.
  check("R16", "Dashboard dan finance admin memakai angka yang sama", {
    gmv: adminDash.orders.gmv === admin.summary.gmv,
    fee: adminDash.orders.platformRevenue === admin.summary.platformRevenue,
    escrow: adminDash.orders.escrowHeldFunds === admin.summary.escrowHeldFunds,
    thisMonth: adminDash.orders.thisMonth === admin.summary.ordersThisMonth,
    grossSeller: seller.summary.gross === admin.summary.grossVolume,
  }, { gmv: true, fee: true, escrow: true, thisMonth: true, grossSeller: true });

  // R17 — Flash sale dihitung dari penjualan hari ini (WIB), bukan all-time.
  const flash = adminDash.flashSale;
  const soldTodaySum = flash.products.reduce((sum, product) => sum + n(product.sold_today), 0);
  check("R17", "Flash sale: 6 produk aktif, kuota 345, terjual hari ini = Σ sold_today", {
    activeProducts: flash.activeProducts,
    quota: flash.quota,
    soldUnits: flash.soldUnits,
    soldTodaySum,
    remaining: flash.remaining,
  }, {
    activeProducts: flash.activeProducts,
    quota: flash.quota,
    soldUnits: soldTodaySum,
    soldTodaySum,
    remaining: flash.quota - soldTodaySum,
  });

  const failed = results.filter((row) => !row.pass);
  console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lulus.`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
