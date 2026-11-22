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
import { buildWorkbook, downloadWorkbook, reportDate } from "@/lib/report";
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
        <span className="mt-0.5 text-[10px] text-slate-400">{displayTotal} {t("products")}</span>
      </div>
    </div>
  );
}

function fromDeg(deg: number) {
  return Math.round(deg * 10) / 10;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ sellers: 0, buyers: 0, products: 0, categories: 0 });
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
      stats: { sellers: number; buyers: number; products: number; categories: number };
      categories: { name: string; color: string; product_count: number; stock_total?: number }[];
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
          value: category.product_count || 0,
          stock: category.stock_total || 0,
          color: category.color || "#94a3b8",
        }));
        const categoryTotal = categorySales.reduce((sum, category) => sum + category.value, 0);
        const unassignedProducts = Math.max(0, data.stats.products - categoryTotal);
        const accessories = categorySales.find((category) => category.label.toLowerCase() === "aksesoris");
        if (accessories && unassignedProducts > 0) accessories.value += unassignedProducts;
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
      const categorySheet = t("adminReport.category");
      const paymentSheet = t("admin.popularPaymentMethods");
      const categoryTotal = 5 + categorySales.length;
      const paymentTotal = 5 + paymentMethods.length;
      const sum = (sheet: string, col: string, totalRow: number) =>
        `='${sheet}'!${col}${totalRow}`;
      const categoryCell = categorySales.length ? sum(categorySheet, "B", categoryTotal) : 0;
      const paymentCell = paymentMethods.length ? sum(paymentSheet, "B", paymentTotal) : 0;

      const workbook = buildWorkbook(
        {
          title: `${t("adminReport.technicalTitle")} — ElektroMart`,
          subtitle: `${t("adminReport.generatedAt")}: ${new Date().toLocaleString("id-ID", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}`,
          generatedLabel: t("adminReport.generatedAt"),
        },
        [
          {
            name: t("adminReport.summary"),
            title: t("adminReport.technicalTitle"),
            subtitle: "ElektroMart",
            columns: [
              { header: t("adminReport.metric"), width: 36 },
              { header: t("adminReport.value"), width: 22 },
              { header: t("adminReport.note"), width: 42 },
            ],
            rows: [
              [t("admin.activeSellers"), { value: stats.sellers, format: "number" }, ""],
              [t("admin.registeredBuyers"), { value: stats.buyers, format: "number" }, ""],
              [t("admin.registeredProducts"), { value: stats.products, format: "number" }, ""],
              [t("admin.registeredCategories"), { value: stats.categories, format: "number" }, ""],
              [t("admin.totalRevenue"), { value: orders.totalRevenue, format: "currency" }, ""],
              [t("admin.commissionRevenue"), { value: orders.commissionRevenue, format: "currency" }, ""],
              [t("admin.escrowHeldFunds"), { value: orders.escrowHeldFunds, format: "currency" }, ""],
              [t("admin.totalPayoutToSellers"), { value: orders.totalPayoutToSellers, format: "currency" }, ""],
              [t("adminReport.totalOrder"), { value: orders.total, format: "number" }, ""],
              [t("admin.totalTransactionsThisMonth"), { value: orders.thisMonth, format: "number" }, ""],
              [t("adminFinance.revenueOrders"), { value: orders.revenueOrders, format: "number" }, ""],
              [t("adminReport.reports"), { value: reports.length, format: "number" }, reports.length ? "" : t("report.empty")],
              [t("admin.flashSaleToday"), { value: flashSale.soldUnits, format: "number" }, `${flashSale.soldUnits}/${flashSale.quota} ${t("soldCount")}`],
              [t("admin.activeFlashSale"), { value: flashSale.activeProducts, format: "number" }, `${flashSale.soldUnits} ${t("adminReport.soldUnits")} ${t("adminReport.quota")}`],
              [t("adminReport.productCount"), { value: categoryCell, format: "number" }, t("adminReport.fromCategories")],
              [t("adminReport.payments"), { value: paymentCell, format: "number" }, t("adminReport.fromPayments")],
            ],
          },
          {
            name: categorySheet,
            title: t("admin.distributionPerCategory"),
            subtitle: t("admin.unitsSoldThisYear"),
            columns: [
              { header: t("adminReport.category"), width: 30 },
              { header: t("adminReport.productCount"), width: 18, format: "number" },
              { header: t("adminReport.stockTotal"), width: 18, format: "number" },
              {
                header: t("adminReport.share"),
                width: 14,
                format: "percent",
                formula: (r) => `IF($B${categoryTotal}=0,0,B${r}/$B${categoryTotal})`,
              },
            ],
            rows: categorySales.map((category) => [category.label, category.value, category.stock, null]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" },
              `=SUM(B5:B${Math.max(r - 1, 5)})`,
              `=SUM(C5:C${Math.max(r - 1, 5)})`,
              `=SUM(D5:D${Math.max(r - 1, 5)})`,
            ],
          },
          {
            name: paymentSheet,
            title: t("admin.popularPaymentMethods"),
            subtitle: t("adminReport.technicalTitle"),
            columns: [
              { header: t("adminReport.method"), width: 30 },
              { header: t("adminReport.payments"), width: 18, format: "number" },
              {
                header: t("adminReport.share"),
                width: 14,
                format: "percent",
                formula: (r) => `IF($B${paymentTotal}=0,0,B${r}/$B${paymentTotal})`,
              },
            ],
            rows: paymentMethods.map((method) => [method.name, method.count, null]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" },
              `=SUM(B5:B${Math.max(r - 1, 5)})`,
              `=SUM(C5:C${Math.max(r - 1, 5)})`,
            ],
          },
          {
            name: t("admin.flashSaleToday"),
            title: t("admin.flashSaleToday"),
            subtitle: `${flashSale.soldUnits}/${flashSale.quota} ${t("soldCount")}`,
            columns: [
              { header: t("adminReport.no"), width: 6, format: "number" },
              { header: t("adminReport.product"), width: 40 },
              { header: t("adminReport.quota"), width: 14, format: "number" },
              { header: t("adminReport.soldUnits"), width: 14, format: "number" },
              { header: t("adminReport.remaining"), width: 14, format: "number" },
              { header: t("adminReport.stock"), width: 14, format: "number" },
            ],
            rows: flashSale.products.map((product, index) => [
              index + 1,
              product.name,
              product.flash_sale_quota,
              product.flash_sale_sold,
              product.flash_sale_remaining,
              product.stock ?? 0,
            ]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" }, "",
              `=SUM(C5:C${Math.max(r - 1, 5)})`,
              `=SUM(D5:D${Math.max(r - 1, 5)})`,
              `=SUM(E5:E${Math.max(r - 1, 5)})`,
              `=SUM(F5:F${Math.max(r - 1, 5)})`,
            ],
          },
          {
            name: t("bestSellers"),
            title: t("bestSellers"),
            subtitle: t("admin.topSoldSubtitle"),
            columns: [
              { header: t("adminReport.no"), width: 6, format: "number" },
              { header: t("adminReport.product"), width: 40 },
              { header: t("adminReport.stock"), width: 12, format: "number" },
              { header: t("adminReport.category"), width: 22 },
            ],
            rows: popularProducts.map((product, index) => [
              index + 1, product.name, product.stock, product.category || t("categoryFallback"),
            ]),
          },
          {
            name: t("adminReport.topSellers"),
            title: t("adminReport.topSellers"),
            subtitle: t("admin.highestRevenueThisMonth"),
            columns: [
              { header: t("adminReport.no"), width: 6, format: "number" },
              { header: t("adminReport.seller"), width: 38 },
              { header: t("adminReport.productsOwned"), width: 16, format: "number" },
            ],
            rows: topSellers.map((seller, index) => [index + 1, seller.name, seller.products]),
          },
          {
            name: t("report.adminTitle"),
            title: t("report.adminTitle"),
            subtitle: t("report.adminSubtitle"),
            columns: [
              { header: t("adminReport.date"), width: 20 },
              { header: t("adminReport.reportedProduct"), width: 34 },
              { header: t("adminReport.reason"), width: 22 },
              { header: t("adminReport.reporter"), width: 24 },
              { header: t("adminReport.status"), width: 18 },
              { header: t("adminReport.description"), width: 46 },
            ],
            rows: reports.map((report) => [
              new Date(report.created_at).toLocaleDateString("id-ID", {
                day: "2-digit", month: "short", year: "numeric",
              }),
              report.product_name,
              report.reason,
              report.reporter || "-",
              t(report.status === "pending" ? "report.statusPending" : report.status === "resolved" ? "report.statusResolved" : "report.statusDismissed"),
              report.description || "",
            ]),
          },
        ]
      );

      await downloadWorkbook(`laporan-teknis-admin-${reportDate()}.xlsx`, workbook);
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
              value={String(stats.sellers)}
              change={t("admin.fromDatabase")}
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
                        <span className="mt-0.5 block text-right text-[10px] text-slate-400">{pct}%</span>
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
                  <FinanceRow label={t("admin.platformBalance")} value={formatRupiah(orders.commissionRevenue)} />
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
                  <span className="font-bold text-amber-600">{orders.thisMonth} {t("admin.thisMonthTx")}</span>
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
