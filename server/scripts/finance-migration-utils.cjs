const fs = require("fs");
const path = require("path");

const BACKUP_DIR = path.resolve(__dirname, "..", "backups");

function isDryRun() {
  return process.argv.includes("--dry-run");
}

function rupiah(value) {
  return `Rp${Math.round(Number(value || 0)).toLocaleString("id-ID")}`;
}

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** Cadangkan tabel yang terdampak ke satu file JSON sebelum skrip destruktif berjalan. */
async function backupTables(prisma, tables, label) {
  ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `${label}-${stamp}.json`);
  const data = {};
  for (const table of tables) {
    data[table] = await prisma[table].findMany();
  }
  const payload = {
    created_at: new Date().toISOString(),
    label,
    tables,
    counts: Object.fromEntries(tables.map((table) => [table, data[table].length])),
    data,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Backup dibuat: ${file}`);
  for (const [table, count] of Object.entries(payload.counts)) {
    console.log(`  - ${table}: ${count} baris`);
  }
  return file;
}

module.exports = { BACKUP_DIR, isDryRun, rupiah, backupTables };
