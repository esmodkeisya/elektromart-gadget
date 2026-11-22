"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Star, Store, Trash2 } from "lucide-react";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { api, type UserProfile } from "@/lib/api";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  store_name: "",
  seller_status: "verified",
};

function statusKey(status: string | null | undefined) {
  if (status === "official") return "admin.officialStore";
  if (status === "banned") return "admin.banned";
  return "admin.verifiedSeller";
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const styles: Record<string, string> = {
    official: "bg-admin-navy text-white",
    verified: "bg-[#EEE7FA] text-[#6D28D9]",
    banned: "bg-[#FDECEC] text-[#E11D48]",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || styles.verified}`}>{t(statusKey(status))}</span>;
}

export default function AdminSeller() {
  const { t } = useLanguage();
  const [sellers, setSellers] = useState<UserProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api<{ users: UserProfile[] }>("/api/users?role=seller");
      setSellers(data.users || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function startEdit(s: UserProfile) {
    setEditingId(s.id);
    setForm({
      full_name: s.full_name || "",
      email: s.email || "",
      password: "",
      phone: s.phone || "",
      store_name: s.store_name || "",
      seller_status: s.seller_status || "verified",
    });
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) {
        await api(`/api/users/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone,
            store_name: form.store_name,
            seller_status: form.seller_status,
            email: form.email,
          }),
        });
      } else {
        await api("/api/users", {
          method: "POST",
          body: JSON.stringify({ ...form, role: "seller" }),
        });
      }
      setOpen(false);
      setMessage(t("admin.saved"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("admin.confirmDelete"))) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      setMessage(t("admin.deleted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  return (
    <div className="min-h-full bg-admin-canvas">
      <TopBar placeholder={t("admin.searchUsersStores")} />
      <div className="px-8 pb-10 pt-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.manageSellers")}</h1>
            <p className="mt-1 text-sm text-admin-muted">{t("admin.sellersSubtitle")}</p>
          </div>
          <button type="button" onClick={startCreate} className="rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white">
            {t("admin.addSeller")}
          </button>
        </div>
        {message ? <p className="mb-4 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        {open ? (
          <form onSubmit={submit} className="mb-5 grid gap-3 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-2">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder={t("auth.fullName")} className="h-11 rounded-lg border px-3 text-sm" />
            <input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("auth.email")} className="h-11 rounded-lg border px-3 text-sm" />
            {!editingId ? <input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("admin.password")} className="h-11 rounded-lg border px-3 text-sm" /> : null}
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("auth.phone")} className="h-11 rounded-lg border px-3 text-sm" />
            <input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder={t("auth.storeName")} className="h-11 rounded-lg border px-3 text-sm" />
            <select value={form.seller_status} onChange={(e) => setForm({ ...form, seller_status: e.target.value })} className="h-11 rounded-lg border px-3 text-sm">
              <option value="verified">{t("admin.verifiedSeller")}</option>
              <option value="official">{t("admin.officialStore")}</option>
              <option value="banned">{t("admin.banned")}</option>
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white">{t("admin.saveChanges")}</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">{t("admin.cancel")}</button>
            </div>
          </form>
        ) : null}

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-admin-muted">
                <th className="pb-4 font-semibold">{t("auth.storeName")}</th>
                <th className="pb-4 font-semibold">{t("admin.reputation")}</th>
                <th className="pb-4 font-semibold">{t("admin.productCount")}</th>
                <th className="pb-4 font-semibold">{t("admin.status")}</th>
                <th className="pb-4 font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.id} className="border-t border-[#F1F4F8]">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-[#F4F6FA]">
                        <Store size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-admin-ink">{s.store_name || s.full_name}</p>
                        <p className="text-xs text-admin-muted">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-admin-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      {s.full_name}
                    </span>
                  </td>
                  <td className="text-admin-ink">{s.product_count || 0}</td>
                  <td>
                    <StatusBadge status={s.seller_status || "verified"} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(s)} className="text-admin-muted hover:text-admin-ink" aria-label={t("admin.editUser")}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => void remove(s.id)} className="text-red-500" aria-label={t("admin.deleteUser")}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
