import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fallbackCategories, fallbackItems } from "@/lib/menu";

const demoOrders = [
  { id: "demo-1", order_number: "MM-2026-0042", customer_name: "မသီရိ", customer_phone: "09 778 123 456", status: "preparing", order_type: "delivery", total_kyat: 11200, created_at: "2026-08-22T08:10:00Z" },
  { id: "demo-2", order_number: "MM-2026-0041", customer_name: "Ko Aung", customer_phone: "09 420 555 123", status: "ready", order_type: "pickup", total_kyat: 7600, created_at: "2026-08-22T07:45:00Z" },
  { id: "demo-3", order_number: "MM-2026-0040", customer_name: "မခင်", customer_phone: "09 969 224 885", status: "delivered", order_type: "delivery", total_kyat: 15400, created_at: "2026-08-21T15:20:00Z" },
];
const demoMenu = fallbackItems.map((item, index) => ({ ...item, stock: 25 - index, is_available: true }));

function authorized(request: Request) {
  const key = process.env.ADMIN_ACCESS_KEY;
  return !key || request.headers.get("authorization") === `Bearer ${key}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "စီမံခန့်ခွဲသူ အတည်ပြုချက် မမှန်ကန်ပါ။" }, { status: 401 });
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ demo: true, orders: demoOrders, menu: demoMenu, categories: fallbackCategories, stats: { todayOrders: 12, todayRevenue: 68400, pending: 3, menuItems: 10 } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [{ data: orders, error }, { data: menu, error: menuError }, { data: categories }, { count: menuItems }] = await Promise.all([
    supabase.from("orders").select("id, order_number, customer_name, customer_phone, status, order_type, total_kyat, created_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("items").select("id, category_id, name_my, name_en, desc_my, desc_en, price_kyat, emoji, tag_my, tag_en, stock, is_available").order("sort_order"),
    supabase.from("categories").select("id, name_my, name_en").order("sort_order"),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("is_available", true),
  ]);
  if (error || menuError) return NextResponse.json({ error: "Dashboard data ကို မဖတ်နိုင်သေးပါ။" }, { status: 500 });
  const todayOrders = (orders ?? []).filter((order) => new Date(order.created_at) >= today);
  return NextResponse.json({ demo: false, orders: orders ?? [], menu: menu ?? [], categories: categories ?? [], stats: { todayOrders: todayOrders.length, todayRevenue: todayOrders.reduce((sum, order) => sum + Number(order.total_kyat), 0), pending: (orders ?? []).filter((order) => order.status === "pending").length, menuItems: menuItems ?? 0 } });
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "စီမံခန့်ခွဲသူ အတည်ပြုချက် မမှန်ကန်ပါ။" }, { status: 401 });
  const body = await request.json();
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ demo: true });
  if (body.action === "order-status") {
    const statuses = ["pending", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
    if (!body.id || !statuses.includes(body.status)) return NextResponse.json({ error: "Order status မမှန်ကန်ပါ။" }, { status: 400 });
    const { error } = await supabase.from("orders").update({ status: body.status }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Order status ကို မပြင်နိုင်သေးပါ။" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "menu-stock") {
    const stock = Number(body.stock);
    if (!body.id || !Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "Stock အရေအတွက် မမှန်ကန်ပါ။" }, { status: 400 });
    const { error } = await supabase.from("items").update({ stock, is_available: stock > 0 }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Stock ကို မပြင်နိုင်သေးပါ။" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action မမှန်ကန်ပါ။" }, { status: 400 });
}
