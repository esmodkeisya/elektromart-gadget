/* ------------------------------------------------------------------ */
/* Perhitungan ongkir ElektroMart                                     */
/* Dipakai backend sebagai sumber kebenaran saat membuat pesanan.     */
/* ------------------------------------------------------------------ */

const JAVA_PROVINCES = new Set([
  "jawa timur",
  "jawa barat",
  "jawa tengah",
  "dki jakarta",
  "jakarta",
  "banten",
  "di yogyakarta",
  "yogyakarta",
]);

const ISLAND_GROUPS = [
  { code: "bali", island: "Bali", multiplier: 1.5, provinces: ["bali"] },
  {
    code: "sumatera",
    island: "Sumatera",
    multiplier: 1.7,
    provinces: ["sumatera utara", "sumatera barat", "sumatera selatan", "riau", "kepulauan riau", "jambi", "bengkulu", "lampung", "aceh", "kepulauan bangka belitung"],
  },
  {
    code: "kalimantan",
    island: "Kalimantan",
    multiplier: 1.85,
    provinces: ["kalimantan timur", "kalimantan barat", "kalimantan selatan", "kalimantan tengah", "kalimantan utara"],
  },
  {
    code: "sulawesi",
    island: "Sulawesi",
    multiplier: 1.95,
    provinces: ["sulawesi selatan", "sulawesi utara", "sulawesi tengah", "sulawesi tenggara", "sulawesi barat", "gorontalo"],
  },
  { code: "maluku", island: "Maluku", multiplier: 2.1, provinces: ["maluku", "maluku utara"] },
  {
    code: "papua",
    island: "Papua",
    multiplier: 2.3,
    provinces: ["papua", "papua barat", "papua tengah", "papua pegunungan", "papua selatan", "papua barat daya"],
  },
  {
    code: "nusa_tenggara",
    island: "Nusa Tenggara",
    multiplier: 1.8,
    provinces: ["nusa tenggara barat", "nusa tenggara timur"],
  },
];

const SHIPPING_SERVICES = [
  {
    name: "JNE Reguler",
    mode: "weight",
    formulaKey: "checkout.formulaWeight",
    divisor: 6000,
    ratePerKg: 25000,
    eta: "2-3 hari",
    logo: "/logos/jne.png",
    badge: "checkout.badgePopular",
  },
  {
    name: "J&T Express",
    mode: "weight",
    formulaKey: "checkout.formulaWeight",
    divisor: 6000,
    ratePerKg: 22000,
    eta: "2-3 hari",
    logo: "/logos/jnt.svg",
    badge: null,
  },
  {
    name: "SiCepat REG",
    mode: "weight",
    formulaKey: "checkout.formulaWeight",
    divisor: 6000,
    ratePerKg: 26000,
    eta: "1-2 hari",
    logo: "/logos/sicepat.png",
    badge: null,
  },
  {
    name: "AnterAja",
    mode: "weight",
    formulaKey: "checkout.formulaWeight",
    divisor: 6000,
    ratePerKg: 21000,
    eta: "2-4 hari",
    logo: "/logos/anteraja.jpg",
    badge: "checkout.badgeCheapest",
  },
  {
    name: "DHL Express",
    mode: "weight",
    formulaKey: "checkout.formulaWeight",
    divisor: 5000,
    ratePerKg: 45000,
    eta: "3-5 hari",
    logo: "",
    badge: null,
  },
  {
    name: "FedEx International",
    mode: "weight",
    formulaKey: "checkout.formulaWeight",
    divisor: 5000,
    ratePerKg: 42000,
    eta: "3-6 hari",
    logo: "",
    badge: null,
  },
  {
    name: "JNE Trucking",
    mode: "cargo",
    formulaKey: "checkout.formulaCargo",
    divisor: 4000,
    ratePerKg: 3500,
    cbmRate: 900000,
    eta: "4-6 hari",
    logo: "/logos/jne.png",
    badge: null,
  },
  {
    name: "Indah Cargo",
    mode: "cargo",
    formulaKey: "checkout.formulaCargo",
    divisor: 4000,
    ratePerKg: 3000,
    cbmRate: 800000,
    eta: "5-7 hari",
    logo: "",
    badge: null,
  },
  {
    name: "GoSend Same Day",
    mode: "instant",
    formulaKey: "checkout.formulaInstant",
    divisor: 6000,
    instantBase: 25000,
    instantPerKm: 3500,
    eta: "Hari ini",
    logo: "/logos/gosend.png",
    badge: null,
  },
];

function normalizeProvince(province) {
  return String(province || "").trim().toLowerCase();
}

function getShippingZone(province) {
  const key = normalizeProvince(province);
  if (!key || JAVA_PROVINCES.has(key)) {
    return { code: "java", island: "Jawa", multiplier: 1, isJava: true };
  }
  const group = ISLAND_GROUPS.find((item) => item.provinces.includes(key));
  if (group) {
    return { code: group.code, island: group.island, multiplier: group.multiplier, isJava: false };
  }
  return { code: "luar_jawa", island: "Luar Jawa", multiplier: 1.85, isJava: false };
}

function getService(name) {
  const key = String(name || "").trim().toLowerCase();
  return SHIPPING_SERVICES.find((service) => service.name.toLowerCase() === key) || SHIPPING_SERVICES[0];
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function roundRupiah(value) {
  return Math.round(Number(value || 0) / 1000) * 1000;
}

function roundKg(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function roundM3(value) {
  return Math.round(Number(value || 0) * 100000) / 100000;
}

function insuranceFeeFor(items = [], enabled = true) {
  if (!enabled) return 0;
  return items.reduce((sum, item) => {
    const subtotal = Number(item.price || 0) * Math.max(1, Number(item.qty || 1));
    return sum + Math.min(5000, Math.max(2000, Math.round(subtotal * 0.002)));
  }, 0);
}

function packingFeeFor(packingType, chargeableWeightKg) {
  const kg = Math.max(1, Math.ceil(Number(chargeableWeightKg || 0)));
  if (packingType === "bubble") return 3000 + kg * 500;
  if (packingType === "wood") return 10000 + kg * 1000;
  return 0;
}

function quoteShipping({
  service: serviceName,
  province,
  items = [],
  insuranceEnabled = true,
  packingType = "none",
  distanceKm = 0,
} = {}) {
  const service = getService(serviceName);
  const zone = getShippingZone(province);
  const divisor = Number(service.divisor || 6000);
  const normalizedItems = items.map((item) => {
    const qty = Math.max(1, Number(item.qty || 1));
    const weightKg = positiveNumber(item.weightKg, 1);
    const lengthCm = positiveNumber(item.lengthCm, 20);
    const widthCm = positiveNumber(item.widthCm, 15);
    const heightCm = positiveNumber(item.heightCm, 10);
    return {
      qty,
      price: Number(item.price || 0),
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      actualKg: weightKg * qty,
      volumetricKg: ((lengthCm * widthCm * heightCm) / divisor) * qty,
      volumeM3: ((lengthCm * widthCm * heightCm) / 1000000) * qty,
    };
  });

  const actualWeightKg = normalizedItems.reduce((sum, item) => sum + item.actualKg, 0);
  const volumetricWeightKg = normalizedItems.reduce((sum, item) => sum + item.volumetricKg, 0);
  const volumeM3 = normalizedItems.reduce((sum, item) => sum + item.volumeM3, 0);
  const chargeableWeightKg = Math.max(actualWeightKg, volumetricWeightKg);
  const km = Math.max(0, Number(distanceKm) || 0);

  let weightCost = 0;
  let cbmCost = 0;
  let distanceCost = 0;
  let baseFee = 0;

  if (service.mode === "instant") {
    distanceCost = Number(service.instantBase || 0) + km * Number(service.instantPerKm || 0);
    baseFee = distanceCost * zone.multiplier;
  } else {
    weightCost = chargeableWeightKg * Number(service.ratePerKg || 0);
    if (service.mode === "cargo") {
      cbmCost = volumeM3 * Number(service.cbmRate || 0);
      baseFee = Math.max(weightCost, cbmCost) * zone.multiplier;
    } else {
      baseFee = weightCost * zone.multiplier;
    }
  }

  baseFee = roundRupiah(baseFee);
  const insuranceFee = insuranceFeeFor(normalizedItems, insuranceEnabled);
  const packingFee = packingFeeFor(packingType, chargeableWeightKg);

  return {
    serviceName: service.name,
    mode: service.mode,
    formulaKey: service.formulaKey,
    zone,
    zoneMultiplier: zone.multiplier,
    items: normalizedItems,
    actualWeightKg: roundKg(actualWeightKg),
    volumetricWeightKg: roundKg(volumetricWeightKg),
    chargeableWeightKg: roundKg(chargeableWeightKg),
    volumeM3: roundM3(volumeM3),
    distanceKm: km,
    divisor,
    ratePerKg: Number(service.ratePerKg || 0),
    cbmRate: Number(service.cbmRate || 0),
    instantBase: Number(service.instantBase || 0),
    instantPerKm: Number(service.instantPerKm || 0),
    weightCost: roundRupiah(weightCost),
    cbmCost: roundRupiah(cbmCost),
    distanceCost: roundRupiah(distanceCost),
    baseFee,
    insuranceFee,
    packingFee,
    totalDeliveryFee: baseFee + insuranceFee + packingFee,
  };
}

module.exports = {
  JAVA_PROVINCES: [...JAVA_PROVINCES],
  ISLAND_GROUPS,
  SHIPPING_SERVICES,
  getShippingZone,
  getService,
  quoteShipping,
  packingFeeFor,
  insuranceFeeFor,
};
