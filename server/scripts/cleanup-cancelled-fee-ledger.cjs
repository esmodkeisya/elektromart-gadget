// Hapus entri ledger seller_fee berstatus cancelled (fee tidak boleh muncul untuk pesanan batal).
// Idempoten, punya --dry-run, mencadangkan tabel terkait, dan menghapus dalam satu transaksi.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { prisma } = require("../src/prisma");
const { isDryRun, rupiah, backupTables } = require("./finance-migration-utils.cjs");

const n = (v) => Number(v || 0);

async function main() {
  const dryRun = isDryRun();
  console.log(`=== Bersihkan ledger fee batal (${dryRun ? "DRY RUN" : "EKSEKUSI"}) ===`);

  const rows = await prisma.platformLedger.findMany({
    where: { type: "seller_fee", status: "cancelled" },
    orderBy: { created_at: "asc" },
  });
  const orderIds = [...new Set(rows.map((row) => row.order_id).filter(Boolean))];
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, status: true } })
    : [];
  const statusById = new Map(orders.map((order) => [order.id, order.status]));

  const notCancelled = rows.filter((row) => row.order_id && statusById.get(row.order_id) !== "cancelled");
  if (notCancelled.length) {
    console.error(`Ditemukan ${notCancelled.length} entri cancelled pada pesanan yang tidak batal. Eksekusi dihentikan.`);
    notCancelled.forEach((row) => console.error(`  ${row.order_number} | status pesanan: ${statusById.get(row.order_id)}`));
    process.exitCode = 1;
    return;
  }

  const total = rows.reduce((sum, row) => sum + n(row.amount), 0);
  rows.forEach((row) => console.log(`  ${row.order_number} | ${rupiah(row.amount)} | ${row.created_at.toISOString()}`));
  console.log(`Jumlah entri: ${rows.length}`);
  console.log(`Total: ${rupiah(total)}`);

  if (dryRun) {
    console.log("DRY RUN selesai. Tidak ada perubahan database.");
    return;
  }
  if (!rows.length) {
    console.log("Tidak ada entri ledger batal. Selesai (idempoten).");
    return;
  }

  await backupTables(prisma, ["platformLedger"], "cleanup-cancelled-fee-ledger");
  await prisma.$transaction(async (tx) => {
    await tx.platformLedger.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  });
  console.log(`Selesai: ${rows.length} entri ledger batal dihapus (${rupiah(total)}).`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
