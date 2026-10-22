"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import Pagination from "../components/Pagination";
import { api, type ProductRecord } from "@/lib/api";
import { useApiData, mutateApi } from "@/hooks/useApiData";

function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

function statusKey(status: ProductRecord["status"]) {
  if (status === "out_of_stock") return "seller.outOfStock";
  if (status === "draft") return "seller.draft";
  return "admin.active";
}

function StatusBadge({ status }: { status: ProductRecord["status"] }) {
  const { t } = useLanguage();
  const styles = {
    active: "bg-[#E8F0FE] text-[#2563EB]",
    out_of_stock: "bg-[#FDECEC] text-[#E11D48]",
    draft: "bg-[#EEF1F6] text-seller-muted",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{t(statusKey(status))}</span>;
}

export default function Products() {
  const [filter, setFilter] = useState("all");
  const { data, error: loadError } = useApiData<{ products: ProductRecord[] }>("/api/products");
  const products = data?.products ?? [];
  const [error, setError] = useState("");
  const router = useRouter();
  const { t } = useLanguage();

  async function load() {
    await mutateApi("/api/products");
  }

  const filtered = products.filter((p) => {
    if (filter === "active") return p.status === "active";
    if (filter === "out") return p.status === "out_of_stock";
    if (filter === "draft") return p.status === "draft";
    return true;
  });

  const filters = [
    { id: "all", labelKey: "all", count: products.length },
    { id: "active", labelKey: "admin.active", count: products.filter((p) => p.status === "active").length },
    { id: "out", labelKey: "seller.outOfStock", count: products.filter((p) => p.status === "out_of_stock").length },
    { id: "draft", labelKey: "seller.draft", count: products.filter((p) => p.status === "draft").length },
  ];

  async function remove(id: string) {
    if (!window.confirm(t("seller.confirmDeleteProduct"))) return;
    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <div className="px-8 pb-10 pt-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{t("seller.productManagement")}</h1>
            <p className="mt-1 text-sm text-seller-muted">{t("seller.manageProductsSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/seller/produk/tambahproduk")}
            className="flex items-center gap-2 rounded-xl bg-seller-navy px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} /> {t("seller.addProduct")}
          </button>
        </div>
        {error || loadError ? <p className="mb-4 text-sm text-red-600">{error || loadError?.message}</p> : null}

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id ? "bg-seller-navy text-white" : "bg-[#F1F4F8] text-seller-ink hover:bg-[#E6EAF2]"
                }`}
              >
                {t(f.labelKey)} ({f.count})
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#EEF1F6]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#F4F6FA] text-[13px] text-seller-ink">
                  <th className="px-4 py-3 font-semibold">{t("products")}</th>
                  <th className="px-4 py-3 font-semibold">{t("categories")}</th>
                  <th className="px-4 py-3 font-semibold">{t("seller.price")}</th>
                  <th className="px-4 py-3 font-semibold">{t("seller.stock")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-[#F1F4F8]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#EEF1F6] bg-[#F8FAFC]">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs text-seller-muted">-</span>
                          )}
                        </span>
                        <div>
                          <p className="font-semibold text-seller-ink">{p.name}</p>
                          <p className="text-xs text-seller-muted">SKU: {p.sku || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 text-seller-ink/80">{p.category}</td>
                    <td className="px-4 font-semibold text-seller-ink">{formatRupiah(p.price)}</td>
                    <td className={`px-4 ${p.stock === 0 ? "font-semibold text-[#E11D48]" : "text-seller-ink/80"}`}>{p.stock}</td>
                    <td className="px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => router.push(`/seller/produk/tambahproduk?id=${p.id}`)} className="text-seller-muted hover:text-seller-ink" aria-label={`${t("seller.edit")} ${p.name}`}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => void remove(p.id)} className="text-red-500" aria-label={t("seller.deleteProduct")}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination summary={`${t("seller.showing")} 1-${filtered.length} ${t("of")} ${filtered.length} ${t("seller.products")}`} />
        </div>
      </div>
    </div>
  );
}
