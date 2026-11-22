"use client";

import { useState, type FormEvent } from "react";
import { Loader2, PackagePlus, X } from "lucide-react";
import { api, type ProductRecord } from "@/lib/api";
import { refreshLiveProducts } from "@/hooks/useLiveProducts";
import { useLanguage } from "@/lib/i18n";

export default function StockTopUpModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductRecord;
  onClose: () => void;
  onSaved: (product: ProductRecord) => void;
}) {
  const { t } = useLanguage();
  const [delta, setDelta] = useState("10");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = Math.round(Number(delta));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("seller.stockTopUpInvalid"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { product: updated } = await api<{ product: ProductRecord }>(
        `/api/products/${product.id}/stock`,
        { method: "POST", body: JSON.stringify({ delta: amount }) }
      );
      refreshLiveProducts();
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
              <PackagePlus size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-seller-ink">{t("seller.stockTopUp")}</h2>
              <p className="mt-0.5 text-xs text-seller-muted">{t("seller.stockTopUpDesc")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("seller.close")} className="text-seller-muted hover:text-seller-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[#EEF1F6] bg-[#F8FAFC] p-3.5">
          <p className="truncate text-sm font-semibold text-seller-ink">{product.name}</p>
          <p className="mt-1 text-xs text-seller-muted">
            {t("seller.currentStock")}: <span className="font-semibold text-seller-ink">{product.stock}</span>
          </p>
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-seller-ink">{t("seller.amountToAdd")}</label>
        <input
          type="number"
          min="1"
          step="1"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-seller-ink outline-none focus:border-seller-navy/40"
          autoFocus
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {[10, 25, 50, 100].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setDelta(String(amount))}
              className="rounded-full bg-[#F1F4F8] px-3 py-1 text-xs font-semibold text-seller-ink hover:bg-[#E6EAF2]"
            >
              +{amount}
            </button>
          ))}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E4E8F1] px-4 py-2.5 text-sm font-semibold text-seller-ink"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-seller-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
            {saving ? t("auth.saving") : t("seller.addStock")}
          </button>
        </div>
      </form>
    </div>
  );
}
