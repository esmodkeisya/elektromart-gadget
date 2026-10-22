"use client";

import Navbar from "@/components/Navbar";
import ChatClient from "@/components/ChatClient";

export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-800">
      <Navbar />
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatClient />
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}