-- ============================================================
-- Seed data — sample menu for the coffee shop
-- Run after 0001_schema.sql
-- ============================================================

-- ---------- Categories ----------
insert into public.categories (slug, name_my, name_en, sort_order) values
  ('coffee', 'ကော်ဖီ', 'Coffee', 1),
  ('tea',    'လက်ဖက်ရည်', 'Tea', 2),
  ('snack',  'အဆာစာ', 'Snacks', 3),
  ('dessert', 'အချိုပွဲ', 'Desserts', 4)
on conflict (slug) do nothing;

-- ---------- Items ----------
insert into public.items
  (category_id, name_my, name_en, desc_my, desc_en, price_kyat, emoji, tag_my, tag_en, stock, is_available, sort_order)
select c.id, v.name_my, v.name_en, v.desc_my, v.desc_en, v.price_kyat, v.emoji, v.tag_my, v.tag_en, v.stock, true, v.sort_order
from public.categories c
join (values
  -- Coffee
  ('coffee','မြန်မာရိုးရာ လဠတ်','Myanmar Traditional Latte','လတ်ဆတ်စွာ လှော်ထားသော ရှမ်းကော်ဖီစေ့ဖြင့် အရသာသိမ်မွေ့','Locally roasted honey & caramel notes',3600,'☕','အထူး','Signature',50,1),
  ('coffee','ရှမ်းကုန်းမြင့် Espresso','Shan Highlands Espresso','တောက်ပပြီး citrus အရသာ','Bright, floral, citrus',3000,'☕','','',50,2),
  ('coffee','ရခိုင် Mocha','Rakhine Mocha','Espresso + ဒေသထွက် ကိုကိုး','Espresso + local cocoa',4000,'🍫','','',40,3),
  ('coffee','Oat Latte','Oat Latte','Creamy espresso, နို့မပါ','Creamy espresso, dairy-free',4200,'🥛','','',30,4),
  ('coffee','Cold Brew','Cold Brew','အေးချမ်းစွာ ၁၄နာရီ စိမ်ထား','Smooth 14-hour cold steep',5000,'🧊','','',20,5),
  ('coffee','Cappuccino','Cappuccino','အဆင့်မြင့် espresso + နို့အမြှုပ်','Rich espresso + velvety foam',3800,'☕','','',40,6),
  -- Tea
  ('tea','မြန်မာအစဉ်အလာ လက်ဖက်ရည်','Myanmar Milk Tea','ချိုချိုမွှေးမွှေး အလွှာလိုက်','Layered sweet & creamy classic',2000,'🍵','','',60,1),
  ('tea','Hibiscus / သံပယိုလက်ဖက်ရည်','Hibiscus / Lemon Tea','အေးမြအချိုရည်','Refreshing cold herbal',2500,'🍹','','',30,2),
  -- Snacks
  ('snack','မုန့်ဟင်းခါး','Mohinga','အမျိုးသားအဆာပြာ — ငါးရည်တစ်စွပ်ပြာ','National gem — fish vermicelli soup',2500,'🍜','ဒေသအကြိုက်','Local fav',40,1),
  ('snack','ပေါင်မုန့်အိတ်ကပ်','Beauty Snack Set','လက်ဖက်သုပ် + အနံ့ပြင်း','Laphet + crunchy sides',3000,'🥬','','',30,2),
  ('snack','ပေါင်မုန့်နှစ်','Fried Tofu & Pea','ချဉ်ရည်နှင့် စားရသည့်','With tangy dip',1500,'🍢','','',30,3),
  -- Dessert
  ('dessert','Shwe Yin Aye','Shwe Yin Aye','အုန်းအိုဗွာနဲ့ sago','Young coconut & sago',2500,'🥥','','',20,1),
  ('dessert','Mont Let Saung','Mont Let Saung','Pandan + အုန်းချို','Pandan & coconut sweet',2000,'🥣','','',20,2),
  ('dessert','ဒိန်ချဉ်','Cheesecake','ချိစ်မွှေး အိမ်တွင်းလုပ်','House-made creamy cheesecake',4500,'🍰','','',15,3)
) as v(slug, name_my, name_en, desc_my, desc_en, price_kyat, emoji, tag_my, tag_en, stock, sort_order)
on c.slug = v.slug
on conflict (category_id, name_en) do nothing;
