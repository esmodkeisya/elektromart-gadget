/*
 * Export semua data dari Supabase ke server/prisma/supabase-export.json
 * Jalankan dari folder server:  npm run export:supabase
 * Membaca kredensial dari ../.env (root) atau ./.env.
 * Script ini READ-ONLY terhadap Supabase.
 *
 * CATATAN: Supabase sudah dilepas dari aplikasi. Script ini hanya alat migrasi
 * sekali pakai. Untuk menjalankannya lagi, pasang dulu sementara:
 *   npm i -D @supabase/supabase-js
 * dan isi kembali NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env.
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Kredensial Supabase tidak ditemukan (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const TABLES = [
  "profiles",
  "shipping_addresses",
  "categories",
  "products",
  "orders",
  "order_items",
  "reports",
  "bank_accounts",
  "conversations",
  "messages",
];

async function fetchTable(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`Gagal membaca ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchUsers() {
  const users = [];
  const perPage = 200;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Gagal membaca auth.users: ${error.message}`);
    const batch = data?.users || [];
    users.push(
      ...batch.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        user_metadata: u.user_metadata || {},
        created_at: u.created_at,
      }))
    );
    if (batch.length < perPage) break;
  }
  return users;
}

async function main() {
  const out = { exported_at: new Date().toISOString(), source: url };

  try {
    out.users = await fetchUsers();
    console.log(`auth.users: ${out.users.length}`);
  } catch (err) {
    console.warn(`auth.users dilewati: ${err.message}`);
    out.users = [];
  }

  for (const table of TABLES) {
    try {
      out[table] = await fetchTable(table);
      console.log(`${table}: ${out[table].length}`);
    } catch (err) {
      console.warn(`${table} dilewati: ${err.message}`);
      out[table] = [];
    }
  }

  const target = path.resolve(__dirname, "../prisma/supabase-export.json");
  fs.writeFileSync(target, JSON.stringify(out, null, 2), "utf8");
  console.log(`\nExport selesai -> ${target}`);
}

main().catch((err) => {
  console.error("Export gagal:", err.message || err);
  process.exit(1);
});
