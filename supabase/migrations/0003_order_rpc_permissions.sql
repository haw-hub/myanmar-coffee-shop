-- Guest checkout calls this security-definer RPC with a browser-safe key.
grant execute on function public.place_order(text, text, jsonb, text, order_type, text, text, numeric)
  to anon, authenticated;
