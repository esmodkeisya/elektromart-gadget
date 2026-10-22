"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageCircle, ShoppingCart, Menu, X, Globe, ChevronDown, UserCircle, LayoutGrid, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAllProducts } from "@/lib/data";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/CartContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function isNavActive(href: string, pathname: string) {
  if (href === "/beranda") return pathname === "/beranda" || pathname === "/";
  if (href.startsWith("/kategori")) return pathname.startsWith("/kategori");
  if (href.startsWith("/flash-sale")) return pathname.startsWith("/flash-sale");
  if (href.startsWith("/bantuan")) return pathname.startsWith("/bantuan");
  return pathname === href;
}

function navLinkClassName(href: string, pathname: string, mobile = false) {
  const active = isNavActive(href, pathname);
  const base = mobile
    ? "rounded-lg px-2 py-2.5 transition-colors"
    : "transition-colors";

  if (active) {
    return `${base} font-semibold text-brand-orange`;
  }

  return mobile
    ? `${base} text-slate-200 hover:bg-white/10 hover:text-white`
    : `${base} text-slate-200 hover:text-white`;
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const liveProducts = useLiveProducts();
  const { user, profile } = useCurrentUser();
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const navLinks = [
    { label: t("home"), href: "/beranda" },
    { label: t("categories"), href: "/kategori/semua" },
    { label: t("flashSale"), href: "/flash-sale" },
    { label: t("help"), href: "/bantuan" },
  ];

  const userEmail = user?.email ?? "";
  const userName = profile?.full_name || user?.user_metadata?.full_name || userEmail.split("@")[0] || "";
  const avatarUrl = profile?.avatar_url ?? null;
  const userRole = profile?.role === "admin" || profile?.role === "seller" || profile?.role === "buyer" ? profile.role : null;

  const isAdmin = userRole === "admin" || userEmail === "esmodkeisya@gmail.com";
  const accountHref =
    isAdmin ? "/admin/dashboard" : userRole === "seller" ? "/seller/dashboard" : "/profil";
  const accountLabel =
    userRole === "buyer" ? t("profile") : t("dashboard");

  async function logout() {
    setProfileOpen(false);
    setMenuOpen(false);
    await supabase.auth.signOut();
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const term = searchQuery.trim().toLowerCase();
    if (!term) return;

    const liveMatch = liveProducts.find((product) =>
      (product.name || "").toLowerCase().includes(term),
    );
    if (liveMatch) {
      setSearchError("");
      setMenuOpen(false);
      router.push(`/produk/${liveMatch.id}`);
      return;
    }

    const mockMatch = getAllProducts().find((product) =>
      product.name.toLowerCase().includes(term),
    );
    if (mockMatch) {
      setSearchError("");
      setMenuOpen(false);
      router.push(`/produk/${mockMatch.id}`);
      return;
    }

    setSearchError(t("search.noResult"));
  }

  return (
    <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Tombol hamburger, hanya muncul di layar kecil (di bawah lg) */}
        <button
          aria-label="Buka menu"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/beranda" className="flex shrink-0 items-center gap-2">
          <Image
            src="/Container.png"
            alt="ElektroMart"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-lg font-bold text-white">ElektroMart</span>
        </Link>

        <form onSubmit={handleSearch} className="relative hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              if (searchError) setSearchError("");
            }}
            placeholder={t("search")}
            className="w-full rounded-lg border-0 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
          {searchError && (
            <p className="absolute left-0 top-full z-20 mt-2 w-full rounded-lg bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-lg">
              {searchError}
            </p>
          )}
        </form>

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={navLinkClassName(link.href, pathname)}
              aria-current={isNavActive(link.href, pathname) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          <div className="hidden sm:block">
            <LanguageSwitcher variant="navbar" />
          </div>
          {userName ? <div className="relative">
            <button type="button" onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 text-sm font-semibold text-white" aria-label={t("profile")}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <UserCircle className="h-7 w-7" />}
              <span className="hidden max-w-24 truncate md:block">{userName}</span>
            </button>
            {profileOpen ? <div className="absolute right-0 top-10 z-20 w-48 rounded-lg bg-white p-1.5 text-sm text-slate-700 shadow-lg">
              {isAdmin ? (
                <Link href={accountHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-slate-100">
                  <LayoutGrid className="h-4 w-4 text-navy-700" /> {t("dashboard")}
                </Link>
              ) : userRole === "buyer" ? (
                <Link href="/profil" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-slate-100">
                  <UserIcon className="h-4 w-4 text-navy-700" /> {t("profile")}
                </Link>
              ) : (
                <Link href={accountHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-slate-100">
                  <LayoutGrid className="h-4 w-4 text-navy-700" /> {t("dashboard")}
                </Link>
              )}
              <button type="button" onClick={logout} className="w-full rounded px-3 py-2 text-left hover:bg-slate-100">{t("logout")}</button>
            </div> : null}
          </div> : <>
            <Link href="/login" className="hidden text-sm font-semibold text-white sm:block">{t("login")}</Link>
            <Link href="/register-pembeli" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-100">{t("register")}</Link>
          </>}
          <Link
            href="/chat"
            aria-label="Chat"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 sm:flex"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link
            href="/keranjang"
            aria-label={t("cart")}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Panel menu mobile: search bar + nav links + Masuk, muncul saat hamburger diklik */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-navy-900 px-4 py-4 lg:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (searchError) setSearchError("");
                }}
                placeholder={t("search")}
                className="w-full rounded-lg border-0 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>
            {searchError && (
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-red-600">
                {searchError}
              </p>
            )}
          </form>
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={navLinkClassName(link.href, pathname, true)}
                aria-current={isNavActive(link.href, pathname) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 px-2 pt-3">
              <button type="button" onClick={() => setLanguageOpen((open) => !open)} className="flex w-full items-center gap-2 py-2 text-left text-slate-200" aria-label="Pilih bahasa" aria-expanded={languageOpen}>
                <Globe className="h-4 w-4" />
                <span>{language === "id" ? "Indonesia" : "English"}</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${languageOpen ? "rotate-180" : ""}`} />
              </button>
              {languageOpen ? <div className="ml-6 flex flex-col gap-1 pb-1">
                <button type="button" onClick={() => { setLanguage("id"); setLanguageOpen(false); }} className={`rounded px-2 py-1.5 text-left ${language === "id" ? "font-semibold text-brand-orange" : "text-slate-300 hover:text-white"}`}>Indonesia</button>
                <button type="button" onClick={() => { setLanguage("en"); setLanguageOpen(false); }} className={`rounded px-2 py-1.5 text-left ${language === "en" ? "font-semibold text-brand-orange" : "text-slate-300 hover:text-white"}`}>English</button>
              </div> : null}
            </div>
            {userName ? <>
              {isAdmin ? (
                <Link href={accountHref} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-white/10 hover:text-white">
                  <LayoutGrid className="h-4 w-4" /> {t("dashboard")}
                </Link>
              ) : userRole === "buyer" ? (
                <Link href="/profil" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-white/10 hover:text-white">
                  <UserIcon className="h-4 w-4" /> {t("profile")}
                </Link>
              ) : (
                <Link href={accountHref} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-white/10 hover:text-white">
                  <LayoutGrid className="h-4 w-4" /> {t("dashboard")}
                </Link>
              )}
              <button type="button" onClick={() => { void logout(); setMenuOpen(false); }} className="rounded-lg px-2 py-2.5 text-left hover:bg-white/10 hover:text-white">{t("logout")}</button>
            </> : <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-white/10 hover:text-white">{t("login")}</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}