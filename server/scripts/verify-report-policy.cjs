const assert = require("assert");
const finance = require("../src/finance");
const { prisma } = require("../src/prisma");

let passed = 0;
function check(code, label, run) {
  run();
  passed += 1;
  console.log(`PASS  ${code}  ${label}`);
}

async function main() {
  const policy = finance.REPORT_POLICY;

  check("K1", "Kebijakan pelaporan terkunci", () => {
    assert.strictEqual(policy.timezone, "Asia/Jakarta");
    assert.strictEqual(policy.period.preset, "today");
    assert.deepStrictEqual([...policy.deductions], ["seller_fee_snapshot"]);
    assert.deepStrictEqual([...policy.platformPayout.statuses], ["completed"]);
    assert.strictEqual(policy.activeSeller.rule, "has_active_product");
    assert.strictEqual(policy.cancellation.mode, "preserve_historical");
    assert.strictEqual(policy.cancellation.fee, "none");
    assert.ok(Object.isFrozen(policy));
  });

  check("K2", "Hari dan jam memakai WIB (UTC+7)", () => {
    const parts = finance.wibParts("2026-11-22T17:30:00Z");
    assert.strictEqual(parts.date, "2026-11-23");
    assert.strictEqual(parts.time, "00:30");
  });

  const snapshot = await finance.buildPlatformFinance();
  const s = snapshot.summary;

  check("K3", "Satu-satunya potongan ialah snapshot fee", () => {
    assert.strictEqual(s.net, s.gross - s.fee);
  });

  check("K4", "Pencairan Platform memakai payout completed", () => {
    const expected = snapshot.payouts
      .filter((row) => policy.platformPayout.statuses.includes(row.status))
      .reduce((total, row) => total + Number(row.amount || 0), 0);
    assert.strictEqual(s.platformPayouts, expected);
  });

  const dashboard = await finance.buildAdminDashboard(snapshot);

  check("K5", "Seller aktif = minimal satu produk aktif", () => {
    const expected = snapshot.profiles.filter(
      (profile) =>
        profile.role === "seller" &&
        snapshot.products.some((product) => product.seller_id === profile.id && product.status === "active")
    ).length;
    assert.strictEqual(dashboard.stats.activeSellers, expected);
  });

  check("K6", "Pesanan batal tetap dihitung sebagai historis", () => {
    assert.strictEqual(s.validOrders + s.cancelledOrders + s.waitingOrders, s.totalOrders);
    assert.strictEqual(s.fee, s.settledFee + s.heldFee);
  });

  console.log(`\n${passed}/${passed} pemeriksaan kebijakan laporan lulus.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
