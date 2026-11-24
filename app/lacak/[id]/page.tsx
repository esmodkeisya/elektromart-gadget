"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MapPin,
  Package,
  ReceiptText,
  Truck,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, type OrderRecord, type OrderTrackingEvent } from "@/lib/api";
import { formatRupiah } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { labelKey: string; cls: string }> = {
  waiting_payment: { labelKey: "profile.orderWaitingPayment", cls: "bg-[#FDECEC] text-[#E11D48]" },
  paid: { labelKey: "profile.orderPreparing", cls: "bg-[#E8F0FE] text-[#2563EB]" },
  shipped: { labelKey: "profile.orderShipped", cls: "bg-[#FFF4E5] text-[#D97706]" },
  completed: { labelKey: "profile.orderCompleted", cls: "bg-[#E9F8EF] text-[#16A34A]" },
  cancelled: { labelKey: "profile.orderCancelled", cls: "bg-[#EEF1F6] text-slate-500" },
};

const STEP_META = [
  { code: "waiting_payment", icon: ReceiptText, labelKey: "track.stepCreated" },
  { code: "paid", icon: Clock, labelKey: "track.stepPaid" },
  { code: "shipped", icon: Truck, labelKey: "track.stepShipped" },
  { code: "completed", icon: Home, labelKey: "track.stepCompleted" },
];

const EVENT_LABEL: Record<string, string> = {
  order_created: "track.eventCreated",
  payment_confirmed: "track.eventPaid",
  processing: "track.eventProcessing",
  shipped: "track.eventShipped",
  in_transit: "track.eventInTransit",
  completed: "track.eventCompleted",
  cancelled: "track.eventCancelled",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrackOrderPage() {
  const params = useParams<{ id: string }>();
  const { t } = useLanguage();
  const orderId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [events, setEvents] = useState<OrderTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    setLoading(true);
    setError("");
    api<{ order: OrderRecord; events: OrderTrackingEvent[] }>(`/api/orders/${orderId}/tracking`)
      .then((data) => {
        if (!alive) return;
        setOrder(data.order);
        setEvents(data.events || []);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : t("track.loadFailed"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId, t]);

  const status = useMemo(() => {
    if (!order) return null;
    return STATUS_STYLES[order.status] || { labelKey: "admin.orders", cls: "bg-slate-100 text-slate-600" };
  }, [order]);

  const currentStep = useMemo(() => {
    if (!order || order.status === "cancelled") return -1;
    const index = STEP_META.findIndex((step) => step.code === order.status);
    return index >= 0 ? index : 0;
  }, [order]);

  const timeline = useMemo(() => [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [events]);

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/profil"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> {t("track.back")}
        </Link>

        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
            <p className="text-sm">{t("track.loading")}</p>
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-card">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-400" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-navy-900">{t("track.notFoundTitle")}</h1>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <Link
              href="/profil"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t("track.backToOrders")}
            </Link>
          </div>
        ) : order ? (
          <>
            {/* Header */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("track.orderNumber")}</p>
                  <h1 className="mt-1 text-xl font-bold text-navy-900">{order.order_number}</h1>
                  <p className="mt-1 text-xs text-slate-400">
                    {t("track.orderedAt", { date: formatDateTime(order.created_at) })}
                  </p>
                </div>
                {status ? (
                  <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${status.cls}`}>{t(status.labelKey)}</span>
                ) : null}
              </div>

              {/* Step progress: satu garis utuh dari langkah pertama hingga terakhir */}
              {order.status === "cancelled" ? (
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#E11D48]">
                  <XCircle className="h-4 w-4" />
                  {t("track.cancelledNotice")}
                </div>
              ) : (
                <div className="mt-8">
                  <div className="relative grid grid-cols-4">
                    <span className="absolute left-[12.5%] right-[12.5%] top-4 h-0.5 bg-slate-200" />
                    {currentStep > 0 ? (
                      <span
                        className="absolute left-[12.5%] top-4 h-0.5 bg-brand-blue"
                        style={{ width: `${(currentStep / (STEP_META.length - 1)) * 75}%` }}
                      />
                    ) : null}
                    {STEP_META.map((step, index) => {
                      const done = index < currentStep;
                      const current = index === currentStep;
                      const Icon = step.icon;
                      return (
                        <div key={step.code} className="relative flex flex-col items-center text-center">
                          <span
                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              done
                                ? "border-brand-blue bg-brand-blue text-white"
                                : current
                                  ? "border-brand-blue bg-white text-brand-blue ring-4 ring-blue-100"
                                  : "border-slate-200 bg-white text-slate-300"
                            }`}
                          >
                            {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </span>
                          <p
                            className={`mt-2 text-[11px] font-semibold ${
                              current ? "text-brand-blue" : done ? "text-navy-900" : "text-slate-400"
                            }`}
                          >
                            {t(step.labelKey)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 grid items-start gap-5 lg:grid-cols-5">
              {/* Kolom kiri: riwayat, produk, dan rincian biaya */}
              <div className="space-y-5 lg:col-span-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <h2 className="text-sm font-bold text-navy-900">{t("track.timelineTitle")}</h2>
                  {timeline.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">{t("track.timelineEmpty")}</p>
                  ) : (
                    <ol className="mt-5 space-y-1">
                      {timeline.map((event, index) => {
                        const isLatest = index === 0;
                        return (
                          <li key={event.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                  isLatest ? "bg-brand-blue text-white ring-4 ring-blue-100" : "bg-blue-50 text-brand-blue"
                                }`}
                              >
                                <Check className="h-4 w-4" />
                              </span>
                              {index < timeline.length - 1 ? <span className="my-1 w-0.5 flex-1 bg-blue-100" /> : null}
                            </div>
                            <div className={`flex-1 ${index < timeline.length - 1 ? "pb-5" : ""}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className={`text-sm ${isLatest ? "font-bold text-navy-900" : "font-medium text-slate-700"}`}>
                                  {EVENT_LABEL[event.code] ? t(EVENT_LABEL[event.code]) : event.code}
                                </p>
                                <span className="text-[11px] text-slate-400">{formatDateTime(event.created_at)}</span>
                              </div>
                              {event.location ? (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                  <MapPin className="h-3 w-3" /> {event.location}
                                </p>
                              ) : null}
                              {event.meta?.sellerNote ? <p className="mt-0.5 text-xs text-slate-500">{event.meta.sellerNote}</p> : null}
                              {event.meta?.reason ? <p className="mt-0.5 text-xs text-slate-500">{event.meta.reason}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                {/* Items & total: langsung di bawah riwayat pengiriman */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <h2 className="text-sm font-bold text-navy-900">{t("track.itemsTitle")}</h2>
                  <ul className="mt-4 space-y-3">
                    {(order.items || []).map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        {item.product_image ? (
                          <img src={item.product_image} alt="" className="h-12 w-12 rounded-lg border border-slate-100 object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50">
                            <Package className="h-5 w-5 text-slate-300" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-navy-900">{item.product_name}</p>
                          <p className="text-xs text-slate-400">
                            {formatRupiah(item.price)} × {item.qty}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-navy-900">{formatRupiah(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t("track.subtotal")}</span>
                      <span className="font-medium text-navy-900">{formatRupiah(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t("track.shippingFee")}</span>
                      <span className="font-medium text-navy-900">{order.shipping_fee > 0 ? formatRupiah(order.shipping_fee) : "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t("track.insuranceFee")}</span>
                      <span className="font-medium text-navy-900">{order.insurance_fee > 0 ? formatRupiah(order.insurance_fee) : "-"}</span>
                    </div>
                    {(order.packing_fee || 0) > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t("track.packingFee")}</span>
                        <span className="font-medium text-navy-900">{formatRupiah(order.packing_fee || 0)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-slate-100 pt-2">
                      <span className="font-semibold text-navy-900">{t("track.total")}</span>
                      <span className="text-lg font-bold text-brand-blue">{formatRupiah(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courier + address: ringkas dan melekat di bawah navigasi */}
              <div className="space-y-5 lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-brand-blue" />
                    <h2 className="text-sm font-bold text-navy-900">{t("track.shippingTitle")}</h2>
                  </div>
                  <dl className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">{t("track.courier")}</dt>
                      <dd className="text-right font-medium text-navy-900">{order.courier || "-"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">{t("track.trackingNumber")}</dt>
                      <dd className="text-right font-medium text-navy-900">{order.tracking_number || t("track.notAvailable")}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">{t("track.eta")}</dt>
                      <dd className="text-right font-medium text-navy-900">{order.shipping_eta || t("track.notAvailable")}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">{t("track.zone")}</dt>
                      <dd className="text-right font-medium text-navy-900">{order.shipping_region || "-"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-blue" />
                    <h2 className="text-sm font-bold text-navy-900">{t("track.addressTitle")}</h2>
                  </div>
                  {order.shipping_address ? (
                    <div className="mt-3 text-xs leading-relaxed text-slate-600">
                      <p className="font-semibold text-navy-900">{order.shipping_address.recipient}</p>
                      <p>{order.shipping_address.phone}</p>
                      <p className="mt-1">{order.shipping_address.address}</p>
                      <p>
                        {[order.shipping_address.city, order.shipping_address.province, order.shipping_address.postal]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">{t("track.notAvailable")}</p>
                  )}
                </div>
              </div>
            </div>

            {order.status === "waiting_payment" ? (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-amber-800">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{t("track.waitingPaymentNotice")}</p>
                </div>
                <Link
                  href="/profil"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> {t("track.payNow")}
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  );
}
