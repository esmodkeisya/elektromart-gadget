"use client";

import Link from "next/link";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CircleHelp, LayoutGrid, Home, Package, ShoppingCart, Wallet, Flag, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

const navigation = [
  { href: "/seller/dashboard", labelKey: "home", icon: LayoutGrid },
  { href: "/seller/produk", labelKey: "products", icon: Package },
  { href: "/seller/pesanan", labelKey: "admin.orders", icon: ShoppingCart },
  { href: "/seller/chat", labelKey: "chat.messages", icon: MessageCircle },
  { href: "/seller/laporan", labelKey: "report.notifications", icon: Flag },
  { href: "/seller/finance", labelKey: "seller.finance", icon: Wallet },
];

export default function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-seller-canvas md:h-screen md:flex-row md:overflow-hidden`}>
      <div className="md:hidden">
        <Navbar />
      </div>
      <aside className="hidden h-full w-[240px] shrink-0 flex-col bg-seller-navy px-4 py-6 text-white md:flex">
        <Link href="/seller/dashboard" className="mb-10 block px-3">
          <span className="block text-[20px] font-bold leading-tight tracking-tight">ElektroMart</span>
          <span className="mt-1 block text-[12px] font-medium text-white/55">{t("seller.sellerCentral")}</span>
        </Link>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  active ? "bg-seller-active text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <Link href="/bantuan-penjual" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/70 hover:bg-white/8 hover:text-white">
            <CircleHelp size={18} strokeWidth={1.8} /> {t("helpCenter")}
          </Link>
          <Link href="/beranda" className="mt-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/70 hover:bg-white/8 hover:text-white">
            <Home size={18} strokeWidth={1.8} /> {t("admin.backHome")}
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 md:overflow-y-auto">{children}</main>
    </div>
  );
}
