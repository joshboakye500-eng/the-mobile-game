/* ================= KEY MOMENTS =================
   In big games (or every game, if you choose) you play the moments that involve you, like FC's player career:
   shots (pick a spot, then stop the power bar in the green), passes (tap the free teammate before he's closed down),
   last-ditch tackles and blocks (timing) and, for keepers, saves (react to the shot). Your attributes, form and
   sharpness set how forgiving each one is, and a strong opponent's keeper still saves good shots.
   The rest of the match is simulated around your moments from the same expected goals mcXg gives the simulation,
   minus the share your moments stand in for, so the score always includes what you did. */
const LV_SHOT = {   // title, prompt, width of the green zone, how good the keeper is here, power bar speed (ms per sweep)
  oneonone:{t:"Through on goal!", s:"Pick your spot, then stop the power bar in the green.", z:.2, k:.9, per:1300},
  box:{t:"Space in the box", s:"Pick your spot, then stop the power bar in the green.", z:.16, k:1, per:1200},
  header:{t:"Cross coming in", s:"Pick where to head it, then time your jump in the green.", z:.13, k:1.1, per:1100},
  long:{t:"Shot from 25 yards", s:"Pick your spot. Hit it too hard and it's in the stands.", z:.11, k:1.25, per:1000},
  freekick:{t:"Free kick in range", s:"Pick your spot over the wall, then stop the power bar in the green.", z:.12, k:1.15, per:1050}
};
// the moments each position gets: attacking ones, and defending ones
const LV_ATT = {ST:["oneonone","box","box","header","pass"], LW:["oneonone","box","pass","pass"], RW:["oneonone","box","pass","pass"], CAM:["box","pass","pass","long","freekick"],
  CM:["pass","pass","long"], CDM:["pass","long"], LB:["pass","pass","box"], RB:["pass","pass","box"], CB:["header"], GK:[]};
const LV_DEF = {GK:["save"], CB:["tackle","block","tackle"], LB:["tackle"], RB:["tackle"], CDM:["tackle"], CM:["tackle"]};
// share of the opponents' chances that come your way
const LV_DSHARE = {GK:.55, CB:.3, LB:.2, RB:.2, CDM:.15, CM:.08};
const LV_COLS = {l:75, c:150, r:225}, LV_ROWS = {t:50, b:98};
let lvEl = null, lvRaf = 0, lvKey = null;

// scoreboard names: Tottenham Hotspur → TOT, Manchester City → MCI, Real Madrid → MAD
function lvAbbr(n){
  const w = String(n).replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(x=>x && !/^(FC|AFC|AC|SC|SV|CF|CD|RC|RB|VfB|VfL|TSG|1|Real|Club|Borussia|Bayer|Inter)$/i.test(x));
  if (!w.length) return String(n).slice(0,3).toUpperCase();
  return (w.length>1 && w[0]==="Manchester" ? w[0][0] + w[1].slice(0,2) : w[0].slice(0,3)).toUpperCase();
}
function lvOpen(){
  lvEl = document.createElement("div"); lvEl.className = "lv"; lvEl.setAttribute("role", "dialog"); lvEl.setAttribute("aria-modal", "true"); lvEl.setAttribute("aria-label", "Match");
  document.body.appendChild(lvEl); document.documentElement.classList.add("lv-open");
}
function lvClose(){ cancelAnimationFrame(lvRaf); lvKey = null; lvEl?.remove(); lvEl = null; document.documentElement.classList.remove("lv-open"); }
function lvShow(html){ lvEl.innerHTML = `<div class="lv-in">${html}</div>`; lvEl.scrollTop = 0; (lvEl.querySelector("[data-lv-focus]") || lvEl.querySelector("button"))?.focus({preventScroll:true}); }
const lv$ = s => lvEl.querySelector(s);
// a screen whose buttons (data-lv="value") answer it
function lvAsk(html){ return new Promise(res=>{ lvShow(html); lvEl.querySelectorAll("[data-lv]").forEach(b=>b.addEventListener("click", ()=>res(b.dataset.lv))); }); }
function lvTween(ms, step){ return new Promise(res=>{ const t0 = performance.now(); const tick = now=>{ const k = Math.min(1, (now-t0)/ms); step(k); if (k<1) lvRaf = requestAnimationFrame(tick); else res(); }; lvRaf = requestAnimationFrame(tick); }); }
const lvWait = ms => new Promise(r=>setTimeout(r, ms));
document.addEventListener("keydown", e=>{
  if (!lvEl || !lvKey) return;
  const k = {" ":"go", Enter:"go", ArrowLeft:"l", ArrowRight:"r", ArrowUp:"c", ArrowDown:"c"}[e.key];
  if (!k || (k==="go" && e.target.closest && e.target.closest(".lv-aim, .lv-mate, [data-lv]"))) return;
  e.preventDefault(); lvKey(k);
});

/* ---------- the match ---------- */
function lvScore(st, min){
  let f = 0, a = 0; st.ev.forEach(e=>{ if (e.min<min){ if (e.us) f++; else a++; } });
  return [f, a];
}
function lvHead(st, min){
  const [f, a] = lvScore(st, min), us = lvAbbr(st.f.home || st.f.neutral ? S.mc.club : st.f.opp), them = lvAbbr(st.f.home || st.f.neutral ? st.f.opp : S.mc.club);
  const [l, r] = st.f.home || st.f.neutral ? [f, a] : [a, f];
  return `<div class="lv-top"><span class="lv-sc"><b>${esc(us)}</b> ${l}–${r} <b>${esc(them)}</b></span><span>${min}'</span>${st.left>1 ? `<button type="button" class="lv-skip" data-lv-skip>Sim the rest</button>` : ""}</div>`;
}
// which moments come your way: about as many as your share of the team's goals and the opponents' chances
function lvPlan(f, X){
  const pos = S.player.pos, me = f.me, att = LV_ATT[pos] || LV_ATT.CM, def = LV_DEF[pos] || [];
  let nA = att.length ? Math.min(3, mcPoisson(X.lf*(X.pG+X.pA)/.35)) : 0, nD = def.length ? Math.min(3, mcPoisson(X.la*(LV_DSHARE[pos]||0)*X.t/.3)) : 0;
  if (me.st==="sub"){ if (att.length && (MC_ATT[pos] ?? .5)>=.5 || !def.length){ nA = 1; nD = 0; } else { nA = 0; nD = 1; } }
  else {
    while (nA+nD<2){ if (def.length && (!att.length || Math.random() > (MC_ATT[pos] ?? .5))) nD++; else nA++; }
    while (nA+nD>4){ if (nA>nD) nA--; else nD--; }
  }
  const from = me.st==="sub" ? 92-me.mins : 4, to = me.st==="sub" ? 89 : Math.max(12, me.mins-2);
  const list = [...Array(nA)].map(()=>({side:"att", kind:pick(att)})).concat([...Array(nD)].map(()=>({side:"def", kind:pick(def)})));
  list.forEach(m=>{ m.min = from + Math.floor(Math.random()*(to-from+1)); });
  return list.sort((x,y)=>x.min-y.min);
}
/* ---------- first-time instructions ----------
   Before your first match, and the first time each mini-game comes up, a card explains it. Each account
   remembers what it has seen; "How to play" on a match's intro shows them again. */
const LV_TXT = (x, y, s, a="middle") => `<text x="${x}" y="${y}" text-anchor="${a}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="13" letter-spacing=".5" fill="#FFE9A8">${s}</text>`;
const LV_HELP = {
  intro:{t:"Key moments", steps:["In every match you're picked for, you play the moments that involve you: 2 to 4 if you start, 1 if you come off the bench.",
    "The rest of the match is simulated around them, so the final score includes what you did.",
    "Your attributes, form and sharpness make every moment easier. Tap <b>Sim the match</b> on a match's intro to skip it."]},
  shot:{t:"How to shoot", steps:["<b>Tap the goal</b> where you want to shoot. The corners are hardest to save.",
    "A marker slides along the power bar. Tap <b>Shoot!</b> (or the bar) while it's <b>in the green</b>.",
    "Too early and the shot is weak; too late and it flies over. Good keepers sometimes guess right."],
    svg:`<svg viewBox="0 0 240 160"><rect x="30" y="10" width="180" height="72" fill="rgba(255,255,255,.05)" stroke="#F4F7F2" stroke-width="4"/><circle cx="182" cy="30" r="10" fill="none" stroke="#F5C542" stroke-width="3"/><circle cx="182" cy="30" r="3" fill="#F5C542"/>${LV_TXT(120,52,"1 · TAP TO AIM")}
      <rect x="30" y="112" width="180" height="16" rx="8" fill="rgba(255,255,255,.14)"/><rect x="138" y="112" width="34" height="16" fill="rgba(74,222,128,.8)"/><rect x="152" y="106" width="5" height="28" rx="2" fill="#fff"/>${LV_TXT(120,152,"2 · STOP IT IN THE GREEN")}</svg>`},
  pass:{t:"How to pass", steps:["Two of your teammates are marked: a <b>red defender</b> is right next to them.",
    "<b>Tap the free teammate</b> before the timer runs out.", "The defenders keep moving, so look again just before you tap."],
    svg:`<svg viewBox="0 0 240 160"><rect width="240" height="160" rx="12" fill="#1D6537"/><circle cx="45" cy="50" r="13" fill="#F4F7F2"/><circle cx="58" cy="62" r="7" fill="#EF4444"/><circle cx="195" cy="50" r="13" fill="#F4F7F2"/><circle cx="182" cy="62" r="7" fill="#EF4444"/>
      <circle cx="120" cy="34" r="13" fill="#F4F7F2" stroke="#F5C542" stroke-width="4"/><circle cx="120" cy="128" r="12" fill="#F5C542"/><path d="M120 114V52" stroke="#FFE9A8" stroke-width="2.5" stroke-dasharray="5 5"/>${LV_TXT(120,152,"TAP THE ONE WITH NO DEFENDER")}</svg>`},
  tackle:{t:"How to tackle", steps:["The attacker runs along the line towards the <b>green zone</b>.",
    "Tap <b>Tackle!</b> while he's inside the green.", "Too early and you dive in; too late and he's past you."],
    svg:`<svg viewBox="0 0 240 120"><rect width="240" height="120" rx="12" fill="#1D6537"/><path d="M14 60H226" stroke="rgba(255,255,255,.35)" stroke-width="4"/><rect x="146" y="28" width="40" height="64" rx="8" fill="rgba(74,222,128,.35)" stroke="#4ADE80" stroke-width="2"/>
      <circle cx="70" cy="60" r="13" fill="#EF4444" stroke="#fff" stroke-width="3"/><path d="M92 60h34m-8-7 8 7-8 7" stroke="#FFE9A8" stroke-width="3" fill="none"/>${LV_TXT(120,112,"TAP WHEN HE'S IN THE GREEN")}</svg>`},
  block:{t:"How to block", steps:["The shot travels along the line towards goal.", "Tap <b>Block!</b> when the ball is <b>in the green</b>.", "Miss it and they'll probably score."],
    svg:`<svg viewBox="0 0 240 120"><rect width="240" height="120" rx="12" fill="#1D6537"/><path d="M14 60H214" stroke="rgba(255,255,255,.35)" stroke-width="4"/><rect x="166" y="28" width="34" height="64" rx="8" fill="rgba(74,222,128,.35)" stroke="#4ADE80" stroke-width="2"/>
      <rect x="216" y="24" width="12" height="72" fill="rgba(255,255,255,.2)" stroke="#F4F7F2" stroke-width="3"/><circle cx="80" cy="60" r="9" fill="#fff"/><path d="M98 60h40m-8-7 8 7-8 7" stroke="#FFE9A8" stroke-width="3" fill="none"/>${LV_TXT(115,112,"TAP WHEN THE BALL'S IN THE GREEN")}</svg>`},
  coins:{t:"Gold coins", steps:["You earn gold coins in every match you play with key moments. Your total sits next to your name at the top.",
    "A win is worth <b>50</b>, a draw <b>10</b> and a defeat nothing.", "Every goal you score adds <b>20</b> and every assist <b>15</b>, but an own goal costs <b>10</b>. Simmed matches don't earn coins."]},
  save:{t:"How to save", steps:["The striker lines up his shot. Don't move too early: strikers punish keepers who guess.",
    "Watch which way the ball goes, then <b>tap that side of the goal</b>: left, middle or right.", "Your shot-stopping decides how much time you get."],
    svg:`<svg viewBox="0 0 240 150"><rect x="20" y="10" width="200" height="90" fill="rgba(255,255,255,.05)" stroke="#F4F7F2" stroke-width="4"/><path d="M87 12v86M153 12v86" stroke="rgba(255,255,255,.3)" stroke-dasharray="5 5"/>
      <circle cx="120" cy="130" r="8" fill="#fff"/><path d="M112 124 62 70" stroke="#FFE9A8" stroke-width="3" stroke-dasharray="5 4"/><circle cx="54" cy="62" r="20" fill="rgba(245,197,66,.25)" stroke="#F5C542" stroke-width="3"/>${LV_TXT(160,140,"TAP WHERE IT'S GOING","start")}</svg>`}
};
// gold coins for a match you played: the result, plus your goals and assists, minus own goals
const LV_COINS = {win:50, draw:10, loss:0, goal:20, assist:15, og:-10};
function lvCoins(f){
  const r = f.res, me = f.me, res = r.gf>r.ga ? "win" : r.gf===r.ga ? "draw" : "loss", og = me.og || 0;
  const parts = [[{win:"Win", draw:"Draw", loss:"Defeat"}[res], LV_COINS[res]], ...(me.g ? [[`${me.g} goal${me.g>1?"s":""}`, me.g*LV_COINS.goal]] : []),
    ...(me.a ? [[`${me.a} assist${me.a>1?"s":""}`, me.a*LV_COINS.assist]] : []), ...(og ? [[`${og} own goal${og>1?"s":""}`, og*LV_COINS.og]] : [])];
  return {parts, total:parts.reduce((s,p)=>s + p[1], 0)};
}
const lvHelpKey = m => m.side==="att" ? (m.kind==="pass" ? "pass" : "shot") : m.kind;
function lvSeen(){ try{ return JSON.parse(localStorage.getItem(Account.storageKey("tips"))) || {}; }catch(e){ return {}; } }
function lvMarkSeen(k){ const s = lvSeen(); s[k] = 1; try{ localStorage.setItem(Account.storageKey("tips"), JSON.stringify(s)); }catch(e){} }
async function lvHelp(keys, first){
  for (const k of keys){
    const H = LV_HELP[k];
    await lvAsk(`<div class="lv-card lv-help"><div class="lv-eye">${first ? "First time? Here's how it works" : "How to play"}</div><h2 class="lv-t">${H.t}</h2>
      ${H.svg ? `<div class="lv-demo" aria-hidden="true">${H.svg}</div>` : ""}<ol class="lv-steps">${H.steps.map(s=>`<li>${s}</li>`).join("")}</ol>
      <button type="button" class="btn primary big" data-lv="ok" data-lv-focus>${first ? "Got it, let's play" : "Got it"}</button></div>`);
    lvMarkSeen(k);
  }
}
// every guide that matters for your position
function lvHelpAll(){ const pos = S.player.pos; return ["intro", ...new Set([...(LV_ATT[pos]||[]).map(k=>k==="pass" ? "pass" : "shot"), ...(LV_DEF[pos]||[])])]; }

async function lvPlayMatch(f, w){
  const X = mcXg(f), me = f.me, plan = lvPlan(f, X), pos = S.player.pos;
  const home = f.home || f.neutral ? S.mc.club : f.opp, away = f.home || f.neutral ? f.opp : S.mc.club;
  // the goals your moments don't cover, at random minutes
  const ev = [];
  const rest = (n, us) => { for (let i=0;i<n;i++) ev.push({min:1+Math.floor(Math.random()*90), us}); };
  rest(mcPoisson(X.lf*(1 - Math.min(X.pG+X.pA, .6))), true);
  rest(mcPoisson(X.la*(1 - Math.min((LV_DSHARE[pos]||0)*X.t, .6))), false);
  const st = {f, X, ev, g:0, a:0, og:0, bonus:0, left:plan.length, log:[]};
  lvOpen();
  try{
    if (!lvSeen().intro) await lvHelp(["intro"], true);
    let go;
    while ((go = await lvAsk(`<div class="lv-card">
        <div class="lv-eye">${f.big ? "★ " : ""}${esc(mcCompLabel(f))}${f.code!=="league" ? " · " + esc(f.round) + (f.leg ? `, leg ${f.leg}` : "") : ""} · ${mcDate(w, f)}</div>
        <div class="lv-teams"><span>${esc(home)}</span><i>v</i><span>${esc(away)}</span></div>
        <p>${me.st==="start" ? "You're in the starting line-up." : `You start on the bench and come on around the ${ord(90-me.mins)} minute.`}
          ${plan.length} key moment${plan.length===1?"":"s"} will come your way.</p>
        <div class="lv-row"><button type="button" class="btn primary big" data-lv="play" data-lv-focus>Play key moments</button><button type="button" class="btn" data-lv="sim">Sim the match</button></div>
        <button type="button" class="lv-skip" data-lv="help" style="justify-self:start">How to play</button>
      </div>`))==="help") await lvHelp(lvHelpAll(), false);
    if (go==="play"){
      let auto = false;
      for (const m of plan){
        const r = auto ? lvAutoMoment(st, m) : await lvMoment(st, m);
        if (r==="skip"){ auto = true; lvAutoMoment(st, m); }
        st.left--;
      }
      mcResolve(f, w, {gf:ev.filter(e=>e.us).length, ga:ev.filter(e=>!e.us).length, g:st.g, a:st.a, og:st.og, bonus:st.bonus});
      f.coins = lvCoins(f).total; Account.addCoins(f.coins); save();
      if (!lvSeen().coins) await lvHelp(["coins"], true);
    } else mcResolve(f, w);
    await lvFullTime(st, home, away);
  } finally { lvClose(); }
}
// moments you skip go the way the simulation would have sent them
function lvAutoMoment(st, m){
  if (m.side==="att"){
    if (m.kind==="pass"){ if (Math.random()<.6) lvAssist(st, m, lvConv(st)); else st.bonus -= .05; }
    else if (Math.random()<.36){ st.g++; st.ev.push({min:m.min, us:true}); } else st.bonus -= .05;
  } else if (Math.random()<.55) st.bonus += .2;
  else if (Math.random()<(m.kind==="save" ? .9 : m.kind==="block" ? .7 : .55)){ st.ev.push({min:m.min, us:false}); st.bonus -= .25; if (m.kind==="block" && Math.random()<.3){ st.og++; st.bonus -= .15; } }
  st.log.push({min:m.min, txt:"Simmed"});
}
const lvConv = st => clamp(.58 + (st.X.base - st.f.oppStr)*.012, .35, .8);
function lvAssist(st, m, conv){ if (Math.random()<conv){ st.a++; st.ev.push({min:m.min, us:true}); return true; } st.bonus += .1; return false; }
async function lvMoment(st, m){
  if (!lvSeen()[lvHelpKey(m)]) await lvHelp([lvHelpKey(m)], true);
  if (m.side==="att") return m.kind==="pass" ? lvPass(st, m) : lvShot(st, m);
  return m.kind==="save" ? lvSave(st, m) : lvTiming(st, m);
}
// after each moment: the outcome over the pitch, then on to the next
function lvOutcome(st, m, good, big, small){
  st.log.push({min:m.min, txt:big + (small ? ` · ${small}` : ""), good});
  lv$(".lv-stage").insertAdjacentHTML("beforeend", `<div class="lv-res ${good?"good":"bad"}"><span>${esc(big)}</span>${small?`<small>${esc(small)}</small>`:""}</div>`);
  const act = lv$(".lv-act"); act.textContent = st.left>1 ? "Next moment" : "Full time"; act.disabled = true; act.classList.add("primary");
  lv$("[data-lv-skip]")?.remove();
  // a short pause, so the tap that made the tackle can't also skip past its result
  return new Promise(res=>setTimeout(()=>{
    if (!lvEl) return res();
    act.disabled = false; act.focus({preventScroll:true});
    lvKey = k=>{ if (k==="go"){ lvKey = null; res(); } }; act.onclick = ()=>{ lvKey = null; res(); };
  }, 450));
}
function lvSkippable(res){ lv$("[data-lv-skip]")?.addEventListener("click", ()=>{ cancelAnimationFrame(lvRaf); lvKey = null; res("skip"); }); }
async function lvFullTime(st, home, away){
  const f = st.f, me = f.me, [l, r] = f.home || f.neutral ? [f.res.gf, f.res.ga] : [f.res.ga, f.res.gf];
  const bits = [me.g ? `${me.g} goal${me.g>1?"s":""}` : "", me.a ? `${me.a} assist${me.a>1?"s":""}` : "", me.cs && (DEF.includes(S.player.pos) || S.player.pos==="CDM") ? "clean sheet" : ""].filter(Boolean);
  await lvAsk(`<div class="lv-card lv-ftc">
      <div class="lv-eye">Full time${f.res.pens ? ` · ${f.res.pens==="won"?"won":"lost"} on penalties` : f.agg ? ` · ${f.agg[0]}–${f.agg[1]} on aggregate` : ""}</div>
      <div class="lv-ft"><span>${esc(home)}</span><b>${l}–${r}</b><span>${esc(away)}</span></div>
      <div class="lv-rate"><span class="label">Your rating</span><b class="${me.r>=7.5?"hi":me.r<6?"lo":""}">${me.r ?? "–"}</b><span>${bits.join(" · ") || (me.mins ? "No goal involvement" : "")}</span></div>
      ${f.coins!=null ? (()=>{ const C = lvCoins(f); return `<div class="lv-coins"><i class="coin" aria-hidden="true"></i><b>${C.total>=0?"+":""}${C.total}</b><span>${C.parts.map(([l,n])=>`${esc(l)} ${n>=0?"+":""}${n}`).join(" · ")}</span></div>`; })()
        : `<p class="lv-nocoins">Simmed matches don't earn gold coins. Play the key moments to earn them.</p>`}
      ${st.log.length ? `<ol class="lv-log">${st.log.map(x=>`<li class="${x.good===true?"good":x.good===false?"bad":""}"><span>${x.min}'</span>${esc(x.txt)}</li>`).join("")}</ol>` : ""}
      <button type="button" class="btn primary big" data-lv="ok" data-lv-focus>Continue</button>
    </div>`);
}

/* ---------- shots: aim, then power ---------- */
function lvGoalSvg(kc){
  return `<svg viewBox="0 0 300 180" aria-hidden="true">
    <defs><pattern id="lvNet" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1"/></pattern>
      <radialGradient id="lvLight" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#FFF6D6" stop-opacity=".22"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient></defs>
    <rect width="300" height="180" fill="#08180F"/><rect width="300" height="180" fill="url(#lvLight)"/>
    <rect y="124" width="300" height="56" fill="#1D6537"/><path d="M0 146h300M0 168h300" stroke="rgba(255,255,255,.06)" stroke-width="11"/>
    <rect x="30" y="20" width="240" height="104" fill="url(#lvNet)"/>
    <path d="M30 124V20h240v104" fill="none" stroke="#F4F7F2" stroke-width="5" stroke-linejoin="round"/>
    <path d="M0 124h300" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <g id="lvKp" transform="translate(150 84)"><path d="M-10 -8L-26 -24M10 -8L26 -24" stroke="${kc}" stroke-width="7" stroke-linecap="round"/><rect x="-11" y="-14" width="22" height="32" rx="8" fill="${kc}" stroke="rgba(0,0,0,.35)"/>
      <circle cy="-22" r="7.5" fill="#D9A37A"/><path d="M-6 18v20M6 18v20" stroke="#15171A" stroke-width="7" stroke-linecap="round"/></g>
    <g id="lvBall" transform="translate(150 166)"><circle r="7" fill="#fff" stroke="#15171A" stroke-width="1.4"/><path d="M-3 -2l3-2 3 2-1 3h-4z" fill="#15171A"/></g>
  </svg>`;
}
const lvMove = (id, x, y, rot=0, sc=1) => lv$(id)?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(2)})`);
function lvShot(st, m){
  const K = LV_SHOT[m.kind], f = st.f, a = S.attr, c = S.cond, attr = m.kind==="header" ? (a.fin*.6 + a.def*.4) : a.fin;
  const zone = clamp(K.z + (attr - f.oppStr)*.004 + (c.sharp-60)*.001 + (mcFormAvg()-6.6)*.02, .05, .32), mid = .72;
  const per = K.per*clamp(1 + (attr - f.oppStr)*.01, .75, 1.3), kq = clamp(.5 + (f.oppStr - attr)/40, .2, .85);
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">${K.t}</h2><p class="lv-s">${K.s}</p>
      <div class="lv-stage">${lvGoalSvg(meta(f.opp).c1 || "#2563EB")}
        <div class="lv-aims">${["tl","tc","tr","bl","bc","br"].map(z=>`<button type="button" class="lv-aim" data-z="${z}" aria-label="Aim ${{t:"high",b:"low"}[z[0]]} ${{l:"left",c:"centre",r:"right"}[z[1]]}"></button>`).join("")}</div></div>
      <div class="lv-bar" aria-hidden="true"><span class="lv-zone" style="left:${((mid-zone/2)*100).toFixed(1)}%;width:${(zone*100).toFixed(1)}%"></span><span class="lv-mark"></span></div>
      <button type="button" class="btn big lv-act" disabled>Tap the goal to aim</button>`);
    lvSkippable(res);
    let aim = null, t0 = 0, p = 0, fired = false;
    const mark = lv$(".lv-mark"), act = lv$(".lv-act");
    const run = now=>{ if (!t0) t0 = now; p = (1 - Math.cos(2*Math.PI*(now-t0)/per))/2; mark.style.left = (p*100).toFixed(2)+"%"; lvRaf = requestAnimationFrame(run); };
    lvEl.querySelectorAll(".lv-aim").forEach(b=>b.addEventListener("pointerdown", e=>{ e.preventDefault(); setAim(b); }));
    lvEl.querySelectorAll(".lv-aim").forEach(b=>b.addEventListener("click", ()=>setAim(b)));
    function setAim(b){
      if (fired) return; aim = b.dataset.z; lvEl.querySelectorAll(".lv-aim").forEach(x=>x.classList.toggle("on", x===b));
      if (!t0){ lvRaf = requestAnimationFrame(run); act.disabled = false; act.classList.add("primary"); act.textContent = "Shoot!"; }
    }
    const fire = async ()=>{
      if (!aim || fired) return; fired = true; cancelAnimationFrame(lvRaf); act.disabled = true;
      const lo = mid-zone/2, hi = mid+zone/2, row = aim[0], col = aim[1];
      let over = false, weak = 0;
      if (p>hi){ if (row==="t" || p-hi>.12 || Math.random()<.5) over = true; else weak = .15; }
      else if (p<lo) weak = clamp((lo-p)*1.6, .15, .6);
      // good keepers read where you're going more often
      const kcol = Math.random() < 1/3 + kq*.25 ? col : pick(["l","c","r"].filter(x=>x!==col));
      const read = {t:{l:.45, c:.8, r:.45}, b:{l:.6, c:.9, r:.6}}[row][col];
      const save = clamp((kcol===col ? read : col==="c" ? .2 : .04)*(kq/.5)*K.k + weak, .02, .97);
      const goal = !over && Math.random()>save;
      const tx = LV_COLS[col] + (Math.random()*16-8), ty = over ? -12 : LV_ROWS[row] + (Math.random()*10-5);
      const kx = LV_COLS[kcol], ky = row==="t" ? 62 : 96, rot = kcol==="l" ? -62 : kcol==="r" ? 62 : 0;
      await lvTween(480, k=>{ const e = 1-Math.pow(1-k, 2); lvMove("#lvBall", 150 + (tx-150)*e, 166 + (ty-166)*e, k*540, 1 - .35*e);
        const d = Math.min(1, k*1.4); lvMove("#lvKp", 150 + (kx-150)*d, 84 + (ky-84)*d, rot*d); });
      if (goal){ st.g++; st.ev.push({min:m.min, us:true}); }
      else st.bonus -= .08;
      const why = over ? (row==="t" ? "Too high" : "Overhit") : weak>=.3 ? "Not enough on it" : kcol===col ? "The keeper read it" : "Brilliant save";
      res(lvOutcome(st, m, goal, goal ? "Goal!" : over ? "Over the bar" : "Saved", goal ? (kcol===col ? "Past the keeper's hands" : "Sent him the wrong way") : why));
    };
    act.addEventListener("click", fire);
    lv$(".lv-bar").addEventListener("pointerdown", fire);
    lvKey = k=>{ if (k==="go") fire(); };
  });
}

/* ---------- passes: tap the free teammate ---------- */
const LV_SPOTS = [[16,40],[50,20],[84,40]];
function lvPass(st, m){
  const f = st.f, a = S.attr, c = S.cond, pos = S.player.pos;
  const win = clamp(2400 + (a.pas - f.oppStr)*30 + (c.sharp-60)*4, 1400, 3400), iv = clamp(950 + (a.pas - f.oppStr)*10, 550, 1300);
  const title = {LB:"Overlap down the wing", RB:"Overlap down the wing", ST:"Hold it up and lay it off", LW:"Cutting inside", RW:"Cutting inside"}[pos] || "Teammate making a run";
  const spots = LV_SPOTS.map(([x,y])=>[x + Math.random()*8-4, y + Math.random()*8-4]);
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">${title}</h2><p class="lv-s">Tap the teammate who's free before the defenders close him down.</p>
      <div class="lv-stage lv-pitch">
        ${spots.map(([x,y],i)=>`<button type="button" class="lv-p lv-mate" data-i="${i}" style="left:${x}%;top:${y}%" aria-label="Pass to teammate ${i+1}">${[9,10,7][i]}</button>`).join("")}
        ${[0,1,2].map(i=>`<span class="lv-p lv-opp" data-d="${i}"></span>`).join("")}
        <span class="lv-p lv-me" style="left:50%;top:84%">You</span><span class="lv-pball" style="left:50%;top:78%"></span>
      </div>
      <div class="lv-timer"><span></span></div>
      <button type="button" class="btn big lv-act" disabled>Find the free man</button>`);
    lvSkippable(res);
    let open = Math.floor(Math.random()*3), prev = -1, switched = 0, done = false;
    const place = ()=>{
      const marked = [0,1,2].filter(i=>i!==open), ds = lvEl.querySelectorAll(".lv-opp");
      marked.forEach((i,k)=>{ ds[k].style.left = (spots[i][0] + (k ? -5 : 5)) + "%"; ds[k].style.top = (spots[i][1] + 6) + "%"; });
      ds[2].style.left = (35 + Math.random()*30) + "%"; ds[2].style.top = (50 + Math.random()*12) + "%";
      lvEl.querySelectorAll(".lv-mate").forEach((b,i)=>b.classList.toggle("free", i===open));
    };
    place();
    const t0 = performance.now(), bar = lv$(".lv-timer span");
    let next = t0 + iv;
    const tick = now=>{
      if (done) return;
      bar.style.width = Math.max(0, 100 - (now-t0)/win*100) + "%";
      if (now>=t0+win){ finish(-1); return; }
      if (now>=next){ prev = open; open = pick([0,1,2].filter(i=>i!==open)); switched = now; next = now + iv*(.8 + Math.random()*.4); place(); }
      lvRaf = requestAnimationFrame(tick);
    };
    lvRaf = requestAnimationFrame(tick);
    const finish = async i=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      // a fraction of a second's grace when the defenders have only just moved
      const ok = i>=0 && (i===open || (i===prev && performance.now()-switched<220));
      if (!ok){ st.bonus -= .1; res(lvOutcome(st, m, false, i<0 ? "Closed down" : "Intercepted", i<0 ? "You took too long" : "He was marked")); return; }
      const ball = lv$(".lv-pball"); ball.style.left = spots[i][0] + "%"; ball.style.top = spots[i][1] + "%";
      await lvWait(380);
      const scored = lvAssist(st, m, lvConv(st));
      res(lvOutcome(st, m, scored, scored ? "Assist!" : "Chance created", scored ? `Your teammate finished it off` : "Great ball, but his shot was saved"));
    };
    lvEl.querySelectorAll(".lv-mate").forEach(b=>b.addEventListener("pointerdown", e=>{ e.preventDefault(); finish(+b.dataset.i); }));
    lvEl.querySelectorAll(".lv-mate").forEach(b=>b.addEventListener("click", ()=>finish(+b.dataset.i)));
    lvKey = k=>{ const i = {l:0, c:1, r:2}[k]; if (i!=null) finish(i); };
  });
}

/* ---------- tackles and blocks: timing ---------- */
function lvTiming(st, m){
  const f = st.f, a = S.attr, c = S.cond, block = m.kind==="block";
  const zone = clamp(.14 + (a.def - f.oppStr)*.005 + (c.sharp-60)*.0008 + (mcFormAvg()-6.6)*.02, .06, .3), mid = block ? .8 : .68;
  const per = clamp(1300 - (f.oppStr - a.def)*12 - (block ? 0 : (f.oppStr - a.pac)*5), 700, 1700);
  const T = block ? {t:"Shot heading for goal!", s:"Throw yourself in the way: tap when the ball reaches the green.", b:"Block!"}
    : {t:"Counter-attack!", s:"He's running at you. Tap to tackle when he's in the green.", b:"Tackle!"};
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">${T.t}</h2><p class="lv-s">${T.s}</p>
      <div class="lv-stage lv-run ${block?"blk":""}">
        <span class="lv-lane"></span><span class="lv-tz" style="left:${((mid-zone/2)*100).toFixed(1)}%;width:${(zone*100).toFixed(1)}%"></span>
        ${block ? `<span class="lv-net"></span>` : ""}<span class="lv-runner ${block?"ball":""}"></span>
      </div>
      <button type="button" class="btn primary big lv-act">${T.b}</button>`);
    lvSkippable(res);
    let p = -.08, done = false;
    const runner = lv$(".lv-runner"), act = lv$(".lv-act"), t0 = performance.now() + 450;
    const tick = now=>{
      if (done) return;
      p = (now-t0)/per; runner.style.left = (clamp(p, -.08, 1)*100).toFixed(2) + "%";
      if (p>=1){ go(); return; }
      lvRaf = requestAnimationFrame(tick);
    };
    lvRaf = requestAnimationFrame(tick);
    const go = ()=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf); act.disabled = true;
      const ok = Math.abs(p-mid)<=zone/2, early = p<mid-zone/2;
      if (ok){ st.bonus += .3; res(lvOutcome(st, m, true, block ? "Blocked!" : "Tackle won!", block ? "Off your shin and away" : "Clean as a whistle")); return; }
      const scored = Math.random() < (block ? .7 : .5), og = scored && block && Math.random() < .3;   // a block that goes wrong can deflect in off you
      if (scored){ st.ev.push({min:m.min, us:false}); st.bonus -= og ? .45 : .3; if (og) st.og++; } else st.bonus -= .1;
      const why = early ? (block ? "You went down too soon" : "You dived in") : (block ? "Too late" : "He skipped past you");
      res(lvOutcome(st, m, false, og ? "Own goal" : scored ? "They score" : "Got away with it", og ? "It deflected in off you" : scored ? why : `${why}, but the shot went wide`));
    };
    act.addEventListener("pointerdown", e=>{ e.preventDefault(); go(); });
    act.addEventListener("click", go);
    lv$(".lv-stage").addEventListener("pointerdown", go);
    lvKey = k=>{ if (k==="go") go(); };
  });
}

/* ---------- saves: react to the shot ---------- */
function lvSave(st, m){
  const f = st.f, a = S.attr, c = S.cond, pen = Math.random()<.1;
  const react = clamp(720 + (a.def - f.oppStr)*14 + (c.sharp-60)*2 + (mcFormAvg()-6.6)*40 - (pen ? 120 : 0), 380, 1150);
  const T = pen ? {t:"Penalty!", s:"Watch the ball and dive the right way: tap that side of the goal."}
    : pick([{t:"One-on-one!", s:"He's through. Watch the ball and dive the right way."}, {t:"Shot from the edge of the box", s:"Watch the ball and dive the right way: tap that side of the goal."}]);
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">${T.t}</h2><p class="lv-s">${T.s}</p>
      <div class="lv-stage">${lvGoalSvg(meta(S.mc.club).c1 || "#16A34A")}
        <div class="lv-thirds">${["l","c","r"].map(z=>`<button type="button" data-z="${z}" aria-label="Dive ${{l:"left",c:"centre",r:"right"}[z]}"></button>`).join("")}</div>
        <span class="lv-cue">${pen ? "Penalty" : "Here he comes"}…</span></div>
      <button type="button" class="btn big lv-act" disabled>Watch the ball</button>`);
    lvSkippable(res);
    let dir = null, ty = LV_ROWS.b, tap = null, tapAt = 0, rel = 0, done = false;
    const windUp = 600 + Math.random()*700, t0 = performance.now();
    const pickDir = ()=>{ const all = ["l","c","r"]; if (tap && Math.random()<.8) return pick(all.filter(z=>z!==tap)); return pick(["l","l","c","r","r"]); };   // strikers punish keepers who go early
    const tick = now=>{
      if (done) return;
      if (!dir && now-t0>=windUp){ dir = pickDir(); ty = pick([LV_ROWS.t, LV_ROWS.b]); rel = now; lv$(".lv-cue")?.remove(); }
      if (dir){
        const k = Math.min(1, (now-rel)/react), tx = LV_COLS[dir];
        lvMove("#lvBall", 150 + (tx-150)*k, 166 + (ty-166)*k, k*400, 1 - .35*k);
        if (k>=1){ end(); return; }
      }
      lvRaf = requestAnimationFrame(tick);
    };
    lvRaf = requestAnimationFrame(tick);
    const dive = z=>{
      if (tap || done) return; tap = z; tapAt = performance.now();
      const kx = LV_COLS[z], rot = z==="l" ? -62 : z==="r" ? 62 : 0;
      lvTween(220, k=>lvMove("#lvKp", 150 + (kx-150)*k, 84 + (z==="c" ? -20 : 8)*k, rot*k));
      if (dir) end();
    };
    const end = async ()=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      if (!dir) dir = pickDir();
      const saved = tap===dir && Math.random() > clamp((f.oppStr - a.def)/50, 0, .2);
      const wide = !saved && Math.random()<.08;
      lvMove("#lvBall", LV_COLS[dir], ty, 0, .65);
      await lvWait(250);
      if (saved){ st.bonus += .35; res(lvOutcome(st, m, true, "Saved!", tap && tapAt<rel ? "You guessed right" : "Great reactions")); return; }
      if (wide){ st.bonus -= .05; res(lvOutcome(st, m, true, "Off the post!", "Lucky")); return; }
      st.ev.push({min:m.min, us:false}); st.bonus -= .3;
      res(lvOutcome(st, m, false, "Goal", !tap ? "You didn't move" : tapAt<rel ? "You went too early" : "Wrong way"));
    };
    lvEl.querySelectorAll(".lv-thirds button").forEach(b=>b.addEventListener("pointerdown", e=>{ e.preventDefault(); dive(b.dataset.z); }));
    lvEl.querySelectorAll(".lv-thirds button").forEach(b=>b.addEventListener("click", ()=>dive(b.dataset.z)));
    lvKey = k=>{ if (k!=="go") dive(k); };
  });
}
