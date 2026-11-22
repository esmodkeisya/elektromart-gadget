"use client";

import { useEffect, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";
import TopBar from "../components/TopBar";

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

const FILTERS: { id: "all" | "pending" | "resolved" | "dismissed"; labelKey: string }[] = [
  { id: "all", labelKey: "seller.allOrders" },
  { id: "pending", labelKey: "report.statusPending" },
  { id: "resolved", labelKey: "report.statusResolved" },
  { id: "dismissed", labelKey: "report.statusDismissed" },
];

const statusStyles: Record<ReportRecord["status"], string> = {
  pending: "bg-[#FFF4E5] text-[#D97706]",
  resolved: "bg-[#E9F8EF] text-[#16A34A]",
  dismissed: "bg-[#EEF1F6] text-seller-muted",
};

export default function SellerReports() {
  const { t, language } = useLanguage();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void api<{ reports: ReportRecord[] }>("/api/reports")
      .then((data) => {
        if (mounted) {
          setReports(data.reports || []);
          setError("");
        }
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : t("api.unavailable"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [t]);

  async function setStatus(id: string, status: ReportRecord["status"]) {
    setBusyId(id);
    try {
      await api<{ report: ReportRecord }>(`/api/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  function fmtDate(value: string) {
    return new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <TopBar variant="inline" />

      <div className="px-8 pb-10 pt-4">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{t("report.sellerTitle")}</h1>
            <p className="mt-1 text-sm text-seller-muted">{t("report.sellerSubtitle")}</p>
          </div>
          <span className="flex items-center gap-2 rounded-xl bg-[#FFF4E5] px-4 py-2.5 text-sm font-semibold text-[#D97706]">
            <Flag size={16} />
            {pendingCount} {t("report.pendingCount")}
          </span>
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f.id
                  ? "bg-seller-ink text-white"
                  : "border border-[#E4E8F1] bg-white text-seller-muted hover:text-seller-ink"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-seller-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#E4E8F1] bg-white py-20 text-center">
            <Flag size={32} className="text-seller-muted/50" />
            <p className="mt-3 text-sm text-seller-muted">{t("report.empty")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((report) => (
              <div key={report.id} className="rounded-2xl border border-[#EEF1F6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {report.product_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={report.product_image}
                      alt={report.product_name}
                      className="h-16 w-16 shrink-0 rounded-xl border border-[#EEF1F6] object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-seller-canvas text-seller-muted">
                      <Flag size={20} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-seller-ink">{report.product_name}</p>
                        <p className="mt-0.5 text-xs text-seller-muted">
                          {t("report.reporter")}: {report.reporter || "-"} · {fmtDate(report.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${statusStyles[report.status]}`}>
                        {t(report.status === "pending" ? "report.statusPending" : report.status === "resolved" ? "report.statusResolved" : "report.statusDismissed")}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-[#F7F8FB] p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-seller-muted">{t("report.reason")}</p>
                      <p className="mt-1 text-sm font-semibold text-seller-ink">{report.reason}</p>
                      {report.description ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-seller-muted">{report.description}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EEF1F6] pt-4">
                  {report.status !== "resolved" ? (
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => setStatus(report.id, "resolved")}
                      className="flex items-center gap-1.5 rounded-xl bg-[#E9F8EF] px-4 py-2 text-sm font-semibold text-[#16A34A] transition-colors hover:bg-[#DCF3E4] disabled:opacity-60"
                    >
                      {busyId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t("report.markResolved")}
                    </button>
                  ) : null}
                  {report.status !== "dismissed" ? (
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => setStatus(report.id, "dismissed")}
                      className="rounded-xl bg-[#EEF1F6] px-4 py-2 text-sm font-semibold text-seller-muted transition-colors hover:bg-[#E4E8F1] disabled:opacity-60"
                    >
                      {t("report.markDismissed")}
                    </button>
                  ) : null}
                  {report.status !== "pending" ? (
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => setStatus(report.id, "pending")}
                      className="rounded-xl border border-[#E4E8F1] px-4 py-2 text-sm font-semibold text-seller-ink transition-colors hover:bg-seller-canvas disabled:opacity-60"
                    >
                      {t("report.markPending")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}