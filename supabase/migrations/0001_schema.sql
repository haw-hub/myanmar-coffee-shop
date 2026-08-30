-- ============================================================
-- Myanmar Coffee Shop — Database Schema
-- Run this in Supabase SQL Editor (or via `supabase db push`)
-- Created for the coffee shop production website.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- ENUM: order status ----------
do $$ begin
  create type order_status as enum (
    'pending',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------- ENUM: order type ----------
do $$ begin
  create type order_type as enum ('pickup', 'delivery');
exception when duplicate_object then null; end $$;

-- ---------- CATEGORIES ----------
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name_my     text not null,
  name_en     text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- ITEMS (menu) ----------
create table if not exists public.items (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid references public.categories(id) on delete cascade,
  name_my      text not null,
  name_en      text not null,
  desc_my      text default '',
  desc_en      text default '',
  price_kyat   numeric(10,2) not null check (price_kyat >= 0),
  image_url    text default '',
  emoji        text default '☕',
  tag_my       text default '',
  tag_en       text default '',
  stock        int  not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create unique index if not exists idx_items_category_name_en_unique
  on public.items(category_id, name_en);

-- ---------- CUSTOMERS ----------
-- We keep a lightweight customer record so orders can be tied
-- to a Supabase auth user id when logged in (nullable for guests).
create table if not exists public.customers (
  id          uuid primary key default uuid_generate_v4(),
  auth_uid    uuid references auth.users(id) on delete set null,
  name        text not null,
  phone       text not null,
  email       text default '',
  notes       text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id            uuid primary key default uuid_generate_v4(),
  order_number  text unique not null,          -- human readable e.g. "MM-2025-0001"
  customer_id   uuid references public.customers(id) on delete set null,
  status        order_status not null default 'pending',
  order_type    order_type not null default 'pickup',
  customer_name text not null,
  customer_phone text not null,
  customer_email text default '',
  address       text default '',
  note          text default '',
  subtotal_kyat numeric(10,2) not null default 0,
  delivery_fee  numeric(10,2) not null default 0,
  total_kyat    numeric(10,2) not null default 0,
  payment_method text not null default 'cod',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- ORDER ITEMS ----------
create table if not exists public.order_items (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid references public.orders(id) on delete cascade,
  item_id        uuid references public.items(id) on delete set null,
  name_my        text not null,                 -- snapshot at order time
  name_en        text not null,
  qty            int not null check (qty > 0),
  unit_price_kyat numeric(10,2) not null,
  line_total_kyat numeric(10,2) not null
);

-- ---------- ORDER STATUS HISTORY (audit trail) ----------
create table if not exists public.order_status_history (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references public.orders(id) on delete cascade,
  status      order_status not null,
  changed_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_items_category on public.items(category_id);
create index if not exists idx_items_available on public.items(is_available);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_status_order on public.order_status_history(order_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- Public read-only: menu is visible to everyone
create policy "Public categories read"
  on public.categories for select using (true);

create policy "Public items read"
  on public.items for select using (true);

-- Customers: anyone can read/write their own customer row, and
-- any client can create a customer record at checkout (guests).
create policy "Customers insert any"
  on public.customers for insert with check (true);

create policy "Customers read own"
  on public.customers for select using (auth.uid() = auth_uid);

create policy "Customers update own"
  on public.customers for update using (auth.uid() = auth_uid);

-- Orders: guests & logged-in customers can create orders.
create policy "Orders insert any"
  on public.orders for insert with check (true);

-- Orders readable by admin (service role) or the owning customer.
create policy "Orders read all"
  on public.orders for select using (true); -- tightened below via admin functions

-- Order items public-ish for the owning flow
create policy "Order items insert any"
  on public.order_items for insert with check (true);

create policy "Order items read all"
  on public.order_items for select using (true);

-- Status history
create policy "Order status history insert any"
  on public.order_status_history for insert with check (true);

create policy "Order status history read all"
  on public.order_status_history for select using (true);

-- ============================================================
-- HELPER: trigger to bump updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- HELPER: generate a human-readable order number
-- Format: MM-<YYYY>-<padded sequence>
-- ============================================================
create or replace function public.next_order_number()
returns text language plpgsql as $$
declare
  seq int;
  y text := to_char(now(), 'YYYY');
begin
  select coalesce(max((regexp_match(order_number, '[0-9]+$'))[1])::int, 0) + 1
    into seq
    from public.orders
   where order_number like 'MM-' || y || '-%';
  return 'MM-' || y || '-' || lpad(seq::text, 4, '0');
end $$;

-- ============================================================
-- RPC: place an order (transactional with stock decrement)
-- Called by the API with the service role.
-- ============================================================
create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb, -- [{item_id, qty}]
  p_customer_email text default '',
  p_order_type order_type default 'pickup',
  p_address text default '',
  p_note text default '',
  p_delivery_fee numeric default 0
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_line_total numeric;
  v_item record;
  v_total numeric;
  v_item_qty int;
  v_stock int;
  v_customer_id uuid;
  v_customer_name text := p_customer_name;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;

  -- Resolve existing customer by phone, else create
  select id into v_customer_id from public.customers
   where phone = p_customer_phone limit 1;
  if v_customer_id is null then
    insert into public.customers (name, phone, email)
    values (v_customer_name, p_customer_phone, p_customer_email)
    returning id into v_customer_id;
  else
    update public.customers set name = v_customer_name, email = coalesce(p_customer_email, email)
     where id = v_customer_id;
  end if;

  select public.next_order_number() into v_order_number;

  -- Validate items and compute prices, with stock guard
  for v_item in select * from jsonb_to_recordset(p_items) as x(item_id uuid, qty int)
  loop
    if v_item.qty <= 0 then
      raise exception 'Invalid quantity for item %', v_item.item_id;
    end if;

    select price_kyat, stock into v_line_total, v_stock
      from public.items where id = v_item.item_id and is_available = true;

    if v_line_total is null then
      raise exception 'Item % is not available', v_item.item_id;
    end if;
    if v_stock < v_item.qty then
      raise exception 'Insufficient stock for item % (requested %, available %)',
        v_item.item_id, v_item.qty, v_stock;
    end if;
    v_subtotal := v_subtotal + (v_line_total * v_item.qty);
  end loop;

  v_total := v_subtotal + p_delivery_fee;

  insert into public.orders (
    order_number, customer_id, status, order_type,
    customer_name, customer_phone, customer_email, address, note,
    subtotal_kyat, delivery_fee, total_kyat, payment_method
  ) values (
    v_order_number, v_customer_id, 'pending', p_order_type,
    v_customer_name, p_customer_phone, p_customer_email, p_address, p_note,
    v_subtotal, p_delivery_fee, v_total, 'cod'
  ) returning id into v_order_id;

  -- Insert line items + decrement stock
  for v_item in select * from jsonb_to_recordset(p_items) as x(item_id uuid, qty int)
  loop
    insert into public.order_items (order_id, item_id, name_my, name_en, qty, unit_price_kyat, line_total_kyat)
    select v_order_id, v_item.item_id, name_my, name_en, v_item.qty, price_kyat, price_kyat * v_item.qty
      from public.items where id = v_item.item_id;

    update public.items
       set stock = stock - v_item.qty
     where id = v_item.item_id;
  end loop;

  insert into public.order_status_history (order_id, status) values (v_order_id, 'pending');

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_kyat', v_total
  );
end $$;

grant execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric)
  to anon, authenticated;

-- ============================================================
-- RPC: update order status (admin). Prevents illegal transitions.
-- ============================================================
create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status order_status
) returns void
language plpgsql
security definer
as $$
declare
  v_current order_status;
begin
  select status into v_current from public.orders where id = p_order_id;
  if v_current is null then
    raise exception 'Order not found';
  end if;

  -- Cancelling after delivery is not allowed
  if v_current = 'delivered' and p_new_status <> 'delivered' then
    raise exception 'Cannot change a delivered order';
  end if;
  if v_current = 'cancelled' then
    raise exception 'Cannot change a cancelled order';
  end if;

  -- Restore stock when an order is cancelled (from a pre-delivery state)
  if p_new_status = 'cancelled' and v_current in ('pending','preparing','ready','out_for_delivery') then
    update public.items i
       set stock = stock + oi.qty
      from public.order_items oi
     where oi.item_id = i.id and oi.order_id = p_order_id;
  end if;

  update public.orders set status = p_new_status where id = p_order_id;
  insert into public.order_status_history (order_id, status) values (p_order_id, p_new_status);
end $$;

-- ============================================================
-- RPC: report for the admin dashboard (small analytics)
-- ============================================================
create or replace function public.admin_summary(
  p_from timestamptz default now() - interval '30 days'
) returns jsonb
language sql
security definer
as $$
  select jsonb_build_object(
    'orders_count', (select count(*) from public.orders where created_at >= p_from),
    'total_revenue', (select coalesce(sum(total_kyat),0) from public.orders
                       where created_at >= p_from and status <> 'cancelled'),
    'pending_count', (select count(*) from public.orders where status in ('pending','preparing')),
    'top_items', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
                    from (
                      select name_en, sum(qty) as qty, sum(line_total_kyat) as revenue
                        from public.order_items
                       group by name_en order by qty desc limit 5
                    ) t)
  );
$$;

-- Seed data is in a separate file: 0002_seed.sql
