"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SellerAvatar from "./SellerAvatar";

interface TopBarProps {
  placeholder?: string;
  variant?: "bar" | "inline";
}

type AppNotification = {
  id: string;
  type: "order_completed" | "low_stock";
  timestamp?: string | null;
  order_number?: string;
  buyer_name?: string | null;
  total?: number;
  completed_at?: string | null;
  product_name?: string;
  stock?: number;
};

const SEEN_KEY = "elektromart-seller-orders-seen";

export default function TopBar({ variant = "bar" }: TopBarProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [seenAt, setSeenAt] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    void api<{ notifications: AppNotification[] }>("/api/orders/notifications")
      .then((data) => {
        if (mounted) setItems(data.notifications || []);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSeenAt(window.localStorage.getItem(SEEN_KEY) || "");
  }, []);

  const unread = !items
    ? 0
    : seenAt
      ? items.filter((n) => new Date(n.timestamp || n.completed_at || 0).getTime() > new Date(seenAt).getTime()).length
      : items.length;

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggleNotifications() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      window.localStorage.setItem(SEEN_KEY, now);
      setSeenAt(now);
    }
  }

  function openNotification(notification: AppNotification) {
    setOpen(false);
    router.push(notification.type === "low_stock" ? "/seller/produk" : "/seller/pesanan");
  }

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(language === "id" ? "id-ID" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header
      className={
        variant === "inline"
          ? "flex items-center justify-end gap-3"
          : "flex items-center justify-end gap-4 px-8 pb-1 pt-6"
      }
    >
      <LanguageSwitcher variant="light" />
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={toggleNotifications}
          aria-label={t("seller.notifications")}
          className="relative text-seller-ink"
        >
          <Bell size={20} strokeWidth={1.7} />
          {unread > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-seller-orange px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-9 z-50 w-80 overflow-hidden rounded-2xl border border-[#E8ECF3] bg-white shadow-xl">
            <div className="border-b border-[#EEF1F6] px-4 py-3 text-sm font-bold text-seller-ink">
              {t("seller.notifications")}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-seller-muted">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : !items || items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-seller-muted">{t("seller.noNotifications")}</p>
              ) : (
                items.map((n) => {
                  const isLowStock = n.type === "low_stock";
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className="flex w-full items-start gap-3 border-b border-[#F3F5F9] px-4 py-3 text-left last:border-b-0 hover:bg-[#F7F9FC]"
                    >
                      {isLowStock ? (
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                      ) : (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#16A34A]" />
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-seller-ink">
                          {isLowStock
                            ? t("seller.lowStockNotif", {
                                productName: n.product_name || "-",
                                stock: n.stock ?? 0,
                              })
                            : t("seller.orderCompletedNotif", { orderNumber: n.order_number || "-" })}
                        </span>
                        <span className="mt-0.5 block text-xs text-seller-muted">
                          {!isLowStock && n.buyer_name ? `${n.buyer_name} · ` : ""}
                          {formatDate(n.timestamp || n.completed_at || "")}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      <button type="button" onClick={() => router.push("/seller/profile")} aria-label={t("seller.openStoreProfile")}>
        <SellerAvatar />
      </button>
    </header>
  );
}
