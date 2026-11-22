"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Clock,
  Download,
  Hourglass,
  Landmark,
  Loader2,
  Percent,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { api } from "@/lib/api";
import { buildWorkbook, downloadWorkbook, excelDate, reportDate, reportDateTime } from "@/lib/report";
import type { CellValue, ReportMeta, SummaryLine, SummarySpec, TableSpec } from "@/lib/report";
import { useLanguage } from "@/lib/i18n";

type SellerFinanceTransaction = {
  id: string;
  order_id: string;
  order_number: string;
  product_name: string;
  product_image: string | null;
  category?: string | null;
  qty: number;
  unit_price?: number;
  gross: number;
  fee: number;
  fee_rate: number;
  net: number;
  status: "pending" | "settled";
  date: string;
  order_date?: string | null;
  order_status: string;
  order_status_label?: string;
  fund_status?: string;
  estimated_clear?: string | null;
};

type WithdrawalRecord = {
  id: string;
  seller_id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "rejected";
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  note: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
};

type BankAccount = {
  id: string;
  type: string;
  bank_name: string;
  account_name: string;
  account_number: string;
};

type SellerFinanceResponse = {
  summary: {
    gross: number;
    availableBalance: number;
    settledBalance: number;
    platformCredits: number;
    pendingBalance: number;
    pendingWithdrawal: number;
    withdrawnAmount: number;
    sellerBalanceRaw: number;
    deficit: number;
    totalRevenue: number;
    totalFees: number;
    totalNet: number;
    transactions: number;
    units: number;
    validOrders: number;
    activeOrders: number;
    completedOrders: number;
  };
  feeTier: {
    tenureMonths: number;
    soldQty: number;
    rate: number;
    since?: string | null;
  };
  transactions: SellerFinanceTransaction[];
  withdrawals: WithdrawalRecord[];
  platformPayouts?: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
    note: string | null;
  }>;
};

const EMPTY: SellerFinanceResponse = {
  summary: {
    gross: 0,
    availableBalance: 0,
    settledBalance: 0,
    platformCredits: 0,
    pendingBalance: 0,
    pendingWithdrawal: 0,
    withdrawnAmount: 0,
    sellerBalanceRaw: 0,
    deficit: 0,
    totalRevenue: 0,
    totalFees: 0,
    totalNet: 0,
    transactions: 0,
    units: 0,
    validOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
  },
  feeTier: { tenureMonths: 0, soldQty: 0, rate: 0.02, since: null },
  transactions: [],
  withdrawals: [],
  platformPayouts: [],
};

const MIN_WITHDRAWAL = 10000;

const WITHDRAWAL_STATUS: Record<
  WithdrawalRecord["status"],
  { className: string; key: string }
> = {
  pending: { className: "bg-[#FFF4E5] text-[#C2410C]", key: "seller.withdrawalPending" },
  processing: { className: "bg-[#E8F0FE] text-[#2563EB]", key: "seller.withdrawalProcessing" },
  completed: { className: "bg-[#E9F8EF] text-[#16A34A]", key: "seller.withdrawalCompleted" },
  rejected: { className: "bg-[#FDECEC] text-[#E11D48]", key: "seller.withdrawalRejected" },
};

function formatRupiah(value: number) {
  return "Rp " + Math.round(value || 0).toLocaleString("id-ID");
}

function formatPercent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(1).replace(".0", "")}%`;
}

function formatDate(iso: string) {
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

const WIB_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Payload tanggal transaksi sudah berupa "yyyy-mm-dd HH:mm" (WIB).
// Parsing komponen eksplisit menghindari pergeseran zona waktu dari new Date(string).
function wibParts(value: string | null | undefined) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return {
    day,
    month: WIB_MONTHS[monthIndex],
    year,
    time: hour && minute ? `${hour}:${minute}` : null,
  };
}

function formatWibDateTime(value: string | null | undefined) {
  const parts = wibParts(value);
  if (!parts) return "-";
  return `${parts.day} ${parts.month} ${parts.year}${parts.time ? ` · ${parts.time} WIB` : ""}`;
}

function formatWibDate(value: string | null | undefined) {
  const parts = wibParts(value);
  if (!parts) return "-";
  return `${parts.day} ${parts.month} ${parts.year}`;
}

function formatTransactionDate(value: string) {
  return wibParts(value) ? formatWibDateTime(value) : formatDate(value);
}

function maskNumber(value: string | null | undefined) {
  const digits = String(value || "");
  if (digits.length <= 4) return digits;
  return "•••• " + digits.slice(-4);
}

export default function Finance() {
  const { t } = useLanguage();
  const [data, setData] = useState<SellerFinanceResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankMode, setBankMode] = useState<string>("new");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const withdrawalBlocked = Number(data.summary.deficit) > 0;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<SellerFinanceResponse>("/api/finance/seller")
      .then((payload) => {
        if (alive) {
          setData({ ...EMPTY, ...payload });
          setError("");
        }
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : t("sellerFinance.loadFailed"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t]);

  function loadAccounts() {
    api<{ accounts: BankAccount[] }>("/api/bank-accounts")
      .then((payload) => {
        const list = payload.accounts || [];
        setAccounts(list);
        if (list.length) setBankMode((current) => (current === "new" ? list[0].id : current));
      })
      .catch(() => setAccounts([]));
  }

  function openModal() {
    setFormError("");
    setNotice("");
    setAmount("");
    setNote("");
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setBankMode(accounts[0]?.id || "new");
    setModalOpen(true);
    loadAccounts();
  }

  async function submitWithdrawal() {
    setFormError("");
    if (withdrawalBlocked) {
      setFormError(t("seller.withdrawBlockedDeficit"));
      return;
    }
    const value = Math.round(Number(amount.replace(/[^\d]/g, "")));
    if (!value || value <= 0) {
      setFormError(t("seller.withdrawInvalid"));
      return;
    }
    if (value < MIN_WITHDRAWAL) {
      setFormError(t("seller.withdrawMin"));
      return;
    }
    if (value > data.summary.availableBalance) {
      setFormError(t("seller.withdrawInsufficient"));
      return;
    }

    const payload: Record<string, unknown> = { amount: value };
    if (note.trim()) payload.note = note.trim();
    if (bankMode === "new") {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
        setFormError(t("seller.withdrawCompleteBank"));
        return;
      }
      payload.bank_name = bankName.trim();
      payload.account_name = accountName.trim();
      payload.account_number = accountNumber.trim();
    } else {
      payload.bank_account_id = bankMode;
    }

    setSubmitting(true);
    try {
      const res = await api<{
        summary: SellerFinanceResponse["summary"];
        withdrawals: WithdrawalRecord[];
      }>("/api/finance/seller/withdrawals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setData((current) => ({
        ...current,
        summary: res.summary,
        withdrawals: res.withdrawals,
      }));
      setModalOpen(false);
      setNotice(t("seller.withdrawSuccess"));
      loadAccounts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("seller.withdrawFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const transactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.transactions;
    return data.transactions.filter((row) => {
      return (
        row.order_number?.toLowerCase().includes(q) ||
        row.product_name?.toLowerCase().includes(q)
      );
    });
  }, [data.transactions, query]);

  const withdrawals = data.withdrawals || [];

  async function handleDownload() {
    setDownloading(true);
    try {
      type ExportTransaction = {
        order_number: string;
        date: string | null;
        order_date: string | null;
        product_name: string;
        category: string | null;
        qty: number;
        unit_price: number;
        gross: number;
        fee_rate: number;
        fee: number;
        net: number;
        order_status_label: string;
        fund_status: string;
        estimated_clear: string | null;
        status: string;
      };
      type ExportWithdrawal = {
        requested_at: string;
        status: string;
        bank_name: string | null;
        account_number: string | null;
        amount: number;
        note: string | null;
        seller_name: string | null;
      };
      type ExportSellerFinance = {
        summary: {
          gross: number;
          totalRevenue: number;
          totalFees: number;
          totalNet: number;
          settledBalance: number;
          pendingBalance: number;
          platformCredits: number;
          withdrawnAmount: number;
          pendingWithdrawal: number;
          sellerBalanceRaw: number;
          availableBalance: number;
          deficit: number;
          transactions: number;
          units: number;
          validOrders: number;
          activeOrders: number;
          completedOrders: number;
        };
        feeTier: { tenureMonths: number; soldQty: number; rate: number; since: string | null };
        transactions: ExportTransaction[];
        withdrawals: ExportWithdrawal[];
        platformPayouts?: Array<{ created_at: string; amount: number; status: string; note: string | null }>;
      };

      const payload = await api<ExportSellerFinance>("/api/finance/seller");
      const s = payload.summary;
      const today = reportDate();
      const subject = payload.withdrawals.find((row) => row.seller_name)?.seller_name || "Seller";
      const effectiveRate = s.gross > 0 ? s.totalFees / s.gross : 0;
      const netMatches = Math.round(s.totalNet) === Math.round(s.settledBalance + s.pendingBalance);
      const netDiff = s.totalNet - (s.settledBalance + s.pendingBalance);
      const withdrawalStatus = (status: string) => {
        const labels: Record<string, string> = {
          completed: "Berhasil",
          processing: "Diproses",
          pending: "Menunggu",
          rejected: "Ditolak",
        };
        return labels[status] || status;
      };

      const meta: ReportMeta = {
        title: "Laporan Keuangan Seller",
        platform: "ElektroMart",
        subject,
        period: { from: today, to: today },
        generatedAt: reportDateTime(),
        notes: [
          "Hanya pesanan valid (Dibayar, Dikirim, Selesai) yang dihitung.",
          "Fee menggunakan snapshot tarif pada saat transaksi.",
        ],
        currency: "Rupiah (Rp)",
      };

      const transactionRows: CellValue[][] = payload.transactions.length
        ? payload.transactions.map((row, index) => [
            index + 1,
            excelDate(row.date),
            row.order_number,
            row.product_name,
            Number(row.qty || 0),
            Number(row.unit_price || 0),
            Number(row.gross || 0),
            Number(row.fee_rate || 0),
            -Number(row.fee || 0),
            Number(row.net || 0),
            row.order_status_label,
            row.fund_status,
            excelDate(row.estimated_clear),
          ])
        : [["Tidak ada transaksi pada periode ini."]];

      const withdrawalRows: CellValue[][] = payload.withdrawals.length
        ? payload.withdrawals.map((row) => [
            excelDate(row.requested_at),
            withdrawalStatus(row.status),
            row.bank_name || "-",
            maskNumber(row.account_number),
            Number(row.amount || 0),
            row.note || "",
          ])
        : [["Tidak ada penarikan pada periode ini."]];

      const lines: SummaryLine[] = [
        { kind: "section", label: "1. Penjualan", value: s.gross },
        { kind: "detail", label: "Subtotal Pesanan (Penjualan Kotor)", value: s.gross, note: "" },
        { kind: "detail", label: "Jumlah Pesanan", value: { value: s.validOrders, format: "number" }, note: "" },
        { kind: "detail", label: "Jumlah Unit Terjual", value: { value: s.units, format: "number" }, note: "" },
        { kind: "spacer" },
        { kind: "section", label: "2. Potongan", value: -s.totalFees },
        {
          kind: "detail",
          label: "Fee Admin Platform",
          value: -s.totalFees,
          note: `Tarif efektif ${(effectiveRate * 100).toFixed(1)}%`,
        },
        { kind: "detail", label: "Potongan lain", value: 0, note: "" },
        { kind: "subtotal", label: "3. Pendapatan Bersih", value: s.totalNet },
        { kind: "spacer" },
        { kind: "section", label: "4. Posisi Saldo" },
        { kind: "detail", label: "Saldo Selesai", value: s.settledBalance, note: "" },
        { kind: "detail", label: "Kredit dari Platform", value: s.platformCredits, note: "" },
        {
          kind: "detail",
          label: "Saldo Tertunda (Dibayar + Dikirim)",
          value: s.pendingBalance,
          note: `${s.activeOrders} pesanan`,
        },
        { kind: "detail", label: "Total Ditarik", value: -s.withdrawnAmount, note: "" },
        { kind: "detail", label: "Penarikan Diproses", value: -s.pendingWithdrawal, note: "" },
        { kind: "subtotal", label: "Saldo Aktif (dapat ditarik)", value: s.availableBalance },
        {
          kind: "detail",
          label: "Saldo Minus / Kekurangan",
          value: s.deficit,
          note: "Penarikan melebihi saldo selesai; penarikan baru diblokir",
        },
        { kind: "spacer" },
        {
          kind: "check",
          label: "Pendapatan Bersih = Saldo Selesai + Saldo Tertunda",
          value: netMatches ? "OK" : `Selisih ${formatRupiah(Math.abs(netDiff))}`,
        },
        { kind: "check", label: "Tarif fee berlaku", value: `${(Number(payload.feeTier.rate || 0) * 100).toFixed(1)}%` },
        {
          kind: "detail",
          label: "Mulai Berjualan",
          value: { value: excelDate(payload.feeTier.since) || "", format: "date" },
          note: "",
        },
      ];

      const sheets: Array<TableSpec | SummarySpec> = [
        {
          kind: "summary",
          name: "Ringkasan",
          title: "Ringkasan Keuangan Seller",
          lines,
          widths: [56, 22, 48],
        },
        {
          kind: "table",
          name: "Detail Transaksi",
          title: "Detail Transaksi",
          subtitle: "Pesanan valid (Dibayar, Dikirim, Selesai)",
          columns: [
            { header: "No", width: 6, format: "number", align: "center" },
            { header: "Tanggal", width: 16, format: "date", align: "center" },
            { header: "No. Pesanan", width: 24 },
            { header: "Produk", width: 34 },
            { header: "Qty", width: 8, format: "number", align: "center" },
            { header: "Harga Satuan", width: 18, format: "currency" },
            { header: "Penjualan Kotor", width: 20, format: "currency" },
            { header: "Tarif Fee", width: 12, format: "percent", align: "center" },
            { header: "Fee Admin", width: 18, format: "currency" },
            { header: "Pendapatan Bersih", width: 20, format: "currency" },
            { header: "Status Pesanan", width: 18 },
            { header: "Status Dana", width: 16 },
            { header: "Estimasi Cair", width: 16, format: "date", align: "center" },
          ],
          rows: transactionRows,
          total: (row) => [
            "TOTAL",
            null,
            null,
            null,
            `=SUM(E8:E${row - 1})`,
            null,
            `=SUM(G8:G${row - 1})`,
            null,
            `=-SUM(I8:I${row - 1})`,
            `=SUM(J8:J${row - 1})`,
            null,
            null,
            null,
          ],
        },
        {
          kind: "table",
          name: "Riwayat Penarikan Dana",
          title: "Riwayat Penarikan Dana",
          subtitle: "Penarikan dana seller",
          columns: [
            { header: "Tanggal", width: 16, format: "date", align: "center" },
            { header: "Status", width: 14, align: "center" },
            { header: "Bank", width: 20 },
            { header: "No. Rekening", width: 20 },
            { header: "Jumlah", width: 20, format: "currency" },
            { header: "Catatan", width: 36 },
          ],
          rows: withdrawalRows,
          total: (row) => ["TOTAL", null, null, null, `=SUM(E8:E${row - 1})`, null],
        },
      ];

      const workbook = buildWorkbook(meta, sheets);
      await downloadWorkbook(`laporan-keuangan-seller-${today}.xlsx`, workbook);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <div className="flex items-start justify-between gap-4 px-8 pb-2 pt-8">
        <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{t("seller.financeWallet")}</h1>
        <div className="flex flex-col items-end gap-3">
          <TopBar variant="inline" />
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || downloading}
            title={t("seller.downloadFinanceReport")}
            className="flex items-center gap-2 rounded-xl border border-[#E4E8F1] bg-white px-3.5 py-2 text-[13px] font-semibold text-seller-ink shadow-sm transition hover:border-seller-navy/30 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-seller-muted" />}
            {t("seller.downloadFinanceReport")}
          </button>
        </div>
      </div>

      <div className="px-8 pb-10 pt-4">
        {error ? (
          <div className="mb-5 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#E11D48]">{error}</div>
        ) : null}
        {notice ? (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-[#E9F8EF] px-4 py-3 text-sm font-medium text-[#15803D]">
            <span className="flex items-center gap-2">
              <Check size={16} /> {notice}
            </span>
            <button type="button" onClick={() => setNotice("")} className="text-[#15803D]/70 hover:text-[#15803D]">
              <X size={16} />
            </button>
          </div>
        ) : null}

        {withdrawalBlocked ? (
          <div className="mb-5 rounded-xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm text-[#B91C1C]">
            <p className="font-bold">{t("sellerFinance.deficitStat")}: {formatRupiah(data.summary.deficit)}</p>
            <p className="mt-0.5">{t("sellerFinance.deficitNotice")}</p>
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-seller-navy p-8 text-white xl:col-span-2">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9DB4E8]">{t("seller.activeBalance")}</p>
            <p className="mt-3 text-[36px] font-bold leading-none">
              {loading ? "…" : formatRupiah(data.summary.availableBalance)}
            </p>
            <p className="mt-3 text-sm text-[#9DB4E8]">{t("seller.balanceReadyToWithdraw")}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openModal}
                disabled={withdrawalBlocked}
                title={withdrawalBlocked ? t("seller.withdrawBlockedDeficit") : undefined}
                className="flex items-center gap-2 rounded-xl bg-seller-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Wallet size={16} /> {t("seller.withdraw")}
              </button>
              <a
                href="#withdrawal-history"
                className="flex items-center gap-2 rounded-xl border border-[#6B82B5] px-5 py-2.5 text-sm font-semibold text-[#C5D4F2] transition hover:bg-white/12"
              >
                {t("seller.withdrawalHistory")}
              </a>
            </div>

            <Wallet size={140} className="pointer-events-none absolute -bottom-6 -right-4 text-white/10" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[#E8ECF3] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#3B5B8C]">
                  <Hourglass size={18} />
                </span>
              </div>
              <p className="text-sm text-seller-muted">{t("sellerFinance.pendingBalanceDetailed")}</p>
              <p className="mt-1 text-xl font-bold text-seller-ink">
                {loading ? "…" : formatRupiah(data.summary.pendingBalance)}
              </p>
              <p className="mt-1 text-xs text-seller-muted">{t("sellerFinance.pendingEscrowNote")}</p>
            </div>

            <div className="rounded-2xl border border-[#E8ECF3] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#3B5B8C]">
                  <TrendingUp size={18} />
                </span>
                <span className="rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-xs font-bold text-seller-orange">
                  {t("sellerFinance.adminFeeSnapshot")}: -{formatRupiah(data.summary.totalFees)}
                </span>
              </div>
              <p className="text-sm text-seller-muted">{t("sellerFinance.grossSales")}</p>
              <p className="mt-1 text-xl font-bold text-seller-ink">
                {loading ? "…" : formatRupiah(data.summary.gross || data.summary.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-seller-muted">{t("sellerFinance.grossNote")}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E8ECF3] bg-white px-5 py-4">
            <p className="text-xs font-medium text-seller-muted">{t("seller.pendingWithdrawal")}</p>
            <p className="mt-1 text-lg font-bold text-seller-ink">{formatRupiah(data.summary.pendingWithdrawal)}</p>
          </div>
          <div className="rounded-2xl border border-[#E8ECF3] bg-white px-5 py-4">
            <p className="text-xs font-medium text-seller-muted">{t("seller.withdrawnTotal")}</p>
            <p className="mt-1 text-lg font-bold text-seller-ink">{formatRupiah(data.summary.withdrawnAmount)}</p>
          </div>
          <div className="rounded-2xl border border-[#E8ECF3] bg-white px-5 py-4">
            <p className="text-xs font-medium text-seller-muted">{t("seller.platformCredit")}</p>
            <p className="mt-1 text-lg font-bold text-seller-ink">{formatRupiah(data.summary.platformCredits)}</p>
            <p className="mt-0.5 text-[11px] text-seller-muted">{t("seller.platformCreditDesc")}</p>
          </div>
          <div className={`rounded-2xl border bg-white px-5 py-4 ${withdrawalBlocked ? "border-[#FECACA]" : "border-[#E8ECF3]"}`}>
            <p className="text-xs font-medium text-seller-muted">{t("sellerFinance.deficitStat")}</p>
            <p className={`mt-1 text-lg font-bold ${withdrawalBlocked ? "text-[#E11D48]" : "text-seller-ink"}`}>
              {formatRupiah(data.summary.deficit)}
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-[#E8ECF3] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF4E5] text-seller-orange">
                <Percent size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-seller-ink">{t("sellerFinance.feeTier")}</h2>
                <p className="mt-0.5 max-w-xl text-xs text-seller-muted">{t("sellerFinance.feeTierDesc")}</p>
              </div>
            </div>
            <div className="rounded-xl bg-seller-navy px-5 py-3 text-center text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9DB4E8]">
                {t("sellerFinance.currentRateNew")}
              </p>
              <p className="mt-0.5 text-2xl font-bold">{formatPercent(data.feeTier.rate)}</p>
              <p className="mt-1 text-[10px] text-[#9DB4E8]">{t("sellerFinance.feeSnapshotNote")}</p>
              <p className="mt-0.5 text-[10px] text-[#9DB4E8]">
                {t("sellerFinance.sellingSince", { date: formatWibDate(data.feeTier.since) })}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#F7F9FC] px-4 py-3">
              <p className="text-xs text-seller-muted">{t("sellerFinance.tenure")}</p>
              <p className="mt-0.5 text-sm font-bold text-seller-ink">
                {t("sellerFinance.months", { count: data.feeTier.tenureMonths })}
              </p>
            </div>
            <div className="rounded-xl bg-[#F7F9FC] px-4 py-3">
              <p className="text-xs text-seller-muted">{t("sellerFinance.soldQty")}</p>
              <p className="mt-0.5 text-sm font-bold text-seller-ink">{data.feeTier.soldQty}</p>
            </div>
            <div className="rounded-xl bg-[#F7F9FC] px-4 py-3">
              <p className="text-xs text-seller-muted">{t("sellerFinance.totalFees")}</p>
              <p className="mt-0.5 text-sm font-bold text-seller-ink">{formatRupiah(data.summary.totalFees)}</p>
            </div>
          </div>
        </div>

        <div id="withdrawal-history" className="mb-5 rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-seller-ink">{t("seller.withdrawalHistory")}</h2>
              <p className="mt-0.5 text-xs text-seller-muted">{t("seller.withdrawalDesc")}</p>
            </div>
            <button
              type="button"
              onClick={openModal}
              disabled={withdrawalBlocked}
              title={withdrawalBlocked ? t("seller.withdrawBlockedDeficit") : undefined}
              className="flex items-center gap-2 rounded-xl bg-seller-navy px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowDownToLine size={15} /> {t("seller.withdraw")}
            </button>
          </div>

          {withdrawals.length === 0 ? (
            <p className="py-8 text-center text-sm text-seller-muted">{t("seller.withdrawalHistoryEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#EEF3FA] text-[13px] text-seller-ink">
                    <th className="rounded-l-xl px-4 py-3 font-semibold">{t("seller.withdrawalDate")}</th>
                    <th className="px-4 py-3 font-semibold">{t("seller.withdrawalAccount")}</th>
                    <th className="px-4 py-3 font-semibold">{t("seller.withdrawalAmount")}</th>
                    <th className="rounded-r-xl px-4 py-3 font-semibold">{t("admin.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((row) => {
                    const meta = WITHDRAWAL_STATUS[row.status] || WITHDRAWAL_STATUS.pending;
                    return (
                      <tr key={row.id} className="border-b border-[#F1F4F8] last:border-0">
                        <td className="whitespace-nowrap px-4 py-4 text-seller-muted">
                          {formatDate(row.requested_at || row.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-seller-ink">{row.bank_name || "-"}</p>
                          <p className="text-xs text-seller-muted">
                            {row.account_name || "-"} · {maskNumber(row.account_number)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-seller-ink">
                          {formatRupiah(row.amount)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
                            {t(meta.key)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-seller-ink">{t("sellerFinance.transactions")}</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("seller.searchTransactions")}
              className="h-10 w-full max-w-xs rounded-xl border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-seller-muted">
              <Loader2 size={16} className="animate-spin" /> {t("adminFinance.loading")}
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-seller-muted">{t("sellerFinance.transactionEmpty")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#EEF3FA] text-[13px] text-seller-ink">
                    <th className="px-4 py-3 font-semibold">{t("admin.transactionId")}</th>
                    <th className="px-4 py-3 font-semibold">{t("seller.date")}</th>
                    <th className="px-4 py-3 font-semibold">{t("seller.transactionDescription")}</th>
                    <th className="px-4 py-3 font-semibold">{t("sellerFinance.gross")}</th>
                    <th className="px-4 py-3 font-semibold">{t("sellerFinance.fee")}</th>
                    <th className="px-4 py-3 font-semibold">{t("sellerFinance.net")}</th>
                    <th className="px-4 py-3 font-semibold">{t("sellerFinance.orderStatus")}</th>
                    <th className="px-4 py-3 font-semibold">{t("sellerFinance.fundStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row, index) => {
                    const settled = row.order_status === "completed" || (!row.order_status && row.status === "settled");
                    const orderStatusLabel =
                      row.order_status_label ||
                      (row.order_status === "completed"
                        ? t("seller.completed")
                        : row.order_status === "shipped"
                          ? t("profile.orderShipped")
                          : row.order_status === "paid"
                            ? t("adminFinance.statusPaid")
                            : !row.order_status && row.status === "settled"
                              ? t("sellerFinance.statusSettled")
                              : t("sellerFinance.statusPending"));
                    const fundStatusLabel =
                      row.fund_status || (settled ? t("sellerFinance.fundAvailable") : t("sellerFinance.fundHeld"));
                    return (
                      <tr key={row.id} className={index % 2 === 1 ? "bg-[#F7F9FC]" : "bg-white"}>
                        <td className="px-4 py-4 font-semibold text-seller-ink">{row.order_number}</td>
                        <td className="whitespace-nowrap px-4 text-seller-muted">{formatTransactionDate(row.date)}</td>
                        <td className="px-4 text-seller-ink/80">
                          {row.product_name}
                          <span className="block text-xs text-seller-muted">
                            {row.category ? `${row.category} · ` : ""}
                            {t("sellerFinance.unitPrice")} {formatRupiah(row.unit_price || 0)} · {row.qty}× ·{" "}
                            {t("sellerFinance.fee")} {formatPercent(row.fee_rate)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 font-medium text-seller-ink">{formatRupiah(row.gross)}</td>
                        <td className="whitespace-nowrap px-4 font-medium text-[#E11D48]">-{formatRupiah(row.fee)}</td>
                        <td className="whitespace-nowrap px-4 font-semibold text-seller-ink">{formatRupiah(row.net)}</td>
                        <td className="px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                              settled ? "bg-[#E9F8EF] text-[#16A34A]" : "bg-[#E8F0FE] text-[#2563EB]"
                            }`}
                          >
                            {settled ? <Check size={12} /> : <Clock size={12} />}
                            {orderStatusLabel}
                          </span>
                        </td>
                        <td className="px-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                              settled ? "bg-[#E9F8EF] text-[#15803D]" : "bg-[#FFF4E5] text-[#C2410C]"
                            }`}
                          >
                            {fundStatusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F6] px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF4E5] text-seller-orange">
                  <Landmark size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-seller-ink">{t("seller.withdrawTitle")}</h2>
                  <p className="mt-0.5 text-xs text-seller-muted">{t("seller.withdrawSubtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-seller-muted transition hover:bg-[#F1F4F8] hover:text-seller-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div className="rounded-xl bg-[#F7F9FC] px-4 py-3">
                <p className="text-xs text-seller-muted">{t("seller.withdrawAvailable")}</p>
                <p className="mt-0.5 text-lg font-bold text-seller-ink">
                  {formatRupiah(data.summary.availableBalance)}
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-semibold text-seller-ink">{t("seller.withdrawAmount")}</label>
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.floor(data.summary.availableBalance)))}
                    className="text-xs font-semibold text-seller-navy hover:underline"
                  >
                    {t("seller.withdrawAll")}
                  </button>
                </div>
                <div className="flex items-center rounded-xl border border-[#E4E8F1] px-3 focus-within:border-seller-navy">
                  <span className="text-sm font-semibold text-seller-muted">Rp</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder="0"
                    className="h-11 w-full bg-transparent px-2 text-sm font-semibold text-seller-ink outline-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-seller-muted">{t("seller.withdrawMin")}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-seller-ink">
                  {t("seller.withdrawBank")}
                </label>
                <select
                  value={bankMode}
                  onChange={(e) => setBankMode(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bank_name} · {maskNumber(account.account_number)} · {account.account_name}
                    </option>
                  ))}
                  <option value="new">{t("seller.withdrawNewBank")}</option>
                </select>
              </div>

              {bankMode === "new" ? (
                <div className="space-y-3 rounded-xl border border-dashed border-[#D6DEEC] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-seller-muted">
                      {t("seller.withdrawBankName")}
                    </label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="BCA / BRI / Mandiri"
                      className="h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-seller-muted">
                        {t("seller.withdrawAccountName")}
                      </label>
                      <input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-seller-muted">
                        {t("seller.withdrawAccountNumber")}
                      </label>
                      <input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        className="h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-semibold text-seller-muted">
                  {t("seller.withdrawNote")}
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-seller-ink outline-none focus:border-seller-navy"
                />
              </div>

              {formError ? (
                <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm font-medium text-[#E11D48]">{formError}</div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#EEF1F6] px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-[#E4E8F1] px-4 py-2.5 text-sm font-semibold text-seller-ink"
              >
                {t("seller.withdrawCancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitWithdrawal()}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-seller-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowDownToLine size={15} />}
                {t("seller.withdrawSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
