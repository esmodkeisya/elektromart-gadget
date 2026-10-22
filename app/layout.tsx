import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { CartProvider } from "@/lib/CartContext";
import SWRProvider from "@/lib/SWRProvider";

export const metadata: Metadata = {
  title: "ElektroMart - Belanja Elektronik Original & Terpercaya",
  description:
    "Ribuan smartphone, laptop, kamera, dan gadget premium dari seller terverifikasi. Gratis ongkir, cicilan 0%, dan garansi resmi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 antialiased">
        <SWRProvider>
          <CartProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </CartProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
