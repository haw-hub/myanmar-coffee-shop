import { NextResponse } from "next/server";
import { fallbackCategories, fallbackItems } from "@/lib/menu";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ categories: fallbackCategories, items: fallbackItems, source: "demo" });

  const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
    supabase.from("categories").select("id, name_my, name_en").order("sort_order"),
    supabase.from("items").select("id, category_id, name_my, name_en, desc_my, desc_en, price_kyat, emoji, tag_my, tag_en, stock, is_available").order("sort_order"),
  ]);
  if (categoryError || itemError) {
    console.error("menu loading failed", categoryError ?? itemError);
    return NextResponse.json({ error: "Live menu ကို ယခု မဖတ်နိုင်သေးပါ။ ထပ်မံကြိုးစားပေးပါ။" }, { status: 502 });
  }
  return NextResponse.json({ categories, items, source: "supabase" });
}
