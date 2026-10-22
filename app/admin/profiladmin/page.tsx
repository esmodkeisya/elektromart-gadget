"use client";

import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutGrid,
  Tags,
  Store,
  Users,
  Wallet,
  Settings,
  Home,
  Bell,
  User,
  Mail,
  Phone,
  Lock,
  Pencil,
  Camera,
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

export default function ProfilAdminPage() {
  const { t } = useLanguage();
  redirect("/admin/profil");

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-[#0B1330] px-4 py-6">
        <div className="mb-10 px-2">
          <h1 className="text-lg font-bold text-white">ElektroMart</h1>
          <p className="mt-1 text-xs text-slate-400">Admin Console</p>
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
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex flex-shrink-0 items-center gap-5 pl-6">
            <LanguageSwitcher variant="light" />
            <div className="relative">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
            </div>
            <Settings className="h-5 w-5 text-slate-500" />
            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-300" />
          </div>
        </header>

        <main className="px-8 py-8">
          <h1 className="text-2xl font-bold text-[#0B1330]">{t("admin.adminProfile")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.profileSubtitle")}
          </p>

          {/* Basic info card */}
          <div className="mt-6 flex gap-8 rounded-xl border border-slate-200 bg-white p-8">
            <div className="flex w-52 flex-shrink-0 flex-col items-center rounded-xl bg-slate-50 py-8">
              <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-300 shadow" />
              <p className="text-base font-semibold text-[#0B1330]">Kei</p>
              <span className="mt-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
                Developer
              </span>
              <button className="mt-5 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0B1330] shadow-sm ring-1 ring-slate-200">
                <Camera className="h-4 w-4" />
                {t("admin.changePhoto")}
              </button>
            </div>

            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#0B1330]">
                  {t("admin.basicInfo")}
                </h3>
                <button className="flex items-center gap-1 text-sm font-medium text-amber-700">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("admin.editProfile")}
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm text-slate-500">
                    {t("auth.fullName")}
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      Keisya esmod
                    </span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-500">
                    {t("admin.emailAddress")}
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      esmodkeisya@gmail.com
                    </span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-500">
                    {t("auth.phone")}
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      +62 812 3456 7890
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security card */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                <Lock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-[#0B1330]">
                  {t("admin.passwordSecurity")}
                </p>
                <p className="text-sm text-slate-500">
                  {t("admin.accountSecuritySubtitle")}
                </p>
              </div>
            </div>
            <button className="rounded-lg bg-[#0B1330] px-5 py-2.5 text-sm font-medium text-white">
              {t("admin.changePassword")}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}