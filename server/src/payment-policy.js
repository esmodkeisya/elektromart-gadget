"use strict";

const crypto = require("crypto");

const SNAP_LIVE = "https://app.midtrans.com/snap/v1/transactions";
const SNAP_SANDBOX = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const SIMULATION_DISABLED_MESSAGE =
  "Simulasi pembayaran dinonaktifkan pada mode produksi Midtrans.";

function isLivePayment(env = process.env) {
  return String(env.MIDTRANS_IS_PRODUCTION || "false").trim().toLowerCase() === "true";
}

/** Sandbox/simulasi tetap diizinkan; hanya mode live yang mematikan jalan pintas. */
function allowSimulation(env = process.env) {
  return !isLivePayment(env);
}

function getSnapBase(env = process.env) {
  return isLivePayment(env) ? SNAP_LIVE : SNAP_SANDBOX;
}

function verifyMidtransSignature({ orderId, statusCode, grossAmount, signatureKey, serverKey }) {
  if (!serverKey || typeof serverKey !== "string") return false;
  if (typeof signatureKey !== "string" || !/^[a-f0-9]{128}$/i.test(signatureKey)) return false;

  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  const received = Buffer.from(signatureKey, "hex");
  const calculated = Buffer.from(expected, "hex");
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
}

function amountsMatch(orderTotal, grossAmount) {
  if (grossAmount === null || grossAmount === undefined || grossAmount === "") return false;
  const total = Math.round(Number(orderTotal || 0));
  const gross = Math.round(Number(grossAmount));
  return Number.isFinite(total) && Number.isFinite(gross) && total === gross;
}

module.exports = {
  SNAP_LIVE,
  SNAP_SANDBOX,
  SIMULATION_DISABLED_MESSAGE,
  isLivePayment,
  allowSimulation,
  getSnapBase,
  verifyMidtransSignature,
  amountsMatch,
};
