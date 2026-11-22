"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { api, type UserProfile } from "@/lib/api";

const emptyForm = { full_name: "", email: "", password: "", phone: "", account_status: "active" };

export default function AdminBuyer() {
  const { t } = useLanguage();
  const [buyers, setBuyers] = useState<UserProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api<{ users: UserProfile[] }>("/api/users?role=buyer");
      setBuyers(data.users || []);
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

  function startEdit(b: UserProfile) {
    setEditingId(b.id);
    setForm({
      full_name: b.full_name || "",
      email: b.email || "",
      password: "",
      phone: b.phone || "",
      account_status: b.account_status || "active",
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
            account_status: form.account_status,
            email: form.email,
          }),
        });
      } else {
        await api("/api/users", { method: "POST", body: JSON.stringify({ ...form, role: "buyer" }) });
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
      <TopBar placeholder={t("admin.searchBuyerPlaceholder")} />
      <div className="px-8 pb-10 pt-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.manageBuyers")}</h1>
            <p className="mt-1 text-sm text-admin-muted">{t("admin.buyersSubtitle")}</p>
          </div>
          <button type="button" onClick={startCreate} className="rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white">
            {t("admin.addBuyer")}
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
            <select value={form.account_status} onChange={(e) => setForm({ ...form, account_status: e.target.value })} className="h-11 rounded-lg border px-3 text-sm">
              <option value="active">{t("admin.active")}</option>
              <option value="suspended">{t("admin.suspended")}</option>
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white">{t("admin.saveChanges")}</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">{t("admin.cancel")}</button>
            </div>
          </form>
        ) : null}

        <div className="rounded-2xl border border-[#EEF1F6] bg-white p-5">
          <div className="overflow-hidden rounded-xl border border-[#EEF1F6]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#F4F6FA] text-[13px] text-admin-ink">
                  <th className="px-4 py-3 font-semibold">{t("admin.buyerName")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.phoneNo")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.joinedDate")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((b) => (
                  <tr key={b.id} className="border-t border-[#F1F4F8]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-admin-ink">{b.full_name}</p>
                      <p className="text-xs text-admin-muted">{b.email}</p>
                    </td>
                    <td className="px-4 text-admin-ink">{b.phone}</td>
                    <td className="px-4 text-admin-ink">{b.created_at ? new Date(b.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.account_status === "suspended" ? "bg-[#FDECEC] text-[#E11D48]" : "bg-[#E9F8EF] text-[#16A34A]"}`}>
                        {b.account_status === "suspended" ? t("admin.suspended") : t("admin.active")}
                      </span>
                    </td>
                    <td className="px-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(b)} className="text-admin-muted" aria-label={t("admin.editUser")}><Pencil size={16} /></button>
                        <button type="button" onClick={() => void remove(b.id)} className="text-red-500" aria-label={t("admin.deleteUser")}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
