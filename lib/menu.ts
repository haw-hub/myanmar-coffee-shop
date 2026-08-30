export type Category = { id: string; name_my: string; name_en: string };
export type MenuItem = {
  id: string; category_id: string; name_my: string; name_en: string; desc_my: string;
  desc_en: string; price_kyat: number; emoji: string; tag_my: string; tag_en: string; stock: number; is_available: boolean;
};

export const fallbackCategories: Category[] = [
  { id: "coffee", name_my: "ကော်ဖီ", name_en: "Coffee" },
  { id: "tea", name_my: "လက်ဖက်ရည်", name_en: "Tea" },
  { id: "snack", name_my: "အဆာစာ", name_en: "Snacks" },
  { id: "dessert", name_my: "အချိုပွဲ", name_en: "Desserts" },
];

export const fallbackItems: MenuItem[] = [
  ["latte","coffee","မြန်မာရိုးရာ Latte","Myanmar Traditional Latte","ပျားရည်နှင့် caramel အရသာသိမ်မွေ့သော ရှမ်းကော်ဖီ","Honey & caramel notes from Shan coffee",3600,"☕","အထူး","Signature"],
  ["espresso","coffee","ရှမ်းကုန်းမြင့် Espresso","Shan Highlands Espresso","တောက်ပပြီး citrus အရသာ","Bright, floral, citrus",3000,"☕","",""],
  ["mocha","coffee","ရခိုင် Mocha","Rakhine Mocha","ဒေသထွက် ကိုကိုးဖြင့်ဖျော်ထားသော espresso","Espresso with local cocoa",4000,"🍫","",""],
  ["cold-brew","coffee","Cold Brew","Cold Brew","၁၄ နာရီကြာ အေးစိမ်ထားသော ကော်ဖီ","Smooth 14-hour cold steep",5000,"🧊","",""],
  ["milk-tea","tea","မြန်မာအစဉ်အလာ လက်ဖက်ရည်","Myanmar Milk Tea","ချိုချိုမွှေးမွှေး ရိုးရာအရသာ","Layered sweet & creamy classic",2000,"🍵","",""],
  ["lemon-tea","tea","Hibiscus သံပယိုလက်ဖက်ရည်","Hibiscus Lemon Tea","လန်းဆန်းသည့် အေးဖျော်ရည်","Refreshing cold herbal tea",2500,"🍹","",""],
  ["mohinga","snack","မုန့်ဟင်းခါး","Mohinga","မြန်မာ့ရိုးရာ ငါးရည်စိမ်ခေါက်ဆွဲ","Myanmar's classic fish vermicelli soup",2500,"🍜","ဒေသအကြိုက်","Local favourite"],
  ["laphet","snack","လက်ဖက်သုပ်","Laphet Thoke","ကြွပ်ကြွပ်ရွရွနှင့် ချဉ်ငံစပ်အရသာ","Crunchy, savoury tea leaf salad",3000,"🥬","",""],
  ["shwe-yin-aye","dessert","ရွှေရင်အေး","Shwe Yin Aye","အုန်းသီးနုနှင့် sago အချိုပွဲ","Young coconut and sago",2500,"🥥","",""],
  ["cheesecake","dessert","ချိစ်ကိတ်","Cheesecake","အိမ်တွင်းလုပ် creamy cheesecake","House-made creamy cheesecake",4500,"🍰","",""],
].map(([id, category_id, name_my, name_en, desc_my, desc_en, price_kyat, emoji, tag_my, tag_en]) => ({
  id: String(id), category_id: String(category_id), name_my: String(name_my), name_en: String(name_en), desc_my: String(desc_my), desc_en: String(desc_en), price_kyat: Number(price_kyat), emoji: String(emoji), tag_my: String(tag_my), tag_en: String(tag_en), stock: 20, is_available: true,
}));
