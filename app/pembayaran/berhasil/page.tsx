"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Package,
  ReceiptText,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { formatRupiah } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";
import { refreshLiveProducts } from "@/hooks/useLiveProducts";
import ShippingBreakdownPanel from "@/components/checkout/ShippingBreakdown";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { checkoutDetail, hydrated } = useCart();
  const [countdown, setCountdown] = useState(10);
  const [note, setNote] = useState("");

  useEffect(() => {
    refreshLiveProducts();
    if (!hydrated) return;
    if (!checkoutDetail) {
      router.replace("/beranda");
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/beranda");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkoutDetail, hydrated, router]);

  useEffect(() => {
    const approved = [t("success.note1"), t("success.note2"), t("success.note3")];
    setNote(approved[Math.floor(Math.random() * approved.length)]);
  }, [t]);

  if (!checkoutDetail) return null;
  const detail = checkoutDetail;

  const steps = [
    {
      icon: Package,
      title: t("success.orderCreated"),
      desc: t("success.waitingSeller"),
      done: true,
    },
    {
      icon: Truck,
      title: t("success.shipping"),
      desc: t("success.waitingShip"),
      done: false,
    },
    {
      icon: Home,
      title: t("success.delivered"),
      desc: t("success.etaWorkdays"),
      done: false,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Pesan utama */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">
            {t("success.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{note}</p>
          <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {t("pay.orderNo")} {detail.orderId}
          </span>
        </div>

        {/* Perjalanan pesanan: satu kartu, tiga langkah tersambung */}
        <div className="mt-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="relative grid grid-cols-3">
            <span className="absolute left-[16.6667%] right-[16.6667%] top-4 h-0.5 bg-slate-200" />
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative flex flex-col items-center px-1 text-center">
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      step.done
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-50"
                        : "border-2 border-slate-200 bg-white text-slate-300"
                    }`}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <p className={`mt-2 text-xs font-semibold ${step.done ? "text-emerald-700" : "text-slate-700"}`}>
                    {step.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ringkasan pesanan + info pengiriman */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <ReceiptText className="h-4 w-4 text-brand-blue" />
              <h2 className="text-sm font-semibold text-navy-900">{t("checkout.orderSummary")}</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {detail.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-lg border border-slate-100 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-navy-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatRupiah(item.price)} × {item.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-navy-900">
                    {formatRupiah(item.price * item.qty)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("pay.subtotal")}</span>
                <span className="font-medium text-navy-900">{formatRupiah(detail.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("success.shippingWith", { courier: detail.courier })}</span>
                <span className="font-medium text-navy-900">
                  {detail.shippingFee > 0 ? formatRupiah(detail.shippingFee) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("pay.shippingInsurance")}</span>
                <span className="font-medium text-navy-900">
                  {detail.insuranceSelected === false ? "-" : formatRupiah(detail.insuranceFee)}
                </span>
              </div>
              {(detail.packingFee || 0) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("checkout.packing")}</span>
                  <span className="font-medium text-navy-900">{formatRupiah(detail.packingFee || 0)}</span>
                </div>
              ) : null}
              <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                <span className="font-semibold text-navy-900">{t("success.totalPaid")}</span>
                <span className="text-3xl font-extrabold text-brand-blue sm:text-4xl">
                  {formatRupiah(detail.total)}
                </span>
              </div>
            </div>

            <ShippingBreakdownPanel
              breakdown={detail.shippingBreakdown}
              className="mt-4"
              collapsible
              hideTitle
            />
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-blue" />
                <p className="text-sm font-semibold text-navy-900">{t("order.shippingAddress")}</p>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">{detail.address}</p>
              <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {t("success.via", { courier: detail.courier })}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-blue" />
                <p className="text-sm font-semibold text-navy-900">{t("success.payment")}</p>
              </div>
              <p className="mt-3 text-xs font-medium text-navy-900">{detail.paymentMethod}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{t("success.escrow")}</p>
            </div>
          </div>
        </div>

        {/* Aksi: satu tombol utama */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={detail.orderDbId ? `/lacak/${detail.orderDbId}` : "/profil"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Truck className="h-4 w-4" /> {t("lacakPesanan")}
          </Link>
          <Link
            href="/kategori/semua"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-slate-50"
          >
            {t("success.continueShop")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          {t("success.redirectTo")} {countdown} {t("success.seconds")}…
        </p>
      </div>

      <div className="mt-10">
        <Footer />
      </div>
    </main>
  );
}
