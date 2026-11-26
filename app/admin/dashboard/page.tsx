"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Tags,
  Store,
  Users,
  Wallet,
  Settings,
  Home,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  ArrowUpRight,
  Activity,
  Banknote,
  Zap,
  Flag,
  Loader2,
  Download,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";
import { buildWorkbook, downloadWorkbook, excelDate, reportDate, reportDateTime } from "@/lib/report";
import type { CellValue, ReportMeta, SummaryLine, SummarySpec, TableSpec } from "@/lib/report";
import { formatRupiah } from "@/lib/data";

type CategorySlice = { label: string; value: number; stock: number; color: string };
type PopularProduct = { name: string; stock: number; category?: string | null };
type TopSeller = { name: string; products: number };
type OrderStats = {
  total: number;
  thisMonth: number;
  totalRevenue: number;
  commissionRevenue: number;
  escrowHeldFunds: number;
  totalPayoutToSellers: number;
  availablePlatformBalance: number;
  sellerDeficit: number;
  revenueOrders: number;
};
type PaymentMethodStat = { name: string; count: number };
type FlashSaleStat = {
  soldUnits: number;
  quota: number;
  remaining: number;
  activeProducts: number;
  products: { name: string; stock?: number; flash_sale_quota: number; flash_sale_sold: number; flash_sale_remaining: number }[];
};
type ReportRecord = {
  id: string;
  product_id: string | null;
  seller_id: string | null;
  reporter_id: string | null;
  product_name: string;
  product_image: string | null;
  reason: string;
  description: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  reporter: string | null;
};

const reportStatusStyles: Record<ReportRecord["status"], string> = {
  pending: "bg-amber-50 text-amber-600",
  resolved: "bg-emerald-50 text-emerald-600",
  dismissed: "bg-slate-100 text-slate-500",
};

function PieChart({ segments }: { segments: CategorySlice[] }) {
  const { t } = useLanguage();
  const totalCat = segments.reduce((sum, item) => sum + item.value, 0) || segments.length || 1;
  let cumDeg = 0;
  const chartSegments = segments.map((seg) => {
    const angle = ((seg.value || (totalCat === segments.length ? 1 : 0)) / totalCat) * 360;
    const from = cumDeg;
    cumDeg += angle;
    return { ...seg, from, angle };
  });
  const gradParts = chartSegments.map(
    (s) => `${s.color} ${fromDeg(s.from)}deg ${fromDeg(s.from + s.angle)}deg`
  );
  const displayTotal = segments.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="relative mx-auto aspect-square w-52 sm:w-60">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: segments.length ? `conic-gradient(${gradParts.join(", ")})` : "#e2e8f0",
        }}
      />
      <div className="absolute inset-[22%] rounded-full bg-white shadow-inner" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-[#0a1633]">{segments.length}</span>
        <span className="text-[10px] font-medium text-slate-400">{t("admin.registeredCategories")}</span>
        <span className="mt-0.5 text-[10px] text-slate-400">{displayTotal} {t("admin.unitsSoldShort")}</span>
      </div>
    </div>
  );
}

function fromDeg(deg: number) {
  return Math.round(deg * 10) / 10;
}

const CATEGORY_FALLBACK_COLORS: Record<string, string> = {
  Smartphone: "#3B82F6",
  Laptop: "#8B5CF6",
  "TV & Audio": "#EC4899",
  Kamera: "#F59E0B",
  Audio: "#10B981",
  Gaming: "#F43F5E",
  "Smart Watch": "#06B6D4",
  "Kabel & Charger": "#7C3AED",
  Aksesoris: "#F59863",
};

function categoryColor(name: string, color?: string | null) {
  const value = String(color || "").trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : CATEGORY_FALLBACK_COLORS[name] || "#94a3b8";
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ sellers: 0, activeSellers: 0, buyers: 0, products: 0, categories: 0 });
  const [categorySales, setCategorySales] = useState<CategorySlice[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [orders, setOrders] = useState<OrderStats>({
    total: 0,
    thisMonth: 0,
    totalRevenue: 0,
    commissionRevenue: 0,
    escrowHeldFunds: 0,
    totalPayoutToSellers: 0,
    availablePlatformBalance: 0,
    sellerDeficit: 0,
    revenueOrders: 0,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStat[]>([]);
  const [flashSale, setFlashSale] = useState<FlashSaleStat>({
    soldUnits: 0,
    quota: 0,
    remaining: 0,
    activeProducts: 0,
    products: [],
  });
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{
      stats: { sellers: number; activeSellers: number; buyers: number; products: number; categories: number };
      categories: {
        name: string;
        color: string;
        product_count?: number;
        stock_total?: number;
        units_sold?: number;
        revenue?: number;
        orders?: number;
        share?: number;
      }[];
      products: PopularProduct[];
      sellers: TopSeller[];
      orders?: OrderStats;
      paymentMethods?: PaymentMethodStat[];
      flashSale?: FlashSaleStat;
    }>("/api/dashboard/admin")
      .then((data) => {
        setStats(data.stats);
        const categorySales = (data.categories || []).map((category) => ({
          label: category.name,
          value: category.units_sold || 0,
          stock: category.stock_total || 0,
          color: categoryColor(category.name, category.color),
        }));
        setCategorySales(categorySales);
        setPopularProducts(data.products || []);
        setTopSellers(data.sellers || []);
        if (data.orders) setOrders(data.orders);
        if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
        if (data.flashSale) setFlashSale(data.flashSale);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("api.unavailable")));

    void api<{ reports: ReportRecord[] }>("/api/reports")
      .then((data) => setReports(data.reports || []))
      .catch(() => {});
  }, [t]);

  async function setReportStatus(id: string, status: ReportRecord["status"]) {
    setBusyReportId(id);
    try {
      await api<{ report: ReportRecord }>(`/api/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setBusyReportId(null);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      type ExportAdminDashboard = {
        stats: {
          sellers: number;
          activeSellers: number;
          buyers: number;
          products: number;
          categories: number;
        };
        categories: Array<{
          name: string;
          product_count: number;
          stock_total: number;
          units_sold: number;
          revenue: number;
          orders: number;
          share: number;
        }>;
        products: Array<{
          name: string;
          category: string | null;
          units_sold: number;
          revenue: number;
          orders: number;
          stock: number;
        }>;
        sellers: Array<{
          name: string;
          gross: number;
          fee: number;
          net: number;
          units: number;
          orders: number;
          products: number;
          active_products: number;
        }>;
        orders: {
          total: number;
          thisMonth: number;
          valid: number;
          active: number;
          completed: number;
          cancelled: number;
          waiting: number;
          units: number;
          gmv: number;
          gross: number;
          platformRevenue: number;
          escrowHeldFunds: number;
          totalPayoutToSellers: number;
        };
        paymentMethods: Array<{ name: string; count: number }>;
        flashSale: {
          soldUnits: number;
          quota: number;
          remaining: number;
          activeProducts: number;
          products: Array<{
            name: string;
            sold_today?: number;
            flash_sale_quota?: number;
            flash_sale_sold?: number;
            flash_sale_remaining?: number;
            stock?: number;
          }>;
        };
        reviews: Array<{
          product_name: string;
          order_id: string | null;
          rating: number;
          comment: string | null;
          date: string | null;
          created_at?: string;
        }>;
      };

      const payload = await api<ExportAdminDashboard>("/api/dashboard/admin");
      const s = payload.stats;
      const o = payload.orders;
      const today = reportDate();
      const paymentTotal = payload.paymentMethods.reduce((sum, row) => sum + Number(row.count || 0), 0);

      const meta: ReportMeta = {
        title: "Laporan Teknis Admin",
        platform: "ElektroMart",
        subject: "Seluruh Platform",
        period: { from: today, to: today },
        generatedAt: reportDateTime(),
        notes: [
          "Unit terjual = pesanan valid; Flash Sale memakai penjualan hari ini (WIB).",
          "Rincian keuangan tersedia di A-KEU.",
        ],
        currency: "Rupiah (Rp)",
      };

      const categoryRows: CellValue[][] = payload.categories.length
        ? payload.categories.map((row) => [
            row.name,
            Number(row.product_count || 0),
            Number(row.stock_total || 0),
            Number(row.units_sold || 0),
            Number(row.revenue || 0),
            Number(row.share || 0),
          ])
        : [["Tidak ada kategori pada periode ini."]];

      const paymentRows: CellValue[][] = payload.paymentMethods.length
        ? payload.paymentMethods.map((row) => [
            row.name,
            Number(row.count || 0),
            paymentTotal > 0 ? Number(row.count || 0) / paymentTotal : 0,
          ])
        : [["Tidak ada metode pembayaran pada periode ini."]];

      const productRows: CellValue[][] = payload.products.length
        ? payload.products.map((row) => [
            row.name,
            row.category || "-",
            Number(row.units_sold || 0),
            Number(row.revenue || 0),
            Number(row.orders || 0),
            null,
            Number(row.stock || 0),
          ])
        : [["Tidak ada produk terlaris pada periode ini."]];

      const sellerRows: CellValue[][] = payload.sellers.length
        ? payload.sellers.map((row) => [
            row.name,
            Number(row.gross || 0),
            Number(row.fee || 0),
            Number(row.net || 0),
            Number(row.orders || 0),
            Number(row.units || 0),
            Number(row.active_products || 0),
          ])
        : [["Tidak ada penjual pada periode ini."]];

      const reviewRows: CellValue[][] = payload.reviews.length
        ? payload.reviews.map((row) => [
            excelDate(row.date || row.created_at),
            row.product_name,
            row.order_id || "-",
            Number(row.rating || 0),
            row.comment || "",
          ])
        : [["Tidak ada laporan pada periode ini."]];

      const flashSaleRows: CellValue[][] = payload.flashSale.products.length
        ? payload.flashSale.products.map((product) => {
            const quota = Number(product.flash_sale_quota || 0);
            const sold = Number(
              product.sold_today ?? product.flash_sale_sold ?? Math.max(0, quota - Number(product.flash_sale_remaining || 0))
            );
            const remaining = Number(product.flash_sale_remaining ?? Math.max(0, quota - sold));
            return [product.name, quota, sold, remaining];
          })
        : [["Tidak ada produk flash sale hari ini."]];

      const lines: SummaryLine[] = [
        { kind: "section", label: "1. Pengguna & Katalog" },
        { kind: "detail", label: "Seller", value: { value: s.sellers, format: "number" }, note: "" },
        { kind: "detail", label: "Seller Aktif", value: { value: s.activeSellers, format: "number" }, note: "" },
        { kind: "detail", label: "Pembeli", value: { value: s.buyers, format: "number" }, note: "" },
        { kind: "detail", label: "Produk", value: { value: s.products, format: "number" }, note: "" },
        { kind: "detail", label: "Kategori", value: { value: s.categories, format: "number" }, note: "" },
        { kind: "spacer" },
        { kind: "section", label: "2. Transaksi" },
        { kind: "detail", label: "Total Pesanan", value: { value: o.total, format: "number" }, note: "" },
        { kind: "detail", label: "Pesanan Valid", value: { value: o.valid, format: "number" }, note: "" },
        { kind: "detail", label: "Dibatalkan", value: { value: o.cancelled, format: "number" }, note: "" },
        { kind: "detail", label: "Pesanan Aktif", value: { value: o.active, format: "number" }, note: "" },
        { kind: "detail", label: "Unit Terjual", value: { value: o.units, format: "number" }, note: "" },
        { kind: "spacer" },
        { kind: "section", label: "3. Keuangan Ringkas (rujuk A-KEU)" },
        { kind: "detail", label: "GMV", value: o.gmv, note: "" },
        { kind: "detail", label: "Pendapatan Platform", value: o.platformRevenue, note: "" },
        { kind: "detail", label: "Escrow", value: o.escrowHeldFunds, note: "Rincian di A-KEU" },
      ];

      const sheets: Array<TableSpec | SummarySpec> = [
        {
          kind: "summary",
          name: "Ringkasan",
          title: "Ringkasan Teknis Admin",
          lines,
          widths: [52, 22, 48],
        },
        {
          kind: "table",
          name: "Kategori",
          title: "Distribusi Kategori",
          subtitle: "Agregat katalog dan penjualan pesanan valid.",
          columns: [
            { header: "Kategori", width: 28 },
            { header: "Jumlah Produk", width: 16, format: "number", align: "center" },
            { header: "Total Stok", width: 16, format: "number", align: "center" },
            { header: "Unit Terjual", width: 16, format: "number", align: "center" },
            { header: "Pendapatan", width: 20, format: "currency" },
            { header: "% Penjualan", width: 14, format: "percent", align: "center" },
          ],
          rows: categoryRows,
          total: (row) => [
            "TOTAL",
            `=SUM(B8:B${row - 1})`,
            `=SUM(C8:C${row - 1})`,
            `=SUM(D8:D${row - 1})`,
            `=SUM(E8:E${row - 1})`,
            { value: 1, format: "percent" },
          ],
        },
        {
          kind: "table",
          name: "Metode Pembayaran",
          title: "Metode Pembayaran",
          subtitle: "Pesanan valid",
          columns: [
            { header: "Metode", width: 30 },
            { header: "Jumlah Pesanan", width: 18, format: "number", align: "center" },
            { header: "Persentase", width: 14, format: "percent", align: "center" },
          ],
          rows: paymentRows,
          total: (row) => [
            "TOTAL",
            `=SUM(B8:B${row - 1})`,
            { value: 1, format: "percent" },
          ],
        },
        {
          kind: "table",
          name: "Produk Terlaris",
          title: "Produk Terlaris",
          subtitle: "Diurutkan berdasarkan unit terjual (pesanan valid)",
          columns: [
            { header: "Produk", width: 36 },
            { header: "Kategori", width: 18 },
            { header: "Unit Terjual", width: 14, format: "number", align: "center" },
            { header: "Pendapatan", width: 20, format: "currency" },
            { header: "Pesanan", width: 12, format: "number", align: "center" },
            { header: "Pendapatan/Unit", width: 20, format: "currency", formula: (r) => `IF(C${r}=0,"",D${r}/C${r})` },
            { header: "Stok", width: 12, format: "number", align: "center" },
          ],
          rows: productRows,
          total: (row) => [
            "TOTAL",
            null,
            `=SUM(C8:C${row - 1})`,
            `=SUM(D8:D${row - 1})`,
            `=SUM(E8:E${row - 1})`,
            null,
            `=SUM(G8:G${row - 1})`,
          ],
        },
        {
          kind: "table",
          name: "Penjual Teratas",
          title: "Penjual Teratas",
          subtitle: "Diurutkan berdasarkan penjualan kotor",
          columns: [
            { header: "Penjual", width: 30 },
            { header: "Penjualan Kotor", width: 20, format: "currency" },
            { header: "Fee Platform", width: 20, format: "currency" },
            { header: "Pendapatan Bersih", width: 20, format: "currency" },
            { header: "Pesanan", width: 14, format: "number", align: "center" },
            { header: "Unit Terjual", width: 14, format: "number", align: "center" },
            { header: "Produk Aktif", width: 14, format: "number", align: "center" },
          ],
          rows: sellerRows,
          total: (row) => [
            "TOTAL",
            `=SUM(B8:B${row - 1})`,
            `=SUM(C8:C${row - 1})`,
            `=SUM(D8:D${row - 1})`,
            `=SUM(E8:E${row - 1})`,
            `=SUM(F8:F${row - 1})`,
            `=SUM(G8:G${row - 1})`,
          ],
        },
        {
          kind: "table",
          name: "Laporan Produk",
          title: "Laporan Produk",
          subtitle: "Laporan dari pembeli",
          columns: [
            { header: "Tanggal", width: 16, format: "date", align: "center" },
            { header: "Produk", width: 34 },
            { header: "No. Pesanan", width: 24 },
            { header: "Rating", width: 10, format: "number", align: "center" },
            { header: "Komentar", width: 48 },
          ],
          rows: reviewRows,
        },
        {
          kind: "table",
          name: "Flash Sale Hari Ini",
          title: "Flash Sale Hari Ini",
          subtitle: `Terjual ${payload.flashSale.soldUnits}/${payload.flashSale.quota} unit`,
          columns: [
            { header: "Produk", width: 36 },
            { header: "Kuota", width: 14, format: "number", align: "center" },
            { header: "Terjual Hari Ini", width: 18, format: "number", align: "center" },
            { header: "Sisa", width: 14, format: "number", align: "center" },
          ],
          rows: flashSaleRows,
          total: (row) => [
            "TOTAL",
            `=SUM(B8:B${row - 1})`,
            `=SUM(C8:C${row - 1})`,
            `=SUM(D8:D${row - 1})`,
          ],
        },
      ];

      const workbook = buildWorkbook(meta, sheets);
      await downloadWorkbook(`laporan-teknis-admin-${today}.xlsx`, workbook);
    } finally {
      setDownloading(false);
    }
  }

  const navItems = [
    { href: "/admin/dashboard", label: t("dashboard"), icon: LayoutGrid },
    { href: "/admin/kategori", label: t("admin.manageCategories"), icon: Tags },
    { href: "/admin/seller", label: t("admin.manageSellers"), icon: Store },
    { href: "/admin/buyer", label: t("admin.manageBuyers"), icon: Users },
    { href: "/admin/keuangan", label: t("admin.financeBalance"), icon: Wallet },
    { href: "/admin/pengaturan", label: t("admin.platformSettings"), icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-[#0a1633] px-4 py-6">
        <div className="mb-10 px-2">
          <h1 className="text-lg font-bold text-white">ElektroMart</h1>
          <p className="mt-1 text-xs text-slate-400">{t("admin.adminDashboard")}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/admin/dashboard";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-amber-800 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href="/beranda"
          className="mt-6 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5"
        >
          <Home className="h-4 w-4" /> {t("admin.backHome")}
        </Link>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <TopBar />
        <main className="px-8 py-8">
          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0a1633]">
                {t("admin.dashboardAdmin")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("admin.summaryPer")}{" "}
                <TodayDate />
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                  <Activity className="mr-1 inline h-3.5 w-3.5" />
                  {t("admin.systemActive")}
                </span>
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                  {t("admin.liveData")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                title={t("admin.downloadTechnicalReport")}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-400" />}
                {t("admin.downloadTechnicalReport")}
              </button>
            </div>
          </div>

          {/* ====== STAT CARDS — Baris 1 ====== */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Banknote}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-500"
              label={t("admin.totalRevenue")}
              value={formatRupiah(orders.totalRevenue)}
              change={`${orders.revenueOrders} ${t("soldCount")}`}
              up
            />
            <StatCard
              icon={ShoppingCart}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              label={t("admin.totalTransactionsThisMonth")}
              value={String(orders.thisMonth)}
              change={t("admin.fromDatabase")}
              up
            />
            <StatCard
              icon={Store}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              label={t("admin.activeSellers")}
              value={String(stats.activeSellers || 0)}
              change={t("admin.activeSellersOfTotal", { count: stats.sellers })}
              up
            />
            <StatCard
              icon={Users}
              iconBg="bg-violet-50"
              iconColor="text-violet-500"
              label={t("admin.registeredBuyers")}
              value={String(stats.buyers)}
              change={t("admin.fromDatabase")}
              up
            />
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          {/* ====== STAT CARDS — Baris 2 ====== */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatCard
              icon={Package}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-500"
              label={t("admin.registeredProducts")}
              value={String(stats.products)}
              change={t("admin.fromDatabase")}
              up
            />
            <StatCard
              icon={Tags}
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
              label={t("admin.registeredCategories")}
              value={String(stats.categories)}
              change={t("admin.fromDatabase")}
              neutral
            />
          </div>

          {/* ====== PIE CHART + RINGKASAN ====== */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            {/* Pie Chart Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[#0a1633]">
                    {t("admin.distributionPerCategory")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("admin.unitsSoldThisYear")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                {categorySales.length ? <PieChart segments={categorySales} /> : <p className="text-sm text-slate-500">{t("admin.noCategoryData")}</p>}

                <div className="flex-1 space-y-3">
                  {categorySales.map((seg) => {
                    const totalCat = categorySales.reduce((sum, item) => sum + item.value, 0) || 1;
                    const pct = ((seg.value / totalCat) * 100).toFixed(1);
                    return (
                      <div key={seg.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-[#0a1633]">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: seg.color }}
                            />
                            {seg.label}
                          </span>
                          <span className="font-semibold text-[#0a1633]">{seg.value.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: seg.color,
                            }}
                          />
                        </div>
                        <span className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{seg.stock.toLocaleString("id-ID")} {t("admin.unitLeft")}</span>
                          <span>{pct}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ringkasan Keuangan & Metode Pembayaran */}
            <div className="space-y-5">
              {/* Keuangan */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <h3 className="font-semibold text-[#0a1633]">{t("admin.financeSummary")}</h3>
                <div className="mt-4 space-y-3">
                  <FinanceRow label={t("admin.totalRevenue")} value={formatRupiah(orders.totalRevenue)} accent />
                  <FinanceRow label={t("admin.commissionRevenue")} value={formatRupiah(orders.commissionRevenue)} />
                  <FinanceRow label={t("admin.escrowHeldFunds")} value={formatRupiah(orders.escrowHeldFunds)} />
                  <FinanceRow label={t("admin.totalPayoutToSellers")} value={formatRupiah(orders.totalPayoutToSellers)} />
                  <FinanceRow label={t("admin.platformBalance")} value={formatRupiah(orders.availablePlatformBalance || 0)} />
                  <FinanceRow label={t("admin.sellerDeficit")} value={formatRupiah(orders.sellerDeficit || 0)} />
                </div>
              </div>

              {/* Metode Pembayaran Populer */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <h3 className="font-semibold text-[#0a1633]">{t("admin.popularPaymentMethods")}</h3>
                {paymentMethods.length ? (
                <div className="mt-4 space-y-3">
                  {paymentMethods.map((pm, idx) => {
                    const totalPay = paymentMethods.reduce((sum, p) => sum + p.count, 0) || 1;
                    const pct = Math.round((pm.count / totalPay) * 100);
                    const colors = ["bg-emerald-500", "bg-blue-500", "bg-[#2A74B4]", "bg-[#0E56A8]", "bg-purple-500", "bg-slate-300"];
                    return (
                      <PaymentMethodRow
                        key={pm.name}
                        name={pm.name}
                        pct={pct}
                        color={colors[idx % colors.length]}
                        count={pm.count}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">{t("admin.noData")}</p>
              )}
              </div>
            </div>
          </div>

          {/* ====== POPULAR PRODUCTS + TOP SELLERS ====== */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            {/* Produk Terlaris */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-semibold text-[#0a1633]">{t("bestSellers")}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{t("admin.topSoldSubtitle")}</p>
                </div>
                <Link href="/admin/kategori" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                  {t("admin.manage")} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {popularProducts.map((p, i) => (
                  <div key={`${p.name}-${i}`} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-white">
                      #{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0a1633]">{p.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{p.stock} {t("admin.unitLeft")}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                      {p.category || t("categoryFallback")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Sellers + Kebutuhan Cepat */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-100 bg-white shadow-card">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <h3 className="font-semibold text-[#0a1633]">Top Seller</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{t("admin.highestRevenueThisMonth")}</p>
                  </div>
                  <Link href="/admin/seller" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                    {t("viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {topSellers.map((s, i) => (
                    <div key={`${s.name}-${i}`} className="flex items-center gap-4 px-6 py-3.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                          i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0a1633]">{s.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{s.products} {t("products")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flash Sale Hari Ini */}
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#0a1633]">{t("admin.flashSaleToday")}</p>
                    <p className="text-xs text-slate-500">
                      {flashSale.quota
                        ? `${flashSale.soldUnits} ${t("admin.flashSaleProgress")} ${flashSale.quota}`
                        : t("admin.noFlashSale")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${flashSale.quota ? Math.min(100, (flashSale.soldUnits / flashSale.quota) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-500">
                  <span>
                    {flashSale.soldUnits}/{flashSale.quota} {t("soldCount")}
                    {flashSale.activeProducts ? ` · ${flashSale.activeProducts} ${t("products")}` : ""}
                  </span>
                  <span className="font-bold text-amber-600">
                    {flashSale.remaining} {t("admin.flashSaleRemaining")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ====== LAPORAN PRODUK ====== */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <Flag className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-[#0a1633]">{t("report.adminTitle")}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{t("report.adminSubtitle")}</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                {reports.filter((r) => r.status === "pending").length} {t("report.pendingCount")}
              </span>
            </div>

            {reports.length ? (
              <div className="divide-y divide-slate-100">
                {reports.slice(0, 6).map((report) => (
                  <div key={report.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#0a1633]">{report.product_name}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${reportStatusStyles[report.status]}`}>
                          {t(report.status === "pending" ? "report.statusPending" : report.status === "resolved" ? "report.statusResolved" : "report.statusDismissed")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("report.reason")}: <span className="font-medium text-slate-600">{report.reason}</span>
                        {report.reporter ? ` · ${t("report.reporter")}: ${report.reporter}` : ""}
                        {" · "}
                        {new Date(report.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {report.description ? <p className="mt-1 truncate text-xs text-slate-400">{report.description}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {report.status !== "resolved" ? (
                        <button
                          type="button"
                          disabled={busyReportId === report.id}
                          onClick={() => setReportStatus(report.id, "resolved")}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {busyReportId === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {t("report.markResolved")}
                        </button>
                      ) : null}
                      {report.status !== "dismissed" ? (
                        <button
                          type="button"
                          disabled={busyReportId === report.id}
                          onClick={() => setReportStatus(report.id, "dismissed")}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-60"
                        >
                          {t("report.markDismissed")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-slate-500">{t("report.empty")}</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TodayDate() {
  const { language } = useLanguage();
  const [text, setText] = useState("");

  useEffect(() => {
    setText(
      new Date().toLocaleDateString(language === "en" ? "en-GB" : "id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, [language]);

  return <span className="font-medium text-[#0a1633]">{text}</span>;
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  change,
  up,
  neutral,
}: {
  icon: typeof Banknote;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  change: string;
  up?: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-all hover:shadow-cardHover">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.8} />
        </div>
        {up ? (
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp className="h-3 w-3" /> {change}
          </span>
        ) : neutral ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {change}
          </span>
        ) : (
          <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500">
            <TrendingDown className="h-3 w-3" /> {change}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0a1633]">{value}</p>
    </div>
  );
}

function FinanceRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${accent ? "font-semibold text-[#0a1633]" : "text-slate-500"}`}>{label}</span>
      <span className={`text-sm ${accent ? "font-bold text-emerald-600" : "font-semibold text-[#0a1633]"}`}>
        {value}
      </span>
    </div>
  );
}

function PaymentMethodRow({
  name,
  pct,
  color,
  count,
}: {
  name: string;
  pct: number;
  color: string;
  count?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-[#0a1633]">{name}</span>
        <span className="font-semibold text-slate-600">
          {count != null ? `${count}x · ` : ""}
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
