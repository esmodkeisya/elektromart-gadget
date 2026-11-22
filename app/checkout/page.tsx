"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Truck,
  Landmark,
  Wallet,
  QrCode,
  Clock,
  Package,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart, type CheckoutDetail } from "@/lib/CartContext";
import { formatRupiah } from "@/lib/data";
import { api, PROVINCES, type OrderRecord, type ShippingAddress } from "@/lib/api";
import {
  SHIPPING_SERVICES,
  quoteShipping,
  type PackingType,
  type ShippingQuoteItem,
  type ShippingService,
} from "@/lib/shipping";
import ShippingBreakdownPanel from "@/components/checkout/ShippingBreakdown";
import { useLanguage } from "@/lib/i18n";

type Courier = {
  name: string;
  eta: string;
  price: number;
  logo: string;
  badgeKey: string | null;
  formulaKey: string;
  mode: ShippingService["mode"];
};

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { items, subtotal, setCheckoutDetail } = useCart();
  const paymentGroups = [
    {
      group: "bank" as const,
      title: t("checkout.bankTransfer"),
      note: t("checkout.bankNote"),
      icon: Landmark,
      methods: [
        { name: "BCA Virtual Account", short: "BCA", logo: "/logos/bca.svg", badgeKey: null },
        { name: "BNI Virtual Account", short: "BNI", logo: "/logos/bni.svg", badgeKey: null },
        { name: "BRI Virtual Account", short: "BRI", logo: "/logos/bri.svg", badgeKey: null },
        { name: "Mandiri Virtual Account", short: "Mandiri", logo: "/logos/mandiri.svg", badgeKey: null },
      ],
    },
    {
      group: "ewallet" as const,
      title: t("checkout.ewallet"),
      note: t("checkout.ewalletNote"),
      icon: Wallet,
      methods: [
        { name: "DANA", short: "DANA", logo: "/logos/dana.svg", badgeKey: null },
        { name: "GoPay", short: "GoPay", logo: "/logos/gopay.png", badgeKey: null },
        { name: "OVO", short: "OVO", logo: "/logos/ovo.svg", badgeKey: null },
      ],
    },
    {
      group: "qris" as const,
      title: "QRIS",
      note: t("checkout.qrisNote"),
      icon: QrCode,
      methods: [{ name: "QRIS", short: "QRIS", logo: "/logos/qris.svg", badgeKey: "checkout.badgePopular" }],
    },
  ];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Jawa Timur");
  const [postal, setPostal] = useState("");
  const [currentLocation, setCurrentLocation] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedCourierName, setSelectedCourierName] = useState<string>(SHIPPING_SERVICES[0].name);
  const [insuranceSelected, setInsuranceSelected] = useState(true);
  const [packingType, setPackingType] = useState<PackingType>("none");
  const [distanceKm, setDistanceKm] = useState("10");
  const [paymentGroup, setPaymentGroup] = useState<"bank" | "ewallet" | "qris">("bank");
  const [selectedMethod, setSelectedMethod] = useState<string>("BCA Virtual Account");

  const [checked, setChecked] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);

  useEffect(() => {
    void api<{ addresses: ShippingAddress[] }>("/api/addresses")
      .then((data) => {
        const list = data.addresses || [];
        setSavedAddresses(list);
        const primary = list.find((a) => a.is_default) || list[0];
        if (primary) {
          setName(primary.recipient);
          setPhone(primary.phone || "");
          setAddress(primary.address);
          setCity(primary.city);
          setProvince(primary.province);
          setPostal(primary.postal || "");
        }
      })
      .catch(() => undefined);
  }, []);

  const quoteItems = useMemo<ShippingQuoteItem[]>(
    () =>
      items.map((item) => ({
        qty: item.qty,
        price: item.price,
        weightKg: item.weightKg || 1,
        lengthCm: item.lengthCm || 20,
        widthCm: item.widthCm || 15,
        heightCm: item.heightCm || 10,
      })),
    [items]
  );

  const etaKeyFor = (service: ShippingService) => {
    if (service.mode === "instant") return "checkout.etaToday";
    if (service.mode === "cargo") return "checkout.etaCargo";
    if (service.name === "SiCepat REG") return "checkout.etaFast";
    if (service.name === "DHL Express" || service.name === "FedEx International") return "checkout.etaInternational";
    return "checkout.etaDays";
  };

  const couriers: Courier[] = useMemo(
    () =>
      SHIPPING_SERVICES.map((service) => ({
        name: service.name,
        eta: t(etaKeyFor(service)),
        price: quoteShipping({
          service: service.name,
          province,
          items: quoteItems,
          insuranceEnabled: false,
          packingType: "none",
        }).baseFee,
        logo: service.logo,
        badgeKey: service.badge ? t(service.badge) : null,
        formulaKey: service.formulaKey,
        mode: service.mode,
      })),
    [province, quoteItems, t]
  );

  const selectedCourier = useMemo(
    () => couriers.find((courier) => courier.name === selectedCourierName) ?? couriers[0],
    [couriers, selectedCourierName]
  );

  const quote = useMemo(
    () =>
      quoteShipping({
        service: selectedCourierName,
        province,
        items: quoteItems,
        insuranceEnabled: insuranceSelected,
        packingType,
        distanceKm: Number(distanceKm) || 0,
      }),
    [selectedCourierName, province, quoteItems, insuranceSelected, packingType, distanceKm]
  );

  const zone = quote.zone;
  const shippingFee = quote.baseFee;
  const insuranceFee = quote.insuranceFee;
  const packingFee = quote.packingFee;
  const total = subtotal + shippingFee + insuranceFee + packingFee;

  const activePayment =
    paymentGroups
      .find((g) => g.group === paymentGroup)
      ?.methods.find((m) => m.name === selectedMethod) ??
    paymentGroups[0].methods[0];

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col">
        <Navbar />
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-navy-900">{t("checkout.emptyCartTitle")}</h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            {t("checkout.emptyCartDesc")}
          </p>
          <Link
            href="/kategori/semua"
            className="mt-8 rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("cart.startShopping")}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Guard against double submit (double click / Enter) creating two orders.
    if (submittingRef.current) return;
    setError("");

    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setError(t("checkout.errorAddress"));
      return;
    }
    if (!selectedCourier) {
      setError(t("checkout.errorCourier"));
      return;
    }
    if (!checked) {
      setError(t("checkout.errorPayment"));
      return;
    }
    if (!agree) {
      setError(t("checkout.errorAgree"));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { order } = await api<{ order: OrderRecord }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.id,
            product_name: i.name,
            product_image: i.image,
            qty: i.qty,
          })),
          courier: selectedCourier.name,
          insurance_selected: insuranceSelected,
          packing_type: packingType,
          distance_km: Number(distanceKm) || 0,
          payment_method: activePayment.name,
          payment_group: paymentGroup,
          address: {
            recipient: name,
            phone,
            address,
            city,
            province,
            postal,
          },
        }),
      });

      const detail: CheckoutDetail = {
        orderId: order.order_number,
        orderDbId: order.id,
        items,
        subtotal: Number(order.subtotal || subtotal),
        shippingFee: Number(order.shipping_fee || shippingFee),
        insuranceFee: Number(order.insurance_fee || insuranceFee),
        total: Number(order.total || total),
        paymentMethod: activePayment.name,
        paymentGroup,
        courier: selectedCourier.name,
        address: `${address}, ${city}, ${province} ${postal}`,
        city,
        shippingZone: order.shipping_zone || zone.code,
        shippingRegion: order.shipping_region || zone.island,
        packingType: order.packing_type || packingType,
        packingFee: Number(order.packing_fee || packingFee),
        distanceKm: Number(order.distance_km ?? distanceKm),
        insuranceSelected: order.insurance_selected ?? insuranceSelected,
        shippingBreakdown: order.shipping_breakdown || quote,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        status: "MENUNGGU PEMBAYARAN",
      };

      setCheckoutDetail(detail);
      router.push("/pembayaran");
    } catch (err) {
      submittingRef.current = false;
      setError(err instanceof Error ? err.message : t("checkout.errorCreateOrder"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm">
          <StepDone label={t("checkout.stepCart")} />
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <StepActive label={t("checkout.stepCheckout")} current={2} total={3} />
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <StepPending label={t("checkout.stepPayment")} />
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <StepPending label={t("checkout.stepDone")} />
        </div>

        <h1 className="mt-4 text-2xl font-bold text-navy-900">{t("checkout.stepCheckout")}</h1>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            {/* 1. Shipping address */}
            <section className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <header className="flex items-center gap-2 border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <MapPin className="h-4 w-4 text-brand-blue" />
                <h2 className="text-sm font-semibold text-navy-900">{t("checkout.shippingAddress")}</h2>
              </header>
              <div className="p-5">
                {savedAddresses.length > 0 ? (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium text-slate-600">{t("checkout.savedAddresses")}</p>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setName(addr.recipient);
                            setPhone(addr.phone || "");
                            setAddress(addr.address);
                            setCity(addr.city);
                            setProvince(addr.province);
                            setPostal(addr.postal || "");
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:border-brand-blue"
                        >
                          {addr.recipient} · {addr.city}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("checkout.recipientName")}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("checkout.fullNamePlaceholder")}
                      className="input-em"
                    />
                  </Field>
                  <Field label={t("checkout.phoneLabel")}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="input-em"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t("profile.fullAddress")}>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t("profile.fullAddressPlaceholder")}
                        rows={2}
                        className="input-em resize-none"
                      />
                    </Field>
                  </div>
                  <Field label={t("profile.city")}>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t("profile.cityPlaceholder")}
                      className="input-em"
                    />
                  </Field>
                  <Field label={t("profile.province")}>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="input-em"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("profile.postalCode")}>
                    <input
                      type="text"
                      value={postal}
                      onChange={(e) => setPostal(e.target.value)}
                      placeholder="00000"
                      className="input-em"
                    />
                  </Field>
                  <Field label={t("checkout.courierNotes")}>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("checkout.courierNotesPlaceholder")}
                      className="input-em"
                    />
                  </Field>
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-blue"
                  />
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-brand-blue" /> {t("checkout.useCurrentLocation")}
                  </span>
                </label>
              </div>
            </section>

            {/* 2. Shipping service */}
            <section className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <header className="flex items-center gap-2 border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <Truck className="h-4 w-4 text-brand-blue" />
                <h2 className="text-sm font-semibold text-navy-900">{t("checkout.shippingService")}</h2>
              </header>
              <div className="p-5">
                <div
                  className={`mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${
                    zone.isJava ? "bg-blue-50 text-brand-blue" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {zone.isJava
                      ? t("checkout.shippingZoneJava")
                      : t("checkout.shippingZoneOutside", { island: zone.island })}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {couriers.map((courier) => {
                    const active = selectedCourier?.name === courier.name;
                    return (
                      <button
                        key={courier.name}
                        type="button"
                        onClick={() => setSelectedCourierName(courier.name)}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                          active
                            ? "border-brand-blue bg-blue-50/60 ring-1 ring-brand-blue"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border bg-white p-1 ${
                            active ? "border-brand-blue/40" : "border-slate-200"
                          }`}
                        >
                          {courier.logo ? (
                            <img src={courier.logo} alt={courier.name} className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-bold tracking-wide text-slate-500">
                              {courier.name.slice(0, 3).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-navy-900">
                            {courier.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" /> {courier.eta}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                            {t(courier.formulaKey)}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <span className="flex items-center gap-1">
                            <span className="text-sm font-bold text-navy-900">
                              {formatRupiah(courier.price)}
                            </span>
                            {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-blue" />}
                          </span>
                          {courier.badgeKey && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700">
                              {courier.badgeKey}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <label className="flex items-start gap-2.5 text-sm text-navy-900">
                      <input
                        type="checkbox"
                        checked={insuranceSelected}
                        onChange={(e) => setInsuranceSelected(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-blue"
                      />
                      <span>
                        <span className="flex items-center gap-1.5 font-semibold">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" /> {t("checkout.insurance")}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{t("checkout.insuranceHint")}</span>
                      </span>
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <label className="mb-1.5 block text-xs font-semibold text-navy-900">
                      {t("checkout.packing")}
                    </label>
                    <select
                      value={packingType}
                      onChange={(e) => setPackingType(e.target.value as PackingType)}
                      className="input-em"
                    >
                      <option value="none">{t("checkout.packingNone")}</option>
                      <option value="bubble">{t("checkout.packingBubble")}</option>
                      <option value="wood">{t("checkout.packingWood")}</option>
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">{t("checkout.packingHint")}</p>
                  </div>

                  {selectedCourier?.mode === "instant" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-amber-900">
                        {t("checkout.distance")}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={distanceKm}
                          onChange={(e) => setDistanceKm(e.target.value)}
                          className="input-em max-w-40"
                        />
                        <span className="text-xs text-amber-800">{t("checkout.kmValue", { value: "" }).trim()}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-amber-700">{t("checkout.distanceHint")}</p>
                    </div>
                  ) : null}
                </div>

                <ShippingBreakdownPanel breakdown={quote} className="mt-4" />
              </div>
            </section>

            {/* 3. Payment method */}
            <section className="rounded-2xl border border-slate-100 bg-white shadow-card">
              <header className="flex items-center gap-2 border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <CreditCard className="h-4 w-4 text-brand-blue" />
                <h2 className="text-sm font-semibold text-navy-900">{t("checkout.paymentMethod")}</h2>
              </header>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {paymentGroups.map((g) => {
                    const GroupIcon = g.icon;
                    const active = paymentGroup === g.group;
                    return (
                      <button
                        key={g.group}
                        type="button"
                        onClick={() => {
                          setPaymentGroup(g.group);
                          setSelectedMethod(g.methods[0].name);
                          setChecked(false);
                        }}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-brand-blue text-white"
                            : "bg-[#F4F6FA] text-navy-900 hover:bg-slate-200"
                        }`}
                      >
                        <GroupIcon className="h-4 w-4" />
                        {g.title}
                      </button>
                    );
                  })}
                </div>

                {/* Method list */}
                <div className="mt-4 space-y-2.5">
                  {paymentGroups
                    .find((g) => g.group === paymentGroup)
                    ?.methods.map((m) => {
                      const active = selectedMethod === m.name && checked;
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => {
                            setSelectedMethod(m.name);
                            setChecked(true);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                            active
                              ? "border-brand-blue bg-blue-50/60 ring-1 ring-brand-blue"
                              : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <span
                            className={`flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border bg-white p-1.5 ${
                              active ? "border-brand-blue/40" : "border-slate-200"
                            }`}
                          >
                            <img src={m.logo} alt={m.name} className="h-full w-full object-contain" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-navy-900">
                              {m.name}
                            </span>
                            <span
                              className={`block text-[11px] ${
                                m.badgeKey ? "text-amber-700" : "text-slate-400"
                              }`}
                            >
                              {m.badgeKey
                                ? m.badgeKey
                                : paymentGroups.find((g) => g.group === paymentGroup)?.title}
                            </span>
                          </span>
                          {checked && selectedMethod === m.name && (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-blue" />
                          )}
                        </button>
                      );
                    })}
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {paymentGroups.find((g) => g.group === paymentGroup)?.note}
                </p>
              </div>
            </section>

            {/* 4. Persetujuan */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <label className="flex items-start gap-3 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-blue"
                />
                <span>
                  {t("checkout.agreeText")}
                </span>
              </label>
            </section>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Ringkasan pesanan */}
          <div>
            <div className="sticky top-20 rounded-2xl border border-slate-100 bg-white shadow-card">
              <div className="border-b border-slate-100 bg-[#F4F6FA] px-5 py-3">
                <p className="text-sm font-semibold text-navy-900">{t("checkout.orderSummary")}</p>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 px-5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className="relative shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-lg border border-slate-100 object-cover"
                      />
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-800 px-1 text-[10px] font-bold text-white">
                        {item.qty}
                      </span>
                    </div>
                    <p className="line-clamp-2 flex-1 text-xs font-medium text-navy-900">
                      {item.name}
                    </p>
                    <p className="text-xs font-semibold text-navy-900">
                      {formatRupiah(item.price * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 px-5 pt-4 text-sm">
                <SummaryRow label={t("pay.subtotal")} value={formatRupiah(subtotal)} />
                <SummaryRow
                  label={t("checkout.insurance")}
                  value={insuranceSelected ? formatRupiah(insuranceFee) : "-"}
                />
                <SummaryRow
                  label={t("cart.shipping")}
                  value={selectedCourier ? formatRupiah(shippingFee) : <span className="text-slate-300">-</span>}
                />
                <SummaryRow
                  label={t("checkout.packing")}
                  value={packingFee > 0 ? formatRupiah(packingFee) : "-"}
                />
                <div className="mt-3 flex items-start justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{t("checkout.billTotal")}</p>
                    <p className="text-xs text-slate-400">{t("checkout.includesService")}</p>
                  </div>
                  <p className="text-xl font-bold text-brand-blue">{formatRupiah(total)}</p>
                </div>
              </div>

              <div className="p-5 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? t("checkout.creating") : t("checkout.createOrder")} <ChevronRight className="h-4 w-4" />
                </button>
                <Link
                  href="/keranjang"
                  className="mt-3 block text-center text-xs font-medium text-slate-400 hover:text-brand-blue"
                >
                  &larr; {t("checkout.backToCart")}
                </Link>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> {t("checkout.payIn24h")}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <Package className="h-3.5 w-3.5" /> {t("checkout.shipFromJakarta")}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-10">
        <Footer />
      </div>

      <style jsx>{`
        .input-em {
          width: 100%;
          border-radius: 0.625rem;
          border: 1px solid #e2e8f0;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #0a1c47;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-em:focus {
          border-color: #1a3fd6;
          box-shadow: 0 0 0 3px rgba(26, 63, 214, 0.12);
        }
        .input-em::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-xs font-medium text-navy-900 sm:text-sm">{value}</span>
    </div>
  );
}

function StepDone({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-blue">
      <CheckCircle2 className="h-4 w-4" /> {label}
    </span>
  );
}

function StepActive({ label, current, total }: { label: string; current: number; total: number }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
        {current}
      </span>
      {label}
      <span className="text-xs font-normal text-slate-400">/{total}</span>
    </span>
  );
}

function StepPending({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-slate-400">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
        ·
      </span>
      {label}
    </span>
  );
}