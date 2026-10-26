/* ================= SHOP =================
   Spend gold coins. Boots belong to the account (Account.locker), so they carry across careers: one pair per
   attribute, bought at bronze and upgraded to silver and gold, worn one pair at a time; mcA() adds the worn pair's
   boost to every match. Training boosts act on the current career: double training for four weeks, a personal coach
   (+1 to your training focus, three times a season), a physio, sharpness drills and injury treatment. */
const SHOP_BOOTS = [["fin","Sniper boots"],["pas","Maestro boots"],["pac","Lightning boots"],["def","Rock boots"],["sta","Engine boots"]];
const SHOP_TIER = [null, {n:"Bronze", cost:250}, {n:"Silver", cost:450}, {n:"Gold", cost:800}];
const SHOP_COACH_MAX = 3;
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
      <div class="shop-top"><b>${esc(shopBootName(k))}</b><span class="pips" aria-label="Level ${lvl} of 3">${[1,2,3].map(i=>`<i class="${i<=lvl?"got":""}"></i>`).join("")}</span></div>
      <p>${lvl ? `${SHOP_TIER[lvl].n}: +${MC_BOOT[lvl]} ${esc(shopAttrName(k))}` : `+2 ${esc(shopAttrName(k))}, up to +6 when upgraded`}</p>
      <div class="row">
        ${next ? `<button type="button" class="btn small ${have>=next.cost?"primary":""}" data-shop="boot" data-k="${k}" ${have>=next.cost?"":"disabled"}>${lvl ? `Upgrade to ${next.n}` : "Buy"} · <i class="coin" aria-hidden="true"></i> ${next.cost}</button>` : ""}
        ${lvl ? `<button type="button" class="btn small" data-shop="wear" data-k="${on ? "" : k}">${on ? "Take off" : "Wear"}</button>` : ""}
        ${on ? `<span class="pill gold">Wearing</span>` : ""}
      </div></div>`;
  }).join("");
  const boosts = shopBoosts();
  return `<div class="dlg-in">
    <div class="dlg-head"><i class="coin big" aria-hidden="true"></i><div style="min-width:0"><h2 id="shopDlgTitle">Shop</h2><p class="hint">You have <b>${have.toLocaleString()}</b> gold coins</p></div>
      <button type="button" class="dlg-x" data-shop="close" aria-label="Close">×</button></div>
    ${shopMsg ? `<p class="ref" role="status" style="margin:0">${esc(shopMsg)}</p>` : ""}
    <section><h3>Boots</h3><p class="hint">Boots are yours to keep, in every career. Wear one pair at a time: its boost counts in every match, from whether you're picked to how forgiving the mini-games are.</p>
      <div class="shop-grid">${boots}</div></section>
    <section><h3>Training boosts</h3>
      ${boosts.length ? `<div class="shop-grid">${boosts.map(b=>`<div class="shop-card"><div class="shop-top"><b>${b.t}</b></div><p>${b.d}</p>
        <div class="row"><button type="button" class="btn small ${!b.off && have>=b.cost ? "primary" : ""}" data-shop="boost" data-k="${b.id}" ${!b.off && have>=b.cost ? "" : "disabled"}>${b.off || `Buy · <i class="coin" aria-hidden="true"></i> ${b.cost}`}</button></div></div>`).join("")}</div>`
      : `<p class="hint">Training boosts work during a season in the match centre. Start or carry on your career to use them.</p>`}
    </section>
    <p class="hint" style="margin:0">Earn coins by playing key moments: win 50, draw 10, each goal 20, each assist 15, own goal −10.</p>
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
  shopRepaint();
});
document.getElementById("shopDlg")?.addEventListener("click", e=>{ if (e.target.id==="shopDlg") shopClose(); });
document.getElementById("shopDlg")?.addEventListener("close", ()=>{ if (S && !S.newing) render(); });   // show new boots and boosts on the career screen
