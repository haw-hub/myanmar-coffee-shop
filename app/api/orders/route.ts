import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type OrderLine = { itemId: string; quantity: number };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const orderType = body.orderType === "delivery" ? "delivery" : "pickup";
    const address = String(body.address ?? "").trim();
    const items = Array.isArray(body.items) ? body.items as OrderLine[] : [];
    if (!name || !phone || !items.length) return NextResponse.json({ error: "အမည်၊ ဖုန်းနံပါတ်နှင့် မှာယူမည့်ပစ္စည်းများ လိုအပ်ပါသည်။" }, { status: 400 });
    if (orderType === "delivery" && !address) return NextResponse.json({ error: "ပို့ဆောင်ရန် လိပ်စာ ထည့်ပေးပါ။" }, { status: 400 });
    if (items.some((item) => !item.itemId || !Number.isInteger(item.quantity) || item.quantity < 1)) return NextResponse.json({ error: "Order items မမှန်ကန်ပါ။" }, { status: 400 });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ demo: true, orderNumber: `MM-${new Date().getFullYear()}-DEMO` });
    const { data, error } = await supabase.rpc("place_order", {
      p_customer_name: name, p_customer_phone: phone, p_customer_email: String(body.email ?? ""),
      p_order_type: orderType, p_address: address,
      p_note: String(body.note ?? ""), p_delivery_fee: orderType === "delivery" ? 2000 : 0,
      p_items: items.map((item) => ({ item_id: item.itemId, qty: item.quantity })),
    });
    if (error) throw error;
    return NextResponse.json({ orderNumber: data?.order_number, trackingToken: data?.tracking_token, totalKyat: data?.total_kyat });
  } catch (error) {
    console.error("order creation failed", error);
    return NextResponse.json({ error: "မှာယူမှုကို ယခုအချိန်တွင် မပို့နိုင်သေးပါ။ ထပ်မံကြိုးစားပေးပါ။" }, { status: 500 });
  }
}
