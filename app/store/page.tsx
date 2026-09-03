"use client";

import { useEffect, useRef, useState } from "react";
import { registerInstrumentedTools, hasWebMCP } from "@/lib/webmcp";

interface Product {
  id: string; name: string; price: number; category: string;
  emoji: string; hue: number; stock: number;
}

const CATALOG: Product[] = [
  { id: "trail-pack-28", name: "Trail Pack 28L", price: 3499, category: "packs", emoji: "🎒", hue: 165, stock: 12 },
  { id: "ridge-shell", name: "Ridge Shell Jacket", price: 5999, category: "apparel", emoji: "🧥", hue: 200, stock: 7 },
  { id: "ember-stove", name: "Ember Micro Stove", price: 1899, category: "camp", emoji: "🔥", hue: 25, stock: 20 },
  { id: "cirrus-tent-2", name: "Cirrus 2P Tent", price: 12499, category: "camp", emoji: "⛺", hue: 140, stock: 4 },
  { id: "switch-lamp", name: "Switchback Headlamp", price: 1299, category: "camp", emoji: "🔦", hue: 50, stock: 31 },
  { id: "corvo-boots", name: "Corvo Hiking Boots", price: 7499, category: "footwear", emoji: "🥾", hue: 20, stock: 9 },
  { id: "stratus-bottle", name: "Stratus Bottle 1L", price: 899, category: "camp", emoji: "🥤", hue: 185, stock: 44 },
  { id: "kestrel-poles", name: "Kestrel Trek Poles", price: 2799, category: "camp", emoji: "🥢", hue: 90, stock: 15 },
];

interface CartLine { id: string; qty: number; }

export default function StorePage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [apiPresent, setApiPresent] = useState<boolean | null>(null);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const registered = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const log = (line: string) =>
    setActivity((prev) => [...prev.slice(-40), line]);

  function addToCart(id: string, qty: number, actor: "human" | "agent"): { ok: boolean; message: string } {
    const p = CATALOG.find((x) => x.id === id);
    if (!p) return { ok: false, message: `No product with id '${id}'` };
    setCart((prev) => {
      const existing = prev.find((l) => l.id === id);
      return existing
        ? prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l))
        : [...prev, { id, qty }];
    });
    if (actor === "human") log(`human added ${p.name} ×${qty}`);
    return { ok: true, message: `Added ${p.name} ×${qty} to the cart.` };
  }

  useEffect(() => {
    setApiPresent(hasWebMCP());
    if (registered.current) return;
    registered.current = true;

    registerInstrumentedTools(
      "demo-store",
      [
        {
          name: "search_products",
          description:
            "Search the AgentReady Outfitters catalog by keyword and/or category (packs, apparel, camp, footwear). Returns id, name, price in INR, and stock.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              category: { type: "string", enum: ["packs", "apparel", "camp", "footwear"] },
              maxPrice: { type: "number", description: "Only products at or below this price (INR)" },
            },
          },
          execute: async (input: { query?: string; category?: string; maxPrice?: number }) => {
            const q = (input?.query ?? "").toLowerCase();
            const results = CATALOG.filter(
              (p) =>
                (!q || p.name.toLowerCase().includes(q) || p.category.includes(q)) &&
                (!input?.category || p.category === input.category) &&
                (input?.maxPrice == null || p.price <= input.maxPrice)
            ).map(({ id, name, price, category, stock }) => ({ id, name, priceInr: price, category, stock }));
            return { count: results.length, results };
          },
        },
        {
          name: "add_to_cart",
          description: "Add a product to the shopping cart by product id. The cart updates live on screen for the human shopper.",
          inputSchema: {
            type: "object",
            properties: {
              productId: { type: "string" },
              quantity: { type: "number", description: "Default 1" },
            },
            required: ["productId"],
          },
          execute: async (input: { productId: string; quantity?: number }) =>
            addToCart(input.productId, Math.max(1, Math.round(input.quantity ?? 1)), "agent"),
        },
        {
          name: "remove_from_cart",
          description: "Remove a product from the cart entirely by product id.",
          inputSchema: {
            type: "object",
            properties: { productId: { type: "string" } },
            required: ["productId"],
          },
          execute: async (input: { productId: string }) => {
            setCart((prev) => prev.filter((l) => l.id !== input.productId));
            return { ok: true };
          },
        },
        {
          name: "view_cart",
          description:
            "Read the current cart contents and total — including anything the human shopper added by hand. Call this before changing the cart so you respect their choices.",
          inputSchema: { type: "object", properties: {} },
          execute: async () => {
            const lines = cartRef.current.map((l) => {
              const p = CATALOG.find((x) => x.id === l.id)!;
              return { productId: l.id, name: p.name, qty: l.qty, lineTotalInr: p.price * l.qty };
            });
            return { lines, totalInr: lines.reduce((s, x) => s + x.lineTotalInr, 0) };
          },
        },
        {
          name: "start_checkout",
          description:
            "Begin checkout for the current cart. This demo stops before any payment step — it returns an order summary for the human to confirm. Never collects payment details.",
          inputSchema: { type: "object", properties: {} },
          execute: async () => {
            const lines = cartRef.current;
            if (lines.length === 0) return { ok: false, message: "Cart is empty." };
            const total = lines.reduce((s, l) => {
              const p = CATALOG.find((x) => x.id === l.id)!;
              return s + p.price * l.qty;
            }, 0);
            setCheckoutMsg(
              `Checkout started: ${lines.length} item type(s), total ₹${total.toLocaleString("en-IN")}. Awaiting human confirmation — this demo intentionally ends here.`
            );
            return { ok: true, awaiting: "human confirmation on screen", totalInr: total };
          },
        },
      ],
      log
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = cart.reduce((s, l) => {
    const p = CATALOG.find((x) => x.id === l.id)!;
    return s + p.price * l.qty;
  }, 0);

  return (
    <main>
      <section className="hero">
        <h1>AgentReady Outfitters</h1>
        <p className="lede">
          A working store where you and your agent shop the same cart. Five WebMCP tools are
          live on this page; every call streams into the activity log and into the AgentReady
          analytics view. This is the reference implementation the benchmark audits against.
        </p>
        <div className="agent-hint" role="note">
          {apiPresent === false && (
            <>No WebMCP API in this browser — the store works by hand. For the full demo, open
            in ChatGPT&apos;s in-app browser or Chrome with the WebMCP flag enabled.</>
          )}
          {apiPresent && (
            <>Tools live. Try: <em>&quot;Kit me out for a weekend trek under ₹10,000 — check
            what&apos;s already in my cart first.&quot;</em></>
          )}
          {apiPresent === null && <>Checking for WebMCP API…</>}
        </div>
      </section>

      <div className="split" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div>
          <div className="products">
            {CATALOG.map((p) => (
              <article className="product" key={p.id}>
                <div className="art" style={{ background: `hsl(${p.hue} 30% 90%)` }} aria-hidden>{p.emoji}</div>
                <h3>{p.name}</h3>
                <span className="subtle">{p.category} · {p.stock} in stock</span>
                <span className="price">₹{p.price.toLocaleString("en-IN")}</span>
                <button onClick={() => addToCart(p.id, 1, "human")}>Add to cart</button>
              </article>
            ))}
          </div>
        </div>

        <div>
          <section className="panel cartbox">
            <h3>Cart</h3>
            {cart.length === 0 && <p className="subtle">Empty. You or your agent can fix that.</p>}
            {cart.map((l) => {
              const p = CATALOG.find((x) => x.id === l.id)!;
              return (
                <div className="cartline" key={l.id}>
                  <span>{p.name} ×{l.qty}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="price">₹{(p.price * l.qty).toLocaleString("en-IN")}</span>
                    <button onClick={() => setCart((prev) => prev.filter((x) => x.id !== l.id))} aria-label={`Remove ${p.name}`}>×</button>
                  </span>
                </div>
              );
            })}
            {cart.length > 0 && (
              <div className="total"><span>Total</span><span className="price">₹{total.toLocaleString("en-IN")}</span></div>
            )}
            {checkoutMsg && <p className="subtle" style={{ color: "var(--accent)" }}>{checkoutMsg}</p>}
          </section>

          <section className="panel">
            <h3>Agent activity</h3>
            <div className="activity" aria-live="polite">
              {activity.length === 0 ? <span className="muted">— quiet so far —</span> : activity.join("\n")}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
