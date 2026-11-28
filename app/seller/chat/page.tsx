"use client";

import ChatClient from "@/components/ChatClient";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";

export default function SellerChatPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-full">
      <TopBar placeholder={t("seller.searchOrdersBuyers")} />
      <ChatClient />
    </div>
  );
}