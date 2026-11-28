"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import AdminNotificationBell from "./AdminNotificationBell";
import { localAuth } from "@/lib/localAuth";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface TopBarProps {
  placeholder?: string;
  breadcrumb?: string;
}

export default function TopBar({ breadcrumb }: TopBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    void localAuth.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void localAuth.from("profiles").select("avatar_url").eq("id", data.user.id).maybeSingle().then(({ data: profile }) => {
        setAvatarUrl(profile?.avatar_url ?? null);
      });
    });
  }, []);

  return (
    <header className="flex items-center justify-end gap-4 border-b border-[#EEF1F6] bg-white px-8 py-4">
      {breadcrumb && <p className="mr-auto text-sm font-medium text-admin-muted">{breadcrumb}</p>}
      <div className="flex shrink-0 items-center gap-4 text-admin-ink">
        <LanguageSwitcher variant="light" />
        <AdminNotificationBell />
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
