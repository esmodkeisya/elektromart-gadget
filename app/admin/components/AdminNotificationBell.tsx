"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { getSeenReportIds, subscribeAdminNotifications } from "@/lib/adminNotifications";

type PendingReport = { id: string; status: string };

/**
 * Lonceng notifikasi admin hanya menampilkan titik merah jika ada laporan
 * pending yang belum pernah dibuka di halaman laporan.
 */
export default function AdminNotificationBell({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    let active = true;
    const sync = () => {
      void api<{ reports: PendingReport[] }>("/api/reports")
        .then((data) => {
          if (!active) return;
          const seen = new Set(getSeenReportIds());
          const pending = (data.reports || []).filter((report) => report.status === "pending");
          setUnseen(pending.filter((report) => !seen.has(report.id)).length);
        })
        .catch(() => {
          if (active) setUnseen(0);
        });
    };
    sync();
    const unsubscribe = subscribeAdminNotifications(sync);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={t("admin.notifications")}
      title={unseen ? `${unseen} ${t("report.notifications")}` : t("admin.notifications")}
      onClick={() => router.push("/admin/laporan")}
      className={`relative ${className}`}
    >
      <Bell size={size} strokeWidth={1.7} />
      {unseen > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
      ) : null}
    </button>
  );
}
