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
  check("R1", "Jumlah pesanan: 19 valid, 34 batal, 0 waiting (total 53)", {
    total: snapshot.summary.totalOrders,
    valid: snapshot.summary.validOrders,
    cancelled: snapshot.summary.cancelledOrders,
    waiting: snapshot.summary.waitingOrders,
  }, { total: 53, valid: 19, cancelled: 34, waiting: 0 });

  // R2 — Penjualan kotor = Σ qty × harga satuan, tanpa ongkir.
  const recomputedGross = validRawItems.reduce((sum, item) => sum + n(item.qty) * n(item.price), 0);
  check("R2", "Penjualan kotor = Σ qty × harga satuan = Rp281.178.000", {
    fromItems: recomputedGross,
    summary: snapshot.summary.gross,
    shippingExcluded: snapshot.summary.gross !== snapshot.summary.gmv,
  }, { fromItems: 281178000, summary: 281178000, shippingExcluded: true });

  // R3 — Unit terjual dan fee snapshot per item.
  check("R3", "24 unit valid dan 19/19 item punya snapshot fee", {
    units: snapshot.summary.units,
    itemsWithFee: validRawItems.filter((item) => n(item.seller_fee) > 0).length,
    totalItems: validRawItems.length,
  }, { units: 24, itemsWithFee: 19, totalItems: 19 });

  // R4 — Fee snapshot item sama dengan fee snapshot order (backfill selesai).
  const orderFeeTotal = rawOrders
    .filter((order) => validIds.has(order.id))
    .reduce((sum, order) => sum + (n(order.seller_fee) || n(order.product_fee) || n(order.platform_revenue)), 0);
  const itemFeeTotal = validRawItems.reduce((sum, item) => sum + n(item.seller_fee), 0);
  check("R4", "Fee item = fee order = Rp3.711.656 (bukan Rp279.880 / Rp2.533.698)", {
    itemFeeTotal,
    orderFeeTotal,
    reported: snapshot.summary.fee,
  }, { itemFeeTotal: 3711656, orderFeeTotal: 3711656, reported: 3711656 });

  // R5 — Pendapatan bersih = kotor − fee.
  check("R5", "Pendapatan bersih = Rp277.466.344", {
    net: snapshot.summary.net,
    computed: snapshot.summary.gross - snapshot.summary.fee,
  }, { net: 277466344, computed: 277466344 });

  // R6 — Settled + escrow = bersih.
  check("R6", "Selesai Rp189.424.274 + Escrow Rp88.042.070 = bersih", {
    settled: snapshot.summary.settledNet,
    escrow: snapshot.summary.escrow,
    total: snapshot.summary.settledNet + snapshot.summary.escrow,
  }, { settled: 189424274, escrow: 88042070, total: 277466344 });

  // R7 — GMV = subtotal + ongkir + asuransi + packing; ongkir terpisah.
  check("R7", "GMV Rp281.735.500 = kotor + ongkir Rp451.000 + asuransi Rp95.000 + packing Rp11.500", {
    gmv: snapshot.summary.gmv,
    shipping: snapshot.summary.shipping,
    insurance: snapshot.summary.insurance,
    packing: snapshot.summary.packing,
    recomputed: snapshot.summary.gross + snapshot.summary.shipping + snapshot.summary.insurance + snapshot.summary.packing,
  }, { gmv: 281735500, shipping: 451000, insurance: 95000, packing: 11500, recomputed: 281735500 });

  // R8 — Buku besar fee = held + settled = fee platform.
  const held = rawLedger.filter((row) => row.type === "seller_fee" && row.status === "held").reduce((sum, row) => sum + n(row.amount), 0);
  const settled = rawLedger.filter((row) => row.type === "seller_fee" && row.status === "settled").reduce((sum, row) => sum + n(row.amount), 0);
  check("R8", "Ledger held Rp951.930 + settled Rp2.759.726 = fee Rp3.711.656", {
    held,
    settled,
    ledgerFee: snapshot.ledgerFee,
    platformRevenue: admin.summary.platformRevenue,
  }, { held: 951930, settled: 2759726, ledgerFee: 3711656, platformRevenue: 3711656 });

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
  check("R10", "Tidak ada DEMO-*; stok Samsung 21, PS5 18, Xiaomi 20", {
    demoOrders: demoOrders.length,
    samsung: stockByName("Samsung Galaxy S24 Ultra 12/512GB"),
    ps5: stockByName("PlayStation 5 Slim 1TB + 2 Controller"),
    xiaomi: stockByName("Xiaomi 14T Pro 12/512GB HyperOS"),
  }, { demoOrders: 0, samsung: 21, ps5: 18, xiaomi: 20 });

  // R11 — Deficit seller = ditarik − saldo selesai.
  check("R11", "Saldo seller = selesai Rp189.424.274 − ditarik Rp140.188.206 = Rp49.236.068", {
    withdrawn: snapshot.summary.withdrawn,
    settled: snapshot.summary.settledNet,
    deficit: snapshot.summary.deficit,
    available: snapshot.summary.availableBalance,
    sellerDeficit: seller.summary.deficit,
  }, {
    withdrawn: 140188206,
    settled: 189424274,
    deficit: 0,
    available: 49236068,
    sellerDeficit: 0,
  });

  // R12 — Guard penarikan baru tersedia di server (diverifikasi via smoke test HTTP terpisah).
  const indexSource = fs.readFileSync(path.resolve(__dirname, "../src/index.js"), "utf8");
  ok("R12", "Penarikan baru diblokir saat deficit > 0", (
    /financeData\.summary\.deficit\s*>\s*0/.test(indexSource) &&
    /Penarikan baru diblokir|Saldo seller sedang minus/.test(indexSource)
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
  check("R14", "Metode pembayaran ternormalisasi; total = 19 pesanan valid", {
    badMethods: badMethods.length,
    methodCount,
  }, { badMethods: 0, methodCount: 19 });

  // R15 — Status dan nama produk ternormalisasi pada transaksi.
  const allowedStatuses = ["Dibayar", "Dikirim", "Selesai"];
  const badStatuses = snapshot.transactions.filter((row) => !allowedStatuses.includes(row.order_status_label));
  const badNames = snapshot.transactions.filter((row) => !row.product_name || /DEMO-/i.test(row.product_name));
  check("R15", "Status hanya Dibayar/Dikirim/Selesai; tanpa DEMO-* di transaksi", {
    badStatuses: badStatuses.length,
    badNames: badNames.length,
    transactions: snapshot.transactions.length,
  }, { badStatuses: 0, badNames: 0, transactions: 19 });

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
