/* ================= SHOP =================
   Spend gold coins. Boots belong to the account (Account.locker), so they carry across careers: one pair per
   attribute, bought at bronze and upgraded to silver and gold, worn one pair at a time; mcA() adds the worn pair's
   boost to every match. Training boosts act on the current career: double training for four weeks, a personal coach
   (+1 to your training focus, three times a season), a physio, sharpness drills and injury treatment. */
const SHOP_BOOTS = [["fin","Sniper boots"],["pas","Maestro boots"],["pac","Lightning boots"],["def","Rock boots"],["sta","Engine boots"]];
const SHOP_TIER = [null, {n:"Bronze", cost:250}, {n:"Silver", cost:450}, {n:"Gold", cost:800}];
// each pair's colours (upper, trim, stripe), and the sole and studs for each tier (none, bronze, silver, gold)
const SHOP_LOOK = {fin:["#DC2626","#1F1A17","#FFFFFF"], pas:["#1D4ED8","#F5C542","#DBEAFE"], pac:["#FACC15","#18181B","#18181B"], def:["#3F4752","#A3ACB8","#E5E7EB"], sta:["#EA580C","#0EA5E9","#FFF7ED"]};
const SHOP_SOLE = ["#5B6470", "#C0813F", "#CBD3DB", "#F5C542"];
// a boot side-on, toe to the right, in a 64 by 40 box (moved by o.x, o.y): a pair's colours and its own mark on the
// side, studs in its tier's colour. A goalkeeper's Rock pair are gloves.
function shopBootArt(k, lvl = 0, o = {}){
  const [up, tr, st] = SHOP_LOOK[k] || ["#17191C", "#E5E7EB", "#9CA3AF"], sole = SHOP_SOLE[lvl] || SHOP_SOLE[0], at = `transform="translate(${o.x || 0} ${o.y || 0})"`;
  if (k==="def" && o.gk) return `<g ${at}><path d="M20 26h24v10a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2z" fill="${tr}"/><path d="M20 30h24" stroke="${sole}" stroke-width="2.4"/>
    <path d="M19 27V12q0-3 3-3t3 3V6q0-3 3.2-3t3.2 3v-.5q0-3 3.2-3t3.2 3V7q0-3 3-3t3 3v20z" fill="${up}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>
    <path d="M19 22l-5-7q-2-3 .5-4.5t4.5 1.5z" fill="${up}" stroke="rgba(0,0,0,.4)" stroke-width="1"/><rect x="23" y="13" width="18" height="11" rx="2" fill="#C8F04A" opacity=".9"/></g>`;
  // the same boot as the Golden Boot trophy, drawn round its heel at (1, 33): the per-pair mark sits by the heel
  const mark = {fin:`<circle cx="12.5" cy="-14" r="2.7" fill="none" stroke="${st}" stroke-width="1.3"/><circle cx="12.5" cy="-14" r=".9" fill="${st}"/>`,
    pas:`<path d="M12.5 -17.2l1.1 2.3 2.5.3-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.3z" fill="${tr}"/>`,
    pac:`<path d="M14 -18.4l-4.2 6h3.1l-2.2 4.9 5.9-7h-3.2l2.3-3.9z" fill="${tr}"/>`,
    def:`<path d="M46 -11.6C47.4 -9.2 47.6 -6.6 46.8 -4.4H54.5C57.8 -4.2 60 -4.6 60.6 -5.6C61 -6.8 58 -8.4 53.5 -9.8C51 -10.6 48.5 -11.2 46 -11.6z" fill="${tr}"/>`,
    sta:`<path d="M9 -17h5M8.4 -13.5h6M9 -10h5" stroke="${tr}" stroke-width="1.5" stroke-linecap="round"/>`}[k] || "";
  const ink = lvLight(up) ? "#18181B" : "#FFFFFF", U = "M2.8 -4.4C1 -10 1.2 -17 4 -22.6C7 -25.2 11 -25.8 14.6 -24.6C19 -21.8 24 -18.8 31 -16.6C39 -14.2 47 -12 53.5 -9.8C58 -8.4 61 -6.8 60.6 -5.6C60 -4.6 57.8 -4.2 54.5 -4.2z";
  return `<g ${at}><g transform="translate(1 33)">
    <path d="M6 -1.4h4.6l-.8 3.2h-3zM13.4 -1.4h4.6l-.8 3.2h-3zM30 -1.4h3.8l-.7 3h-2.4zM37 -1.5h3.8l-.7 3h-2.4zM44 -1.8h3.8l-.7 2.9h-2.4zM50.6 -2.3h3.6l-.7 2.8h-2.2z" fill="${sole}" stroke="rgba(0,0,0,.3)" stroke-width=".5"/>
    <path d="M2.8 -4.4H54.5C57.8 -4.2 60 -4.6 60.6 -5.6l.4 1.2C60.4 -2.4 57.6 -1.1 53.5 -1H5.4C3 -1 1.8 -2.6 2.8 -4.4z" fill="${sole}" stroke="rgba(0,0,0,.3)" stroke-width=".5"/>
    <path d="M4.2 -22.4C3.6 -25.8 4.4 -28.6 6.2 -30C9.6 -31 13 -30.3 15.6 -28.2C15.8 -27 15.2 -25.8 14.4 -24.8z" fill="${tr}" stroke="rgba(0,0,0,.4)" stroke-width=".6"/>
    <path d="M6.3 -28.9l.8 5.2M8.6 -29.5l.6 5M11 -29.4l.3 4.7M13.3 -28.7v4" stroke="#000" stroke-width=".5" opacity=".25"/>
    <path d="${U}" fill="${up}" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>
    <path d="${U}" fill="url(#bootShine)"/>
    <path d="M2.8 -4.4C1 -10 1.2 -17 4 -22.6l4.2 1.2C6.6 -15.8 6.5 -9.8 8 -4.4z" fill="#000" opacity=".22"/>
    <path d="M4.8 -22.4C7.8 -24.6 11.2 -25.2 14.2 -24.6C11.6 -23 8 -22.4 4.8 -22.4z" fill="#111"/>
    <path d="M17.4 -22.9l2.4 2.3M20.6 -21.1l2.2 2.4M23.8 -19.5l2 2.5M27 -18.1l1.8 2.5" stroke="${ink}" stroke-width="1.15" stroke-linecap="round" opacity=".9"/>
    <path d="M8.5 -8.6C19.5 -10.2 31.5 -13.4 45.5 -11.4" stroke="${st}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M40 -13.6C46 -12.2 51.6 -10.6 56.6 -8.2" stroke="#FFFFFF" stroke-width="1" fill="none" opacity=".45" stroke-linecap="round"/>${mark}</g></g>`;
}
// the boots as an icon (cls sizes it); faded if you don't own them yet
const shopBootIcon = (k, lvl, cls = "boot-ic") => `<svg class="${cls}${lvl ? "" : " none"}" viewBox="1 -1 64 40" aria-hidden="true"><defs><linearGradient id="bootShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>${shopBootArt(k, lvl, {gk:k==="def" && S && S.player && S.player.pos==="GK"})}</svg>`;
const SHOP_COACH_MAX = 3;
/* Coin packs for real money. Payments aren't connected yet: shopCheckout() is where a payment provider (for example
   Stripe Checkout) goes, resolving true once the payment succeeds. Until SHOP_PAYMENTS is turned on it hands the coins
   over straight away, and the shop says so, so nobody thinks they've been charged. */
const SHOP_PAYMENTS = false;
const SHOP_PACKS = [
  {id:"handful", t:"Handful", coins:500, price:"£0.99"},
  {id:"pouch", t:"Pouch", coins:1200, price:"£1.99", bonus:"+20%"},
  {id:"bag", t:"Bag", coins:2800, price:"£3.99", bonus:"+40%"},
  {id:"chest", t:"Chest", coins:6500, price:"£7.99", bonus:"+60%", tag:"Popular"},
  {id:"vault", t:"Vault", coins:15000, price:"£14.99", bonus:"+80%", tag:"Best value"}
];
async function shopCheckout(pack){ return !SHOP_PAYMENTS; }
async function shopBuyPack(id){
  const P = SHOP_PACKS.find(p=>p.id===id); if (!P || !(await shopCheckout(P))) return;
  Account.addCoins(P.coins);
  shopMsg = `${P.t}: +${P.coins.toLocaleString()} coins added.${SHOP_PAYMENTS ? "" : " Free for now, while payments are being set up."}`;
  shopRepaint();
}
const shopBootName = k => k==="def" && S && S.player && S.player.pos==="GK" ? "Safe-hands gloves" : SHOP_BOOTS.find(b=>b[0]===k)[1];
const shopAttrName = k => S && S.attr ? mcAttrName(k) : MC_ATTR.find(x=>x[0]===k)[1];
let shopMsg = "";

// boosts that need a match-centre season in progress
function shopCareer(){ return !!(S && !S.newing && S.attr && S.phase==="stats" && seasonMode()==="centre" && S.mc && S.mc.key===mcKey() && !S.mc.done); }
function shopUses(){ const s = seasonLabel(S.season); if (!S.shop || S.shop.s!==s) S.shop = {s, coach:0}; return S.shop; }
function shopBoosts(){
  if (!shopCareer()) return [];
  const T = S.train, c = S.cond, inj = mcInjury(mcFrac(S.mc.wi)), d = (S.boost && S.boost.double) || 0, used = shopUses().coach;
  const focus = MC_ATTR.some(([k])=>k===T.focus);
  return [
    {id:"double", t:"Double training", cost:250, d:`Training gains are doubled for the next 4 weeks.${d ? ` ${d} week${d===1?"":"s"} left now.` : ""}`},
    {id:"coach", t:"Personal coach", cost:400, d:focus ? `+1 ${mcAttrName(T.focus)} straight away (your training focus). ${SHOP_COACH_MAX-used} left this season.` : "Pick an attribute as your training focus first.",
      off: !focus ? "Pick a focus" : used>=SHOP_COACH_MAX ? "Used up this season" : ""},
    {id:"physio", t:"Physio", cost:75, d:`Fitness back to 100. You're on ${Math.round(100-c.fat)}.`, off: c.fat<1 ? "Already fresh" : ""},
    {id:"sharp", t:"Sharpness drills", cost:75, d:`Sharpness back to 100. You're on ${Math.round(c.sharp)}.`, off: c.sharp>=99 ? "Already sharp" : ""},
    {id:"treat", t:"Injury treatment", cost:300, d: inj ? `Halves the time left out with your ${inj.name.toLowerCase()}.` : "Halves the time left on an injury. You're fit right now.", off: inj ? "" : "Not injured"}
  ];
}
function shopHTML(){
  const L = Account.locker(), have = Account.coins();
  const boots = SHOP_BOOTS.map(([k])=>{
    const lvl = L.boots[k] || 0, next = SHOP_TIER[lvl+1], on = L.on===k;
    return `<div class="shop-card ${on?"on":""}">
      <div class="shop-top">${shopBootIcon(k, lvl, "boot-ic big")}<b>${esc(shopBootName(k))}</b><span class="pips" aria-label="Level ${lvl} of 3">${[1,2,3].map(i=>`<i class="${i<=lvl?"got":""}"></i>`).join("")}</span></div>
      <p>${lvl ? `${SHOP_TIER[lvl].n}: +${MC_BOOT[lvl]} ${esc(shopAttrName(k))}` : `+2 ${esc(shopAttrName(k))}, up to +6 when upgraded`}</p>
      <div class="row">
        ${next ? `<button type="button" class="btn small ${have>=next.cost?"primary":""}" data-shop="boot" data-k="${k}" ${have>=next.cost?"":"disabled"}>${lvl ? `Upgrade to ${next.n}` : "Buy"} · <i class="coin" aria-hidden="true"></i> ${next.cost}</button>` : ""}
        ${lvl ? `<button type="button" class="btn small" data-shop="wear" data-k="${on ? "" : k}">${on ? "Take off" : "Wear"}</button>` : ""}
        ${on ? `<span class="pill gold">Wearing</span>` : ""}
      </div></div>`;
  }).join("");
  const boosts = shopBoosts();
  return `<div class="dlg-in">
    <div class="dlg-head"><i class="coin big" aria-hidden="true"></i><div style="min-width:0"><h2 id="shopDlgTitle">Shop</h2><p class="hint">You have <b>${have.toLocaleString()}</b> gold coins · <button type="button" class="linkbtn" data-shop="get">Get more</button></p></div>
      <button type="button" class="dlg-x" data-shop="close" aria-label="Close">×</button></div>
    ${shopMsg ? `<p class="ref" role="status" style="margin:0">${esc(shopMsg)}</p>` : ""}
    ${subTabs("shop", [["boots", "Boots", `<p class="hint">Yours to keep in every career. Wear one pair at a time: its boost counts in every match.</p>
      <div class="shop-grid">${boots}</div>`],
    ["boosts", "Training", boosts.length ? `<div class="shop-grid">${boosts.map(b=>`<div class="shop-card"><div class="shop-top"><b>${b.t}</b></div><p>${b.d}</p>
        <div class="row"><button type="button" class="btn small ${!b.off && have>=b.cost ? "primary" : ""}" data-shop="boost" data-k="${b.id}" ${!b.off && have>=b.cost ? "" : "disabled"}>${b.off || `Buy · <i class="coin" aria-hidden="true"></i> ${b.cost}`}</button></div></div>`).join("")}</div>`
      : `<p class="hint">Training boosts work during a season in the match centre. Start or carry on your career to use them.</p>`],
    ["coins", "Coins", `<p class="hint">Or earn them by playing key moments: win 50, draw 10, each goal 20, each assist 15, own goal −10.</p>
      ${SHOP_PAYMENTS ? "" : `<p class="ref" style="margin:0 0 10px"><strong>Payments aren't set up yet,</strong> so coin packs are free while the game's being tested. Tap one and the coins are yours.</p>`}
      <div class="shop-grid packs">${SHOP_PACKS.map((P,i)=>`<div class="shop-card pack ${P.tag?"hot":""}">
        ${P.tag ? `<span class="pack-tag">${P.tag}</span>` : ""}
        <span class="stack" aria-hidden="true">${'<i class="coin"></i>'.repeat(i+1)}</span>
        <b class="pack-n">${P.coins.toLocaleString()}</b><span class="pack-t">${P.t}${P.bonus ? ` · <em>${P.bonus} extra</em>` : ""}</span>
        <button type="button" class="btn small primary" data-shop="pack" data-k="${P.id}" aria-label="Buy ${P.coins} coins for ${P.price}">${P.price}${SHOP_PAYMENTS ? "" : " · Free now"}</button></div>`).join("")}</div>`]])}
  </div>`;
}
function shopOpen(){
  const d = document.getElementById("shopDlg"); shopMsg = ""; d.innerHTML = shopHTML();
  if (d.showModal){ if (!d.open) d.showModal(); } else d.setAttribute("open", "");
}
function shopRepaint(){ const d = document.getElementById("shopDlg"); if (d && d.open){ const y = d.scrollTop; d.innerHTML = shopHTML(); d.scrollTop = y; } }
function shopClose(){ const d = document.getElementById("shopDlg"); if (d.close) d.close(); else { d.removeAttribute("open"); if (S && !S.newing) render(); } }
function shopBuyBoot(k){
  const L = Account.locker(), lvl = L.boots[k] || 0, next = SHOP_TIER[lvl+1];
  if (!next || !Account.spend(next.cost)) return;
  L.boots[k] = lvl+1; if (!L.on) L.on = k; Account.setLocker(L);
  shopMsg = `${next.n} ${shopBootName(k)}: +${MC_BOOT[lvl+1]} ${shopAttrName(k)}${L.on===k ? ", and you're wearing them" : ""}.`;
}
function shopBuyBoost(id){
  const b = shopBoosts().find(x=>x.id===id); if (!b || b.off || !Account.spend(b.cost)) return;
  const c = S.cond;
  if (id==="double"){ S.boost = {double:((S.boost && S.boost.double) || 0) + 4}; shopMsg = "Double training for the next 4 weeks."; }
  else if (id==="coach"){ const k = S.train.focus; S.attr[k] = Math.min(99, +(S.attr[k] + 1).toFixed(2)); shopUses().coach++; shopMsg = `+1 ${mcAttrName(k)}. It's now ${Math.round(S.attr[k])}.`; }
  else if (id==="physio"){ c.fat = 0; shopMsg = "Fully fit again."; }
  else if (id==="sharp"){ c.sharp = 100; shopMsg = "Sharp as you'll ever be."; }
  else if (id==="treat"){ const f = mcFrac(S.mc.wi), i = mcInjury(f); if (i){ i.red = +((f - i.at) + (i.at + i.red - f)/2).toFixed(3); shopMsg = `Treatment done: you'll be back sooner from your ${i.name.toLowerCase()}.`; } }
  save();
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-shop]"); if (!b) return;
  const a = b.dataset.shop, k = b.dataset.k;
  if (a==="open") return shopOpen();
  if (a==="close") return shopClose();
  if (a==="boot") shopBuyBoot(k);
  else if (a==="wear"){ const L = Account.locker(); L.on = k || null; Account.setLocker(L); shopMsg = k ? `Now wearing ${shopBootName(k)}.` : "Boots off."; }
  else if (a==="boost") shopBuyBoost(k);
  else if (a==="pack") return shopBuyPack(k);
  else if (a==="get") SUB.shop = "coins";
  shopRepaint();
});
document.getElementById("shopDlg")?.addEventListener("click", e=>{ if (e.target.id==="shopDlg") shopClose(); });
document.getElementById("shopDlg")?.addEventListener("close", ()=>{ if (S && !S.newing) render(); });   // show new boots and boosts on the career screen
