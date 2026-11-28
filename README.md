# ElektroMart — Frontend

Landing page e-commerce dibangun dengan **Next.js 14 (App Router)**, **React**, dan **Tailwind CSS**, mereplikasi desain pada gambar referensi.

## Struktur project

```
elektromart/
├── app/
│   ├── layout.tsx      # root layout + metadata
│   ├── page.tsx         # merangkai semua section jadi 1 halaman
│   └── globals.css      # tailwind + style global
├── components/
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── TrustBadges.tsx
│   ├── Categories.tsx
│   ├── FlashSale.tsx    # ada countdown timer live
│   ├── ProductCard.tsx  # kartu produk flash sale & best seller
│   ├── BestSellers.tsx
│   ├── Brands.tsx
│   ├── PromoBanners.tsx
│   └── Footer.tsx
├── lib/
│   ├── data.ts          # MOCK DATA produk, kategori, brand, dll
│   └── localAuth.ts     # adapter auth/profil/upload ke API lokal
├── tailwind.config.js
└── package.json
```

## Cara menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Menghubungkan ke Backend (Node.js + Prisma/MySQL)

Backend Express ada di folder `server/` dan menyimpan data ke MySQL melalui Prisma (`users`, `profiles`, `shipping_addresses`, `categories`, `products`, dll).

1. Pastikan MySQL berjalan dan database `db_elektromart` tersedia.
2. Buat `.env` di root dengan konfigurasi lokal, misalnya:

```env
DATABASE_URL="mysql://root:@localhost:3306/db_elektromart"
JWT_SECRET="rahasia-untuk-development"
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CLIENT_ORIGIN=http://localhost:3000
```

3. Install dependensi dan siapkan Prisma:

```bash
npm install
npm install --prefix server
npm run generate --prefix server
npm run dbpush --prefix server
```

4. Opsional: isi data contoh dengan `npm run seed --prefix server` (membaca berkas seed lokal `server/prisma/supabase-export.json`).
5. Jalankan aplikasi dengan `npm run dev` — menjalankan frontend (http://localhost:3000) dan API (http://localhost:4000) sekaligus. Frontend memanggil API melalui `NEXT_PUBLIC_API_URL`.

CRUD admin: kategori, seller, buyer. CRUD seller: produk. Profil buyer menyimpan data pribadi + alamat pengiriman ke database.
