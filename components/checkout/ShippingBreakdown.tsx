"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import type { ShippingBreakdown as Breakdown } from "@/lib/shipping";
import { useLanguage } from "@/lib/i18n";

export default function ShippingBreakdownPanel({
  breakdown,
  className = "",
  collapsible = false,
  hideTitle = false,
}: {
  breakdown?: Breakdown | null;
  className?: string;
  /** Halaman sukses: panel teknis dilipat secara default agar tidak mendominasi. */
  collapsible?: boolean;
  /** Label lipatan sudah menjadi judul, jadi judul dalam tidak diulang. */
  hideTitle?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;

  const body = (
    <>
      <p>{t(breakdown.formulaKey)}</p>

      {breakdown.mode !== "instant" ? (
        <>
          <div className="grid gap-1 sm:grid-cols-2">
            <p>
              {t("checkout.actualWeight")}:{" "}
              <span className="font-semibold text-navy-900">
                {t("checkout.kgValue", { value: breakdown.actualWeightKg })}
              </span>
            </p>
            <p>
              {t("checkout.volumetricWeight")}:{" "}
              <span className="font-semibold text-navy-900">
                {t("checkout.kgValue", { value: breakdown.volumetricWeightKg })}
              </span>
            </p>
          </div>
          <p>
            {t("checkout.chargeableWeight")}:{" "}
            <span className="font-semibold text-navy-900">
              {t("checkout.kgValue", { value: breakdown.chargeableWeightKg })}
            </span>
          </p>
          <p>
            {t("checkout.divisor")}: <span className="font-semibold text-navy-900">{breakdown.divisor}</span>
            {" · "}
            {t("checkout.ratePerKg")}:{" "}
            <span className="font-semibold text-navy-900">
              {t("checkout.rateValue", { value: breakdown.ratePerKg.toLocaleString("id-ID") })}
            </span>
          </p>
          {breakdown.mode === "cargo" ? (
            <p>
              {t("checkout.volume")}:{" "}
              <span className="font-semibold text-navy-900">
                {t("checkout.m3Value", { value: breakdown.volumeM3 })}
              </span>
              {" · "}
              {t("checkout.cbmRate")}:{" "}
              <span className="font-semibold text-navy-900">
                {t("checkout.rateValue", { value: breakdown.cbmRate.toLocaleString("id-ID") })}
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p>
            {t("checkout.distance")}:{" "}
            <span className="font-semibold text-navy-900">
              {t("checkout.kmValue", { value: breakdown.distanceKm })}
            </span>
          </p>
          <p>
            {t("checkout.instantBase")} + {t("checkout.instantPerKm")}:{" "}
            <span className="font-semibold text-navy-900">
              {breakdown.instantBase.toLocaleString("id-ID")} + {breakdown.instantPerKm.toLocaleString("id-ID")}
            </span>
          </p>
        </>
      )}

      <p>
        {t("checkout.zoneMultiplier")}:{" "}
        <span className="font-semibold text-navy-900">
          {t("checkout.multiplierValue", { value: breakdown.zoneMultiplier })}
        </span>
      </p>
    </>
  );

  if (collapsible) {
    return (
      <div className={`overflow-hidden rounded-xl border border-blue-100 bg-blue-50/60 ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-brand-blue hover:bg-blue-50"
        >
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> {t("checkout.shippingDetails")}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? (
          <div className="space-y-1.5 border-t border-blue-100 px-3 py-2.5 text-xs text-slate-600">{body}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 ${className}`}>
      {hideTitle ? null : (
        <p className="flex items-center gap-1.5 font-semibold text-brand-blue">
          <Info className="h-3.5 w-3.5" /> {t("checkout.shippingDetails")}
        </p>
      )}
      {body}
    </div>
  );
}
