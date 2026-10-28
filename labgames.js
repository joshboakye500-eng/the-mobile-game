/* ================= NEW MINI-GAMES (in development) =================
   Games for the mini-game lab (lab.js) only: they're never used in matches and never touch the career. Each takes
   the lab's pretend match (st, with st.lab: the difficulty is st.lab.ease, from +0.25 on easy to -0.25 on hard)
   and resolves a result {ok, big, small, score} or "skip" when you leave. They're drawn and moved with the match
   games' tools (moments.js). Loaded after moments.js and drills.js, before lab.js. */
const LAB_NEW = [];
const lgAdd = (g, help) => { LAB_NEW.push({cat:"new", help:`lg_${g.id}`, ...g}); LV_HELP[`lg_${g.id}`] = help; };

/* ---------- shared pieces ---------- */
// a new game's screen: the lab's scoreboard, the title, how to play in a line, the stage and its controls
function lgShow(st, t, s, scene, ctl = ""){ if (st.lab.quit) throw "lab-quit"; lvShow(`${lvHead(st)}<h2 class="lv-t">${t}</h2><p class="lv-s">${s}</p><div class="lv-stage">${scene}</div>${ctl}`); }
// the score in the corner of the stage
const lgHud = (n, label) => `<div class="lg-hud" aria-live="polite"><b>${n}</b><small>${label}</small></div>`;
function lgSetHud(n){ const b = lv$(".lg-hud b"); if (b){ b.textContent = n; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); } }
// a word that floats up over the stage and fades ("Perfect!")
function lgPop(txt, good = true, x = 50, y = 38){
  const st = lv$(".lv-stage"); if (!st) return;
  st.insertAdjacentHTML("beforeend", `<span class="lg-pop ${good ? "good" : "bad"}" style="left:${x}%;top:${y}%">${esc(txt)}</span>`);
  const el = st.lastElementChild; setTimeout(()=>el.remove(), 900);
}
// how one go went, over the stage for a moment
async function lgFlash(ok, big, small, ms = 950){
  const stage = lv$(".lv-stage"); if (!stage) return;
  stage.insertAdjacentHTML("beforeend", lvResHTML({ok, big, small})); const el = stage.lastElementChild; lvBuzz(ok ? "good" : "bad"); if (ok) lvCheer();
  await lvWait(ms); el.remove();
}
// a timer bar under the stage, and how much of it is left (0 to 1)
const lgTimerHTML = `<div class="lv-timer"><span></span></div>`;
function lgSetTimer(left){ const b = lv$(".lv-timer span"); if (b) b.style.transform = `scaleX(${clamp(left, 0, 1).toFixed(3)})`; }
// the target for a scored game: a little lower on easy, higher on hard
const lgTarget = (st, normal, step = 1) => Math.max(1, Math.round(normal - st.lab.ease*4*step));
// keys for games that need more than the match games' go/left/right, removed when the game ends
function lgKeys(down, up){
  const d = e=>{ if (!lvEl) return; const r = down(e.key); if (r!==undefined){ e.preventDefault(); e.stopPropagation(); } };
  const u = e=>{ if (up) up(e.key); };
  document.addEventListener("keydown", d, true); document.addEventListener("keyup", u, true);
  return ()=>{ document.removeEventListener("keydown", d, true); document.removeEventListener("keyup", u, true); };
}
// holding something down (a button, half the stage): on(true) when pressed, on(false) when let go
function lgHoldOn(el, on){
  if (!el) return;
  el.addEventListener("pointerdown", e=>{ e.preventDefault(); el.setPointerCapture?.(e.pointerId); on(true); });
  ["pointerup","pointercancel","lostpointercapture"].forEach(t=>el.addEventListener(t, ()=>on(false)));
}
// a side-on view: the stand behind, the advertising boards, and the grass
function lgSide(inner = ""){
  return `<svg viewBox="0 0 300 180" aria-hidden="true"><defs>${LV_DEFS}<linearGradient id="lgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081A12"/><stop offset="1" stop-color="#10301F"/></linearGradient>
      <radialGradient id="lgFl" cx="50%" cy="0%" r="75%"><stop offset="0" stop-color="#FFF6D6" stop-opacity=".25"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient>
      <linearGradient id="lgTurf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17542E"/><stop offset="1" stop-color="#23783F"/></linearGradient></defs>
    <rect width="300" height="180" fill="url(#lgSky)"/>${lvCrowd()}<rect width="300" height="180" fill="url(#lgFl)"/>
    <rect y="106" width="300" height="20" fill="#0B1A12"/>${[0,1,2,3,4,5].map(i=>`<text x="${25+i*50}" y="120" text-anchor="middle" font-family="Big Shoulders Display, Impact, sans-serif" font-weight="900" font-size="10" letter-spacing="1" fill="${i%2 ? "#F5C542" : "#7FD7C4"}" opacity=".38">PYRAMID</text>`).join("")}
    <rect y="126" width="300" height="54" fill="url(#lgTurf)"/><path d="M0 140h300M0 160h300" stroke="rgba(255,255,255,.05)" stroke-width="9"/>${inner}</svg>`;
}
// the triangle wave a sweeping marker follows: 0 to 1 and back over per ms
const lgSweep = (t, per) => { const k = (t/per) % 1; return k<.5 ? k*2 : 2 - k*2; };
// a keeper's kit that clashes with neither side
const lgKeeperKit = kit => ["#84CC16", "#A855F7", "#F97316", "#0EA5E9"].find(c=>!lvNear(c, kit.us) && !lvNear(c, kit.them)) || "#84CC16";
// a goal seen side-on, on the left of a side view: the post, and the net running back to the ground
const lgSideGoal = (x = 30) => `<path d="M${x} 170V112L${x-24} 121L${x-28} 170z" fill="rgba(6,18,11,.55)"/><path d="M${x} 170V112L${x-24} 121L${x-28} 170z" fill="url(#lvNetS)"/>
  <path d="M${x} 112L${x-24} 121L${x-28} 170" fill="none" stroke="rgba(244,247,242,.5)" stroke-width="1.2"/><ellipse cx="${x-12}" cy="171" rx="20" ry="2.4" fill="rgba(0,0,0,.3)"/>
  <rect x="${x-2.2}" y="110.5" width="4.4" height="60" rx="1.6" fill="#F4F7F2"/><rect x="${x+.6}" y="110.5" width="1.6" height="60" fill="#000" opacity=".15"/>`;
// a ring bursting out from where something hit (the net, a head, a tap)
function lgImpact(x, y, col = "#FFFFFF", r = 9){
  const svg = lv$(".lv-stage svg"); if (!svg) return;
  svg.insertAdjacentHTML("beforeend", `<circle class="lg-impact" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="none" stroke="${col}" stroke-width="2.2"/>`);
  const c = svg.lastElementChild; setTimeout(()=>c.remove(), 600);
}
// where a tap landed on the stage, in the scene's coordinates
const lgAt = (ev, stage = lv$(".lv-stage")) => { const r = stage.getBoundingClientRect(); return [(ev.clientX - r.left)/r.width*300, (ev.clientY - r.top)/r.height*180]; };
// the figures in a scene drawn back to front, so whoever's nearer the bottom is in front (ids, in any order)
function lgDepth(ids, ys){
  const order = ids.map((id, i)=>[id, ys[i]]).sort((a, b)=>a[1] - b[1]).map(x=>x[0]);
  const els = order.map(id=>lv$(id)).filter(Boolean); if (els.length<2) return;
  const host = els[0].parentNode; if (els.some((el, i)=>i && el.compareDocumentPosition(els[i-1]) & Node.DOCUMENT_POSITION_FOLLOWING)) els.forEach(el=>host.appendChild(el));
}

/* ---------- 1. Penalty shootout: five each, you shoot then you're in goal ---------- */
async function lgShootout(st){
  const me = [], them = [], n = a => a.filter(Boolean).length;
  const decided = () => { const a = n(me), b = n(them), na = me.length, nb = them.length;
    if (na<=5 && nb<=5) return a + (5-na) < b || b + (5-nb) < a;
    return na===nb && a!==b; };
  const tally = () => { st.lab.tally = `${n(me)}–${n(them)}`; };
  for (let r=0; r<10; r++){
    tally(); if (st.lab.quit) return "skip";
    const sh = await lvShotCore(st, {q:1}, "pen", lvHead(st), r<5 ? `Your penalty · ${r+1} of 5` : "Sudden death: your kick"); if (sh==="skip") return sh;
    me.push(sh.goal); tally(); await lgFlash(sh.goal, sh.goal ? "Scored!" : sh.big, `${sh.small} · ${st.lab.tally}`);
    if (decided()) break; if (st.lab.quit) return "skip";
    const sv = await lvGameSave(st, {q:1, v:"pen", g:"save"}); if (sv==="skip") return sv;
    them.push(!sv.ok); tally(); await lgFlash(sv.ok, sv.ok ? "Saved!" : "They score", `${sv.small} · ${st.lab.tally}`);
    if (decided()) break;
  }
  const a = n(me), b = n(them), dots = x => x.map(g=>g ? "●" : "○").join(" ");
  return {ok:a>b, big:a>b ? "You win it!" : a<b ? "You lose" : "Still level", small:`${a}–${b} on penalties`, score:`You ${dots(me)} · Them ${dots(them)}`};
}
lgAdd({id:"shootout", t:"Penalty shootout", d:"Five penalties each: take yours, then save theirs. Sudden death if it's level.", ic:"spot", run:lgShootout},
  {t:"Penalty shootout", steps:["Five penalties each, in turns: <b>you shoot</b>, then <b>you're in goal</b>.", "Shooting: tap the goal where you want it, then stop the power bar in the green.",
    "In goal: watch the ball and tap the side it's going. Level after five each and it's sudden death."]});

/* ---------- 2. Keepy-uppy: touch it up each time it drops into the green ---------- */
function lgKeepy(st){
  const kit = lvKits(st), e = st.lab.ease, zw = 34*(1 + e*1.2), goal = lgTarget(st, 15, 1.25);
  return new Promise(res=>{
    lgShow(st, "Keepy-uppy", `Tap when the ball drops into the green band at your feet. Get to ${goal}.`,
      lgSide(`<rect x="0" y="${170 - zw}" width="300" height="${zw}" fill="rgba(74,222,128,.16)"/><path d="M0 ${170 - zw}h300" stroke="#4ADE80" stroke-width="1.2" stroke-dasharray="5 4" opacity=".8"/>
        <g id="lgP">${lvMan(0, 0, kit.us, {s:2.1})}</g>${lvBallSvg("lgB", 150, 170, 6.5)}`) + lgHud(0, "touches"),
      `<button type="button" class="btn primary big lv-act">Touch!</button>`);
    const fin = r => { off(); res(r); }, off = lgKeys(k=>{ if (k===" " || k==="Enter"){ tap(); return true; } });
    lvSkippable(fin);
    // the ball starts on your foot: the first tap flicks it up
    let x = 150, z = 0, vx = 0, vz = 0, g = 430, px = 150, n = 0, last = performance.now(), cool = 0, done = false, kick = 0, live = false;
    lgPop("Tap to flick it up", true, 50, 34);
    lvMove("#lgP", px, 176);
    lvLoop(now=>{
      if (done) return false;
      const dt = Math.min(.04, (now-last)/1000); last = now;
      if (live){ vz -= g*dt; z += vz*dt; x += vx*dt; }
      if (x<60 || x>240){ vx = -vx; x = clamp(x, 60, 240); }
      px += (x - px)*Math.min(1, dt*7);
      lvMove("#lgP", px, 176);
      const leg = lv$("#lgP .lv-l2"); if (leg) leg.setAttribute("transform", now<kick ? "rotate(-38 3.8 -12)" : "");
      lvBallAt("#lgB", x, 170, 1, Math.max(0, z), now*.6);
      if (live && z<=0){ end(); return false; }
    });
    const tap = () => {
      if (done) return; const now = performance.now(); if (now<cool) return;
      if (!live){ live = true; kick = now + 170; vz = Math.sqrt(2*g*85); return; }
      if (z<=zw && z>=0){
        n++; lgSetHud(n); kick = now + 170; g *= 1.035; lvBuzz("good");
        const h = 70 + Math.random()*35; vz = Math.sqrt(2*g*h); vx = (Math.random()*2-1)*55*(1 + n*.03);
        if (z<zw*.45) lgPop("Perfect!", true, 50, 30);
      } else { cool = now + 320; lgPop("Too early", false, 50, 30); }
    };
    const end = async () => {
      done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      await lvTween(300, k=>lvBallAt("#lgB", x + vx*.15*k, 170, 1, 10*Math.sin(Math.PI*k), k*200));
      fin({ok:n>=goal, big:n>=goal ? `${n} touches!` : "Dropped it", small:n>=goal ? `You needed ${goal}` : `${n} touch${n===1 ? "" : "es"}, you needed ${goal}`, score:`Best target: ${goal}`});
    };
    lvTap(lv$(".lv-act"), tap); lvTap(lv$(".lv-stage"), tap);
  });
}
lgAdd({id:"keepy", t:"Keepy-uppy", d:"Keep it off the ground: touch it each time it drops into the green.", ic:"juggle", run:lgKeepy},
  {t:"Keepy-uppy", steps:["Keep the ball off the ground for as long as you can.", "Tap (or press space) when it drops into the <b>green band</b> at your feet.",
    "Every touch sends it up a little faster. Tap too early and you swing at nothing for a moment."]});

/* ---------- 3. Crossbar challenge: where along the bar, then how hard ---------- */
function lgCrossbar(st){
  const kit = lvKits(st), e = st.lab.ease, zone = clamp(.18*(1 + e*1.3), .1, .26), mid = .62, per = clamp(1700*(1 + e*.5), 1100, 2300), pw = clamp(1500*(1 + e*.5), 1150, 1900);
  let hits = 0;
  const one = (k) => new Promise(res=>{
    st.lab.tally = `${hits} of 3`;
    lgShow(st, "Crossbar challenge", `Go ${k+1} of 3. Tap to pick your spot on the bar, then stop the power in the green.`,
      lvGoalSvg(kit.them, null, false, {empty:true, extra:`<rect id="lgBar" x="27.5" y="15.5" width="245" height="9" rx="3" fill="#FFF6D6" opacity="0"/>
        <g id="lgAim" transform="translate(150 0)"><path d="M0 26v10" stroke="#F5C542" stroke-width="2.5"/><path d="M-6 3h12l-6 9z" fill="#F5C542"/></g>`}) + lgHud(hits, "hits"),
      `${lvBarHTML(mid, zone)}<button type="button" class="btn primary big lv-act">Pick your spot</button>`);
    const fin = r => res(r); lvSkippable(fin);
    let phase = 0, ax = 150, p = 0, done = false; const t0 = performance.now(); let t1 = 0;
    lvBarSet(0, mid-zone/2, mid+zone/2);
    lvLoop(now=>{
      if (done) return false;
      if (phase===0){ ax = 16 + 268*lgSweep(now-t0, per); lvMove("#lgAim", ax, 0); }
      else { p = (1 - Math.cos(2*Math.PI*(now-t1)/pw))/2; lvBarSet(p, mid-zone/2, mid+zone/2); }
    });
    const go = async () => {
      if (done) return;
      if (phase===0){ phase = 1; t1 = performance.now(); lv$(".lv-act").textContent = "Strike!"; return; }
      done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      const wide = ax<26 || ax>274, post = !wide && (ax<36 || ax>264), ty = 20 + (mid - p)*320, bar = !wide && !post && Math.abs(ty - 20)<=zone*160;
      const end = wide ? [ax, 40] : [ax, bar ? 20 : clamp(ty, -16, 116)];
      await lvStrike(st);
      await lvFly("#lvBall", [150, 166], end, 520, {s0:1, s1:.58, h:16, curve:(ax-150)*.08, spin:1.4});
      if (bar){ hits++; lgSetHud(hits); const b = lv$("#lgBar"); lvTween(380, k=>b.setAttribute("opacity", (.8*(1-k)).toFixed(2)));
        await lvFly("#lvBall", end, [ax + (Math.random()*40-20), 150], 420, {s0:.58, s1:.9, h:30, spin:-1}); return fin({ok:true, big:"Clang!", small:"Right off the bar"}); }
      if (post) return fin({ok:false, big:"Off the post", small:"The bar's further in"});
      if (wide) return fin({ok:false, big:"Wide", small:"Pick a spot on the bar"});
      if (ty>20){ lvRipple(ax, end[1]); return fin({ok:false, big:"In the net", small:"Doesn't count: hit it harder"}); }
      fin({ok:false, big:"Over", small:"Too much on it"});
    };
    lvTap(lv$(".lv-act"), go); lv$(".lv-bar").addEventListener("pointerdown", ()=>{ if (phase===1) go(); });
    lvKey = k=>{ if (k==="go") go(); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${hits} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:hits>=1, big:hits ? `${hits} of 3` : "No hits", small:hits ? "Off the bar" : "So close", score:`${hits} crossbar${hits===1 ? "" : "s"}`};
  })();
}
lgAdd({id:"crossbar", t:"Crossbar challenge", d:"Three goes to hit the bar: pick your spot, then judge the power.", ic:"bar", run:lgCrossbar},
  {t:"Crossbar challenge", steps:["Hit the crossbar from the edge of the box. Three goes.", "First a marker slides along the bar: tap to pick <b>where</b>. Off the end is the post or wide.",
    "Then stop the power bar in the <b>green</b>. Too soft and it's in the net, which doesn't count; too hard and it's over."]});

/* ---------- 4. Nutmeg: through his legs while they're open ---------- */
function lgNutmeg(st){
  const kit = lvKits(st), e = st.lab.ease; let got = 0;
  const one = k => new Promise(res=>{
    const per = clamp(1250*(1 + e*.6) - k*170, 650, 1800), snaps = e<0 || k===2, need = .66 - e*.25;
    st.lab.tally = `${got} of 3`;
    lgShow(st, "Nutmeg", `Go ${k+1} of 3. Tap so the ball gets to him while his legs are wide open.`,
      lvGoalSvg(kit.them, null, false, {empty:true, extra:`<g id="lgD">${lvMan(0, 0, kit.them, {s:2.5})}</g>`}) + lgHud(got, "nutmegs"),
      `<button type="button" class="btn primary big lv-act">Nutmeg!</button>`);
    const fin = r => res(r); lvSkippable(fin);
    lvMove("#lgD", 150, 150); lvBallAt("#lvBall", 150, 172, 1);
    const l1 = lv$("#lgD .lv-l1"), l2 = lv$("#lgD .lv-l2"), A = 30, t0 = performance.now();
    let snapAt = snaps ? t0 + per*(1.3 + Math.random()*1.6) : Infinity, done = false, open = 0;
    // how open his legs are at time t (0 shut to 1 wide), shutting fast now and then
    const openAt = t => { const base = .5 - .5*Math.cos(2*Math.PI*(t - t0)/per); return t>snapAt && t<snapAt + 260 ? base*.15 : base; };
    lvLoop(now=>{
      if (done) return false;
      if (now>snapAt + 260) snapAt = snaps ? now + per*(1.2 + Math.random()*1.8) : Infinity;
      open = openAt(now); l1.setAttribute("transform", `rotate(${(A*open).toFixed(1)} -3.8 -12)`); l2.setAttribute("transform", `rotate(${(-A*open).toFixed(1)} 3.8 -12)`);
    });
    const go = async () => {
      if (done) return; done = true; lv$(".lv-act").disabled = true;
      const T = 300, arrive = performance.now() + T;
      // he keeps moving while the ball's on its way
      lvLoop(now=>{ if (now>arrive + 400) return false; const o = openAt(now); l1.setAttribute("transform", `rotate(${(A*o).toFixed(1)} -3.8 -12)`); l2.setAttribute("transform", `rotate(${(-A*o).toFixed(1)} 3.8 -12)`); });
      await lvFly("#lvBall", [150, 172], [150, 152], T, {s0:1, s1:.85, ease:k=>k, spin:1});
      const ok = openAt(arrive) >= need;
      if (ok){ got++; lgSetHud(got); await lvFly("#lvBall", [150, 152], [150, 118], 300, {s0:.85, s1:.6, ease:k=>k, spin:1}); cancelAnimationFrame(lvRaf); return fin({ok:true, big:"Nutmeg!", small:"Right through his legs"}); }
      await lvFly("#lvBall", [150, 152], [150 + (Math.random()<.5 ? -40 : 40), 168], 320, {s0:.85, s1:1, h:8, spin:-1}); cancelAnimationFrame(lvRaf);
      fin({ok:false, big:"Blocked", small:openAt(arrive)>.35 ? "Just closing: go a touch earlier" : "His legs were shut"});
    };
    lvTap(lv$(".lv-act"), go); lvTap(lv$(".lv-stage"), go); lvKey = k=>{ if (k==="go") go(); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:got>=2 ? `${got} nutmegs` : got ? "Just the one" : "None", small:got===3 ? "He'll be hearing about that" : "He gets quicker each time", score:`${got} of 3`};
  })();
}
lgAdd({id:"nutmeg", t:"Nutmeg", d:"Time the ball through the defender's legs as they open. He gets quicker.", ic:"legs", run:lgNutmeg},
  {t:"Nutmeg", steps:["The defender's legs open and close as he jockeys you.", "Tap <b>Nutmeg!</b> so the ball reaches him while his legs are <b>wide open</b>. It takes a moment to get there, so go a touch early.",
    "Three goes, and he gets quicker. On hard he sometimes snaps them shut."]});

/* ---------- 5. Target practice: hit the targets as they pop up, with a wobbly aim ---------- */
function lgTargets(st){
  const kit = lvKits(st), e = st.lab.ease, R = clamp(17*(1 + e*1.1), 11, 23), life = clamp(2300*(1 + e*.8), 1500, 3200), sway = 13*(1 - e*1.4), dur = 25000, goal = lgTarget(st, 5, 1.5);
  return new Promise(res=>{
    lgShow(st, "Target practice", "Tap the goal to aim; your aim wobbles. Shoot as it passes over a target.",
      lvGoalSvg(kit.them, null, false, {empty:true, extra:`<g id="lgTg" opacity="0"><circle r="${R}" fill="#F8FAFC" stroke="#DC2626" stroke-width="3"/><circle r="${(R*.62).toFixed(1)}" fill="none" stroke="#DC2626" stroke-width="3"/><circle r="${(R*.25).toFixed(1)}" fill="#DC2626"/></g>`})
        + `<div class="lg-aimpad"></div><span class="lv-reticle"></span>` + lgHud(0, "hits"),
      `${lgTimerHTML}<button type="button" class="btn primary big lv-act">Shoot!</button>`);
    const fin = r => res(r); lvSkippable(fin);
    const stage = lv$(".lv-stage"), ret = lv$(".lv-reticle"), tg = lv$("#lgTg"), t0 = performance.now();
    let anchor = [150, 70], aim = [150, 70], tgt = null, tgAt = 0, n = 0, busy = false, done = false, shots = 0;
    const spawn = now => { tgt = [50 + Math.random()*200, 36 + Math.random()*74]; tgAt = now; tg.setAttribute("transform", `translate(${tgt[0].toFixed(1)} ${tgt[1].toFixed(1)})`); };
    spawn(t0 + 300);
    lvLoop(now=>{
      if (done) return false;
      const t = (now - t0)/1000;
      aim = [clamp(anchor[0] + sway*(Math.sin(t*1.7) + Math.sin(t*2.9 + 1))/2, 34, 266), clamp(anchor[1] + sway*(Math.sin(t*2.2 + 2) + Math.sin(t*3.4))/2, 26, 118)];
      ret.setAttribute("style", lvPct(aim[0], aim[1]));
      const age = now - tgAt; tg.setAttribute("opacity", tgt ? (age<0 ? 0 : age<160 ? age/160 : age>life-200 ? Math.max(0, (life-age)/200) : 1).toFixed(2) : 0);
      if (tgt && age>life){ tgt = null; setTimeout(()=>{ if (!done) spawn(performance.now()); }, 250); }
      lgSetTimer(1 - (now-t0)/dur);
      if (now - t0 >= dur){ end(); return false; }
    });
    lv$(".lg-aimpad").addEventListener("pointerdown", ev=>{ const r = stage.getBoundingClientRect(); anchor = [clamp((ev.clientX - r.left)/r.width*300, 40, 260), clamp((ev.clientY - r.top)/r.height*180, 30, 114)]; });
    const shoot = async () => {
      if (busy || done) return; busy = true; shots++;
      const at = aim.slice(), was = tgt && tgt.slice();
      await lvFly("#lvBall", [150, 166], at, 300, {s0:1, s1:.6, h:6, spin:1.4});
      if (was && tgt && Math.hypot(at[0]-tgt[0], at[1]-tgt[1]) <= R + 3){ n++; lgSetHud(n); lgPop(Math.hypot(at[0]-tgt[0], at[1]-tgt[1])<R*.3 ? "Bullseye!" : "Hit!", true, at[0]/3, at[1]/1.8); tgt = null; tg.setAttribute("opacity", 0); lvBuzz("good");
        setTimeout(()=>{ if (!done) spawn(performance.now()); }, 300); }
      else lvRipple(at[0], at[1]);
      await lvWait(140); lvBallAt("#lvBall", 150, 166, 1); busy = false;
    };
    const end = () => { done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      fin({ok:n>=goal, big:`${n} hit${n===1 ? "" : "s"}`, small:n>=goal ? `Target was ${goal}` : `You needed ${goal}`, score:`${n} from ${shots} shot${shots===1 ? "" : "s"}`}); };
    lvTap(lv$(".lv-act"), shoot); lvKey = k=>{ if (k==="go") shoot(); };
  });
}
lgAdd({id:"targets", t:"Target practice", d:"25 seconds, targets popping up in the goal, and an aim that won't keep still.", ic:"target", run:lgTargets},
  {t:"Target practice", steps:["Targets pop up around the goal, one at a time, for a couple of seconds each.", "Tap the goal to aim. Your aim <b>wobbles</b> around that spot, so tap <b>Shoot!</b> as it passes over the target.",
    "Hit as many as you can in 25 seconds."]});

/* ---------- 6. Dribble slalom: steer through the gates to the line ---------- */
function lgSlalom(st){
  const kit = lvKits(st), e = st.lab.ease, v0 = clamp(120*(1 - e*.5), 92, 152), L = 860, half = clamp(19*(1 + e*1.1), 13, 26), lives = {easy:2, normal:1, hard:0}[labDiff] ?? 1;
  // gates of two poles, swinging from one side to the other, so you have to weave
  const gates = []; for (let i=0, y=-70; y>-L+40; i++, y -= 92 + Math.random()*18) gates.push({x:150 + (i%2 ? 1 : -1)*(28 + Math.random()*30), y, done:false});
  const pole = (x, y, id) => `<g id="${id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse cy="2" rx="4.5" ry="1.8" fill="rgba(0,0,0,.35)"/><path d="M0 2V-20" stroke="#F8FAFC" stroke-width="2.4"/><path d="M0-20 10-16 0-12z" fill="#F97316"/></g>`;
  return new Promise(res=>{
    lgShow(st, "Dribble slalom", "Hold left or right to steer through every gate. Don't touch the poles.",
      `<svg viewBox="0 0 300 180" aria-hidden="true"><defs>${LV_DEFS}<radialGradient id="lgVg" cx="50%" cy="50%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
        <rect width="300" height="180" fill="#195C33"/><g id="lgC">${[...Array(Math.ceil((L+260)/36))].map((_,i)=>`<rect x="0" y="${180 - (i+1)*36}" width="300" height="18" fill="#1E6A3B"/>`).join("")}
          <path d="M44 180V${-L-80}M256 180V${-L-80}" stroke="rgba(255,255,255,.6)" stroke-width="2"/><path d="M44 ${-L-20}h212" stroke="#F5C542" stroke-width="4" stroke-dasharray="10 6"/>
          <text x="150" y="${-L-30}" text-anchor="middle" font-family="Big Shoulders Display,Impact,sans-serif" font-weight="900" font-size="14" fill="#FFE9A8" letter-spacing="2">FINISH</text>
          ${gates.map((g,i)=>`<path id="lgG${i}" d="M${(g.x-half).toFixed(1)} ${g.y.toFixed(1)}h${(half*2).toFixed(1)}" stroke="rgba(245,197,66,.55)" stroke-width="3" stroke-dasharray="4 4"/>${pole(g.x-half, g.y, `lgPa${i}`)}${pole(g.x+half, g.y, `lgPb${i}`)}`).join("")}</g>
        <g id="lgP">${lvMan(0, 0, kit.us, {ring:"#F5C542", run:true})}</g>${lvBallSvg("lgB", 150, 128, 4, false)}<rect width="300" height="180" fill="url(#lgVg)"/></svg>` + lgHud("0.0", "seconds"),
      `<div class="lv-row lv-lr"><button type="button" class="btn big" data-h="l">◀ Left</button><button type="button" class="btn big" data-h="r">Right ▶</button></div>`);
    const hold = {l:false, r:false}, fin = r => { off(); res(r); };
    const off = lgKeys(k=>{ if (k==="ArrowLeft"){ hold.l = true; return 1; } if (k==="ArrowRight"){ hold.r = true; return 1; } }, k=>{ if (k==="ArrowLeft") hold.l = false; if (k==="ArrowRight") hold.r = false; });
    lvSkippable(fin);
    lvEl.querySelectorAll("[data-h]").forEach(b=>lgHoldOn(b, on=>{ hold[b.dataset.h] = on; b.classList.toggle("on", on); }));
    const stage = lv$(".lv-stage");
    lgHoldOn(stage, on=>{ if (!on) hold.l = hold.r = false; });
    stage.addEventListener("pointerdown", ev=>{ const r = stage.getBoundingClientRect(); hold[ev.clientX < r.left + r.width/2 ? "l" : "r"] = true; });
    let x = 150, vx = 0, dist = 0, miss = 0, slow = 0, t0 = performance.now() + 600, last = t0, done = false;
    lvMove("#lgP", x, 140);
    lvLoop(now=>{
      if (done) return false;
      if (now<t0){ lvBallAt("#lgB", x + 2, 128, 1); return; }
      const dt = Math.min(.04, (now-last)/1000); last = now;
      const want = (hold.r ? 1 : 0) - (hold.l ? 1 : 0);
      vx += (want*170 - vx)*Math.min(1, dt*9); x += vx*dt;
      dist += v0*(now<slow ? .5 : 1)*dt;
      lv$("#lgC").setAttribute("transform", `translate(0 ${dist.toFixed(1)})`);
      lvMove("#lgP", x, 140, vx*.06); lvBallAt("#lgB", x + vx*.03, 128, 1, 0, dist*4);
      lgSetHud(((now - t0)/1000).toFixed(1));
      // each gate as you reach it: through it, into a pole, or round the outside
      gates.forEach((g,i)=>{ if (g.done || g.y + dist < 134) return; g.done = true;
        const d = Math.abs(x - g.x), hitPole = Math.abs(d - half) < 7;
        if (d < half - 6){ lv$(`#lgG${i}`)?.setAttribute("stroke", "#4ADE80"); lgPop("Through", true, x/3, 56); }
        else { miss++; slow = now + 450; lvBuzz("bad"); lv$(`#lgG${i}`)?.setAttribute("stroke", "#FB923C"); lgPop(hitPole ? "Hit the pole" : "Missed the gate", false, x/3, 56);
          if (hitPole) lv$(`#lgP${x<g.x ? "a" : "b"}${i}`)?.setAttribute("transform", `translate(${(x<g.x ? g.x-half : g.x+half).toFixed(1)} ${g.y.toFixed(1)}) rotate(${x<g.x ? -70 : 70})`); } });
      if (x<50 || x>250){ end(false, "out"); return false; }
      if (miss>lives){ end(false, "gates"); return false; }
      if (dist>=L + 120){ end(true); return false; }
    });
    const end = (ok, why) => {
      done = true; cancelAnimationFrame(lvRaf); const t = ((performance.now() - t0)/1000).toFixed(1);
      fin(ok ? {ok:true, big:`${t}s`, small:miss ? `${miss} gate missed` : "Clean round", score:`${gates.length - miss} of ${gates.length} gates`}
        : {ok:false, big:why==="out" ? "Out of play" : "Too many misses", small:why==="out" ? "Stay inside the lines" : lives ? `Only ${lives} miss${lives===1 ? "" : "es"} allowed` : "No misses allowed on hard"});
    };
  });
}
lgAdd({id:"slalom", t:"Dribble slalom", d:"Steer through the gates down the pitch to the finish line.", ic:"cones", run:lgSlalom},
  {t:"Dribble slalom", steps:["You run up the pitch with the ball, through a line of gates that swing from side to side.", "<b>Hold</b> ◀ Left or Right ▶ (or that side of the pitch, or the arrow keys) to steer through each one.",
    "Hit a pole or go round a gate and you slow down. Two misses allowed on easy, one on normal, none on hard. Stay inside the lines."]});

/* ---------- 7. Volley: hit it as it drops through the strike zone ---------- */
function lgVolley(st){
  const kit = lvKits(st), e = st.lab.ease, w = clamp(10*(1 + e*1.3), 6, 14), H = 18; let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const from = Math.random()<.5 ? 40 : 260, fall = clamp(1250*(1 + e*.4) - k*110, 850, 1600);
    lgShow(st, "Volley", `Go ${k+1} of 3. Strike it as it drops through the gold ring.`,
      lvGoalSvg(kit.them, null, false, {extra:`<g transform="translate(150 ${166 - H})"><circle r="${(7 + w).toFixed(1)}" fill="none" stroke="#F5C542" stroke-width="2.4" stroke-dasharray="4 3"/><circle r="2" fill="#F5C542"/></g>`}) + lgHud(got, "goals"),
      `<button type="button" class="btn primary big lv-act">Volley!</button>`);
    const fin = r => res(r); lvSkippable(fin);
    const t0 = performance.now() + 400; let z = 120, done = false, kx = 150;
    // the ball drops in from the side: high, then falling faster and faster to the ground
    const at = t => { const k = clamp((t - t0)/fall, 0, 1.25); return [from + (150 - from)*Math.min(1, k), 120*(1 - k*k)]; };
    lvLoop(now=>{ if (done) return false; const [x, zz] = at(now); z = zz; lvBallAt("#lvBall", x, 166, 1, Math.max(0, z), now*.5, now>t0); if (z<-4){ go(true); return false; } });
    const go = async late => {
      if (done) return; done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      const d = late ? 99 : z - H, q = clamp(1 - Math.abs(d)/w, 0, 1), on = Math.abs(d)<=w;
      const col = pick(["l","r"]), tx = on ? (col==="l" ? 60 : 240) + Math.random()*20 - 10 : 150 + Math.random()*120 - 60, ty = !on && d>0 ? -14 : on ? 40 + (1-q)*50 : 100;
      const save = on ? .12 + (1-q)*.55 : 1, goal = on && Math.random()>save, kcol = goal ? (col==="l" ? "r" : "l") : col;
      const [kx2, ky, rot] = lvKeeperTo(tx, ty, goal ? "wrong" : on ? "save" : "wrong", kcol);
      await Promise.all([lvFly("#lvBall", [150, 166 - Math.max(0, z)], [tx, ty], on ? 360 : 520, {s0:1, s1:.6, spin:2, curve:(col==="l" ? -1 : 1)*8}),
        on ? lvTween(300, kk=>{ const qq = lvEaseOut(kk); lvMove("#lvKp", 150 + (kx2-150)*qq, 84 + (ky-84)*qq, rot*qq); }) : null]);
      if (goal){ got++; lgSetHud(got); lvRipple(tx, ty); }
      fin(goal ? {ok:true, big:"Goal!", small:q>.7 ? "Caught it perfectly" : "Bundled in"} : {ok:false, big:on ? "Saved" : d>0 ? "Skied it" : "Scuffed it", small:on ? "Not clean enough" : d>0 ? "Too early: wait for it to drop" : "Too late: it was nearly on the ground"});
    };
    lvTap(lv$(".lv-act"), ()=>go(false)); lvTap(lv$(".lv-stage"), ()=>go(false)); lvKey = k=>{ if (k==="go") go(false); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "Sweetly struck" : "Keep your eye on it", score:`${got} volley${got===1 ? "" : "s"} scored`};
  })();
}
lgAdd({id:"volley", t:"Volley", d:"A dropping ball: hit it as it falls through the strike ring.", ic:"volley", run:lgVolley},
  {t:"Volley", steps:["A high ball drops towards you, falling faster as it comes.", "Tap <b>Volley!</b> as the ball passes through the <b>gold ring</b>.",
    "Too early and you sky it; too late and you scuff it. Three goes."]});

/* ---------- 8. Through ball: play it into space for the runner ---------- */
function lgThrough(st){
  const kit = lvKits(st), e = st.lab.ease; let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const x0 = 100 + Math.random()*100, dx = (x0<150 ? 1 : -1)*(25 + Math.random()*30), vs = clamp(62*(1 - e*.6) + k*5, 46, 90), slack = clamp(18*(1 + e*1.2), 11, 26), vb = 270;
    // his run: from the defenders' line towards the box, easing up once he's there
    const run = t => { const L = Math.hypot(dx, 70), k2 = Math.min(1, Math.max(0, t)/1000*vs/L); return [x0 + dx*k2, 100 - 70*k2]; };
    lgShow(st, "Through ball", `Go ${k+1} of 3. Tap where to play it: into space, so he runs on to it before the defenders.`,
      lvField("top", `<path d="M${x0.toFixed(1)} 96L${(x0+dx).toFixed(1)} 30" stroke="#FFE9A8" stroke-width="2" stroke-dasharray="5 5" opacity=".7"/><path d="M50 100h200" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 5"/>
        <g id="lgR">${lvMan(0, 0, kit.us, {num:9, run:true})}</g><g id="lgD1">${lvMan(0, 0, kit.them, {run:true})}</g><g id="lgD2">${lvMan(0, 0, kit.them, {run:true})}</g>
        ${lvMan(150, 168, kit.us, {ring:"#F5C542"})}${lvBallSvg("lgB", 150, 156, 4)}<circle id="lgT" r="9" fill="none" stroke="#F5C542" stroke-width="2.2" opacity="0"/>`)
        + `<div class="lg-aimpad"></div>` + lgHud(got, "assists"), `<div class="lv-timer"><span></span></div>`);
    const fin = r => res(r); lvSkippable(fin);
    const stage = lv$(".lv-stage"), t0 = performance.now() + 800, wait = 3200; let done = false;
    // the defenders turn a moment late and chase him, a little slower
    const def = (i, t) => { const d0 = [x0 + (i ? 34 : -34), 100], [rx, ry] = run(t - 300), tx = rx + (i ? 9 : -9), ty = ry + 5, far = Math.hypot(tx - d0[0], ty - d0[1]) || 1, go = clamp((t - 300)/1000*vs*.86/far, 0, 1); return [d0[0] + (tx - d0[0])*go, d0[1] + (ty - d0[1])*go]; };
    const draw = t => { const [rx, ry] = run(t); lvMove("#lgR", rx, ry); [0,1].forEach(i=>{ const [x, y] = def(i, t); lvMove(`#lgD${i+1}`, x, y); }); };
    draw(0);
    lvLoop(now=>{ if (done) return false; const t = now - t0; draw(t); lgSetTimer(1 - Math.max(0, t)/wait); if (t>wait){ pass(null); return false; } });
    const pass = async (T) => {
      if (done) return; done = true; cancelAnimationFrame(lvRaf);
      if (!T) return fin({ok:false, big:"Too late", small:"He was caught offside waiting"});
      const t = performance.now() - t0, tf = Math.hypot(T[0]-150, T[1]-156)/vb*1000, ta = t + tf;
      lv$("#lgT").setAttribute("cx", T[0]); lv$("#lgT").setAttribute("cy", T[1]); lv$("#lgT").setAttribute("opacity", 1);
      const [rx, ry] = run(ta), dR = Math.hypot(rx - T[0], ry - T[1]), dD = Math.min(...[0,1].map(i=>{ const [x, y] = def(i, ta); return Math.hypot(x - T[0], y - T[1]); }));
      const ok = dR <= slack && dD > dR + 4 && T[1] < 96;
      const tStart = performance.now(); lvKick();
      await Promise.all([lvFly("#lgB", [150, 156], T, tf, {spin:1.2, ease:k2=>k2, h:Math.min(10, tf/60)}), lvTween(tf, ()=>draw(t + performance.now() - tStart))]);
      if (!ok) return fin({ok:false, big:dD <= dR + 4 ? "Cut out" : "Wasted", small:dD <= dR + 4 ? "A defender got there first" : T[1] >= 96 ? "Play it beyond the defenders" : dR > slack*2 ? "Nowhere near him" : "Not quite in his stride"});
      got++; lgSetHud(got);
      await lvFly("#lgB", T, [140 + Math.random()*20, 2], 300, {spin:2, s1:.8}); lvRipple?.(150, 2);
      fin({ok:true, big:"Assist!", small:dR < slack*.5 ? "Perfectly weighted" : "Into his stride and finished"});
    };
    lv$(".lg-aimpad").addEventListener("pointerdown", ev=>{ const r = stage.getBoundingClientRect(); pass([clamp((ev.clientX - r.left)/r.width*300, 20, 280), clamp((ev.clientY - r.top)/r.height*180, 10, 150)]); });
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "A proper playmaker" : "Lead him a bit more", score:`${got} assist${got===1 ? "" : "s"}`};
  })();
}
lgAdd({id:"through", t:"Through ball", d:"Thread it into space for the striker's run, ahead of the defenders.", ic:"pass", run:lgThrough},
  {t:"Through ball", steps:["Your striker (the 9) is about to run in behind. The dotted line shows his run.", "<b>Tap the pitch</b> where you want the ball to go: into space ahead of him, so he runs on to it.",
    "Too short and the defenders cut it out; too long and it runs away from him. Don't wait too long either."]});

/* ---------- 9. Switch of play: hold to pick how far, land it in the winger's stride ---------- */
function lgSwitch(st){
  const kit = lvKits(st), e = st.lab.ease, R = clamp(16*(1 + e*1.3), 10, 23); let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const vw = clamp(36*(1 - e*.6) + Math.random()*10 + k*3, 26, 58), tf = 650, y0 = 168, charge = 1300;
    lgShow(st, "Switch the play", `Go ${k+1} of 3. Hold Pass: the marker climbs the far touchline. Let go so the ball lands in the winger's stride.`,
      lvField("none", `<path d="M262 12V170" stroke="rgba(255,255,255,.22)" stroke-width="10"/><g id="lgW">${lvMan(0, 0, kit.us, {num:11, run:true})}</g>
        ${lvMan(46, 140, kit.us, {ring:"#F5C542"})}${lvBallSvg("lgB", 54, 136, 4)}<g id="lgM" opacity="0"><circle r="${R}" fill="rgba(245,197,66,.18)" stroke="#F5C542" stroke-width="2" stroke-dasharray="4 3"/><circle r="2.5" fill="#F5C542"/></g>`) + lgHud(got, "switches"),
      `<button type="button" class="btn primary big lv-act">Hold to pass</button>`);
    const fin = r => { off(); res(r); }, off = lgKeys(k2=>{ if (k2===" " || k2==="Enter"){ press(true); return 1; } }, k2=>{ if (k2===" " || k2==="Enter") press(false); });
    lvSkippable(fin);
    const t0 = performance.now() + 500; let done = false, pressAt = 0, ly = y0;
    const wy = t => clamp(y0 - Math.max(0, t - t0)/1000*vw, 4, y0);
    lvMove("#lgW", 262, y0);
    lvLoop(now=>{
      if (done) return false;
      lvMove("#lgW", 262, wy(now));
      if (pressAt){ ly = y0 - 168*Math.min(1, (now - pressAt)/charge); const m = lv$("#lgM"); m.setAttribute("opacity", 1); m.setAttribute("transform", `translate(262 ${ly.toFixed(1)})`); }
      if (wy(now)<=8 && !pressAt){ end(null); return false; }
    });
    const press = on => { if (done) return; if (on && !pressAt){ pressAt = performance.now(); lv$(".lv-act").textContent = "Let go to pass"; } else if (!on && pressAt) end(ly); };
    const end = async y => {
      if (done) return; done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      if (y==null) return fin({ok:false, big:"Too late", small:"He ran out of pitch"});
      const land = performance.now() + tf, at = wy(land), d = Math.abs(at - y);
      await Promise.all([lvFly("#lgB", [54, 136], [262, y], tf, {h:46, spin:1.2, ease:k2=>k2}), lvTween(tf, kk=>lvMove("#lgW", 262, wy(performance.now())))]);
      const ok = d <= R;
      if (ok){ got++; lgSetHud(got); }
      fin(ok ? {ok:true, big:d<R*.4 ? "Perfect switch" : "Found him", small:"Right into his stride"} : {ok:false, big:"Wasted", small:at<y ? "Behind him: lead him more" : "Too far ahead of him"});
    };
    lgHoldOn(lv$(".lv-act"), press); lgHoldOn(lv$(".lv-stage"), press);
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "Raking passes" : "Lead him into space", score:`${got} switch${got===1 ? "" : "es"} found`};
  })();
}
lgAdd({id:"switch", t:"Switch the play", d:"Hold to pick how far, then land a raking pass in the winger's stride.", ic:"switch", run:lgSwitch},
  {t:"Switch the play", steps:["Your winger (the 11) sprints up the far touchline.", "<b>Hold</b> Pass (or the pitch, or space): a gold marker climbs his touchline. <b>Let go</b> to hit it there.",
    "The ball takes a moment in the air, so aim ahead of him: land it right in his stride. Three goes."]});

/* ---------- 10. One-two: pass, then go while he's watching the ball ---------- */
function lgOneTwo(st){
  const kit = lvKits(st), e = st.lab.ease; let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const lookBall = clamp(.55 + e*.6 - k*.05, .3, .75), limit = clamp(2600*(1 + e*.5), 1800, 3300);
    lgShow(st, "One-two", `Go ${k+1} of 3. Pass to your teammate, then go the moment the defender turns to watch the ball.`,
      lvField("top", `<path id="lgEye" d="M0 0" fill="rgba(245,197,66,.28)" stroke="#F5C542" stroke-width="1"/><g id="lgDf">${lvMan(0, 0, kit.them)}</g><g id="lgMt">${lvMan(0, 0, kit.us, {num:8})}</g>
        <g id="lgMe">${lvMan(0, 0, kit.us, {ring:"#F5C542"})}</g>${lvBallSvg("lgB", 154, 146, 4)}`) + lgHud(got, "one-twos"),
      `${lgTimerHTML}<button type="button" class="btn primary big lv-act">Pass</button>`);
    const fin = r => res(r); lvSkippable(fin);
    lvMove("#lgDf", 150, 102); lvMove("#lgMt", 228, 120); lvMove("#lgMe", 150, 150);
    const eye = to => { const [x, y] = to==="ball" ? [228, 120] : [150, 150], a = Math.atan2(y - 74, x - 150), r = 46, s = .38;
      lv$("#lgEye").setAttribute("d", `M150 74L${(150 + r*Math.cos(a - s)).toFixed(1)} ${(74 + r*Math.sin(a - s)).toFixed(1)}A${r} ${r} 0 0 1 ${(150 + r*Math.cos(a + s)).toFixed(1)} ${(74 + r*Math.sin(a + s)).toFixed(1)}z`); };
    eye("me");
    let step = 0, looking = "me", next = 0, at = 0, done = false;
    lvLoop(now=>{
      if (done || step!==1) return !done;
      if (now>=next){ looking = Math.random()<lookBall ? "ball" : "me"; eye(looking); next = now + 380 + Math.random()*520; }
      lgSetTimer(1 - (now - at)/limit);
      if (now - at > limit){ end(false, "Too slow: the pass was closed down"); return false; }
    });
    const act = lv$(".lv-act");
    const go = async () => {
      if (done) return;
      if (step===0){ step = 2; act.disabled = true; await lvFly("#lgB", [154, 146], [224, 124], 300, {spin:1}); step = 1; at = performance.now(); next = at + 300; act.disabled = false; act.textContent = "Go!"; return; }
      if (step!==1) return;
      end(looking==="ball", looking==="ball" ? "" : "He was watching you");
    };
    const end = async (ok, why) => {
      done = true; cancelAnimationFrame(lvRaf); act.disabled = true; lv$("#lgMe .lv-legs")?.classList.add("run");
      if (ok){ await lvTween(420, kk=>{ const q = lvEaseOut(kk); lvMove("#lgMe", 150 + 22*q, 150 - 96*q); }); await lvFly("#lgB", [224, 124], [176, 58], 280, {spin:1});
        got++; lgSetHud(got); return fin({ok:true, big:"One-two!", small:"Round him and through"}); }
      await lvTween(320, kk=>{ const q = lvEaseOut(kk); lvMove("#lgMe", 150 + 10*q, 150 - 40*q); lvMove("#lgDf", 150 + 18*q, 102 + 10*q); });
      fin({ok:false, big:"Blocked off", small:why});
    };
    lvTap(act, go); lvKey = k2=>{ if (k2==="go") go(); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "Give and go" : "Wait for him to turn his head", score:`${got} one-two${got===1 ? "" : "s"}`};
  })();
}
lgAdd({id:"onetwo", t:"One-two", d:"Lay it off, then go the moment the defender turns his head to the ball.", ic:"onetwo", run:lgOneTwo},
  {t:"One-two", steps:["Tap <b>Pass</b> to lay it off to your teammate.", "The defender's gold cone shows where he's looking. Tap <b>Go!</b> when he's watching the <b>ball</b>, not you, and the return's yours.",
    "Go while he's watching you and he blocks your run. Wait too long and the chance is gone."]});

/* ---------- 11. Bicycle kick: jump as the cross comes, then kick it overhead ---------- */
function lgBicycle(st){
  const kit = lvKits(st), e = st.lab.ease, gk = lgKeeperKit(kit), tol1 = clamp(.11*(1 + e*1.2), .07, .15), tol2 = clamp(.075*(1 + e*1.2), .045, .11);
  // the cross, from the right, dropping through where your foot will be once you're upside down
  const A = [298, 100], C = [222, -8], B = [144.3, 126.6], U1 = .72, U2 = .92, STAND = [150, 152], AIR = [152, 124], LIE = [148, 151];
  const P = u => { const q = 1 - u; return [q*q*A[0] + 2*q*u*C[0] + u*u*B[0], q*q*A[1] + 2*q*u*C[1] + u*u*B[1]]; }, mix = (a, b, k) => a + (b - a)*k;
  let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const per = clamp(1450*(1 + e*.4) - k*110, 1000, 1800), [j1x, j1y] = P(U1), [j2x, j2y] = P(U2);
    lgShow(st, "Bicycle kick", `Go ${k+1} of 3. Tap to jump as the ball reaches the big ring, then again to kick as it hits the small one.`,
      lgSide(`${lgSideGoal()}<g id="lgK">${lvMan(0, 0, gk, {s:1.3})}</g>
        <circle cx="${j1x.toFixed(1)}" cy="${j1y.toFixed(1)}" r="13" fill="none" stroke="#F5C542" stroke-width="2.4" stroke-dasharray="5 4"/>
        <circle id="lgK2" cx="${j2x.toFixed(1)}" cy="${j2y.toFixed(1)}" r="8" fill="none" stroke="#4ADE80" stroke-width="2.4" opacity=".35"/>
        <ellipse id="lgSh" cx="150" cy="171" rx="15" ry="3" fill="rgba(0,0,0,.35)"/><g id="lgMe">${lvMan(0, 18, kit.us, {s:1.5, you:true, noShadow:true})}</g>${lvBallSvg("lgB", 298, 170, 5)}`) + lgHud(got, "goals"),
      `<button type="button" class="btn primary big lv-act">Jump!</button>`);
    let u = 0, jumpAt = 0, kickAt = 0, q1 = 0, shot = null, verdict = null, endAt = 0, left = false;
    const fin = r => { left = true; res(r); }; lvSkippable(fin);
    lvMove("#lgK", 56, 170); lvMove("#lgMe", ...STAND);
    const t0 = performance.now() + 500;
    // you: up and tipping back after the jump, the kick snapping your legs over, then down on your back
    const pose = now => {
      if (!jumpAt) return [...STAND, 0];
      const a = lvEaseOut(clamp((now - jumpAt)/260, 0, 1)), down = clamp((now - Math.max(jumpAt + 540, kickAt ? kickAt + 170 : 0))/340, 0, 1);
      let r = -112*a - 14*clamp((now - jumpAt - 260)/280, 0, 1);
      if (kickAt) r = mix(r, -178, lvEaseOut(clamp((now - kickAt)/120, 0, 1)));
      return [mix(mix(STAND[0], AIR[0], a), LIE[0], down), mix(mix(STAND[1], AIR[1], a), LIE[1], lvEaseInOut(down)), mix(r, -90, lvEaseInOut(down))];
    };
    lvLoop(now=>{
      const [mx, my, mr] = pose(now); lvMove("#lgMe", mx, my, mr); lv$("#lgSh")?.setAttribute("rx", (15 - (STAND[1] - my)*.22).toFixed(1));
      if (shot){
        const k2 = clamp((now - shot.at)/380, 0, 1), q = lvEaseOut(k2), kq = lvEaseOut(clamp((now - shot.at - 50)/280, 0, 1));
        lvBallAt("#lgB", mix(shot.from[0], shot.to[0], q), 170, 1, 170 - mix(shot.from[1], shot.to[1], q), now*1.1, k2<1);
        lvMove("#lgK", mix(56, shot.k[0], kq), mix(170, shot.k[1], kq), shot.k[2]*kq);
        if (k2>=1 && !endAt){ endAt = now + 700; if (shot.goal) lgImpact(shot.to[0] + 4, shot.to[1]); }
      } else if (now>=t0){
        u = (now - t0)/per; const [x, y] = P(u);
        lvBallAt("#lgB", x, 170, 1, Math.max(0, 170 - y), u*700, true);
        if (!endAt && u>U2 && y>=166){ endAt = now + 500; verdict ||= {ok:false, big:"Missed it", small:jumpAt ? "Your foot never found it" : "You didn't jump"}; }
      }
      if (endAt && now>=endAt){ fin(verdict); return false; }
    });
    const tap = () => {
      const now = performance.now(); if (left || now<t0 || endAt || shot) return;
      if (!jumpAt){ jumpAt = now; const d = Math.abs(u - U1); q1 = Math.max(0, 1 - d/tol1);
        if (d>tol1) verdict = {ok:false, big:"Air shot", small:u<U1 ? "Jumped too early" : "Jumped too late"};
        lv$(".lv-act").textContent = "Kick!"; lv$("#lgK2").setAttribute("opacity", 1); return; }
      if (kickAt) return; kickAt = now; lv$(".lv-act").disabled = true;
      const d = Math.abs(u - U2);
      if (verdict) return;
      if (d>tol2){ verdict = {ok:false, big:"Air shot", small:u<U2 ? "Swung too early" : "Swung too late"}; return; }
      // the cleaner both taps, the harder it is for him
      const q = (q1 + 1 - d/tol2)/2, goal = Math.random() > .12 + (1 - q)*.6, ty = 124 + Math.random()*34;
      shot = {from:P(u), at:now, goal, to:goal ? [14, ty] : [74, ty], k:goal ? [46, 172, -48] : [56, clamp(ty + 20, 140, 170), 0]};
      if (goal){ got++; lgSetHud(got); }
      verdict = goal ? {ok:true, big:"Overhead goal!", small:q>.7 ? "Spectacular" : "It went in, that's what counts"} : {ok:false, big:"Saved", small:"Great effort, better save"};
    };
    lvTap(lv$(".lv-act"), tap); lvTap(lv$(".lv-stage"), tap); lvKey = k2=>{ if (k2==="go") tap(); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=1, big:`${got} of 3`, small:got ? "Highlight reel" : "Harder than it looks", score:`${got} overhead goal${got===1 ? "" : "s"}`};
  })();
}
lgAdd({id:"bicycle", t:"Bicycle kick", d:"Two taps: jump as the cross arrives, then kick it over your head.", ic:"bike", run:lgBicycle},
  {t:"Bicycle kick", steps:["A cross loops in from the right, with your back to goal.", "Tap <b>Jump!</b> as the ball reaches the <b>big gold ring</b>: you go up and tip over backwards.",
    "Then tap <b>Kick!</b> as it hits the <b>small green ring</b>. The cleaner both taps, the better the strike."]});

/* ---------- 12. Chip the keeper: hold for height, let go in his window ---------- */
function lgChip(st){
  const kit = lvKits(st), e = st.lab.ease, w = clamp(.17*(1 + e*1.2), .1, .24); let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const rush = clamp(2300*(1 + e*.4) - k*160, 1500, 2900), charge = 1100;
    lgShow(st, "Chip the keeper", `Go ${k+1} of 3. He's rushing out. Hold to lift it; let go with the bar in the green.`,
      lvGoalSvg(kit.them, null, false) + lgHud(got, "chips"),
      `<div class="lv-bar lg-chipbar" aria-hidden="true"><span class="lv-zone"></span><span class="lg-fill"></span></div><button type="button" class="btn primary big lv-act">Hold to chip</button>`);
    const fin = r => { off(); res(r); }, off = lgKeys(k2=>{ if (k2===" " || k2==="Enter"){ press(true); return 1; } }, k2=>{ if (k2===" " || k2==="Enter") press(false); });
    lvSkippable(fin);
    const zone = lv$(".lg-chipbar .lv-zone"), fill = lv$(".lg-chipbar .lg-fill"), t0 = performance.now() + 400; let a = 0, p = 0, pressAt = 0, done = false;
    // the further he's come, the more height it needs
    const centre = () => .3 + .42*a;
    lvLoop(now=>{
      if (done) return false;
      a = clamp((now - t0)/rush, 0, 1); lvMove("#lvKp", 150, 84 + 20*a, 0, 1 + .32*a);
      zone.style.left = ((centre() - w/2)*100).toFixed(1) + "%"; zone.style.width = (w*100).toFixed(1) + "%";
      if (pressAt){ p = Math.min(1, (now - pressAt)/charge); fill.style.transform = `scaleX(${p.toFixed(3)})`; lv$(".lg-chipbar").classList.toggle("in", Math.abs(p - centre())<=w/2); }
      if (a>=1){ end(true); return false; }
    });
    const press = on => { if (done) return; if (on && !pressAt){ pressAt = performance.now(); lv$(".lv-act").textContent = "Let go to chip"; } else if (!on && pressAt) end(false); };
    const end = async smothered => {
      if (done) return; done = true; cancelAnimationFrame(lvRaf); lv$(".lv-act").disabled = true;
      if (smothered && !pressAt) return fin({ok:false, big:"Smothered", small:"He got to you first"});
      const c = centre(), d = p - c, ok = Math.abs(d)<=w/2, low = d < -w/2, kx = 150, ky = 84 + 20*a;
      const tx = 150 + Math.random()*60 - 30, ty = ok ? 66 + Math.random()*20 : low ? ky - 30 : -14;
      await lvStrike(st);
      await lvFly("#lvBall", [150, 166], [tx, ty], 620, {s0:1, s1:.6, h:40 + 70*p, spin:.8});
      if (ok){ got++; lgSetHud(got); lvRipple(tx, ty); return fin({ok:true, big:"Chipped!", small:Math.abs(d)<w/5 ? "Delicate" : "Just over him"}); }
      fin({ok:false, big:low ? "Caught" : "Over the bar", small:low ? "Not enough height: he plucked it out of the air" : "Too much: it cleared the bar too"});
    };
    lgHoldOn(lv$(".lv-act"), press); lgHoldOn(lv$(".lv-stage"), press);
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "Cheeky" : "Watch the green move", score:`${got} chip${got===1 ? "" : "s"} scored`};
  })();
}
lgAdd({id:"chip", t:"Chip the keeper", d:"The keeper rushes out: hold to lift it, and let go with the power in his window.", ic:"chip", run:lgChip},
  {t:"Chip the keeper", steps:["You're through and the keeper rushes off his line.", "<b>Hold</b> Chip (or the pitch, or space): the bar fills. <b>Let go</b> while it's in the <b>green</b>.",
    "The green moves as he comes: the closer he gets, the more height you need. Wait too long and he smothers it."]});

/* ---------- 13. Skill combo: remember the moves, then do them ---------- */
function lgSkills(st){
  const kit = lvKits(st), e = st.lab.ease, base = e>0 ? 2 : e<0 ? 4 : 3, ARW = {l:"◀", u:"▲", d:"▼", r:"▶"}; let beat = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${beat} of 3`;
    const n = base + k, seq = [...Array(n)].map(()=>pick(["l","u","d","r"])), show = clamp((650 + 600*n)*(1 + e*.8), 1600, 5600);
    lgShow(st, "Skill combo", `Defender ${k+1} of 3. Watch the moves, then do them in order.`,
      lvField("top", `<g id="lgDf">${lvMan(0, 0, kit.them)}</g><g id="lgMe">${lvMan(0, 0, kit.us, {ring:"#F5C542"})}</g>${lvBallSvg("lgB", 154, 146, 4)}`)
        + `<div class="lg-seq">${seq.map(d=>`<i data-d="${d}">${ARW[d]}</i>`).join("")}</div><div class="lg-seqbar"><span style="animation-duration:${show}ms"></span></div>` + lgHud(beat, "beaten"),
      `<div class="lg-pad">${["l","u","d","r"].map(d=>`<button type="button" class="btn big" data-m="${d}" disabled>${ARW[d]}</button>`).join("")}</div>`);
    const fin = r => { off(); res(r); }, off = lgKeys(key=>{ const d = {ArrowLeft:"l", ArrowUp:"u", ArrowDown:"d", ArrowRight:"r"}[key]; if (d){ input(d); return 1; } });
    lvSkippable(fin);
    lvMove("#lgDf", 150, 96); lvMove("#lgMe", 150, 150);
    const slots = [...lvEl.querySelectorAll(".lg-seq i")], pads = [...lvEl.querySelectorAll("[data-m]")];
    let i = 0, ready = false, done = false;
    const t = setTimeout(()=>{ if (done) return; slots.forEach(s=>{ s.textContent = "?"; s.classList.add("hid"); }); slots[0].classList.add("cur"); lv$(".lg-seqbar")?.remove(); pads.forEach(b=>{ b.disabled = false; }); ready = true; }, show);
    const input = async d => {
      if (!ready || done) return;
      const ok = d===seq[i], s = slots[i];
      s.textContent = ARW[d]; s.classList.remove("hid", "cur"); s.classList.add(ok ? "ok" : "bad"); if (ok) slots[i+1]?.classList.add("cur");
      if (!ok){ done = true; clearTimeout(t); pads.forEach(b=>{ b.disabled = true; });
        await lvTween(260, kk=>{ const q = lvEaseOut(kk); lvMove("#lgDf", 150, 96 + 40*q); lvBallAt("#lgB", 154 + 40*q, 146 + 6*q, 1, 6*Math.sin(Math.PI*kk), kk*300); });
        return fin({ok:false, big:"Tackled", small:`Move ${i+1} should have been ${ARW[seq[i]]}`}); }
      // a little feint each time you get one right
      const dx = {l:-10, r:10, u:0, d:0}[d], dy = {u:-6, d:6, l:0, r:0}[d];
      lvTween(140, kk=>{ const q = Math.sin(Math.PI*kk); lvMove("#lgMe", 150 + dx*q, 150 + dy*q); lvBallAt("#lgB", 154 + dx*q*1.2, 146 + dy*q, 1, 0, kk*200); });
      if (++i===seq.length){ done = true; pads.forEach(b=>{ b.disabled = true; }); beat++; lgSetHud(beat);
        lv$("#lgMe .lv-legs")?.classList.add("run");
        await lvTween(380, kk=>{ const q = lvEaseOut(kk); const side = seq[seq.length-1]==="l" ? -1 : 1; lvMove("#lgMe", 150 + side*40*Math.sin(Math.PI*q), 150 - 110*q); lvBallAt("#lgB", 154 + side*44*Math.sin(Math.PI*q), 146 - 114*q, 1, 0, kk*500); });
        fin({ok:true, big:"Skinned him!", small:`${seq.length} moves, perfect`}); }
    };
    pads.forEach(b=>lvTap(b, ()=>input(b.dataset.m)));
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${beat} of 3`; await lgFlash(r.ok, r.big, r.small); if (!r.ok) break; }
    return {ok:beat===3, big:beat===3 ? "Beat all three" : `${beat} beaten`, small:beat===3 ? "Showboat" : "Watch the sequence closely", score:`${beat} of 3 defenders`};
  })();
}
lgAdd({id:"skills", t:"Skill combo", d:"Memorise the sequence of moves, then do it to beat your man. Three defenders.", ic:"arrows", run:lgSkills},
  {t:"Skill combo", steps:["A sequence of moves flashes up over the pitch: arrows like ◀ ▲ ▼ ▶.", "When they hide, do them <b>in the same order</b> with the arrow buttons (or the arrow keys).",
    "Get one wrong and he takes it off you. Each defender's sequence is one move longer."]});

/* ---------- 14. Race to the ball: stride on the beat ---------- */
function lgRace(st){
  const kit = lvKits(st), e = st.lab.ease, beat = 520, win = clamp(140*(1 + e*1.2), 90, 190), vd = 64*(1 - e*.3);
  return new Promise(res=>{
    lgShow(st, "Race to the ball", "A loose ball and a defender after it. Tap on the beat, as the ring closes on the dot, to stride faster.",
      lgSide(`${lvBallSvg("lgB", 150, 166, 5)}<g id="lgDf">${lvMan(0, 0, kit.them, {run:true, s:1.4})}</g><g id="lgMe">${lvMan(0, 0, kit.us, {you:true, mark:true, run:true, s:1.4})}</g>`)
        + `<div class="lg-beat" aria-hidden="true"><span class="lg-beat-r"></span><span class="lg-beat-c"></span></div>`,
      `<button type="button" class="btn primary big lv-act">Stride!</button>`);
    let done = false;
    const fin = r => { done = true; res(r); }; lvSkippable(fin);
    const ring = lv$(".lg-beat-r"), beatEl = lv$(".lg-beat"), t0 = performance.now() + 700; let me = 30, df = 42, v = 48, bx = 150, vb = 74, last = t0, lastTap = 0;
    const draw = () => { lvMove("#lgDf", df, 160); lvMove("#lgMe", me, 170); lvBallAt("#lgB", bx, 166, 1, 0, bx*6); };
    draw();
    lvLoop(now=>{
      if (done) return false;
      // the ring closes on the dot on every beat
      const ph = (((now - t0) % beat) + beat) % beat/beat; ring.style.transform = `translate(-50%,-50%) scale(${(2.6 - 1.6*ph).toFixed(3)})`; ring.style.opacity = (.3 + .7*ph).toFixed(2);
      if (now<t0) return;
      const dt = Math.min(.04, (now - last)/1000); last = now;
      v += (44 - v)*dt*1.1; me += v*dt; df += vd*dt; vb = Math.max(0, vb - 24*dt); bx += vb*dt;
      draw();
      if (me>=bx - 8 || df>=bx - 8){ end(me>=bx - 8); return false; }
    });
    const tap = () => {
      if (done) return; const now = performance.now(); if (now<t0 - 120 || now - lastTap < 150) return; lastTap = now;
      const ph = (((now - t0) % beat) + beat) % beat, off = Math.min(ph, beat - ph), x = clamp(me/3, 12, 88);
      if (off<=win/2){ const perfect = off<win/5; v = Math.min(150, v + (perfect ? 36 : 28)); lgPop(perfect ? "Perfect" : "Good", true, x, 48);
        beatEl.classList.remove("hit"); void beatEl.offsetWidth; beatEl.classList.add("hit"); }
      else { v *= .62; lgPop("Stumble", false, x, 48); lvBuzz("bad"); }
    };
    const end = async won => {
      done = true; lv$(".lv-act").disabled = true;
      lvEl.querySelectorAll(".lv-legs.run").forEach(l=>l.classList.remove("run"));
      const gap = Math.round(Math.abs(me - df)/3);
      // whoever gets there first takes it on
      lvKick(won ? "#lgMe .lv-man" : "#lgDf .lv-man");
      await lvFly("#lgB", [bx, 166], [bx + 34, won ? 170 : 162], 380, {h:won ? 8 : 5, spin:1});
      res(won ? {ok:true, big:"First to it!", small:gap ? `By ${gap} yard${gap===1 ? "" : "s"}` : "By a whisker"} : {ok:false, big:"Beaten to it", small:"Stride on the beat"});
    };
    lvTap(lv$(".lv-act"), tap); lvTap(lv$(".lv-stage"), tap); lvKey = k=>{ if (k==="go") tap(); };
  });
}
lgAdd({id:"race", t:"Race to the ball", d:"A loose ball and a defender racing you for it: stride on the beat to get there first.", ic:"sprint", run:lgRace},
  {t:"Race to the ball", steps:["The ball's loose and a defender's racing you for it.", "Tap <b>Stride!</b> (or anywhere, or space) <b>on the beat</b>: as the ring closes on the dot. Each good stride makes you faster.",
    "Tap off the beat and you stumble. Stop tapping and you slow down."]});

/* ---------- 15. Offside trap: step up just before he plays it ---------- */
function lgOffside(st){
  const kit = lvKits(st), e = st.lab.ease, R = clamp(330*(1 + e*1.1), 220, 450), DX = [62, 121, 179, 238], LY = 118, UP = 22; let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    const tell = 1300 + Math.random()*1300, wind = clamp(520*(1 + e*.6), 400, 640), fake = e<0 && Math.random()<.4;
    const AX = [91 + Math.random()*8 - 4, 209 + Math.random()*8 - 4], aim = Math.random()<.5 ? 0 : 1;
    lgShow(st, "Offside trap", `Go ${k+1} of 3. Step up just before he plays the ball, and leave their strikers offside.`,
      lvField("bottom", `<path id="lgLn" d="M30 ${LY}h240" stroke="rgba(245,197,66,.55)" stroke-width="1.5" stroke-dasharray="6 5"/>
        <g id="lgPs">${lvMan(0, 0, kit.them)}</g>${lvBallSvg("lgB", 156, 42, 4)}
        <g id="lgBang" opacity="0"><circle cx="168" cy="12" r="7.5" fill="#F5C542" stroke="rgba(0,0,0,.4)"/><text x="168" y="16.6" text-anchor="middle" font-size="12.5" font-weight="900" fill="#1A1400" font-family="Big Shoulders Display,Impact,sans-serif">!</text></g>
        ${AX.map((x,i)=>`<g id="lgA${i}">${lvMan(0, 0, kit.them)}</g>`).join("")}${DX.map((x,i)=>`<g id="lgD${i}">${lvMan(0, 0, kit.us, i===1 ? {ring:"#F5C542"} : {})}</g>`).join("")}
        <g transform="translate(287 ${LY + 4})"><g class="lg-flag" id="lgFlag"><path d="M0 0V-30" stroke="#E5E7EB" stroke-width="1.8" stroke-linecap="round"/><path class="lg-cloth" d="M0-30h-13l3 5-3 5H0z" fill="#F5C542" stroke="rgba(0,0,0,.35)" stroke-width=".6"/></g></g>`) + lgHud(got, "caught"),
      `<button type="button" class="btn primary big lv-act">Step up!</button>`);
    let done = false;
    const fin = r => { done = true; res(r); }; lvSkippable(fin);
    lvMove("#lgPs", 150, 40); AX.forEach((x,i)=>lvMove(`#lgA${i}`, x, LY - 6)); DX.forEach((x,i)=>lvMove(`#lgD${i}`, x, LY));
    const t0 = performance.now(); let up = 0, strike = 0, tellAt = t0 + tell, faked = !fake;
    lvLoop(now=>{
      if (done) return false;
      if (up){ const y = LY - UP*lvEaseOut(clamp((now - up)/250, 0, 1)); DX.forEach((x,i)=>lvMove(`#lgD${i}`, x, y)); lv$("#lgLn").setAttribute("d", `M30 ${y.toFixed(1)}h240`); }
      // on hard he sometimes shapes to pass and doesn't
      if (!faked && now>=tellAt){ lv$("#lgBang").setAttribute("opacity", 1); if (now>=tellAt + 280){ faked = true; lv$("#lgBang").setAttribute("opacity", 0); tellAt = now + 700 + Math.random()*700; } return; }
      if (now>=tellAt) lv$("#lgBang").setAttribute("opacity", 1);
      if (!strike && now>=tellAt + wind){ strike = now; resolve(); return false; }
    });
    const resolve = async () => {
      lv$(".lv-act").disabled = true; lv$("#lgBang").setAttribute("opacity", 0);
      const early = up && strike - (up + 250) > R, late = !up || strike - up < 120, ok = up && !early && !late, sx = AX[aim], to = [sx + (aim ? -12 : 12), 150];
      // his pass over the top, and their striker going for it
      lvKick("#lgPs .lv-man"); lv$(`#lgA${aim} .lv-legs`)?.classList.add("run");
      await Promise.all([lvFly("#lgB", [156, 42], to, 560, {h:24, spin:1}), lvGlide(`#lgA${aim}`, [sx, LY - 6], [sx + (aim ? -6 : 6), 144], 560, lvEaseOut)]);
      if (done) return;
      if (ok){ got++; lgSetHud(got); lv$("#lgFlag").classList.add("up"); lv$(`#lgA${aim} .lv-legs`)?.classList.remove("run"); lgPop("Offside!", true, 50, 30);
        await lvWait(420); return fin({ok:true, big:"Offside!", small:"Flag's up"}); }
      await Promise.all([lvFly("#lgB", to, [150, 178], 400, {spin:1}), lvGlide(`#lgA${aim}`, [sx + (aim ? -6 : 6), 144], [156, 168], 400, k=>k)]);
      fin({ok:false, big:"Through on goal", small:!up ? "You didn't step up" : early ? "Too early: they checked their runs" : "Too late: they were onside"});
    };
    const go = () => { if (done || up || strike) return; up = performance.now(); lv$(".lv-act").textContent = "Line's up"; lvEl.querySelectorAll('[id^="lgD"] .lv-legs').forEach(l=>{ l.classList.add("run"); setTimeout(()=>l.classList.remove("run"), 260); }); };
    lvTap(lv$(".lv-act"), go); lvTap(lv$(".lv-stage"), go); lvKey = k2=>{ if (k2==="go") go(); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "Well drilled" : "Watch for his wind-up", score:`${got} caught offside`};
  })();
}
lgAdd({id:"offside", t:"Offside trap", d:"Lead your back four up just before he plays it, and leave their strikers stranded.", ic:"flag", run:lgOffside},
  {t:"Offside trap", steps:["You run the back four. Their midfielder has the ball; their strikers lurk on your line.", "When he winds up to pass (a <b>!</b> pops up), tap <b>Step up!</b>: your line pushes up and leaves them offside.",
    "Too early and they check their runs; too late and they're onside. On hard he sometimes winds up and doesn't pass."]});

/* ---------- 16. Clear the cross: read where it's dropping and get your head on it first ---------- */
function lgClear(st){
  const kit = lvKits(st), e = st.lab.ease, R = clamp(15*(1 + e*1.1), 10, 21), vMe = clamp(118*(1 + e*.5), 95, 140), vAt = clamp(52*(1 - e*.8), 40, 66), goal = lgTarget(st, 3, .8);
  let won = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${won} of 5`;
    const left = k%2===0, from = [left ? 16 : 284, 58 + Math.random()*18], land = [96 + Math.random()*108, 128 + Math.random()*22], T = clamp(1500*(1 + e*.4) - k*60, 1100, 1900), h = 52;
    const att = [clamp(land[0] + (Math.random()<.5 ? -1 : 1)*(34 + Math.random()*26), 70, 230), 100 + Math.random()*10], me = [150, 150];
    lgShow(st, "Clear the cross", `Cross ${k+1} of 5. Tap where it's dropping: get there before their striker and head it clear.`,
      lvField("bottom", `<circle id="lgLand" r="${R}" fill="rgba(245,197,66,.12)" stroke="#F5C542" stroke-width="1.6" stroke-dasharray="4 4" opacity="0"/>
        <g id="lgWg">${lvMan(0, 0, kit.them)}</g><g id="lgAt">${lvMan(0, 0, kit.them, {num:9})}</g><g id="lgMe">${lvMan(0, 0, kit.us, {ring:"#F5C542"})}</g>${lvBallSvg("lgB", from[0], from[1], 4)}`)
        + `<div class="lg-aimpad"></div>` + lgHud(won, "cleared"));
    let done = false, tgt = null, meIn = 0, atIn = 0;
    const fin = r => { done = true; off(); res(r); }, off = lgKeys(key=>{ const d = {ArrowLeft:[-40, 0], ArrowRight:[40, 0], ArrowUp:[0, -30], ArrowDown:[0, 30]}[key]; if (d){ tgt = [clamp((tgt || me)[0] + d[0], 20, 280), clamp((tgt || me)[1] + d[1], 60, 172)]; return 1; } });
    lvSkippable(fin);
    const stage = lv$(".lv-stage"), t0 = performance.now() + 700; let last = t0, kicked = false;
    lvMove("#lgWg", from[0] + (left ? -4 : 4), from[1] + 4); lvMove("#lgMe", ...me); lvMove("#lgAt", ...att);
    const step = (p, to, v, dt) => { const dx = to[0] - p[0], dy = to[1] - p[1], d = Math.hypot(dx, dy); if (d<1) return false; const s = Math.min(d, v*dt); p[0] += dx/d*s; p[1] += dy/d*s; return true; };
    lvLoop(now=>{
      if (done) return false;
      const dt = Math.min(.04, (now - last)/1000); last = now;
      if (now<t0) return;
      if (!kicked){ kicked = true; lvKick("#lgWg .lv-man"); }
      // the ball's shadow runs along the ground to where it'll drop; the ball itself loops up and comes down at head height
      const k2 = clamp((now - t0)/T, 0, 1), q = 1 - Math.pow(1 - k2, 1.25);
      lvBallAt("#lgB", from[0] + (land[0] - from[0])*q, from[1] + (land[1] - from[1])*q, 1, 4*h*k2*(1 - k2) + 12*k2, k2*600, true);
      if (labDiff==="easy" && k2>.3){ const l = lv$("#lgLand"); l.setAttribute("opacity", 1); l.setAttribute("transform", `translate(${land[0].toFixed(1)} ${land[1].toFixed(1)})`); }
      // you run to where you tapped; he runs to where it's going, a moment after it's crossed
      const mm = tgt && step(me, tgt, vMe, dt), am = now - t0 > 250 && step(att, land, vAt, dt);
      lvMove("#lgMe", me[0], me[1]); lvMove("#lgAt", att[0], att[1]);
      lv$("#lgMe .lv-legs")?.classList.toggle("run", !!mm); lv$("#lgAt .lv-legs")?.classList.toggle("run", !!am);
      lgDepth(["#lgMe", "#lgAt"], [me[1], att[1]]);
      // when each of you got under it
      if (!meIn && Math.hypot(me[0] - land[0], me[1] - land[1])<=R) meIn = now; if (meIn && Math.hypot(me[0] - land[0], me[1] - land[1])>R) meIn = 0;
      if (!atIn && Math.hypot(att[0] - land[0], att[1] - land[1])<=R) atIn = now;
      if (k2>=1){ resolve(); return false; }
    });
    const resolve = async () => {
      lvEl.querySelectorAll(".lv-legs.run").forEach(l=>l.classList.remove("run"));
      const dMe = Math.hypot(me[0] - land[0], me[1] - land[1]), dAt = Math.hypot(att[0] - land[0], att[1] - land[1]);
      if (dMe<=R && (!atIn || meIn<=atIn + 150 || dMe + 6<dAt)){ won++; lgSetHud(won); lvHop("#lgMe .lv-man"); lgImpact(land[0], land[1] - 30, "#F5C542");
        await lvFly("#lgB", land, [clamp(land[0] + Math.random()*120 - 60, 20, 280), -8], 560, {h:44, spin:2});
        return done || fin({ok:true, big:"Cleared!", small:dMe<R*.4 ? "Bang on it" : "Got enough on it"}); }
      if (dAt<=R + 4){ lvHop("#lgAt .lv-man"); const sc = Math.random()<.6; await lvFly("#lgB", land, [150 + Math.random()*30 - 15, sc ? 177 : 188], 380, {h:6, spin:1.5});
        return done || fin({ok:false, big:sc ? "He scores" : "Header wide", small:dMe>R*2 ? "You were nowhere near it" : "He got there first"}); }
      await lvFly("#lgB", land, [land[0] + 8, land[1] + 10], 300, {h:8});
      done || fin({ok:false, big:"Dropped in the box", small:"Get under it before it lands"});
    };
    lv$(".lg-aimpad").addEventListener("pointerdown", ev=>{ if (done) return; const p = lgAt(ev, stage); tgt = [clamp(p[0], 20, 280), clamp(p[1], 60, 172)]; lgImpact(tgt[0], tgt[1], "#F5C542", 5); });
  });
  return (async ()=>{
    for (let k=0;k<5;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${won} of 5`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:won>=goal, big:`${won} of 5`, small:won>=goal ? "Dominant in the air" : `You needed ${goal}`, score:`${won} cleared`};
  })();
}
lgAdd({id:"clear", t:"Clear the cross", d:"Five crosses into your box: read where each one drops and get your head on it before their striker.", ic:"head", run:lgClear},
  {t:"Clear the cross", steps:["Crosses come in from the wings, one at a time. Their striker (the 9) is after them too.", "Watch the ball's <b>shadow</b>: it runs along the ground to where the ball will drop. <b>Tap the pitch</b> to run there (or use the arrow keys).",
    "Be under it when it comes down to head height, and get there before he does. On easy a ring shows where it's dropping."]});

/* ---------- 17. Rondo: keep the ball from the two in the middle ---------- */
function lgRondo(st){
  const kit = lvKits(st), e = st.lab.ease, vD = clamp(74*(1 - e*.9), 52, 98), limit = clamp(2100*(1 + e*1.1), 1400, 2900), goal = lgTarget(st, 10, 1.6), vb = 240, N = 5, NUM = [4, 6, 8, 10, 7];
  const P = [...Array(N)].map((_,i)=>{ const a = -Math.PI/2 + i*2*Math.PI/N; return [150 + 86*Math.cos(a), 101 + 60*Math.sin(a)]; });
  return new Promise(res=>{
    lgShow(st, "Rondo", "Tap a teammate to pass. Pick a lane the two in the middle can't cut out, and keep it moving.",
      lvField("none", `<ellipse cx="150" cy="101" rx="98" ry="72" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1.5" stroke-dasharray="3 6"/><g id="lgLanes"></g>
        <circle id="lgHold" r="18" fill="rgba(245,197,66,.1)" stroke="#F5C542" stroke-width="2.4"/>${P.map((p,i)=>`<g id="lgP${i}">${lvMan(0, 0, kit.us, {num:NUM[i]})}</g>`).join("")}
        <g id="lgD0">${lvMan(0, 0, kit.them)}</g><g id="lgD1">${lvMan(0, 0, kit.them)}</g>${lvBallSvg("lgB", P[0][0], P[0][1], 4)}`)
        + P.map((p,i)=>`<button type="button" class="lg-tgt" data-p="${i}" style="${lvPct(p[0], p[1] - 14)}" aria-label="Pass to number ${NUM[i]}"></button>`).join("") + lgHud(0, "passes"),
      lgTimerHTML);
    let done = false;
    const fin = r => { done = true; off(); res(r); }, off = lgKeys(key=>{ const i = +key - 1; if (i>=0 && i<N){ pass(i); return 1; } });
    lvSkippable(fin);
    P.forEach((p,i)=>lvMove(`#lgP${i}`, p[0], p[1]));
    const D = [[132, 92], [168, 110]], plan = [null, null]; let h = 0, n = 0, busy = false, since = performance.now() + 900, last = performance.now(), re = since;
    // each of them steps into a passing lane from whoever has it, and switches lanes every second or so
    const pick2 = () => { const opts = [...Array(N).keys()].filter(j=>j!==h).sort(()=>Math.random() - .5);
      [0,1].forEach(i=>{ const j = opts[i], f = .38 + Math.random()*.24; plan[i] = [P[h][0] + (P[j][0] - P[h][0])*f, P[h][1] + (P[j][1] - P[h][1])*f]; }); };
    const hold = () => { lv$("#lgHold").setAttribute("transform", `translate(${P[h][0].toFixed(1)} ${(P[h][1] - 15).toFixed(1)})`); lvBallAt("#lgB", P[h][0] + 3, P[h][1] + 1, 1);
      lv$("#lgLanes").innerHTML = P.map((p,j)=>j===h ? "" : `<path d="M${P[h][0].toFixed(1)} ${P[h][1].toFixed(1)}L${p[0].toFixed(1)} ${p[1].toFixed(1)}" stroke="rgba(255,255,255,.14)" stroke-width="5" stroke-linecap="round"/>`).join("");
      lvEl.querySelectorAll(".lg-tgt").forEach(b=>b.disabled = +b.dataset.p===h); };
    pick2(); hold();
    lvLoop(now=>{
      if (done) return false;
      const dt = Math.min(.04, (now - last)/1000); last = now;
      if (now>=re){ pick2(); re = now + 750 + Math.random()*600; }
      D.forEach((d,i)=>{ const dx = plan[i][0] - d[0], dy = plan[i][1] - d[1], L = Math.hypot(dx, dy); if (L>.5){ const s = Math.min(L, vD*dt); d[0] += dx/L*s; d[1] += dy/L*s; }
        lvMove(`#lgD${i}`, d[0], d[1]); lv$(`#lgD${i} .lv-legs`)?.classList.toggle("run", L>2); });
      if (!busy){ lgSetTimer(1 - (now - since)/limit); if (now - since>limit){ lost(-1, "Too slow: they closed you down"); return false; } }
    });
    const pass = async j => {
      if (busy || done || j===h || j>=N) return; busy = true;
      const a = P[h], b = P[j], ms = Math.hypot(b[0] - a[0], b[1] - a[1])/vb*1000, t0 = performance.now();
      lvKick(`#lgP${h} .lv-man`); lv$("#lgHold").setAttribute("opacity", 0); lv$("#lgLanes").innerHTML = "";
      // anyone within a stride of the ball on its way takes it
      const cut = await new Promise(r2=>{ const tick = now=>{ if (done) return r2(null); const k = Math.min(1, (now - t0)/ms), x = a[0] + (b[0] - a[0])*k, y = a[1] + (b[1] - a[1])*k;
        lvBallAt("#lgB", x + 3, y + 1, 1, 0, k*400, true); const i = D.findIndex(d=>Math.hypot(d[0] - x, d[1] - y)<11);
        if (i>=0) return r2(i); if (k>=1) return r2(-1); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      if (cut===null || done) return;
      if (cut>=0) return lost(cut, "Cut out");
      h = j; n++; lgSetHud(n); hold(); lv$("#lgHold").setAttribute("opacity", 1); busy = false; since = performance.now(); pick2(); re = since + 750 + Math.random()*600;
      if (n>=20) lost(-2, "");
    };
    const lost = async (i, why) => {
      if (done) return; done = true; busy = true;
      lvEl.querySelectorAll(".lg-tgt").forEach(b=>b.disabled = true);
      if (i===-1){ const d = D[0], at = P[h]; lv$("#lgD0 .lv-legs")?.classList.add("run"); await lvGlide("#lgD0", d.slice(), [at[0] + 8, at[1] + 4], 300, lvEaseOut); }
      else if (i>=0) lvHop(`#lgD${i} .lv-man`);
      await lvWait(250);
      res(i===-2 ? {ok:true, big:"Twenty!", small:"They never got near it", score:"20 passes in a row"}
        : {ok:n>=goal, big:n>=goal ? `${n} passes` : "Lost it", small:n>=goal ? `${why}, but you'd made ${n}` : `${why} after ${n}: you needed ${goal}`, score:`${n} pass${n===1 ? "" : "es"} in a row`});
    };
    lvEl.querySelectorAll(".lg-tgt").forEach(b=>lvTap(b, ()=>pass(+b.dataset.p)));
  });
}
lgAdd({id:"rondo", t:"Rondo", d:"Five of you round the outside, two of them in the middle: keep the ball moving and don't let them cut it out.", ic:"circle", run:lgRondo},
  {t:"Rondo", steps:["You're in a circle with four teammates; two defenders in the middle try to win it.", "<b>Tap a teammate</b> to pass to him (or press 1 to 5). If the ball goes within a stride of a defender, he cuts it out.",
    "They shift between passing lanes as you go, and you've only a couple of seconds each time. String together as many as you can."]});

/* ---------- 18. Shield the ball: keep your body between him and it ---------- */
function lgShield(st){
  const kit = lvKits(st), e = st.lab.ease, dur = 6000, wD = clamp(1.9*(1 - e*.8), 1.3, 2.6), fill = clamp(.95*(1 - e*1.2), .6, 1.3), wMe = 3.6, M = [150, 104], RX = 60, RY = 42;
  return new Promise(res=>{
    lgShow(st, "Shield the ball", "He's trying to get round you. Turn to keep the ball on the far side from him for six seconds.",
      lvField("none", `<ellipse cx="${M[0]}" cy="${M[1]}" rx="${RX}" ry="${RY}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1.5" stroke-dasharray="3 5"/>
        <path id="lgArc" fill="rgba(245,197,66,.22)" stroke="#F5C542" stroke-width="1.4" stroke-dasharray="4 3"/><g id="lgDf">${lvMan(0, 0, kit.them, {s:1.2})}</g><g id="lgMe">${lvMan(0, 0, kit.us, {ring:"#F5C542", s:1.2})}</g>${lvBallSvg("lgB", M[0], M[1] + 12, 4.5)}`)
        + `<div class="lg-press" aria-hidden="true"><span>Pressure</span><i><b></b></i></div>`,
      `${lgTimerHTML}<div class="lv-row lv-lr"><button type="button" class="btn big" data-h="l" aria-label="Turn left">↺ Turn</button><button type="button" class="btn big" data-h="r" aria-label="Turn right">Turn ↻</button></div>`);
    const hold = {l:false, r:false}; let done = false;
    const fin = r => { done = true; off(); res(r); }, off = lgKeys(k=>{ if (k==="ArrowLeft"){ hold.l = true; return 1; } if (k==="ArrowRight"){ hold.r = true; return 1; } }, k=>{ if (k==="ArrowLeft") hold.l = false; if (k==="ArrowRight") hold.r = false; });
    lvSkippable(fin);
    lvEl.querySelectorAll("[data-h]").forEach(b=>lgHoldOn(b, on=>{ hold[b.dataset.h] = on; b.classList.toggle("on", on); }));
    const stage = lv$(".lv-stage"), bar = lv$(".lg-press b"), t0 = performance.now() + 500;
    lgHoldOn(stage, on=>{ if (!on) hold.l = hold.r = false; });
    stage.addEventListener("pointerdown", ev=>{ hold[lgAt(ev, stage)[0] < 150 ? "l" : "r"] = true; });
    let tb = Math.PI/2, td = -Math.PI/2, wd = wD, flip = t0 + 900, press = 0, last = t0;
    const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    lvLoop(now=>{
      if (done) return false;
      const dt = Math.min(.04, Math.max(0, now - last)/1000); last = now;
      if (now>=t0){
        // he changes direction now and then, sometimes with a burst
        if (now>=flip){ wd = (Math.random()<.6 ? -Math.sign(wd) : Math.sign(wd))*wD*(Math.random()<.25 ? 1.7 : .8 + Math.random()*.4); flip = now + 600 + Math.random()*1000; }
        td += wd*dt; tb += ((hold.r ? 1 : 0) - (hold.l ? 1 : 0))*wMe*dt;
        const gap = Math.abs(wrap(tb - td - Math.PI));
        press = clamp(press + (gap<1 ? -.45 : fill*2*(gap - 1)/(Math.PI - 1))*dt, 0, 1);
      }
      const gap = Math.abs(wrap(tb - td - Math.PI)), reach = clamp((gap - .6)/2, 0, 1);
      const dp = [M[0] + (RX - 16*reach)*Math.cos(td), M[1] + (RY - 11*reach)*Math.sin(td)], bp = [M[0] + 17*Math.cos(tb), M[1] + 12*Math.sin(tb)];
      lvMove("#lgDf", dp[0], dp[1], 14*reach*Math.sign(Math.cos(td))); lvMove("#lgMe", ...M); lvBallAt("#lgB", bp[0], bp[1], 1, 0, tb*180/Math.PI*3);
      lgDepth(["#lgDf", "#lgMe", "#lgB"], [dp[1], M[1], bp[1] + .5]);
      // the side you're covering: the arc away from him
      const a0 = td + Math.PI - 1, a1 = td + Math.PI + 1, r = 34;
      lv$("#lgArc").setAttribute("d", `M${M[0]} ${M[1]}L${(M[0] + r*Math.cos(a0)).toFixed(1)} ${(M[1] + r*.78*Math.sin(a0)).toFixed(1)}A${r} ${(r*.78).toFixed(1)} 0 0 1 ${(M[0] + r*Math.cos(a1)).toFixed(1)} ${(M[1] + r*.78*Math.sin(a1)).toFixed(1)}z`);
      bar.style.transform = `scaleX(${press.toFixed(3)})`; bar.parentNode.classList.toggle("hot", press>.65);
      const t = Math.max(0, now - t0); lgSetTimer(1 - t/dur);
      if (press>=1){ end(false); return false; }
      if (t>=dur){ end(true); return false; }
    });
    const end = async ok => {
      done = true; off();
      lvEl.querySelectorAll("[data-h]").forEach(b=>b.disabled = true);
      if (!ok){ const [x, y] = [M[0] + 17*Math.cos(tb), M[1] + 12*Math.sin(tb)]; lvKick("#lgDf .lv-man"); await lvFly("#lgB", [x, y], [x + (x - M[0])*3, y + (y - M[1])*3], 320, {spin:1}); }
      res(ok ? {ok:true, big:"Kept it!", small:press<.3 ? "He never got a sniff" : "Strong", score:"Six seconds"} : {ok:false, big:"He's nicked it", small:"Keep the ball on the gold side, away from him"});
    };
  });
}
lgAdd({id:"shield", t:"Shield the ball", d:"A defender circles you, trying to get to the ball: turn to keep it away from him for six seconds.", ic:"shield", run:lgShield},
  {t:"Shield the ball", steps:["You've got the ball with a defender right behind you, circling to get round.", "<b>Hold</b> ↺ Turn or Turn ↻ (or that side of the pitch, or the arrow keys) to move the ball round you. Keep it in the <b>gold</b>, on the far side from him.",
    "When he gets round to it the pressure bar fills. Fill it and he's won it. Last six seconds."]});

/* ---------- 19. Bend it: swipe the curl round the wall ---------- */
function lgBend(st){
  const kit = lvKits(st), e = st.lab.ease; let got = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${got} of 3`;
    lgShow(st, "Bend it", `Go ${k+1} of 3. Swipe up from the ball, curving your finger: the ball follows your swipe round the wall or over it.`,
      lvGoalSvg(kit.them, kit.them, false) + lgHud(got, "goals"));
    let done = false, fired = false, pts = [], down = false;
    const fin = r => { done = true; res(r); }; lvSkippable(fin);
    const stage = lv$(".lv-stage"), svg = stage.querySelector("svg");
    svg.insertAdjacentHTML("beforeend", `<path id="lgSw" fill="none" stroke="#F5C542" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><text id="lgHint" x="150" y="150" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="11" letter-spacing="1" fill="#FFE9A8">SWIPE UP FROM THE BALL</text>`);
    const draw = () => lv$("#lgSw")?.setAttribute("d", pts.length ? "M" + pts.map(p=>p.map(v=>v.toFixed(1)).join(" ")).join("L") : "");
    stage.addEventListener("pointerdown", ev=>{ if (done || fired) return; ev.preventDefault(); stage.setPointerCapture?.(ev.pointerId); down = true; pts = [lgAt(ev, stage)]; draw(); lv$("#lgHint")?.remove(); });
    stage.addEventListener("pointermove", ev=>{ if (!down || fired) return; const p = lgAt(ev, stage), q = pts[pts.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1])>2.5){ pts.push(p); draw(); } });
    stage.addEventListener("pointerup", ()=>{ if (!down || fired) return; down = false; release(); });
    stage.addEventListener("pointercancel", ()=>{ down = false; pts = []; draw(); });
    const release = async () => {
      const S0 = pts[0], S1 = pts[pts.length - 1];
      if (pts.length<4 || S0[1] - S1[1] < 40){ pts = []; draw(); lgPop("Swipe up, towards the goal", false, 50, 62); return; }
      fired = true;
      // your swipe, moved to start at the ball: where it ends is where the ball's going, and how far it bows out is the bend
      const A = [150, 166], o = [A[0] - S0[0], A[1] - S0[1]], B = [clamp(S1[0] + o[0], -20, 320), clamp(S1[1] + o[1], -30, 150)];
      let L = 0; const acc = pts.slice(1).map((p, i)=>L += Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const mi = Math.max(0, acc.findIndex(x=>x>=L/2)), M = [pts[mi + 1][0] + o[0], pts[mi + 1][1] + o[1]];
      const dev = [M[0] - (A[0] + B[0])/2, M[1] - (A[1] + B[1])/2], C = [(A[0] + B[0])/2 + dev[0]*2.6, (A[1] + B[1])/2 + dev[1]*2.6];
      const Pq = u => { const q = 1 - u; return [q*q*A[0] + 2*q*u*C[0] + u*u*B[0], q*q*A[1] + 2*q*u*C[1] + u*u*B[1]]; };
      const W = Pq(.28), wall = W[0]>114 && W[0]<186 && W[1]>108;
      const wide = B[0]<30 || B[0]>270, over = B[1]<22, post = !wide && !over && (B[0]<36 || B[0]>264 || B[1]<27);
      const curl = Math.hypot(...dev), dist = Math.hypot(B[0] - 150, B[1] - 84), save = clamp(1.2 - dist/80 - curl/50 - e*.4, .05, .92);
      const goal = !wall && !wide && !over && !post && Math.random()>save;
      const [kx, ky, rot] = lvKeeperTo(B[0], B[1], wall || wide || over ? "wrong" : goal ? "near" : "save", B[0]<140 ? "l" : B[0]>160 ? "r" : "c");
      lv$("#lgSw").style.transition = "opacity .5s"; lv$("#lgSw").setAttribute("opacity", ".25");
      await lvStrike(st); if (done) return;
      const end = wall ? W : B, ms = wall ? 260 : 680;
      await Promise.all([lvTween(ms, kk=>{ const u = (wall ? .28 : 1)*lvEaseOut(kk), [x, y] = Pq(u); lvBallAt("#lvBall", x, y, 1 - .42*u, 0, kk*720, kk<1); }),
        wall ? null : lvTween(340, kk=>{ const q = lvEaseOut(kk); lvMove("#lvKp", 150 + (kx-150)*q, 84 + (ky-84)*q, rot*q, 1 + .06*q); })]);
      if (done) return;
      if (wall){ await lvFly("#lvBall", end, [end[0] + (Math.random()*60 - 30), 176], 320, {s0:.88, s1:1, h:12, spin:-1}); return fin({ok:false, big:"Hit the wall", small:"Bend it wider, or lift it higher over them"}); }
      if (goal){ got++; lgSetHud(got); lvRipple(B[0], B[1]); await lvWait(200); return fin({ok:true, big:"What a free kick!", small:curl>22 ? "Bent it round the wall" : "Over the wall and in"}); }
      fin({ok:false, big:wide ? "Wide" : over ? "Over the bar" : post ? "Off the woodwork" : "Saved", small:wide || over ? "Aim inside the posts" : post ? "Inches away" : curl<12 ? "Not enough bend: he read it" : "He got across to it"});
    };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${got} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:got>=2, big:`${got} of 3`, small:got>=2 ? "Dead-ball specialist" : "Swipe a bigger curve", score:`${got} free kick${got===1 ? "" : "s"} scored`};
  })();
}
lgAdd({id:"bendit", t:"Bend it", d:"Swipe a curve from the ball and it follows your finger: round the wall, or over it, into the corner.", ic:"bend", run:lgBend},
  {t:"Bend it", steps:["A free kick on the edge of the box, with a wall in the way.", "<b>Swipe up</b> from the ball towards the goal. Where your swipe ends is where it goes; <b>curve your finger</b> and the ball bends the same way.",
    "Bend it round the end of the wall or lift it over, and aim for the corners: the more bend, the harder it is for the keeper."]});

/* ---------- 20. Air duel: be at the top of your jump as the ball arrives ---------- */
function lgAirDuel(st){
  const kit = lvKits(st), e = st.lab.ease, J = 640, H = 30, spread = clamp(150*(1 + e*1.5), 70, 240); let won = 0;
  const one = k => new Promise(res=>{
    st.lab.tally = `${won} of 3`;
    const T = clamp(1700 - k*120 + Math.random()*300, 1300, 2000), D = [150, 91], from = [-12, 70], C = [60, -10], their = 30 + Math.random()*spread*(1 - k*.12);
    lgShow(st, "Air duel", `Duel ${k+1} of 3. Tap to jump: be at the top of your jump as the ball arrives, before he is.`,
      lgSide(`<circle cx="${D[0]}" cy="${D[1]}" r="10" fill="none" stroke="#F5C542" stroke-width="2" stroke-dasharray="4 3" opacity=".8"/>
        <ellipse id="lgSh0" cx="164" cy="166.5" rx="14" ry="3" fill="rgba(0,0,0,.3)"/><ellipse id="lgSh1" cx="142" cy="171" rx="15" ry="3.2" fill="rgba(0,0,0,.35)"/>
        <g id="lgOp">${lvMan(0, 0, kit.them, {s:1.45, noShadow:true})}</g><g id="lgMe">${lvMan(0, 0, kit.us, {s:1.5, you:true, mark:true, noShadow:true})}</g>${lvBallSvg("lgB", from[0], 170, 5)}`) + lgHud(won, "won"),
      `<button type="button" class="btn primary big lv-act">Jump!</button>`);
    let done = false, tr = null;
    const fin = r => { done = true; res(r); }; lvSkippable(fin);
    const t0 = performance.now() + 500, opAt = t0 + T - 80 - J/2 + (Math.random()<.5 ? -1 : 1)*their;
    const P = u => { const q = 1 - u; return [q*q*from[0] + 2*q*u*C[0] + u*u*D[0], q*q*from[1] + 2*q*u*C[1] + u*u*D[1]]; };
    // a jump: a quick dip as he bends his knees, then up and down again
    const hop = (t, at) => { if (at==null || t<at) return 0; const c = t - at; if (c<80) return -3*c/80; const k = (c - 80)/J; return k<1 ? H*4*k*(1 - k) - 3*(1 - Math.min(1, k*6)) : 0; };
    const draw = now => { const hm = hop(now, tr), ho = hop(now, opAt); lvMove("#lgMe", 142, 171 - hm); lvMove("#lgOp", 164, 166.5 - ho);
      lv$("#lgSh1")?.setAttribute("rx", (15 - Math.max(0, hm)*.25).toFixed(1)); lv$("#lgSh0")?.setAttribute("rx", (14 - Math.max(0, ho)*.25).toFixed(1)); };
    lvLoop(now=>{
      if (done) return false;
      draw(now);
      const u = (now - t0)/T; if (u>=0){ const [x, y] = P(u); lvBallAt("#lgB", x, 170, 1, Math.max(0, 170 - y), u*500, true); }
      if (u>=1){ resolve(); return false; }
    });
    const resolve = async () => {
      lv$(".lv-act").disabled = true;
      const mine = tr==null ? Infinity : Math.abs(tr + 80 + J/2 - (t0 + T)), win = mine<their && mine<J*.4, a = P(1), b = win ? [330, 36] : [-20, 44];
      if (win){ won++; lgSetHud(won); }
      lgImpact(D[0] + (win ? -4 : 6), D[1] + 4, win ? "#F5C542" : "#FFFFFF", 7);
      await lvTween(560, kk=>{ draw(performance.now()); const q = lvEaseOut(kk); lvBallAt("#lgB", a[0] + (b[0] - a[0])*q, 170, 1, 170 - (a[1] + (b[1] - a[1])*q), kk*600, true); });
      done || fin(win ? {ok:true, big:"Won the header", small:mine<60 ? "Timed it perfectly" : "Just got above him"}
        : {ok:false, big:"Lost the duel", small:tr==null ? "You didn't jump" : tr + 80 + J/2 < t0 + T ? "Too early: you were coming down" : "Too late: he was already up there"});
    };
    const jump = () => { if (done || tr!=null) return; tr = performance.now(); lv$(".lv-act").disabled = true; };
    lvTap(lv$(".lv-act"), jump); lvTap(lv$(".lv-stage"), jump); lvKey = k2=>{ if (k2==="go") jump(); };
  });
  return (async ()=>{
    for (let k=0;k<3;k++){ const r = await one(k); if (r==="skip") return r; st.lab.tally = `${won} of 3`; await lgFlash(r.ok, r.big, r.small); }
    return {ok:won>=2, big:`${won} of 3`, small:won>=2 ? "Dominant in the air" : "Jump a fraction before the ball arrives", score:`${won} header${won===1 ? "" : "s"} won`};
  })();
}
lgAdd({id:"airduel", t:"Air duel", d:"A long ball drops between you and a defender: time your jump to win the header.", ic:"jump", run:lgAirDuel},
  {t:"Air duel", steps:["A long ball drops towards you and a defender, right over the gold ring.", "Tap <b>Jump!</b> so you're at the <b>top of your jump</b> as the ball arrives. It takes a moment to get up there, so go a little early.",
    "Whoever's closer to the top of his jump wins it. Three duels."]});
