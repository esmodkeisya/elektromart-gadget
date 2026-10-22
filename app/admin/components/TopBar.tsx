"use client";

import { useRouter } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface TopBarProps {
  placeholder?: string;
  breadcrumb?: string;
}

export default function TopBar({ breadcrumb }: TopBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useCurrentUser();
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <header className="flex items-center justify-end gap-4 border-b border-[#EEF1F6] bg-white px-8 py-4">
      {breadcrumb && <p className="mr-auto text-sm font-medium text-admin-muted">{breadcrumb}</p>}
      <div className="flex shrink-0 items-center gap-4 text-admin-ink">
        <LanguageSwitcher variant="light" />
        <button type="button" aria-label={t("admin.notifications")} onClick={() => router.push("/admin/laporan")} className="relative">
          <Bell size={20} strokeWidth={1.7} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-admin-accent" />
        </button>
        <button type="button" aria-label={t("admin.settings")} onClick={() => router.push("/admin/pengaturan")}>
          <Settings size={20} strokeWidth={1.7} />
        </button>
        <button type="button" aria-label={t("admin.adminProfile")} onClick={() => router.push("/admin/profil")}>
          <AdminAvatar src={avatarUrl} />
        </button>
      </div>
    </header>
  );
}
