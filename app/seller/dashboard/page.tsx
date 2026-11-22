"use client";

import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  Loader2,
  Package,
  Percent,
  Search,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import TopBar from "../components/TopBar";
import { api, type ProductRecord } from "@/lib/api";
import { formatRupiah } from "@/lib/data";
import { buildWorkbook, downloadWorkbook, excelDate, reportDate, reportDateTime } from "@/lib/report";
import type { CellValue, ReportMeta, SummaryLine, SummarySpec, TableSpec } from "@/lib/report";

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
  inactive?: number;
  lowStock: number;
  outOfStock: number;
  totalRevenue: number;
  units?: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders?: number;
  buyerTotal?: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  price: number;
  category: string | null;
  image_url: string | null;
  status: string;
}

interface PopularProduct {
  id: string | null;
  name: string;
  category: string | null;
  image_url: string | null;
  sold: number;
  revenue: number;
  orders: number;
  buyers: number;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [apiStats, setApiStats] = useState<SellerStats>({
    products: 0,
    active: 0,
    inactive: 0,
    lowStock: 0,
    outOfStock: 0,
    totalRevenue: 0,
    units: 0,
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    buyerTotal: 0,
  });
  const [weekly, setWeekly] = useState<WeekPoint[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductRecord[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [popularQuery, setPopularQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    void api<{
      stats: SellerStats;
      weekly?: WeekPoint[];
      recentProducts?: ProductRecord[];
      popularProducts?: PopularProduct[];
      lowStockProducts?: LowStockProduct[];
    }>("/api/dashboard/seller")
      .then((data) => {
        setApiStats(data.stats);
        setWeekly(data.weekly || []);
        setRecentProducts(data.recentProducts || []);
        setPopularProducts(data.popularProducts || []);
        setLowStockProducts(data.lowStockProducts || []);
      })
      .catch(() => undefined)
      .finally(() => setDataReady(true));
  }, []);

  const stats: StatCard[] = [
    { labelKey: "seller.totalSales", value: formatRupiah(apiStats.totalRevenue), change: `${apiStats.totalOrders} ${t("seller.validOrdersOnly")}`, changeUp: true, icon: CreditCard, iconWrap: "bg-[#E8EEF8] text-[#3B5B8C]" },
    { labelKey: "seller.activeOrdersLabel", value: String(apiStats.activeOrders || 0), change: t("seller.validOrdersOnly"), changeUp: true, icon: Truck, iconWrap: "bg-[#FFF1E6] text-[#D97706]" },
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

  const popularMaxSold = Math.max(...popularProducts.map((p) => p.sold), 1);
  const popularKeyword = popularQuery.trim().toLowerCase();
  const visiblePopular = popularProducts.filter((product) => {
    if (!popularKeyword) return true;
    return (
      product.name.toLowerCase().includes(popularKeyword) ||
      String(product.category || "").toLowerCase().includes(popularKeyword)
    );
  });

  function dimensionsOf(product: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
  }) {
    if (!product.length_cm && !product.width_cm && !product.height_cm) return "-";
    return `${product.length_cm ?? 0} × ${product.width_cm ?? 0} × ${product.height_cm ?? 0}`;
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      type ExportProduct = {
        name: string;
        sku: string | null;
        category: string | null;
        price: number;
        stock: number;
        status_label: string;
        dimensions_complete: boolean;
        created_at: string | null;
      };
      type ExportSellerDashboard = {
        stats: {
          products: number;
          active: number;
          inactive: number;
          lowStock: number;
          outOfStock: number;
          totalRevenue: number;
          units: number;
          totalOrders: number;
          activeOrders: number;
          completedOrders: number;
          buyerTotal: number;
        };
        weekly: Array<{ date: string; label: string; value: number; orders: number }>;
        recentProducts: ExportProduct[];
        popularProducts: Array<{
          name: string;
          category: string | null;
          sold: number;
          revenue: number;
          orders: number;
          buyers: number;
          stock?: number;
        }>;
        lowStockProducts: ExportProduct[];
        seller_name?: string;
      };

      const payload = await api<ExportSellerDashboard>("/api/dashboard/seller");
      const s = payload.stats;
      const today = reportDate();
      const weeklyTotal = payload.weekly.reduce((sum, row) => sum + Number(row.value || 0), 0);
      const recentProducts = [...payload.recentProducts].sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || ""))
      );

      const meta: ReportMeta = {
        title: "Laporan Bisnis Seller",
        platform: "ElektroMart",
        subject: payload.seller_name || "Seller",
        period: { from: today, to: today },
        generatedAt: reportDateTime(),
        notes: [
          "Terjual = pesanan valid (Dibayar, Dikirim, Selesai).",
          "Data penjualan 7 hari berdasarkan tanggal pesanan (WIB).",
        ],
        currency: "Rupiah (Rp)",
      };

      const weeklyRows: CellValue[][] = payload.weekly.length
        ? payload.weekly.map((row) => [
            excelDate(row.date),
            row.label,
            Number(row.value || 0),
            Number(row.orders || 0),
            weeklyTotal > 0 ? Number(row.value || 0) / weeklyTotal : 0,
          ])
        : [["Tidak ada penjualan pada periode ini."]];

      const popularRows: CellValue[][] = payload.popularProducts.length
        ? payload.popularProducts.map((row) => [
            row.name,
            row.category || "-",
            Number(row.sold || 0),
            Number(row.revenue || 0),
            Number(row.orders || 0),
            null,
          ])
        : [["Tidak ada produk terlaris pada periode ini."]];

      const productRows = (products: ExportProduct[]): CellValue[][] =>
        products.length
          ? products.map((row) => [
              row.name,
              row.sku || "-",
              row.category || "-",
              Number(row.price || 0),
              Number(row.stock || 0),
              row.status_label,
              row.dimensions_complete ? "Lengkap" : "Perlu dilengkapi",
              excelDate(row.created_at),
            ])
          : [["Tidak ada produk pada periode ini."]];

      const productColumns: TableSpec["columns"] = [
        { header: "Nama Produk", width: 36 },
        { header: "SKU", width: 18 },
        { header: "Kategori", width: 18 },
        { header: "Harga", width: 18, format: "currency" },
        { header: "Stok", width: 10, format: "number", align: "center" },
        { header: "Status", width: 14, align: "center" },
        { header: "Berat/Dimensi", width: 22, align: "center" },
        { header: "Dibuat", width: 16, format: "date", align: "center" },
      ];
      const productTotal = (row: number): CellValue[] => [
        "TOTAL",
        null,
        null,
        null,
        `=SUM(E8:E${row - 1})`,
        null,
        null,
        null,
      ];

      const lines: SummaryLine[] = [
        { kind: "section", label: "1. Penjualan" },
        { kind: "detail", label: "Total Penjualan", value: s.totalRevenue, note: "" },
        { kind: "detail", label: "Unit Terjual", value: { value: s.units, format: "number" }, note: "" },
        { kind: "spacer" },
        { kind: "section", label: "2. Pesanan" },
        { kind: "detail", label: "Pesanan Valid", value: { value: s.totalOrders, format: "number" }, note: "" },
        { kind: "detail", label: "Pesanan Aktif", value: { value: s.activeOrders, format: "number" }, note: "" },
        { kind: "detail", label: "Pesanan Selesai", value: { value: s.completedOrders, format: "number" }, note: "" },
        { kind: "detail", label: "Pembeli Unik", value: { value: s.buyerTotal, format: "number" }, note: "" },
        { kind: "spacer" },
        { kind: "section", label: "3. Produk & Stok" },
        { kind: "detail", label: "Total Produk", value: { value: s.products, format: "number" }, note: "" },
        { kind: "detail", label: "Produk Aktif", value: { value: s.active, format: "number" }, note: "" },
        { kind: "detail", label: "Produk Nonaktif", value: { value: s.inactive, format: "number" }, note: "" },
        { kind: "detail", label: "Stok Habis", value: { value: s.outOfStock, format: "number" }, note: "" },
        { kind: "detail", label: "Stok Menipis", value: { value: s.lowStock, format: "number" }, note: "" },
      ];

      const sheets: Array<TableSpec | SummarySpec> = [
        {
          kind: "summary",
          name: "Ringkasan",
          title: "Ringkasan Bisnis Seller",
          lines,
          widths: [52, 22, 48],
        },
        {
          kind: "table",
          name: "Penjualan 7 Hari",
          title: "Penjualan 7 Hari",
          subtitle: "7 hari kalender terakhir (WIB)",
          columns: [
            { header: "Tanggal", width: 16, format: "date", align: "center" },
            { header: "Hari", width: 14, align: "center" },
            { header: "Penjualan", width: 20, format: "currency" },
            { header: "Pesanan", width: 12, format: "number", align: "center" },
            { header: "%", width: 12, format: "percent", align: "center" },
          ],
          rows: weeklyRows,
          total: (row) => [
            "TOTAL",
            null,
            `=SUM(C8:C${row - 1})`,
            `=SUM(D8:D${row - 1})`,
            `=SUM(E8:E${row - 1})`,
          ],
        },
        {
          kind: "table",
          name: "Produk Terlaris",
          title: "Produk Terlaris",
          subtitle: "Pesanan valid (Dibayar, Dikirim, Selesai)",
          columns: [
            { header: "Produk", width: 36 },
            { header: "Kategori", width: 18 },
            { header: "Unit Terjual", width: 14, format: "number", align: "center" },
            { header: "Pendapatan", width: 20, format: "currency" },
            { header: "Pesanan", width: 12, format: "number", align: "center" },
            { header: "Pendapatan/Unit", width: 20, format: "currency", formula: (r) => `IF(C${r}=0,"",D${r}/C${r})` },
          ],
          rows: popularRows,
          total: (row) => [
            "TOTAL",
            null,
            `=SUM(C8:C${row - 1})`,
            `=SUM(D8:D${row - 1})`,
            `=SUM(E8:E${row - 1})`,
            null,
          ],
        },
        {
          kind: "table",
          name: "Daftar Produk",
          title: "Daftar Produk",
          subtitle: "Semua produk seller",
          columns: productColumns,
          rows: productRows(recentProducts),
          total: productTotal,
        },
        {
          kind: "table",
          name: "Stok Menipis",
          title: "Stok Menipis",
          subtitle: "Produk dengan stok di bawah ambang batas",
          columns: productColumns,
          rows: payload.lowStockProducts.length
            ? productRows(payload.lowStockProducts)
            : [["Tidak ada produk stok menipis."]],
          total: productTotal,
        },
      ];

      const workbook = buildWorkbook(meta, sheets);
      await downloadWorkbook(`laporan-bisnis-seller-${today}.xlsx`, workbook);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <TopBar placeholder={t("seller.searchOrdersProducts")} />

      <div className="px-8 pb-10 pt-4">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{t("seller.businessSummary")}</h1>
            <p className="mt-1 text-sm text-seller-muted">{t("seller.storePerformanceToday")}, {todayLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button type="button" className="flex items-center gap-2 rounded-xl border border-[#E4E8F1] bg-white px-4 py-2.5 text-sm font-medium text-seller-ink shadow-sm">
              <CalendarDays size={16} className="text-seller-muted" />
              {t("seller.last7Days")}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!dataReady || downloading}
              title={t("seller.downloadBusinessReport")}
              className="flex items-center gap-2 rounded-xl border border-[#E4E8F1] bg-white px-3.5 py-2 text-[13px] font-semibold text-seller-ink shadow-sm transition hover:border-seller-navy/30 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-seller-muted" />}
              {t("seller.downloadBusinessReport")}
            </button>
          </div>
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

        {lowStockProducts.length ? (
          <div className="mb-5 rounded-2xl border border-amber-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="text-base font-bold text-seller-ink">{t("seller.lowStockProducts")}</h2>
                <span className="rounded-full bg-[#FDECEC] px-2.5 py-0.5 text-xs font-semibold text-[#E11D48]">
                  {lowStockProducts.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/seller/produk")}
                className="text-sm font-semibold text-seller-navy"
              >
                {t("seller.viewProducts")} &rarr;
              </button>
            </div>
            <p className="mb-4 text-xs text-seller-muted">
              {t("seller.lowStockDesc", { count: apiStats.lowStock || lowStockProducts.length })}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {lowStockProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => router.push("/seller/produk")}
                  className="flex items-center gap-3 rounded-xl border border-[#F1F4F8] px-3 py-2.5 text-left hover:bg-[#F8FAFC]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F4F6FA]">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package size={16} className="text-seller-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-seller-ink">{product.name}</span>
                    <span className="block text-xs text-seller-muted">{product.category || "-"}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-[#E11D48]">
                    {product.stock} {t("seller.remainingUnits")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-card xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-seller-ink">{t("seller.weeklyValidSalesTrend")}</h2>
              <button type="button" className="text-sm font-semibold text-seller-navy">
                {t("seller.viewDetails")}
              </button>
            </div>

            <div className="flex h-[250px] gap-3">
              <div className="flex w-10 flex-col justify-between pb-6 text-right text-[11px] text-seller-muted">
                {yTicks.map((tick, index) => (
                  <span key={`${tick}-${index}`}>{tick}</span>
                ))}
              </div>
              <div className="relative flex flex-1 items-end justify-between gap-3 border-l border-[#EEF1F6] pl-3">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                  {yTicks.map((tick, index) => (
                    <div key={`${tick}-${index}`} className="border-t border-[#F1F4F8]" />
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-seller-navy" />
                <h2 className="text-lg font-bold text-seller-ink">{t("seller.popularProducts")}</h2>
              </div>
              <p className="mt-1 text-sm text-seller-muted">{t("seller.popularProductsSubtitle")}</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-seller-muted" />
              <input
                type="search"
                value={popularQuery}
                onChange={(event) => setPopularQuery(event.target.value)}
                placeholder={t("seller.searchPopular")}
                className="w-full rounded-xl border border-[#E4E8F1] bg-white py-2.5 pl-9 pr-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
              />
            </div>
          </div>

          {visiblePopular.length ? (
            <div className="space-y-3">
              {visiblePopular.map((product) => {
                const rank = popularProducts.indexOf(product) + 1;
                const percent = Math.max((product.sold / popularMaxSold) * 100, 4);
                const rankClass =
                  rank === 1
                    ? "bg-[#FEF3C7] text-[#B45309]"
                    : rank === 2
                      ? "bg-[#E5E7EB] text-[#4B5563]"
                      : rank === 3
                        ? "bg-[#FDE8D7] text-[#C2410C]"
                        : "bg-[#EEF1F6] text-seller-muted";
                return (
                  <div key={product.id || product.name} className="flex items-center gap-3 rounded-xl border border-[#F1F4F8] px-3 py-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankClass}`}>
                      {rank}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F4F6FA]">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package size={18} className="text-seller-muted" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-seller-ink">{product.name}</p>
                        <span className="shrink-0 text-sm font-bold text-seller-ink">
                          {product.sold}{" "}
                          <span className="text-xs font-medium text-seller-muted">{t("seller.unitsSold")}</span>
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-3">
                        <p className="truncate text-xs text-seller-muted">
                          {product.category || "-"} · {product.buyers} {t("seller.buyers")} · {product.orders} {t("seller.orders")}
                        </p>
                        <span className="shrink-0 text-xs font-semibold text-seller-navy">{formatRupiah(product.revenue)}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF1F6]">
                        <div
                          className={`h-full rounded-full ${rank === 1 ? "bg-seller-navy" : "bg-[#D7DEEA]"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-seller-muted">
              {popularKeyword ? t("seller.noPopularMatch") : t("seller.noPopularProducts")}
            </p>
          )}
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
