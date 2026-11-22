import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { CartProvider } from "@/lib/CartContext";

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
        <CartProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </CartProvider>
      </body>
    </html>
  );
}
