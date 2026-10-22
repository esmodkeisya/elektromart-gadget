"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Check,
  CreditCard,
  HelpCircle,
  Landmark,
  ShieldCheck,
  Smartphone,
  QrCode,
  XCircle,
  Tag,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function vaNumber(orderId: string) {
  const digits = orderId.replace(/\D/g, "");
  return "89508" + (digits + "3791").slice(-11);
}

function fromLast7(orderId: string) {
  return orderId.replace(/\D/g, "").slice(-7);
}

function paymentCode(orderId: string, method: string) {
  const base = fromLast7(orderId);
  if (method === "QRIS") return "EM-" + base + "-QRIS";
  return "EM-" + base;
}

function bankPrefix(method: string) {
  switch (method) {
    case "BCA Virtual Account":
      return "BCA";
    case "BNI Virtual Account":
      return "BNI";
    case "BRI Virtual Account":
      return "BRI";
    case "Mandiri Virtual Account":
      return "Mandiri";
    default:
      return "Bank";
  }
}

function paymentLogo(method: string) {
  switch (method) {
    case "BCA Virtual Account":
      return "/logos/bca.svg";
    case "BNI Virtual Account":
      return "/logos/bni.svg";
    case "BRI Virtual Account":
      return "/logos/bri.svg";
    case "Mandiri Virtual Account":
      return "/logos/mandiri.svg";
    case "DANA":
      return "/logos/dana.svg";
    case "GoPay":
      return "/logos/gopay.png";
    case "OVO":
      return "/logos/ovo.svg";
    default:
      return "/logos/qris.svg";
  }
}

function QrSvg({ seed, className }: { seed: string; className?: string }) {
  const cells = useMemo(() => {
    const out: boolean[][] = [];
    let h = 0;
    const hash = (i: number, j: number) => {
      let x = seed.charCodeAt(i % seed.length) * 31 + seed.charCodeAt(j % seed.length) * 17;
      h = (h + x) % 97;
      return ((x + j * 3 + i) % 7) < 3;
    };
    for (let i = 0; i < 21; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < 21; j++) {
        row.push(hash(i, j));
      }
      out.push(row);
    }
    return out;
  }, [seed]);

  const finder = (r: number, c: number) => (
    <g key={`${r}-${c}`}>
      {cells.slice(r, r + 7).map((row, i) =>
        row.slice(c, c + 7).map((on, j) => {
          const edge =
            i === 0 || j === 0 || i === 6 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
          return (
            <rect
              key={`${i}-${j}`}
              x={c + j}
              y={r + i}
              width={1}
              height={1}
              fill={edge ? "#111827" : "white"}
            />
          );
        })
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 21 21" className={className} shapeRendering="crispEdges">
      <rect x={0} y={0} width={21} height={21} fill="white" />
      {cells.map((row, i) =>
        row.map((on, j) => {
          const inFinder =
            (i < 7 && (j < 7 || j > 13)) || (i > 13 && j < 7);
          if (inFinder) return null;
          return on ? (
            <rect key={`${i}-${j}`} x={j} y={i} width={1} height={1} fill="#111827" />
          ) : null;
        })
      )}
      {finder(0, 0)}
      {finder(0, 14)}
      {finder(14, 0)}
    </svg>
  );
}

type BankStep = { title: string; steps: string[] };

function bankSteps(method: string, t: Translate): BankStep[] {
  const base = [
    {
      title: t("pay.mobileBankingTitle"),
      steps: [
        t("pay.bankStep1", { bank: bankPrefix(method) }),
        t("pay.bankStep2", { bank: bankPrefix(method) }),
        t("pay.bankStep3"),
        t("pay.bankStep4"),
        t("pay.bankStep5"),
      ],
    },
    {
      title: t("pay.atmTitle"),
      steps: [
        t("pay.atmStep1", { bank: bankPrefix(method) }),
        t("pay.atmStep2"),
        t("pay.atmStep3"),
        t("pay.atmStep4"),
      ],
    },
  ];
  return base;
}

function eWalletSteps(method: string, t: Translate): string[] {
  switch (method) {
    case "GoPay":
      return [t("pay.gopay1"), t("pay.gopay2"), t("pay.gopay3"), t("pay.gopay4")];
    case "OVO":
      return [t("pay.ovo1"), t("pay.ovo2"), t("pay.ovo3"), t("pay.ovo4")];
    case "DANA":
      return [t("pay.dana1"), t("pay.dana2"), t("pay.dana3"), t("pay.dana4")];
    default:
      return [];
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const { checkoutDetail, clearCart } = useCart();
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60 * 1000);

  useEffect(() => {
    if (!checkoutDetail) return;
    const start = checkoutDetail.expiresAt - Date.now();
    setTimeLeft(Math.max(0, start));
    const timer = setInterval(() => {
      const left = checkoutDetail.expiresAt - Date.now();
      setTimeLeft(Math.max(0, left));
      if (left <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [checkoutDetail]);

  const detail = useMemo(() => {
    if (!checkoutDetail) return null;
    return checkoutDetail;
  }, [checkoutDetail]);

  const [declared, setDeclared] = useState(false);

  if (!detail) {
    return (
      <main className="flex min-h-screen flex-col">
        <Navbar />
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-navy-900">{t("pay.noOrder")}</h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            {t("pay.noOrderDesc")}
          </p>
          <Link
            href="/kategori/semua"
            className="mt-8 rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("shopNow")}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const isBank = detail.paymentGroup === "bank";
  const isQris = detail.paymentGroup === "qris";
  const isEwallet = detail.paymentGroup === "ewallet";
  const va = vaNumber(detail.orderId);
  const code = paymentCode(detail.orderId, detail.paymentMethod);

  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
  const warning = timeLeft < 2 * 60 * 60 * 1000;

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* abaikan */
    }
  };

  const handlePaid = () => {
    if (detail?.orderDbId) {
      void api(`/api/orders/${detail.orderDbId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
      }).catch(() => {
        /* abaikan: status dapat disinkronkan seller */
      });
    }
    clearCart();
    setDeclared(true);
    router.push("/pembayaran/berhasil");
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-slate-500">
          <Link href="/beranda" className="hover:text-navy-900">
            {t("home")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{t("pay.payment")}</span>
        </nav>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Panel utama */}
          <div className="space-y-5">
            {/* Status */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-500" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900">
                    {t("pay.waiting")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("pay.willCancel", { orderId: detail.orderId })}
                  </p>

                  {/* Timer */}
                  <div
                    className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold ${
                      warning ? "bg-red-50 text-red-600" : "bg-blue-50 text-brand-blue"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="tabular-nums">
                      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
                      {String(seconds).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metode pembayaran */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <CreditCard className="h-4 w-4 text-brand-blue" />
                <h2 className="text-sm font-semibold text-navy-900">{t("pay.method")}</h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5">
                    <img
                      src={paymentLogo(detail.paymentMethod)}
                      alt={detail.paymentMethod}
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      {detail.paymentMethod}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isBank
                        ? t("pay.virtualAccount")
                        : isQris
                        ? t("pay.allApps")
                        : t("pay.digitalWallet")}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-slate-400">{t("pay.totalPaid")}</p>
                    <p className="text-lg font-bold text-brand-blue">
                      {formatRupiah(detail.total)}
                    </p>
                  </div>
                </div>

                {detail.items.length > 0 && (
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">{t("pay.itemDetail")}</p>
                    {detail.items.map((item) => (
                      <p key={item.id} className="mt-1 text-xs text-navy-900">
                        {item.qty}× {item.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nomor yang harus dibayar */}
            <div className="rounded-2xl border border-brand-blue/30 bg-blue-50/50 p-5 shadow-card">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
                {isBank ? (
                  <>
                    <Landmark className="h-3.5 w-3.5" /> {t("pay.vaNumber")}
                  </>
                ) : isQris ? (
                  <>
                    <QrCode className="h-3.5 w-3.5" /> {t("pay.scanQr")}
                  </>
                ) : (
                  <>
                    <Smartphone className="h-3.5 w-3.5" /> {t("pay.paymentCode")}
                  </>
                )}
              </p>

              {isBank ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="select-all text-xl font-bold tracking-wide text-navy-900 sm:text-2xl">
                    {va}
                  </span>
                  <button
                    onClick={() => copy(va, "va")}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {copied === "va" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "va" ? t("pay.copied") : t("pay.copy")}
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-4">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <QrSvg seed={detail.orderId + detail.paymentMethod} className="h-36 w-36 sm:h-44 sm:w-44" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-900">
                      {isQris ? t("pay.elektromartQr") : t("pay.qrWithMethod", { method: detail.paymentMethod })}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("pay.qrHint", {
                        app: isQris ? t("pay.paymentApp") : t("pay.app"),
                      })}
                    </p>
                    <button
                      onClick={() =>
                        copy(
                          code,
                          "qr"
                        )
                      }
                      className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                    >
                      {copied === "qr" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {t("pay.copyCode", { code })}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {t("pay.validUntil", {
                  date: new Date(detail.expiresAt).toLocaleString(language === "id" ? "id-ID" : "en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </p>
            </div>

            {/* Kontak bantuan */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                <HelpCircle className="h-5 w-5" />
              </span>
              <p className="text-xs text-slate-500">
                {t("pay.needHelp")}
              </p>
            </div>
          </div>

          {/* Sidebar kanan */}
          <div className="space-y-5">
            {/* Tombol bayar */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-navy-900">{t("pay.alreadyPaidTitle")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("pay.alreadyPaidDesc")}
              </p>
              <button
                onClick={handlePaid}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> {t("pay.yesPaid")}
              </button>
              <Link
                href="/bantuan"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-slate-50"
              >
                {t("pay.needCs")}
              </Link>
            </div>

            {/* Instruksi pembayaran */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <div className="border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <p className="text-sm font-semibold text-navy-900">
                  {isQris ? t("pay.instructions") : t("pay.howToPay")}
                </p>
              </div>
              <div className="p-5">
                {isBank ? (
                  <div className="space-y-4">
                    {bankSteps(detail.paymentMethod, t).map((section, i) => (
                      <div key={i}>
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
                          {section.title}
                        </p>
                        <ol className="mt-2 space-y-2">
                          {section.steps.map((step, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2.5 text-sm text-slate-600"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-brand-blue">
                                {j + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                ) : isQris ? (
                  <ol className="space-y-2.5">
                    {[
                      t("pay.qris1"),
                      t("pay.qris2"),
                      t("pay.qris3"),
                      t("pay.qris4"),
                    ].map((step, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-red-600">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ol className="space-y-2.5">
                    {eWalletSteps(detail.paymentMethod, t).map((step, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-brand-blue">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Detail pesanan */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <div className="border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <p className="text-sm font-semibold text-navy-900">{t("pay.orderDetail")}</p>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("pay.orderNo")}</span>
                  <span className="font-semibold text-navy-900">{detail.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("pay.subtotal")}</span>
                  <span className="font-medium text-navy-900">
                    {formatRupiah(detail.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("pay.shipping")}</span>
                  <span className="font-medium text-navy-900">
                    {detail.shippingFee > 0 ? formatRupiah(detail.shippingFee) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("pay.shippingInsurance")}</span>
                  <span className="font-medium text-navy-900">
                    {formatRupiah(detail.insuranceFee)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <span className="font-semibold text-navy-900">{t("pay.totalPayment")}</span>
                  <span className="text-lg font-bold text-brand-blue">
                    {formatRupiah(detail.total)}
                  </span>
                </div>

                <div className="mt-2 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Tag className="h-3.5 w-3.5" /> {detail.courier}
                  </div>
                  <p className="leading-relaxed text-slate-500">
                    {t("pay.shippedTo")} <span className="font-medium text-navy-900">{detail.address}</span>
                  </p>
                  <div className="flex items-start gap-2 text-slate-500">
                    <span className="mt-0.5 flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1">
                      <img
                        src={paymentLogo(detail.paymentMethod)}
                        alt={detail.paymentMethod}
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <div>
                      <p className="font-medium text-navy-900">{detail.paymentMethod}</p>
                      <p className="text-xs text-slate-400">
                        {isBank ? t("pay.vaShort", { code: va }) : isQris ? "QRIS" : t("pay.codeShort", { code })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t("pay.cancelWarning")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Footer />
      </div>
    </main>
  );
}