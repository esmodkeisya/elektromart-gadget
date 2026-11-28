"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageCircle, ShoppingCart, Menu, X, UserCircle, LayoutGrid, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAllProducts } from "@/lib/data";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/CartContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function isNavActive(href: string, pathname: string) {
  if (href === "/beranda") return pathname === "/beranda" || pathname === "/";
  if (href.startsWith("/kategori")) return pathname.startsWith("/kategori");
  if (href.startsWith("/flash-sale")) return pathname.startsWith("/flash-sale");
  if (href.startsWith("/bantuan")) return pathname.startsWith("/bantuan");
  if (href.startsWith("/seller")) return pathname === href || pathname.startsWith(`${href}/`);
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "seller" | "buyer" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const liveProducts = useLiveProducts();
  const { language, t } = useLanguage();
  const { itemCount } = useCart();
  const navLinks = [
    { label: t("home"), href: "/beranda" },
    { label: t("categories"), href: "/kategori/semua" },
    { label: t("flashSale"), href: "/flash-sale" },
    { label: t("help"), href: "/bantuan" },
  ];
  const sellerLinks = [
    { label: t("home"), href: "/seller/dashboard" },
    { label: t("products"), href: "/seller/produk" },
    { label: t("admin.orders"), href: "/seller/pesanan" },
    { label: t("chat.messages"), href: "/seller/chat" },
    { label: t("report.notifications"), href: "/seller/laporan" },
    { label: t("seller.finance"), href: "/seller/finance" },
  ];
  const isSellerRoute = pathname.startsWith("/seller");
  const menuLinks = isSellerRoute ? sellerLinks : navLinks;

  const isAdmin = userRole === "admin" || userEmail === "esmodkeisya@gmail.com";
  const accountHref =
    isAdmin ? "/admin/dashboard" : userRole === "seller" ? "/seller/dashboard" : "/profil";
  const accountLabel =
    userRole === "buyer" ? t("profile") : t("dashboard");

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;
      const email = data.user.email ?? "";
      setUserEmail(email);
      setUserName(data.user.user_metadata?.full_name || email.split("@")[0] || t("profile"));
      const { data: profile } = await supabase.from("profiles").select("avatar_url, full_name, role").eq("id", data.user.id).maybeSingle();
      if (mounted) {
        setAvatarUrl(profile?.avatar_url ?? null);
        if (profile?.full_name) setUserName(profile.full_name);
        setUserRole(profile?.role === "admin" || profile?.role === "seller" || profile?.role === "buyer" ? profile.role : null);
      }
    }
    void loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void loadUser());
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [language, t]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setProfileOpen(false);
    setMenuOpen(false);
    setUserName("");
    setUserEmail("");
    setUserRole(null);
    setAvatarUrl(null);
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
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        <Link href="/beranda" className="flex shrink-0 items-center gap-2" aria-label="ElektroMart">
          <Image
            src="/Container.png"
            alt="ElektroMart"
            width={36}
            height={36}
            className="h-8 w-8 rounded-lg sm:h-9 sm:w-9"
          />
          <span className="hidden text-base font-bold text-white sm:block lg:text-lg">ElektroMart</span>
        </Link>

        <form onSubmit={handleSearch} className="relative min-w-0 flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              if (searchError) setSearchError("");
            }}
            placeholder={t("search")}
            className="h-9 w-full rounded-lg border-0 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange sm:h-10 sm:text-sm"
          />
          {searchError && (
            <p className="absolute left-0 top-full z-30 mt-2 w-full min-w-[180px] rounded-lg bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-lg">
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

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2 lg:gap-3">
          <div className="sm:hidden">
            <LanguageSwitcher variant="compact" />
          </div>
          <div className="hidden sm:block">
            <LanguageSwitcher variant="navbar" />
          </div>

          <div ref={accountRef} className="relative flex items-center gap-2">
            {userName ? (
              <>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex h-9 items-center gap-2 rounded-full px-0.5 text-white hover:bg-white/10 sm:px-1"
                  aria-label={t("profile")}
                  aria-expanded={profileOpen}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover sm:h-8 sm:w-8" />
                  ) : (
                    <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                  )}
                  <span className="hidden max-w-24 truncate text-sm font-semibold md:block">{userName}</span>
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-48 rounded-lg bg-white p-1.5 text-sm text-slate-700 shadow-lg">
                    <Link href={accountHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-slate-100">
                      {isAdmin || userRole === "seller" ? (
                        <LayoutGrid className="h-4 w-4 text-navy-700" />
                      ) : (
                        <UserIcon className="h-4 w-4 text-navy-700" />
                      )}
                      {accountLabel}
                    </Link>
                    <button type="button" onClick={logout} className="w-full rounded px-3 py-2 text-left hover:bg-slate-100">{t("logout")}</button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 sm:hidden"
                  aria-label={`${t("login")} / ${t("register")}`}
                  aria-expanded={profileOpen}
                >
                  <UserCircle className="h-5 w-5" />
                </button>
                <Link href="/login" className="hidden text-sm font-semibold text-white sm:block">{t("login")}</Link>
                <Link href="/register-pembeli" className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-100 sm:block">{t("register")}</Link>
                {profileOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-44 rounded-lg bg-white p-1.5 text-sm text-slate-700 shadow-lg sm:hidden">
                    <Link href="/login" onClick={() => setProfileOpen(false)} className="block rounded px-3 py-2 font-semibold hover:bg-slate-100">{t("login")}</Link>
                    <Link href="/register-pembeli" onClick={() => setProfileOpen(false)} className="block rounded px-3 py-2 hover:bg-slate-100">{t("register")}</Link>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <Link
            href="/chat"
            aria-label={t("chat")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>

          <Link
            href="/keranjang"
            aria-label={t("cart")}
            className="relative hidden h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 sm:flex"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-navy-900 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {menuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={navLinkClassName(link.href, pathname, true)}
                aria-current={isNavActive(link.href, pathname) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            {isSellerRoute ? (
              <>
                <Link href="/seller/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-slate-200 hover:bg-white/10 hover:text-white">
                  <UserIcon className="h-4 w-4" /> {t("profile")}
                </Link>
                <Link href="/beranda" onClick={() => setMenuOpen(false)} className="mt-1 border-t border-white/10 px-2 pt-3 text-slate-400 hover:text-white">
                  {t("admin.backHome")}
                </Link>
              </>
            ) : null}
            <Link href="/keranjang" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-slate-200 hover:bg-white/10 hover:text-white sm:hidden">
              <ShoppingCart className="h-4 w-4" /> {t("cart")}
              {itemCount > 0 && <span className="ml-auto rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">{itemCount > 99 ? "99+" : itemCount}</span>}
            </Link>
            {userName ? (
              <>
                <Link href={accountHref} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-slate-200 hover:bg-white/10 hover:text-white">
                  {isAdmin || userRole === "seller" ? <LayoutGrid className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                  {accountLabel}
                </Link>
                <button type="button" onClick={() => { void logout(); setMenuOpen(false); }} className="rounded-lg px-2 py-2.5 text-left text-slate-200 hover:bg-white/10 hover:text-white">{t("logout")}</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-slate-200 hover:bg-white/10 hover:text-white sm:hidden">{t("login")}</Link>
                <Link href="/register-pembeli" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-slate-200 hover:bg-white/10 hover:text-white sm:hidden">{t("register")}</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
