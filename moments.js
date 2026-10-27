/* ================= KEY MOMENTS =================
   Every match you're picked for is played as key moments, like FC's player career: four if you start, one or two
   off the bench, drawn by position from LV_POOL's mini-games: shots and free kicks, headers, passes, a full
   attacking move, take-ons and crosses; tackles, blocks, interceptions and shadowing your man; and for keepers
   saves, penalties, claiming crosses and rushing out. How many are attacking rather than defending, and how good the
   chances are, follow how the match is going for your team (mcXg's expected goals each way). The rest of the match
   is simulated around them: the expected goals each way minus what the moments stand in for (LV_EV at average
   skill, scaled by chance quality), so the score always includes what you did. Each mini-game (LV_GAMES) resolves to
   a result R that lvApply turns into goals, assists, own goals, goals conceded and a rating bonus. */
const LV_POOL = {
  ST:{att:["shot:oneonone","shot:box","header","move","takeon","pass"], def:["intercept"]},
  LW:{att:["shot:box","takeon","cross","move","pass"], def:["intercept","tackle"]},
  RW:{att:["shot:box","takeon","cross","move","pass"], def:["intercept","tackle"]},
  CAM:{att:["shot:box","pass","move","takeon","pass","shot:freekick"], def:["intercept"]},
  CM:{att:["pass","move","shot:long"], def:["intercept","tackle"]},
  CDM:{att:["pass","shot:long"], def:["intercept","tackle","shadow","block"]},
  LB:{att:["cross","takeon","pass"], def:["tackle","shadow","intercept","block"]},
  RB:{att:["cross","takeon","pass"], def:["tackle","shadow","intercept","block"]},
  CB:{att:["header"], def:["tackle","block","intercept","shadow"]},
  GK:{att:[], def:["save","save","save","claim","rush"]}
};
// expected goals each moment stands for at average skill: scored (attacking) or conceded (defending)
const LV_EV = {"shot:oneonone":.45, "shot:box":.34, "shot:long":.13, "shot:freekick":.17, header:.26, pass:.18, move:.3, takeon:.24, cross:.16,
  intercept:.1, tackle:.2, block:.28, shadow:.18, save:.36, "save:pen":.6, claim:.14, rush:.3};
// the share of the goals your team concedes that a position's defending moments can stand for
const LV_DSHARE = {GK:.75, CB:.4, LB:.3, RB:.3, CDM:.25, CM:.15};
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
function lvShow(html){ cancelAnimationFrame(lvRaf); lvKey = null; lvEl.innerHTML = `<div class="lv-in">${html}</div>`; lvEl.scrollTop = 0; (lvEl.querySelector("[data-lv-focus]") || lvEl.querySelector("button"))?.focus({preventScroll:true}); }
const lv$ = s => lvEl.querySelector(s);
// a screen whose buttons (data-lv="value") answer it
function lvAsk(html){ return new Promise(res=>{ lvShow(html); lvEl.querySelectorAll("[data-lv]").forEach(b=>b.addEventListener("click", ()=>res(b.dataset.lv))); }); }
function lvTween(ms, step){ return new Promise(res=>{ const t0 = performance.now(); const tick = now=>{ const k = Math.min(1, (now-t0)/ms); step(k); if (k<1) lvRaf = requestAnimationFrame(tick); else res(); }; lvRaf = requestAnimationFrame(tick); }); }
const lvWait = ms => new Promise(r=>setTimeout(r, ms));
// one animation loop per mini-game: step(now) returns false to stop
function lvLoop(step){ const tick = now=>{ if (lvEl && step(now)!==false) lvRaf = requestAnimationFrame(tick); }; lvRaf = requestAnimationFrame(tick); }
document.addEventListener("keydown", e=>{
  if (!lvEl || !lvKey) return;
  const k = {" ":"go", Enter:"go", ArrowLeft:"l", ArrowRight:"r", ArrowUp:"c", ArrowDown:"c"}[e.key];
  if (!k || (k==="go" && e.target.closest && e.target.closest(".lv-aim, .lv-tap, [data-lv]"))) return;
  e.preventDefault(); lvKey(k);
});
// fast taps: act on pointerdown, and ignore the click that follows
function lvTap(el, fn){ if (!el) return; el.addEventListener("pointerdown", e=>{ e.preventDefault(); fn(e); }); el.addEventListener("click", e=>{ if (e.detail===0) fn(e); }); }

/* ---------- drawing ---------- */
const lvPct = (x, y) => `left:${(x/3).toFixed(2)}%;top:${(y/1.8).toFixed(2)}%`;
// how much easier your attribute makes a moment against this opponent, with sharpness and form: about −0.35 to +0.35
const lvEase = (st, attr) => clamp((attr - st.f.oppStr)/40 + (S.cond.sharp-60)/400 + (mcFormAvg()-6.6)/10, -.35, .35);
// light kit? (this file loads before game.js, so it can't use isLight while drawing the instruction diagrams)
function lvLight(hex){ const h = s => parseInt(String(hex).slice(s, s+2), 16) || 0; return (h(1)*299 + h(3)*587 + h(5)*114)/1000 > 150; }
function lvNear(x, y){ const h = s => [1,3,5].map(i=>parseInt(String(s).slice(i,i+2),16)||0), a = h(x), b = h(y); return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]) < 110; }
// both kits, kept apart when they clash; each kit's second colour goes on its collars, cuffs and shorts (LV_TRIM)
const LV_TRIM = {}, LV_SKIN = ["#F1C9A5","#D9A37A","#B57D52","#8A5A3B","#5C3A24"], LV_HAIR = ["#17130F","#2B1B12","#4A2E1A","#17130F","#B5872F","#0E0B09"];
function lvKits(st){
  const us = meta(S.mc.club), them = meta(st.f.opp);
  let t = them.c1, tt = them.c2;
  if (lvNear(us.c1, t)){ if (them.c2 && !lvNear(us.c1, them.c2)){ t = them.c2; tt = them.c1; } else { t = lvLight(us.c1) ? "#1F2937" : "#E5E7EB"; tt = null; } }
  LV_TRIM[us.c1] = us.c2; LV_TRIM[t] = tt;
  return {us:us.c1, them:t};
}
// a player seen from above or the front: (x, y) is where his feet are. Shirt and socks in the kit colour, shorts and
// trim in its second; skin and hair vary with where he stands, and you (o.ring) look like your player
function lvMan(x, y, kit, o={}){
  let trim = o.trim || LV_TRIM[kit];
  if (!trim || lvNear(trim, kit)) trim = lvLight(kit) ? "#1F2937" : "#F3F4F6";
  const v = Math.abs(Math.round(x*7 + y*13)), you = !!o.ring && typeof S!=="undefined" && S && S.player;
  const skin = o.skin || (you ? LV_SKIN[S.player.skin ?? 1] : LV_SKIN[v % LV_SKIN.length]) || LV_SKIN[1];
  const hair = you ? (S.player.hair==="none" ? null : HAIRC[S.player.hairColour] || LV_HAIR[0]) : LV_HAIR[v % LV_HAIR.length];
  return `<g ${o.id?`id="${o.id}"`:""} transform="translate(${x} ${y}) scale(${o.s||1})">
    <ellipse cy="1" rx="10" ry="3.2" fill="rgba(0,0,0,.35)"/>
    ${o.ring ? `<circle cy="-16" r="19" fill="none" stroke="${o.ring}" stroke-width="2.5" opacity=".9"/>` : ""}
    <path d="M-3.8 -12V-3M3.8 -12V-3" stroke="${skin}" stroke-width="3.3" stroke-linecap="round"/>
    <path d="M-3.8 -7.4V-2.6M3.8 -7.4V-2.6" stroke="${kit}" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M-6.6 -.8h4.4M2.2 -.8h4.4" stroke="#0E1012" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-7.8 -18.4h15.6l.9 6.6h-6.6l-1.9-1.7-1.9 1.7h-6.6z" fill="${trim}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>
    <path d="M-8 -25l-5 8M8 -25l5 8" stroke="${kit}" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M-12.2 -18.4l-.8 1.4M12.2 -18.4l.8 1.4" stroke="${trim}" stroke-width="4.4" stroke-linecap="round"/>
    <circle cx="-13.6" cy="-15.3" r="1.8" fill="${skin}"/><circle cx="13.6" cy="-15.3" r="1.8" fill="${skin}"/>
    <path d="M-8 -26q8-4 16 0v8h-16z" fill="${kit}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>
    <path d="M2.6 -27.7q3.1.5 5.4 1.7v8h-5.4z" fill="#000" opacity=".13"/>
    <path d="M-3.2 -27.6q3.2 2 6.4 0" fill="none" stroke="${trim}" stroke-width="1.5"/>
    <circle cy="-31" r="5.6" fill="${skin}"/>
    ${hair ? `<path d="M-5.6 -31.4a5.6 5.6 0 0 1 11.2 0q-2.3-2.4-5.6-2.4q-3.3 0-5.6 2.4z" fill="${hair}"/>` : ""}
    ${o.num!=null ? `<text y="-19.6" text-anchor="middle" font-size="7.6" font-weight="800" fill="${lvLight(kit) ? "#15171A" : "#FFFFFF"}" font-family="Barlow Condensed,sans-serif">${o.num}</text>` : ""}
    ${o.label ? `<text y="-42" text-anchor="middle" font-size="9" font-weight="700" fill="#FFE9A8" font-family="Barlow Condensed,sans-serif" letter-spacing=".5">${o.label}</text>` : ""}
  </g>`;
}
const lvBallSvg = (id, x, y, r=5) => `<g id="${id}" transform="translate(${x} ${y})"><ellipse cy="${r*.9}" rx="${r}" ry="${r*.35}" fill="rgba(0,0,0,.35)"/><circle r="${r}" fill="#fff" stroke="#15171A" stroke-width="1.1"/><path d="M${-r*.4} ${-r*.3}l${r*.4}-${r*.3} ${r*.4} ${r*.3}-${r*.15} ${r*.45}h-${r*.5}z" fill="#15171A"/><circle cx="${-r*.35}" cy="${-r*.45}" r="${r*.28}" fill="#fff" opacity=".8"/></g>`;
// a pitch from above: attacking the goal at the top, or defending yours at the bottom ("side" puts the goal on the right)
function lvField(goal, inner=""){
  const box = goal==="top" ? `<rect x="90" y="5" width="120" height="44"/><rect x="124" y="5" width="52" height="16"/><path d="M120 49a30 30 0 0 0 60 0"/>`
    : goal==="bottom" ? `<rect x="90" y="131" width="120" height="44"/><rect x="124" y="159" width="52" height="16"/><path d="M120 131a30 30 0 0 1 60 0"/>`
    : goal==="side" ? `<rect x="236" y="40" width="59" height="100"/><rect x="273" y="66" width="22" height="48"/>` : `<circle cx="150" cy="90" r="24"/><path d="M150 5v170"/>`;
  const net = goal==="top" ? `<rect x="133" y="0" width="34" height="6" fill="rgba(255,255,255,.8)"/>` : goal==="bottom" ? `<rect x="133" y="174" width="34" height="6" fill="rgba(255,255,255,.8)"/>`
    : goal==="side" ? `<rect x="293" y="74" width="7" height="32" fill="rgba(255,255,255,.8)"/>` : "";
  // mown stripes, a little grass texture, the lines, and the floodlights fading towards the corners
  return `<svg viewBox="0 0 300 180" aria-hidden="true"><defs><radialGradient id="lvVg" cx="50%" cy="45%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient>
      <pattern id="lvGr" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M1 6.5 2.4 4M4.6 3.5 6 1" stroke="#fff" stroke-opacity=".05" stroke-width="1"/></pattern></defs>
    <rect width="300" height="180" fill="#195C33"/>
    ${[0,2,4,6,8].map(i=>goal==="side" ? `<rect x="${i*30}" width="30" height="180" fill="#1E6A3B"/>` : `<rect y="${i*18}" width="300" height="18" fill="#1E6A3B"/>`).join("")}
    <rect width="300" height="180" fill="url(#lvGr)"/>
    <g fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"><rect x="5" y="5" width="290" height="170"/>${box}</g>${net}
    <rect width="300" height="180" fill="url(#lvVg)"/>${inner}</svg>`;
}
// the crowd in the stands behind the goal: heads in three rows, some in each team's colours
function lvCrowd(){
  const R = seeded(77), cols = ["#26332D","#33413A","#1E2A25","#3D4A43"], k = S && S.mc ? [meta(S.mc.club).c1] : [];
  return `<g opacity=".55">${[0,1,2,3].map(r=>[...Array(33)].map((_,i)=>{ const c = R()<.16 && k.length ? k[0] : cols[Math.floor(R()*cols.length)];
    return `<circle cx="${(i*9.4 + (r%2)*4.7 + R()*2).toFixed(1)}" cy="${(14 + r*20 + R()*3).toFixed(1)}" r="${(3.6 + R()*1.2).toFixed(1)}" fill="${c}"/><rect x="${(i*9.4 + (r%2)*4.7 - 4.5).toFixed(1)}" y="${(18 + r*20).toFixed(1)}" width="9" height="9" rx="3" fill="${c}"/>`; }).join("")).join("")}</g>`;
}
// the goal from the front, with the keeper (you, when me is set) and, for free kicks, a wall
function lvGoalSvg(kc, wall, me){
  const skin = me ? LV_SKIN[S.player.skin ?? 1] : "#D9A37A", hair = me ? (S.player.hair==="none" ? null : HAIRC[S.player.hairColour]) : "#1A120D";
  return `<svg viewBox="0 0 300 180" aria-hidden="true">
    <defs><pattern id="lvNet" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1"/></pattern>
      <radialGradient id="lvLight" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#FFF6D6" stop-opacity=".22"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient></defs>
    <rect width="300" height="180" fill="#08180F"/>
    ${lvCrowd()}<rect width="300" height="180" fill="url(#lvLight)"/>
    <rect y="100" width="300" height="24" fill="#0B1A12"/>${[0,1,2,3,4,5].map(i=>`<text x="${25+i*50}" y="116" text-anchor="middle" font-family="Big Shoulders Display, Impact, sans-serif" font-weight="900" font-size="10" letter-spacing="1" fill="${i%2 ? "#F5C542" : "#7FD7C4"}" opacity=".38">PYRAMID</text>`).join("")}
    <rect y="124" width="300" height="56" fill="#1D6537"/><path d="M0 146h300M0 168h300" stroke="rgba(255,255,255,.06)" stroke-width="11"/>
    <path d="M30 20 16 32v92h14zM270 20l14 12v92h-14z" fill="url(#lvNet)" opacity=".7"/><path d="M30 20 16 32v92M270 20l14 12v92" fill="none" stroke="rgba(244,247,242,.5)" stroke-width="1.5"/>
    <rect x="30" y="20" width="240" height="104" fill="#06120B" opacity=".55"/><rect x="30" y="20" width="240" height="104" fill="url(#lvNet)"/>
    <path d="M30 124V20h240v104" fill="none" stroke="#F4F7F2" stroke-width="5" stroke-linejoin="round"/>
    <path d="M0 124h300" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <g id="lvKp" transform="translate(150 84)"><path d="M-10 -8L-26 -24M10 -8L26 -24" stroke="${kc}" stroke-width="7" stroke-linecap="round"/><circle cx="-27.5" cy="-25.5" r="4.6" fill="#C8F04A" stroke="rgba(0,0,0,.35)"/><circle cx="27.5" cy="-25.5" r="4.6" fill="#C8F04A" stroke="rgba(0,0,0,.35)"/>
      <path d="M-6 16v20M6 16v20" stroke="${skin}" stroke-width="6.5" stroke-linecap="round"/><path d="M-6 26v12M6 26v12" stroke="${kc}" stroke-width="7" stroke-linecap="round"/><path d="M-9.5 39.5h6M3.5 39.5h6" stroke="#0E1012" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-11 10h22l1 9h-10l-2-2-2 2h-10z" fill="#1F2937"/>
      <rect x="-11" y="-14" width="22" height="27" rx="8" fill="${kc}" stroke="rgba(0,0,0,.35)"/><path d="M3 -13.5q6 1 8 4v22h-8z" fill="#000" opacity=".14"/>
      <circle cy="-22" r="7.5" fill="${skin}"/>${hair ? `<path d="M-7.5 -23a7.5 7.5 0 0 1 15 0q-3-3-7.5-3t-7.5 3z" fill="${hair}"/>` : ""}</g>
    ${wall ? [126,142,158,174].map(x=>lvMan(x, 152, wall, {s:1.15})).join("") : ""}
    <g id="lvBall" transform="translate(150 166)"><circle r="7" fill="#fff" stroke="#15171A" stroke-width="1.4"/><path d="M-3 -2l3-2 3 2-1 3h-4z" fill="#15171A"/><circle cx="-2.6" cy="-3.2" r="1.8" fill="#fff" opacity=".85"/></g>
  </svg>`;
}
const lvMove = (id, x, y, rot=0, sc=1) => lv$(id)?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(2)})`);

/* ---------- the match ---------- */
function lvScore(st, min){ let f = 0, a = 0; st.ev.forEach(e=>{ if (e.min<min){ if (e.us) f++; else a++; } }); return [f, a]; }
function lvHead(st, min, step){
  if (st.drill) return drHead(st);   // a training drill (drills.js) has its own scoreboard
  const [f, a] = lvScore(st, min), left = st.f.home || st.f.neutral, us = lvAbbr(left ? S.mc.club : st.f.opp), them = lvAbbr(left ? st.f.opp : S.mc.club);
  const [l, r] = left ? [f, a] : [a, f];
  return `<div class="lv-top"><span class="lv-sc"><b>${esc(us)}</b> ${l}–${r} <b>${esc(them)}</b></span><span>${min}'</span>
    ${step ? `<span class="lv-steps-dots" aria-label="Step ${step[0]} of ${step[1]}">${[...Array(step[1])].map((_,i)=>`<i class="${i<step[0]?"on":""}"></i>`).join("")}</span>` : ""}
    ${st.left>1 || step ? `<button type="button" class="lv-skip" data-lv-skip>Sim the rest</button>` : ""}</div>`;
}
// which moments come your way. A starter gets about four: more against weaker teams and when your team's on a run,
// fewer against the best (keepers the other way round: the better the opponent, the more saves to make), and more
// attacking ones the more your team is on top. The chances can't promise more goals than the match would give
// (quality q), and the base simulation gives up what they stand for
function lvPlan(f, X){
  const pos = S.player.pos, me = f.me, P = LV_POOL[pos] || LV_POOL.CM, dom = X.lf/(X.lf + X.la), tf = X.tf || 0;
  const pAtt = !P.att.length ? 0 : !P.def.length ? 1 : clamp((MC_ATT[pos] ?? .5) + (dom-.5)*.7, .1, .92);
  const edge = pos==="GK" ? (.5-dom)*5 - tf*.6 : (dom-.5)*5 + tf*.9;
  const n = me.st==="sub" ? (me.mins>=30 ? 2 : 1) : clamp(Math.round(4 + edge + Math.random() - .5), 2, 6), bag = {att:[], def:[]};
  const draw = side => { if (!bag[side].length) bag[side] = shuffle(P[side]); return bag[side].pop(); };
  const list = [...Array(n)].map(()=>{ const side = Math.random()<pAtt ? "att" : "def"; return {side, id:draw(side)}; });
  if (pos==="GK" && Math.random()<.15){ const s = list.find(m=>m.id==="save"); if (s) s.id = "save:pen"; }   // the odd penalty
  const from = me.st==="sub" ? 92-me.mins : 3, to = me.st==="sub" ? 89 : Math.max(12, me.mins-2);
  list.forEach(m=>{ [m.g, m.v] = m.id.split(":"); m.min = from + Math.floor(Math.random()*(to-from+1)); });
  // together your moments can't stand for more than your position's share of the match (mcXg's pG and pA): a striker
  // is in on about a third of his team's goals, a centre-back on very few. Played averagely (lvAuto) they give about
  // what the simulation would; playing them well is how you beat it
  const sum = side => list.filter(m=>m.side===side).reduce((s,m)=>s + LV_EV[m.id], 0), eF = sum("att"), eA = sum("def");
  const capF = clamp((X.pG + X.pA)*1.1, .06, .7)*X.lf, capD = (LV_DSHARE[pos] ?? .08)*X.t*X.la;
  const qa = eF ? clamp(capF/eF, .2, 1) : 1, qd = eA ? clamp(capD/eA, .2, 1) : 1;
  list.forEach(m=>{ m.q = m.side==="att" ? qa : qd; });
  return {list:list.sort((x,y)=>x.min-y.min), eF:eF*qa, eA:eA*qd};
}
// what a moment did: R = {ok, big, small, g (your goal), a (your assist), gf (a team goal), ga (they scored), og (your own goal), bonus}
function lvApply(st, m, R){
  if (R.g || R.a || R.gf) st.ev.push({min:m.min, us:true, me:R.g ? "g" : R.a ? "a" : ""});
  if (R.g) st.g++; if (R.a) st.a++;
  if (R.ga || R.og){ st.ev.push({min:m.min, us:false, og:!!R.og}); if (R.og) st.og++; }
  st.bonus += R.bonus || 0;
  st.log.push({min:m.min, txt:R.big + (R.small ? ` · ${R.small}` : ""), good:R.ok});
}
// moments you skip go the way the simulation would have sent them
function lvAuto(st, m){
  const p = LV_EV[m.id]*m.q;
  if (m.side==="att"){
    if (Math.random()>=p) return {ok:false, big:"Simmed", small:"No end product", bonus:-.03};
    const g = ["shot","header"].includes(m.g) || (["move","takeon"].includes(m.g) && Math.random()<.6);
    return g ? {ok:true, big:"Simmed", small:"You scored", g:1} : {ok:true, big:"Simmed", small:"You set one up", a:1};
  }
  if (Math.random()>=p) return {ok:true, big:"Simmed", small:"Dealt with", bonus:.2};
  const og = m.g==="block" && Math.random()<.3;
  return og ? {ok:false, big:"Simmed", small:"Own goal", og:1, bonus:-.4} : {ok:false, big:"Simmed", small:"They scored", ga:1, bonus:-.25};
}
// after each moment: the outcome over the pitch, then on to the next
// a goal you scored or set up: confetti in your club's colours
function lvBurst(){
  const k = meta(S.mc.club), cols = [k.c1, k.c2 || "#FFFFFF", "#F5C542", "#FFFFFF"];
  return `<div class="lv-burst" aria-hidden="true">${[...Array(28)].map((_,i)=>{ const a = Math.random()*Math.PI*2, d = 70 + Math.random()*120;
    return `<i style="--x:${(Math.cos(a)*d).toFixed(0)}px;--y:${(Math.sin(a)*d*.7 - 40).toFixed(0)}px;--r:${Math.round(Math.random()*720 - 360)}deg;--c:${cols[i%4]};--d:${(Math.random()*.2).toFixed(2)}s"></i>`; }).join("")}</div>`;
}
function lvOutcome(st, R){
  lv$(".lv-stage").insertAdjacentHTML("beforeend", `<div class="lv-res ${R.ok?"good":"bad"} ${R.g || R.a ? "goal" : ""}"><span>${esc(R.big)}</span>${R.small?`<small>${esc(R.small)}</small>`:""}${R.g || R.a ? lvBurst() : ""}</div>`);
  // some mini-games (take-ons) have their own buttons instead of a main one: swap those for it
  let act = lv$(".lv-act"); if (!act){ act = document.createElement("button"); act.type = "button"; lv$(".lv-in").appendChild(act); }
  lv$(".lv-lr")?.remove(); act.hidden = false;
  act.textContent = st.left>1 ? "Next moment" : "Full time"; act.disabled = true; act.className = "btn big primary lv-act"; act.onclick = null;
  lv$("[data-lv-skip]")?.remove();
  // a short pause, so the tap that made the tackle can't also skip past its result
  return new Promise(res=>setTimeout(()=>{
    if (!lvEl) return res();
    act.disabled = false; act.focus({preventScroll:true});
    lvKey = k=>{ if (k==="go"){ lvKey = null; res(); } }; act.onclick = ()=>{ lvKey = null; res(); };
  }, 450));
}
function lvSkippable(res){ lv$("[data-lv-skip]")?.addEventListener("click", ()=>{ cancelAnimationFrame(lvRaf); lvKey = null; res("skip"); }); }

/* ---------- first-time instructions ----------
   Before your first match, and the first time each mini-game comes up, a card explains it. Each account
   remembers what it has seen; "How to play" on a match's intro shows them again. */
const LV_TXT = (x, y, s, a="middle") => `<text x="${x}" y="${y}" text-anchor="${a}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="13" letter-spacing=".5" fill="#FFE9A8">${s}</text>`;
const lvDemo = (goal, inner, cap) => lvField(goal, inner + `<rect x="0" y="152" width="300" height="28" fill="rgba(0,0,0,.45)"/>` + LV_TXT(150, 171, cap));
const LV_HELP = {
  intro:{t:"Key moments", steps:["In every match you're picked for, you play the moments that involve you: <b>4</b> if you start, 1 or 2 off the bench. Each one is a quick mini-game.",
    "The rest of the match is simulated around them, so the final score includes what you did. When your team's on top you get more attacking moments; under pressure, more defending.",
    "Every match ends with a <b>rating</b>. Ratings decide your form, the manager's trust, how fast you grow, your value and the season's awards.",
    "Your attributes, boots, form and sharpness make every mini-game easier. Tap <b>Sim the match</b> on a match's intro to skip it."]},
  shot:{t:"How to shoot", steps:["<b>Tap the goal</b> where you want to shoot. The corners are hardest to save.",
    "A marker slides along the power bar. Tap <b>Shoot!</b> (or the bar) while it's <b>in the green</b>.",
    "Too early and the shot is weak; too late and it flies over. For free kicks, low shots in the middle hit the wall."],
    svg:`<svg viewBox="0 0 240 160"><rect x="30" y="10" width="180" height="72" fill="rgba(255,255,255,.05)" stroke="#F4F7F2" stroke-width="4"/><circle cx="182" cy="30" r="10" fill="none" stroke="#F5C542" stroke-width="3"/><circle cx="182" cy="30" r="3" fill="#F5C542"/>${LV_TXT(120,52,"1 · TAP TO AIM")}
      <rect x="30" y="112" width="180" height="16" rx="8" fill="rgba(255,255,255,.14)"/><rect x="138" y="112" width="34" height="16" fill="rgba(74,222,128,.8)"/><rect x="152" y="106" width="5" height="28" rx="2" fill="#fff"/>${LV_TXT(120,152,"2 · STOP IT IN THE GREEN")}</svg>`},
  header:{t:"How to head it", steps:["A cross is coming in. A <b>ring closes in</b> on the ball.", "Tap <b>Head it!</b> the moment it lines up with the <b>gold target ring</b>.",
    "Spot on and it flies into the corner; a bit off and the keeper has a chance; way off and it goes over."],
    svg:lvDemo("top", `<circle cx="150" cy="70" r="16" fill="none" stroke="#F5C542" stroke-width="3"/><circle cx="150" cy="70" r="34" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="150" cy="70" r="5" fill="#fff"/>`, "TAP WHEN THE RINGS MEET")},
  pass:{t:"How to pass", steps:["Two of your teammates are marked: a <b>defender</b> is right next to them.",
    "<b>Tap the free teammate</b> before the timer runs out.", "The defenders keep moving, so look again just before you tap."],
    svg:`<svg viewBox="0 0 240 160"><rect width="240" height="160" rx="12" fill="#1D6537"/><circle cx="45" cy="50" r="13" fill="#F4F7F2"/><circle cx="58" cy="62" r="7" fill="#EF4444"/><circle cx="195" cy="50" r="13" fill="#F4F7F2"/><circle cx="182" cy="62" r="7" fill="#EF4444"/>
      <circle cx="120" cy="34" r="13" fill="#F4F7F2" stroke="#F5C542" stroke-width="4"/><circle cx="120" cy="128" r="12" fill="#F5C542"/><path d="M120 114V52" stroke="#FFE9A8" stroke-width="2.5" stroke-dasharray="5 5"/>${LV_TXT(120,152,"TAP THE ONE WITH NO DEFENDER")}</svg>`},
  move:{t:"Attacking move", steps:["A three-step move. <b>1:</b> find the free teammate to start it.", "<b>2:</b> beat your defender: watch for him to commit and go the other way.",
    "<b>3:</b> shoot, or square it to a teammate for a tap-in. Lose it at any step and the move breaks down."]},
  takeon:{t:"How to take him on", steps:["Your defender is waiting. When he <b>commits</b> (a <b>!</b> flashes and he shifts), go the <b>other way</b>.",
    "Tap <b>◀ Left</b> or <b>Right ▶</b>, or that side of the pitch. Go too early and he reads you.", "Beat him and you're through on goal."],
    svg:lvDemo("top", `${lvMan(170,92,"#EF4444")}<text x="186" y="52" font-size="22" font-weight="900" fill="#F5C542">!</text>${lvMan(150,140,"#F5C542")}<path d="M138 120l-30-30" stroke="#FFE9A8" stroke-width="3" stroke-dasharray="5 4"/>`, "HE GOES RIGHT, YOU GO LEFT")},
  cross:{t:"How to cross", steps:["Two teammates make runs into the box, each towards a <b>green spot</b>. One of them is marked.",
    "<b>Tap the free runner</b> as he reaches his green spot to whip the ball in.", "Pick the marked man, or cross too early or late, and it's cleared."],
    svg:lvDemo("top", `<circle cx="128" cy="34" r="12" fill="rgba(74,222,128,.35)" stroke="#4ADE80"/><circle cx="172" cy="38" r="12" fill="rgba(74,222,128,.35)" stroke="#4ADE80"/>${lvMan(130,46,"#F4F7F2")}${lvMan(176,58,"#F4F7F2")}${lvMan(184,62,"#EF4444")}${lvMan(268,40,"#F5C542")}`, "TAP THE FREE RUNNER ON HIS SPOT")},
  tackle:{t:"How to tackle", steps:["The attacker runs along the line towards the <b>green zone</b>.",
    "Tap <b>Tackle!</b> while he's inside the green.", "Too early and you dive in; too late and he's past you."],
    svg:`<svg viewBox="0 0 240 120"><rect width="240" height="120" rx="12" fill="#1D6537"/><path d="M14 60H226" stroke="rgba(255,255,255,.35)" stroke-width="4"/><rect x="146" y="28" width="40" height="64" rx="8" fill="rgba(74,222,128,.35)" stroke="#4ADE80" stroke-width="2"/>
      <circle cx="70" cy="60" r="13" fill="#EF4444" stroke="#fff" stroke-width="3"/><path d="M92 60h34m-8-7 8 7-8 7" stroke="#FFE9A8" stroke-width="3" fill="none"/>${LV_TXT(120,112,"TAP WHEN HE'S IN THE GREEN")}</svg>`},
  block:{t:"How to block", steps:["A shot is heading for goal.", "Tap <b>Block!</b> when the ball is <b>in the green</b>.", "Miss it and they'll probably score, and sometimes it deflects in off you."],
    svg:`<svg viewBox="0 0 240 120"><rect width="240" height="120" rx="12" fill="#1D6537"/><path d="M14 60H214" stroke="rgba(255,255,255,.35)" stroke-width="4"/><rect x="166" y="28" width="34" height="64" rx="8" fill="rgba(74,222,128,.35)" stroke="#4ADE80" stroke-width="2"/>
      <rect x="216" y="24" width="12" height="72" fill="rgba(255,255,255,.2)" stroke="#F4F7F2" stroke-width="3"/><circle cx="80" cy="60" r="9" fill="#fff"/><path d="M98 60h40m-8-7 8 7-8 7" stroke="#FFE9A8" stroke-width="3" fill="none"/>${LV_TXT(115,112,"TAP WHEN THE BALL'S IN THE GREEN")}</svg>`},
  intercept:{t:"How to intercept", steps:["Their midfielder has the ball, with three teammates to pass to.", "Watch him: a <b>gold arrow</b> shows where he's looking. <b>Tap that lane</b> to cut the pass out.",
    "Good passers sometimes look one way and pass the other, so wait for the real look."],
    svg:lvDemo("bottom", `${lvMan(150,40,"#EF4444")}${lvMan(70,110,"#EF4444")}${lvMan(150,124,"#EF4444")}${lvMan(230,110,"#EF4444")}<path d="M150 46L222 100" stroke="#F5C542" stroke-width="4" stroke-dasharray="7 5"/>${lvMan(150,84,"#F5C542")}`, "TAP THE LANE HE'S LOOKING AT")},
  shadow:{t:"How to shadow your man", steps:["Stay in front of the attacker. He switches between three lanes.", "When he moves, <b>tap the same lane</b> (left, middle or right) to stay with him.",
    "Lose him twice and he's through on goal."],
    svg:lvDemo("bottom", `<path d="M100 10v140M200 10v140" stroke="rgba(255,255,255,.25)" stroke-dasharray="6 6"/>${lvMan(250,56,"#EF4444")}${lvMan(250,124,"#F5C542")}<path d="M150 124h80" stroke="#FFE9A8" stroke-width="3" stroke-dasharray="5 4"/>`, "MOVE TO HIS LANE")},
  save:{t:"How to save", steps:["The striker lines up his shot. Don't move too early: strikers punish keepers who guess.",
    "Watch which way the ball goes, then <b>tap that side of the goal</b>: left, middle or right.", "Your shot-stopping decides how much time you get. Penalties are quicker."],
    svg:`<svg viewBox="0 0 240 150"><rect x="20" y="10" width="200" height="90" fill="rgba(255,255,255,.05)" stroke="#F4F7F2" stroke-width="4"/><path d="M87 12v86M153 12v86" stroke="rgba(255,255,255,.3)" stroke-dasharray="5 5"/>
      <circle cx="120" cy="130" r="8" fill="#fff"/><path d="M112 124 62 70" stroke="#FFE9A8" stroke-width="3" stroke-dasharray="5 4"/><circle cx="54" cy="62" r="20" fill="rgba(245,197,66,.25)" stroke="#F5C542" stroke-width="3"/>${LV_TXT(160,140,"TAP WHERE IT'S GOING","start")}</svg>`},
  claim:{t:"How to claim a cross", steps:["A cross is coming into your box. A <b>ring closes in</b> on the ball.", "Tap <b>Claim it!</b> when it meets the <b>gold target ring</b>.",
    "Spot on and you catch it; a bit off and you punch it clear; miss it and they've a free header."],
    svg:lvDemo("bottom", `<circle cx="150" cy="118" r="16" fill="none" stroke="#F5C542" stroke-width="3"/><circle cx="150" cy="118" r="34" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="150" cy="118" r="5" fill="#fff"/>`, "TAP WHEN THE RINGS MEET")},
  rush:{t:"How to rush out", steps:["A striker's through on your goal.", "Wait for his <b>heavy touch</b>: the ball runs away from his feet and a <b>!</b> flashes.",
    "Then tap <b>Rush out!</b> to smother it. Go before that and he rounds you; too late and he shoots."],
    svg:lvDemo("bottom", `${lvMan(150,70,"#EF4444")}<circle cx="150" cy="92" r="5" fill="#fff"/><text x="162" y="94" font-size="20" font-weight="900" fill="#F5C542">!</text>${lvMan(150,150,"#F5C542")}`, "TAP RIGHT AFTER HIS HEAVY TOUCH")},
  coins:{t:"Gold coins", steps:["You earn gold coins in every match you play with key moments. Your total sits next to your name at the top.",
    "A win is worth <b>50</b>, a draw <b>10</b> and a defeat nothing.", "Every goal you score adds <b>20</b> and every assist <b>15</b>, but an own goal costs <b>10</b>. Simmed matches don't earn coins."]}
};
function lvSeen(){ try{ return JSON.parse(localStorage.getItem(Account.storageKey("tips"))) || {}; }catch(e){ return {}; } }
function lvMarkSeen(k){ const s = lvSeen(); s[k] = 1; try{ localStorage.setItem(Account.storageKey("tips"), JSON.stringify(s)); }catch(e){} }
async function lvHelp(keys, first){
  for (const k of keys){
    const H = LV_HELP[k]; if (!H) continue;
    await lvAsk(`<div class="lv-card lv-help"><div class="lv-eye">${first ? "First time? Here's how it works" : "How to play"}</div><h2 class="lv-t">${H.t}</h2>
      ${H.svg ? `<div class="lv-demo" aria-hidden="true">${H.svg}</div>` : ""}<ol class="lv-steps">${H.steps.map(s=>`<li>${s}</li>`).join("")}</ol>
      <button type="button" class="btn primary big" data-lv="ok" data-lv-focus>${first ? "Got it, let's play" : "Got it"}</button></div>`);
    lvMarkSeen(k);
  }
}
// every guide that matters for your position
function lvHelpAll(){ const P = LV_POOL[S.player.pos] || LV_POOL.CM; return ["intro", ...new Set([...P.att, ...P.def].map(id=>id.split(":")[0]))]; }

// gold coins for a match you played: the result, plus your goals and assists, minus own goals
const LV_COINS = {win:50, draw:10, loss:0, goal:20, assist:15, og:-10, potm:25};
function lvCoins(f){
  const r = f.res, me = f.me, res = r.gf>r.ga ? "win" : r.gf===r.ga ? "draw" : "loss", og = me.og || 0;
  const parts = [[{win:"Win", draw:"Draw", loss:"Defeat"}[res], LV_COINS[res]], ...(me.g ? [[`${me.g} goal${me.g>1?"s":""}`, me.g*LV_COINS.goal]] : []),
    ...(me.a ? [[`${me.a} assist${me.a>1?"s":""}`, me.a*LV_COINS.assist]] : []), ...(og ? [[`${og} own goal${og>1?"s":""}`, og*LV_COINS.og]] : []), ...(f.potm ? [["Player of the Match", LV_COINS.potm]] : [])];
  return {parts, total:parts.reduce((s,p)=>s + p[1], 0)};
}

async function lvPlayMatch(f, w){
  const X = mcXg(f), me = f.me, plan = lvPlan(f, X);
  const home = f.home || f.neutral ? S.mc.club : f.opp, away = f.home || f.neutral ? f.opp : S.mc.club;
  // the goals your moments don't stand in for, at random minutes
  const ev = [];
  const rest = (n, us) => { for (let i=0;i<n;i++) ev.push({min:1+Math.floor(Math.random()*90), us}); };
  rest(mcPoisson(Math.max(0, X.lf - plan.eF)), true); rest(mcPoisson(Math.max(0, X.la - plan.eA)), false);
  const st = {f, X, ev, g:0, a:0, og:0, bonus:0, left:plan.list.length, log:[]};
  lvOpen();
  try{
    if (!lvSeen().intro) await lvHelp(["intro"], true);
    let go;
    while ((go = await lvAsk(`<div class="lv-card">
        <div class="lv-eye">${f.big ? "★ " : ""}${esc(mcCompLabel(f))}${f.code!=="league" ? " · " + esc(f.round) + (f.leg ? `, leg ${f.leg}` : "") : ""} · ${mcDate(w, f)}</div>
        <div class="lv-teams"><span>${clubBadge(home, 34)}${esc(home)}</span><i>v</i><span>${clubBadge(away, 34)}${esc(away)}</span></div>
        ${sqLineups(f)}
        <div class="lv-forms">${[[S.mc.club, "Your team"], [f.opp, f.opp]].map(([n, l])=>`<div class="lv-form"><span>${esc(l)}</span>${mcFormPills(mcTeamForm(n).L)}</div>`).join("")}</div>
        <p>${me.st==="start" ? "You're in the starting line-up." : `You start on the bench and come on around the ${ord(90-me.mins)} minute.`}
          ${plan.list.length} key moment${plan.list.length===1?"":"s"} will come your way${me.st!=="start" ? "" : plan.list.length>=5 ? ": a big chance to shine" : plan.list.length<=3 ? ": a tough one, make them count" : ""}.</p>
        <div class="lv-row"><button type="button" class="btn primary big" data-lv="play" data-lv-focus>Play key moments</button><button type="button" class="btn" data-lv="sim">Sim the match</button></div>
        <button type="button" class="lv-skip" data-lv="help" style="justify-self:start">How to play</button>
      </div>`))==="help") await lvHelp(lvHelpAll(), false);
    if (go==="play"){
      let auto = false;
      for (const m of plan.list){
        let R = null;
        if (!auto){
          if (!lvSeen()[m.g]) await lvHelp([m.g], true);
          R = await LV_GAMES[m.g](st, m);
          if (R==="skip") auto = true;
        }
        if (auto){ lvApply(st, m, lvAuto(st, m)); st.left--; continue; }
        lvApply(st, m, R); await lvOutcome(st, R); st.left--;
      }
      mcResolve(f, w, {gf:ev.filter(e=>e.us).length, ga:ev.filter(e=>!e.us).length, g:st.g, a:st.a, og:st.og, bonus:st.bonus, ev});
      f.coins = lvCoins(f).total; Account.addCoins(f.coins); save();
      if (!lvSeen().coins) await lvHelp(["coins"], true);
    } else mcResolve(f, w);
    await lvFullTime(st, home, away);
  } finally { lvClose(); }
}
async function lvFullTime(st, home, away){
  const f = st.f, me = f.me, [l, r] = f.home || f.neutral ? [f.res.gf, f.res.ga] : [f.res.ga, f.res.gf];
  const bits = [me.g ? `${me.g} goal${me.g>1?"s":""}` : "", me.a ? `${me.a} assist${me.a>1?"s":""}` : "", me.og ? `${me.og} own goal${me.og>1?"s":""}` : "", me.cs && (DEF.includes(S.player.pos) || S.player.pos==="CDM") ? "clean sheet" : ""].filter(Boolean);
  const html = `<div class="lv-card lv-ftc">
      <div class="lv-eye">Full time${f.res.pens ? ` · ${f.res.pens==="won"?"won":"lost"} on penalties` : f.agg ? ` · ${f.agg[0]}–${f.agg[1]} on aggregate` : ""}</div>
      <div class="lv-ft"><span>${clubBadge(home, 44)}<em>${esc(home)}</em></span><b>${l}–${r}</b><span>${clubBadge(away, 44)}<em>${esc(away)}</em></span></div>
      ${sqScorers(f)}
      <div class="lv-rate"><span class="label">Your rating</span><b class="${me.r>=7.5?"hi":me.r<6?"lo":""}">${me.r ?? "–"}</b><span>${bits.join(" · ") || (me.mins ? "No goal involvement" : "")}</span></div>
      ${me.r!=null ? `<p class="lv-rate-sub"><b>${mcRateLabel(me.r)}.</b> Season average <b>${mcSeasonRating().toFixed(2)}</b>.</p>` : ""}
      ${f.potm ? `<div class="lv-potm">★ Player of the Match</div>` : f.potmBy ? `<p class="lv-potm-by">Player of the Match: <b>${esc(f.potmBy.n)}</b> (${esc(f.potmBy.c)}), ${f.potmBy.r.toFixed(1)}</p>` : ""}
      ${f.coins!=null ? (()=>{ const C = lvCoins(f); return `<div class="lv-coins"><i class="coin" aria-hidden="true"></i><b>${C.total>=0?"+":""}${C.total}</b><span>${C.parts.map(([l,n])=>`${esc(l)} ${n>=0?"+":""}${n}`).join(" · ")}</span></div>`; })()
        : `<p class="lv-nocoins">Simmed matches don't earn gold coins. Play the key moments to earn them.</p>`}
      ${st.log.length ? `<details class="lv-logd"><summary>Your key moments · ${st.log.filter(x=>x.good).length} of ${st.log.length} went your way</summary><ol class="lv-log">${st.log.map(x=>`<li class="${x.good===true?"good":x.good===false?"bad":""}"><span>${x.min}'</span>${esc(x.txt)}</li>`).join("")}</ol></details>` : ""}
      ${lgFullTime(f)}
      <button type="button" class="btn primary big" data-lv="ok" data-lv-focus>Continue</button>
    </div>`;
  // the league table and the leaderboards, then back to full time
  while (await lvAsk(html)==="table") await lvAsk(`<div class="lv-card lv-ftc"><div class="lv-eye">${esc(TIERS[S.mc.lgk].name)} · matchweek ${lgGet(S.mc.lgk).r}</div>
    ${lgBox(S.mc.lgk, "lv")}<button type="button" class="btn primary big" data-lv="ok" data-lv-focus>Back to full time</button></div>`);
}

/* =========================================================================================
   THE MINI-GAMES. Each takes (st, m) and resolves to a result R, or "skip" for "Sim the rest".
   ========================================================================================= */

/* ---------- shots: aim, then power (one-on-ones, in the box, from distance, free kicks) ---------- */
const LV_SHOT = {
  oneonone:{t:"Through on goal!", s:"Pick your spot, then stop the power bar in the green.", z:.2, k:.85, per:1300},
  box:{t:"Space in the box", s:"Pick your spot, then stop the power bar in the green.", z:.16, k:1, per:1200},
  long:{t:"Shot from 25 yards", s:"Pick your spot. Hit it too hard and it's in the stands.", z:.11, k:1.25, per:1000},
  freekick:{t:"Free kick in range", s:"Go over the wall or for a corner, then stop the bar in the green.", z:.12, k:1.1, per:1050}
};
// the shot itself, also used at the end of a take-on and an attacking move: resolves {goal, big, small} or "skip"
function lvShotCore(st, m, v, head, title){
  const K = LV_SHOT[v], f = st.f, attr = mcA().fin, e = lvEase(st, attr), kit = lvKits(st);
  const zone = clamp(K.z*(1 + e*1.3), .05, .32), mid = .72, per = K.per*(1 + e*.8), kq = clamp(.5 + (f.oppStr - attr)/40, .2, .85);
  return new Promise(res=>{
    lvShow(`${head}<h2 class="lv-t">${title || K.t}</h2><p class="lv-s">${K.s}</p>
      <div class="lv-stage">${lvGoalSvg(kit.them, v==="freekick" ? kit.them : null)}
        <div class="lv-aims">${["tl","tc","tr","bl","bc","br"].map(z=>`<button type="button" class="lv-aim" data-z="${z}" aria-label="Aim ${{t:"high",b:"low"}[z[0]]} ${{l:"left",c:"centre",r:"right"}[z[1]]}"></button>`).join("")}</div></div>
      <div class="lv-bar" aria-hidden="true"><span class="lv-zone" style="left:${((mid-zone/2)*100).toFixed(1)}%;width:${(zone*100).toFixed(1)}%"></span><span class="lv-mark"></span></div>
      <button type="button" class="btn big lv-act" disabled>Tap the goal to aim</button>`);
    lvSkippable(res);
    let aim = null, t0 = 0, p = 0, fired = false;
    const mark = lv$(".lv-mark"), act = lv$(".lv-act");
    const setAim = b=>{
      if (fired) return; aim = b.dataset.z; lvEl.querySelectorAll(".lv-aim").forEach(x=>x.classList.toggle("on", x===b));
      if (!t0){ t0 = performance.now(); act.disabled = false; act.classList.add("primary"); act.textContent = "Shoot!";
        lvLoop(now=>{ if (fired) return false; p = (1 - Math.cos(2*Math.PI*(now-t0)/per))/2; mark.style.left = (p*100).toFixed(2)+"%"; }); }
    };
    lvEl.querySelectorAll(".lv-aim").forEach(b=>lvTap(b, ()=>setAim(b)));
    const fire = async ()=>{
      if (!aim || fired) return; fired = true; cancelAnimationFrame(lvRaf); act.disabled = true;
      const lo = mid-zone/2, hi = mid+zone/2, row = aim[0], col = aim[1];
      // just past the green still hits the target, a little easier to save; well past it goes over
      let over = false, weak = 0;
      if (p>hi){ if (p-hi > (row==="t" ? .03 : .1)) over = true; else weak = .1; }
      else if (p<lo) weak = clamp((lo-p)*1.6, .12, .6);
      const wall = v==="freekick" && !over && row==="b" && (col==="c" || Math.random()<.3);
      // good keepers read where you're going more often
      const kcol = Math.random() < 1/3 + kq*.25 ? col : pick(["l","c","r"].filter(x=>x!==col));
      const read = {t:{l:.45, c:.8, r:.45}, b:{l:.6, c:.9, r:.6}}[row][col];
      const save = clamp((kcol===col ? read : col==="c" ? .2 : .04)*(kq/.5)*K.k + weak, .02, .97);
      let goal = !over && !wall && Math.random()>save, tip = false;
      if (goal && Math.random()>m.q){ goal = false; tip = true; }   // in a match that's going against you, chances are harder
      const tx = LV_COLS[col] + (Math.random()*16-8), ty = over ? -12 : wall ? 146 : LV_ROWS[row] + (Math.random()*10-5);
      const kx = LV_COLS[kcol], ky = row==="t" ? 62 : 96, rot = kcol==="l" ? -62 : kcol==="r" ? 62 : 0;
      await lvTween(480, k=>{ const q = 1-Math.pow(1-k, 2); lvMove("#lvBall", 150 + (tx-150)*q, 166 + (ty-166)*q, k*540, 1 - .35*q);
        const d = Math.min(1, k*1.4); lvMove("#lvKp", 150 + (kx-150)*d, 84 + (ky-84)*d, rot*d); });
      res({goal, big: goal ? "Goal!" : over ? "Over the bar" : wall ? "Hit the wall" : "Saved",
        small: goal ? (kcol===col ? "Past the keeper's hands" : "Sent him the wrong way") : over ? (row==="t" ? "Too high" : "Overhit") : wall ? "Go higher or wider" : tip ? "Fingertip save" : weak>=.3 ? "Not enough on it" : kcol===col ? "The keeper read it" : "Brilliant save"});
    };
    act.addEventListener("click", fire);
    lv$(".lv-bar").addEventListener("pointerdown", fire);
    lvKey = k=>{ if (k==="go") fire(); };
  });
}
async function lvGameShot(st, m){
  const r = await lvShotCore(st, m, m.v || "box", lvHead(st, m.min)); if (r==="skip") return r;
  return r.goal ? {ok:true, big:"Goal!", small:r.small, g:1} : {ok:false, big:r.big, small:r.small, bonus:-.08};
}

/* ---------- ring timing: headers in their box, claiming crosses in yours ---------- */
// a ring closes on the ball; tap as it meets the target ring. Resolves the miss distance d against tolerance tol
function lvRing(st, o){
  const e = lvEase(st, o.attr), tol = clamp(.17*(1 + e*1.2), .08, .3), per = clamp(1200*(1 + e*.5), 850, 1650);
  return new Promise(res=>{
    lvShow(`${o.head}<h2 class="lv-t">${o.title}</h2><p class="lv-s">${o.sub}</p>
      <div class="lv-stage lv-ringstage">${o.scene}
        <span class="lv-ring tgt" style="${lvPct(o.x, o.y)}"></span><span class="lv-ring mov" style="${lvPct(o.x, o.y)}"></span></div>
      <button type="button" class="btn primary big lv-act">${o.btn}</button>`);
    lvSkippable(res);
    if (o.ball) lvMove("#lvBall", o.ball[0], o.ball[1], 0, .85);
    const ring = lv$(".lv-ring.mov"), t0 = performance.now() + 350; let s = 2.8, done = false;
    lvLoop(now=>{ if (done) return false; const t = Math.max(0, now-t0)/per; s = 2.8 - 2.6*t; ring.style.transform = `translate(-50%,-50%) scale(${Math.max(.15, s).toFixed(3)})`; if (s<=.2){ end(); return false; } });
    const end = ()=>{ if (done) return; done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true; res({d:Math.abs(s-1), tol}); };
    lvTap(lv$(".lv-act"), end); lvTap(lv$(".lv-stage"), end);
    lvKey = k=>{ if (k==="go") end(); };
  });
}
async function lvGameHeader(st, m){
  const kit = lvKits(st), a = mcA(), kq = clamp(.5 + (st.f.oppStr - a.fin)/40, .2, .85);
  const r = await lvRing(st, {head:lvHead(st, m.min), title:"Cross coming in", sub:"Tap Head it! when the closing ring meets the gold one.", btn:"Head it!",
    attr:a.fin*.6 + a.def*.4, x:112, y:104, scene:lvGoalSvg(kit.them), ball:[112, 104]});
  if (r==="skip") return r;
  const perfect = r.d < r.tol*.45, on = r.d < r.tol;
  const save = perfect ? .1*kq/.5 : on ? clamp(.45*kq/.5, .2, .8) : 1;
  let goal = Math.random() > save; if (goal && Math.random()>m.q) goal = false;
  const col = pick(["l","r"]), tx = perfect ? LV_COLS[col] : on ? 150 + (Math.random()*60-30) : 150 + (Math.random()*160-80), ty = !on ? -10 : perfect ? 42 : 80;
  await lvTween(380, k=>lvMove("#lvBall", 112 + (tx-112)*k, 104 + (ty-104)*k, k*400, .85 - .3*k));
  if (goal) return {ok:true, big:"Goal!", small: perfect ? "A bullet header" : "Glanced in", g:1};
  return {ok:false, big: on ? "Saved" : "Over the bar", small: on ? (perfect ? "Somehow he kept it out" : "Straight at the keeper") : r.d<r.tol*2 ? "Just mistimed it" : "Way off", bonus:-.08};
}
async function lvGameClaim(st, m){
  const kit = lvKits(st), a = mcA();
  const r = await lvRing(st, {head:lvHead(st, m.min), title:"Cross into your box", sub:"Tap Claim it! when the closing ring meets the gold one.", btn:"Claim it!",
    attr:a.def, x:150, y:112, scene:lvField("bottom", `${lvMan(150,170,kit.us,{ring:"#F5C542"})}${lvMan(96,124,kit.them)}${lvMan(206,118,kit.them)}${lvMan(226,140,kit.us)}${lvBallSvg("lvB",150,112,4)}`)});
  if (r==="skip") return r;
  if (r.d < r.tol*.6) return {ok:true, big:"Claimed!", small:"Safe hands", bonus:.3};
  if (r.d < r.tol) return {ok:true, big:"Punched clear", small:"Not pretty, but it's gone", bonus:.15};
  return Math.random() < .45*m.q ? {ok:false, big:"They score", small:"You came for it and missed", ga:1, bonus:-.35} : {ok:false, big:"Missed it", small:"Their header went wide", bonus:-.1};
}

/* ---------- passes: tap the free teammate ---------- */
// resolves {ok, why} or "skip"; extra gives more (or less) time
function lvPassCore(st, head, title, sub, extra=0){
  const f = st.f, a = mcA(), e = lvEase(st, a.pas), kit = lvKits(st);
  const win = clamp(2900*(1 + e*.6), 1900, 3900) + extra, iv = clamp(950*(1 + e*.5), 600, 1350);
  const spots = [[50,72],[150,36],[250,72]].map(([x,y])=>[x + Math.random()*24-12, y + Math.random()*14-7]);
  return new Promise(res=>{
    lvShow(`${head}<h2 class="lv-t">${title}</h2><p class="lv-s">${sub}</p>
      <div class="lv-stage">${lvField("top", spots.map(([x,y],i)=>lvMan(x, y, kit.us, {num:[9,10,7][i], id:`lvM${i}`})).join("") + lvMan(150, 166, kit.us, {ring:"#F5C542"})
          + [0,1,2].map(i=>`<g class="lv-dg" data-d="${i}" style="transform:translate(150px,110px)">${lvMan(0, 0, kit.them, {s:.92})}</g>`).join("") + lvBallSvg("lvPb", 150, 150, 4))}
        ${spots.map(([x,y],i)=>`<button type="button" class="lv-tap lv-mate" data-i="${i}" style="${lvPct(x, y-14)}" aria-label="Pass to number ${[9,10,7][i]}"></button>`).join("")}
      </div>
      <div class="lv-timer"><span></span></div>
      <button type="button" class="btn big lv-act" disabled>Find the free man</button>`);
    lvSkippable(res);
    let open = Math.floor(Math.random()*3), prev = -1, switched = 0, done = false;
    const place = ()=>{
      const marked = [0,1,2].filter(i=>i!==open), ds = lvEl.querySelectorAll(".lv-dg");
      marked.forEach((i,k)=>{ ds[k].style.transform = `translate(${spots[i][0] + (k ? -12 : 12)}px,${spots[i][1] + 4}px)`; });
      ds[2].style.transform = `translate(${110 + Math.random()*80}px,${112 + Math.random()*16}px)`;
      lv$(".lv-stage").dataset.open = open;
    };
    place();
    const t0 = performance.now(), bar = lv$(".lv-timer span"); let next = t0 + iv;
    lvLoop(now=>{
      if (done) return false;
      bar.style.width = Math.max(0, 100 - (now-t0)/win*100) + "%";
      if (now>=t0+win){ finish(-1); return false; }
      if (now>=next){ prev = open; open = pick([0,1,2].filter(i=>i!==open)); switched = now; next = now + iv*(.8 + Math.random()*.4); place(); }
    });
    const finish = async i=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      // a fraction of a second's grace when the defenders have only just moved
      const ok = i>=0 && (i===open || (i===prev && performance.now()-switched<220));
      if (ok){ const [x,y] = spots[i]; await lvTween(300, k=>lvMove("#lvPb", 150 + (x-150)*k, 150 + (y-150)*k)); }
      res({ok, i, why: i<0 ? "You took too long" : ok ? "" : "He was marked"});
    };
    lvEl.querySelectorAll(".lv-mate").forEach(b=>lvTap(b, ()=>finish(+b.dataset.i)));
    lvKey = k=>{ const i = {l:0, c:1, r:2}[k]; if (i!=null) finish(i); };
  });
}
// a teammate finishing a chance you made: better the stronger your team is against this opponent
const lvConv = (st, m, base) => clamp(base + (st.X.base - st.f.oppStr)*.008, base*.55, base*1.5)*m.q;
async function lvGamePass(st, m){
  const title = {LB:"Overlap down the wing", RB:"Overlap down the wing", ST:"Hold it up and lay it off", LW:"Cutting inside", RW:"Cutting inside", CDM:"Switch the play"}[S.player.pos] || "Teammate making a run";
  const r = await lvPassCore(st, lvHead(st, m.min), title, "Tap the teammate who's free before the defenders close him down.");
  if (r==="skip") return r;
  if (!r.ok) return {ok:false, big: r.i<0 ? "Closed down" : "Intercepted", small:r.why, bonus:-.1};
  return Math.random() < lvConv(st, m, .32) ? {ok:true, big:"Assist!", small:"Your teammate finished it off", a:1} : {ok:true, big:"Chance created", small:"Great ball, but his shot was saved", bonus:.1};
}

/* ---------- take-ons: read the defender and go the other way ---------- */
function lvTakeonCore(st, head, title, sub){
  const f = st.f, a = mcA(), e = lvEase(st, a.pac*.6 + a.fin*.4), kit = lvKits(st);
  const react = clamp(720*(1 + e), 380, 1100), wait = 700 + Math.random()*900, fake = f.oppStr > a.pac + 4 && Math.random()<.3;
  return new Promise(res=>{
    lvShow(`${head}<h2 class="lv-t">${title}</h2><p class="lv-s">${sub}</p>
      <div class="lv-stage">${lvField("top", `<g id="lvDef">${lvMan(0, 0, kit.them)}</g><text id="lvBang" x="0" y="0" font-size="26" font-weight="900" fill="#F5C542" opacity="0" font-family="Big Shoulders Display,sans-serif">!</text>
          <g id="lvMe">${lvMan(0, 0, kit.us, {ring:"#F5C542"})}</g>${lvBallSvg("lvTb", 150, 136, 4)}`)}
        <button type="button" class="lv-tap lv-half l" data-s="l" aria-label="Go left"></button><button type="button" class="lv-tap lv-half r" data-s="r" aria-label="Go right"></button></div>
      <div class="lv-row lv-lr"><button type="button" class="btn big" data-s="l">◀ Left</button><button type="button" class="btn big" data-s="r">Right ▶</button></div>`);
    lvSkippable(res);
    lvMove("#lvDef", 150, 92); lvMove("#lvMe", 150, 150);
    const stage = lv$(".lv-stage"), t0 = performance.now(); let commit = null, at = 0, faked = false, done = false;
    lvLoop(now=>{
      if (done) return false;
      const t = now - t0;
      if (fake && !faked && t>wait-420 && t<wait-200){ lvMove("#lvDef", 150 + (Math.random()<.5 ? -6 : 6), 92); }
      else if (fake && !faked && t>=wait-200){ faked = true; lvMove("#lvDef", 150, 92); }
      if (!commit && t>=wait){ commit = pick(["l","r"]); at = now; stage.dataset.commit = commit;
        lvMove("#lvDef", 150 + (commit==="l" ? -16 : 16), 92); const b = lv$("#lvBang"); b.setAttribute("x", 150 + (commit==="l" ? -30 : 22)); b.setAttribute("y", 58); b.setAttribute("opacity", 1); }
      if (commit && now-at > react){ end(null, "He closed you down"); return false; }
    });
    const end = async (side, why)=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      let ok = false;
      if (side && !commit){ ok = Math.random() < .3; why = ok ? "" : "You went too early: he read you"; }
      else if (side){ ok = side!==commit; why = ok ? "" : "He was waiting for that"; }
      const dx = side==="l" ? -46 : 46;
      if (ok) await lvTween(320, k=>{ lvMove("#lvMe", 150 + dx*k, 150 - 80*k); lvMove("#lvTb", 150 + dx*k, 136 - 82*k); });
      res({ok, why});
    };
    lvEl.querySelectorAll("[data-s]").forEach(b=>lvTap(b, ()=>end(b.dataset.s)));
    lvKey = k=>{ if (k==="l" || k==="r") end(k); };
  });
}
async function lvGameTakeon(st, m){
  const r = await lvTakeonCore(st, lvHead(st, m.min), "Take him on", "Wait for him to commit, then go the other way.");
  if (r==="skip") return r;
  if (!r.ok) return {ok:false, big:"Tackled", small:r.why, bonus:-.08};
  // forwards go through on goal; full-backs and midfielders cut it back
  if (["ST","LW","RW","CAM"].includes(S.player.pos)){
    const s = await lvShotCore(st, m, "oneonone", lvHead(st, m.min), "You're through!"); if (s==="skip") return s;
    return s.goal ? {ok:true, big:"Goal!", small:"Beat his man and finished it", g:1} : {ok:false, big:s.big, small:s.small, bonus:.02};
  }
  return Math.random() < lvConv(st, m, .34) ? {ok:true, big:"Assist!", small:"Beat your man and cut it back", a:1} : {ok:true, big:"Beat your man", small:"The cut-back was cleared", bonus:.12};
}

/* ---------- the attacking move: pass, take-on, then shoot or square it ---------- */
async function lvGameMove(st, m){
  const S1 = await lvPassCore(st, lvHead(st, m.min, [1,3]), "Attacking move", "Step 1: find the free man to get it going.", -200);
  if (S1==="skip") return S1;
  if (!S1.ok) return {ok:false, big:"Move broken down", small:S1.why, bonus:-.06};
  const S2 = await lvTakeonCore(st, lvHead(st, m.min, [2,3]), "Attacking move", "Step 2: the return ball's yours. Beat your man.");
  if (S2==="skip") return S2;
  if (!S2.ok) return {ok:false, big:"Move broken down", small:S2.why, bonus:-.04};
  const kit = lvKits(st);
  const pickIt = await new Promise(res=>{
    lvShow(`${lvHead(st, m.min, [3,3])}<h2 class="lv-t">Attacking move</h2><p class="lv-s">Step 3: you're in the box. Shoot, or square it for a tap-in?</p>
      <div class="lv-stage">${lvField("top", `${lvMan(108,70,kit.us,{ring:"#F5C542",label:"YOU"})}${lvMan(196,52,kit.us,{num:9})}${lvMan(150,20,kit.them)}${lvMan(160,62,kit.them)}<path d="M118 66L186 54" stroke="#FFE9A8" stroke-width="2" stroke-dasharray="5 5"/>`)}</div>
      <div class="lv-row"><button type="button" class="btn primary big" data-c="shoot">Shoot</button><button type="button" class="btn big" data-c="square">Square it</button></div>
      <button type="button" class="btn big lv-act" hidden></button>`);
    lvSkippable(res);
    lvEl.querySelectorAll("[data-c]").forEach(b=>b.addEventListener("click", ()=>res(b.dataset.c)));
  });
  if (pickIt==="skip") return pickIt;
  if (pickIt==="shoot"){
    const s = await lvShotCore(st, m, "box", lvHead(st, m.min, [3,3]), "Finish the move"); if (s==="skip") return s;
    return s.goal ? {ok:true, big:"Goal!", small:"What a team move", g:1} : {ok:false, big:s.big, small:s.small, bonus:.02};
  }
  // squaring it: weight the pass (a quick power bar with a wide green zone)
  const w = await lvWeight(st, m, lvHead(st, m.min, [3,3]));
  if (w==="skip") return w;
  if (!w) return {ok:false, big:"Cut out", small:"The pass didn't reach him", bonus:-.04};
  return Math.random() < lvConv(st, m, .72) ? {ok:true, big:"Assist!", small:"Squared for a tap-in", a:1} : {ok:true, big:"Off the line!", small:"Cleared at the last second", bonus:.12};
}
function lvWeight(st, m, head){
  const e = lvEase(st, mcA().pas), zone = clamp(.26*(1 + e), .14, .4), mid = .6, per = 1100, kit = lvKits(st);
  return new Promise(res=>{
    lvShow(`${head}<h2 class="lv-t">Square it</h2><p class="lv-s">Weight the pass: stop the bar in the green.</p>
      <div class="lv-stage">${lvField("top", `${lvMan(108,70,kit.us,{ring:"#F5C542"})}${lvMan(196,52,kit.us,{num:9})}${lvMan(150,20,kit.them)}${lvBallSvg("lvSq",116,74,4)}`)}</div>
      <div class="lv-bar" aria-hidden="true"><span class="lv-zone" style="left:${((mid-zone/2)*100).toFixed(1)}%;width:${(zone*100).toFixed(1)}%"></span><span class="lv-mark"></span></div>
      <button type="button" class="btn big primary lv-act">Pass!</button>`);
    lvSkippable(res);
    const mark = lv$(".lv-mark"), t0 = performance.now(); let p = 0, done = false;
    lvLoop(now=>{ if (done) return false; p = (1 - Math.cos(2*Math.PI*(now-t0)/per))/2; mark.style.left = (p*100).toFixed(2)+"%"; });
    const go = async ()=>{ if (done) return; done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true; const ok = Math.abs(p-mid)<=zone/2;
      await lvTween(300, k=>lvMove("#lvSq", 116 + (ok ? 74 : 40)*k, 74 - (ok ? 20 : 2)*k)); res(ok); };
    lvTap(lv$(".lv-act"), go); lv$(".lv-bar").addEventListener("pointerdown", go);
    lvKey = k=>{ if (k==="go") go(); };
  });
}

/* ---------- crosses: pick the free runner as he hits his spot ---------- */
function lvGameCross(st, m){
  const a = mcA(), e = lvEase(st, a.pas), kit = lvKits(st), left = ["LW","LB"].includes(S.player.pos), X = x => left ? 300-x : x;
  const R = [{from:[X(214),124], to:[X(170),26], spot:[X(172),38]}, {from:[X(138),140], to:[X(122),20], spot:[X(128),34]}];
  const marked = Math.floor(Math.random()*2), per = clamp(1750*(1 + e*.35), 1250, 2300), rr = clamp(14*(1 + e), 9, 21);
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">Cross it in</h2><p class="lv-s">Tap the free runner as he reaches his green spot.</p>
      <div class="lv-stage">${lvField("top", R.map((r,i)=>`<circle cx="${r.spot[0]}" cy="${r.spot[1]}" r="${rr}" fill="rgba(74,222,128,.28)" stroke="#4ADE80" stroke-width="1.5"/>`).join("")
          + R.map((r,i)=>`<g id="lvR${i}">${lvMan(0,0,kit.us,{num:[9,11][i]})}</g>`).join("") + `<g id="lvRd">${lvMan(0,0,kit.them)}</g>` + lvMan(X(272), 34, kit.us, {ring:"#F5C542"}) + lvBallSvg("lvCb", X(262), 36, 4))}
        ${R.map((r,i)=>`<button type="button" class="lv-tap lv-run-btn" data-i="${i}" ${i===marked?"data-marked":""} aria-label="Cross to number ${[9,11][i]}"></button>`).join("")}</div>
      <button type="button" class="btn big lv-act" disabled>Pick your man</button>`);
    lvSkippable(res);
    const t0 = performance.now() + 300, btns = lvEl.querySelectorAll(".lv-run-btn"); let t = 0, done = false;
    const pos = (r, k) => [r.from[0] + (r.to[0]-r.from[0])*k, r.from[1] + (r.to[1]-r.from[1])*k];
    lvLoop(now=>{
      if (done) return false;
      t = Math.max(0, now-t0)/per;
      R.forEach((r,i)=>{ const [x,y] = pos(r, Math.min(t, 1.1)); lvMove(`#lvR${i}`, x, y); btns[i].setAttribute("style", lvPct(x, y-14)); if (i===marked) lvMove("#lvRd", x + (left ? -11 : 11), y + 5); });
      if (t>1.25){ end(-1); return false; }
    });
    const end = async i=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      if (i<0) return res({ok:false, big:"Too late", small:"The chance has gone", bonus:-.08});
      const r = R[i], [x,y] = pos(r, Math.min(t, 1.1)), d = Math.hypot(x - r.spot[0], y - r.spot[1]);
      await lvTween(360, k=>lvMove("#lvCb", X(262) + (r.spot[0]-X(262))*k, 36 + (r.spot[1]-36)*k - Math.sin(k*Math.PI)*16));
      if (i===marked) return res({ok:false, big:"Cleared", small:"He was marked", bonus:-.08});
      if (d>rr) return res({ok:false, big:"Wasted", small: t<1 && Math.hypot(x-r.from[0], y-r.from[1]) < Math.hypot(r.spot[0]-r.from[0], r.spot[1]-r.from[1]) ? "Crossed too early" : "Crossed too late", bonus:-.08});
      res(Math.random() < lvConv(st, m, .42) ? {ok:true, big:"Assist!", small:"A perfect cross, buried with a header", a:1} : {ok:true, big:"Great cross", small:"His header was saved", bonus:.12});
    };
    btns.forEach(b=>lvTap(b, ()=>end(+b.dataset.i)));
    lvKey = k=>{ const i = {l:left?0:1, r:left?1:0}[k]; if (i!=null) end(i); };
  });
}

/* ---------- tackles and blocks: timing ---------- */
function lvGameTiming(st, m){
  const f = st.f, a = mcA(), block = m.g==="block", kit = lvKits(st);
  const e = lvEase(st, block ? a.def : a.def*.7 + a.pac*.3);
  const zone = clamp(.14*(1 + e*1.2), .06, .3), mid = block ? .78 : .66, per = clamp(1300*(1 + e*.45), 750, 1750);
  const T = block ? {t:"Shot heading for goal!", s:"Throw yourself in the way: tap when the ball reaches the green.", b:"Block!"}
    : {t:"Counter-attack!", s:"He's running at you. Tap to tackle when he's in the green.", b:"Tackle!"};
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">${T.t}</h2><p class="lv-s">${T.s}</p>
      <div class="lv-stage">${lvField(block ? "side" : "none", `<path d="M10 92H290" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-dasharray="8 6"/>
          <rect x="${(10 + 280*(mid-zone/2)).toFixed(1)}" y="52" width="${(280*zone).toFixed(1)}" height="78" rx="10" fill="rgba(74,222,128,.3)" stroke="#4ADE80" stroke-width="2"/>
          ${lvMan(10 + 280*mid, 140, kit.us, {ring:"#F5C542"})}
          ${block ? `${lvMan(18, 100, kit.them)}${lvBallSvg("lvRun", 10, 92, 5)}` : `<g id="lvRun">${lvMan(0, 8, kit.them)}<circle cx="9" cy="6" r="3.6" fill="#fff" stroke="#15171A"/></g>`}`)}</div>
      <button type="button" class="btn primary big lv-act">${T.b}</button>`);
    lvSkippable(res);
    let p = -.1, done = false; const t0 = performance.now() + 450;
    lvLoop(now=>{ if (done) return false; p = (now-t0)/per; lvMove("#lvRun", 10 + clamp(p, -.1, 1)*280, 92); if (p>=1){ go(true); return false; } });
    const go = (late)=>{
      if (done || (p<0 && !late)) return;   // he isn't on the pitch yet: a tap now doesn't count
      done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      const ok = Math.abs(p-mid)<=zone/2, early = p<mid-zone/2;
      if (ok) return res({ok:true, big: block ? "Blocked!" : "Tackle won!", small: block ? "Off your shin and away" : "Clean as a whistle", bonus:.3});
      const why = early ? (block ? "You went down too soon" : "You dived in") : (block ? "Too late" : "He skipped past you");
      if (Math.random() >= (block ? .72 : .52)*m.q) return res({ok:false, big:"Got away with it", small:`${why}, but the shot went wide`, bonus:-.1});
      const og = block && Math.random()<.3;   // a block that goes wrong can deflect in off you
      res(og ? {ok:false, big:"Own goal", small:"It deflected in off you", og:1, bonus:-.45} : {ok:false, big:"They score", small:why, ga:1, bonus:-.3});
    };
    lvTap(lv$(".lv-act"), ()=>go()); lvTap(lv$(".lv-stage"), ()=>go());
    lvKey = k=>{ if (k==="go") go(); };
  });
}

/* ---------- interceptions: read the passer's eyes ---------- */
function lvGameIntercept(st, m){
  const f = st.f, a = mcA(), e = lvEase(st, a.def*.7 + a.pas*.3), kit = lvKits(st);
  const react = clamp(700*(1 + e), 400, 1100), wait = 700 + Math.random()*800, dummy = f.oppStr > a.def + 3 && Math.random()<.35;
  const L = {l:[70,110], c:[150,126], r:[230,110]};
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">Read the pass</h2><p class="lv-s">Watch where he looks, then tap that lane to cut it out.</p>
      <div class="lv-stage">${lvField("bottom", `<path d="M112 20v150M188 20v150" stroke="rgba(255,255,255,.2)" stroke-width="2" stroke-dasharray="6 6"/>${lvMan(150,40,kit.them)}${Object.values(L).map(([x,y])=>lvMan(x, y, kit.them)).join("")}${lvMan(150,86,kit.us,{ring:"#F5C542"})}
          <path id="lvLook" d="M0 0" stroke="#F5C542" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 6" opacity="0"/>${lvBallSvg("lvIb", 150, 44, 4)}`)}
        <div class="lv-thirds">${["l","c","r"].map(z=>`<button type="button" class="lv-tap" data-z="${z}" aria-label="Cut out the pass ${{l:"left",c:"through the middle",r:"right"}[z]}"></button>`).join("")}</div></div>
      <button type="button" class="btn big lv-act" disabled>Watch his eyes</button>`);
    lvSkippable(res);
    const stage = lv$(".lv-stage"), look = lv$("#lvLook"), t0 = performance.now(); let dir = null, at = 0, done = false, faked = !dummy;
    const show = z => { const [x,y] = L[z]; look.setAttribute("d", `M150 46L${150 + (x-150)*.72} ${46 + (y-46)*.72}`); look.setAttribute("opacity", 1); };
    lvLoop(now=>{
      if (done) return false;
      const t = now - t0;
      if (!faked && t>=wait-450){ faked = true; show(pick(["l","c","r"])); setTimeout(()=>{ if (!dir && lvEl) look.setAttribute("opacity", 0); }, 200); }
      if (!dir && t>=wait){ dir = pick(["l","c","r"]); at = now; stage.dataset.look = dir; show(dir); }
      if (dir){ const k = clamp((now-at-react*.45)/(react*.55), 0, 1), [x,y] = L[dir]; lvMove("#lvIb", 150 + (x-150)*k, 44 + (y-44)*k); if (k>=1){ end(null); return false; } }
    });
    const end = z=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      const ok = z && (dir ? z===dir : Math.random()<1/3);
      if (ok) return res(Math.random()<.08 ? {ok:true, big:"Intercepted!", small:"…and the counter ends in a goal", gf:1, bonus:.4} : {ok:true, big:"Intercepted!", small: dir ? "You read it perfectly" : "A lucky guess", bonus:.3});
      const why = !z ? "Too slow to react" : !dir ? "You went before he'd decided" : "Wrong lane";
      res(Math.random() < .3*m.q ? {ok:false, big:"They score", small:`${why}: they broke through`, ga:1, bonus:-.3} : {ok:false, big:"Pass completed", small:why, bonus:-.1});
    };
    lvEl.querySelectorAll(".lv-thirds button").forEach(b=>lvTap(b, ()=>end(b.dataset.z)));
    lvKey = k=>{ if (k!=="go") end(k); };
  });
}

/* ---------- shadowing: stay in his lane ---------- */
function lvGameShadow(st, m){
  const a = mcA(), e = lvEase(st, a.def*.6 + a.pac*.4), kit = lvKits(st), X = {l:75, c:150, r:225};
  const react = clamp(640*(1 + e), 330, 980), moves = 4;
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">Shadow your man</h2><p class="lv-s">When he switches lane, tap the same lane to stay in front of him.</p>
      <div class="lv-stage">${lvField("bottom", `<path d="M112 10v150M188 10v150" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="6 6"/>
          <g id="lvAt">${lvMan(0,0,kit.them)}</g><g id="lvMe">${lvMan(0,0,kit.us,{ring:"#F5C542"})}</g>`)}
        <div class="lv-thirds">${["l","c","r"].map(z=>`<button type="button" class="lv-tap" data-z="${z}" aria-label="Move ${{l:"left",c:"to the middle",r:"right"}[z]}"></button>`).join("")}</div></div>
      <div class="lv-timer"><span></span></div>
      <button type="button" class="btn big lv-act" disabled>Stay with him</button>`);
    lvSkippable(res);
    const stage = lv$(".lv-stage"), bar = lv$(".lv-timer span");
    let his = "c", mine = "c", n = 0, misses = 0, next = performance.now() + 900, deadline = 0, done = false;
    lvMove("#lvAt", X.c, 58); lvMove("#lvMe", X.c, 128); stage.dataset.lane = his;
    lvLoop(now=>{
      if (done) return false;
      if (deadline && now>=deadline){ if (mine!==his) misses++; deadline = 0; n++; next = now + 450 + Math.random()*350; if (n>=moves){ end(); return false; } }
      if (!deadline && now>=next){ his = pick(["l","c","r"].filter(z=>z!==his)); stage.dataset.lane = his; lvMove("#lvAt", X[his], 58); deadline = now + react; }
      bar.style.width = (100 - (n/moves)*100) + "%";
    });
    const step = z=>{ if (done) return; mine = z; lvMove("#lvMe", X[z], 128); };
    const end = ()=>{
      done = true;
      if (misses===0) return res({ok:true, big:"Kept him in front", small:"He had nowhere to go", bonus:.3});
      if (misses===1) return res({ok:true, big:"Stayed with him", small:"Only just", bonus:.15});
      res(Math.random() < (misses>=3 ? .5 : .36)*m.q ? {ok:false, big:"They score", small:"He got away from you", ga:1, bonus:-.3} : {ok:false, big:"He got past you", small:"…but the shot went wide", bonus:-.12});
    };
    lvEl.querySelectorAll(".lv-thirds button").forEach(b=>lvTap(b, ()=>step(b.dataset.z)));
    lvKey = k=>{ if (k!=="go") step(k); };
  });
}

/* ---------- saves and penalties: react to the shot ---------- */
function lvGameSave(st, m){
  const f = st.f, a = mcA(), pen = m.v==="pen", kit = lvKits(st), e = lvEase(st, a.def);
  const react = clamp(760*(1 + e) - (pen ? 160 : 0), 360, 1150);
  const T = pen ? {t:"Penalty!", s:"Watch the ball and dive the right way: tap that side of the goal."}
    : pick([{t:"One-on-one!", s:"He's through. Watch the ball and dive the right way."}, {t:"Shot from the edge of the box", s:"Watch the ball and dive the right way: tap that side of the goal."}]);
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">${T.t}</h2><p class="lv-s">${T.s}</p>
      <div class="lv-stage">${lvGoalSvg(kit.us, null, true)}
        <div class="lv-thirds">${["l","c","r"].map(z=>`<button type="button" class="lv-tap" data-z="${z}" aria-label="Dive ${{l:"left",c:"centre",r:"right"}[z]}"></button>`).join("")}</div>
        <span class="lv-cue">${pen ? "Penalty" : "Here he comes"}…</span></div>
      <button type="button" class="btn big lv-act" disabled>Watch the ball</button>`);
    lvSkippable(res);
    let dir = null, ty = LV_ROWS.b, tap = null, tapAt = 0, rel = 0, done = false;
    const windUp = (pen ? 1100 : 650) + Math.random()*700, t0 = performance.now();
    const pickDir = ()=>{ const all = ["l","c","r"]; if (tap && Math.random()<.8) return pick(all.filter(z=>z!==tap)); return pick(["l","l","c","r","r"]); };   // strikers punish keepers who go early
    lvLoop(now=>{
      if (done) return false;
      if (!dir && now-t0>=windUp){ dir = pickDir(); ty = pick([LV_ROWS.t, LV_ROWS.b]); rel = now; lv$(".lv-cue")?.remove(); }
      if (dir){ const k = Math.min(1, (now-rel)/react); lvMove("#lvBall", 150 + (LV_COLS[dir]-150)*k, 166 + (ty-166)*k, k*400, 1 - .35*k); if (k>=1){ end(); return false; } }
    });
    const dive = z=>{
      if (tap || done) return; tap = z; tapAt = performance.now();
      const kx = LV_COLS[z], rot = z==="l" ? -62 : z==="r" ? 62 : 0;
      lvTween(220, k=>lvMove("#lvKp", 150 + (kx-150)*k, 84 + (z==="c" ? -20 : 8)*k, rot*k)).then(()=>{ if (dir && !done) end(); });
    };
    const end = async ()=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      if (!dir) dir = pickDir();
      const saved = tap===dir && Math.random() > clamp((f.oppStr - a.def)/50, 0, .2);
      lvMove("#lvBall", LV_COLS[dir], ty, 0, .65);
      await lvWait(250);
      if (saved) return res({ok:true, big:"Saved!", small: pen ? "Penalty saved!" : tap && tapAt<rel ? "You guessed right" : "Great reactions", bonus: pen ? .55 : .35});
      if (Math.random() > .92*m.q) return res({ok:true, big:"Off the post!", small:"Lucky", bonus:-.05});
      res({ok:false, big:"Goal", small: !tap ? "You didn't move" : tapAt<rel ? "You went too early" : "Wrong way", ga:1, bonus: pen ? -.1 : -.3});
    };
    lvEl.querySelectorAll(".lv-thirds button").forEach(b=>lvTap(b, ()=>dive(b.dataset.z)));
    lvKey = k=>{ if (k!=="go") dive(k); };
  });
}

/* ---------- rushing out: smother it after his heavy touch ---------- */
function lvGameRush(st, m){
  const f = st.f, a = mcA(), e = lvEase(st, a.def*.7 + a.pac*.3), kit = lvKits(st);
  const run = clamp(1900*(1 + e*.3), 1300, 2400), react = clamp(620*(1 + e), 330, 980), heavyAt = .35 + Math.random()*.35;
  return new Promise(res=>{
    lvShow(`${lvHead(st, m.min)}<h2 class="lv-t">He's through!</h2><p class="lv-s">Wait for his heavy touch, then rush out and smother it.</p>
      <div class="lv-stage">${lvField("bottom", `<g id="lvSt">${lvMan(0,0,kit.them)}</g>${lvBallSvg("lvRb", 150, 30, 4)}<text id="lvBang" x="0" y="0" font-size="24" font-weight="900" fill="#F5C542" opacity="0" font-family="Big Shoulders Display,sans-serif">!</text>
          <g id="lvGk">${lvMan(0,0,kit.us,{ring:"#F5C542"})}</g>`)}</div>
      <button type="button" class="btn primary big lv-act">Rush out!</button>`);
    lvSkippable(res);
    lvMove("#lvGk", 150, 168);
    const stage = lv$(".lv-stage"), t0 = performance.now() + 300; let k = 0, heavy = 0, done = false;
    lvLoop(now=>{
      if (done) return false;
      k = Math.max(0, now-t0)/run; const y = 20 + k*112;
      lvMove("#lvSt", 150, y);
      if (!heavy && k>=heavyAt){ heavy = now; stage.dataset.heavy = 1; const b = lv$("#lvBang"); b.setAttribute("x", 160); b.setAttribute("y", y - 10); b.setAttribute("opacity", 1); }
      lvMove("#lvRb", 150 + (heavy ? 4 : 0), y + 8 + (heavy ? Math.min(22, (now-heavy)/12) : 0));
      if (k>=1 || (heavy && now-heavy > react*1.8)){ end(true); return false; }
    });
    const end = async late=>{
      if (done) return; done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      const now = performance.now(), ok = heavy && !late && now-heavy <= react;
      await lvTween(240, q=>lvMove("#lvGk", 150, 168 - q*(ok ? 50 : 26)));
      if (ok) return res({ok:true, big:"Smothered it!", small:"Brave and perfectly timed", bonus:.35});
      if (!heavy) return res(Math.random() < .78*m.q ? {ok:false, big:"Rounded you", small:"You went too early", ga:1, bonus:-.3} : {ok:false, big:"Rounded you", small:"…but he ran it out of play", bonus:-.1});
      res(Math.random() < .58*m.q ? {ok:false, big:"He scores", small:"Too late: he got the shot away", ga:1, bonus:-.25} : {ok:true, big:"Saved!", small:"Late, but you got a hand to it", bonus:.15});
    };
    lvTap(lv$(".lv-act"), ()=>end(false)); lvTap(stage, ()=>end(false));
    lvKey = k=>{ if (k==="go") end(false); };
  });
}

const LV_GAMES = {shot:lvGameShot, header:lvGameHeader, pass:lvGamePass, move:lvGameMove, takeon:lvGameTakeon, cross:lvGameCross,
  tackle:lvGameTiming, block:lvGameTiming, intercept:lvGameIntercept, shadow:lvGameShadow, save:lvGameSave, claim:lvGameClaim, rush:lvGameRush};
