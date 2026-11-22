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
  Star,
  MoreVertical,
  ImageIcon,
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

type Status = "Official Store" | "Verified Seller" | "Banned";

const statusStyles: Record<Status, string> = {
  "Official Store": "bg-[#0B1330] text-white",
  "Verified Seller": "bg-slate-100 text-slate-600",
  Banned: "bg-red-100 text-red-600",
};

interface Seller {
  nama: string;
  bergabung: string;
  rating: string | null;
  reviews: string | null;
  produk: number;
  status: Status;
}

const sellers: Seller[] = [
  {
    nama: "TechPro Gadgets",
    bergabung: "Jan 2023",
    rating: "4.9",
    reviews: "1.2k",
    produk: 145,
    status: "Official Store",
  },
  {
    nama: "ElectroWorld",
    bergabung: "Mar 2023",
    rating: "4.7",
    reviews: "850",
    produk: 89,
    status: "Verified Seller",
  },
  {
    nama: "Aksesoris Hape Murah",
    bergabung: "Nov 2023",
    rating: null,
    reviews: null,
    produk: 0,
    status: "Banned",
  },
];

export default function ManajemenSellerPage() {
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
            const active = item.label === "admin.manageSellers";
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
                {t("admin.manageSellers")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("admin.sellersSubtitle")}
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-[#0B1330] px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" />
              {t("admin.addSeller")}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-4 font-medium">{t("auth.storeName")}</th>
                  <th className="px-6 py-4 font-medium">{t("admin.reputation")}</th>
                  <th className="px-6 py-4 font-medium">{t("admin.productCount")}</th>
                  <th className="px-6 py-4 font-medium">{t("admin.status")}</th>
                  <th className="px-6 py-4 font-medium">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.nama} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <ImageIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-[#0B1330]">
                            {s.nama}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t("admin.joined")}: {s.bergabung}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.rating ? (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{s.rating}</span>
                          <span className="text-slate-400">
                            ({s.reviews})
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Star className="h-4 w-4" />
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.produk}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <MoreVertical className="h-4 w-4 cursor-pointer text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}