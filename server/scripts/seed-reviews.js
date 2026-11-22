/*
 * Memasukkan seluruh ulasan contoh yang ada di frontend (lib/data.ts) ke database.
 * Jalankan dari folder server:  npm run seed:reviews
 * Aman dijalankan berulang kali (tidak membuat duplikat).
 */

const path = require("path");
const { PrismaClient } = require("@prisma/client");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const LEGACY_REVIEWS = [
  {
    productName: "Samsung Galaxy S24 Ultra 12/512GB",
    reviews: [
      { name: "Andi P.", rating: 5, comment: "Barang original, kamera jernih banget. Pengiriman cepat!" },
      { name: "Siti N.", rating: 5, comment: "S Pen sangat membantu untuk catatan harian. Recommended." },
      { name: "Budi S.", rating: 4, comment: "Produk bagus, packing aman. Sedikit lama pengiriman ke luar Jawa." },
    ],
  },
  {
    productName: "iPhone 15 Pro Max 256GB Natural Titanium",
    reviews: [
      { name: "Rina K.", rating: 5, comment: "iPhone original, seal masih utuh. Seller responsif." },
      { name: "Dimas W.", rating: 5, comment: "Kamera night mode-nya luar biasa. Worth it!" },
    ],
  },
  {
    productName: "MacBook Air M3 13 Inch 256GB",
    reviews: [
      { name: "Felix H.", rating: 5, comment: "Ringan, baterai tahan lama. Perfect untuk kuliah." },
      { name: "Maya L.", rating: 5, comment: "Performa M3 kencang untuk editing video 1080p." },
    ],
  },
  {
    productName: "Sony WH-1000XM5 Wireless Noise",
    reviews: [
      { name: "Kevin T.", rating: 5, comment: "ANC-nya the best! Nyaman dipakai seharian." },
      { name: "Lia S.", rating: 4, comment: "Suara bass enak, tapi case agak besar." },
    ],
  },
  {
    productName: "PlayStation 5 Slim 1TB + 2 Controller",
    reviews: [
      { name: "Arif G.", rating: 5, comment: "Paket lengkap, 2 stik langsung main. Mantap!" },
      { name: "Nadia R.", rating: 5, comment: "Loading game cepat banget. Worth every rupiah." },
    ],
  },
  {
    productName: "Xiaomi 14T Pro 12/512GB HyperOS",
    reviews: [
      { name: "Hendra M.", rating: 5, comment: "Charging 120W gila cepat. Kamera Leica ok banget." },
      { name: "Putri A.", rating: 4, comment: "HP kencang, harga masuk akal untuk spek segini." },
    ],
  },
  {
    productName: "JBL Charge 5 Portable Speaker",
    reviews: [
      { name: "Omar D.", rating: 5, comment: "Bass-nya tebel, tahan air beneran. Dipakai di pantai aman." },
      { name: "Citra B.", rating: 4, comment: "Suara jernih, baterai awet. Cocok buat camping." },
    ],
  },
];

function findProduct(products, productName) {
  const target = productName.trim().toLowerCase();
  return (
    products.find((product) => product.name.trim().toLowerCase() === target) ||
    products.find((product) => {
      const name = product.name.trim().toLowerCase();
      return name.startsWith(target) || target.startsWith(name);
    }) ||
    null
  );
}

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  let inserted = 0;
  let skipped = 0;

  for (const group of LEGACY_REVIEWS) {
    const product = findProduct(products, group.productName);
    if (!product) {
      console.warn(`Produk tidak ditemukan, ulasan dilewati: ${group.productName}`);
    }

    for (const [index, review] of group.reviews.entries()) {
      const productId = product ? product.id : null;
      const existing = await prisma.review.findFirst({
        where: {
          product_id: productId,
          product_name: product ? product.name : group.productName,
          reviewer_name: review.name,
          comment: review.comment,
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const createdAt = new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000);
      await prisma.review.create({
        data: {
          product_id: productId,
          product_name: product ? product.name : group.productName,
          order_id: null,
          order_item_id: null,
          buyer_id: null,
          reviewer_name: review.name,
          rating: review.rating,
          comment: review.comment,
          created_at: createdAt,
          updated_at: createdAt,
        },
      });
      inserted += 1;
    }
  }

  console.log(`Ulasan baru: ${inserted}, sudah ada sebelumnya: ${skipped}.`);
}

main()
  .catch((err) => {
    console.error("Gagal memasukkan ulasan:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
