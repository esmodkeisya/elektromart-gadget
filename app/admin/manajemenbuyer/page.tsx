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
  Plus,
  Filter,
  ArrowUpDown,
  MoreVertical,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AdminNotificationBell from "../components/AdminNotificationBell";

const navItems = [
  { label: "dashboard", icon: LayoutGrid },
  { label: "admin.manageCategories", icon: Tags },
  { label: "admin.manageSellers", icon: Store },
  { label: "admin.manageBuyers", icon: Users },
  { label: "admin.financeBalance", icon: Wallet },
  { label: "admin.platformSettings", icon: Settings },
];

type Status = "Aktif" | "Suspended";

const statusStyles: Record<Status, string> = {
  Aktif: "bg-green-100 text-green-700",
  Suspended: "bg-red-100 text-red-600",
};

const statusKeys: Record<Status, string> = {
  Aktif: "admin.active",
  Suspended: "admin.suspended",
};

interface Buyer {
  initials: string;
  avatarBg: string;
  nama: string;
  email: string;
  hp: string;
  totalBelanja: string;
  pesanan: string;
  tanggal: string;
  status: Status;
}

const buyers: Buyer[] = [
  {
    initials: "BS",
    avatarBg: "bg-[#0B1330]",
    nama: "Budi Santoso",
    email: "budi.s@email.com",
    hp: "08123456789",
    totalBelanja: "Rp 25.000.000",
    pesanan: "12 Pesanan",
    tanggal: "12 Jan 2023",
    status: "Aktif",
  },
  {
    initials: "SA",
    avatarBg: "bg-orange-300",
    nama: "Siti Aminah",
    email: "siti.a@email.com",
    hp: "08771234567",
    totalBelanja: "Rp 8.500.000",
    pesanan: "5 Pesanan",
    tanggal: "15 Mar 2023",
    status: "Aktif",
  },
  {
    initials: "AP",
    avatarBg: "bg-pink-300",
    nama: "Agus Pratama",
    email: "agus.p@email.com",
    hp: "08199876543",
    totalBelanja: "Rp 0",
    pesanan: "0 Pesanan",
    tanggal: "20 Nov 2023",
    status: "Suspended",
  },
];

export default function ManajemenBuyerPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-[#0B1330] px-4 py-6">
        <div className="mb-10 px-2">
          <h1 className="text-lg font-bold text-white">ElektroMart</h1>
          <p className="mt-1 text-xs text-slate-400">{t("admin.adminDashboard")}</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = item.label === "admin.manageBuyers";
            return (
              <button
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-amber-800 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <Link href="/beranda" className="mt-6 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5">
          <Home className="h-4 w-4" />
          <span>{t("admin.backHome")}</span>
        </Link>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Topbar */}
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex flex-shrink-0 items-center gap-5 pl-6">
            <LanguageSwitcher variant="light" />
            <AdminNotificationBell size={20} className="text-slate-500" />
            <Settings className="h-5 w-5 text-slate-500" />
            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-300" />
          </div>
        </header>

        <main className="px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0B1330]">
                {t("admin.manageBuyers")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("admin.buyersSubtitle")}
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-[#0B1330] px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" />
              {t("admin.addBuyer")}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-4">
              <div className="flex gap-3">
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  <Filter className="h-4 w-4" />
                  {t("admin.filter")}
                </button>
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  <ArrowUpDown className="h-4 w-4" />
                  {t("admin.sort")}
                </button>
              </div>
              <span className="text-sm text-slate-500">
                {t("admin.showingBuyers")}
              </span>
            </div>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">{t("admin.buyerName")}</th>
                  <th className="px-6 py-3 font-medium">{t("admin.phoneNo")}</th>
                  <th className="px-6 py-3 font-medium">{t("admin.totalSpend")}</th>
                  <th className="px-6 py-3 font-medium">{t("admin.joinedDate")}</th>
                  <th className="px-6 py-3 font-medium">{t("admin.status")}</th>
                  <th className="px-6 py-3 font-medium">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((b) => (
                  <tr key={b.nama} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${b.avatarBg}`}
                        >
                          {b.initials}
                        </div>
                        <div>
                          <p className="font-medium text-[#0B1330]">
                            {b.nama}
                          </p>
                          <p className="text-xs text-slate-400">{b.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{b.hp}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#0B1330]">
                        {b.totalBelanja}
                      </p>
                      <p className="text-xs text-slate-400">{b.pesanan.replace("Pesanan", t("admin.orders"))}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{b.tanggal}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[b.status]}`}
                      >
                        {t(statusKeys[b.status])}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <MoreVertical className="h-4 w-4 cursor-pointer text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between p-4 text-sm">
              <button
                disabled
                className="rounded-lg border border-slate-200 px-4 py-2 text-slate-300"
              >
                {t("admin.previous")}
              </button>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-lg bg-[#0B1330] text-white">
                  1
                </button>
                <button className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100">
                  2
                </button>
                <button className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100">
                  3
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100">
                  245
                </button>
              </div>
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600">
                {t("admin.next")}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}