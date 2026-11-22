"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { api, type CategoryRecord, type ProductRecord } from "@/lib/api";
import { refreshLiveProducts } from "@/hooks/useLiveProducts";
import { supabase } from "@/lib/supabase";

const EXTRA_SLOTS = 3;

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9]/g, ""));
}

export default function AddProduct() {
  const router = useRouter();
  const { t } = useLanguage();
  const [productId, setProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [lengthCm, setLengthCm] = useState("20");
  const [widthCm, setWidthCm] = useState("15");
  const [heightCm, setHeightCm] = useState("10");
  const [sku, setSku] = useState("");
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<(string | null)[]>(Array(EXTRA_SLOTS).fill(null));
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    void api<{ categories: CategoryRecord[] }>("/api/categories")
      .then((data) => setCategories(data.categories || []))
      .catch((err) => setError(err instanceof Error ? err.message : t("api.unavailable")));

    if (id) {
      setProductId(id);
      void api<{ products: ProductRecord[] }>("/api/products")
        .then((data) => {
          const item = data.products.find((p) => p.id === id);
          if (!item) return;
          setName(item.name);
          setCategory(item.category || "");
          setDescription(item.description || "");
          setPrice(String(item.price || ""));
          setStock(String(item.stock || ""));
          setWeightKg(String(item.weight_kg || 1));
          setLengthCm(String(item.length_cm || 20));
          setWidthCm(String(item.width_cm || 15));
          setHeightCm(String(item.height_cm || 10));
          setSku(item.sku || "");
          setMainImage(item.image_url);
          const rest = (item.images ?? []).slice(1);
          setExtraImages(Array.from({ length: EXTRA_SLOTS }, (_, i) => rest[i] ?? null));
        })
        .catch((err) => setError(err instanceof Error ? err.message : t("api.unavailable")));
    }
  }, [t]);

  async function uploadPhoto(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ukuran gambar maksimal 5MB.");
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${userId}/product-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      throw new Error(`${t("seller.imageUploadFailed")} (${uploadError.message})`);
    }
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onMainFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setMainImage(await uploadPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setUploading(false);
    }
  }

  async function onExtraFile(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadPhoto(file);
      setExtraImages((current) => current.map((v, i) => (i === index ? url : v)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setUploading(false);
    }
  }

  function applyMainUrl() {
    const value = urlDraft.trim();
    if (!value) return;
    if (!/^https?:\/\/.+/i.test(value)) {
      setError(t("seller.imageInvalid"));
      return;
    }
    setMainImage(value);
    setUrlDraft("");
    setError("");
  }

  async function handleSave() {
    const numericPrice = parseAmount(price);
    const numericStock = parseAmount(stock);
    if (!name.trim() || !price || !Number.isFinite(numericPrice) || numericPrice <= 0 || stock === "") {
      setError(t("seller.fillRequired"));
      return;
    }
    setSaving(true);
    setError("");
    const images = [mainImage, ...extraImages].filter((v): v is string => Boolean(v));
    const payload = {
      name: name.trim(),
      category,
      description,
      price: numericPrice,
      stock: numericStock,
      weight_kg: Number(weightKg) || 1,
      length_cm: Number(lengthCm) || 20,
      width_cm: Number(widthCm) || 15,
      height_cm: Number(heightCm) || 10,
      sku,
      image_url: mainImage || null,
      images,
    };
    try {
      if (productId) {
        await api(`/api/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      }
      refreshLiveProducts();
      router.push("/seller/produk");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-seller-ink placeholder:text-seller-muted outline-none focus:border-seller-navy/40";

  const dashedBox =
    "relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-[#D6DCE8] bg-[#F8FAFC]";

  return (
    <div className="flex-1 overflow-y-auto bg-seller-canvas">
      <div className="flex items-center justify-between px-8 pb-6 pt-8">
        <h1 className="text-[28px] font-bold tracking-tight text-seller-ink">{productId ? t("seller.editProduct") : t("seller.addNewProduct")}</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/seller/produk")}
            className="rounded-xl border border-[#E4E8F1] bg-white px-5 py-2.5 text-sm font-semibold text-seller-ink"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-seller-navy px-5 py-2.5 text-sm font-semibold text-white"
          >
            {saving ? t("auth.saving") : t("seller.saveProduct")}
          </button>
        </div>
      </div>

      {error ? <p className="px-8 pb-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-5 px-8 pb-10 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="text-lg font-bold text-seller-ink">{t("admin.basicInfo")}</h2>
            <p className="mb-5 mt-1 text-sm text-seller-muted">{t("seller.productInfoSubtitle")}</p>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-seller-ink">
                {t("seller.productName")} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("seller.productNamePlaceholder")}
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-seller-muted">
                {t("seller.productNameHint")}
              </p>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-seller-ink">
                {t("seller.productCategory")} <span className="text-[#EF4444]">*</span>
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${fieldClass} text-seller-muted`}>
                <option value="">{t("seller.selectCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value="Laptop">{t("seller.categoryLaptop")}</option>
                <option value="Smartphone">{t("seller.categorySmartphone")}</option>
                <option value="Audio">{t("seller.categoryAudio")}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-seller-ink">
                {t("seller.description")} <span className="text-[#EF4444]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("seller.descriptionPlaceholder")}
                rows={6}
                className={`${fieldClass} resize-none`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="text-lg font-bold text-seller-ink">{t("seller.priceStock")}</h2>
            <p className="mb-5 mt-1 text-sm text-seller-muted">{t("seller.priceStockSubtitle")}</p>

            <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-seller-ink">
                  {t("seller.salePrice")} <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Rp 0"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-seller-ink">
                  {t("seller.availableStock")} <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-[#EEF1F6] bg-[#F8FAFC] p-4">
              <p className="mb-1 text-sm font-semibold text-seller-ink">{t("seller.shippingDimensions")}</p>
              <p className="mb-4 text-xs text-seller-muted">{t("seller.shippingDimensionsHint")}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-seller-ink">{t("seller.weightKg")}</label>
                  <input type="number" min="0.1" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-seller-ink">{t("seller.lengthCm")}</label>
                  <input type="number" min="1" step="1" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-seller-ink">{t("seller.widthCm")}</label>
                  <input type="number" min="1" step="1" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-seller-ink">{t("seller.heightCm")}</label>
                  <input type="number" min="1" step="1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={fieldClass} />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-seller-ink">{t("seller.sku")}</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t("seller.skuPlaceholder")}
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-seller-muted">{t("seller.skuHint")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="text-lg font-bold text-seller-ink">{t("seller.productPhotos")}</h2>
          <p className="mb-5 mt-1 text-sm text-seller-muted">{t("seller.photoFormatHint")}</p>

          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-seller-ink">{t("seller.mainPhotoRequired")}</p>
            <div className={dashedBox}>
              {mainImage ? (
                <>
                  <img src={mainImage} alt="Foto utama" className="h-full w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <label
                      htmlFor="main-photo-input"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-seller-ink shadow hover:bg-white"
                      title={t("seller.changePhoto")}
                    >
                      <RefreshCw size={14} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setMainImage(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow hover:bg-white"
                      title={t("seller.removePhoto")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <label
                  htmlFor="main-photo-input"
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-seller-muted"
                >
                  <ImagePlus size={28} />
                  <span className="max-w-[200px] text-center text-sm font-medium text-seller-ink/70">
                    {uploading ? t("auth.saving") : t("seller.uploadDropHint")}
                  </span>
                </label>
              )}
            </div>
            <input
              id="main-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onMainFile}
            />

            <div className="mt-3 flex gap-2">
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder={t("seller.imageUrlPlaceholder")}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={applyMainUrl}
                className="shrink-0 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-seller-ink hover:bg-slate-50"
              >
                {t("seller.applyUrl")}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-seller-muted">{t("seller.imageUrl")}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-seller-ink">
              {t("seller.additionalPhotos")} <span className="font-normal text-seller-muted">{t("seller.optional")}</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              {extraImages.map((value, i) => (
                <div key={i} className={dashedBox}>
                  {value ? (
                    <>
                      <img src={value} alt={`Foto tambahan ${i + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute right-1 top-1 flex gap-1">
                        <label
                          htmlFor={`extra-photo-input-${i}`}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/90 text-seller-ink shadow hover:bg-white"
                          title={t("seller.changePhoto")}
                        >
                          <RefreshCw size={12} />
                        </label>
                        <button
                          type="button"
                          onClick={() => setExtraImages((cur) => cur.map((v, j) => (j === i ? null : v)))}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-500 shadow hover:bg-white"
                          title={t("seller.removePhoto")}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label
                      htmlFor={`extra-photo-input-${i}`}
                      className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-seller-muted"
                    >
                      <Plus size={18} />
                    </label>
                  )}
                  <input
                    id={`extra-photo-input-${i}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void onExtraFile(i, e)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}