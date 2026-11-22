"use client";

import { Info } from "lucide-react";
import type { ShippingBreakdown as Breakdown } from "@/lib/shipping";
import { useLanguage } from "@/lib/i18n";

export default function ShippingBreakdownPanel({
  breakdown,
  className = "",
}: {
  breakdown?: Breakdown | null;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!breakdown) return null;

  return (
    <div className={`space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 ${className}`}>
      <p className="flex items-center gap-1.5 font-semibold text-brand-blue">
        <Info className="h-3.5 w-3.5" /> {t("checkout.shippingDetails")}
      </p>
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
    </div>
  );
}
