"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Package,
  Truck,
  User,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { api, type OrderRecord } from "@/lib/api";
import { useApiData, mutateApi } from "@/hooks/useApiData";
import { formatRupiah } from "@/lib/data";
import TopBar from "../components/TopBar";

type TabId = "all" | "need_ship" | "shipped" | "done" | "cancelled";

const TAB_STATUS: Record<TabId, string[]> = {
  all: [],
  need_ship: ["waiting_payment", "paid"],
  shipped: ["shipped"],
  done: ["completed"],
  cancelled: ["cancelled"],
};

const TAB_LABEL: Record<TabId, string> = {
  all: "seller.allOrders",
  need_ship: "seller.needShipment",
  shipped: "seller.shipped",
  done: "admin.done",
  cancelled: "seller.cancelled",
};

const STATUS_LABEL: Record<string, string> = {
  waiting_payment: "seller.orderWaitingPayment",
  paid: "seller.orderNeedProcessing",
  shipped: "seller.shipped",
  completed: "admin.done",
  cancelled: "seller.cancelled",
};

const STATUS_STYLE: Record<string, string> = {
  waiting_payment: "bg-[#FFF4E5] text-[#D97706]",
  paid: "bg-[#E8F0FE] text-[#2563EB]",
  shipped: "bg-[#EEF2FF] text-[#4F46E5]",
  completed: "bg-[#E9F8EF] text-[#16A34A]",
  cancelled: "bg-[#EEF1F6] text-seller-muted",
};

const COURIERS = ["JNE Reguler", "J&T Express", "SiCepat REG", "AnterAja", "GoSend Same Day"];
const ETA_KEYS = ["seller.etaToday", "seller.etaFast", "seller.etaDays", "seller.etaSlow"];

const PAGE_SIZE = 5;

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${STATUS_STYLE[status] || "bg-[#EEF1F6] text-seller-muted"}`}>
      {t(STATUS_LABEL[status] || status)}
    </span>
  );
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function defaultDeadline(): string {
  const d = new Date(Date.now() + 3 * 86400000);
  return d.toISOString().slice(0, 10);
}

function ShipModal({
  order,
  busy,
  onClose,
  onConfirm,
}: {
  order: OrderRecord;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payload: Record<string, unknown>) => void;
}) {
  const { t, language } = useLanguage();
  const isUpdate = order.status === "shipped";
  const items = useMemo(
    () => (order.items || []).filter((i) => i.product_id || i.product_name),
    [order.items]
  );
  const insufficient = items.some(
    (i) => typeof i.product_stock === "number" && i.product_stock < i.qty
  );

  const [courier, setCourier] = useState(order.courier && COURIERS.includes(order.courier) ? order.courier : COURIERS[0]);
  const [tracking, setTracking] = useState(order.tracking_number || "");
  const [deadline, setDeadline] = useState(toDateInput(order.shipping_deadline) || defaultDeadline());
  const [eta, setEta] = useState(order.shipping_eta || t("seller.etaDays"));

  const submit = () => {
    onConfirm({
      status: "shipped",
      courier,
      tracking_number: tracking.trim(),
      shipping_deadline: deadline ? new Date(deadline + "T09:00:00").toISOString() : null,
      shipping_eta: eta,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-seller-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EEF1F6] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-seller-ink">
              {isUpdate ? t("seller.updateShipping") : t("seller.processOrderTitle")}
            </h2>
            <p className="text-sm text-seller-muted">{order.order_number}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-seller-muted hover:bg-[#F4F6FA]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {!isUpdate && <p className="rounded-xl bg-[#F3F7FF] px-4 py-3 text-sm text-seller-ink">{t("seller.processOrderNote")}</p>}

          {!isUpdate && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-seller-ink">
                <Package size={16} /> {t("seller.stockCheck")}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const lack = typeof item.product_stock === "number" && item.product_stock < item.qty;
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#E8ECF3] p-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F4F6FA]">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} className="h-full w-full object-contain" />
                        ) : (
                          <Package size={18} className="text-seller-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-seller-ink">{item.product_name}</p>
                        <p className="text-xs text-seller-muted">
                          {t("seller.stockRequested")}: {item.qty} &middot; {t("seller.stockAvailable")}:{" "}
                          <span className={lack ? "font-bold text-[#E11D48]" : "font-semibold text-[#16A34A]"}>
                            {typeof item.product_stock === "number" ? item.product_stock : "-"}
                          </span>
                        </p>
                      </div>
                      {lack ? <AlertTriangle size={18} className="text-[#E11D48]" /> : <CheckCircle2 size={18} className="text-[#16A34A]" />}
                    </div>
                  );
                })}
              </div>
              <p className={`mt-3 text-sm ${insufficient ? "font-medium text-[#E11D48]" : "text-[#16A34A]"}`}>
                {insufficient ? t("seller.stockInsufficient") : t("seller.stockSufficient")}
              </p>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-seller-ink">{t("seller.shippingMethod")}</span>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E4E8F1] bg-white px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
              >
                {COURIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-seller-ink">{t("seller.trackingNumber")}</span>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder={t("seller.trackingPlaceholder")}
                className="h-11 w-full rounded-xl border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-seller-ink">{t("seller.shipmentDeadlineLabel")}</span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-seller-ink">{t("seller.shipmentEtaLabel")}</span>
              <select
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E4E8F1] bg-white px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
              >
                {ETA_KEYS.map((k) => (
                  <option key={k} value={t(k)}>
                    {t(k)}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#EEF1F6] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E4E8F1] px-4 py-2.5 text-sm font-semibold text-seller-ink">
            {t("seller.close")}
          </button>
          <button
            type="button"
            disabled={busy || (!isUpdate && insufficient)}
            onClick={submit}
            className="flex items-center gap-2 rounded-xl bg-seller-navy px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {isUpdate ? t("seller.saveShipping") : t("seller.confirmShip")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  order,
  busy,
  onClose,
  onConfirm,
}: {
  order: OrderRecord;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-seller-ink/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EEF1F6] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-seller-ink">{t("seller.cancelOrder")}</h2>
            <p className="text-sm text-seller-muted">{order.order_number}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-seller-muted hover:bg-[#F4F6FA]">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-seller-ink">{t("seller.cancelReasonLabel")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t("seller.cancelReasonPlaceholder")}
              className="w-full rounded-xl border border-[#E4E8F1] px-3 py-2 text-sm text-seller-ink outline-none focus:border-seller-navy"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#EEF1F6] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E4E8F1] px-4 py-2.5 text-sm font-semibold text-seller-ink">
            {t("seller.close")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(reason.trim())}
            className="flex items-center gap-2 rounded-xl bg-[#E11D48] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {t("seller.confirmCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { t, language } = useLanguage();
  const { data, error: fetchError, isLoading } = useApiData<{ orders: OrderRecord[] }>("/api/orders");
  const orders = data?.orders ?? null;
  const loading = isLoading && !data;
  const loadFailed = Boolean(fetchError);
  const [activeTab, setActiveTab] = useState<TabId>("need_ship");
  const [query, setQuery] = useState("");
  const [courierFilter, setCourierFilter] = useState("all");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const [shipTarget, setShipTarget] = useState<OrderRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const locale = language === "id" ? "id-ID" : "en-US";

  const formatDate = useCallback(
    (value: string) =>
      new Date(value).toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale]
  );

  const load = useCallback(async () => {
    await mutateApi("/api/orders");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, query, courierFilter, sortNewest]);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: 0, need_ship: 0, shipped: 0, done: 0, cancelled: 0 };
    (orders || []).forEach((o) => {
      c.all += 1;
      (Object.keys(TAB_STATUS) as TabId[]).forEach((tab) => {
        if (tab !== "all" && TAB_STATUS[tab].includes(o.status)) c[tab] += 1;
      });
    });
    return c;
  }, [orders]);

  const courierOptions = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (o.courier) set.add(o.courier);
    });
    return [...set].sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const statuses = TAB_STATUS[activeTab];
    let list = (orders || []).filter((o) => statuses.length === 0 || statuses.includes(o.status));
    if (courierFilter !== "all") list = list.filter((o) => o.courier === courierFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const buyer = (o.buyer?.full_name || o.shipping_address?.recipient || "").toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          buyer.includes(q) ||
          (o.tracking_number || "").toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortNewest ? db - da : da - db;
    });
  }, [orders, activeTab, courierFilter, query, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const patchOrder = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setBusyId(id);
      try {
        const res = await api<{ order: OrderRecord }>(`/api/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        await mutateApi(
          "/api/orders",
          (current?: { orders: OrderRecord[] }) => {
            if (!current?.orders) return current;
            const nextOrders = current.orders.map((o) => {
              if (o.id !== id) return o;
              const stockById = new Map(
                (o.items || []).map((i) => [i.product_id, { product_stock: i.product_stock, product_status: i.product_status }])
              );
              const mergedItems = (res.order.items || o.items || []).map((i) => ({
                ...i,
                ...(i.product_id ? stockById.get(i.product_id) || {} : {}),
              }));
              return { ...o, ...res.order, items: mergedItems };
            });
            return { ...current, orders: nextOrders };
          },
          { revalidate: false }
        );
        setToast({ kind: "ok", msg: t("seller.orderSaved") });
        void mutateApi("/api/orders");
      } catch (error) {
        setToast({ kind: "err", msg: error instanceof Error ? error.message : t("seller.orderActionFailed") });
      } finally {
        setBusyId(null);
      }
    },
    [t]
  );

  const confirmShip = async (payload: Record<string, unknown>) => {
    if (!shipTarget) return;
    const id = shipTarget.id;
    setShipTarget(null);
    await patchOrder(id, payload);
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    setCancelTarget(null);
    await patchOrder(id, { status: "cancelled", cancel_reason: reason || null });
  };

  const tabs = (Object.keys(TAB_STATUS) as TabId[]).map((id) => ({ id, labelKey: TAB_LABEL[id], count: counts[id] }));

  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <TopBar placeholder={t("seller.searchOrdersBuyers")} />

      <div className="px-8 pb-10 pt-4">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{t("seller.orderManagement")}</h1>
          <p className="mt-1 text-sm text-seller-muted">{t("seller.orderManagementSubtitle")}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-6 overflow-x-auto border-b border-[#EEF1F6]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-[3px] pb-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id ? "border-seller-navy text-seller-navy" : "border-transparent text-seller-muted hover:text-seller-ink"
                }`}
              >
                {t(tab.labelKey)}
                {tab.count > 0 && tab.id !== "all" ? (
                  <span className="rounded-full bg-seller-orange px-2 py-0.5 text-[11px] font-bold text-white">{tab.count}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("seller.searchOrdersBuyers")}
              className="h-11 w-full rounded-xl border border-[#E4E8F1] px-4 text-sm text-seller-ink outline-none focus:border-seller-navy sm:w-72"
            />
            <div className="relative">
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="h-11 appearance-none rounded-xl border border-[#E4E8F1] bg-[#F3F7FF] pl-4 pr-10 text-sm font-medium text-seller-ink outline-none"
              >
                <option value="all">{t("seller.allCouriers")}</option>
                {courierOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-seller-muted" />
            </div>
            <div className="relative">
              <select
                value={sortNewest ? "newest" : "oldest"}
                onChange={(e) => setSortNewest(e.target.value === "newest")}
                className="h-11 appearance-none rounded-xl border border-[#E4E8F1] bg-[#F3F7FF] pl-4 pr-10 text-sm font-medium text-seller-ink outline-none"
              >
                <option value="newest">{t("seller.sortNewest")}</option>
                <option value="oldest">{t("seller.sortOldest")}</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-seller-muted" />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-seller-muted">
              <Loader2 size={26} className="animate-spin" />
            </div>
          ) : loadFailed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <AlertTriangle size={28} className="text-[#E11D48]" />
              <p className="text-sm text-seller-muted">{t("seller.loadFailed")}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl bg-seller-navy px-4 py-2.5 text-sm font-semibold text-white"
              >
                {t("seller.retry")}
              </button>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Package size={34} className="text-seller-muted" />
              <p className="font-semibold text-seller-ink">{t("seller.noOrders")}</p>
              <p className="text-sm text-seller-muted">{orders && orders.length ? t("seller.noOrdersTab") : t("seller.noOrdersDesc")}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {paged.map((o) => {
                  const itemCount = (o.items || []).reduce((sum, i) => sum + i.qty, 0);
                  const canProcess = o.status === "waiting_payment" || o.status === "paid";
                  const addr = o.shipping_address;
                  return (
                    <div key={o.id} className="rounded-xl border border-[#E8ECF3] p-5 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm text-seller-muted">
                          <FileText size={14} />
                          <span className="font-medium text-seller-ink">{o.order_number}</span>
                          <span className="text-[#D0D5E0]">|</span>
                          {formatDate(o.created_at)}
                        </span>
                        <StatusPill status={o.status} />
                      </div>

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          {(o.items || []).map((item) => (
                            <div key={item.id} className="flex items-center gap-4">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F4F6FA]">
                                {item.product_image ? (
                                  <img src={item.product_image} alt={item.product_name} className="h-full w-full object-contain" />
                                ) : (
                                  <Package size={20} className="text-seller-muted" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-seller-ink">{item.product_name}</p>
                                <p className="text-sm text-seller-muted">
                                  {item.qty}x {formatRupiah(item.price)}
                                </p>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-seller-muted">{t("seller.itemsCount", { count: itemCount })}</p>
                        </div>

                        <div className="w-full space-y-1.5 border-[#EEF1F6] text-sm text-seller-ink lg:w-72 lg:border-l lg:pl-5">
                          <p className="flex items-center gap-2 font-medium">
                            <User size={14} className="shrink-0 text-seller-muted" />
                            {o.buyer?.full_name || addr?.recipient || "-"}
                          </p>
                          {(o.buyer?.phone || addr?.phone) && (
                            <p className="pl-6 text-xs text-seller-muted">{o.buyer?.phone || addr?.phone}</p>
                          )}
                          {addr && (addr.city || addr.address) && (
                            <p className="flex items-start gap-2 text-xs text-seller-muted">
                              <MapPin size={14} className="mt-0.5 shrink-0" />
                              <span>
                                {[addr.recipient, addr.address, addr.city, addr.province, addr.postal].filter(Boolean).join(", ")}
                              </span>
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <Truck size={14} className="shrink-0 text-seller-muted" />
                            {o.courier || "-"}
                          </p>
                          <p className="flex items-center gap-2 text-xs text-seller-muted">
                            <CreditCard size={14} className="shrink-0" />
                            {o.payment_method || "-"}
                          </p>
                          {o.tracking_number ? (
                            <p className="text-xs text-seller-muted">
                              {t("seller.resi")}: <span className="font-medium text-seller-ink">{o.tracking_number}</span>
                            </p>
                          ) : null}
                          {o.status === "shipped" && o.shipping_deadline ? (
                            <p className="text-xs text-seller-muted">
                              {t("seller.deadline")}: {toDateInput(o.shipping_deadline)}
                              {o.shipping_eta ? ` (${o.shipping_eta})` : ""}
                            </p>
                          ) : null}
                          {o.status === "shipped" && o.shipped_at ? (
                            <p className="text-xs text-seller-muted">{t("seller.shippedOn", { date: formatDate(o.shipped_at) })}</p>
                          ) : null}
                          {o.status === "shipped" ? (
                            <p className="text-xs font-medium text-[#D97706]">{t("seller.awaitingBuyerConfirm")}</p>
                          ) : null}
                          {o.status === "cancelled" && o.cancel_reason ? (
                            <p className="text-xs text-[#E11D48]">{t("seller.cancelReasonShown", { reason: o.cancel_reason })}</p>
                          ) : null}
                        </div>

                        <div className="flex w-full items-end justify-between gap-4 border-[#EEF1F6] lg:w-auto lg:flex-col lg:items-end lg:border-l lg:pl-5">
                          <div className="text-right">
                            <p className="text-xs text-seller-muted">{t("admin.totalSpend")}</p>
                            <p className="text-base font-bold text-seller-ink">{formatRupiah(o.total)}</p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {canProcess && (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === o.id}
                                  onClick={() => setShipTarget(o)}
                                  className="flex items-center gap-1.5 rounded-lg bg-seller-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                  {busyId === o.id && <Loader2 size={14} className="animate-spin" />}
                                  {t("seller.processAndShip")}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === o.id}
                                  onClick={() => setCancelTarget(o)}
                                  className="rounded-lg border border-[#E4E8F1] px-4 py-2 text-sm font-semibold text-[#E11D48] disabled:opacity-50"
                                >
                                  {t("seller.cancelOrder")}
                                </button>
                              </>
                            )}

                            {o.status === "shipped" && (
                              <button
                                type="button"
                                disabled={busyId === o.id}
                                onClick={() => setShipTarget(o)}
                                className="rounded-lg border border-[#E4E8F1] px-4 py-2 text-sm font-semibold text-seller-ink disabled:opacity-50"
                              >
                                {t("seller.updateShipping")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-seller-muted">
                <span>{t("seller.showingRange", { from: (currentPage - 1) * PAGE_SIZE + 1, to: (currentPage - 1) * PAGE_SIZE + paged.length, total: filtered.length })}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8F1] bg-white text-seller-ink disabled:opacity-40"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          p === currentPage ? "bg-seller-navy text-white" : "border border-[#E4E8F1] bg-white text-seller-ink"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8F1] bg-white text-seller-ink disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {shipTarget && (
        <ShipModal order={shipTarget} busy={busyId === shipTarget.id} onClose={() => setShipTarget(null)} onConfirm={confirmShip} />
      )}
      {cancelTarget && (
        <CancelModal order={cancelTarget} busy={busyId === cancelTarget.id} onClose={() => setCancelTarget(null)} onConfirm={confirmCancel} />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.kind === "ok" ? "bg-[#16A34A]" : "bg-[#E11D48]"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
