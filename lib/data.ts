export type Review = {
  name: string;
  rating: number;
  comment: string;
};

export type Store = {
  name: string;
  location: string;
  rating: number;
  verified: boolean;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  images?: string[];
  rating?: number;
  sold?: number;
  location?: string;
  badge?: "FLASH SALE" | "Original";
  soldOf?: number;
  description?: string;
  specs?: string[];
  stock?: number;
  weight?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  condition?: string;
  category?: string;
  reviewCount?: number;
  soldTotal?: number;
  store?: Store;
  reviews?: Review[];
};

/**
 * Ganti URL foto produk di sini — semua sudah berupa link (https://...), bukan file lokal lagi.
 * Beberapa link di bawah masih PLACEHOLDER (Sony, Xiaomi, JBL) karena aku tidak menemukan foto
 * bebas-lisensi yang persis cocok — silakan ganti dengan link gambar asli pilihanmu.
 */
export const productImages = {
  samsung:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQESsGQQVqX2nRAl1g9PmyB3RJNu8B-_g34hi7fvuUNMt4lue4MQ4WDSww&s=10",
  iphone:
    "https://files.eci.id/documents/product/best/webiphone15pmt256tt/1697699185-1.webp",
  macbook:
    "https://macfinder.co.uk/wp-content/smush-webp/2023/02/img-MacBook-Air-13-Inch-99681-scaled-1250x1250.jpg.webp",
  sony: "https://gameone.ph/media/catalog/product/mpiowebpcache/d378a0f20f83637cdb1392af8dc032a2/s/o/sony-wh-1000xm5-headset.webp",
  ps5: "https://commons.wikimedia.org/wiki/Special:FilePath/PlayStation%205%20and%20DualSense%20with%20transparent%20background.png",
  xiaomi: "https://i02.appmifile.com/174_operator_sg/27/09/2024/b2a506bd130e53a2ff1983c074910242.jpg",
  jbl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1j5Vr3_XTYp1Uc4AbdTCPRydMSESzFdcQ6yLNbK85Rg&s=10",
  rogG14: "https://commons.wikimedia.org/wiki/Special:FilePath/ASUS%20ROG%20Zephyrus%202026-08-15%20G14.jpg",
  canonR50: "https://commons.wikimedia.org/wiki/Special:FilePath/Canon%20EOS%20R50,%20White,%203.jpg",
  appleWatchS9:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Apple%20Watch%20Series%209%201%202023-11-14.jpg",
  mxMaster3s:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Logitech%20MX%20Master%203S%20HS12.jpg",
  anker737:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Anker%20power%20bank%20and%20cable.jpg",
  switchOled:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Nintendo%20Switch%20%E2%80%93%20OLED-Modell%20mit%20gedockter%20Konsole%2020230506%20HOF01624%20RAW-Export.png?width=800",
} as const;

const defaultStore: Store = {
  name: "Jaya store",
  location: "Jakarta",
  rating: 4.9,
  verified: true,
};

const samsungS24 = {
  name: "Samsung Galaxy S24 Ultra 12/512GB",
  price: 18999000,
  originalPrice: 21999000,
  discountPercent: 14,
  image: productImages.samsung,
  images: [
    productImages.samsung,
    "/products/samsung-s24.svg",
    productImages.samsung,
    "/products/samsung-s24.svg",
  ],
  category: "Smartphone",
  description:
    "Samsung Galaxy S24 Ultra dengan S Pen terintegrasi, kamera 200MP, layar Dynamic AMOLED 2X 6.8 inci 120Hz, chipset Snapdragon 8 Gen 3, dan baterai 5000mAh. Cocok untuk produktivitas, fotografi, dan gaming mobile.",
  specs: [
    "Layar: 6.8 inci Dynamic AMOLED 2X, 120Hz",
    "Prosesor: Snapdragon 8 Gen 3 for Galaxy",
    "RAM/Storage: 12GB / 512GB",
    "Kamera: 200MP + 50MP + 12MP + 10MP",
    "Baterai: 5000mAh, fast charging 45W",
    "Garansi resmi Samsung Indonesia 1 tahun",
  ],
  stock: 25,
  weight: "0.5 kg",
  condition: "Baru",
  rating: 4.9,
  reviewCount: 342,
  soldTotal: 540,
  location: "Jakarta",
  store: {
    name: "Jaya store",
    location: "Jakarta",
    rating: 4.9,
    verified: true,
  },
  reviews: [
    {
      name: "Andi P.",
      rating: 5,
      comment: "Barang original, kamera jernih banget. Pengiriman cepat!",
    },
    {
      name: "Siti N.",
      rating: 5,
      comment: "S Pen sangat membantu untuk catatan harian. Recommended.",
    },
    {
      name: "Budi S.",
      rating: 4,
      comment: "Produk bagus, packing aman. Sedikit lama pengiriman ke luar Jawa.",
    },
  ],
};

const iphone15ProMax = {
  name: "iPhone 15 Pro Max 256GB Natural Titanium",
  price: 20999000,
  originalPrice: 23999000,
  discountPercent: 13,
  image: productImages.iphone,
  images: [
    productImages.iphone,
    "/products/iphone-15.svg",
    productImages.iphone,
    "/products/iphone-15.svg",
  ],
  category: "Smartphone",
  description:
    "iPhone 15 Pro Max dengan desain titanium, chip A17 Pro, kamera 48MP ProRAW, Action Button, dan USB-C. Layar Super Retina XDR 6.7 inci dengan ProMotion 120Hz untuk pengalaman premium Apple.",
  specs: [
    "Layar: 6.7 inci Super Retina XDR, ProMotion 120Hz",
    "Chip: A17 Pro",
    "Storage: 256GB",
    "Kamera: 48MP utama + 12MP ultrawide + 12MP telephoto",
    "Material: Titanium grade aerospace",
    "Garansi resmi Apple / iBox 1 tahun",
  ],
  stock: 18,
  weight: "0.45 kg",
  condition: "Baru",
  rating: 5.0,
  reviewCount: 890,
  soldTotal: 890,
  location: "Jakarta",
  store: defaultStore,
  reviews: [
    {
      name: "Rina K.",
      rating: 5,
      comment: "iPhone original, seal masih utuh. Seller responsif.",
    },
    {
      name: "Dimas W.",
      rating: 5,
      comment: "Kamera night mode-nya luar biasa. Worth it!",
    },
  ],
};

const macbookAirM3 = {
  name: "MacBook Air M3 13 Inch 256GB",
  price: 15999000,
  originalPrice: 17999000,
  discountPercent: 11,
  image: productImages.macbook,
  images: [
    productImages.macbook,
    "/products/macbook-m3.svg",
    productImages.macbook,
    "/products/macbook-m3.svg",
  ],
  category: "Laptop",
  description:
    "MacBook Air 13 inci dengan chip Apple M3, layar Liquid Retina, baterai hingga 18 jam, dan desain fanless yang tipis. Ideal untuk mahasiswa, profesional, dan kreator konten ringan.",
  specs: [
    "Layar: 13.6 inci Liquid Retina, 2560 x 1664",
    "Chip: Apple M3 (8-core CPU, 8-core GPU)",
    "RAM: 8GB unified memory",
    "Storage: 256GB SSD",
    "Baterai: Hingga 18 jam",
    "Garansi resmi Apple 1 tahun",
  ],
  stock: 12,
  weight: "1.2 kg",
  condition: "Baru",
  rating: 4.9,
  reviewCount: 320,
  soldTotal: 320,
  location: "Jakarta",
  store: {
    name: "Jaya store",
    location: "Jakarta",
    rating: 4.9,
    verified: true,
  },
  reviews: [
    {
      name: "Felix H.",
      rating: 5,
      comment: "Ringan, baterai tahan lama. Perfect untuk kuliah.",
    },
    {
      name: "Maya L.",
      rating: 5,
      comment: "Performa M3 kencang untuk editing video 1080p.",
    },
  ],
};

const sonyXm5 = {
  name: "Sony WH-1000XM5 Wireless Noise",
  price: 4999000,
  originalPrice: 5999000,
  discountPercent: 17,
  image: productImages.sony,
  images: [
    productImages.sony,
    "/products/sony-xm5.svg",
    productImages.sony,
    "/products/sony-xm5.svg",
  ],
  category: "Audio",
  description:
    "Headphone premium Sony WH-1000XM5 dengan noise cancelling terdepan, driver 30mm, baterai 30 jam, multipoint connection, dan speak-to-chat. Suara jernih untuk musik, meeting, dan perjalanan.",
  specs: [
    "Driver: 30mm dynamic",
    "Noise Cancelling: Dual Processor V1 + QN1",
    "Baterai: Hingga 30 jam (NC on)",
    "Koneksi: Bluetooth 5.2, multipoint 2 device",
    "Fitur: Speak-to-Chat, Quick Attention",
    "Garansi resmi Sony 1 tahun",
  ],
  stock: 30,
  weight: "0.25 kg",
  condition: "Baru",
  rating: 4.8,
  reviewCount: 280,
  soldTotal: 280,
  location: "Jakarta",
  store: defaultStore,
  reviews: [
    {
      name: "Kevin T.",
      rating: 5,
      comment: "ANC-nya the best! Nyaman dipakai seharian.",
    },
    {
      name: "Lia S.",
      rating: 4,
      comment: "Suara bass enak, tapi case agak besar.",
    },
  ],
};

const ps5Slim = {
  name: "PlayStation 5 Slim 1TB + 2 Controller",
  price: 8999000,
  originalPrice: 9999000,
  discountPercent: 10,
  image: productImages.ps5,
  images: [
    productImages.ps5,
    "/products/ps5.svg",
    productImages.ps5,
    "/products/ps5.svg",
  ],
  category: "Gaming",
  description:
    "Paket PlayStation 5 Slim 1TB dengan 2 DualSense controller. Mendukung ray tracing, loading ultra cepat SSD, output 4K 120Hz, dan library game PlayStation eksklusif.",
  specs: [
    "Storage: 1TB SSD",
    "Output: 4K 120Hz, HDR, ray tracing",
    "Isi paket: PS5 Slim + 2x DualSense",
    "Backward compatible: PS4 games",
    "Online: PlayStation Plus (opsional)",
    "Garansi resmi Sony 1 tahun",
  ],
  stock: 8,
  weight: "3.9 kg",
  condition: "Baru",
  rating: 4.9,
  reviewCount: 156,
  soldTotal: 156,
  location: "Jakarta",
  store: {
    name: "Jaya store",
    location: "Jakarta",
    rating: 4.8,
    verified: true,
  },
  reviews: [
    {
      name: "Arif G.",
      rating: 5,
      comment: "Paket lengkap, 2 stik langsung main. Mantap!",
    },
    {
      name: "Nadia R.",
      rating: 5,
      comment: "Loading game cepat banget. Worth every rupiah.",
    },
  ],
};

const xiaomi14TPro = {
  name: "Xiaomi 14T Pro 12/512GB HyperOS",
  price: 7999000,
  originalPrice: 9999000,
  discountPercent: 20,
  image: productImages.xiaomi,
  images: [
    productImages.xiaomi,
    "/products/xiaomi-14t.svg",
    productImages.xiaomi,
    "/products/xiaomi-14t.svg",
  ],
  category: "Smartphone",
  description:
    "Xiaomi 14T Pro dengan Leica camera system, layar AMOLED 144Hz, Snapdragon 8 Gen 3, charging 120W, dan HyperOS. Flagship killer dengan harga kompetitif.",
  specs: [
    "Layar: 6.67 inci AMOLED, 144Hz, 4000 nits peak",
    "Prosesor: Snapdragon 8 Gen 3",
    "RAM/Storage: 12GB / 512GB",
    "Kamera: Leica 50MP triple camera",
    "Charging: 120W HyperCharge",
    "Garansi resmi Xiaomi 1 tahun",
  ],
  stock: 20,
  weight: "0.48 kg",
  condition: "Baru",
  rating: 4.7,
  reviewCount: 340,
  soldTotal: 340,
  location: "Jakarta",
  store: defaultStore,
  reviews: [
    {
      name: "Hendra M.",
      rating: 5,
      comment: "Charging 120W gila cepat. Kamera Leica ok banget.",
    },
    {
      name: "Putri A.",
      rating: 4,
      comment: "HP kencang, harga masuk akal untuk spek segini.",
    },
  ],
};

const jblCharge5 = {
  name: "JBL Charge 5 Portable Speaker",
  price: 1799000,
  originalPrice: 2299000,
  discountPercent: 22,
  image: productImages.jbl,
  images: [
    productImages.jbl,
    "/products/jbl-charge5.svg",
    productImages.jbl,
    "/products/jbl-charge5.svg",
  ],
  category: "Audio",
  description:
    "Speaker portable JBL Charge 5 dengan suara powerful, IP67 waterproof & dustproof, powerbank built-in, PartyBoost, dan baterai 20 jam. Cocok untuk outdoor, piknik, dan pesta kecil.",
  specs: [
    "Driver: Racetrack driver + separate tweeter",
    "Output: JBL Pro Sound",
    "Proteksi: IP67 waterproof & dustproof",
    "Baterai: Hingga 20 jam",
    "Fitur: PartyBoost, powerbank via USB-A",
    "Garansi resmi JBL 1 tahun",
  ],
  stock: 45,
  weight: "0.96 kg",
  condition: "Baru",
  rating: 4.7,
  reviewCount: 195,
  soldTotal: 195,
  location: "Jakarta",
  store: defaultStore,
  reviews: [
    {
      name: "Omar D.",
      rating: 5,
      comment: "Bass-nya tebel, tahan air beneran. Dipakai di pantai aman.",
    },
    {
      name: "Citra B.",
      rating: 4,
      comment: "Suara jernih, baterai awet. Cocok buat camping.",
    },
  ],
};

export const heroProducts: Product[] = [
  { id: "h1", ...samsungS24, name: "Samsung Galaxy S24 Ultra", badge: "Original" },
  { id: "h2", ...macbookAirM3 },
  { id: "h3", ...iphone15ProMax, name: "iPhone 15 Pro Max 256GB Natural" },
  { id: "h4", ...sonyXm5, name: "Sony WH-1000XM5 Wireless" },
];

export const categories = [
  { id: "c1", name: "Smartphone", icon: "Smartphone" },
  { id: "c2", name: "Laptop", icon: "Laptop" },
  { id: "c3", name: "TV & Audio", icon: "Tv" },
  { id: "c4", name: "Kamera", icon: "Camera" },
  { id: "c5", name: "Audio", icon: "Headphones" },
  { id: "c6", name: "Gaming", icon: "Gamepad2" },
  { id: "c7", name: "Smart Watch", icon: "Watch" },
  { id: "c8", name: "Kabel & Charger", icon: "Cable" },
];

export const flashSaleProducts: Product[] = [
  { id: "f1", ...samsungS24, badge: "FLASH SALE", sold: 38, soldOf: 50 },
  {
    id: "f2",
    ...iphone15ProMax,
    badge: "FLASH SALE",
    sold: 27,
    soldOf: 30,
  },
  { id: "f3", ...sonyXm5, badge: "FLASH SALE", sold: 45, soldOf: 60 },
  { id: "f4", ...ps5Slim, badge: "FLASH SALE", sold: 18, soldOf: 25 },
  { id: "f5", ...xiaomi14TPro, badge: "FLASH SALE", sold: 62, soldOf: 80 },
  { id: "f6", ...jblCharge5, badge: "FLASH SALE", sold: 78, soldOf: 100 },
];

// Produk best seller dibuat berbeda dari Flash Sale agar tidak ada kartu yang berulang di beranda.
const alternativeBestSellers: Product[] = [
  {
    id: "b1",
    name: "ASUS ROG Zephyrus G14 Gaming Laptop",
    price: 24999000,
    originalPrice: 27999000,
    discountPercent: 11,
    image: productImages.rogG14,
    category: "Laptop",
    rating: 4.8,
    sold: 412,
    location: "Jakarta",
    badge: "Original",
  },
  {
    id: "b2",
    name: "Canon EOS R50 Mirrorless Camera",
    price: 11499000,
    originalPrice: 12999000,
    discountPercent: 12,
    image: productImages.canonR50,
    category: "Kamera",
    rating: 4.9,
    sold: 275,
    location: "Jakarta",
    badge: "Original",
  },
  {
    id: "b3",
    name: "Apple Watch Series 9 GPS 45mm",
    price: 6799000,
    originalPrice: 7499000,
    discountPercent: 9,
    image: productImages.appleWatchS9,
    category: "Smart Watch",
    rating: 4.8,
    sold: 530,
    location: "Jakarta",
    badge: "Original",
  },
  {
    id: "b4",
    name: "Logitech MX Master 3S Wireless Mouse",
    price: 1499000,
    originalPrice: 1799000,
    discountPercent: 17,
    image: productImages.mxMaster3s,
    category: "Aksesoris",
    rating: 4.7,
    sold: 680,
    location: "Jakarta",
    badge: "Original",
  },
  {
    id: "b5",
    name: "Anker 737 Power Bank 24000mAh",
    price: 1899000,
    originalPrice: 2299000,
    discountPercent: 17,
    image: productImages.anker737,
    category: "Kabel & Charger",
    rating: 4.8,
    sold: 395,
    location: "Jakarta",
    badge: "Original",
  },
  {
    id: "b6",
    name: "Nintendo Switch OLED White Edition",
    price: 4999000,
    originalPrice: 5499000,
    discountPercent: 9,
    image: productImages.switchOled,
    category: "Gaming",
    rating: 4.9,
    sold: 460,
    location: "Jakarta",
    badge: "Original",
  },
];

export const bestSellerProducts: Product[] = [
  ...alternativeBestSellers,
];

export const brands = [
  { name: "Samsung", color: "text-blue-700" },
  { name: "Apple", color: "text-slate-900" },
  { name: "Sony", color: "text-slate-900" },
  { name: "Xiaomi", color: "text-orange-500" },
  { name: "ASUS", color: "text-slate-900" },
  { name: "Lenovo", color: "text-red-600" },
  { name: "LG", color: "text-red-600" },
  { name: "Bose", color: "text-slate-900" },
  { name: "Canon", color: "text-red-600" },
  { name: "JBL", color: "text-red-600" },
];

export const paymentMethods = [
  "BCA",
  "BNI",
  "BRI",
  "Mandiri",
  "DANA",
  "GoPay",
  "OVO",
  "QRIS",
];

export const shippingPartners = [
  "JNE",
  "J&T",
  "SiCepat",
  "AnterAja",
  "Ninja",
  "GoSend",
  "GrabExpress",
];

export function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

// Kunci "keluarga" produk: nama dinormalkan agar varian yang sama
// (beda kapasitas / warna / kata tambahan) tidak dianggap produk terpisah.
function productFamilyKey(name: string): string {
  let key = name.toLowerCase().replace(/&/g, " and ");
  key = key.replace(/[^\w\s\d-]/g, " ");
  key = key.replace(/\b\d+\s*(gb|tb|ssd|inch|inches|ram)\b/g, " ");
  key = key.replace(
    /\b(pro max|pro|max|plus|ultra|mini|slim|edition|wireless|noise|cancelling|bluetooth|gaming|titanium|natural|graphite|midnight|starlight|space gray|space grey|silver|gold|rose gold|white|black|blue|green|purple|pink|yellow|red|with|and|of|the|for)\b/g,
    " "
  );
  key = key.replace(/\b\d+\b/g, " ");
  key = key.replace(/\s+/g, " ").trim();
  return key;
}

export function uniqueProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = productFamilyKey(product.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAllProducts(): Product[] {
  return uniqueProducts([...flashSaleProducts, ...bestSellerProducts, ...heroProducts]);
}

export function getProductById(id: string): Product | undefined {
  return [...flashSaleProducts, ...bestSellerProducts, ...heroProducts].find((product) => product.id === id);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return getAllProducts()
    .filter((p) => {
      if (p.id === product.id || p.category !== product.category) return false;
      return true;
    })
    .slice(0, limit);
}