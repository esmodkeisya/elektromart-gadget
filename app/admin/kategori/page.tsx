"use client";

import { useEffect, useState } from "react";
import { Filter, List, Pencil, PlusCircle, Trash2 } from "lucide-react";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { api, type CategoryRecord } from "@/lib/api";

export default function AdminKategori() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#F59E0B");
  const [subs, setSubs] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api<{ categories: CategoryRecord[] }>("/api/categories");
      setCategories(data.categories || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveCategory() {
    if (!name.trim()) return;
    setError("");
    try {
      if (editingId) {
        await api(`/api/categories/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ name, color, subcategories: subs }),
        });
      } else {
        await api("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name, color, subcategories: subs }),
        });
      }
      setName("");
      setSubs("");
      setEditingId(null);
      setMessage(t("admin.saved"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  function startEdit(c: CategoryRecord) {
    setEditingId(c.id);
    setName(c.name);
    setColor(c.color || "#F59E0B");
    setSubs((c.subcategories || []).join(", "));
  }

  async function remove(id: string) {
    if (!window.confirm(t("admin.confirmDelete"))) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      setMessage(t("admin.deleted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  return (
    <div className="min-h-full bg-admin-canvas">
      <TopBar placeholder={t("admin.searchCategories")} />
      <div className="px-8 pb-10 pt-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.manageGadgetCategories")}</h1>
            <p className="mt-1 text-sm text-admin-muted">{t("admin.categoriesSubtitle")}</p>
          </div>
        </div>
        {message ? <p className="mb-4 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-card xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-admin-ink">
                <List size={16} /> {t("admin.parentCategoryList")}
              </h2>
              <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-admin-muted">
                <Filter size={14} /> {t("admin.filter")}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#EEF1F6]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#F4F6FA] text-[11px] uppercase tracking-wide text-admin-muted">
                    <th className="px-4 py-3 font-semibold">{t("admin.categoryName")}</th>
                    <th className="px-4 py-3 font-semibold">{t("admin.identityColor")}</th>
                    <th className="px-4 py-3 font-semibold">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-t border-[#F1F4F8]">
                      <td className="px-4 py-4 font-semibold text-admin-ink">{c.name}</td>
                      <td className="px-4">
                        <span className="flex items-center gap-2 text-admin-ink">
                          <span className="h-3.5 w-3.5 rounded-full" style={{ background: c.color || "#94a3b8" }} />
                          {c.color}
                        </span>
                      </td>
                      <td className="px-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => startEdit(c)} className="text-admin-muted hover:text-admin-ink" aria-label={t("admin.editCategory")}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => void remove(c.id)} className="text-red-500" aria-label={t("admin.deleteCategory")}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-[13px] text-admin-muted">
              {t("admin.showingCategories", { count: categories.length })}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-admin-ink">
              <PlusCircle size={18} className="text-admin-accent" /> {editingId ? t("admin.editCategory") : t("admin.quickAddCategory")}
            </h2>
            <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("admin.parentCategoryName")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("admin.categoryNamePlaceholder")} className="mb-4 h-11 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm outline-none" />
            <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("admin.identityColorChart")}</label>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-11 w-11 rounded-lg border border-[#E4E8F1]" style={{ background: color }} />
              <input value={color} onChange={(e) => setColor(e.target.value)} className="h-11 flex-1 rounded-lg border border-[#E4E8F1] px-3 text-sm outline-none" />
            </div>
            <button type="button" onClick={() => void saveCategory()} className="w-full rounded-xl bg-admin-accent py-3 text-sm font-semibold text-white">
              {t("admin.saveCategory")}
            </button>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(null); setName(""); setSubs(""); }} className="mt-2 w-full py-2 text-sm font-semibold text-admin-muted">
                {t("admin.cancel")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
