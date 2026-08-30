"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fallbackCategories, fallbackItems, type Category, type MenuItem } from "@/lib/menu";
import { createBrowserClient } from "@/lib/supabase/browser";
import { isProductOrderable } from "@/lib/availability";

type CartLine = MenuItem & { quantity: number };
type TrackedOrder = { orderNumber: string; trackingToken: string; status: string; totalKyat?: number };
const money = (value: number) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;
const orderStatusLabels: Record<string, string> = { pending: "မှာယူမှု လက်ခံရရှိပြီး", preparing: "ပြင်ဆင်နေပါသည်", ready: "လာယူနိုင်ပါပြီ", out_for_delivery: "ပို့ဆောင်နေပါသည်", delivered: "ပို့ပြီးပါပြီ", cancelled: "ပယ်ဖျက်ထားသည်" };

export default function CoffeeShop() {
  const [language, setLanguage] = useState<"my" | "en">("my");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [items, setItems] = useState<MenuItem[]>(fallbackItems);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [message, setMessage] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    const saved = window.localStorage.getItem("coffee-last-order");
    if (saved) { try { setTrackedOrder(JSON.parse(saved)); } catch { window.localStorage.removeItem("coffee-last-order"); } }
  }, []);
  useEffect(() => {
    if (!trackedOrder) return;
    const refreshStatus = async () => {
      const { data } = await createBrowserClient().rpc("get_order_status", { p_order_number: trackedOrder.orderNumber, p_tracking_token: trackedOrder.trackingToken });
      if (data?.status) setTrackedOrder((current) => current ? { ...current, status: data.status, totalKyat: Number(data.total_kyat) } : null);
    };
    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 10000);
    return () => window.clearInterval(timer);
  }, [trackedOrder?.orderNumber, trackedOrder?.trackingToken]);
  useEffect(() => {
    if (trackedOrder) window.localStorage.setItem("coffee-last-order", JSON.stringify(trackedOrder));
  }, [trackedOrder]);
  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch("/api/menu");
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.categories) || !Array.isArray(data.items)) throw new Error("Server menu unavailable");
        setCategories(data.categories); setItems(data.items);
      } catch {
        const client = createBrowserClient();
        const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
          client.from("categories").select("id, name_my, name_en").order("sort_order"),
          client.from("items").select("id, category_id, name_my, name_en, desc_my, desc_en, price_kyat, emoji, tag_my, tag_en, stock, is_available").order("sort_order"),
        ]);
        if (categoryError || itemError || !categories || !items) { console.error("Browser live menu loading failed", categoryError ?? itemError); setMessage("Live menu ကို မဖတ်နိုင်သေးပါ။ Internet connection ကိုစစ်ပေးပါ။"); return; }
        setCategories(categories); setItems(items.map((item) => ({ ...item, price_kyat: Number(item.price_kyat) })));
      }
    }
    void loadMenu();
    const timer = window.setInterval(() => void loadMenu(), 10000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setCart((current) => {
      const next = current.flatMap((line) => {
        const latest = items.find((item) => item.id === line.id);
        if (!latest || !isProductOrderable(latest)) return [];
        const quantity = Math.min(line.quantity, latest.stock);
        if (quantity === line.quantity && line.stock === latest.stock && line.is_available === latest.is_available) return [line];
        return [{ ...line, ...latest, quantity }];
      });
      return next.length === current.length && next.every((line, index) => line === current[index]) ? current : next;
    });
  }, [items]);
  const filtered = category === "all" ? items : items.filter((item) => item.category_id === category);
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price_kyat * item.quantity, 0);
  const words = useMemo(() => language === "my" ? {
    menu: "မီနူး", cart: "ခြင်းတောင်း", add: "ခြင်းတောင်းထဲထည့်", checkout: "မှာယူမည်", empty: "ခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိသေးပါ", total: "စုစုပေါင်း", home: "ပင်မ", story: "အကြောင်း", visit: "တည်နေရာ", all: "အားလုံး"
  } : { menu: "Menu", cart: "Cart", add: "Add to cart", checkout: "Checkout", empty: "Your cart is empty.", total: "Total", home: "Home", story: "Our story", visit: "Visit", all: "All" }, [language]);

  function add(item: MenuItem) {
    if (!isProductOrderable(item)) { setMessage("ဤပစ္စည်း လက်ရှိကုန်သွားပါပြီ။"); return; }
    setCart((current) => {
      const match = current.find((line) => line.id === item.id);
      if (match && match.quantity >= item.stock) return current;
      return match ? current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { ...item, quantity: 1 }];
    });
    const existing = cart.find((line) => line.id === item.id);
    setMessage(existing && existing.quantity >= item.stock ? "လက်ကျန် stock အရေအတွက်ကုန်သွားပါပြီ။" : language === "my" ? "ခြင်းတောင်းထဲသို့ ထည့်ပြီးပါပြီ။" : "Added to your cart.");
  }
  function update(id: string, delta: number) {
    const latest = items.find((item) => item.id === id);
    const maximum = latest && isProductOrderable(latest) ? latest.stock : 0;
    setCart((current) => current.flatMap((line) => {
      if (line.id !== id) return [line];
      const quantity = line.quantity + delta;
      if (quantity <= 0) return [];
      if (quantity > maximum) return [line];
      return [{ ...line, ...latest, quantity }];
    }));
    if (delta > 0 && maximum === 0) setMessage("ဤပစ္စည်း လက်ရှိကုန်သွားပါပြီ။");
    else if (delta > 0) {
      const line = cart.find((item) => item.id === id);
      if (line && line.quantity >= maximum) setMessage("လက်ကျန် stock အရေအတွက်အထိသာ ရွေးလို့ရပါသည်။");
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unavailableLine = cart.find((line) => {
      const latest = items.find((item) => item.id === line.id);
      return !latest || !isProductOrderable(latest) || line.quantity > latest.stock;
    });
    if (unavailableLine) {
      setMessage(`“${language === "my" ? unavailableLine.name_my : unavailableLine.name_en}” ၏ stock ပြောင်းလဲသွားပါပြီ။ ခြင်းတောင်းကို ပြန်စစ်ပေးပါ။`);
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? ""), orderType: String(form.get("orderType") ?? "pickup"), address: String(form.get("address") ?? ""), note: String(form.get("note") ?? ""), items: cart.map(({ id, quantity }) => ({ itemId: id, quantity })) };
    let result: { orderNumber?: string; trackingToken?: string; error?: string } | null = null;
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      result = await response.json();
      if (!response.ok && response.status < 500) { setMessage(result?.error ?? "မှာယူမှုအချက်အလက် မမှန်ကန်ပါ။"); return; }
    } catch { result = null; }
    if (!result?.orderNumber) {
      const { data, error } = await createBrowserClient().rpc("place_order", {
        p_customer_name: payload.name, p_customer_phone: payload.phone, p_customer_email: payload.email,
        p_order_type: payload.orderType === "delivery" ? "delivery" : "pickup", p_address: payload.address,
        p_note: payload.note, p_delivery_fee: payload.orderType === "delivery" ? 2000 : 0,
        p_items: payload.items.map((item) => ({ item_id: item.itemId, qty: item.quantity })),
      });
      if (error) { setMessage("မှာယူမှု မအောင်မြင်သေးပါ။ " + error.message); return; }
      result = { orderNumber: (data as { order_number?: string } | null)?.order_number, trackingToken: (data as { tracking_token?: string } | null)?.tracking_token };
    }
    setCart([]); setCheckoutOpen(false); setCartOpen(false); setOrderType("pickup");
    if (result?.orderNumber && result.trackingToken) setTrackedOrder({ orderNumber: result.orderNumber, trackingToken: result.trackingToken, status: "pending", totalKyat: subtotal + (payload.orderType === "delivery" ? 2000 : 0) });
    setMessage(language === "my" ? `မှာယူမှု လက်ခံရရှိပါပြီ။ Order #${result?.orderNumber ?? ""}` : `Order received. Order #${result?.orderNumber ?? ""}`);
  }

  return <main>
    <header className="header">
      <a className="logo" href="#home"><span>☕</span><b>ယုံကြည် ကော်ဖီ</b></a>
      <button className="menuButton" onClick={() => setNavOpen(!navOpen)} aria-label="Menu">☰</button>
      <nav className={navOpen ? "open" : ""}>
        <a onClick={() => setNavOpen(false)} href="#home">{words.home}</a><a onClick={() => setNavOpen(false)} href="#story">{words.story}</a><a onClick={() => setNavOpen(false)} href="#menu">{words.menu}</a><a onClick={() => setNavOpen(false)} href="#visit">{words.visit}</a>
      </nav>
      <div className="headerActions"><div className="language"><button className={language === "my" ? "active" : ""} onClick={() => setLanguage("my")}>မြန်</button><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button></div>{trackedOrder && <button className="trackButton" onClick={() => setTrackerOpen(true)}>📦 <span>Order</span></button>}<button className="cartButton" onClick={() => setCartOpen(true)}>🛍️ <span>{count}</span></button></div>
    </header>

    <section className="hero" id="home"><div className="heroGlow" /><div className="heroOrb orbOne" /><div className="heroOrb orbTwo" /><div className="heroContent"><p className="eyebrow">Myanmar coffee · grown with care</p><h1>{language === "my" ? "မြန်မာ့ကော်ဖီ ယဉ်ကျေးမှု" : "A taste of Myanmar culture"}</h1><p>{language === "my" ? "ဒေသထွက် ကော်ဖီစေ့များဖြင့် ဖျော်ထားသော ခွက်တိုင်းမှာ အမှတ်တရတစ်ခု ပါဝင်နေပါတယ်။" : "Every cup is carefully brewed from locally grown Myanmar coffee beans."}</p><div className="actions"><a className="button primary" href="#menu">{words.menu} ကြည့်ရန် <span>→</span></a><a className="button outline" href="#visit">လာရောက်လည်ပတ်ရန်</a></div><div className="heroProof"><span>✦ Local beans</span><span>● Fresh roast</span><span>♥ Made with care</span></div></div></section>

    <section id="story" className="section story"><div className="coffeeArt">☕<span>✦</span></div><div><p className="eyebrow dark">OUR STORY</p><h2>မြန်မာ့တောင်တန်းများမှ ကော်ဖီစေ့များ</h2><p>ရှမ်း၊ ရခိုင်နှင့် ချင်းတောင်တန်းဒေသများမှ ရေရှည်တည်တံ့စွာ စိုက်ပျိုးထားသည့် ကော်ဖီစေ့များကို ရွေးချယ်အသုံးပြုပါတယ်။</p><p>နေ့စဉ် small-batch roast လုပ်ပေးတာကြောင့် ဒေသရဲ့ထူးခြားတဲ့ အနံ့နဲ့အရသာကို သင့်ခွက်ထဲအထိ ရောက်စေပါတယ်။</p><div className="stats"><div><b>2015</b><span>တည်ထောင်နှစ်</span></div><div><b>12+</b><span>ကော်ဖီအမျိုးအစား</span></div><div><b>4.9★</b><span>ဖောက်သည်အမှတ်</span></div></div></div></section>

    <section id="menu" className="section menuSection"><div className="sectionTitle"><p className="eyebrow dark">OUR MENU</p><h2>မီနူးစာရင်း</h2><p>Myanmar မှာ စိုက်ပျိုးပြီး Myanmar အရသာနဲ့ ဖျော်ထားပါတယ်။</p><span className="menuNote">☕ နေ့စဉ် လတ်ဆတ်စွာ ဖျော်ထားပါသည်</span></div><div className="categories"><button className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}>{words.all}</button>{categories.map((item) => <button key={item.id} className={category === item.id ? "selected" : ""} onClick={() => setCategory(item.id)}>{language === "my" ? item.name_my : item.name_en}</button>)}</div><div className="productGrid">{filtered.map((item, index) => { const soldOut = !isProductOrderable(item); return <article className={`product ${soldOut ? "soldOut" : ""}`} key={item.id} style={{ "--card-delay": `${index * 45}ms` } as React.CSSProperties}><div className="productIcon">{item.emoji}</div><div className="productBody"><div className="productTitle"><h3>{language === "my" ? item.name_my : item.name_en}</h3>{soldOut ? <span className="soldOutBadge">ကုန်ပြီ</span> : (language === "my" ? item.tag_my : item.tag_en) && <span>{language === "my" ? item.tag_my : item.tag_en}</span>}</div><p>{language === "my" ? item.desc_my : item.desc_en}</p><div className="productFoot"><b>{money(item.price_kyat)}</b><button disabled={soldOut} onClick={() => add(item)} aria-label={soldOut ? "ကုန်ပြီ" : words.add}>{soldOut ? "—" : "＋"}</button></div></div></article>; })}</div></section>

    <section id="visit" className="visit"><div><p className="eyebrow">VISIT US</p><h2>Yangon မြို့လယ်မှာ<br />လာရောက်လည်ပတ်ပါ</h2><p>📍 No. 42, Bogyoke Road, Dagon Township, Yangon</p><p>🕐 နေ့စဉ် 7:00 AM – 9:00 PM</p><p>📞 +95 9 25 555 8888</p></div><a className="button primary" href="https://maps.google.com/?q=Yangon+Myanmar" target="_blank">မြေပုံဖွင့်ရန်</a></section>
    <footer>© {new Date().getFullYear()} ယုံကြည် ကော်ဖီ · Myanmar Coffee House</footer>

    {message && <div className="toast" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
    {trackerOpen && trackedOrder && <div className="tracker"><button className="modalClose" onClick={() => setTrackerOpen(false)}>×</button><p className="eyebrow dark">ORDER TRACKING · AUTO UPDATE</p><h2>သင့်မှာယူမှု</h2><b className="trackingNumber">{trackedOrder.orderNumber}</b><div className={`trackingStatus ${trackedOrder.status}`}>{orderStatusLabels[trackedOrder.status] ?? trackedOrder.status}</div><p>အခြေအနေကို ၁၀ စက္ကန့်တိုင်း အလိုအလျောက် update လုပ်ပေးပါသည်။</p>{trackedOrder.totalKyat && <p><b>စုစုပေါင်း:</b> {money(trackedOrder.totalKyat)}</p>}</div>}
    {cartOpen && <aside className="drawer"><div className="drawerTop"><h2>{words.cart}</h2><button onClick={() => setCartOpen(false)}>×</button></div>{cart.length === 0 ? <p className="empty">{words.empty}</p> : <><div className="cartLines">{cart.map((item) => { const latest = items.find((menuItem) => menuItem.id === item.id); const atMaximum = !latest || !isProductOrderable(latest) || item.quantity >= latest.stock; return <div className="cartLine" key={item.id}><span>{item.emoji}</span><div><b>{language === "my" ? item.name_my : item.name_en}</b><small>{money(item.price_kyat)} · လက်ကျန် {latest?.stock ?? 0}</small></div><div className="quantity"><button onClick={() => update(item.id, -1)}>−</button><span>{item.quantity}</span><button disabled={atMaximum} onClick={() => update(item.id, 1)}>＋</button></div></div>; })}</div><div className="cartTotal"><span>{words.total}</span><b>{money(subtotal)}</b></div><button className="button primary full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>{words.checkout}</button></>}</aside>}
    {(cartOpen || checkoutOpen) && <div className="backdrop" onClick={() => { setCartOpen(false); setCheckoutOpen(false); }} />}
    {checkoutOpen && <div className="modal"><button className="modalClose" onClick={() => setCheckoutOpen(false)}>×</button><h2>မှာယူမှုအချက်အလက်</h2><form onSubmit={placeOrder}><input required name="name" placeholder="အမည် / Your name" /><input required name="phone" inputMode="tel" placeholder="ဖုန်းနံပါတ် / Phone" /><input name="email" type="email" placeholder="Email (optional)" /><select name="orderType" value={orderType} onChange={(event) => setOrderType(event.target.value as "pickup" | "delivery")}><option value="pickup">လာယူမည် / Pickup</option><option value="delivery">ပို့ဆောင်မည် / Delivery (+2,000 ကျပ်)</option></select>{orderType === "delivery" && <input required name="address" placeholder="ပို့ဆောင်ရန်လိပ်စာ / Delivery address" />}<textarea name="note" placeholder="မှတ်ချက် / Note" /><button className="button primary full" type="submit">မှာယူမှုအတည်ပြုရန် · {money(subtotal + (orderType === "delivery" ? 2000 : 0))}</button></form></div>}
  </main>;
}
