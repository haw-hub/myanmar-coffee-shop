-- Prevent overselling when two customers check out at the same time.
-- Each menu row is locked while its stock is checked and decremented.

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
  v_order_id uuid; v_order_number text; v_subtotal numeric := 0; v_unit_price numeric;
  v_item record; v_total numeric; v_stock int; v_customer_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;

  -- Group duplicated ids before checking stock; process in a stable order to avoid lock contention.
  for v_item in
    select item_id, sum(qty)::int as qty
    from jsonb_to_recordset(p_items) as x(item_id uuid, qty int)
    group by item_id order by item_id
  loop
    if v_item.item_id is null or v_item.qty is null or v_item.qty <= 0 then
      raise exception 'Invalid order item';
    end if;
    select price_kyat, stock into v_unit_price, v_stock
      from public.items
      where id = v_item.item_id and is_available = true
      for update;
    if v_unit_price is null then raise exception 'Item % is not available', v_item.item_id; end if;
    if v_stock < v_item.qty then raise exception 'Insufficient stock for item %', v_item.item_id; end if;
    v_subtotal := v_subtotal + (v_unit_price * v_item.qty);
  end loop;

  select id into v_customer_id from public.customers where phone = p_customer_phone limit 1;
  if v_customer_id is null then
    insert into public.customers (name, phone, email) values (p_customer_name, p_customer_phone, p_customer_email)
    returning id into v_customer_id;
  else
    update public.customers set name = p_customer_name, email = coalesce(p_customer_email, email) where id = v_customer_id;
  end if;

  select public.next_order_number() into v_order_number;
  v_total := v_subtotal + p_delivery_fee;
  insert into public.orders (order_number, customer_id, status, order_type, customer_name, customer_phone, customer_email, address, note, subtotal_kyat, delivery_fee, total_kyat, payment_method)
  values (v_order_number, v_customer_id, 'pending', p_order_type, p_customer_name, p_customer_phone, p_customer_email, p_address, p_note, v_subtotal, p_delivery_fee, v_total, 'cod')
  returning id into v_order_id;

  for v_item in
    select item_id, sum(qty)::int as qty
    from jsonb_to_recordset(p_items) as x(item_id uuid, qty int)
    group by item_id order by item_id
  loop
    insert into public.order_items (order_id, item_id, name_my, name_en, qty, unit_price_kyat, line_total_kyat)
    select v_order_id, id, name_my, name_en, v_item.qty, price_kyat, price_kyat * v_item.qty
    from public.items where id = v_item.item_id;

    update public.items
      set stock = stock - v_item.qty,
          is_available = case when stock - v_item.qty <= 0 then false else is_available end
      where id = v_item.item_id;
  end loop;

  insert into public.order_status_history (order_id, status) values (v_order_id, 'pending');
  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'tracking_token', (select tracking_token from public.orders where id = v_order_id),
    'total_kyat', v_total
  );
end $$;

revoke execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric) from public;
grant execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric) to anon, authenticated;
