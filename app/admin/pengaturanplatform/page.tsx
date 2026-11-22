"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Tags,
  Store,
  Users,
  Wallet,
  Settings,
  Home,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  ChevronRight,
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

const cmsPages = ["admin.cmsFaq", "admin.cmsWarrantyTerms", "admin.cmsSafeTransactionGuide"];

export default function PengaturanPlatformPage() {
  const { t } = useLanguage();
  const [activePage, setActivePage] = useState(cmsPages[0]);

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
            const active = item.label === "admin.platformSettings";
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
          <h1 className="text-2xl font-bold text-[#0B1330]">
            {t("admin.platformSettings")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.settingsSubtitle")}
          </p>

          {/* CMS section */}
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-[#0B1330]">
              {t("admin.cmsPolicySecurity")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("admin.cmsSubtitle")}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-[240px_1fr] gap-5">
            <div className="h-fit rounded-xl border border-slate-200 bg-white p-2">
              {cmsPages.map((page) => (
                <button
                  key={page}
                  onClick={() => setActivePage(page)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm ${
                    activePage === page
                      ? "bg-amber-50 font-medium text-amber-800"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t(page)}
                  {activePage === page && <ChevronRight className="h-4 w-4" />}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3">
                <Bold className="h-4 w-4 text-slate-500" />
                <Italic className="h-4 w-4 text-slate-500" />
                <Underline className="h-4 w-4 text-slate-500" />
                <span className="h-4 w-px bg-slate-300" />
                <List className="h-4 w-4 text-slate-500" />
                <ListOrdered className="h-4 w-4 text-slate-500" />
                <span className="h-4 w-px bg-slate-300" />
                <LinkIcon className="h-4 w-4 text-slate-500" />
                <ImageIcon className="h-4 w-4 text-slate-500" />
              </div>

              <div className="p-5">
                <label className="mb-1.5 block text-sm text-slate-500">
                  {t("admin.pageTitle")}
                </label>
                <input
                  readOnly
                  value={t("admin.cmsFaqTitle")}
                  className="mb-5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                />

                <label className="mb-1.5 block text-sm text-slate-500">
                  {t("admin.content")}
                </label>
                <textarea
                  readOnly
                  rows={9}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-slate-700 focus:outline-none"
                  defaultValue={t("admin.faqContent")}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600">
                  {t("admin.cancel")}
                </button>
                <button className="rounded-lg bg-[#0B1330] px-5 py-2.5 text-sm font-medium text-white">
                  {t("admin.saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}