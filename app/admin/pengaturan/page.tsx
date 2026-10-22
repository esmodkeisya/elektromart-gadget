"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { api, ApiError } from "@/lib/api";
import { useApiData, mutateApi } from "@/hooks/useApiData";
import {
  HELP_PAGES,
  defaultHelpPage,
  mergeHelpPage,
  type HelpPageData,
  type Locale,
} from "@/lib/helpPages";

const EMPTY_PAGE: HelpPageData = {
  title: { id: "", en: "" },
  subtitle: { id: "", en: "" },
  items: [],
};

export default function AdminPengaturan() {
  const { t } = useLanguage();
  const [activeSlug, setActiveSlug] = useState(HELP_PAGES[0].slug);
  const [editLang, setEditLang] = useState<Locale>("id");
  const { data: pageRes, isValidating, mutate } = useApiData<{ data: HelpPageData } | null>(
    `/api/help-pages/${activeSlug}`
  );
  const [data, setData] = useState<HelpPageData>(
    () => defaultHelpPage(HELP_PAGES[0].slug) ?? EMPTY_PAGE
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const loading = isValidating && !pageRes;

  useEffect(() => {
    const fallback = defaultHelpPage(activeSlug) ?? EMPTY_PAGE;
    setData(mergeHelpPage(fallback, pageRes?.data));
  }, [activeSlug, pageRes]);

  async function load(slug: string) {
    await mutate();
  }

  function updateLocalized(field: "title" | "subtitle", value: string) {
    setData((prev) => ({ ...prev, [field]: { ...prev[field], [editLang]: value } }));
  }

  function updateItem(index: number, key: "heading" | "body", value: string) {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [key]: { ...item[key], [editLang]: value } } : item
      ),
    }));
  }

  function addItem() {
    setData((prev) => ({
      ...prev,
      items: [...prev.items, { heading: { id: "", en: "" }, body: { id: "", en: "" } }],
    }));
  }

  function removeItem(index: number) {
    setData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api<{ data: HelpPageData }>(`/api/help-pages/${activeSlug}`, {
        method: "PUT",
        body: JSON.stringify({ data }),
      });
      setData(mergeHelpPage(defaultHelpPage(activeSlug), saved?.data));
      mutateApi(`/api/help-pages/${activeSlug}`);
      setMessage({ type: "ok", text: t("admin.helpSaved") });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : t("admin.helpSaveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-admin-canvas">
      <TopBar placeholder={t("admin.searchDataProducts")} />
      <div className="px-8 pb-10 pt-7">
        <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.platformSettings")}</h1>
        <p className="mt-1 text-sm text-admin-muted">{t("admin.settingsSubtitle")}</p>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-admin-ink">{t("admin.cmsPolicySecurity")}</h2>
          <p className="mb-4 text-sm text-admin-muted">{t("admin.cmsSubtitle")}</p>
          <div className="grid grid-cols-1 gap-5 rounded-2xl bg-white p-5 shadow-card xl:grid-cols-3">
            <div className="space-y-2">
              {HELP_PAGES.map((page) => (
                <button
                  key={page.slug}
                  type="button"
                  onClick={() => setActiveSlug(page.slug)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium ${
                    activeSlug === page.slug ? "bg-[#E8F0FE] text-admin-navy" : "text-admin-ink hover:bg-[#F4F6FA]"
                  }`}
                >
                  {t(page.labelKey)}
                  {activeSlug === page.slug ? <ArrowRight size={14} /> : null}
                </button>
              ))}
            </div>

            <div className="xl:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="mr-2 text-sm font-semibold text-admin-ink">{t("admin.editLanguage")}:</span>
                  <div className="mt-1 inline-flex rounded-lg border border-[#E4E8F1] p-0.5">
                    {(["id", "en"] as Locale[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setEditLang(lang)}
                        className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${
                          editLang === lang ? "bg-admin-navy text-white" : "text-admin-muted"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                {loading ? (
                  <span className="text-xs text-admin-muted">{t("admin.loading")}</span>
                ) : null}
              </div>

              <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("admin.pageTitle")}</label>
              <input
                value={data.title[editLang]}
                onChange={(e) => updateLocalized("title", e.target.value)}
                className="mb-4 h-11 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm outline-none"
              />

              <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("admin.subtitle")}</label>
              <input
                value={data.subtitle[editLang]}
                onChange={(e) => updateLocalized("subtitle", e.target.value)}
                className="mb-6 h-11 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm outline-none"
              />

              <div className="space-y-4">
                {data.items.map((item, index) => (
                  <div key={index} className="rounded-xl border border-[#E4E8F1] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-admin-muted">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                        {t("admin.removeItem")}
                      </button>
                    </div>
                    <label className="mb-1.5 block text-xs font-semibold text-admin-muted">
                      {t("admin.itemHeading")}
                    </label>
                    <input
                      value={item.heading[editLang]}
                      onChange={(e) => updateItem(index, "heading", e.target.value)}
                      className="mb-3 h-10 w-full rounded-lg border border-[#E4E8F1] px-3 text-sm outline-none"
                    />
                    <label className="mb-1.5 block text-xs font-semibold text-admin-muted">
                      {t("admin.itemBody")}
                    </label>
                    <textarea
                      value={item.body[editLang]}
                      onChange={(e) => updateItem(index, "body", e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-[#E4E8F1] px-3 py-2 text-sm leading-6 outline-none"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#C7D0E4] px-4 py-2.5 text-sm font-semibold text-admin-navy hover:bg-[#F4F6FA]"
              >
                <Plus size={16} />
                {t("admin.addItem")}
              </button>

              {message ? (
                <p
                  className={`mt-4 text-sm font-medium ${
                    message.type === "ok" ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {message.text}
                </p>
              ) : null}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => void load(activeSlug)}
                  className="rounded-xl border border-[#E4E8F1] px-4 py-2.5 text-sm font-semibold text-admin-ink"
                >
                  {t("admin.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || loading}
                  className="rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {t("admin.saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
