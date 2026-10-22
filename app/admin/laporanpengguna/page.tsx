"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Tags,
  Store,
  Users,
  Wallet,
  Settings,
  Home,
  Bell,
  ClipboardList,
  ShieldAlert,
  Hourglass,
  CheckCircle2,
  Eye,
  ChevronDown,
} from "lucide-react";
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

const stats = [
  {
    label: "admin.totalReports",
    value: "1,248",
    icon: ClipboardList,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    label: "admin.newReports",
    value: "42",
    icon: ShieldAlert,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    label: "admin.inProgress",
    value: "18",
    icon: Hourglass,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    label: "admin.done",
    value: "1,188",
    icon: CheckCircle2,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
];

type StatusType = "Baru" | "Proses" | "Selesai";

const statusStyles: Record<StatusType, string> = {
  Baru: "bg-red-100 text-red-600",
  Proses: "bg-orange-100 text-orange-600",
  Selesai: "bg-blue-100 text-blue-600",
};

const statusLabels: Record<StatusType, string> = {
  Baru: "admin.new",
  Proses: "admin.inProgress",
  Selesai: "admin.done",
};

interface Laporan {
  id: string;
  pelapor: string;
  role: "Buyer" | "Seller";
  subjek: string;
  tanggal: string;
  jam: string;
  status: StatusType;
  avatarBg: string;
}

const laporanList: Laporan[] = [
  {
    id: "#REP-88321",
    pelapor: "Budi Santoso",
    role: "Buyer",
    subjek: "Barang Rusak Saat Diterima",
    tanggal: "24 Okt 2023",
    jam: "14:30",
    status: "Baru",
    avatarBg: "bg-slate-300",
  },
  {
    id: "#REP-88320",
    pelapor: "Toko Elektronik Maju",
    role: "Seller",
    subjek: "Indikasi Pembeli Fiktif",
    tanggal: "24 Okt 2023",
    jam: "10:15",
    status: "Proses",
    avatarBg: "bg-slate-300",
  },
  {
    id: "#REP-88315",
    pelapor: "Andi Wijaya",
    role: "Buyer",
    subjek: "Barang Tidak Sesuai Deskripsi",
    tanggal: "23 Okt 2023",
    jam: "16:45",
    status: "Selesai",
    avatarBg: "bg-slate-300",
  },
  {
    id: "#REP-88310",
    pelapor: "Sinar Techindo",
    role: "Seller",
    subjek: "Kendala Pencairan Dana",
    tanggal: "23 Okt 2023",
    jam: "09:20",
    status: "Selesai",
    avatarBg: "bg-slate-300",
  },
];

export default function LaporanPenggunaPage() {
  const { t } = useLanguage();
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
            <Bell className="h-5 w-5 text-slate-500" />
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
                {laporanList.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4 font-medium text-[#0B1330]">
                      {row.id}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 flex-shrink-0 rounded-full ${row.avatarBg}`}
                        />
                        <div>
                          <p className="font-medium text-[#0B1330]">
                            {row.pelapor}
                          </p>
                          <p className="text-xs text-slate-400">{row.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{row.subjek}</td>
                    <td className="px-4 py-4 text-slate-500">
                      {row.tanggal},
                      <br />
                      {row.jam}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[row.status]}`}
                      >
                        {t(statusLabels[row.status])}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Eye className="h-4 w-4 cursor-pointer text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between p-4 text-sm text-slate-500">
              <span>{t("admin.showingReports")}</span>
              <div className="flex gap-2">
                <button
                  disabled
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-300"
                >
                  {t("admin.previous")}
                </button>
                <button className="rounded-lg bg-[#0B1330] px-4 py-2 text-white">
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