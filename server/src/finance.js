// Satu sumber kebenaran untuk semua metrik keuangan dan dashboard.
// UI dan ekspor XLSX harus membaca payload dari modul ini, bukan menghitung ulang.
const { prisma } = require("./prisma");

const VALID_ORDER_STATUSES = ["paid", "shipped", "completed"];
const ORDER_STATUS_LABELS = {
  waiting_payment: "Menunggu Pembayaran",
  paid: "Dibayar",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};
const FUND_STATUS_LABELS = {
  paid: "Tertahan",
  shipped: "Tertahan",
  completed: "Dapat Ditarik",
  cancelled: "Dibatalkan",
};
const SELLER_FEE_MIN = 0.02;
const SELLER_FEE_MAX = 0.05;

/**
 * Kebijakan pelaporan yang disepakati. Semua angka tetap dihitung di modul ini;
 * konfigurasi ini hanya mengunci keputusan bisnis agar tidak tersebar di UI/ekspor.
 */
const REPORT_POLICY = Object.freeze({
  timezone: "Asia/Jakarta",
  period: Object.freeze({ preset: "today" }),
  deductions: Object.freeze(["seller_fee_snapshot"]),
  platformPayout: Object.freeze({
    source: "platform_payout",
    statuses: Object.freeze(["completed"]),
  }),
  activeSeller: Object.freeze({ rule: "has_active_product" }),
  cancellation: Object.freeze({ mode: "preserve_historical", fee: "none" }),
});

const FEE_TIER_RULES = [
  { rate: 0.02, label: "Seller baru", condition: "Mulai berjualan" },
  { rate: 0.025, label: "Seller berkembang", condition: "≥ 3 bulan ATAU ≥ 10 unit terjual" },
  { rate: 0.03, label: "Seller aktif", condition: "≥ 6 bulan ATAU ≥ 50 unit terjual" },
  { rate: 0.035, label: "Seller berpengalaman", condition: "≥ 12 bulan ATAU ≥ 100 unit terjual" },
  { rate: 0.04, label: "Seller lama", condition: "≥ 24 bulan ATAU ≥ 200 unit terjual" },
  { rate: 0.045, label: "Seller prioritas", condition: "≥ 24 bulan DAN ≥ 200 unit terjual" },
  { rate: 0.05, label: "Seller platinum", condition: "Batas maksimal tarif" },
];

const n = (value) => Number(value || 0);

function calcSellerFeeRate(tenureMonths = 0, soldQty = 0) {
  const months = Math.max(0, Number(tenureMonths) || 0);
  const sold = Math.max(0, Number(soldQty) || 0);
  let rate = SELLER_FEE_MIN;
  if (months >= 3) rate += 0.005;
  if (months >= 6) rate += 0.005;
  if (months >= 12) rate += 0.005;
  if (months >= 24) rate += 0.005;
  if (sold >= 10) rate += 0.005;
  if (sold >= 50) rate += 0.005;
  if (sold >= 100) rate += 0.005;
  if (sold >= 200) rate += 0.005;
  return Math.min(SELLER_FEE_MAX, Math.max(SELLER_FEE_MIN, Number(rate.toFixed(4))));
}

function monthsBetween(from, to = new Date()) {
  if (!from) return 0;
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  let months = (to.getFullYear() - start.getFullYear()) * 12 + to.getMonth() - start.getMonth();
  if (to.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Waktu WIB (UTC+7) sebagai komponen tanggal, bukan Date lokal server. */
function wibParts(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: REPORT_POLICY.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(hour),
    minute: Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    dateTime: `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}`,
    time: `${hour}:${parts.minute}`,
  };
}

function wibToday() {
  return wibParts(new Date()).date;
}

function addWibDays(dateString, days) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function normalizePaymentMethod(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (!lower || lower === "null") return "Lainnya";
  if (/gopay/.test(lower)) return "GoPay";
  if (/dana/.test(lower)) return "DANA";
  if (/qris/.test(lower)) return "QRIS";
  if (/ovo/.test(lower)) return "OVO";
  if (/shopeepay/.test(lower)) return "ShopeePay";
  if (/bca/.test(lower) && /(virtual|\bva\b)/.test(lower)) return "VA BCA";
  if (/mandiri/.test(lower) && /(virtual|\bva\b)/.test(lower)) return "VA Mandiri";
  if (/bni/.test(lower) && /(virtual|\bva\b)/.test(lower)) return "VA BNI";
  if (/bri/.test(lower) && /(virtual|\bva\b)/.test(lower)) return "VA BRI";
  if (/(virtual|\bva\b)/.test(lower)) return "Virtual Account";
  if (/alfamart/.test(lower)) return "Alfamart";
  if (/indomaret/.test(lower)) return "Indomaret";
  return raw.replace(/\s+/g, " ");
}

function normalizeCategory(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (!lower) return "Tanpa Kategori";
  if (/aksesoris|accessor/.test(lower)) return "Aksesoris";
  if (/audio/.test(lower)) return "Audio";
  if (/kabel|charger/.test(lower)) return "Kabel & Charger";
  if (/smartphone|handphone|hp/.test(lower)) return "Smartphone";
  if (/laptop|komputer/.test(lower)) return "Laptop";
  if (/gaming/.test(lower)) return "Gaming";
  if (/kamera|camera/.test(lower)) return "Kamera";
  if (/smart.?watch|watch/.test(lower)) return "Smart Watch";
  return raw.replace(/\s+/g, " ");
}

function createProductMatcher(products) {
  const normalizeName = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const byId = new Map(products.map((product) => [product.id, product]));
  const byName = new Map(products.map((product) => [normalizeName(product.name), product]));
  return (item) => {
    if (item?.product_id && byId.has(item.product_id)) return byId.get(item.product_id);
    const name = normalizeName(item?.product_name);
    if (!name) return null;
    if (byName.has(name)) return byName.get(name);
    return (
      products.find((product) => {
        const candidate = normalizeName(product.name);
        return candidate && (candidate.startsWith(name) || name.startsWith(candidate));
      }) || null
    );
  };
}

const grossOf = (order) => n(order?.subtotal);
const shippingOf = (order) => n(order?.shipping_fee);
const gmvOf = (order) => grossOf(order) + shippingOf(order) + n(order?.insurance_fee) + n(order?.packing_fee);
const feeOf = (order) => n(order?.seller_fee) || n(order?.product_fee) || n(order?.platform_revenue) || 0;

function serializeWithdrawal(row, sellerName) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    seller_name: sellerName || "Seller",
    amount: n(row.amount),
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

function serializePayout(row, recipientName) {
  return {
    id: row.id,
    recipient_id: row.recipient_id,
    recipient_role: row.recipient_role,
    recipient_name: recipientName || "User",
    amount: n(row.amount),
    status: row.status,
    note: row.note || null,
    created_by: row.created_by || null,
    created_at: row.created_at,
  };
}

/** Muat seluruh data relevan sekali, lalu hitung semua turunan dari snapshot ini. */
async function buildPlatformFinance() {
  const [orders, items, products, categories, profiles, ledger, withdrawals, payouts, reviewRows] = await Promise.all([
    prisma.order.findMany({ orderBy: [{ created_at: "asc" }, { id: "asc" }] }),
    prisma.orderItem.findMany({ orderBy: [{ created_at: "asc" }, { id: "asc" }] }),
    prisma.product.findMany({ orderBy: [{ created_at: "desc" }, { id: "asc" }] }),
    prisma.category.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }] }),
    prisma.profile.findMany({ select: { id: true, full_name: true, store_name: true, role: true, created_at: true } }),
    prisma.platformLedger.findMany({ orderBy: [{ created_at: "desc" }, { id: "asc" }] }),
    prisma.withdrawal.findMany({ orderBy: [{ created_at: "desc" }, { id: "asc" }] }),
    prisma.platformPayout.findMany({ orderBy: [{ created_at: "desc" }, { id: "asc" }] }),
    prisma.review.findMany({ orderBy: [{ created_at: "desc" }, { id: "asc" }] }),
  ]);

  const resolveProduct = createProductMatcher(products);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const nameOf = (id) => {
    const profile = profileById.get(id);
    return profile?.store_name || profile?.full_name || null;
  };
  const itemsByOrder = new Map();
  items.forEach((item) => {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  });

  const orderRows = [];
  const transactions = [];
  const today = wibToday();

  for (const order of orders) {
    const valid = VALID_ORDER_STATUSES.includes(order.status);
    const orderItems = itemsByOrder.get(order.id) || [];
    const productOfItem = new Map(orderItems.map((item) => [item.id, resolveProduct(item)]));
    const orderGross = grossOf(order);
    const orderFee = feeOf(order);
    const orderDate = wibParts(order.created_at);
    const paidDate = wibParts(order.paid_at);
    const shippedDate = wibParts(order.shipped_at);
    const completedDate = wibParts(order.completed_at);
    const transactionDate = paidDate || orderDate;
    const fundStatus = FUND_STATUS_LABELS[order.status] || "Tertahan";
    const estimatedClear =
      order.status === "completed"
        ? transactionDate?.date
        : order.shipping_deadline
          ? wibParts(order.shipping_deadline)?.date
          : shippedDate
            ? addWibDays(shippedDate.date, 3)
            : paidDate
              ? addWibDays(paidDate.date, 7)
              : null;
    let orderNet = 0;

    orderItems.forEach((item) => {
      const product = productOfItem.get(item.id);
      const gross = n(item.subtotal);
      const fee =
        n(item.seller_fee) > 0
          ? n(item.seller_fee)
          : orderGross > 0 && orderFee > 0
            ? Math.round((orderFee * gross) / orderGross)
            : 0;
      const net = item.seller_net == null ? gross - fee : n(item.seller_net);
      const sellerId = item.seller_id || product?.seller_id || null;
      const qty = n(item.qty);
      const category = normalizeCategory(product?.category);
      orderNet += net;

      transactions.push({
        id: item.id,
        order_id: order.id,
        order_number: order.order_number,
        product_id: product?.id || item.product_id || null,
        product_name: product?.name || item.product_name,
        product_image: product?.image_url || item.product_image || null,
        category,
        seller_id: sellerId,
        seller_name: nameOf(sellerId) || "Seller",
        buyer_id: order.buyer_id || null,
        buyer_name: nameOf(order.buyer_id) || "Pembeli",
        qty,
        unit_price: qty ? Math.round(gross / qty) : n(item.price),
        gross,
        fee_rate: gross > 0 ? fee / gross : n(item.seller_fee_rate) || n(order.seller_fee_rate),
        fee,
        net,
        status: order.status === "completed" ? "settled" : "pending",
        order_status: order.status,
        order_status_label: ORDER_STATUS_LABELS[order.status] || order.status,
        fund_status: fundStatus,
        date: transactionDate?.dateTime || orderDate?.dateTime || null,
        order_date: orderDate?.date || null,
        is_today: orderDate?.date === today,
        estimated_clear: valid ? estimatedClear : null,
      });
    });

    const firstItem = orderItems[0];
    const firstProduct = firstItem ? productOfItem.get(firstItem.id) : null;
    const sellerId = firstItem?.seller_id || firstProduct?.seller_id || null;
    orderRows.push({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      status_label: ORDER_STATUS_LABELS[order.status] || order.status,
      fund_status: fundStatus,
      date: transactionDate?.dateTime || orderDate?.dateTime || null,
      order_date: orderDate?.date || null,
      is_today: orderDate?.date === today,
      seller_id: sellerId,
      seller_name: nameOf(sellerId) || "Seller",
      buyer_id: order.buyer_id || null,
      buyer_name: nameOf(order.buyer_id) || "Pembeli",
      product_name: firstProduct?.name || firstItem?.product_name || "-",
      qty: orderItems.reduce((sum, item) => sum + n(item.qty), 0),
      gross: orderGross,
      shipping_fee: shippingOf(order),
      insurance_fee: n(order.insurance_fee),
      packing_fee: n(order.packing_fee),
      gmv: gmvOf(order),
      fee_rate: orderGross > 0 ? orderFee / orderGross : 0,
      fee: orderFee,
      net: orderNet,
      payment_method: normalizePaymentMethod(order.payment_method || order.payment_group),
      payment_method_raw: order.payment_method || order.payment_group || "-",
      courier: order.courier || "-",
      product_fee: n(order.product_fee),
      shipping_deadline: order.shipping_deadline || null,
      estimated_clear: valid ? estimatedClear : null,
      valid,
    });
  }

  const validOrders = orderRows.filter((row) => row.valid);
  const validTransactions = transactions.filter((row) => VALID_ORDER_STATUSES.includes(row.order_status));
  const settledTransactions = validTransactions.filter((row) => row.order_status === "completed");
  const pendingTransactions = validTransactions.filter((row) => row.order_status !== "completed");
  const sum = (list, key) => list.reduce((total, row) => total + n(row[key]), 0);

  const gross = sum(validTransactions, "gross");
  const fee = sum(validTransactions, "fee");
  // Sesuai REPORT_POLICY.deductions: satu-satunya potongan adalah snapshot fee seller.
  const deduction = fee;
  const settledNet = sum(settledTransactions, "net");
  const pendingNet = sum(pendingTransactions, "net");
  const withdrawn = withdrawals.filter((row) => row.status === "completed").reduce((total, row) => total + n(row.amount), 0);
  const pendingWithdrawal = withdrawals
    .filter((row) => ["pending", "processing"].includes(row.status))
    .reduce((total, row) => total + n(row.amount), 0);
  const isCompletedPayout = (row) => REPORT_POLICY.platformPayout.statuses.includes(row.status);
  const platformCredits = payouts
    .filter((row) => isCompletedPayout(row) && row.recipient_role === "seller")
    .reduce((total, row) => total + n(row.amount), 0);
  const platformPayouts = payouts
    .filter(isCompletedPayout)
    .reduce((total, row) => total + n(row.amount), 0);
  const sellerBalanceRaw = settledNet + platformCredits - withdrawn - pendingWithdrawal;
  const platformBalanceRaw = fee - platformPayouts;

  const summary = {
    gross,
    gmv: sum(validOrders, "gmv"),
    shipping: sum(validOrders, "shipping_fee"),
    insurance: sum(validOrders, "insurance_fee"),
    packing: sum(validOrders, "packing_fee"),
    fee,
    net: gross - deduction,
    settledNet,
    pendingNet,
    escrow: pendingNet,
    settledFee: sum(settledTransactions, "fee"),
    heldFee: sum(pendingTransactions, "fee"),
    withdrawn,
    pendingWithdrawal,
    platformCredits,
    sellerBalanceRaw,
    availableBalance: Math.max(0, sellerBalanceRaw),
    deficit: Math.max(0, -sellerBalanceRaw),
    platformPayouts,
    platformBalanceRaw,
    availablePlatformBalance: Math.max(0, platformBalanceRaw),
    platformDeficit: Math.max(0, -platformBalanceRaw),
    totalOrders: orders.length,
    validOrders: validOrders.length,
    activeOrders: validOrders.filter((row) => ["paid", "shipped"].includes(row.status)).length,
    completedOrders: validOrders.filter((row) => row.status === "completed").length,
    // Pesanan batal dipertahankan sebagai historis: tidak masuk transaksi valid dan tidak menghasilkan fee.
    cancelledOrders: orders.filter((row) => row.status === "cancelled").length,
    waitingOrders: orders.filter((row) => row.status === "waiting_payment").length,
    units: sum(validTransactions, "qty"),
  };

  // Kategori: gabungkan master kategori dan kategori produk yang sudah dinormalisasi.
  const categoryMap = new Map();
  for (const category of categories) {
    const name = normalizeCategory(category.name);
    if (!categoryMap.has(name)) categoryMap.set(name, { name, products: 0, stock: 0, units: 0, revenue: 0, orders: new Set() });
  }
  for (const product of products) {
    const name = normalizeCategory(product.category);
    if (!categoryMap.has(name)) categoryMap.set(name, { name, products: 0, stock: 0, units: 0, revenue: 0, orders: new Set() });
    const row = categoryMap.get(name);
    row.products += 1;
    row.stock += n(product.stock);
  }
  for (const row of validTransactions) {
    const categoryRow = categoryMap.get(row.category);
    if (!categoryRow) continue;
    categoryRow.units += n(row.qty);
    categoryRow.revenue += n(row.gross);
    categoryRow.orders.add(row.order_id);
  }
  const categoriesResult = [...categoryMap.values()]
    .map((row) => ({
      name: row.name,
      product_count: row.products,
      stock_total: row.stock,
      units_sold: row.units,
      revenue: row.revenue,
      orders: row.orders.size,
      share: gross > 0 ? row.revenue / gross : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));

  const productMapAgg = new Map();
  for (const row of validTransactions) {
    const key = row.product_id || row.product_name;
    if (!productMapAgg.has(key)) {
      productMapAgg.set(key, {
        id: key,
        name: row.product_name,
        category: row.category,
        units: 0,
        revenue: 0,
        orderIds: new Set(),
        stock: products.find((product) => product.id === row.product_id)?.stock || 0,
      });
    }
    const entry = productMapAgg.get(key);
    entry.units += n(row.qty);
    entry.revenue += n(row.gross);
    entry.orderIds.add(row.order_id);
  }
  const topProducts = [...productMapAgg.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      units_sold: entry.units,
      revenue: entry.revenue,
      orders: entry.orderIds.size,
      stock: n(entry.stock),
    }))
    .sort((a, b) => b.units_sold - a.units_sold || b.revenue - a.revenue);

  const sellerAgg = new Map();
  for (const row of validTransactions) {
    if (!row.seller_id) continue;
    if (!sellerAgg.has(row.seller_id)) sellerAgg.set(row.seller_id, {
      id: row.seller_id,
      name: row.seller_name,
      gross: 0,
      fee: 0,
      net: 0,
      units: 0,
      orderIds: new Set(),
    });
    const entry = sellerAgg.get(row.seller_id);
    entry.gross += n(row.gross);
    entry.fee += n(row.fee);
    entry.net += n(row.net);
    entry.units += n(row.qty);
    entry.orderIds.add(row.order_id);
  }
  const topSellers = [...sellerAgg.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      gross: entry.gross,
      fee: entry.fee,
      net: entry.net,
      units: entry.units,
      orders: entry.orderIds.size,
      products: products.filter((product) => product.seller_id === entry.id).length,
      active_products: products.filter((product) => product.seller_id === entry.id && product.status === "active").length,
    }))
    .sort((a, b) => b.gross - a.gross);

  const paymentCounts = new Map();
  validOrders.forEach((row) => paymentCounts.set(row.payment_method, (paymentCounts.get(row.payment_method) || 0) + 1));
  const paymentMethods = [...paymentCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const ledgerRows = ledger.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    order_number: row.order_number,
    seller_id: row.seller_id,
    seller_name: nameOf(row.seller_id) || "Seller",
    type: row.type === "seller_fee_reversal" ? "Pembalikan Fee Seller" : row.type === "seller_fee" ? "Fee Seller" : row.type,
    type_raw: row.type,
    amount: n(row.amount),
    status: row.status,
    status_label: { held: "Ditahan", settled: "Settled", cancelled: "Dibatalkan", reversed: "Dibalik" }[row.status] || row.status,
    description: row.description,
    created_at: row.created_at,
    date: wibParts(row.created_at)?.dateTime || null,
  }));

  const ledgerFee = ledgerRows
    .filter((row) => (row.type_raw === "seller_fee" && ["held", "settled"].includes(row.status)) || (row.type_raw === "seller_fee_reversal" && row.status === "settled"))
    .reduce((total, row) => total + n(row.amount), 0);

  const reviews = reviewRows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    order_id: row.order_id,
    rating: n(row.rating),
    comment: row.comment,
    created_at: row.created_at,
    date: wibParts(row.created_at)?.date || null,
  }));

  return {
    generated_at: wibParts(new Date()).dateTime,
    today,
    orders: orderRows,
    transactions: validTransactions,
    allTransactions: transactions,
    ledger: ledgerRows,
    ledgerFee,
    withdrawals,
    payouts,
    reviews,
    products,
    profiles,
    categories: categoriesResult,
    topProducts,
    topSellers,
    paymentMethods,
    summary,
    feeTiers: FEE_TIER_RULES,
    statusLabels: ORDER_STATUS_LABELS,
    fundStatusLabels: FUND_STATUS_LABELS,
  };
}

async function sellerFeeProfile(sellerId, snapshot) {
  const data = snapshot || (await buildPlatformFinance());
  const profile = data.profiles.find((row) => row.id === sellerId);
  const soldQty = data.transactions
    .filter((row) => row.seller_id === sellerId)
    .reduce((sum, row) => sum + n(row.qty), 0);
  const tenureMonths = monthsBetween(profile?.created_at);
  return {
    tenureMonths,
    soldQty,
    rate: calcSellerFeeRate(tenureMonths, soldQty),
    since: wibParts(profile?.created_at)?.date || null,
  };
}

async function buildSellerFinance(sellerId, snapshot) {
  const data = snapshot || (await buildPlatformFinance());
  const transactions = data.transactions.filter((row) => row.seller_id === sellerId);
  const settled = transactions.filter((row) => row.order_status === "completed");
  const pending = transactions.filter((row) => row.order_status !== "completed");
  const sum = (list, key) => list.reduce((total, row) => total + n(row[key]), 0);
  const settledBalance = sum(settled, "net");
  const pendingBalance = sum(pending, "net");
  const gross = sum(transactions, "gross");
  const fees = sum(transactions, "fee");
  const withdrawals = data.withdrawals.filter((row) => row.seller_id === sellerId);
  const payouts = data.payouts.filter((row) => row.recipient_id === sellerId && row.status === "completed");
  const withdrawnAmount = withdrawals.filter((row) => row.status === "completed").reduce((total, row) => total + n(row.amount), 0);
  const pendingWithdrawal = withdrawals
    .filter((row) => ["pending", "processing"].includes(row.status))
    .reduce((total, row) => total + n(row.amount), 0);
  const platformCredits = payouts.reduce((total, row) => total + n(row.amount), 0);
  const rawBalance = settledBalance + platformCredits - withdrawnAmount - pendingWithdrawal;
  const feeProfile = await sellerFeeProfile(sellerId, data);

  return {
    summary: {
      gross,
      totalRevenue: gross,
      totalFees: fees,
      totalNet: gross - fees,
      settledBalance,
      pendingBalance,
      platformCredits,
      withdrawnAmount,
      pendingWithdrawal,
      sellerBalanceRaw: rawBalance,
      availableBalance: Math.max(0, rawBalance),
      deficit: Math.max(0, -rawBalance),
      transactions: transactions.length,
      units: sum(transactions, "qty"),
      validOrders: new Set(transactions.map((row) => row.order_id)).size,
      activeOrders: new Set(transactions.filter((row) => ["paid", "shipped"].includes(row.order_status)).map((row) => row.order_id)).size,
      completedOrders: new Set(settled.map((row) => row.order_id)).size,
    },
    feeTier: feeProfile,
    transactions,
    withdrawals: withdrawals.map((row) => serializeWithdrawal(row, data.profiles.find((p) => p.id === sellerId)?.store_name)),
    platformPayouts: payouts.map((row) => serializePayout(row, data.profiles.find((p) => p.id === sellerId)?.store_name)),
    generated_at: data.generated_at,
  };
}

async function buildAdminFinance(snapshot) {
  const data = snapshot || (await buildPlatformFinance());
  const summary = data.summary;
  const sellerMap = new Map(data.profiles.map((row) => [row.id, row]));
  return {
    summary: {
      grossVolume: summary.gross,
      gmv: summary.gmv,
      shipping: summary.shipping,
      platformRevenue: summary.fee,
      settledRevenue: summary.settledFee,
      heldRevenue: summary.heldFee,
      escrowHeldFunds: summary.escrow,
      totalSellerNet: summary.net,
      totalPayoutToSellers: summary.net,
      completedWithdrawalAmount: summary.withdrawn,
      pendingWithdrawalAmount: summary.pendingWithdrawal,
      sellerAvailableBalance: summary.availableBalance,
      sellerDeficit: summary.deficit,
      totalPlatformPayouts: summary.platformPayouts,
      availablePlatformBalance: summary.availablePlatformBalance,
      platformDeficit: summary.platformDeficit,
      ledgerFee: data.ledgerFee,
      revenueOrders: summary.validOrders,
      totalOrders: summary.totalOrders,
      validOrders: summary.validOrders,
      activeOrders: summary.activeOrders,
      completedOrders: summary.completedOrders,
      cancelledOrders: summary.cancelledOrders,
      waitingOrders: summary.waitingOrders,
      ordersThisMonth: data.orders.filter((row) => row.order_date?.startsWith(data.today.slice(0, 7)) && row.valid).length,
      units: summary.units,
    },
    transactions: data.orders.filter((row) => row.valid),
    ledger: data.ledger,
    withdrawals: data.withdrawals.map((row) => serializeWithdrawal(row, sellerMap.get(row.seller_id)?.store_name || sellerMap.get(row.seller_id)?.full_name)),
    payouts: data.payouts.map((row) => serializePayout(row, sellerMap.get(row.recipient_id)?.store_name || sellerMap.get(row.recipient_id)?.full_name)),
    feeTiers: data.feeTiers,
    statusLabels: data.statusLabels,
    generated_at: data.generated_at,
    today: data.today,
  };
}

async function buildAdminDashboard(snapshot) {
  const data = snapshot || (await buildPlatformFinance());
  const products = data.products;
  const flashProducts = products.filter((product) => product.is_flash_sale && product.status === "active");
  const flashUnitsSoldToday = data.transactions
    .filter((row) => row.is_today && flashProducts.some((product) => product.id === row.product_id || product.name === row.product_name))
    .reduce((sum, row) => sum + n(row.qty), 0);
  const isActiveSeller = (profile) => {
    if (REPORT_POLICY.activeSeller.rule === "has_active_product") {
      return products.some((product) => product.seller_id === profile.id && product.status === "active");
    }
    return false;
  };
  const activeSellers = data.profiles.filter(
    (profile) => profile.role === "seller" && isActiveSeller(profile)
  ).length;

  return {
    stats: {
      sellers: data.profiles.filter((profile) => profile.role === "seller").length,
      activeSellers,
      buyers: data.profiles.filter((profile) => profile.role === "buyer").length,
      products: products.length,
      categories: data.categories.length,
    },
    categories: data.categories,
    products: data.topProducts,
    sellers: data.topSellers,
    orders: {
      total: data.summary.totalOrders,
      thisMonth: data.orders.filter((row) => row.valid && row.order_date?.startsWith(data.today.slice(0, 7))).length,
      valid: data.summary.validOrders,
      active: data.summary.activeOrders,
      completed: data.summary.completedOrders,
      cancelled: data.summary.cancelledOrders,
      waiting: data.summary.waitingOrders,
      units: data.summary.units,
      totalRevenue: data.summary.gmv,
      gmv: data.summary.gmv,
      gross: data.summary.gross,
      commissionRevenue: data.summary.fee,
      platformRevenue: data.summary.fee,
      escrowHeldFunds: data.summary.escrow,
      totalPayoutToSellers: data.summary.net,
      revenueOrders: data.summary.validOrders,
      availablePlatformBalance: data.summary.availablePlatformBalance,
      sellerDeficit: data.summary.deficit,
    },
    paymentMethods: data.paymentMethods,
    flashSale: {
      soldUnits: flashUnitsSoldToday,
      quota: flashProducts.reduce((sum, product) => sum + n(product.flash_sale_quota), 0),
      remaining: flashProducts.reduce((sum, product) => sum + Math.max(0, n(product.flash_sale_quota)), 0) - flashUnitsSoldToday,
      activeProducts: flashProducts.length,
      products: flashProducts.map((product) => {
        const sold = data.transactions
          .filter((row) => row.is_today && (row.product_id === product.id || row.product_name === product.name))
          .reduce((sum, row) => sum + n(row.qty), 0);
        return { ...product, sold_today: sold };
      }),
    },
    reviews: data.reviews,
    generated_at: data.generated_at,
    today: data.today,
  };
}

async function buildSellerDashboard(sellerId, snapshot) {
  const data = snapshot || (await buildPlatformFinance());
  const sellerTransactions = data.transactions.filter((row) => row.seller_id === sellerId);
  const products = data.products.filter((product) => product.seller_id === sellerId);
  const orderIds = new Set(sellerTransactions.map((row) => row.order_id));
  const productStats = new Map();
  sellerTransactions.forEach((row) => {
    const key = row.product_id || row.product_name;
    if (!productStats.has(key)) {
      productStats.set(key, {
        id: key,
        name: row.product_name,
        category: row.category,
        units: 0,
        revenue: 0,
        orderIds: new Set(),
        buyerIds: new Set(),
      });
    }
    const entry = productStats.get(key);
    entry.units += n(row.qty);
    entry.revenue += n(row.gross);
    entry.orderIds.add(row.order_id);
    if (row.buyer_id) entry.buyerIds.add(row.buyer_id);
  });
  const popularProducts = [...productStats.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      sold: entry.units,
      revenue: entry.revenue,
      orders: entry.orderIds.size,
      buyers: entry.buyerIds.size,
      stock: n(products.find((product) => product.id === entry.id)?.stock),
    }))
    .sort((a, b) => b.sold - a.sold || b.revenue - a.revenue);

  const lowStockProducts = products
    .filter((product) => n(product.stock) < 10 && product.status !== "draft")
    .sort((a, b) => n(a.stock) - n(b.stock));

  const today = new Date(`${data.today}T00:00:00Z`);
  const weekly = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today.getTime() - offset * 86400000);
    const date = day.toISOString().slice(0, 10);
    const rows = sellerTransactions.filter((row) => row.order_date === date);
    weekly.push({
      date,
      label: `${day.getUTCDate()} ${new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(day)}`,
      value: rows.reduce((sum, row) => sum + n(row.gross), 0),
      orders: new Set(rows.map((row) => row.order_id)).size,
    });
  }

  const sellerProfile = data.profiles.find((profile) => profile.id === sellerId);
  const sellerName = sellerProfile?.store_name || sellerProfile?.full_name || "Seller";

  return {
    seller_name: sellerName,
    stats: {
      products: products.length,
      active: products.filter((product) => product.status === "active").length,
      inactive: products.filter((product) => product.status !== "active").length,
      lowStock: lowStockProducts.length,
      outOfStock: products.filter((product) => n(product.stock) <= 0 || product.status === "out_of_stock").length,
      totalRevenue: sellerTransactions.reduce((sum, row) => sum + n(row.gross), 0),
      units: sellerTransactions.reduce((sum, row) => sum + n(row.qty), 0),
      totalOrders: orderIds.size,
      activeOrders: new Set(sellerTransactions.filter((row) => ["paid", "shipped"].includes(row.order_status)).map((row) => row.order_id)).size,
      completedOrders: new Set(sellerTransactions.filter((row) => row.order_status === "completed").map((row) => row.order_id)).size,
      buyerTotal: new Set(sellerTransactions.map((row) => row.buyer_id).filter(Boolean)).size,
    },
    recentProducts: products
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((product) => ({
        ...product,
        status_label: product.status === "active" ? "Aktif" : product.status === "out_of_stock" ? "Stok Habis" : "Nonaktif",
        dimensions_complete: n(product.weight_kg) > 0 && n(product.length_cm) > 0 && n(product.width_cm) > 0 && n(product.height_cm) > 0,
      })),
    popularProducts,
    lowStockProducts,
    weekly,
    generated_at: data.generated_at,
    today: data.today,
  };
}

module.exports = {
  REPORT_POLICY,
  VALID_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  FUND_STATUS_LABELS,
  FEE_TIER_RULES,
  calcSellerFeeRate,
  monthsBetween,
  wibParts,
  wibToday,
  normalizePaymentMethod,
  normalizeCategory,
  createProductMatcher,
  grossOf,
  shippingOf,
  gmvOf,
  feeOf,
  buildPlatformFinance,
  sellerFeeProfile,
  buildSellerFeeProfile: sellerFeeProfile,
  buildSellerFinance,
  buildAdminFinance,
  buildAdminDashboard,
  buildSellerDashboard,
};
