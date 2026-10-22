"use client";

import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Package,
  Percent,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import TopBar from "../components/TopBar";
import { type ProductRecord } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { formatRupiah } from "@/lib/data";

interface StatCard {
  labelKey: string;
  value: string;
  change: string;
  changeUp: boolean;
  icon: typeof CreditCard;
  iconWrap: string;
}

interface WeekPoint {
  day: string;
  key: string;
  value: number;
}

interface SellerStats {
  products: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  totalRevenue: number;
  totalOrders: number;
  activeOrders: number;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { data } = useApiData<{
    stats: SellerStats;
    weekly?: WeekPoint[];
    recentProducts?: ProductRecord[];
  }>("/api/dashboard/seller");
  const apiStats: SellerStats = data?.stats ?? {
    products: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    totalRevenue: 0,
    totalOrders: 0,
    activeOrders: 0,
  };
  const weekly: WeekPoint[] = data?.weekly ?? [];
  const recentProducts: ProductRecord[] = data?.recentProducts ?? [];

  const stats: StatCard[] = [
    { labelKey: "seller.totalSales", value: formatRupiah(apiStats.totalRevenue), change: `${apiStats.totalOrders} ${t("seller.orders")}`, changeUp: true, icon: CreditCard, iconWrap: "bg-[#E8EEF8] text-[#3B5B8C]" },
    { labelKey: "seller.activeOrders", value: "0", change: t("admin.fromDatabase"), changeUp: true, icon: Truck, iconWrap: "bg-[#FFF1E6] text-[#D97706]" },
    { labelKey: "seller.myProducts", value: String(apiStats.products), change: `${apiStats.active} ${t("admin.active")}`, changeUp: true, icon: Package, iconWrap: "bg-[#EEF1F6] text-[#64748B]" },
    { labelKey: "seller.outOfStock", value: String(apiStats.outOfStock), change: `${apiStats.lowStock} ${t("seller.lowStockShort")}`, changeUp: false, icon: Percent, iconWrap: "bg-[#E8EEF8] text-[#3B5B8C]" },
  ];

  const totalDays = weekly.length ? weekly.reduce((sum, w) => sum + w.value, 0) : 0;
  const peakValue = Math.max(...(weekly.length ? weekly.map((w) => w.value) : [0]), 1);
  const peakIndex = weekly.findIndex((w) => w.value === peakValue);
  const todayLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const fmtJt = (v: number) => (v >= 1e6 ? `Rp ${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}Jt` : v >= 1000 ? `Rp ${Math.round(v / 1000)}rb` : `Rp ${v}`);
  const yTicks = [peakValue, peakValue * 0.75, peakValue * 0.5, peakValue * 0.25, 0].map((v) => fmtJt(Math.round(v)));
  const chartPoints = weekly.length ? weekly : [];
  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <TopBar placeholder={t("seller.searchOrdersProducts")} />

      <div className="px-8 pb-10 pt-4">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{t("seller.businessSummary")}</h1>
            <p className="mt-1 text-sm text-seller-muted">{t("seller.storePerformanceToday")}, {todayLabel}</p>
          </div>
          <button type="button" className="flex items-center gap-2 rounded-xl border border-[#E4E8F1] bg-white px-4 py-2.5 text-sm font-medium text-seller-ink shadow-sm">
            <CalendarDays size={16} className="text-seller-muted" />
            {t("seller.last7Days")}
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.labelKey} className="rounded-2xl bg-white p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconWrap}`}>
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      s.changeUp ? "bg-[#E9F8EF] text-[#16A34A]" : "bg-[#FDECEC] text-[#E11D48]"
                    }`}
                  >
                    {s.changeUp ? "↗" : "↘"} {s.change}
                  </span>
                </div>
                <p className="text-sm text-seller-muted">{t(s.labelKey)}</p>
                <p className="mt-1 text-[22px] font-bold text-seller-ink">{s.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-card xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-seller-ink">{t("seller.weeklySalesTrend")}</h2>
              <button type="button" className="text-sm font-semibold text-seller-navy">
                {t("seller.viewDetails")}
              </button>
            </div>

            <div className="flex h-[250px] gap-3">
              <div className="flex w-10 flex-col justify-between pb-6 text-right text-[11px] text-seller-muted">
                {yTicks.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              <div className="relative flex flex-1 items-end justify-between gap-3 border-l border-[#EEF1F6] pl-3">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                  {yTicks.map((tick) => (
                    <div key={tick} className="border-t border-[#F1F4F8]" />
                  ))}
                </div>
                {chartPoints.map((d, idx) => {
                  const isPeak = idx === peakIndex && d.value > 0;
                  const heightPct = d.value > 0 ? (d.value / peakValue) * 100 : 3;
                  return (
                    <div key={d.day} className="relative z-10 flex h-full flex-1 flex-col items-center justify-end">
                      {isPeak && (
                        <span className="mb-2 rounded-md bg-seller-ink px-2 py-1 text-[11px] font-semibold text-white">
                          {fmtJt(d.value)}
                        </span>
                      )}
                      <div
                        className={`w-9 rounded-t-md ${isPeak ? "bg-seller-navy" : "bg-[#D7DEEA]"}`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className={`mt-2 text-xs ${isPeak ? "font-semibold text-seller-ink" : "text-seller-muted"}`}>
                        {t(d.key)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-5 rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-seller-ink">{t("seller.recentProducts")}</h2>
            <span className="rounded-full bg-[#E9F8EF] px-2.5 py-0.5 text-xs font-semibold text-[#16A34A]">
              {t("seller.totalWeekly")}: {fmtJt(totalDays)}
            </span>
          </div>
          {recentProducts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EEF1F6] text-xs text-seller-muted">
                    <th className="pb-3 font-medium">{t("seller.productName")}</th>
                    <th className="pb-3 font-medium">{t("seller.category")}</th>
                    <th className="pb-3 font-medium">{t("seller.price")}</th>
                    <th className="pb-3 font-medium">{t("seller.stock")}</th>
                    <th className="pb-3 font-medium">{t("seller.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6]">
                  {recentProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 font-semibold text-seller-ink">{p.name}</td>
                      <td className="py-3 text-seller-muted">{p.category || "-"}</td>
                      <td className="py-3 font-semibold text-seller-ink">{formatRupiah(p.price)}</td>
                      <td className="py-3 text-seller-muted">{p.stock}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "active" ? "bg-[#E9F8EF] text-[#16A34A]" : p.status === "out_of_stock" ? "bg-[#FDECEC] text-[#E11D48]" : "bg-[#EEF1F6] text-seller-muted"}`}>
                          {p.status === "active" ? t("admin.active") : p.status === "out_of_stock" ? t("seller.outOfStock") : t("seller.draft")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-seller-muted">{t("seller.noProducts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
