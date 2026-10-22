create type public.user_role as enum ('buyer', 'seller', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'buyer',
  job_title text,
  full_name text,
  username text,
  store_name text,
  phone text,
  store_address text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists username text;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Jadikan akun Keisyaesmod disetel sebagai admin/developer
do $$
declare
  admin_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = 'esmodkeisya@gmail.com'
  limit 1;

  if admin_id is null then
    raise notice 'User esmodkeisya@gmail.com belum ada di Authentication. Buat user tersebut dahulu, lalu jalankan ulang blok ini.';
  else
    update auth.users
    set phone = '+6285198253573',
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'full_name', 'Keisya esmod',
      'phone', '+6285198253573',
      'role', 'admin',
      'job_title', 'Developer'
    )
    where id = admin_id;

    insert into public.profiles (id, role, job_title, full_name, phone)
    values (admin_id, 'admin', 'Developer', 'Keisya esmod', '+62 851-9825-3573')
    on conflict (id) do update set
      role = 'admin',
      job_title = 'Developer',
      full_name = 'Keisya esmod',
      phone = '+62 851-9825-3573',
      updated_at = now();
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    job_title,
    full_name,
    store_name,
    phone,
    store_address,
    avatar_url
  )
  values (
    new.id,
    case
      when new.raw_user_meta_data->>'role' = 'seller' then 'seller'::public.user_role
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'::public.user_role
      else 'buyer'::public.user_role
    end,
    new.raw_user_meta_data->>'job_title',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'store_address',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Jalankan blok ALTER ini bila tabel profiles sudah pernah dibuat sebelumnya.
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Bucket avatars dipakai untuk menyimpan foto profil admin, seller, dan buyer.
-- Jalankan bagian ini di Supabase SQL Editor sebelum mencoba upload foto.

create policy "Users can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Perluasan skema: profil pembeli, alamat pengiriman, kategori, produk
-- Jalankan blok ini di SQL Editor setelah tabel profiles sudah ada.
-- ============================================================

alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists account_status text default 'active';
alter table public.profiles add column if not exists seller_status text;
alter table public.profiles add column if not exists store_description text;
alter table public.profiles add column if not exists store_banner_url text;
alter table public.profiles add column if not exists operating_hours jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'home',
  recipient text not null,
  phone text,
  address text not null,
  city text not null,
  province text not null default 'Jawa Timur',
  postal text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipping_addresses_user_id_idx on public.shipping_addresses (user_id);

alter table public.shipping_addresses enable row level security;

drop policy if exists "Users can read own addresses" on public.shipping_addresses;
create policy "Users can read own addresses"
  on public.shipping_addresses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own addresses" on public.shipping_addresses;
create policy "Users can create own addresses"
  on public.shipping_addresses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own addresses" on public.shipping_addresses;
create policy "Users can update own addresses"
  on public.shipping_addresses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own addresses" on public.shipping_addresses;
create policy "Users can delete own addresses"
  on public.shipping_addresses for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text default '#1a3fd6',
  icon text,
  sort_order integer not null default 0,
  subcategories text[] not null default '{}',
  attributes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists sort_order integer not null default 0;

alter table public.categories enable row level security;

drop policy if exists "Anyone authenticated can read categories" on public.categories;
create policy "Anyone authenticated can read categories"
  on public.categories for select
  to authenticated
  using (true);

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select
  to anon
  using (true);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  description text,
  price numeric not null default 0,
  stock integer not null default 0,
  status text not null default 'active',
  image_url text,
  images jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_seller_id_idx on public.products (seller_id);

create index if not exists products_seller_name_uniq_idx
  on public.products (seller_id, name);

alter table public.products enable row level security;

drop policy if exists "Authenticated can read products" on public.products;
create policy "Authenticated can read products"
  on public.products for select
  to authenticated
  using (true);

drop policy if exists "Sellers can insert own products" on public.products;
create policy "Sellers can insert own products"
  on public.products for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update own products" on public.products;
create policy "Sellers can update own products"
  on public.products for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete own products" on public.products;
create policy "Sellers can delete own products"
  on public.products for delete
  to authenticated
  using (auth.uid() = seller_id);

insert into public.categories (name, slug, color, icon, sort_order, subcategories, attributes)
values
  ('Smartphone', 'smartphone', '#3B82F6', 'Smartphone', 1, array['Android', 'iOS'], array['RAM', 'Storage', 'OS']),
  ('Laptop', 'laptop', '#8B5CF6', 'Laptop', 2, array['Gaming', 'Ultrabook', 'Office'], array['Processor', 'RAM', 'GPU']),
  ('TV & Audio', 'tv-audio', '#EC4899', 'Tv', 3, array['LED TV', 'Smart TV', 'Soundbar'], array['Size', 'Resolution']),
  ('Kamera', 'kamera', '#F59E0B', 'Camera', 4, array['Mirrorless', 'DSLR', 'Action Cam'], array['Sensor', 'Lens']),
  ('Audio', 'audio', '#10B981', 'Headphones', 5, array['TWS', 'Headphone', 'Speaker'], array['Connectivity', 'Battery Life']),
  ('Gaming', 'gaming', '#F43F5E', 'Gamepad2', 6, array['Console', 'Aksesoris', 'PC Gaming'], array['Platform']),
  ('Smart Watch', 'smart-watch', '#06B6D4', 'Watch', 7, array['Android', 'iOS'], array['Connectivity', 'Battery Life']),
  ('Kabel & Charger', 'kabel-charger', '#7C3AED', 'Cable', 8, array['USB-C', 'Lightning', 'Charger'], array['Watt', 'Connector'])
on conflict (slug) do update set
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  subcategories = excluded.subcategories,
  attributes = excluded.attributes,
  updated_at = now();

-- Order & Order Items (sinkron checkout -> dashboard)

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  order_number text not null unique,
  status text not null default 'waiting_payment',
  payment_method text,
  payment_group text,
  courier text,
  shipping_address jsonb,
  subtotal numeric not null default 0,
  product_fee numeric not null default 0,
  insurance_fee numeric not null default 0,
  shipping_fee numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_created_at_idx on public.orders (created_at);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  product_name text not null,
  product_image text,
  price numeric not null default 0,
  qty integer not null default 1,
  subtotal numeric not null default 0
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_seller_id_idx on public.order_items (seller_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "Sellers can read orders containing their items" on public.orders;
create policy "Sellers can read orders containing their items"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = id and oi.seller_id = auth.uid()
    )
  );

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items for select
  to authenticated
  using (
    auth.uid() = (select buyer_id from public.orders where id = order_id)
    or seller_id = auth.uid()
  );

drop policy if exists "Users can create own order items" on public.order_items;
create policy "Users can create own order items"
  on public.order_items for insert
  to authenticated
  with check (
    auth.uid() = (select buyer_id from public.orders where id = order_id)
  );

-- Demo orders agar dashboard admin langsung menampilkan angka (opsional).
-- Hanya jalan bila akun esmodkeisya@ (admin) sudah dibuat.
insert into public.orders (buyer_id, order_number, status, payment_method, payment_group, courier, shipping_address, subtotal, product_fee, insurance_fee, shipping_fee, total)
select u.id, 'DEMO-0001', 'completed', 'BCA Virtual Account', 'bank', 'JNE Reguler',
  jsonb_build_object('recipient', 'Keisya esmod', 'phone', '+62 851-9825-3573', 'address', 'Jl. Kenangan No. 12', 'city', 'Surabaya', 'province', 'Jawa Timur', 'postal', '60231'),
  14999000, 209986, 5000, 25000, 15228986
from auth.users u
where u.email = 'esmodkeisya@gmail.com'
on conflict (order_number) do nothing;

insert into public.orders (buyer_id, order_number, status, payment_method, payment_group, courier, shipping_address, subtotal, product_fee, insurance_fee, shipping_fee, total)
select u.id, 'DEMO-0002', 'paid', 'QRIS', 'qris', 'SiCepat REG',
  jsonb_build_object('recipient', 'Keisya esmod', 'phone', '+62 851-9825-3573', 'address', 'Jl. Kenangan No. 12', 'city', 'Surabaya', 'province', 'Jawa Timur', 'postal', '60231'),
  8999000, 125986, 5000, 26000, 9155986
from auth.users u
where u.email = 'esmodkeisya@gmail.com'
on conflict (order_number) do nothing;

insert into public.orders (buyer_id, order_number, status, payment_method, payment_group, courier, shipping_address, subtotal, product_fee, insurance_fee, shipping_fee, total)
select u.id, 'DEMO-0003', 'completed', 'DANA', 'ewallet', 'J&T Express',
  jsonb_build_object('recipient', 'Keisya esmod', 'phone', '+62 851-9825-3573', 'address', 'Jl. Kenangan No. 12', 'city', 'Surabaya', 'province', 'Jawa Timur', 'postal', '60231'),
  7999000, 111986, 5000, 22000, 8137986
from auth.users u
where u.email = 'esmodkeisya@gmail.com'
on conflict (order_number) do nothing;

insert into public.order_items (order_id, product_id, seller_id, product_name, product_image, price, qty, subtotal)
select o.id, null, null, 'Samsung Galaxy S24 Ultra 12/512GB', null, 14999000, 1, 14999000
from public.orders o
where o.order_number = 'DEMO-0001'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

insert into public.order_items (order_id, product_id, seller_id, product_name, product_image, price, qty, subtotal)
select o.id, null, null, 'PlayStation 5 Slim 1TB + 2 Controller', null, 8999000, 1, 8999000
from public.orders o
where o.order_number = 'DEMO-0002'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

insert into public.order_items (order_id, product_id, seller_id, product_name, product_image, price, qty, subtotal)
select o.id, null, null, 'Xiaomi 14T Pro 12/512GB HyperOS', null, 7999000, 1, 7999000
from public.orders o
where o.order_number = 'DEMO-0003'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

-- Kurangi stok produk saat pesanan dibuat (dipanggil backend Node.js).
create or replace function public.decrement_product_stock(product_id uuid, qty integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.products
  set stock = greatest(0, stock - qty),
      status = case when stock - qty <= 0 then 'out_of_stock' else status end,
      updated_at = now()
  where id = product_id;
end;
$$;

-- Laporan produk dari pembeli (menipu, bukan gadget, di luar topik, dll).
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  product_name text not null,
  product_image text,
  reason text not null,
  description text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_seller_id_idx on public.reports (seller_id);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_created_at_idx on public.reports (created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Reporters can read own reports" on public.reports;
create policy "Reporters can read own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Sellers can read reports for their products" on public.reports;
create policy "Sellers can read reports for their products"
  on public.reports for select
  to authenticated
  using (seller_id = auth.uid());

drop policy if exists "Reporters can create reports" on public.reports;
create policy "Reporters can create reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Rekening/kartu yang didaftarkan pembeli (Bank & Kartu di profil).
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'account', -- 'card' | 'account'
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  created_at timestamptz not null default now()
);

create index if not exists bank_accounts_user_id_idx on public.bank_accounts (user_id);

alter table public.bank_accounts enable row level security;

drop policy if exists "Users can read own bank accounts" on public.bank_accounts;
create policy "Users can read own bank accounts"
  on public.bank_accounts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own bank accounts" on public.bank_accounts;
create policy "Users can create own bank accounts"
  on public.bank_accounts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own bank accounts" on public.bank_accounts;
create policy "Users can delete own bank accounts"
  on public.bank_accounts for delete
  to authenticated
  using (user_id = auth.uid());

-- Percakapan chat antara pembeli dan penjual.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_last_read_at timestamptz not null default now(),
  seller_last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, seller_id)
);

create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations (seller_id);

-- Pesan dalam percakapan.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text,
  attachment jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Participants can create conversations" on public.conversations;
create policy "Participants can create conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- ============================================================
-- Produk "Jaya store" (seller usergrafika02@gmail.com)
-- PRA-SYARAT: akun dengan email usergrafika02@gmail.com sudah
-- ada di auth.users (buat lewat npm run seedseller, atau register
-- langsung di website lalu ubah role jadi seller, atau via Dashboard
-- Supabase Authentication > Add user).
-- Blok ini idempoten: jalankan berapa pun kali tidak membuat duplikat.
-- ============================================================

insert into public.products (seller_id, name, sku, category, description, price, stock, status, image_url)
select
  p.id,
  product.name,
  product.sku,
  product.category,
  product.description,
  product.price,
  product.stock,
  'active',
  product.image_url
from auth.users u
join public.profiles p on p.id = u.id
cross join lateral (
  values
    ('ASUS ROG Zephyrus G14 Gaming Laptop', 'EM-JST-001', 'Laptop', 'Laptop gaming premium ultra-portable 14 inci dengan layar QHD+ 165Hz untuk gaming & kreasi.', 24999000, 10, 'https://commons.wikimedia.org/wiki/Special:FilePath/ASUS%20ROG%20Zephyrus%202026-08-15%20G14.jpg'),
    ('Canon EOS R50 Mirrorless Camera', 'EM-JST-002', 'Kamera', 'Kamera mirrorless Canon EOS R50 dengan Dual Pixel CMOS AF dan video 4K30p untuk vlog & fotografi.', 11499000, 8, 'https://commons.wikimedia.org/wiki/Special:FilePath/Canon%20EOS%20R50,%20White,%203.jpg'),
    ('Apple Watch Series 9 GPS 45mm', 'EM-JST-003', 'Smart Watch', 'Apple Watch Series 9 dengan chip S9, layar Retina selalu aktif, dan pelacakan kesehatan lengkap.', 6799000, 20, 'https://commons.wikimedia.org/wiki/Special:FilePath/Apple%20Watch%20Series%209%201%202023-11-14.jpg'),
    ('Logitech MX Master 3S Wireless Mouse', 'EM-JST-004', 'Aksesoris', 'Mouse wireless premium dengan sensor 8K DPI, silent click, dan multi-device.', 1499000, 30, 'https://commons.wikimedia.org/wiki/Special:FilePath/Logitech%20MX%20Master%203S%20HS12.jpg'),
    ('Anker 737 Power Bank 24000mAh', 'EM-JST-005', 'Kabel & Charger', 'Power bank Anker 737 24000mAh dengan output 140W untuk laptop & smartphone.', 1899000, 25, 'https://commons.wikimedia.org/wiki/Special:FilePath/Anker%20power%20bank%20and%20cable.jpg'),
    ('Nintendo Switch OLED White Edition', 'EM-JST-006', 'Gaming', 'Nintendo Switch OLED White Edition dengan layar 7 inci OLED dan storage 64GB.', 4999000, 15, 'https://commons.wikimedia.org/wiki/Special:FilePath/Nintendo%20Switch%20%E2%80%93%20OLED-Modell%20mit%20gedockter%20Konsole%2020230506%20HOF01624%20RAW-Export.png?width=800'),
    ('Samsung Galaxy S24 Ultra 12/512GB', 'EM-JST-007', 'Smartphone', 'Samsung Galaxy S24 Ultra dengan S Pen, kamera 200MP, dan layar Dynamic AMOLED 2X 6.8 inci 120Hz.', 18999000, 25, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQESsGQQVqX2nRAl1g9PmyB3RJNu8B-_g34hi7fvuUNMt4lue4MQ4WDSww&s=10'),
    ('iPhone 15 Pro Max 256GB Natural Titanium', 'EM-JST-008', 'Smartphone', 'iPhone 15 Pro Max dengan desain titanium, chip A17 Pro, dan kamera 48MP ProRAW.', 20999000, 18, 'https://files.eci.id/documents/product/best/webiphone15pmt256tt/1697699185-1.webp'),
    ('Sony WH-1000XM5 Wireless Noise', 'EM-JST-009', 'Audio', 'Headphone premium dengan noise cancelling terdepan dan baterai 30 jam.', 4999000, 30, 'https://gameone.ph/media/catalog/product/mpiowebpcache/d378a0f20f83637cdb1392af8dc032a2/s/o/sony-wh-1000xm5-headset.webp'),
    ('PlayStation 5 Slim 1TB + 2 Controller', 'EM-JST-010', 'Gaming', 'Paket PlayStation 5 Slim 1TB dengan 2 DualSense controller, 4K 120Hz dan ray tracing.', 8999000, 8, 'https://commons.wikimedia.org/wiki/Special:FilePath/PlayStation%205%20and%20DualSense%20with%20transparent%20background.png'),
    ('Xiaomi 14T Pro 12/512GB HyperOS', 'EM-JST-011', 'Smartphone', 'Xiaomi 14T Pro dengan Leica camera system, snapdragon 8 Gen 3, dan charging 120W.', 7999000, 20, 'https://i02.appmifile.com/174_operator_sg/27/09/2024/b2a506bd130e53a2ff1983c074910242.jpg'),
    ('JBL Charge 5 Portable Speaker', 'EM-JST-012', 'Audio', 'Speaker portable dengan JBL Pro Sound, IP67 waterproof, dan baterai 20 jam.', 1799000, 45, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1j5Vr3_XTYp1Uc4AbdTCPRydMSESzFdcQ6yLNbK85Rg&s=10'),
    ('MacBook Air M3 13 Inch 256GB', 'EM-JST-013', 'Laptop', 'MacBook Air 13 inci dengan chip Apple M3, layar Liquid Retina, dan baterai hingga 18 jam.', 15999000, 12, 'https://macfinder.co.uk/wp-content/smush-webp/2023/02/img-MacBook-Air-13-Inch-99681-scaled-1250x1250.jpg.webp')
) as product(name, sku, category, description, price, stock, image_url)
where u.email = 'usergrafika02@gmail.com'
on conflict (seller_id, name) do update set
  sku = excluded.sku,
  category = excluded.category,
  description = excluded.description,
  price = excluded.price,
  stock = excluded.stock,
  status = 'active',
  image_url = excluded.image_url,
  updated_at = now();

-- Storage bucket "products" untuk foto produk dari dashboard seller

drop policy if exists "Public read buckets" on storage.objects;
create policy "Public read buckets"
  on storage.objects for select
  to public
  using (bucket_id in ('products', 'avatars', 'chat-files'));

drop policy if exists "Authenticated upload to products bucket" on storage.objects;
create policy "Authenticated upload to products bucket"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'products'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated update own product files" on storage.objects;
create policy "Authenticated update own product files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'products'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated delete own product files" on storage.objects;
create policy "Authenticated delete own product files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'products'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated upload to chat files bucket" on storage.objects;
create policy "Authenticated upload to chat files bucket"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated update own chat files" on storage.objects;
create policy "Authenticated update own chat files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'chat-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated delete own chat files" on storage.objects;
create policy "Authenticated delete own chat files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );