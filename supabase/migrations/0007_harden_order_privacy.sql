-- Production privacy hardening.
-- Customers can create an order and check only their own order via its secret tracking token.
-- The admin API uses the service-role key and is not affected by these policies.

drop policy if exists "Orders read all" on public.orders;
drop policy if exists "Order items read all" on public.order_items;
drop policy if exists "Order status history read all" on public.order_status_history;

-- Functions are not callable by every database role by default; grant only the roles the site needs.
revoke execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric) from public;
revoke execute on function public.get_order_status(text, uuid) from public;

grant execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric) to anon, authenticated;
grant execute on function public.get_order_status(text, uuid) to anon, authenticated;
