"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Home,
  Landmark,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Store,
  Trash2,
  User,
  Building2,
  Wallet,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { api, PROVINCES, type OrderRecord, type ShippingAddress } from "@/lib/api";
import { useApiData, mutateApi } from "@/hooks/useApiData";
import { useLanguage } from "@/lib/i18n";

type Profile = {
  full_name: string;
  phone: string;
  avatar_url: string | null;
  role?: string;
  date_of_birth: string;
  gender: string;
};

type BankAccount = {
  id: string;
  type: "card" | "account";
  bank_name: string;
  account_name: string;
  account_number: string;
};

const NAMED_CHANNELS = ["BCA OneKlik", "BRI Direct Debit", "SeaBank Bayar Instan", "OCTO Cash by CIMB Niaga"];

const emptyProfile: Profile = {
  full_name: "",
  phone: "",
  avatar_url: null,
  date_of_birth: "",
  gender: "",
};

type AddressLabel = "home" | "office" | "other";

const emptyAddress = {
  id: "",
  label: "home" as AddressLabel,
  recipient: "",
  phone: "",
  address: "",
  city: "",
  province: "Jawa Timur",
  postal: "",
  is_default: false,
};

type Section = "profil" | "bank" | "alamat" | "password" | "pesanan";

type RegisteringBank = {
  mode: "card" | "account";
  fixedBank?: string;
} | null;

const STATUS_STYLES: Record<string, { labelKey: string; cls: string }> = {
  waiting_payment: { labelKey: "profile.orderWaitingPayment", cls: "bg-[#FDECEC] text-[#E11D48]" },
  paid: { labelKey: "profile.orderPreparing", cls: "bg-[#E8F0FE] text-[#2563EB]" },
  shipped: { labelKey: "profile.orderShipped", cls: "bg-[#FFF4E5] text-[#D97706]" },
  completed: { labelKey: "profile.orderCompleted", cls: "bg-[#E9F8EF] text-[#16A34A]" },
  cancelled: { labelKey: "profile.orderCancelled", cls: "bg-[#EEF1F6] text-slate-500" },
};

function maskNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? "•••• " + digits.slice(-4) : value;
}

function formatRupiah(value: number) {
  return "Rp " + (value || 0).toLocaleString("id-ID");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BuyerProfilPage() {
  const { t } = useLanguage();
  const [section, setSection] = useState<Section>("profil");
  const { data: sessionData, error: sessionError } = useApiData<{ user: { id: string; email?: string } | null }>("/api/auth/user");
  const userId = sessionData?.user?.id ?? null;
  const { data: profileRes, error: profileError } = useApiData<{ data: (Partial<Profile> & { username?: string | null }) | null }>(
    userId ? `/api/profiles?id=${userId}` : null
  );
  const { data: addressesRes } = useApiData<{ addresses: ShippingAddress[] }>(userId ? "/api/addresses" : null);
  const { data: accountsRes } = useApiData<{ accounts: BankAccount[] }>(userId ? "/api/bank-accounts" : null);
  const { data: ordersRes, error: ordersError } = useApiData<{ orders: OrderRecord[] }>(userId ? "/api/orders" : null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<typeof emptyAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [registering, setRegistering] = useState<RegisteringBank>(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountBank, setAccountBank] = useState("");
  const [bankSaving, setBankSaving] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderFilter, setOrderFilter] = useState("");
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [orderActionMsg, setOrderActionMsg] = useState("");
  const [orderActionErr, setOrderActionErr] = useState("");

  function labelText(label: string) {
    if (label === "office") return t("profile.labelOffice");
    if (label === "other") return t("profile.labelOther");
    return t("profile.labelHome");
  }

  async function loadAddresses() {
    await mutateApi("/api/addresses");
  }

  async function loadBankAccounts() {
    await mutateApi("/api/bank-accounts");
  }

  async function loadOrders() {
    await mutateApi("/api/orders");
  }

  async function completeOrder(orderId: string) {
    setCompletingId(orderId);
    setOrderActionMsg("");
    setOrderActionErr("");
    try {
      await api<{ order: OrderRecord }>(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      mutateApi("/api/orders");
      setOrderActionMsg(t("profile.orderCompletedSuccess"));
    } catch (err) {
      setOrderActionErr(err instanceof Error ? err.message : t("profile.orderActionFailed"));
    } finally {
      setCompletingId(null);
    }
  }

  useEffect(() => {
    if (sessionData) {
      setEmail(sessionData.user?.email ?? "");
      if (sessionData.user?.email) setUsername(sessionData.user.email.split("@")[0]);
    }
  }, [sessionData]);

  useEffect(() => {
    if (!profileRes?.data) return;
    const data = profileRes.data;
    setProfile({
      ...emptyProfile,
      ...data,
      date_of_birth: data.date_of_birth || "",
      gender: data.gender || "",
    });
    if (data.username) setUsername(data.username);
  }, [profileRes]);

  useEffect(() => {
    if (addressesRes) setAddresses(addressesRes.addresses || []);
  }, [addressesRes]);

  useEffect(() => {
    if (accountsRes) setAccounts(accountsRes.accounts || []);
  }, [accountsRes]);

  useEffect(() => {
    if (ordersRes) {
      setOrders(ordersRes.orders || []);
      setOrdersLoaded(true);
    }
  }, [ordersRes]);

  useEffect(() => {
    if (sessionError || profileError) {
      setError((sessionError ?? profileError)?.message || t("profile.sessionNotFoundLogin"));
    }
    if (sessionData || sessionError) setLoading(false);
  }, [sessionData, sessionError, profileError, t]);

  function updateField(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          username: username.trim(),
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          avatar_url: profile.avatar_url,
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || null,
        }),
      });
      if (email.trim()) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
      }
      setMessage(t("admin.profileSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.profileSaveFailed"));
    }
    setSaving(false);
  }

  async function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type) || file.size > 1024 * 1024) {
      setError(t("admin.photoInvalid"));
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUploading(true);
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userData.user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (uploadError) {
      setError(uploadError.message === "Bucket not found" ? t("admin.storageNotConfigured") : uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ avatar_url: data.publicUrl }) });
      setProfile((current) => ({ ...current, avatar_url: data.publicUrl }));
      setMessage(t("admin.photoUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.profileSaveFailed"));
    }
    setUploading(false);
    event.target.value = "";
  }

  async function removePhoto() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUploading(true);
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ avatar_url: null }) });
      setProfile((current) => ({ ...current, avatar_url: null }));
      setMessage(t("admin.photoDeleted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.profileSaveFailed"));
    }
    setUploading(false);
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError(t("admin.passwordTooShort"));
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) setError(passwordError.message);
    else {
      setPassword("");
      setMessage(t("admin.passwordChanged"));
    }
  }

  function openAddAddress() {
    setEditingAddress({
      ...emptyAddress,
      recipient: profile.full_name || "",
      phone: profile.phone || "",
      is_default: addresses.length === 0,
    });
    setShowAddressForm(true);
  }

  function openEditAddress(item: ShippingAddress) {
    setEditingAddress({
      id: item.id,
      label: (item.label as AddressLabel) || "home",
      recipient: item.recipient,
      phone: item.phone || "",
      address: item.address,
      city: item.city,
      province: item.province,
      postal: item.postal || "",
      is_default: item.is_default,
    });
    setShowAddressForm(true);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAddress) return;
    if (!editingAddress.recipient.trim() || !editingAddress.address.trim() || !editingAddress.city.trim()) {
      setError(t("profile.completeAddress"));
      return;
    }
    setError("");
    try {
      const payload = {
        label: editingAddress.label,
        recipient: editingAddress.recipient.trim(),
        phone: editingAddress.phone.trim(),
        address: editingAddress.address.trim(),
        city: editingAddress.city.trim(),
        province: editingAddress.province,
        postal: editingAddress.postal.trim(),
        is_default: editingAddress.is_default,
      };
      if (editingAddress.id) {
        await api(`/api/addresses/${editingAddress.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/addresses", { method: "POST", body: JSON.stringify(payload) });
      }
      await loadAddresses();
      setShowAddressForm(false);
      setEditingAddress(null);
      setMessage(t("profile.addressSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  async function deleteAddress(id: string) {
    try {
      await api(`/api/addresses/${id}`, { method: "DELETE" });
      await loadAddresses();
      setMessage(t("profile.addressDeleted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  async function setPrimary(id: string) {
    try {
      await api(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify({ is_default: true }) });
      await loadAddresses();
      setMessage(t("profile.primaryChanged"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  function openRegister(spec: NonNullable<RegisteringBank>) {
    setRegistering(spec);
    setAccountName(profile.full_name || "");
    setAccountNumber("");
    setAccountBank(spec.fixedBank ?? "");
  }

  async function submitBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registering) return;
    const bankName = accountBank.trim();
    if (!bankName || !accountName.trim() || !accountNumber.trim()) {
      setError(t("profile.completeAddress"));
      return;
    }
    setBankSaving(true);
    setError("");
    try {
      await api("/api/bank-accounts", {
        method: "POST",
        body: JSON.stringify({
          type: registering.mode,
          bank_name: bankName,
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
        }),
      });
      await loadBankAccounts();
      setRegistering(null);
      setMessage(t("profile.bankAdded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
    setBankSaving(false);
  }

  async function deleteBankAccount(id: string) {
    try {
      await api(`/api/bank-accounts/${id}`, { method: "DELETE" });
      await loadBankAccounts();
      setMessage(t("profile.bankRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  function resetMessage() {
    setMessage("");
    setError("");
  }

  const bankSections = useMemo(() => {
    const byBank = (name: string) => accounts.filter((a) => a.bank_name === name);
    return [
      {
        key: "card",
        title: t("profile.bankCards"),
        icon: CreditCard,
        items: accounts.filter((a) => a.type === "card" && !NAMED_CHANNELS.includes(a.bank_name)),
        emptyKey: "profile.noCardRegistered",
        registerSpec: { mode: "card" as const },
      },
      {
        key: "bca",
        title: t("profile.bcaOneKlik"),
        icon: Wallet,
        items: byBank("BCA OneKlik"),
        emptyKey: "profile.noCardRegistered",
        registerSpec: { mode: "card" as const, fixedBank: "BCA OneKlik" },
      },
      {
        key: "bri",
        title: t("profile.briDirectDebit"),
        icon: Wallet,
        items: byBank("BRI Direct Debit"),
        emptyKey: "profile.noCardRegistered",
        registerSpec: { mode: "card" as const, fixedBank: "BRI Direct Debit" },
      },
      {
        key: "seabank",
        title: t("profile.seabankInstan"),
        icon: Wallet,
        items: byBank("SeaBank Bayar Instan"),
        emptyKey: "profile.noInstanAccount",
        registerSpec: { mode: "card" as const, fixedBank: "SeaBank Bayar Instan" },
      },
      {
        key: "octo",
        title: t("profile.octoCash"),
        icon: Wallet,
        items: byBank("OCTO Cash by CIMB Niaga"),
        emptyKey: "profile.noCardRegistered",
        registerSpec: { mode: "card" as const, fixedBank: "OCTO Cash by CIMB Niaga" },
      },
      {
        key: "account",
        title: t("profile.myBankAccounts"),
        icon: Landmark,
        items: accounts.filter((a) => a.type === "account"),
        emptyKey: "profile.noBankAccount",
        registerSpec: { mode: "account" as const },
      },
    ];
  }, [accounts, t, accountBank]);

  const orderTabs = [
    { id: "", label: t("profile.all") },
    { id: "waiting_payment", label: t("profile.orderWaitingPayment") },
    { id: "paid", label: t("profile.orderPreparing") },
    { id: "shipped", label: t("profile.orderShipped") },
    { id: "completed", label: t("profile.orderCompleted") },
    { id: "cancelled", label: t("profile.orderCancelled") },
  ];

  const visibleOrders = useMemo(() => {
    if (!orderFilter) return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const sectionTitle: Record<Section, string> = {
    profil: t("profile.myProfile"),
    bank: t("profile.bankCard"),
    alamat: t("profile.addressTab"),
    password: t("profile.changePassword"),
    pesanan: t("profile.myOrders"),
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-sm text-slate-500">
          <Link href="/beranda" className="hover:text-navy-900">{t("home")}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{t("profile")}</span>
        </nav>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">{sectionTitle[section]}</h1>
        </div>

        {message ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#E9F8EF] px-4 py-3 text-sm text-[#15803D]">
            <Check className="h-4 w-4 shrink-0" /> {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400 shadow-card">
            {t("admin.loadingProfile")}
          </div>
        ) : (
          <div className="mt-6 gap-6 lg:grid lg:grid-cols-[260px_1fr]">
            <aside className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-card lg:mb-0 lg:self-start">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-800 text-lg font-bold text-white">
                    {profile.full_name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5 text-slate-300" />}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-900">{profile.full_name || t("profile.notFilled")}</p>
                  <p className="truncate text-xs text-slate-400">@{username || email}</p>
                </div>
              </div>

              <p className="mt-4 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("profile.myAccount")}</p>
              <nav className="mt-2 space-y-1">
                <SidebarItem active={section === "profil"} onClick={() => { setSection("profil"); resetMessage(); }} icon={User} label={t("profile")} />
                <SidebarItem active={section === "bank"} onClick={() => { setSection("bank"); resetMessage(); }} icon={CreditCard} label={t("profile.bankCard")} />
                <SidebarItem active={section === "alamat"} onClick={() => { setSection("alamat"); resetMessage(); }} icon={MapPin} label={t("profile.addressTab")} />
                <SidebarItem active={section === "password"} onClick={() => { setSection("password"); resetMessage(); }} icon={Lock} label={t("profile.changePassword")} />
              </nav>

              <div className="my-4 border-t border-slate-100" />
              <SidebarItem active={section === "pesanan"} onClick={() => { setSection("pesanan"); resetMessage(); }} icon={Package} label={t("profile.myOrders")} />
            </aside>

            <div>
              {section === "profil" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                    <div className="flex flex-col items-center text-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-28 w-28 rounded-2xl object-cover" />
                      ) : (
                        <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-navy-800 text-4xl font-bold text-white">
                          {profile.full_name?.charAt(0)?.toUpperCase() || <User className="h-12 w-12 text-slate-300" />}
                        </span>
                      )}

                      <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-brand-blue/30 bg-blue-50 px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-blue-100">
                        <Camera size={15} /> {uploading ? t("profile.processing") : t("admin.changePhoto")}
                        <input type="file" accept="image/jpeg,image/png" onChange={changePhoto} disabled={uploading} className="sr-only" />
                      </label>
                      <p className="mt-1.5 text-xs text-slate-400">{t("profile.avatarLimit")}</p>
                      <p className="text-xs text-slate-400">{t("profile.avatarFormat")}</p>
                      {profile.avatar_url ? (
                        <button type="button" onClick={() => void removePhoto()} disabled={uploading} className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600">
                          <Trash2 size={13} /> {t("profile.removePhoto")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <form onSubmit={saveProfile} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                    <h2 className="text-base font-bold text-navy-900">{t("profile.personalInfo")}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{t("profile.profileSubtitle")}</p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label={t("profile.username")} icon={User}>
                        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                      </Field>
                      <Field label={t("auth.fullName")} icon={User}>
                        <input value={profile.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder={t("profile.fullNamePlaceholder")} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300" />
                      </Field>
                      <Field label={t("admin.emailAddress")} icon={Mail}>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                      </Field>
                      <Field label={t("profile.phoneWhatsapp")} icon={Phone}>
                        <input value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={t("profile.phonePlaceholder")} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300" />
                      </Field>
                      <Field label={t("profile.dob")} icon={User}>
                        <input type="date" value={profile.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                      </Field>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.gender")}</span>
                      <div className="flex gap-3">
                        {(["male", "female", "other"] as const).map((g) => (
                          <label key={g} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${profile.gender === g ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                            <input type="radio" name="gender" value={g} checked={profile.gender === g} onChange={() => updateField("gender", g)} className="sr-only" />
                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300">
                              {profile.gender === g ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
                            </span>
                            {g === "male" ? t("profile.genderMale") : g === "female" ? t("profile.genderFemale") : t("profile.genderOther")}
                          </label>
                        ))}
                      </div>
                    </label>

                    <div className="mt-6 text-right">
                      <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                        <Save size={14} /> {saving ? t("auth.saving") : t("profile.saveSmall")}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {section === "bank" ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                    <p>{t("profile.bankSubtitle")}</p>
                  </div>

                  {bankSections.map((bank) => (
                    <div key={bank.key} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                            <bank.icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-navy-900">{bank.title}</p>
                            <p className="text-xs text-slate-400">
                              {bank.items.length === 0 ? t(bank.emptyKey) : `${bank.items.length} ${t("profile.registered").toLowerCase()}`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={() => { resetMessage(); openRegister(bank.registerSpec); }} className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                          <Plus className="h-3.5 w-3.5" /> {bank.key === "account" ? t("profile.registerAccount") : t("profile.registerCard")}
                        </button>
                      </div>

                      {bank.items.length > 0 ? (
                        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                          {bank.items.map((acc) => (
                            <li key={acc.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-navy-900">{acc.account_name}</p>
                                <p className="text-xs text-slate-500">{acc.bank_name} · {maskNumber(acc.account_number)}</p>
                              </div>
                              <button type="button" onClick={() => void deleteBankAccount(acc.id)} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600">
                                <Trash2 size={13} /> {t("profile.remove")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {section === "alamat" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-navy-900">{t("profile.shippingAddresses")}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">{t("profile.shippingAddressesDesc")}</p>
                    </div>
                    <button onClick={() => { resetMessage(); openAddAddress(); }} className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                      <Plus className="h-4 w-4" /> {t("profile.addAddress")}
                    </button>
                  </div>

                  {addresses.length === 0 && !showAddressForm ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-card">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                        <MapPin className="h-7 w-7 text-brand-blue" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-navy-900">{t("profile.noAddress")}</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">{t("profile.noAddressDesc")}</p>
                    </div>
                  ) : null}

                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${addr.label === "office" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-brand-blue"}`}>
                          {addr.label === "office" ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-navy-900">{labelText(addr.label)}</p>
                            {addr.is_default && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                {t("profile.primary")}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-navy-900">{addr.recipient}</p>
                          <p className="text-xs text-slate-500">{addr.phone}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {addr.address}, {addr.city}, {addr.province} {addr.postal}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 pl-0 text-xs font-semibold">
                        <button onClick={() => { resetMessage(); openEditAddress(addr); }} className="flex items-center gap-1 text-brand-blue hover:text-blue-700">
                          <Pencil className="h-3.5 w-3.5" /> {t("profile.edit")}
                        </button>
                        {!addr.is_default && (
                          <button onClick={() => { void setPrimary(addr.id); }} className="flex items-center gap-1 text-slate-500 hover:text-navy-900">
                            <Check className="h-3.5 w-3.5" /> {t("profile.setPrimary")}
                          </button>
                        )}
                        <button onClick={() => void deleteAddress(addr.id)} className="flex items-center gap-1 text-red-500 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" /> {t("profile.delete")}
                        </button>
                      </div>
                    </div>
                  ))}

                  {showAddressForm && editingAddress ? (
                    <form onSubmit={saveAddress} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-navy-900">
                          {editingAddress.id ? t("profile.editAddress") : t("profile.addNewAddress")}
                        </h3>
                        <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="text-xs font-semibold text-slate-400 hover:text-navy-900">
                          {t("admin.cancel")}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.addressLabel")}</label>
                          <div className="flex gap-2">
                            {(["home", "office", "other"] as const).map((lbl) => (
                              <button
                                key={lbl}
                                type="button"
                                onClick={() => setEditingAddress({ ...editingAddress, label: lbl })}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold ${editingAddress.label === lbl ? "bg-brand-blue text-white" : "bg-[#F4F6FA] text-navy-900 hover:bg-slate-200"}`}
                              >
                                {labelText(lbl)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.recipientName")}</label>
                          <input value={editingAddress.recipient} onChange={(e) => setEditingAddress({ ...editingAddress, recipient: e.target.value })} className="form-input-em" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("auth.phone")}</label>
                          <input value={editingAddress.phone} onChange={(e) => setEditingAddress({ ...editingAddress, phone: e.target.value })} placeholder={t("profile.phonePlaceholder")} className="form-input-em" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.fullAddress")}</label>
                          <textarea rows={2} value={editingAddress.address} onChange={(e) => setEditingAddress({ ...editingAddress, address: e.target.value })} placeholder={t("profile.fullAddressPlaceholder")} className="form-input-em resize-none" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.city")}</label>
                          <input value={editingAddress.city} onChange={(e) => setEditingAddress({ ...editingAddress, city: e.target.value })} placeholder={t("profile.cityPlaceholder")} className="form-input-em" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.province")}</label>
                          <select value={editingAddress.province} onChange={(e) => setEditingAddress({ ...editingAddress, province: e.target.value })} className="form-input-em">
                            {PROVINCES.map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.postalCode")}</label>
                          <input value={editingAddress.postal} onChange={(e) => setEditingAddress({ ...editingAddress, postal: e.target.value })} placeholder="00000" className="form-input-em" />
                        </div>
                      </div>

                      <label className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={editingAddress.is_default} onChange={(e) => setEditingAddress({ ...editingAddress, is_default: e.target.checked })} className="h-4 w-4 rounded border-slate-300 accent-brand-blue" />
                        {t("profile.setAsPrimary")}
                      </label>

                      <div className="mt-5 flex gap-3">
                        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                          <Save className="h-4 w-4" /> {t("profile.saveAddress")}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600">
                    <Store className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                    <p>{t("profile.addressHint")}</p>
                  </div>
                </div>
              ) : null}

              {section === "password" ? (
                <form onSubmit={updatePassword} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-brand-blue" />
                    <h2 className="text-base font-bold text-navy-900">{t("admin.passwordSecurity")}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t("profile.passwordHint")}</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("profile.newPasswordPlaceholder")} className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" />
                    <button type="submit" className="rounded-lg bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
                      {t("admin.changePassword")}
                    </button>
                  </div>
                </form>
              ) : null}

              {section === "pesanan" ? (
                <div className="space-y-4">
                  <h2 className="text-base font-bold text-navy-900">{t("profile.myOrders")}</h2>
                  <p className="-mt-2 text-xs text-slate-500">{t("profile.ordersSubtitle")}</p>

                  <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100">
                    {orderTabs.map((tabItem) => {
                      const count = tabItem.id === "" ? orders.length : orders.filter((o) => o.status === tabItem.id).length;
                      return (
                        <button
                          key={tabItem.id}
                          type="button"
                          onClick={() => setOrderFilter(tabItem.id)}
                          className={`shrink-0 border-b-2 pb-3 text-sm font-semibold transition ${orderFilter === tabItem.id ? "border-brand-blue text-brand-blue" : "border-transparent text-slate-500 hover:text-navy-900"}`}
                        >
                          {tabItem.label}
                          <span className={`ml-1.5 text-xs ${orderFilter === tabItem.id ? "text-brand-blue" : "text-slate-400"}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {orderActionMsg ? (
                    <p className="rounded-lg bg-[#E9F8EF] px-3 py-2 text-sm font-medium text-[#16A34A]">{orderActionMsg}</p>
                  ) : null}
                  {orderActionErr ? (
                    <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm font-medium text-[#E11D48]">{orderActionErr}</p>
                  ) : null}

                  {ordersLoaded && visibleOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-card">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
                        <Package className="h-7 w-7 text-slate-300" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-navy-900">{t("profile.orderEmpty")}</p>
                    </div>
                  ) : null}

                  {visibleOrders.map((order) => {
                    const status = STATUS_STYLES[order.status] || { labelKey: "admin.orders", cls: "bg-slate-100 text-slate-600" };
                    return (
                      <div key={order.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-400">{t("profile.orderNumber")}:</span>
                            <span className="font-bold text-navy-900">{order.order_number}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">{formatDate(order.created_at)}</span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.cls}`}>{t(status.labelKey)}</span>
                          </div>
                        </div>

                        <ul className="mt-3 space-y-3">
                          {(order.items || []).map((item) => (
                            <li key={item.id} className="flex items-center gap-3">
                              {item.product_image ? (
                                <img src={item.product_image} alt="" className="h-12 w-12 rounded-lg border border-slate-100 object-cover" />
                              ) : (
                                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50">
                                  <Package className="h-5 w-5 text-slate-300" />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-navy-900">{item.product_name}</p>
                                <p className="text-xs text-slate-400">{formatRupiah(item.price)} × {item.qty}</p>
                              </div>
                              <span className="text-sm font-semibold text-navy-900">{formatRupiah(item.subtotal)}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                          <span className="text-slate-500">
                            {order.payment_group || order.payment_method || t("profile.paymentMethod")}
                            {order.courier ? ` · ${order.courier}` : ""}
                          </span>
                          <span className="text-slate-500">
                            {t("profile.orderTotal")}:{" "}
                            <span className="ml-1 text-sm font-bold text-navy-900">{formatRupiah(order.total)}</span>
                          </span>
                        </div>

                        {order.status === "shipped" ? (
                          <div className="mt-3 flex flex-col items-end gap-2 border-t border-slate-100 pt-3">
                            {order.tracking_number ? (
                              <p className="w-full text-xs text-slate-500">
                                {t("seller.trackingNumber")}: <span className="font-medium text-navy-900">{order.tracking_number}</span>
                              </p>
                            ) : null}
                            <button
                              type="button"
                              disabled={completingId === order.id}
                              onClick={() => void completeOrder(order.id)}
                              className="flex items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                            >
                              {completingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              {t("profile.orderMarkCompleted")}
                            </button>
                          </div>
                        ) : null}

                        {order.status === "completed" && order.completed_at ? (
                          <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-medium text-[#16A34A]">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("profile.orderCompletedOn", { date: formatDate(order.completed_at) })}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {registering ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 px-4" role="dialog" aria-modal="true">
          <form onSubmit={submitBank} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">
                {registering.mode === "account" ? t("profile.registerAccount") : t("profile.registerCard")}
              </h3>
              <button type="button" onClick={() => setRegistering(null)} className="text-slate-400 hover:text-navy-900" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {registering.fixedBank ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.bankName")}</span>
                  <input value={registering.fixedBank} readOnly className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none" />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.bankName")}</span>
                  <input value={accountBank} onChange={(e) => setAccountBank(e.target.value)} placeholder={t("profile.bankName")} className="form-input-em" />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.accountHolder")}</span>
                <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={t("profile.accountHolderPlaceholder")} className="form-input-em" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">{t("profile.accountNumber")}</span>
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={t("profile.accountNumberPlaceholder")} className="form-input-em" />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={bankSaving} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Save className="h-4 w-4" /> {bankSaving ? t("profile.processing") : t("profile.register")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mt-10">
        <Footer />
      </div>

      <style jsx>{`
        .form-input-em {
          width: 100%;
          border-radius: 0.625rem;
          border: 1px solid #e2e8f0;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #0a1c47;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input-em:focus {
          border-color: #1a3fd6;
          box-shadow: 0 0 0 3px rgba(26, 63, 214, 0.12);
        }
        .form-input-em::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </main>
  );
}

function SidebarItem({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: typeof User;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
        active ? "bg-[#EEF2FF] text-brand-blue" : "text-slate-600 hover:bg-slate-50 hover:text-navy-900"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 text-left">{label}</span>
      {active ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof User; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10">
        <Icon size={16} className="shrink-0 text-slate-400" />
        {children}
      </div>
    </label>
  );
}