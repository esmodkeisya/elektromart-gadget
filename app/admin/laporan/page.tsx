"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Eye, FileText, Hourglass, ShieldAlert, CircleCheck } from "lucide-react";
import TopBar from "../components/TopBar";
import { api } from "@/lib/api";
import { markReportsSeen } from "@/lib/adminNotifications";
import { useLanguage } from "@/lib/i18n";

type ReportStatus = "pending" | "resolved" | "dismissed";

type ReportRecord = {
  id: string;
  product_name: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  reporter: string | null;
};

const statusStyles: Record<ReportStatus, string> = {
  pending: "bg-[#FDECEC] text-[#E11D48]",
  resolved: "bg-[#E8F0FE] text-[#2563EB]",
  dismissed: "bg-slate-100 text-slate-500",
};

const statusKeys: Record<ReportStatus, string> = {
  pending: "report.statusPending",
  resolved: "report.statusResolved",
  dismissed: "report.statusDismissed",
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useLanguage();
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] ?? statusStyles.pending}`}>
      {t(statusKeys[status] ?? statusKeys.pending)}
    </span>
  );
}

export default function AdminLaporan() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    let active = true;
    void api<{ reports: ReportRecord[] }>("/api/reports")
      .then((data) => {
        if (!active) return;
        const list = data.reports || [];
        setReports(list);
        markReportsSeen(list.map((report) => report.id));
      })
      .catch(() => {
        if (active) setReports([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const total = reports.length;
  const pending = reports.filter((report) => report.status === "pending").length;
  const resolved = reports.filter((report) => report.status === "resolved").length;
  const stats = [
    { label: t("admin.totalReports"), value: total, icon: FileText, wrap: "bg-[#DBEAFE] text-[#2563EB]" },
    { label: t("admin.newReports"), value: pending, icon: ShieldAlert, wrap: "bg-[#FDECEC] text-[#E11D48]" },
    { label: t("admin.inProgress"), value: 0, icon: Hourglass, wrap: "bg-[#FFEDD5] text-[#C2410C]" },
    { label: t("admin.done"), value: resolved, icon: CircleCheck, wrap: "bg-[#E0F2FE] text-[#0284C7]" },
  ];

  return (
    <div className="min-h-full bg-admin-canvas">
      <TopBar breadcrumb={t("admin.userReports")} />
      <div className="px-8 pb-10 pt-7">
        <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.reportManagement")}</h1>
        <p className="mt-1 text-sm text-admin-muted">{t("admin.reportsSubtitle")}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl bg-white p-5 shadow-card">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.wrap}`}>
                  <Icon size={18} />
                </div>
                <p className="text-sm text-admin-muted">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-admin-ink">{s.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
            <div className="flex gap-2">
              <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-[#E4E8F1] px-4 text-sm font-medium">
                {t("admin.allStatus")} <ChevronDown size={14} />
              </button>
              <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-[#E4E8F1] px-4 text-sm font-medium">
                {t("admin.allTypes")} <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#EEF1F6]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#EEF3FA] text-[13px] text-admin-ink">
                  <th className="px-4 py-3 font-semibold">{t("admin.reportId")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.reporter")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.subject")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.date")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.length ? (
                  reports.map((report) => {
                    const status: ReportStatus = statusStyles[report.status] ? report.status : "pending";
                    return (
                      <tr key={report.id} className="border-t border-[#F1F4F8]">
                        <td className="px-4 py-4 font-semibold text-admin-ink">#{report.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-4 text-admin-ink">{report.reporter || "-"}</td>
                        <td className="px-4 text-admin-ink">
                          <span className="font-medium">{report.product_name}</span>
                          <span className="mt-0.5 block text-xs text-admin-muted">{report.reason}</span>
                        </td>
                        <td className="px-4 text-admin-muted">
                          {new Date(report.created_at).toLocaleDateString("id-ID", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="px-4"><StatusBadge status={status} /></td>
                        <td className="px-4">
                          <button type="button" aria-label={`${t("admin.view")} ${report.id}`} className="text-admin-muted">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-admin-muted">{t("report.empty")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-admin-muted">
            <span>{t("admin.showingReports", { shown: total, total })}</span>
            <div className="flex gap-2">
              <button type="button" disabled className="rounded-lg border border-[#E4E8F1] px-4 py-2 text-slate-300">{t("admin.previous")}</button>
              <button type="button" disabled className="rounded-lg border border-[#E4E8F1] px-4 py-2 text-slate-300">{t("admin.next")}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
