"use client";

import { Mail, Phone, MapPin, Instagram, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLanguage();
  const translatedColumns = [
    { 
      title: t("buy"), 
      links: [
        { label: t("caraBelanja"), href: "/beli#cara-belanja" },
        { label: t("lacakPesanan"), href: "/beli#lacak-pesanan" },
        { label: t("bantuanBuyer"), href: "/beli#bantuan-buyer" },
      ]
    },
    { 
      title: t("sell"), 
      links: [
        { label: t("daftarSeller"), href: "/daftar-seller" },
        { label: t("pusatEdukasiSeller"), href: "/pusat-edukasi-seller" },
      ]
    },
    { 
      title: t("helpUpper"), 
      links: [
        { label: t("faq"), href: "/faq" },
        { label: t("syaratKetentuan"), href: "/syarat-ketentuan" },
        { label: t("kebijakanPrivasi"), href: "/kebijakan-privasi" },
        { label: t("hubungiCS"), href: "/hubungi-cs" },
      ]
    },
  ];
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="mx-auto max-w-[1504px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-x-8">
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-3 lg:col-span-1 lg:max-w-xs">
            {/* ===== LOGO ===== */}
            <div className="flex items-center gap-2">
              <Image
                src="/Container.png"             
                alt="ElektroMart"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="text-lg font-bold text-white">ElektroMart</span>
            </div>
            <p className="text-sm text-slate-400">
              {t("footerDescription")}
            </p>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> esmodkeisya@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> 0877-4608-0586
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Malang, Indonesia
              </li>
            </ul>
            <div className="flex gap-3">
              <a
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:bg-white/10"
                href="https://www.instagram.com/notaloneonearth_u/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram ElektroMart"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:bg-white/10" href="#">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {translatedColumns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <h4 className="text-sm font-bold tracking-wide text-white">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>

      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        {t("footerCopyright")}
      </div>
    </footer>
  );
}