/*
 * Menandai produk flash sale yang sebelumnya hanya ada sebagai data contoh
 * di lib/data.ts. Aman dijalankan berulang kali.
 * Jalankan dari folder server: npm run seed:flash-sale
 */

const path = require("path");
const { PrismaClient } = require("@prisma/client");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const FLASH_SALE_PRODUCTS = [
  { productName: "Samsung Galaxy S24 Ultra 12/512GB", quota: 50 },
  { productName: "iPhone 15 Pro Max 256GB Natural Titanium", quota: 30 },
  { productName: "Sony WH-1000XM5 Wireless Noise", quota: 60 },
  { productName: "PlayStation 5 Slim 1TB + 2 Controller", quota: 25 },
  { productName: "Xiaomi 14T Pro 12/512GB HyperOS", quota: 80 },
  { productName: "JBL Charge 5 Portable Speaker", quota: 100 },
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
  let updated = 0;
  let skipped = 0;

  for (const entry of FLASH_SALE_PRODUCTS) {
    const product = findProduct(products, entry.productName);
    if (!product) {
      console.warn(`Produk tidak ditemukan, dilewati: ${entry.productName}`);
      skipped++;
      continue;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { is_flash_sale: true, flash_sale_quota: entry.quota },
    });
    console.log(`Flash sale: ${product.name} — kuota ${entry.quota}`);
    updated++;
  }

  console.log(`\nSelesai. ${updated} produk diperbarui, ${skipped} dilewati.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
