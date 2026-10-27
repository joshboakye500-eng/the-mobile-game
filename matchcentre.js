/* ================= MATCH CENTRE =================
   Instead of typing in a season's stats, play it week by week: pick a training focus, sim the fixtures, and your
   attributes, form, sharpness and fitness decide whether you start and how you play. Each half-season ends by
   handing its appearances, goals, assists and clean sheets to the same review the manual form uses (applyHalf), so
   values, offers and the Ballon d'Or work as before. Your club's league points and cup runs come from the fixtures
   played here (mcLeagueTable, mcCupResult, mcEuroResult), so the final table matches the results you saw.
   Loaded before game.js and only called once the game is running. */
const MC_ATTR = [["fin","Finishing"],["pas","Passing"],["pac","Pace"],["def","Defending"],["sta","Stamina"]];
// how much each attribute counts towards your overall rating, by position (finishing, passing, pace, defending, stamina)
const MC_W = {ST:[.45,.12,.25,0,.18], LW:[.28,.24,.32,0,.16], RW:[.28,.24,.32,0,.16], CAM:[.25,.4,.15,.04,.16], CM:[.12,.38,.1,.2,.2],
  CDM:[.04,.3,.1,.36,.2], LB:[0,.2,.32,.33,.15], RB:[0,.2,.32,.33,.15], CB:[0,.14,.16,.55,.15], GK:[0,.12,.08,.7,.1]};
// share of the team's goals you score and set up when you're as good as your team, calibrated to POS[pos].exp
const MC_SHARE = {ST:[.32,.16], LW:[.26,.2], RW:[.26,.2], CAM:[.2,.24], CM:[.1,.16], CDM:[.04,.07], LB:[.03,.13], RB:[.03,.13], CB:[.045,.015], GK:[0,.003]};
// how much of your quality goes into attack rather than defence
const MC_ATT = {ST:.8, LW:.8, RW:.8, CAM:.75, CM:.5, CDM:.3, LB:.3, RB:.3, CB:.15, GK:0};
// the first round of each domestic cup played after Christmas
const MC_H2 = {fa:3, lc:5, eflt:2, fat:1, cdr:3, dfb:3, cit:2, cdf:1, tdp:3, knvb:2, scup:0};
const MC_TRAIN = [...MC_ATTR, ["prep","Match prep"], ["rest","Rest"]];
// how far below the first team a young player starts, and how much room he has to grow
const MC_YOUTH = {16:12, 17:9, 18:7, 19:5, 20:3, 21:2, 22:1};
const MC_ROOM = {16:22, 17:19, 18:16, 19:13, 20:10, 21:8, 22:6, 23:4, 24:3, 25:2};
const MC_MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ---------- attributes ---------- */
function mcWeights(){ const w = MC_W[S.player.pos] || MC_W.CM; return Object.fromEntries(MC_ATTR.map(([k],i)=>[k, w[i]])); }
// the boost from the boots you're wearing (shop.js); mcA() is your attributes as they count in matches
const MC_BOOT = [0, 2, 4, 6];
function mcBoot(){ const L = Account.locker(), lvl = L.on ? L.boots[L.on] || 0 : 0; return lvl ? {k:L.on, n:MC_BOOT[lvl]} : null; }
function mcA(){ const a = {...S.attr}, b = mcBoot(); if (b) a[b.k] = Math.min(99, a[b.k] + b.n); return a; }
function mcOvr(a = mcA()){ const w = mcWeights(); return Math.round(MC_ATTR.reduce((s,[k])=>s + w[k]*a[k], 0)); }
function mcAttrName(k){ return k==="def" && S.player.pos==="GK" ? "Shot-stopping" : MC_TRAIN.find(x=>x[0]===k)[1]; }
// a new player (or an older save) starts around the first team's level, lower while still breaking through
function mcInit(){
  if (S.attr) return;
  const w = mcWeights(), last = S.history[S.history.length-1];
  const target = strOf(S.club) - (MC_YOUTH[S.age] || 0) + (last ? clamp(((last.score ?? .6) - .6)*10, -4, 5) : 0) + gauss()*1.5;
  const a = {}; MC_ATTR.forEach(([k])=>{ a[k] = target + 30*(w[k]-.2) + gauss()*2; });
  const shift = target - MC_ATTR.reduce((s,[k])=>s + w[k]*a[k], 0);
  MC_ATTR.forEach(([k])=>{ a[k] = +clamp(a[k] + shift, 20, 95).toFixed(2); });
  a.pot = +clamp(target + (MC_ROOM[S.age] ?? 1) + gauss()*2.5, target+1, 96).toFixed(1);
  S.attr = a; S.cond = {fat:10, sharp:60, form:[]};
  S.train = {focus:MC_ATTR.slice().sort((x,y)=>w[y[0]]-w[x[0]])[0][0], hard:false};
}
// weekly growth from training: fast for teenagers, small by the late twenties; past 30 it only slows the decline
function mcGrowth(age){ return age<=18 ? .2 : age<=20 ? .16 : age<=22 ? .11 : age<=24 ? .07 : age<=26 ? .04 : .02; }
// how close an attribute is to its ceiling: your potential, higher for the attributes your position relies on
function mcRoom(k){ return clamp((S.attr.pot + 30*(mcWeights()[k]-.2) + 4 - S.attr[k])/6, 0, 1.3); }
function mcPotLabel(){ const d = S.attr.pot - mcOvr(); return d>=10 ? "Huge potential" : d>=5 ? "Room to grow" : d>=2 ? "Close to your peak" : "At your peak"; }

/* ---------- which mode this season uses ---------- */
// a season is played in one mode throughout; a save that's already midway through one stays manual until it ends
function seasonMode(){
  const s = seasonLabel(S.season);
  if (!S.modeSeason || S.modeSeason.s!==s) S.modeSeason = {s, m: halfOf()===1 && !S.h1 ? (S.mode || "centre") : "manual"};
  return S.modeSeason.m;
}
// switching is allowed before this half's first week; back to manual entry only before the season starts
function mcCanSwitch(to){ return !(S.mc && S.mc.key===mcKey() && S.mc.wi>0) && (to==="centre" || (halfOf()===1 && !S.h1)); }
function mcModeSwitch(){
  const now = seasonMode(), other = now==="centre" ? "manual" : "centre";
  const what = m => m==="manual" ? "enter your stats by hand (handy for logging a real FC career)" : "play your seasons in the match centre";
  if (mcCanSwitch(other)) return `<p class="hint" style="margin-top:14px">Prefer to ${what(other)}? <button type="button" class="linkbtn" data-act="mc-mode" data-k="${other}">Switch for this season</button></p>`;
  if ((S.mode || "centre")!==now) return `<p class="hint" style="margin-top:14px">From next season you'll ${what(S.mode)}. <button type="button" class="linkbtn" data-act="mc-mode" data-k="${now}">Keep things as they are</button></p>`;
  return `<p class="hint" style="margin-top:14px">Prefer to ${what(other)}? <button type="button" class="linkbtn" data-act="mc-mode" data-k="${other}">Switch from next season</button></p>`;
}

/* ---------- the season's record for your club ---------- */
function mcKey(){ return `${seasonLabel(S.season)}|${halfOf()}|${S.club}`; }
function mcRec(club){
  const s = seasonLabel(S.season);
  if (!S.mcRec || S.mcRec.s!==s) S.mcRec = {s, clubs:{}};
  return S.mcRec.clubs[club] ||= {lg:{p:0,w:0,d:0,l:0,gf:0,ga:0}, cups:{}, eu:null, order:null};
}
// a club's last five results this season, and what they're worth: −0.9 (losing every week) to +1 (winning every week)
function mcTeamForm(club){
  const rec = mcRecIf(club), L = ((rec && rec.form) || []).slice(-5);
  const ppg = L.length ? L.reduce((s,r)=>s + (r==="W" ? 3 : r==="D" ? 1 : 0), 0)/L.length : 1.4;
  return {L, ppg, f: L.length ? clamp((ppg-1.4)/1.6, -.9, 1)*Math.min(1, L.length/3) : 0};
}
const mcFormPills = L => L.length ? L.map(r=>`<span class="tf ${r.toLowerCase()}">${r}</span>`).join("") : `<span class="hint">No games yet</span>`;
function mcRecIf(club){ return S.mcRec && S.mcRec.s===seasonLabel(S.season) ? S.mcRec.clubs[club] : null; }
function mcOut(r, reached, lostTo, stage){ Object.assign(r, {alive:false, reached, lostTo, stage}); }
function mcCupRec(rec, c, half){
  if (rec.cups[c.code]) return rec.cups[c.code];
  const r = rec.cups[c.code] = {alive:true, next:c.entry, games:0, gp:0, pts:0, beaten:[], tie:null};
  // joined in January: play out the rounds this club got through before you arrived
  if (half===2){
    const h2 = Math.max(c.entry, MC_H2[c.code] ?? Math.ceil(c.rounds.length/2)), base = strOf(S.club);
    while (r.alive && r.next<h2){
      const i = r.next, L = c.legs ? c.legs(i) : 1;
      if (c.group && i===0){ r.games += 3; r.gp = 3; r.next = 1; continue; }
      const o = c.oppFor(i); r.games += L;
      if (tie(base, o.str, L)){ r.beaten.push(o.n); r.next++; } else mcOut(r, c.rounds[i], o.n, i);
    }
  }
  return r;
}
function mcEuPhaseEnd(r, E){
  if (r.pts>=E.top8){ r.next = 1; r.top8 = true; } else if (r.pts>=E.po) r.next = 0; else mcOut(r, "League phase", null, 0);
}
function mcEuRec(rec, code, half){
  if (rec.eu && rec.eu.code===code) return rec.eu;
  const E = EURO[code];
  const r = rec.eu = {code, opps:shuffle(euroField(code, S.club)).slice(0, E.phase), pts:0, gp:0, alive:true, next:null, games:0, beaten:[], tie:null};
  if (half===2){ r.opps.forEach(o=>{ r.pts += match(strOf(S.club), o.str); }); r.gp = r.games = E.phase; mcEuPhaseEnd(r, E); }
  return r;
}

/* ---------- building a half-season ---------- */
// fraction of the season a week falls at (0 = August, 1 = May), for injuries scheduled across the season
function mcFrac(w){ const M = S.mc; return (M.half-1)*.5 + (w+.5)/M.weeks.length*.5; }
// league games on the weekend, cup and European ties in midweek
function mcDate(w, f){
  const M = S.mc, y = M.half===1 ? S.season : S.season+1, d0 = M.half===1 ? Date.UTC(y,7,8) : Date.UTC(y,0,3);
  const d = new Date(d0 + (Math.round(w/Math.max(1, M.weeks.length-1)*140) - (f && f.code!=="league" ? 3 : 0))*864e5);
  return `${d.getUTCDate()} ${MC_MON[d.getUTCMonth()]}`;
}
function mcBuild(){
  mcInit();
  const our = S.club, t = tierOf(our), T = TIERS[t], half = halfOf(), rec = mcRec(our), base = strOf(our);
  const codes = new Set(currentPlan().map(p=>p.code));
  if (half===1 && !(S.attr0 && S.attr0.s===seasonLabel(S.season))){
    S.cond.fat = Math.min(S.cond.fat, 15); S.cond.sharp = 60;   // pre-season
    S.attr0 = {s:seasonLabel(S.season), ...S.attr};
  }
  const rivals = S.world.tiers[t].filter(n=>n!==our);
  rec.order ||= shuffle(rivals).map(n=>({n, home:Math.random()<.5}));
  const lg = half===1 ? rec.order : shuffle(rec.order).map(o=>({n:o.n, home:!o.home}));
  const W = Math.max(lg.length, 12), weeks = Array.from({length:W}, ()=>[]);
  const at = (x, f) => weeks[clamp(Math.floor(x*W), 0, W-1)].push(f);
  const top3 = rivals.slice().sort((a,b)=>strOf(b)-strOf(a)).slice(0,3);
  lg.forEach((o,i)=>weeks[Math.floor(i*W/lg.length)].push({code:"league", opp:o.n, home:o.home, big:top3.includes(o.n)}));
  // cup rounds spread across the half; two-legged ties a week or so apart
  for (const c of cupSpecs(our)){
    if (!codes.has(c.code)) continue;
    mcCupRec(rec, c, half);
    const h2 = MC_H2[c.code] ?? Math.ceil(c.rounds.length/2), from = half===1 ? c.entry : Math.max(c.entry, h2), to = half===1 ? Math.max(c.entry, h2) : c.rounds.length;
    for (let i=from;i<to;i++){
      const fx = {code:c.code, cup:true, ri:i, nr:c.rounds.length, round:c.rounds[i], big:i>=c.rounds.length-3, neutral:c.rounds[i]==="Final"};
      if (c.group && i===0){ [.08,.25,.42].forEach((x,k)=>at(x, {...fx, gi:k, round:`Group game ${k+1}`, big:false})); continue; }
      const x = c.group ? .55 + .4*(i-1)/Math.max(1, to-2) : .04 + .9*(i-from+.5)/(to-from), legs = c.legs ? c.legs(i) : 1;
      at(x, {...fx, leg:legs===2 ? 1 : 0});
      if (legs===2) at(x + 1.5/W, {...fx, leg:2});
    }
  }
  const eu = S.world.europe[our];
  if (eu && codes.has(eu)){
    const r = mcEuRec(rec, eu, half), E = EURO[eu];
    if (half===1) r.opps.forEach((o,k)=>at(.1 + .85*k/Math.max(1, E.phase-1), {code:eu, eu:true, ri:-1, gi:k, round:`League phase, game ${k+1}`, opp:o.n, oppStr:o.str, home:k%2===0, big:o.str>=base+3}));
    else KO_EU.forEach((round,i)=>{
      const fx = {code:eu, eu:true, ri:i, nr:KO_EU.length, round, big:true, neutral:round==="Final"};
      if (i<4){ at(.12 + .2*i, {...fx, leg:1}); at(.12 + .2*i + 1.5/W, {...fx, leg:2}); } else at(.97, {...fx, leg:0});
    });
  }
  // season-start injuries get a place in the calendar the first time they're needed
  const inj = S.inj && S.inj.season===seasonLabel(S.season) ? S.inj.list : [], lo = half===1 ? 0 : .5;
  inj.forEach(i=>{ if (i.at==null) i.at = +(lo + Math.random()*Math.max(0, 1-lo-i.red)).toFixed(3); });
  S.mc = {key:mcKey(), club:our, half, weeks:weeks.map(fx=>({fx})), wi:0, done:false, from:0,
    intlTo: half===2 ? Math.round((1-(S.intlAway||1))*W) : 0};
  tgEnsure();
}

/* ---------- playing a week ---------- */
function mcInjury(frac){ const list = S.inj && S.inj.season===seasonLabel(S.season) ? S.inj.list : []; return list.find(i=>i.at!=null && frac>=i.at && frac<i.at+i.red) || null; }
function mcFormAvg(){ const f = S.cond.form; return f.length ? f.reduce((s,x)=>s+x, 0)/f.length : 6.6; }
function mcFormLabel(v){ return !S.cond.form.length ? "No games yet" : v>=7.4 ? "On fire" : v>=7 ? "Good" : v>=6.5 ? "Steady" : v>=6.1 ? "Patchy" : "Poor"; }
// chance the manager starts you: his trust, how you compare with the squad, your form and how tired you are
function mcStartChance(f){
  const c = S.cond, our = S.mc.club;
  let p = selectShare(our) * logistic((mcOvr() - strOf(our))/3.5 + 1.2) + (mcFormAvg()-6.6)*.25 - (c.fat>75 ? .25 : c.fat>60 ? .1 : 0) + (f && f.cup && !f.big ? .1 : 0);
  if (S.loan) p = Math.max(p, .8);
  return clamp(p, .02, .97);
}
function mcStartLabel(p){ return p>=.85 ? "Nailed-on starter" : p>=.6 ? "Usually starts" : p>=.35 ? "In and out of the side" : p>=.15 ? "Mostly on the bench" : "Out of the picture"; }
function mcHurt(w){
  const tier = Math.random()<.6 ? "small" : Math.random()<.8 ? "minor" : "medium", inj = makeInjury(tier, "train");
  inj.at = +mcFrac(w).toFixed(3);
  if (!S.inj || S.inj.season!==seasonLabel(S.season)) S.inj = {season:seasonLabel(S.season), list:[]};
  S.inj.list.push(inj);
  const weeks = Math.max(1, Math.round(inj.red*S.mc.weeks.length*2));
  note(tier==="small" ? "warn" : "bad", `Injured in training: ${inj.name}`, `You'll be out for about ${weeks} week${weeks===1?"":"s"}. Hard sessions on tired legs make this more likely.`);
}
function mcTrain(w){
  const T = S.train, a = S.attr, c = S.cond, age = S.age, g = mcGrowth(age);
  if (mcInjury(mcFrac(w))){ c.fat = Math.max(0, c.fat-20); c.sharp = Math.max(20, c.sharp-6); }   // rehab
  else if (T.focus==="rest"){ c.fat = Math.max(0, c.fat-35); c.sharp = Math.max(20, c.sharp-5); }
  else {
    const m = (T.hard ? 1.6 : 1)*(S.boost && S.boost.double>0 ? 2 : 1);   // double training from the shop
    MC_ATTR.forEach(([k])=>{ a[k] += g*m*(k===T.focus ? 1 : T.focus==="prep" ? .1 : .2)*mcRoom(k); });
    if (T.focus==="prep") c.sharp = Math.min(100, c.sharp + (T.hard ? 10 : 7));
    c.fat = clamp(c.fat - (T.hard ? 5 : 15), 0, 100); c.sharp = Math.max(20, c.sharp-3);
    if (Math.random() < .005*(T.hard ? 2.2 : 1)*(1 + c.fat/45)*injuryAgeFactor(age)*(S.prone ?? 1)) mcHurt(w);
  }
  // past 30 the legs go first
  if (age>=30){ const d = (age-29)*.028; a.pac -= d; a.sta -= d*.8; a.fin -= d*.35; a.def -= d*.35; a.pas -= d*.2; }
  MC_ATTR.forEach(([k])=>{ a[k] = +clamp(a[k], 20, 99).toFixed(2); });
  if (S.boost && S.boost.double>0) S.boost.double--;
}
function mcSelect(f, w){
  const inj = mcInjury(mcFrac(w));
  if (inj) return {st:"inj", mins:0, why:inj.name};
  if (w < S.mc.intlTo) return {st:"intl", mins:0};
  if (Math.random() < mcStartChance(f)) return {st:"start", mins: S.cond.fat>85 || Math.random()<.18 ? 60 + Math.floor(Math.random()*25) : 90};
  // keepers almost never come off the bench
  return Math.random() < (S.player.pos==="GK" ? .03 : .55) ? {st:"sub", mins:10 + Math.floor(Math.random()*30)} : {st:"bench", mins:0};
}
function mcPoisson(l){ let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= Math.random(); } while (p>L); return k-1; }
function mcTieOn(f, r){
  if (!r || !r.alive) return false;
  if (f.eu && f.ri===-1) return r.next===null && r.gp===f.gi;
  if (f.gi!=null) return r.next===0 && r.gp===f.gi;
  return r.next===f.ri && (f.leg!==2 || (r.tie && r.tie.i===f.ri));
}
// who you're playing, and whether the manager picks you; false when a cup tie no longer happens
function mcSetup(f, w, specs){
  const our = S.mc.club, rec = mcRec(our);
  const r = f.code==="league" ? null : f.eu ? rec.eu : rec.cups[f.code];
  if (f.code!=="league"){
    if (!mcTieOn(f, r)){ f.skip = true; return false; }
    if (!f.opp){
      if (f.leg===2){ f.opp = r.tie.opp; f.oppStr = r.tie.str; f.home = !r.tie.home; }
      else {
        const o = f.eu ? shuffle(euroField(f.code, our)).slice(0, 2+f.ri).sort((x,y)=>y.str-x.str)[0] : specs[f.code].oppFor(f.gi!=null ? 0 : f.ri);
        f.opp = o.n; f.oppStr = o.str; f.home = Math.random()<.5;
      }
    }
  }
  if (f.oppStr==null) f.oppStr = strOf(f.opp);
  f.oppStr = +f.oppStr.toFixed(1);
  f.me = {...mcSelect(f, w), g:0, a:0, cs:false, r:null};
  return true;
}
// expected goals each way, and the chance each of your team's goals is yours (pG) or set up by you (pA)
function mcXg(f){
  const base = strOf(S.mc.club), pos = S.player.pos, a = mcA(), me = f.me, t = me.mins/90, fa = mcFormAvg();
  // you lift the team in proportion to how much better you are than it, and how long you're on the pitch
  const boost = clamp((mcOvr()-base)*.25*t + (me.mins ? (fa-6.6)*.5 : 0), -3, 4), att = MC_ATT[pos] ?? .5, ha = f.neutral ? 0 : f.home ? 1.5 : -1.5;
  // a team on a run plays with confidence; one on a losing streak doesn't
  const tf = mcTeamForm(S.mc.club).f, edge = tf*.8;
  const lf = 1.35*Math.exp((base + edge + boost*att + ha - f.oppStr)/20), la = 1.35*Math.exp((f.oppStr - base - edge - boost*(1-att) - ha)/20);
  // your goals and assists are a share of the team's, bigger the sharper your finishing and passing
  const [gs, as] = MC_SHARE[pos] || MC_SHARE.CM, w = mcWeights(), form = clamp(1 + (fa-6.6)*.1, .85, 1.15), damp = Math.sqrt(1.35/lf);
  const skill = k => clamp(1 + (a[k] - (base + 30*(w[k]-.2)))/20, .5, 1.6);
  return {base, lf, la, t, tf, pG:clamp(gs*t*form*damp*skill("fin"), 0, .7), pA:clamp(as*t*form*damp*skill("pas"), 0, .5)};
}
function mcPlay(f, w, specs){ if (mcSetup(f, w, specs)) mcResolve(f, w); }
// the result, simulated or (live) built from the key moments you played
function mcResolve(f, w, live){
  const our = S.mc.club, rec = mcRec(our), pos = S.player.pos, a = S.attr, c = S.cond, me = f.me, X = mcXg(f), t = X.t;
  const r = f.code==="league" ? null : f.eu ? rec.eu : rec.cups[f.code];
  let gf, ga;
  if (live){ gf = live.gf; ga = live.ga; me.g = live.g; me.a = live.a; me.og = live.og || 0; f.live = true; }
  else {
    gf = mcPoisson(X.lf); ga = mcPoisson(X.la);
    if (me.mins) for (let i=0;i<gf;i++){ const x = Math.random(); if (x<X.pG) me.g++; else if (x<X.pG+X.pA) me.a++; }
  }
  f.res = {gf, ga};
  if (me.mins){
    me.cs = me.mins>=60 && ga===0;
    const d = DEF.includes(pos) || pos==="CDM", win = gf>ga, loss = gf<ga;
    let rt = 6.35 + (mcOvr() - f.oppStr)*.02 + me.g*.95 + me.a*.6 + (me.cs && d ? .7 : 0) + (win ? .3 : loss ? -.3 : 0) - (d && ga>=3 ? .5 : 0)
      - Math.max(0, c.fat-60)/40*.6 + (c.sharp-60)/40*.35 + (live ? live.bonus + gauss()*.25 : gauss()*.5);
    if (me.st==="sub") rt = 6.3 + (rt-6.35)*.6;
    me.r = +clamp(rt, 3.5, 10).toFixed(1);
    c.form = c.form.concat(me.r).slice(-6);
    c.fat = clamp(c.fat + 13*t*(1 - (mcA().sta-55)/150)*(pos==="GK" ? .5 : 1), 0, 100); c.sharp = clamp(c.sharp + 9*t, 0, 100);
    MC_ATTR.forEach(([k])=>{ a[k] = +(a[k] + mcGrowth(S.age)*.08*t*mcRoom(k)).toFixed(2); });   // matches teach you too
    if (me.g>=3) note("good", `Hat-trick against ${f.opp}`, `${me.g} goals in a ${gf}–${ga} ${win?"win":loss?"defeat":"draw"}. Match rating ${me.r}.`);
  }
  mcAfter(f, r, rec, X.base);
}
// a played fixture moves the league record on, and decides cup and European ties
function mcAfter(f, r, rec, base){
  const {gf, ga} = f.res, pts = gf>ga ? 3 : gf===ga ? 1 : 0;
  (rec.form ||= []).push(pts===3 ? "W" : pts===1 ? "D" : "L"); if (rec.form.length>10) rec.form.shift();
  if (f.code==="league"){ const L = rec.lg; L.p++; L.gf += gf; L.ga += ga; if (pts===3) L.w++; else if (pts===1) L.d++; else L.l++; return; }
  r.games++;
  if (f.eu && f.ri===-1){ r.pts += pts; r.gp++; if (r.gp>=EURO[f.code].phase) mcEuPhaseEnd(r, EURO[f.code]); return; }
  if (f.gi!=null){ r.pts += pts; r.gp++; if (r.gp>=3){ if (r.pts>=4 || (r.pts===3 && Math.random()<.4)) r.next = 1; else mcOut(r, "Group stage", null, 0); } return; }
  if (f.leg===1){ r.tie = {i:f.ri, opp:f.opp, str:f.oppStr, gf, ga, home:f.home}; return; }
  let F = gf, A = ga; if (f.leg===2){ F += r.tie.gf; A += r.tie.ga; f.agg = [F, A]; }
  let through = F>A;
  if (F===A){ through = Math.random() < logistic((base - f.oppStr)/12); f.res.pens = through ? "won" : "lost"; }
  r.tie = null;
  if (!through){ mcOut(r, f.round, f.opp, f.ri); return; }
  r.beaten.push(f.opp); r.next++;
  if (r.next>=f.nr){ r.alive = false; r.won = true; }
}
function mcLive(f){
  if (f.code==="league") return true;
  const rec = mcRec(S.mc.club), r = f.eu ? rec.eu : rec.cups[f.code];
  return !!r && r.alive && (f.eu && f.ri===-1 ? r.next===null : f.gi!=null ? r.next===0 : r.next===f.ri);
}
// one week: training, then midweek ties, then the weekend. Every match you're picked for is played live as key
// moments (lvPlayMatch); each fixture is saved as it's decided, so closing the app mid-week picks up where it left off
async function mcWeek(live=true){
  const M = S.mc, wk = M.weeks[M.wi]; if (!wk || M.done) return;
  const specs = {}; cupSpecs(M.club).forEach(c=>{ specs[c.code] = c; });
  if (!wk.trained){ mcTrain(M.wi); wk.trained = true; }
  for (const f of wk.fx.slice().sort((x,y)=>(x.code==="league")-(y.code==="league"))){
    if (f.res || f.skip || !mcSetup(f, M.wi, specs)) continue;
    if (live && f.me.mins){
      save();
      try{ await lvPlayMatch(f, M.wi); } catch(err){ console.error(err); if (!f.res) mcResolve(f, M.wi); }   // never leave a match half-played
    } else mcResolve(f, M.wi);
  }
  M.wi++; if (M.wi>=M.weeks.length) M.done = true;
}
let mcBusy = false;
async function mcAdvance(kind){
  const M = S.mc; if (!M || M.done || mcBusy) return;
  mcBusy = true; M.from = M.wi;
  // "half" plays straight through to January (or May), opening every match you're in; the panel keeps up between weeks
  try{ do { await mcWeek(); if (kind==="half"){ save(); render(); } } while (kind==="half" && !M.done); }
  finally{ mcBusy = false; }
  save(); render();
}
// the half-season's numbers go to the same review as the manual form
function mcFinishHalf(){
  const M = S.mc; if (!M || !M.done || M.finished) return;
  const comps = {}; currentPlan().forEach(p=>{ comps[p.code] = {apps:0, g:0, a:0, cs:0, code:p.code}; });
  M.weeks.forEach(w=>w.fx.forEach(f=>{
    if (!f.me || !f.me.mins) return;
    const o = comps[f.code] ||= {apps:0, g:0, a:0, cs:0, code:f.code};
    o.apps++; o.g += f.me.g; o.a += f.me.a; if (f.me.cs) o.cs++;
  }));
  M.finished = true;
  tgHalfway();
  applyHalf(comps);
}

/* ---------- season end: results from the fixtures you played ---------- */
function mcLeagueTable(rows, our){
  const rec = mcRecIf(our), row = rows.find(r=>r.n===our);
  if (!rec || !row || !rec.lg.p) return;
  const L = rec.lg, t = tierOf(our), g = TIERS[t].games || L.p, base = strOf(our), tier = S.world.tiers[t];
  const avg = tier.reduce((s,n)=>s + strOf(n), 0)/tier.length;
  let pts = L.w*3 + L.d, gd = L.gf - L.ga;
  // games before a January move weren't played here, so they're simulated as before
  for (let k=L.p;k<g;k++){ const m = match(base, avg); pts += m; gd += m===3 ? 1 : m===0 ? -1 : 0; }
  row.pts = pts; row.gd = gd;
  rows.sort((a,b)=>b.pts-a.pts || b.gd-a.gd || Math.random()-.5); rows.forEach((r,i)=>{ r.pos = i+1; });
}
function mcKoOut(r){
  return r.won ? `Winners, beat ${r.beaten[r.beaten.length-1]} in the final` : r.reached==="Final" ? `Runners-up, lost the final to ${r.lostTo}` : `Reached the ${r.reached}, knocked out by ${r.lostTo}`;
}
function mcCupResult(our, c){
  const rec = mcRecIf(our), r = rec && rec.cups[c.code]; if (!r) return null;
  const base = strOf(our);
  while (r.alive && !r.won && r.next<c.rounds.length){
    const i = r.next, L = c.legs ? c.legs(i) : 1;
    if (c.group && i===0){ r.games += 3 - r.gp; r.gp = 3; r.next = 1; continue; }
    const o = r.tie && r.tie.i===i ? {n:r.tie.opp, str:r.tie.str} : c.oppFor(i); r.games += L - (r.tie && r.tie.i===i ? 1 : 0); r.tie = null;
    if (tie(base, o.str, L)){ r.beaten.push(o.n); r.next++; if (r.next>=c.rounds.length){ r.alive = false; r.won = true; } } else mcOut(r, c.rounds[i], o.n, i);
  }
  const res = {code:c.code, name:c.name, games:r.games, won:!!r.won, stage:r.won ? c.rounds.length : r.stage, beaten:r.beaten};
  if (r.won) return {...res, reached:"Winners", out:mcKoOut(r)};
  if (r.reached==="Group stage") return {...res, reached:"Group stage", out:"Out in the group stage"};
  return {...res, reached:r.reached, lostTo:r.lostTo, out:mcKoOut(r)};
}
function mcEuroResult(our, code){
  const rec = mcRecIf(our), r = rec && rec.eu; if (!r || r.code!==code) return null;
  const E = EURO[code], base = strOf(our), field = euroField(code, our);
  if (r.next===null && r.alive){ r.opps.slice(r.gp).forEach(o=>{ r.pts += match(base, o.str); r.games++; }); r.gp = E.phase; mcEuPhaseEnd(r, E); }
  if (r.reached==="League phase") return {code, name:E.name, games:r.games, won:false, stage:0, reached:"League phase", out:`Out in the league phase with ${r.pts} points`};
  while (r.alive && !r.won && r.next<KO_EU.length){
    const i = r.next, L = i===4 ? 1 : 2, o = r.tie && r.tie.i===i ? {n:r.tie.opp, str:r.tie.str} : shuffle(field).slice(0,2+i).sort((x,y)=>y.str-x.str)[0];
    r.games += L - (r.tie && r.tie.i===i ? 1 : 0); r.tie = null;
    if (tie(base, o.str, L)){ r.beaten.push(o.n); r.next++; if (r.next>=KO_EU.length){ r.alive = false; r.won = true; } } else mcOut(r, KO_EU[i], o.n, i);
  }
  return {code, name:E.name, games:r.games, won:!!r.won, stage:r.won ? KO_EU.length : r.stage, reached:r.won ? "Winners" : r.reached, lostTo:r.lostTo, beaten:r.beaten,
    out:`${r.pts} pts in the league phase${r.top8 ? " (top 8, straight to the last 16)" : ""}. ${mcKoOut(r)}`};
}

/* ---------- the panel ---------- */
function mcCompLabel(f){ return f.code==="league" ? TIERS[tierOf(S.mc.club)].short : compName(f.code); }
function mcMeLine(f){
  const me = f.me; if (!me) return "";
  const st = {start:"Started", sub:`Came on for ${me.mins}'`, bench:"Unused sub", inj:`Injured${me.why?` (${esc(me.why)})`:""}`, intl:"Away on international duty"}[me.st];
  if (!me.mins) return st;
  const bits = [me.g ? `<b>${me.g} goal${me.g>1?"s":""}</b>` : "", me.a ? `<b>${me.a} assist${me.a>1?"s":""}</b>` : "", me.og ? `${me.og} own goal${me.og>1?"s":""}` : "", me.cs && (DEF.includes(S.player.pos) || S.player.pos==="CDM") ? "clean sheet" : ""].filter(Boolean);
  return `${st}${bits.length ? " · " + bits.join(", ") : ""} · <span class="rt ${me.r>=7.5?"hi":me.r<6?"lo":""}">${me.r}</span>${f.coins!=null ? ` · <span class="coins sm"><i class="coin" aria-hidden="true"></i>${f.coins>=0?"+":""}${f.coins}</span>` : ""}`;
}
function mcFxRow(f, w){
  const done = !!f.res, wdl = done ? (f.res.gf>f.res.ga || f.res.pens==="won" ? "w" : f.res.gf<f.res.ga || f.res.pens==="lost" ? "l" : "d") : "";
  const opp = f.opp ? `${f.neutral ? "" : f.home ? "" : "at "}${esc(f.opp)}` : "Opponent to be drawn";
  const extra = done && f.agg ? ` · ${f.agg[0]}–${f.agg[1]} on aggregate` : "", pens = done && f.res.pens ? ` · ${f.res.pens==="won" ? "won" : "lost"} on penalties` : "";
  return `<div class="fx ${f.big?"big":""} ${done?"":"todo"}"><span class="fx-d">${mcDate(w, f)}</span>
    <span class="fx-o">${f.big?"★ ":""}${opp}<small>${esc(mcCompLabel(f))}${f.code!=="league" ? " · " + esc(f.round) + (f.leg ? `, leg ${f.leg}` : "") : f.home ? " · home" : ""}${extra}${pens}</small></span>
    <span class="fx-s ${wdl}">${done ? `${f.res.gf}–${f.res.ga}` : ""}</span>
    ${done ? `<span class="fx-me">${mcMeLine(f)}</span>` : ""}</div>`;
}
function mcPanel(){
  if (!S.mc || S.mc.key!==mcKey()) { mcBuild(); save(); }
  const M = S.mc, c = S.cond, a = S.attr, W = M.weeks.length, h = M.half;
  const list = []; M.weeks.forEach((wk,w)=>wk.fx.slice().sort((x,y)=>(x.code==="league")-(y.code==="league")).forEach(f=>{ if (!f.skip && (f.res || mcLive(f) || f.code==="league")) list.push([f,w]); }));
  const played = list.filter(([f])=>f.res), next = list.filter(([f])=>!f.res);
  const latest = played.filter(([,w])=>w>=M.from).slice(-6).reverse();
  const tot = {apps:0, g:0, a:0, cs:0, r:[]}; played.forEach(([f])=>{ if (f.me && f.me.mins){ tot.apps++; tot.g += f.me.g; tot.a += f.me.a; if (f.me.cs) tot.cs++; tot.r.push(f.me.r); } });
  const avgR = tot.r.length ? (tot.r.reduce((s,x)=>s+x, 0)/tot.r.length).toFixed(2) : "–";
  const fa = mcFormAvg(), pS = mcStartChance(), injNow = M.done ? null : mcInjury(mcFrac(M.wi));
  const tile = (l, v, sub, pct, cls="") => `<div class="total"><div class="label">${l}</div><div class="v">${v}</div>${sub?`<small>${sub}</small>`:""}${pct!=null?`<div class="meter ${cls}"><span style="width:${clamp(pct,0,100)}%"></span></div>`:""}</div>`;
  const T = S.train, a0 = S.attr0 && S.attr0.s===seasonLabel(S.season) ? S.attr0 : null;
  const focusHint = T.focus==="rest" ? "Rest: no growth this week, but you recover fitness fast."
    : T.focus==="prep" ? "Match prep: sharpens you for the coming games, with little attribute growth."
    : `${mcAttrName(T.focus)} grows fastest, the rest a little.`;
  const ageHint = S.age<=20 ? "At your age training pays off fast." : S.age<=26 ? "Steady gains if you keep at it." : S.age<=29 ? "Gains are small now." : "Past 30, training slows your decline.";
  const showCS = DEF.includes(S.player.pos), bigNext = !M.done && M.weeks[M.wi].fx.some(f=>f.big && mcLive(f));
  return `<section class="panel" id="actionPanel">
    <div class="row" style="justify-content:space-between"><h2 style="margin:0">${seasonLabel(S.season)} · ${esc(M.club)}</h2><span class="pill ${h===1?"":"eu"}">${h===1?"Part 1 · August to December":"Part 2 · January to May"}</span></div>
    <p class="hint" style="margin-top:8px">${M.done ? `All ${W} weeks played.` : `Week ${M.wi+1} of ${W} · ${mcDate(M.wi)}.`} Pick a training focus, then tap <strong>Play next week</strong>.</p>
    <p class="hint" style="margin-top:4px">In every match you're picked for, you play your key moments: ${S.player.pos==="GK" ? "saves" : DEF.includes(S.player.pos) ? "tackles, blocks and the odd chance" : "shots, passes and the odd tackle"}. Your attributes, form, sharpness and fitness decide whether the manager picks you and how forgiving they are.</p>
    <div class="meter" style="margin-top:8px"><span style="width:${Math.round(M.wi/W*100)}%"></span></div>
    <div class="row tf-row"><span class="label">Team form</span>${mcFormPills(mcTeamForm(M.club).L)}</div>
    ${injNow ? `<p class="ref bad" style="margin-top:12px"><strong>Injured: ${esc(injNow.name)}.</strong> You'll miss games until you're fit again. Training this week is rehab.</p>` : ""}
    ${!M.done && M.wi<M.intlTo ? `<p class="ref" style="margin-top:12px">Away on international duty for the first ${M.intlTo} weeks of the half.</p>` : ""}
    <div class="mc-tiles">
      ${tile("Overall", mcOvr(), `${mcPotLabel()}`)}
      ${tile("Form", c.form.length ? fa.toFixed(1) : "–", mcFormLabel(fa), c.form.length ? (fa-5.6)/2*100 : null)}
      ${tile("Sharpness", Math.round(c.sharp), c.sharp>=75 ? "Match sharp" : c.sharp>=50 ? "Getting there" : "Rusty", c.sharp)}
      ${tile("Fitness", Math.round(100-c.fat), c.fat>75 ? "Exhausted" : c.fat>55 ? "Tired" : "Fresh", 100-c.fat, "trust")}
      ${tile("Selection", Math.round(pS*100)+"%", mcStartLabel(pS), pS*100)}
    </div>
    ${M.done ? `<div class="ref" style="margin-top:16px"><strong>${h===1 ? "That's the first half of the season done." : "That's the season done."}</strong> ${tot.apps} appearances, ${tot.g} goals and ${tot.a} assists${showCS?`, ${tot.cs} clean sheets`:""}, average rating ${avgR}.</div>
      <div class="mc-actions"><button class="btn primary big" data-act="mc-finish">${h===1 ? "Go to the January window" : "See how the season ended"}</button></div>`
    : `<div class="row" style="justify-content:space-between;margin-top:18px"><h3 style="margin:0">Training this week</h3><button type="button" class="btn small" data-shop="open"><i class="coin" aria-hidden="true"></i> Shop</button></div>
      ${S.boost && S.boost.double>0 ? `<p class="hint" style="margin:6px 0 0"><span class="pill gold">Double training</span> ${S.boost.double} week${S.boost.double===1?"":"s"} left</p>` : ""}
      <div style="height:10px"></div>
      <div class="chips" role="group" aria-label="Training focus" style="margin:0 0 10px">${MC_TRAIN.map(([k])=>`<button type="button" class="chip ${T.focus===k?"on":""}" data-act="mc-focus" data-k="${k}" aria-pressed="${T.focus===k}">${esc(mcAttrName(k))}</button>`).join("")}</div>
      ${T.focus!=="rest" ? `<div class="seg mc-int" role="group" aria-label="Intensity"><button type="button" data-act="mc-hard" data-k="0" aria-pressed="${!T.hard}">Normal</button><button type="button" data-act="mc-hard" data-k="1" aria-pressed="${!!T.hard}">Hard</button></div>` : ""}
      <p class="hint" style="margin-top:8px">${focusHint} ${T.focus!=="rest" ? (T.hard ? "Hard sessions grow you about 60% faster, but tire you and more than double the injury risk." : "Normal sessions are safe and let you recover.") : ""} ${ageHint}</p>
      <div class="mc-actions">
        <button class="btn primary" data-act="mc-week">${bigNext ? "Play next week · ★ big game" : "Play next week"}</button>
        <button class="btn" data-act="mc-half">${h===1 ? "Play to January" : "Play to the end of the season"}</button>
      </div>`}
    ${latest.length ? `<h3>Latest results</h3><div class="fxl">${latest.map(([f,w])=>mcFxRow(f,w)).join("")}</div>` : ""}
    ${!M.done && next.length ? `<h3>Coming up</h3><div class="fxl">${next.slice(0,3).map(([f,w])=>mcFxRow(f,w)).join("")}</div>` : ""}
    ${tgPanel()}
    <h3>This half so far</h3>
    <div class="totals">${[["Apps",tot.apps],["Goals",tot.g],["Assists",tot.a],...(showCS?[["Clean sheets",tot.cs]]:[]),["Avg rating",avgR]].map(([l,v])=>`<div class="total"><div class="label">${l}</div><div class="v">${v}</div></div>`).join("")}</div>
    <h3>Your attributes</h3>
    <div class="attrs">${MC_ATTR.map(([k])=>{ const d = a0 ? Math.round(a[k]-a0[k]) : 0, bt = mcBoot(), bn = bt && bt.k===k ? bt.n : 0;
      return `<div class="attr"><span>${esc(mcAttrName(k))}</span><div class="meter"><span style="width:${Math.min(99, a[k]+bn)}%"></span></div><span class="v">${Math.round(Math.min(99, a[k]+bn))}${bn ? `<small class="boot" title="From your boots">👟+${bn}</small>` : ""}${d ? `<small class="${d>0?"":"neg"}">${d>0?"+":""}${d}</small>` : ""}</span></div>`; }).join("")}</div>
    <p class="hint" style="margin-top:8px">Green and red show changes since the start of the season.${mcBoot() ? ` 👟 is the boost from your ${esc(shopBootName(mcBoot().k))}.` : " Buy boots in the shop to boost an attribute."} ${mcPotLabel()}.</p>
    <details class="ss" style="margin-top:14px"><summary><div class="ss-head"><span class="ss-club">All fixtures and results</span><span class="ss-fin">${played.length}/${list.length}</span></div></summary>
      <div class="ss-body"><div class="fxl">${list.map(([f,w])=>mcFxRow(f,w)).join("")}</div><p class="hint" style="margin-top:8px">★ marks the big games. Cup ties only appear while the team is still in the competition.</p></div></details>
    ${mcModeSwitch()}
  </section>`;
}
function mcAction(a, b){
  const k = b.dataset.k;
  if (a==="mc-week") mcAdvance("week");
  else if (a==="mc-half") mcAdvance("half");
  else if (a==="mc-finish") mcFinishHalf();
  else if (a==="mc-focus"){ S.train.focus = k; save(); render(); }
  else if (a==="mc-hard"){ S.train.hard = k==="1"; save(); render(); }
  else if (a==="mc-mode"){
    if (mcCanSwitch(k)){ S.modeSeason = {s:seasonLabel(S.season), m:k}; if (k==="manual" && S.tg && S.tg.s===seasonLabel(S.season)) S.tg = null; }   // no targets for a season you log by hand
    S.mode = k; save(); render();
  }
}
