"use client";

import ChatClient from "@/components/ChatClient";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";

export default function SellerChatPage() {
  const { t } = useLanguage();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar placeholder={t("seller.searchOrdersBuyers")} />
      <ChatClient />
    </div>
  );
}