-- Give every order an unguessable customer tracking token.
alter table public.orders add column if not exists tracking_token uuid default uuid_generate_v4();
update public.orders set tracking_token = uuid_generate_v4() where tracking_token is null;
alter table public.orders alter column tracking_token set not null;
create unique index if not exists idx_orders_tracking_token on public.orders(tracking_token);

create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_customer_email text default '',
  p_order_type order_type default 'pickup',
  p_address text default '',
  p_note text default '',
  p_delivery_fee numeric default 0
) returns jsonb language plpgsql security definer as $$
declare
  v_order_id uuid; v_order_number text; v_subtotal numeric := 0; v_line_total numeric;
  v_item record; v_total numeric; v_stock int; v_customer_id uuid; v_customer_name text := p_customer_name;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;
  select id into v_customer_id from public.customers where phone = p_customer_phone limit 1;
  if v_customer_id is null then
    insert into public.customers (name, phone, email) values (v_customer_name, p_customer_phone, p_customer_email)
    returning id into v_customer_id;
  else
    update public.customers set name = v_customer_name, email = coalesce(p_customer_email, email) where id = v_customer_id;
  end if;
  select public.next_order_number() into v_order_number;
  for v_item in select * from jsonb_to_recordset(p_items) as x(item_id uuid, qty int) loop
    if v_item.qty <= 0 then raise exception 'Invalid quantity for item %', v_item.item_id; end if;
    select price_kyat, stock into v_line_total, v_stock from public.items where id = v_item.item_id and is_available = true;
    if v_line_total is null then raise exception 'Item % is not available', v_item.item_id; end if;
    if v_stock < v_item.qty then raise exception 'Insufficient stock for item %', v_item.item_id; end if;
    v_subtotal := v_subtotal + (v_line_total * v_item.qty);
  end loop;
  v_total := v_subtotal + p_delivery_fee;
  insert into public.orders (order_number, customer_id, status, order_type, customer_name, customer_phone, customer_email, address, note, subtotal_kyat, delivery_fee, total_kyat, payment_method)
  values (v_order_number, v_customer_id, 'pending', p_order_type, v_customer_name, p_customer_phone, p_customer_email, p_address, p_note, v_subtotal, p_delivery_fee, v_total, 'cod')
  returning id into v_order_id;
  for v_item in select * from jsonb_to_recordset(p_items) as x(item_id uuid, qty int) loop
    insert into public.order_items (order_id, item_id, name_my, name_en, qty, unit_price_kyat, line_total_kyat)
    select v_order_id, v_item.item_id, name_my, name_en, v_item.qty, price_kyat, price_kyat * v_item.qty from public.items where id = v_item.item_id;
    update public.items set stock = stock - v_item.qty where id = v_item.item_id;
  end loop;
  insert into public.order_status_history (order_id, status) values (v_order_id, 'pending');
  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'tracking_token', (select tracking_token from public.orders where id = v_order_id), 'total_kyat', v_total);
end $$;

-- The token is required, so an order status cannot be guessed from its number.
create or replace function public.get_order_status(p_order_number text, p_tracking_token uuid)
returns jsonb language sql security definer as $$
  select jsonb_build_object('order_number', order_number, 'status', status, 'order_type', order_type, 'total_kyat', total_kyat, 'created_at', created_at)
  from public.orders where order_number = p_order_number and tracking_token = p_tracking_token;
$$;

grant execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric) to anon, authenticated;
grant execute on function public.get_order_status(text, uuid) to anon, authenticated;
