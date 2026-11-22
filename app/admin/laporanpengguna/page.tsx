"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Tags,
  Store,
  Users,
  Wallet,
  Settings,
  Home,
  ClipboardList,
  ShieldAlert,
  Hourglass,
  CheckCircle2,
  Eye,
  ChevronDown,
} from "lucide-react";
import AdminNotificationBell from "../components/AdminNotificationBell";
import { api } from "@/lib/api";
import { markReportsSeen } from "@/lib/adminNotifications";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const navItems = [
  { label: "dashboard", icon: LayoutGrid },
  { label: "admin.manageCategories", icon: Tags },
  { label: "admin.manageSellers", icon: Store },
  { label: "admin.manageBuyers", icon: Users },
  { label: "admin.financeBalance", icon: Wallet },
  { label: "admin.platformSettings", icon: Settings },
];

type ReportStatus = "pending" | "resolved" | "dismissed";

type ReportRecord = {
  id: string;
  product_name: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  reporter: string | null;
};

const statusStyles: Record<ReportStatus, string> = {
  pending: "bg-red-100 text-red-600",
  resolved: "bg-blue-100 text-blue-600",
  dismissed: "bg-slate-100 text-slate-500",
};

const statusKeys: Record<ReportStatus, string> = {
  pending: "admin.new",
  resolved: "admin.done",
  dismissed: "report.statusDismissed",
};

export default function LaporanPenggunaPage() {
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
    { label: "admin.totalReports", value: total, icon: ClipboardList, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "admin.newReports", value: pending, icon: ShieldAlert, iconBg: "bg-red-50", iconColor: "text-red-500" },
    { label: "admin.inProgress", value: 0, icon: Hourglass, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
    { label: "admin.done", value: resolved, icon: CheckCircle2, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-[#0B1330] px-4 py-6">
        <div className="mb-10 px-2">
          <h1 className="text-lg font-bold leading-tight text-white">
            Marketplace
            <br />
            Admin
          </h1>
          <p className="mt-1 text-xs text-slate-400">Super Admin</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5"
            >
              <item.icon className="h-4 w-4" />
              <span>{t(item.label)}</span>
            </button>
          ))}
        </nav>

        <Link
          href="/beranda"
          className="mt-6 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5"
        >
          <Home className="h-4 w-4" />
          <span>{t("admin.backHome")}</span>
        </Link>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <h2 className="text-lg font-semibold text-[#0B1330]">
            {t("admin.userReports")}
          </h2>
          <div className="flex items-center gap-5">
            <LanguageSwitcher variant="light" />
            <AdminNotificationBell size={20} className="text-slate-500" />
            <Settings className="h-5 w-5 text-slate-500" />
            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-300" />
          </div>
        </header>

        <main className="px-8 py-8">
          <h1 className="text-2xl font-bold text-[#0B1330]">
            {t("admin.reportManagement")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.reportsSubtitle")}
          </p>

          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div
                  className={`mb-6 flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <p className="text-sm text-slate-500">{t(stat.label)}</p>
                <p className="mt-1 text-2xl font-bold text-[#0B1330]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-end gap-4 p-4">
              <div className="flex flex-shrink-0 items-center gap-3">
                <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  {t("admin.allStatus")} <ChevronDown className="h-4 w-4" />
                </button>
                <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  {t("admin.allTypes")} <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">{t("admin.reportId")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.reporter")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.subject")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.length ? (
                  reports.map((report) => {
                    const status: ReportStatus = statusStyles[report.status] ? report.status : "pending";
                    return (
                      <tr key={report.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-4 font-medium text-[#0B1330]">
                          #{report.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-4">{report.reporter || "-"}</td>
                        <td className="px-4 py-4 text-slate-600">
                          <span className="font-medium text-[#0B1330]">{report.product_name}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{report.reason}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {new Date(report.created_at).toLocaleDateString("id-ID", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
                          >
                            {t(statusKeys[status])}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Eye className="h-4 w-4 cursor-pointer text-slate-500" />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      {t("report.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between p-4 text-sm text-slate-500">
              <span>{t("admin.showingReports", { shown: total, total })}</span>
              <div className="flex gap-2">
                <button
                  disabled
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-300"
                >
                  {t("admin.previous")}
                </button>
                <button
                  disabled
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-300"
                >
                  {t("admin.next")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
