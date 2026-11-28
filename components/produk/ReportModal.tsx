"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, X, CheckCircle2, Loader2 } from "lucide-react";
import { localAuth } from "@/lib/localAuth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

type ReportProduct = {
  id: string;
  name: string;
  image?: string;
  sellerId?: string;
};

const REASONS = [
  "report.reasonCategory",
  "report.reasonFake",
  "report.reasonScam",
  "report.reasonProhibited",
  "report.reasonOther",
] as const;

export default function ReportModal({
  product,
  onClose,
}: {
  product: ReportProduct;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    void localAuth.auth.getSession().then(({ data }) => {
      if (mounted) setLoggedIn(Boolean(data.session));
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!reason) {
      setErrorMsg(t("report.reasonPlaceholder"));
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          product_id: product.id,
          seller_id: product.sellerId || null,
          product_name: product.name,
          product_image: product.image || null,
          reason,
          description: description.trim() || null,
        }),
      });
      setDone(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("report.title")}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <Flag className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-navy-900">{t("report.title")}</h2>
              <p className="text-xs text-slate-500">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("report.close")}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loggedIn === null ? (
          <p className="mt-5 text-sm text-slate-400">…</p>
        ) : loggedIn === false ? (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center">
            <p className="text-sm text-amber-800">{t("report.loginRequired")}</p>
            <Link
              href="/login"
              onClick={onClose}
              className="mt-3 inline-block rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              {t("login")}
            </Link>
          </div>
        ) : done ? (
          <div className="mt-6 flex flex-col items-center rounded-xl bg-emerald-50 px-4 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-sm font-medium text-emerald-800">{t("report.success")}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              {t("report.close")}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-500">{t("report.subtitle")}</p>

            <div className="mt-4 space-y-2">
              {REASONS.map((key) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                    reason === key
                      ? "border-red-400 bg-red-50/60 text-red-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={key}
                    checked={reason === key}
                    onChange={() => setReason(key)}
                    className="h-4 w-4 accent-red-500"
                  />
                  {t(key)}
                </label>
              ))}
            </div>

            <label className="mt-4 block text-sm font-semibold text-navy-900">
              {t("report.descriptionLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("report.descriptionPlaceholder")}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />

            {errorMsg ? <p className="mt-2 text-xs text-red-600">{errorMsg}</p> : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {t("report.submit")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}