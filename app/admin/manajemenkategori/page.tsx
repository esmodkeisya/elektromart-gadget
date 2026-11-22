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
  Smartphone,
  Laptop,
  Watch,
  Filter,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
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

const kategoris = [
  {
    nama: "Smartphone",
    icon: Smartphone,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    warna: "#3B82F6",
    sub: 8,
    attrs: ["RAM", "Storage", "OS"],
  },
  {
    nama: "Laptop",
    icon: Laptop,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    warna: "#8B5CF6",
    sub: 12,
    attrs: ["Processor", "RAM", "GPU"],
  },
  {
    nama: "Smart Watch",
    icon: Watch,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    warna: "#10B981",
    sub: 4,
    attrs: ["Connectivity", "Battery Life"],
  },
];

export default function ManajemenKategoriPage() {
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
            const active = item.label === "admin.manageCategories";
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
                {t("admin.manageGadgetCategories")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("admin.categoriesSubtitle")}
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" />
              {t("admin.addNewCategory")}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-[1fr_320px] gap-5">
            {/* Left table */}
            <div className="h-fit rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-[#0B1330]">
                  {t("admin.parentCategoryList")}
                </h3>
                <button className="flex items-center gap-1 text-sm text-slate-500">
                  <Filter className="h-4 w-4" />
                  {t("admin.filter")}
                </button>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">{t("admin.categoryName")}</th>
                    <th className="px-5 py-3 font-medium">{t("admin.identityColor")}</th>
                    <th className="px-5 py-3 font-medium">
                      {t("admin.requiredAttributes")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kategoris.map((k) => (
                    <tr key={k.nama} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.iconBg}`}
                          >
                            <k.icon className={`h-4 w-4 ${k.iconColor}`} />
                          </div>
                          <span className="font-medium text-[#0B1330]">
                            {k.nama}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: k.warna }}
                          />
                          <span className="text-slate-500">{k.warna}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {k.attrs.map((a) => (
                            <span
                              key={a}
                              className="rounded-md bg-[#0B1330] px-2.5 py-1 text-xs text-white"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-slate-500">
                  {t("admin.showingCategories")}
                </span>
                <div className="flex items-center gap-2">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1330] text-sm text-white">
                    1
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600">
                    2
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right form */}
            <div className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-amber-700" />
                <h3 className="font-semibold text-[#0B1330]">
                  {t("admin.quickAddCategory")}
                </h3>
              </div>

              <label className="mb-1.5 block text-sm text-slate-500">
                {t("admin.parentCategoryName")}
              </label>
              <input
                placeholder={t("admin.categoryNamePlaceholder")}
                className="mb-5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none"
              />

              <label className="mb-1.5 block text-sm text-slate-500">
                {t("admin.identityColorChart")}
              </label>
              <div className="mb-5 flex items-center gap-2">
                <div className="h-10 w-14 flex-shrink-0 rounded-lg border border-slate-200 bg-amber-500" />
                <input
                  readOnly
                  value="#F59E0B"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 focus:outline-none"
                />
              </div>

              <button className="w-full rounded-lg bg-amber-800 py-3 text-sm font-medium text-white">
                {t("admin.saveCategory")}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}