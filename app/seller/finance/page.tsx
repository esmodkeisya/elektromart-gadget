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
import { buildWorkbook, downloadWorkbook, reportDate } from "@/lib/report";
import { useLanguage } from "@/lib/i18n";

type SellerFinanceTransaction = {
  id: string;
  order_id: string;
  order_number: string;
  product_name: string;
  product_image: string | null;
  qty: number;
  gross: number;
  fee: number;
  fee_rate: number;
  net: number;
  status: "pending" | "settled";
  date: string;
  order_status: string;
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
    availableBalance: number;
    settledBalance: number;
    platformCredits: number;
    pendingBalance: number;
    pendingWithdrawal: number;
    withdrawnAmount: number;
    totalRevenue: number;
    totalFees: number;
    totalNet: number;
    transactions: number;
  };
  feeTier: {
    tenureMonths: number;
    soldQty: number;
    rate: number;
  };
  transactions: SellerFinanceTransaction[];
  withdrawals: WithdrawalRecord[];
};

const EMPTY: SellerFinanceResponse = {
  summary: {
    availableBalance: 0,
    settledBalance: 0,
    platformCredits: 0,
    pendingBalance: 0,
    pendingWithdrawal: 0,
    withdrawnAmount: 0,
    totalRevenue: 0,
    totalFees: 0,
    totalNet: 0,
    transactions: 0,
  },
  feeTier: { tenureMonths: 0, soldQty: 0, rate: 0.02 },
  transactions: [],
  withdrawals: [],
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
      const txSheet = t("sellerReport.transactions");
      const txRows = data.transactions.map((row, index) => [
        index + 1,
        formatDate(row.date),
        row.order_number,
        row.order_status,
        row.status === "settled" ? t("admin.done") : t("seller.withdrawalPending"),
        row.product_name,
        row.qty,
        Math.round(row.gross / Math.max(Number(row.qty) || 1, 1)),
        null,
        row.fee_rate,
        null,
        null,
      ]);
      const txTotalRow = 5 + txRows.length;
      const txEnd = Math.max(txTotalRow - 1, 5);

      const workbook = buildWorkbook(
        {
          title: `${t("seller.finance")} — ElektroMart`,
          subtitle: `${t("sellerReport.generatedAt")}: ${new Date().toLocaleString("id-ID", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}`,
          generatedLabel: t("sellerReport.generatedAt"),
        },
        [
          {
            name: t("sellerReport.summary"),
            title: t("sellerReport.summary"),
            subtitle: `${t("seller.finance")} — ElektroMart`,
            columns: [
              { header: t("sellerReport.metric"), width: 34 },
              { header: t("sellerReport.value"), width: 22 },
              { header: t("sellerReport.note"), width: 42 },
            ],
            rows: [
              [t("seller.activeBalance"), { value: data.summary.availableBalance, format: "currency" }, t("seller.balanceReadyToWithdraw")],
              [t("sellerReport.settledBalance"), { value: data.summary.settledBalance, format: "currency" }, ""],
              [t("seller.platformCredit"), { value: data.summary.platformCredits, format: "currency" }, t("seller.platformCreditDesc")],
              [t("sellerReport.pendingBalance"), { value: data.summary.pendingBalance, format: "currency" }, t("seller.fromCompletedOrders")],
              [t("seller.pendingWithdrawal"), { value: data.summary.pendingWithdrawal, format: "currency" }, ""],
              [t("seller.withdrawnTotal"), { value: data.summary.withdrawnAmount, format: "currency" }, ""],
              [t("seller.totalRevenueYtd"), { value: `='${txSheet}'!I${txTotalRow}`, format: "currency" }, t("sellerReport.fromTransactions")],
              [t("sellerFinance.totalFees"), { value: `='${txSheet}'!K${txTotalRow}`, format: "currency" }, t("sellerReport.fromTransactions")],
              [t("sellerReport.totalNet"), { value: `='${txSheet}'!L${txTotalRow}`, format: "currency" }, t("sellerReport.fromTransactions")],
              [t("sellerFinance.currentRate"), { value: Number((data.feeTier.rate * 100).toFixed(1)), format: "percentValue" }, ""],
              [t("sellerFinance.tenure"), t("sellerFinance.months", { count: data.feeTier.tenureMonths }), ""],
              [t("sellerFinance.soldQty"), { value: data.feeTier.soldQty, format: "number" }, ""],
              [t("sellerReport.transactionsCount"), { value: `=COUNTA('${txSheet}'!C5:C${Math.max(txEnd, 5)})`, format: "number" }, t("sellerReport.countUnit")],
            ],
          },
          {
            name: txSheet,
            title: t("sellerReport.transactions"),
            subtitle: `${t("seller.finance")} — ElektroMart`,
            columns: [
              { header: t("sellerReport.no"), width: 6, format: "number" },
              { header: t("sellerReport.date"), width: 20 },
              { header: t("sellerReport.order"), width: 20 },
              { header: t("sellerReport.orderStatus"), width: 16 },
              { header: t("sellerReport.status"), width: 12 },
              { header: t("sellerReport.product"), width: 36 },
              { header: t("sellerReport.qty"), width: 8, format: "number" },
              { header: t("sellerReport.unitPrice"), width: 17, format: "currency" },
              { header: t("sellerReport.gross"), width: 18, format: "currency", formula: (r) => `G${r}*H${r}` },
              { header: t("sellerReport.feeRate"), width: 12, format: "percent" },
              { header: t("sellerReport.fee"), width: 17, format: "currency", formula: (r) => `ROUND(I${r}*J${r},0)` },
              { header: t("sellerReport.net"), width: 18, format: "currency", formula: (r) => `I${r}-K${r}` },
            ],
            rows: txRows,
            total: (r) => [
              { value: t("sellerReport.total"), format: "text" }, "", "", "", "", "",
              `=SUM(G5:G${Math.max(r - 1, 5)})`, "",
              `=SUM(I5:I${Math.max(r - 1, 5)})`, "",
              `=SUM(K5:K${Math.max(r - 1, 5)})`,
              `=SUM(L5:L${Math.max(r - 1, 5)})`,
            ],
          },
          {
            name: t("sellerReport.withdrawals"),
            title: t("sellerReport.withdrawals"),
            subtitle: `${t("seller.finance")} — ElektroMart`,
            columns: [
              { header: t("sellerReport.date"), width: 20 },
              { header: t("sellerReport.status"), width: 16 },
              { header: t("sellerReport.bank"), width: 20 },
              { header: t("sellerReport.account"), width: 22 },
              { header: t("sellerReport.amount"), width: 18, format: "currency" },
              { header: t("sellerReport.note"), width: 36 },
            ],
            rows: withdrawals.map((row) => [
              formatDate(row.requested_at),
              WITHDRAWAL_STATUS[row.status] ? t(WITHDRAWAL_STATUS[row.status].key) : row.status,
              row.bank_name || "-",
              maskNumber(row.account_number),
              row.amount,
              row.note || "",
            ]),
            total: (r) => [
              { value: t("sellerReport.total"), format: "text" }, "", "", "",
              `=SUM(E5:E${Math.max(r - 1, 5)})`, "",
            ],
          },
        ]
      );

      await downloadWorkbook(`laporan-keuangan-seller-${reportDate()}.xlsx`, workbook);
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
                className="flex items-center gap-2 rounded-xl bg-seller-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
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
                <span className="rounded-full bg-[#EEF1F6] px-2.5 py-0.5 text-xs font-semibold text-seller-muted">
                  {t("sellerFinance.months", { count: data.feeTier.tenureMonths })}
                </span>
              </div>
              <p className="text-sm text-seller-muted">{t("seller.pendingPayout")}</p>
              <p className="mt-1 text-xl font-bold text-seller-ink">
                {loading ? "…" : formatRupiah(data.summary.pendingBalance)}
              </p>
              <p className="mt-1 text-xs text-seller-muted">{t("seller.fromCompletedOrders")}</p>
            </div>

            <div className="rounded-2xl border border-[#E8ECF3] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#3B5B8C]">
                  <TrendingUp size={18} />
                </span>
                <span className="rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-xs font-bold text-seller-orange">
                  -{formatRupiah(data.summary.totalFees)}
                </span>
              </div>
              <p className="text-sm text-seller-muted">{t("seller.totalRevenueYtd")}</p>
              <p className="mt-1 text-xl font-bold text-seller-ink">
                {loading ? "…" : formatRupiah(data.summary.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-seller-muted">{t("seller.yearToDate")}</p>
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
          <div className="rounded-2xl border border-[#E8ECF3] bg-white px-5 py-4">
            <p className="text-xs font-medium text-seller-muted">{t("sellerFinance.soldQty")}</p>
            <p className="mt-1 text-lg font-bold text-seller-ink">{data.feeTier.soldQty}</p>
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
                {t("sellerFinance.currentRate")}
              </p>
              <p className="mt-0.5 text-2xl font-bold">{formatPercent(data.feeTier.rate)}</p>
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
              className="flex items-center gap-2 rounded-xl bg-seller-navy px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
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
                    <th className="px-4 py-3 font-semibold">{t("admin.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 1 ? "bg-[#F7F9FC]" : "bg-white"}>
                      <td className="px-4 py-4 font-semibold text-seller-ink">{row.order_number}</td>
                      <td className="whitespace-nowrap px-4 text-seller-muted">{formatDate(row.date)}</td>
                      <td className="px-4 text-seller-ink/80">
                        {row.product_name}
                        <span className="block text-xs text-seller-muted">
                          {row.qty}× · {formatPercent(row.fee_rate)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 font-medium text-seller-ink">{formatRupiah(row.gross)}</td>
                      <td className="whitespace-nowrap px-4 font-medium text-[#E11D48]">-{formatRupiah(row.fee)}</td>
                      <td className="whitespace-nowrap px-4 font-semibold text-seller-ink">{formatRupiah(row.net)}</td>
                      <td className="px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            row.status === "settled" ? "bg-[#E9F8EF] text-[#16A34A]" : "bg-[#EEEAF6] text-[#6B6280]"
                          }`}
                        >
                          {row.status === "settled" ? <Check size={12} /> : <Clock size={12} />}
                          {row.status === "settled" ? t("sellerFinance.statusSettled") : t("sellerFinance.statusPending")}
                        </span>
                      </td>
                    </tr>
                  ))}
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
