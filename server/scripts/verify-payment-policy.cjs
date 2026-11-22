const assert = require("assert");
const crypto = require("crypto");
const policy = require("../src/payment-policy");

let passed = 0;
function check(code, label, run) {
  run();
  passed += 1;
  console.log(`PASS  ${code}  ${label}`);
}

const sandboxEnv = { MIDTRANS_IS_PRODUCTION: "false" };
const liveEnv = { MIDTRANS_IS_PRODUCTION: "true" };
const serverKey = "sandbox-server-key";
const orderId = "EM-TEST-1";
const statusCode = "200";
const grossAmount = "150000";
const correctSignature = crypto
  .createHash("sha512")
  .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
  .digest("hex");

check("P1", "Default tetap sandbox dan simulasi diizinkan", () => {
  assert.strictEqual(policy.isLivePayment({}), false);
  assert.strictEqual(policy.getSnapBase({}), policy.SNAP_SANDBOX);
  assert.strictEqual(policy.allowSimulation(sandboxEnv), true);
});

check("P2", "Flag produksi mengunci Snap live dan mematikan simulasi", () => {
  assert.strictEqual(policy.isLivePayment(liveEnv), true);
  assert.strictEqual(policy.getSnapBase(liveEnv), policy.SNAP_LIVE);
  assert.strictEqual(policy.allowSimulation(liveEnv), false);
  assert.ok(policy.SIMULATION_DISABLED_MESSAGE.length > 0);
});

check("P3", "Signature Midtrans yang benar diterima", () => {
  assert.strictEqual(
    policy.verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey: correctSignature,
      serverKey,
    }),
    true
  );
});

check("P4", "Signature kosong, salah, malformed, atau tanpa key ditolak", () => {
  const base = { orderId, statusCode, grossAmount, serverKey };
  assert.strictEqual(policy.verifyMidtransSignature({ ...base, signatureKey: "" }), false);
  assert.strictEqual(policy.verifyMidtransSignature({ ...base, signatureKey: "abc" }), false);
  assert.strictEqual(policy.verifyMidtransSignature({ ...base, signatureKey: "0".repeat(128) }), false);
  assert.strictEqual(policy.verifyMidtransSignature({ ...base, serverKey: "" }), false);
});

check("P5", "Nominal notifikasi harus sama dengan total pesanan", () => {
  assert.strictEqual(policy.amountsMatch(150000, grossAmount), true);
  assert.strictEqual(policy.amountsMatch(150000.4, grossAmount), true);
  assert.strictEqual(policy.amountsMatch(150000, "149999"), false);
  assert.strictEqual(policy.amountsMatch(150000, undefined), false);
  assert.strictEqual(policy.amountsMatch(150000, "abc"), false);
});

console.log(`\n${passed}/${passed} pemeriksaan kebijakan pembayaran lulus.`);
