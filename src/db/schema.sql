-- PostgreSQL schema (mínimo)

-- Requiere extensión para UUID si no existe
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text null,
  password_hash text not null,
  role text not null check (role in ('root','admin','user')),
  created_at timestamptz not null default now()
);

-- Evolución (idempotente)
alter table users add column if not exists phone text;

do $$
begin
  -- Actualizar constraint de role si el schema previo no incluía 'admin'
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'users'
      and c.conname = 'users_role_check'
  ) then
    alter table users drop constraint users_role_check;
    alter table users add constraint users_role_check check (role in ('root','admin','user'));
  end if;
end
$$;

-- Mensajes de contacto (PII cifrada)
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'consulta',
  pii_encrypted text not null,
  created_at timestamptz not null default now()
);

-- Auditoría básica de login (intentos)
create table if not exists auth_audit (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text not null default '',
  user_agent text not null default '',
  success boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  image_url text null,
  template text not null default 'simple',
  featured boolean not null default false,
  media jsonb not null default '[]'::jsonb,
  link text not null default '',
  source text not null default 'admin',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Evolución (idempotente)
alter table news_posts add column if not exists template text not null default 'simple';
alter table news_posts add column if not exists media jsonb not null default '[]'::jsonb;
alter table news_posts add column if not exists featured boolean not null default false;

create table if not exists news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rss_url text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists news_sources_rss_url_uq on news_sources (rss_url);

-- Novedades carousel (editable from Admin)
create table if not exists news_carousel_slides (
  id uuid primary key default gen_random_uuid(),
  position int not null,
  image_url text not null,
  title text not null default '',
  text text not null default '',
  link text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists news_carousel_slides_position_uq on news_carousel_slides (position);

-- Home hero carousel (editable from Admin)
create table if not exists home_hero_slides (
  id uuid primary key default gen_random_uuid(),
  position int not null,
  image_url text not null,
  title text not null default '',
  text text not null default '',
  link text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists home_hero_slides_position_uq on home_hero_slides (position);

-- Analytics: page views (ingresos/visitas)
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at desc);
create index if not exists page_views_path_idx on page_views (path);

-- Reseñas (moderadas): clientes envían, admin aprueba
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null check (rating between 1 and 5),
  message text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz null
);

create index if not exists reviews_status_created_at_idx on reviews (status, created_at desc);
create index if not exists reviews_approved_at_idx on reviews (approved_at desc);

-- E-commerce: Products catalog
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null check (category in ('calzado','pantalones','remeras','vestidos','buzos','ropa_interior')),
  price decimal(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  images jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);
create index if not exists products_featured_idx on products (featured) where featured = true;
create index if not exists products_active_idx on products (active) where active = true;

-- E-commerce: Shopping cart
create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  size text not null default '',
  color text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cart_items_user_product_size_color_uq on cart_items (user_id, product_id, size, color);
create index if not exists cart_items_user_id_idx on cart_items (user_id);

-- E-commerce: Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  total decimal(10,2) not null check (total >= 0),
  shipping_name text not null,
  shipping_email text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_department text not null,
  shipping_postal_code text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_at_idx on orders (created_at desc);

-- E-commerce: Order items
-- Note: product_name and product_price are snapshot values at time of order.
-- product_id uses ON DELETE RESTRICT to prevent accidental product deletion;
-- admin routes handle this by soft-deleting products (setting active=false) when they have orders.
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  product_price decimal(10,2) not null check (product_price >= 0),
  quantity int not null check (quantity > 0),
  size text not null default '',
  color text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on order_items (order_id);
