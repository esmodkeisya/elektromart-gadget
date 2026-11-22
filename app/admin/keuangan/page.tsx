"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  HandCoins,
  Landmark,
  Loader2,
  Percent,
  Send,
  ShieldCheck,
  Store,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { api } from "@/lib/api";
import { buildWorkbook, downloadWorkbook, reportDate } from "@/lib/report";
import { useLanguage } from "@/lib/i18n";

type AdminFinanceTransaction = {
  id: string;
  order_number: string;
  seller: string;
  buyer_id: string;
  gross: number;
  fee: number;
  net: number;
  total: number;
  status: string;
  date: string;
  payment_method: string | null;
};

type AdminLedgerEntry = {
  id: string;
  order_id: string | null;
  order_number: string | null;
  seller_id: string | null;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};

type AdminWithdrawal = {
  id: string;
  seller_id: string;
  seller_name: string;
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

type PlatformPayout = {
  id: string;
  recipient_id: string;
  recipient_role: "seller" | "buyer";
  recipient_name: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
};

type PayoutRecipient = {
  id: string;
  role: "seller" | "buyer";
  name: string;
};

type AdminFinanceResponse = {
  summary: {
    grossVolume: number;
    platformRevenue: number;
    settledRevenue: number;
    heldRevenue: number;
    escrowHeldFunds: number;
    totalPayoutToSellers: number;
    revenueOrders: number;
    totalOrders: number;
    ordersThisMonth: number;
    pendingWithdrawalAmount: number;
    completedWithdrawalAmount: number;
    totalPlatformPayouts: number;
    availablePlatformBalance: number;
  };
  transactions: AdminFinanceTransaction[];
  ledger: AdminLedgerEntry[];
  withdrawals: AdminWithdrawal[];
  payouts: PlatformPayout[];
  feeTiers: { rate: number; label: string }[];
};

const EMPTY: AdminFinanceResponse = {
  summary: {
    grossVolume: 0,
    platformRevenue: 0,
    settledRevenue: 0,
    heldRevenue: 0,
    escrowHeldFunds: 0,
    totalPayoutToSellers: 0,
    revenueOrders: 0,
    totalOrders: 0,
    ordersThisMonth: 0,
    pendingWithdrawalAmount: 0,
    completedWithdrawalAmount: 0,
    totalPlatformPayouts: 0,
    availablePlatformBalance: 0,
  },
  transactions: [],
  ledger: [],
  withdrawals: [],
  payouts: [],
  feeTiers: [],
};

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-[#E8F0FE] text-[#2563EB]",
  shipped: "bg-[#FFF4E5] text-[#C2410C]",
  completed: "bg-[#E9F8EF] text-[#16A34A]",
  cancelled: "bg-[#EEF1F6] text-admin-muted",
};

const STATUS_KEY: Record<string, string> = {
  paid: "adminFinance.statusPaid",
  shipped: "profile.orderShipped",
  completed: "profile.orderCompleted",
  cancelled: "profile.orderCancelled",
};

const LEDGER_STYLE: Record<string, string> = {
  held: "bg-[#FFF4E5] text-[#C2410C]",
  settled: "bg-[#E9F8EF] text-[#16A34A]",
  cancelled: "bg-[#EEF1F6] text-admin-muted",
};

const WITHDRAWAL_STYLE: Record<string, string> = {
  pending: "bg-[#FFF4E5] text-[#C2410C]",
  processing: "bg-[#E8F0FE] text-[#2563EB]",
  completed: "bg-[#E9F8EF] text-[#16A34A]",
  rejected: "bg-[#FDECEC] text-[#E11D48]",
};

const WITHDRAWAL_KEY: Record<string, string> = {
  pending: "admin.withdrawalPending",
  processing: "admin.withdrawalProcessing",
  completed: "admin.withdrawalCompleted",
  rejected: "admin.withdrawalRejected",
};

const FEE_TIER_KEY: Record<string, string> = {
  "0.02": "adminFinance.tierNew",
  "0.03": "adminFinance.tierGrowing",
  "0.04": "adminFinance.tierEstablished",
  "0.05": "adminFinance.tierHighVolume",
};

function formatRupiah(value: number) {
  return "Rp " + Math.round(value || 0).toLocaleString("id-ID");
}

function formatPercent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(0)}%`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
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

function maskNumber(value: string | null | undefined) {
  const digits = String(value || "");
  if (digits.length <= 4) return digits;
  return "•••• " + digits.slice(-4);
}

export default function AdminKeuangan() {
  const { t } = useLanguage();
  const [data, setData] = useState<AdminFinanceResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [recipientRole, setRecipientRole] = useState<"seller" | "buyer">("seller");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipients, setRecipients] = useState<PayoutRecipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [disburseAmount, setDisburseAmount] = useState("");
  const [disburseNote, setDisburseNote] = useState("");
  const [disburseError, setDisburseError] = useState("");
  const [disburseSuccess, setDisburseSuccess] = useState("");
  const [disbursing, setDisbursing] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<AdminFinanceResponse>("/api/finance/admin")
      .then((payload) => {
        if (alive) {
          setData({ ...EMPTY, ...payload });
          setError("");
        }
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : t("adminFinance.loadFailed"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t]);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ role: recipientRole });
      if (recipientQuery.trim()) params.set("q", recipientQuery.trim());
      api<{ recipients: PayoutRecipient[] }>(`/api/finance/admin/payout-recipients?${params.toString()}`)
        .then((payload) => {
          if (!alive) return;
          setRecipients(payload.recipients || []);
          setRecipientId((current) =>
            (payload.recipients || []).some((row) => row.id === current) ? current : ""
          );
        })
        .catch(() => {
          if (alive) setRecipients([]);
        });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [recipientRole, recipientQuery]);

  async function updateWithdrawal(id: string, status: AdminWithdrawal["status"]) {
    setActionId(id);
    setActionError("");
    try {
      const res = await api<{ withdrawal: AdminWithdrawal }>(`/api/finance/admin/withdrawals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setData((current) => {
        const withdrawals = current.withdrawals.map((row) =>
          row.id === id ? { ...row, ...res.withdrawal } : row
        );
        return {
          ...current,
          withdrawals,
          summary: {
            ...current.summary,
            pendingWithdrawalAmount: withdrawals
              .filter((row) => row.status === "pending" || row.status === "processing")
              .reduce((sum, row) => sum + Number(row.amount || 0), 0),
            completedWithdrawalAmount: withdrawals
              .filter((row) => row.status === "completed")
              .reduce((sum, row) => sum + Number(row.amount || 0), 0),
          },
        };
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("admin.withdrawalActionFailed"));
    } finally {
      setActionId("");
    }
  }

  async function submitPayout() {
    setDisburseError("");
    setDisburseSuccess("");
    if (!recipientId) {
      setDisburseError(t("admin.payoutSelectRecipient"));
      return;
    }
    const amount = Math.round(Number(disburseAmount.replace(/[^\d]/g, "")));
    if (!amount || amount <= 0) {
      setDisburseError(t("admin.payoutInvalidAmount"));
      return;
    }
    if (amount > data.summary.availablePlatformBalance) {
      setDisburseError(t("admin.payoutInsufficient"));
      return;
    }

    setDisbursing(true);
    try {
      const res = await api<{
        payout: PlatformPayout;
        availablePlatformBalance: number;
        totalPlatformPayouts: number;
      }>("/api/finance/admin/payouts", {
        method: "POST",
        body: JSON.stringify({ recipient_id: recipientId, amount, note: disburseNote.trim() }),
      });
      setData((current) => ({
        ...current,
        payouts: [res.payout, ...current.payouts],
        summary: {
          ...current.summary,
          availablePlatformBalance: res.availablePlatformBalance,
          totalPlatformPayouts: res.totalPlatformPayouts,
        },
      }));
      setDisburseAmount("");
      setDisburseNote("");
      setDisburseSuccess(t("admin.payoutSuccess"));
    } catch (err) {
      setDisburseError(err instanceof Error ? err.message : t("admin.payoutFailed"));
    } finally {
      setDisbursing(false);
    }
  }

  const transactions = useMemo(() => data.transactions.slice(0, 12), [data.transactions]);
  const withdrawals = useMemo(() => data.withdrawals || [], [data.withdrawals]);
  const payouts = useMemo(() => data.payouts || [], [data.payouts]);
  const openWithdrawals = useMemo(
    () => withdrawals.filter((row) => row.status === "pending" || row.status === "processing"),
    [withdrawals]
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const txSheet = t("adminReport.transactions") || "Detail Transaksi";
      const wdSheet = t("adminReport.withdrawals") || "Penarikan Seller";
      const poSheet = t("adminReport.payouts") || "Pencairan Platform";
      const ledgerSheet = t("adminReport.ledger") || "Buku Besar";
      const range = (sheet: string, col: string, totalRow: number) => `'${sheet}'!${col}5:${col}${Math.max(totalRow - 1, 5)}`;
      const cell = (sheet: string, col: string, totalRow: number) => `'${sheet}'!${col}${totalRow}`;

      const tx = data.transactions || [];
      const wd = data.withdrawals || [];
      const po = data.payouts || [];
      const ledger = data.ledger || [];
      const txTotal = 5 + tx.length;
      const wdTotal = 5 + wd.length;
      const poTotal = 5 + po.length;
      const ledgerTotal = 5 + ledger.length;
      // Rumus lintas sheet dipakai hanya saat sheet punya baris; jika kosong,
      // pakai 0 agar tidak mereferensi header/total yang tidak ada.
      const txTotalCell = (col: string) => (tx.length ? cell(txSheet, col, txTotal) : "0");
      const poTotalCell = (col: string) => (po.length ? cell(poSheet, col, poTotal) : "0");

      const summaryRows = (value: string | number, format: "currency" | "number", note = "") => [
        value,
        { value, format },
        note,
      ];

      const workbook = buildWorkbook(
        {
          title: `${t("adminReport.financeTitle")} — ElektroMart`,
          subtitle: `${t("adminReport.generatedAt")}: ${new Date().toLocaleString("id-ID", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}`,
          generatedLabel: t("adminReport.generatedAt"),
        },
        [
          {
            name: t("adminReport.summary"),
            title: t("adminReport.financeTitle"),
            subtitle: "ElektroMart",
            columns: [
              { header: t("adminReport.metric"), width: 34 },
              { header: t("adminReport.value"), width: 22 },
              { header: t("adminReport.note"), width: 46 },
            ],
            rows: [
              [t("adminFinance.grossVolume"), { value: `=${txTotalCell("E")}`, format: "currency" }, t("adminReport.fromTransactions")],
              [t("adminFinance.platformRevenue"), { value: `=${txTotalCell("F")}`, format: "currency" }, t("adminReport.fromTransactions")],
              [t("adminFinance.settledRevenue"), ...summaryRows(data.summary.settledRevenue, "currency")],
              [t("adminFinance.heldRevenue"), ...summaryRows(data.summary.heldRevenue, "currency")],
              [t("admin.totalEscrowHeld"), ...summaryRows(data.summary.escrowHeldFunds, "currency")],
              [t("admin.totalPayoutToSellers"), { value: `=${txTotalCell("G")}`, format: "currency" }, t("adminReport.fromTransactions")],
              [t("adminReport.totalOrder"), ...summaryRows(data.summary.totalOrders, "number")],
              [t("adminFinance.revenueOrders"), { value: tx.length ? `=COUNTA(${range(txSheet, "C", txTotal)})` : 0, format: "number" }, t("adminReport.fromTransactions")],
              [t("admin.orders"), ...summaryRows(data.summary.ordersThisMonth, "number")],
              [t("admin.pendingWithdrawals"), ...summaryRows(data.summary.pendingWithdrawalAmount, "currency")],
              [t("admin.withdrawalApprove"), ...summaryRows(data.summary.completedWithdrawalAmount, "currency")],
              [t("admin.totalPlatformPayouts"), { value: `=${poTotalCell("D")}`, format: "currency" }, t("adminReport.fromPayouts")],
              [t("admin.platformAvailable"), { value: `=${txTotalCell("F")}-${poTotalCell("D")}`, format: "currency" }, t("adminReport.fromPayouts")],
            ],
          },
          {
            name: txSheet,
            title: t("adminReport.transactions"),
            subtitle: t("adminReport.financeTitle"),
            columns: [
              { header: t("adminReport.no"), width: 6, format: "number" },
              { header: t("adminReport.date"), width: 20 },
              { header: t("adminReport.order"), width: 20 },
              { header: t("adminReport.seller"), width: 28 },
              { header: t("adminReport.gross"), width: 18, format: "currency" },
              { header: t("adminReport.fee"), width: 18, format: "currency" },
              { header: t("adminReport.net"), width: 18, format: "currency", formula: (r) => `E${r}-F${r}` },
              { header: t("adminReport.totalOrder"), width: 18, format: "currency" },
              { header: t("adminReport.status"), width: 16 },
              { header: t("adminReport.paymentMethod"), width: 20 },
            ],
            rows: tx.map((row, index) => [
              index + 1,
              formatDate(row.date),
              row.order_number,
              row.seller,
              row.gross,
              row.fee,
              null,
              row.total,
              STATUS_KEY[row.status] ? t(STATUS_KEY[row.status]) : row.status,
              row.payment_method || "-",
            ]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" }, "", "", "",
              `=SUM(E5:E${Math.max(r - 1, 5)})`,
              `=SUM(F5:F${Math.max(r - 1, 5)})`,
              `=SUM(G5:G${Math.max(r - 1, 5)})`,
              `=SUM(H5:H${Math.max(r - 1, 5)})`, "", "",
            ],
          },
          {
            name: wdSheet,
            title: t("adminReport.withdrawals"),
            subtitle: t("adminReport.financeTitle"),
            columns: [
              { header: t("adminReport.date"), width: 20 },
              { header: t("adminReport.seller"), width: 26 },
              { header: t("adminReport.bank"), width: 18 },
              { header: t("adminReport.account"), width: 22 },
              { header: t("adminReport.amount"), width: 18, format: "currency" },
              { header: t("adminReport.status"), width: 16 },
              { header: t("adminReport.note"), width: 34 },
            ],
            rows: wd.map((row) => [
              formatDate(row.requested_at || row.created_at),
              row.seller_name,
              row.bank_name || "-",
              maskNumber(row.account_number),
              row.amount,
              WITHDRAWAL_KEY[row.status] ? t(WITHDRAWAL_KEY[row.status]) : row.status,
              row.note || "",
            ]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" }, "", "", "",
              `=SUM(E5:E${Math.max(r - 1, 5)})`, "", "",
            ],
          },
          {
            name: poSheet,
            title: t("adminReport.payouts"),
            subtitle: t("adminReport.financeTitle"),
            columns: [
              { header: t("adminReport.date"), width: 20 },
              { header: t("adminReport.recipient"), width: 26 },
              { header: t("adminReport.recipientType"), width: 18 },
              { header: t("adminReport.amount"), width: 18, format: "currency" },
              { header: t("adminReport.note"), width: 40 },
            ],
            rows: po.map((row) => [
              formatDate(row.created_at),
              row.recipient_name,
              t(row.recipient_role === "seller" ? "adminReport.roleSeller" : "adminReport.roleBuyer"),
              row.amount,
              row.note || "",
            ]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" }, "", "",
              `=SUM(D5:D${Math.max(r - 1, 5)})`, "",
            ],
          },
          {
            name: ledgerSheet,
            title: t("adminReport.ledger"),
            subtitle: t("adminReport.financeTitle"),
            columns: [
              { header: t("adminReport.date"), width: 20 },
              { header: t("adminReport.order"), width: 20 },
              { header: t("adminReport.type"), width: 18 },
              { header: t("adminReport.amount"), width: 18, format: "currency" },
              { header: t("adminReport.status"), width: 16 },
              { header: t("adminReport.description"), width: 44 },
            ],
            rows: ledger.map((row) => [
              formatDate(row.created_at),
              row.order_number || "-",
              row.type,
              row.amount,
              row.status === "held"
                ? t("adminFinance.statusHeld")
                : row.status === "settled"
                  ? t("adminFinance.statusSettled")
                  : t("adminFinance.statusCancelled"),
              row.description || "",
            ]),
            total: (r) => [
              { value: t("adminReport.total"), format: "text" }, "", "",
              `=SUM(D5:D${Math.max(r - 1, 5)})`, "", "",
            ],
          },
          {
            name: t("adminReport.feeTiers"),
            title: t("adminReport.feeTiers"),
            subtitle: t("adminReport.financeTitle"),
            columns: [
              { header: t("adminReport.tier"), width: 40 },
              { header: t("adminReport.rate"), width: 16, format: "percent" },
            ],
            rows: data.feeTiers.map((tier) => [
              FEE_TIER_KEY[String(tier.rate)] ? t(FEE_TIER_KEY[String(tier.rate)]) : tier.label,
              tier.rate,
            ]),
          },
        ]
      );

      await downloadWorkbook(`laporan-keuangan-admin-${reportDate()}.xlsx`, workbook);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-full bg-admin-canvas">
      <TopBar />
      <div className="mx-auto max-w-[1400px] px-8 pb-10 pt-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.financeBalance")}</h1>
            <p className="mt-1 text-sm text-admin-muted">{t("admin.financeSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={loading || downloading}
            title={t("admin.downloadFinanceReport")}
            className="flex items-center gap-2 rounded-xl border border-[#E4E8F1] bg-white px-3.5 py-2 text-[13px] font-semibold text-admin-ink shadow-sm transition hover:border-admin-navy/30 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-admin-muted" />}
            {t("admin.downloadFinanceReport")}
          </button>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#E11D48]">{error}</div>
        ) : null}

        {loading ? (
          <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-white py-8 text-sm text-admin-muted shadow-card">
            <Loader2 size={16} className="animate-spin" /> {t("adminFinance.loading")}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
                <Landmark size={18} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-admin-muted">
                {data.summary.revenueOrders} {t("adminFinance.revenueOrders").toLowerCase()}
              </span>
            </div>
            <p className="text-sm text-admin-muted">{t("adminFinance.grossVolume")}</p>
            <p className="mt-1 text-2xl font-bold text-admin-ink">{formatRupiah(data.summary.grossVolume)}</p>
            <p className="mt-1 text-xs text-admin-muted">
              {data.summary.ordersThisMonth} {t("admin.orders").toLowerCase()}
            </p>
          </div>

          <div className="rounded-2xl bg-admin-navy p-5 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-admin-accent">
                <Percent size={18} />
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">
                {t("adminFinance.settledRevenue")}
              </span>
            </div>
            <p className="text-sm text-white/70">{t("adminFinance.platformRevenue")}</p>
            <p className="mt-1 text-2xl font-bold">{formatRupiah(data.summary.platformRevenue)}</p>
            <p className="mt-1 text-xs text-white/60">
              {formatRupiah(data.summary.settledRevenue)} · {t("adminFinance.heldRevenue")}{" "}
              {formatRupiah(data.summary.heldRevenue)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#C2410C]">
                <HandCoins size={18} />
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                <TrendingUp size={13} /> {t("admin.payoutHistory")}
              </span>
            </div>
            <p className="text-sm text-admin-muted">{t("admin.totalPlatformPayouts")}</p>
            <p className="mt-1 text-2xl font-bold text-admin-ink">{formatRupiah(data.summary.totalPlatformPayouts)}</p>
            <p className="mt-1 text-xs text-admin-muted">
              {t("admin.platformAvailable")}: {formatRupiah(data.summary.availablePlatformBalance)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
                <ShieldCheck size={18} />
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#C2410C]">
                <Clock size={13} /> {t("admin.pendingWithdrawals")}
              </span>
            </div>
            <p className="text-sm text-admin-muted">{t("admin.totalEscrowHeld")}</p>
            <p className="mt-1 text-2xl font-bold text-admin-ink">{formatRupiah(data.summary.escrowHeldFunds)}</p>
            <p className="mt-1 text-xs text-admin-muted">
              {t("admin.amount")}: {formatRupiah(data.summary.pendingWithdrawalAmount)}
            </p>
          </div>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-xl bg-[#FDECEC] px-4 py-2.5 text-sm font-medium text-[#E11D48]">{actionError}</div>
        ) : null}

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-card xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-admin-ink">{t("admin.withdrawalRequests")}</h2>
                <p className="mt-0.5 text-xs text-admin-muted">{t("admin.withdrawalsDesc")}</p>
              </div>
              <span className="rounded-full bg-[#EEF1F6] px-3 py-1 text-xs font-semibold text-admin-muted">
                {openWithdrawals.length} {t("admin.requests").toLowerCase()}
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <p className="py-8 text-center text-sm text-admin-muted">{t("admin.withdrawalEmpty")}</p>
            ) : (
              <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                {withdrawals.map((row) => {
                  const busy = actionId === row.id;
                  const final = row.status === "completed" || row.status === "rejected";
                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EEF1F6] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-admin-ink">{row.seller_name}</p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              WITHDRAWAL_STYLE[row.status] || "bg-[#EEF1F6] text-admin-muted"
                            }`}
                          >
                            {WITHDRAWAL_KEY[row.status] ? t(WITHDRAWAL_KEY[row.status]) : row.status}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-admin-muted">
                          {row.bank_name || "-"} · {row.account_name || "-"} · {maskNumber(row.account_number)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-admin-muted">{formatDate(row.requested_at || row.created_at)}</p>
                      </div>

                      <p className="whitespace-nowrap text-sm font-bold text-admin-ink">{formatRupiah(row.amount)}</p>

                      <div className="flex shrink-0 items-center gap-2">
                        {final ? null : (
                          <>
                            {row.status === "pending" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateWithdrawal(row.id, "processing")}
                                className="rounded-lg border border-[#E4E8F1] px-3 py-1.5 text-xs font-semibold text-admin-ink transition hover:bg-[#F1F4F8] disabled:opacity-50"
                              >
                                {t("admin.process")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void updateWithdrawal(row.id, "completed")}
                              className="flex items-center gap-1 rounded-lg bg-[#E9F8EF] px-3 py-1.5 text-xs font-semibold text-[#16A34A] transition hover:bg-[#D6F1E2] disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              {t("admin.withdrawalApprove")}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void updateWithdrawal(row.id, "rejected")}
                              className="flex items-center gap-1 rounded-lg bg-[#FDECEC] px-3 py-1.5 text-xs font-semibold text-[#E11D48] transition hover:bg-[#FBDADA] disabled:opacity-50"
                            >
                              <XCircle size={13} /> {t("admin.withdrawalReject")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#E8ECF3] bg-white p-5 shadow-card">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#C2410C]">
                <Send size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-admin-ink">{t("admin.disburseFunds")}</h2>
                <p className="mt-0.5 text-xs text-admin-muted">{t("admin.disburseDesc")}</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-[#F7F9FC] px-4 py-3">
              <p className="text-xs text-admin-muted">{t("admin.platformAvailable")}</p>
              <p className="mt-0.5 text-lg font-bold text-admin-ink">
                {formatRupiah(data.summary.availablePlatformBalance)}
              </p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F1F4F8] p-1">
              <button
                type="button"
                onClick={() => { setRecipientRole("seller"); setRecipientId(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  recipientRole === "seller" ? "bg-white text-admin-ink shadow-sm" : "text-admin-muted"
                }`}
              >
                <Store size={14} /> {t("admin.recipientSeller")}
              </button>
              <button
                type="button"
                onClick={() => { setRecipientRole("buyer"); setRecipientId(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  recipientRole === "buyer" ? "bg-white text-admin-ink shadow-sm" : "text-admin-muted"
                }`}
              >
                <UserRound size={14} /> {t("admin.recipientBuyer")}
              </button>
            </div>

            <label className="mb-1 block text-xs font-semibold text-admin-muted">{t("admin.searchRecipient")}</label>
            <input
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              placeholder={t("admin.searchRecipientPlaceholder")}
              className="mb-3 h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-admin-ink outline-none focus:border-admin-navy"
            />

            <label className="mb-1 block text-xs font-semibold text-admin-muted">{t("admin.recipient")}</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="mb-3 h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-admin-ink outline-none focus:border-admin-navy"
            >
              <option value="">{t("admin.payoutSelectRecipient")}</option>
              {recipients.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            {recipients.length === 0 ? (
              <p className="-mt-2 mb-3 text-xs text-admin-muted">{t("admin.noRecipient")}</p>
            ) : null}

            <label className="mb-1 block text-xs font-semibold text-admin-muted">{t("admin.amount")}</label>
            <div className="mb-3 flex items-center rounded-lg border border-[#E4E8F1] px-3 focus-within:border-admin-navy">
              <span className="text-sm font-semibold text-admin-muted">Rp</span>
              <input
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="h-10 w-full bg-transparent px-2 text-sm font-semibold text-admin-ink outline-none"
              />
            </div>

            <label className="mb-1 block text-xs font-semibold text-admin-muted">{t("admin.disburseNote")}</label>
            <input
              value={disburseNote}
              onChange={(e) => setDisburseNote(e.target.value)}
              placeholder={t("admin.disburseNotePlaceholder")}
              className="mb-3 h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm text-admin-ink outline-none focus:border-admin-navy"
            />

            {disburseError ? (
              <div className="mb-3 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs font-medium text-[#E11D48]">{disburseError}</div>
            ) : null}
            {disburseSuccess ? (
              <div className="mb-3 rounded-lg bg-[#E9F8EF] px-3 py-2 text-xs font-medium text-[#15803D]">{disburseSuccess}</div>
            ) : null}

            <button
              type="button"
              onClick={() => void submitPayout()}
              disabled={disbursing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {disbursing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {t("admin.disburseSubmit")}
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-admin-ink">{t("admin.payoutHistory")}</h2>
            <span className="rounded-full bg-[#EEF1F6] px-3 py-1 text-xs font-semibold text-admin-muted">
              {payouts.length}
            </span>
          </div>

          {payouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-admin-muted">{t("admin.payoutHistoryEmpty")}</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-admin-muted">
                    <th className="pb-3 font-semibold">{t("admin.recipient")}</th>
                    <th className="pb-3 font-semibold">{t("admin.recipientType")}</th>
                    <th className="pb-3 font-semibold">{t("admin.disburseNote")}</th>
                    <th className="pb-3 font-semibold">{t("admin.totalWorth")}</th>
                    <th className="pb-3 font-semibold">{t("admin.today")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((row) => (
                    <tr key={row.id} className="border-t border-[#F1F4F8]">
                      <td className="py-3 pr-3 font-semibold text-admin-ink">{row.recipient_name}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            row.recipient_role === "seller"
                              ? "bg-[#E8F0FE] text-[#2563EB]"
                              : "bg-[#E9F8EF] text-[#16A34A]"
                          }`}
                        >
                          {row.recipient_role === "seller" ? <Store size={11} /> : <UserRound size={11} />}
                          {row.recipient_role === "seller" ? t("admin.recipientSeller") : t("admin.recipientBuyer")}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-admin-muted">{row.note || "-"}</td>
                      <td className="whitespace-nowrap py-3 pr-3 font-semibold text-admin-ink">{formatRupiah(row.amount)}</td>
                      <td className="whitespace-nowrap py-3 text-admin-muted">{formatDateTime(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-card xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-admin-ink">{t("adminFinance.transactions")}</h2>
              <span className="rounded-full bg-[#EEF1F6] px-3 py-1 text-xs font-semibold text-admin-muted">
                {data.transactions.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-admin-muted">
                    <th className="pb-3 font-semibold">{t("admin.transactionId")}</th>
                    <th className="pb-3 font-semibold">{t("admin.sellerBuyer")}</th>
                    <th className="pb-3 font-semibold">{t("sellerFinance.gross")}</th>
                    <th className="pb-3 font-semibold">{t("adminFinance.platformRevenue")}</th>
                    <th className="pb-3 font-semibold">{t("sellerFinance.net")}</th>
                    <th className="pb-3 font-semibold">{t("admin.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-[#F1F4F8]">
                      <td className="py-4 pr-3 font-semibold text-admin-ink">
                        {tx.order_number}
                        <span className="block text-xs font-normal text-admin-muted">{formatDate(tx.date)}</span>
                      </td>
                      <td className="py-4 pr-3">
                        <p className="font-semibold text-admin-ink">{tx.seller}</p>
                        <p className="text-xs text-admin-muted">{tx.payment_method || "-"}</p>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-3 font-medium text-admin-ink">{formatRupiah(tx.gross)}</td>
                      <td className="whitespace-nowrap py-4 pr-3 font-semibold text-[#16A34A]">{formatRupiah(tx.fee)}</td>
                      <td className="whitespace-nowrap py-4 pr-3 font-medium text-admin-ink">{formatRupiah(tx.net)}</td>
                      <td className="py-4">
                        <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[tx.status] || "bg-[#EEF1F6] text-admin-muted"}`}>
                          ● {STATUS_KEY[tx.status] ? t(STATUS_KEY[tx.status]) : tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-admin-muted">
                        {t("sellerFinance.transactionEmpty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h2 className="mb-4 text-base font-bold text-admin-ink">{t("adminFinance.feeTiers")}</h2>
              <div className="space-y-2.5">
                {data.feeTiers.map((tier) => (
                  <div key={tier.rate} className="flex items-center justify-between rounded-xl border border-[#EEF1F6] px-3 py-2.5">
                    <span className="text-sm text-admin-ink">
                      {FEE_TIER_KEY[String(tier.rate)] ? t(FEE_TIER_KEY[String(tier.rate)]) : tier.label}
                    </span>
                    <span className="rounded-full bg-[#E8F0FE] px-2.5 py-0.5 text-xs font-bold text-[#2563EB]">
                      {formatPercent(tier.rate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h2 className="mb-4 text-base font-bold text-admin-ink">{t("adminFinance.ledger")}</h2>
              <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                {data.ledger.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[#EEF1F6] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-admin-ink">{entry.order_number || entry.type}</p>
                        <p className="text-xs text-admin-muted">{formatDate(entry.created_at)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${LEDGER_STYLE[entry.status] || "bg-[#EEF1F6] text-admin-muted"}`}>
                        {entry.status === "held"
                          ? t("adminFinance.statusHeld")
                          : entry.status === "settled"
                            ? t("adminFinance.statusSettled")
                            : t("adminFinance.statusCancelled")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#16A34A]">+{formatRupiah(entry.amount)}</p>
                  </div>
                ))}
                {!loading && data.ledger.length === 0 ? (
                  <p className="py-6 text-center text-sm text-admin-muted">{t("adminFinance.ledgerEmpty")}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
