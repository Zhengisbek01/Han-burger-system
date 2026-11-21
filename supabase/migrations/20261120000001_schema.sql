-- Qoima: SaaS для производителей продуктов питания и их магазинов
-- Мультиарендность: каждая строка привязана к company_id, доступ режется RLS.


-- ───────────── Тарифы ─────────────
create table public.plans (
  id text primary key,
  name text not null,
  price numeric(12,2) not null,           -- ₸ в месяц
  max_stores int,                          -- null = без ограничений
  max_users int,
  features jsonb not null default '[]',
  sort int not null default 0
);

insert into public.plans (id, name, price, max_stores, max_users, features, sort) values
 ('start', 'Старт', 29900, 3, 5, '["Заявки и остатки","Продажи за смену","Базовые отчёты"]', 1),
 ('biz',   'Бизнес', 79900, 10, 25, '["Всё из «Старт»","Прогноз производства","План отгрузки","Экспорт в Excel"]', 2),
 ('net',   'Сеть', 199900, null, null, '["Всё из «Бизнес»","Перераспределение излишков","API и интеграции","Персональный менеджер"]', 3);

-- ───────────── Компании (арендаторы) ─────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  bin text check (bin is null or bin ~ '^\d{12}$'),
  city text,
  plan_id text not null default 'biz' references public.plans(id),
  status text not null default 'trial' check (status in ('trial','active','overdue','blocked')),
  paid_till date not null default (current_date + 14),
  safety_pct int not null default 15 check (safety_pct between 0 and 100),
  created_at timestamptz not null default now()
);

-- ───────────── Магазины ─────────────
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, company_id)
);
create index on public.stores(company_id);

-- ───────────── Пользователи ─────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  company_id uuid references public.companies(id) on delete set null,
  role text check (role in ('owner','manager','store','superadmin')),
  store_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (store_id, company_id) references public.stores(id, company_id),
  check (role <> 'store' or store_id is not null)
);
create index on public.profiles(company_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('owner','manager','store')),
  store_id uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (store_id, company_id) references public.stores(id, company_id) on delete cascade,
  check (role <> 'store' or store_id is not null)
);
create unique index invitations_pending_email on public.invitations (lower(email)) where accepted_at is null;

-- ───────────── Продукция ─────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null default 'Прочее',
  unit text not null default 'шт',
  price numeric(12,2) not null default 0 check (price >= 0),  -- с НДС
  cost numeric(12,2) not null default 0 check (cost >= 0),
  shelf_days int not null default 1 check (shelf_days > 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, company_id)
);
create index on public.products(company_id);

-- ───────────── Остатки ─────────────
create table public.warehouse_stock (
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null,
  qty numeric(12,2) not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id),
  foreign key (product_id, company_id) references public.products(id, company_id) on delete cascade
);

create table public.store_stock (
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null,
  product_id uuid not null,
  qty numeric(12,2) not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (store_id, product_id),
  foreign key (store_id, company_id) references public.stores(id, company_id) on delete cascade,
  foreign key (product_id, company_id) references public.products(id, company_id) on delete cascade
);
create index on public.store_stock(company_id);

-- ───────────── Смены (продажи) ─────────────
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null,
  shift_date date not null,
  total numeric(14,2) not null default 0,
  comment text,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (store_id, shift_date),
  foreign key (store_id, company_id) references public.stores(id, company_id) on delete cascade
);
create index on public.shifts(company_id, shift_date);

create table public.shift_items (
  shift_id uuid not null references public.shifts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null,
  shift_date date not null,
  product_id uuid not null,
  qty numeric(12,2) not null check (qty >= 0),
  price numeric(12,2) not null,
  primary key (shift_id, product_id),
  foreign key (store_id, company_id) references public.stores(id, company_id) on delete cascade,
  foreign key (product_id, company_id) references public.products(id, company_id) on delete cascade
);
create index on public.shift_items(company_id, shift_date);

-- ───────────── Заявки ─────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null,
  status text not null default 'new' check (status in ('new','confirmed','assembling','transit','delivered','cancelled')),
  delivery_date date not null default (current_date + 1),
  delivery_slot text,
  comment text,
  courier text,
  eta text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (store_id, company_id) references public.stores(id, company_id) on delete cascade
);
create index on public.orders(company_id, created_at desc);

create table public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null,
  qty numeric(12,2) not null check (qty > 0),
  price numeric(12,2) not null,
  primary key (order_id, product_id),
  foreign key (product_id, company_id) references public.products(id, company_id) on delete cascade
);
create index on public.order_items(company_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null,
  actor uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.order_events(order_id);
