/* ================= THE LEAGUE, WEEK BY WEEK =================
   A season played in the match centre plays out your whole league, one round a week: every club meets every other
   home and away (and again in Scotland's 12-club league). Your matches come from the match centre; the rest are
   simulated from each club's strength, home advantage and form, and every club's XI (squads.js) gets the goals,
   assists and match ratings. So the table, the top scorers, the assists and the ratings all add up, and at the end of
   the season this table is the final one (lgFinalRows) instead of the season simulation's.
   Kept in S.lg = {s:season, L:{league key: {teams, G:games, r:rounds played, tab:{club:[P,W,D,L,GF,GA]},
   form:{club:"WDLWW"}, ps:{club:[[apps, goals, assists, rating total ×10] by place in the XI]}, me:[the same for you],
   meClub, last:{r, res:[[home, away, home goals, away goals]]}, prev:{club:position before the last round}}}}.
   Loaded before game.js; only called once the game is running. */
let lgTab = "table";

function lgGet(k){ return k!=null && S.lg && S.lg.s===seasonLabel(S.season) ? S.lg.L[k] || null : null; }
// a league this season, started if needed; a club that joins in January finds the first half already played
function lgEnsure(k){
  const T = TIERS[k]; if (!T || T.pool || !T.games) return null;
  const s = seasonLabel(S.season);
  if (!S.lg || S.lg.s!==s) S.lg = {s, L:{}};
  if (S.lg.L[k]) return S.lg.L[k];
  const teams = shuffle(S.world.tiers[k]), L = S.lg.L[k] = {teams, G:T.games, r:0, tab:{}, form:{}, ps:{}, me:[0,0,0,0], meClub:null, last:null, prev:null};
  teams.forEach(n=>{ L.tab[n] = [0,0,0,0,0,0]; L.form[n] = ""; });
  if (halfOf()===2){
    while (L.r < Math.floor(L.G/2)) lgRound(L, L.r);
    // a save from before the league was played out: its first-half results stand
    const rec = mcRecIf(S.club);
    if (rec && rec.lg.p && L.tab[S.club]){ const x = rec.lg; L.tab[S.club] = [x.p, x.w, x.d, x.l, x.gf, x.ga]; L.form[S.club] = (rec.form || []).slice(-5).join(""); }
  }
  return L;
}
// round R by the circle method: every n-1 rounds each club meets every other once, with home and away swapped the next time
function lgPairs(L, R){
  const ids = L.teams.map((_, i)=>i); if (ids.length%2) ids.push(-1);
  const n = ids.length, c = Math.floor(R/(n-1)), r = R%(n-1), rot = [ids[0], ...ids.slice(1).map((_, i)=>ids[1 + (i+r)%(n-1)])], out = [];
  for (let i=0;i<n/2;i++){
    let h = rot[i], a = rot[n-1-i];
    if ((i ? i : r)%2) [h, a] = [a, h];
    if (c%2) [h, a] = [a, h];
    if (h>=0 && a>=0) out.push([L.teams[h], L.teams[a]]);
  }
  return out;
}
function lgMatchOf(L, R, club){ const p = lgPairs(L, R).find(x=>x.includes(club)); return p ? {opp:p[0]===club ? p[1] : p[0], home:p[0]===club} : null; }
const lgPts = t => t[1]*3 + t[2];
function lgOrder(L){
  return L.teams.slice().sort((a,b)=>{ const x = L.tab[a], y = L.tab[b]; return lgPts(y)-lgPts(x) || (y[4]-y[5])-(x[4]-x[5]) || y[4]-x[4] || a.localeCompare(b); });
}
// a club's last five league results this season, from whichever league it's in
function lgFormList(club){
  const L = S.lg && S.lg.s===seasonLabel(S.season) ? Object.values(S.lg.L).find(x=>x.form[club]!=null) : null;
  return L ? L.form[club].split("") : [];
}
function lgCredit(L, club, list){
  const ps = L.ps[club] ||= SQ_SLOTS.map(()=>[0,0,0,0]);
  list.forEach((x,i)=>{ if (!x) return; const p = ps[i]; p[0]++; p[1] += x[0]; p[2] += x[1]; p[3] += Math.round(x[2]*10); });
}
// one side of a simulated match: its goals shared out across the XI (squads.js), and everyone's rating
function lgSide(L, club, gf, ga, oq){
  const xi = sqSquad(club), q = strOf(club), on = xi.map(()=>true), t = xi.map(()=>[0,0]);
  for (let k=0;k<gf;k++){ const s = sqPick(xi, on, 0, -1); t[s][0]++; if (Math.random()<.72) t[sqPick(xi, on, 1, s)][1]++; }
  lgCredit(L, club, xi.map((p,i)=>[t[i][0], t[i][1], sqRate(p.pos, q + p.r, oq, t[i][0], t[i][1], gf, ga)]));
}
function lgResult(L, club, gf, ga){
  const t = L.tab[club] ||= [0,0,0,0,0,0];
  t[0]++; t[gf>ga ? 1 : gf===ga ? 2 : 3]++; t[4] += gf; t[5] += ga;
  L.form[club] = ((L.form[club] || "") + (gf>ga ? "W" : gf===ga ? "D" : "L")).slice(-5);
}
// a round of matches, the same model as yours (mcXg): strength, home advantage and form decide the expected goals.
// `mine` is your match, already played: {h, a, hg, ag, club, det (sqMatch's numbers for both sides), me}
function lgRound(L, R, mine){
  const res = [], form = n => mcFormOf(lgFormList(n)).f;
  L.prev = Object.fromEntries(lgOrder(L).map((n,i)=>[n, i+1]));
  for (const [h, a] of lgPairs(L, R)){
    let hg, ag;
    if (mine && mine.h===h && mine.a===a){
      ({hg, ag} = mine);
      lgCredit(L, mine.club, mine.det[0]); lgCredit(L, mine.club===h ? a : h, mine.det[1]);
      const me = mine.me;
      if (me.mins){ const x = L.me; x[0]++; x[1] += me.g; x[2] += me.a; x[3] += Math.round(me.r*10); L.meClub = mine.club; }
    } else {
      const d = strOf(h) - strOf(a) + 1.5 + (form(h) - form(a))*.8;
      hg = mcPoisson(1.35*Math.exp(d/20)); ag = mcPoisson(1.35*Math.exp(-d/20));
      lgSide(L, h, hg, ag, strOf(a)); lgSide(L, a, ag, hg, strOf(h));
    }
    lgResult(L, h, hg, ag); lgResult(L, a, ag, hg);
    res.push([h, a, hg, ag]);
  }
  L.last = {r:R, res}; L.r = R+1;
}
// one of your league matches is over (mcResolve): the rest of its round is played around it
function lgOnResult(f, det){
  const L = lgGet(S.mc.lgk); if (!L || f.rd==null) return;
  while (L.r < f.rd) lgRound(L, L.r);
  if (L.r!==f.rd) return;
  const our = S.mc.club, [hg, ag] = f.home ? [f.res.gf, f.res.ga] : [f.res.ga, f.res.gf];
  lgRound(L, f.rd, {h:f.home ? our : f.opp, a:f.home ? f.opp : our, hg, ag, club:our, det, me:f.me});
}
// the end of a week (mcWeek): any round due by now that hasn't been played (a week your club has no league match) is
function lgWeekDone(M){
  const L = lgGet(M.lgk); if (!L || !M.lgr) return;
  const [R0, R1] = M.lgr, upTo = R0 + Math.min(R1-R0, Math.ceil((M.wi+1)*(R1-R0)/M.weeks.length));
  while (L.r < upTo) lgRound(L, L.r);
}
// the season's over: rounds nobody played (a league you left in January) are simulated, and this is the final table
function lgFinalRows(k){
  const L = lgGet(k); if (!L) return null;
  while (L.r < L.G) lgRound(L, L.r);
  return lgOrder(L).map((n,i)=>{ const t = L.tab[n]; return {n, pts:lgPts(t), gd:t[4]-t[5], pos:i+1}; });
}
function lgPosOf(club){ const L = lgGet(S.mc && S.mc.lgk); return L && L.r ? lgOrder(L).indexOf(club) + 1 : 0; }

/* ---------- top scorers, assists and ratings ---------- */
function lgPlayers(L){
  const out = [];
  L.teams.forEach(club=>{ const ps = L.ps[club]; if (ps) sqSquad(club).forEach((p,i)=>{ const x = ps[i]; if (x && x[0]) out.push({name:p.name, pos:p.pos, club, apps:x[0], g:x[1], a:x[2], avg:x[3]/10/x[0]}); }); });
  const m = L.me; if (m[0]) out.push({name:S.player.name, pos:S.player.pos, club:L.meClub || S.club, me:true, apps:m[0], g:m[1], a:m[2], avg:m[3]/10/m[0]});
  return out;
}
// the leaders in goals (g), assists (a) or average rating (avg; regular starters only), with shared ranks
function lgLeaders(L, k){
  const min = Math.max(3, Math.round(L.r*.4)), v = p => k==="avg" ? Math.round(p.avg*100) : p[k];
  const list = lgPlayers(L).filter(p=>k==="avg" ? p.apps>=min : p[k]>0).sort((x,y)=>v(y)-v(x) || x.apps-y.apps || y.avg-x.avg);
  list.forEach((p,i)=>{ p.rank = i && v(list[i-1])===v(p) ? list[i-1].rank : i+1; });
  return list;
}
// for the season's awards: are you the league's leader (or joint leader) in goals or assists?
function lgTop(L, k){ const m = L.me[k==="g" ? 1 : 2]; return m>0 && lgPlayers(L).every(p=>p.me || p[k]<=m); }
function lgSeasonNote(L, k){
  const g = lgLeaders(L, "g")[0], a = lgLeaders(L, "a")[0], r = lgLeaders(L, "avg")[0], mine = x => lgLeaders(L, x).find(p=>p.me);
  if (!g) return;
  const who = p => p.me ? "you" : `${p.name} (${p.club})`, you = ["g","a"].map(mine);
  note("info", `${TIERS[k].short}: the season's best`, `Golden Boot: ${who(g)} with ${g.g} goals. Most assists: ${a ? `${who(a)} with ${a.a}` : "nobody"}.`
    + `${r ? ` Best average rating: ${who(r)}, ${r.avg.toFixed(2)}.` : ""}${you[0] || you[1] ? ` You finished ${[you[0] ? `${ord(you[0].rank)} in the scoring charts` : "", you[1] ? `${ord(you[1].rank)} for assists` : ""].filter(Boolean).join(" and ")}.` : ""}`);
}

/* ---------- the table and the leaderboards ---------- */
function lgLegend(k){
  return `<div class="legend">${isTop(k) ? `<span><i class="z-ucl"></i>Champions League</span><span><i class="z-uel"></i>Europa League</span><span><i class="z-uecl"></i>Conference League</span>` : `<span><i class="z-up"></i>Promotion</span><span><i class="z-po"></i>Play-offs</span>`}<span><i class="z-rel"></i>Relegation</span></div>`;
}
// the table, or (mini) five rows around your club; ▲▼ show who moved in the last round
function lgTableHTML(L, k, mini){
  const order = lgOrder(L), n = order.length, at = order.indexOf(S.club), from = clamp(at-2, 0, Math.max(0, n-5));
  const rows = order.map((c,i)=>[c,i]).slice(mini ? from : 0, mini ? from+5 : n);
  const sw = c => `<span class="swatch" style="--c1:${meta(c).c1};--c2:${meta(c).c2}"></span>`;
  return `<div class="tablewrap"><table class="lt lg-t${mini ? " mini" : ""}"><thead><tr><th></th><th class="n">#</th><th>Club</th><th class="n">P</th>${mini ? "" : `<th class="n">W</th><th class="n">D</th><th class="n">L</th>`}<th class="n">GD</th><th class="n">Pts</th>${mini ? "" : `<th class="lg-fc">Form</th>`}</tr></thead><tbody>
    ${rows.map(([c,i])=>{ const t = L.tab[c], gd = t[4]-t[5], mv = L.prev && L.prev[c] ? L.prev[c]-(i+1) : 0;
      return `<tr class="${c===S.club ? "me" : ""}"><td class="z ${zoneOf(k, i+1, n)}"></td><td class="n">${i+1}</td>
        <td><span class="lg-club">${sw(c)}<span class="lg-cn">${esc(c)}</span>${mv ? `<i class="lg-mv ${mv>0 ? "up" : "down"}" aria-label="${mv>0 ? "Up" : "Down"} ${Math.abs(mv)}">${mv>0 ? "▲" : "▼"}</i>` : ""}</span></td>
        <td class="n">${t[0]}</td>${mini ? "" : `<td class="n">${t[1]}</td><td class="n">${t[2]}</td><td class="n">${t[3]}</td>`}<td class="n">${gd>0 ? "+" : ""}${gd}</td><td class="n"><b>${lgPts(t)}</b></td>
        ${mini ? "" : `<td class="lg-fc">${L.form[c].split("").map(x=>`<span class="tf sm ${x.toLowerCase()}">${x}</span>`).join("")}</td>`}</tr>`; }).join("")}
  </tbody></table></div>`;
}
function lgLeadersHTML(L, k){
  const list = lgLeaders(L, k), mine = list.findIndex(p=>p.me), min = Math.max(3, Math.round(L.r*.4));
  const row = p => `<li class="${p.me ? "me" : ""}"><span class="lg-rk">${p.rank}</span><span class="swatch" style="--c1:${meta(p.club).c1};--c2:${meta(p.club).c2}"></span>
    <span class="lg-who"><b>${esc(p.name)}${p.me ? " (you)" : ""}</b><small>${esc(p.club)} · ${p.pos} · ${p.apps} game${p.apps===1 ? "" : "s"}</small></span><span class="lg-v">${k==="avg" ? p.avg.toFixed(2) : p[k]}</span></li>`;
  if (!list.length) return `<p class="empty">${k==="avg" ? `Ratings show once players have ${min} games.` : "Nobody yet."}</p>`;
  return `<ol class="lg-lead">${list.slice(0, 10).map(row).join("")}${mine>=10 ? `<li class="lg-gap" aria-hidden="true">⋯</li>${row(list[mine])}` : ""}</ol>
    ${k==="avg" ? `<p class="hint" style="margin-top:8px">Average match rating, for players with at least ${min} games.</p>` : ""}`;
}
function lgResultsHTML(L){
  if (!L.last) return `<p class="empty">No results yet.</p>`;
  return `<p class="label" style="margin:0 0 6px">Matchweek ${L.last.r+1}</p><ul class="lg-res">${L.last.res.map(([h,a,hg,ag])=>`<li class="${h===S.club || a===S.club ? "me" : ""}"><span>${esc(h)}</span><b>${hg}–${ag}</b><span>${esc(a)}</span></li>`).join("")}</ul>`;
}
// the table with tabs for the leaderboards and the latest results; "final" leaves the table out (it's shown above it)
function lgBox(k, mode){
  const L = lgGet(k); if (!L) return "";
  const tabs = [...(mode==="final" ? [] : [["table","Table"]]), ["g","Scorers"], ["a","Assists"], ["avg","Ratings"], ...(mode==="final" || !L.last ? [] : [["res","Results"]])];
  const cur = tabs.some(t=>t[0]===lgTab) ? lgTab : tabs[0][0];
  const body = cur==="table" ? lgTableHTML(L, k) + lgLegend(k) : cur==="res" ? lgResultsHTML(L) : lgLeadersHTML(L, cur);
  return `<div class="lg-box" data-k="${k}" data-mode="${mode}"><div class="lg-tabs" role="group" aria-label="Show">${tabs.map(([v,l])=>`<button type="button" data-lgtab="${v}" aria-pressed="${v===cur}">${l}</button>`).join("")}</div>${body}</div>`;
}
document.addEventListener("click", e=>{
  const b = e.target.closest && e.target.closest("[data-lgtab]"), box = b && b.closest(".lg-box"); if (!box) return;
  lgTab = b.dataset.lgtab;
  const tmp = document.createElement("div"); tmp.innerHTML = lgBox(keyOf(box.dataset.k), box.dataset.mode);
  const next = tmp.firstElementChild; box.replaceWith(next);
  next.querySelector(`[data-lgtab="${lgTab}"]`)?.focus({preventScroll:true});
});
// the match centre's look at the league: where you are, five rows of the table, and the rest behind a tap
function lgPanel(){
  const k = S.mc.lgk, L = lgGet(k); if (!L || !L.r) return "";
  const order = lgOrder(L), at = order.indexOf(S.club), t = L.tab[S.club], g = lgLeaders(L, "g"), top = g[0], me = g.find(p=>p.me);
  return `<h3>${esc(TIERS[k].name)} · matchweek ${L.r}</h3>
    ${at>=0 ? `<p class="hint" style="margin-bottom:8px">${ord(at+1)} of ${order.length} with ${lgPts(t)} point${lgPts(t)===1 ? "" : "s"} from ${t[0]} game${t[0]===1 ? "" : "s"}.${top ? ` Top scorer: ${top.me ? "you" : `${esc(top.name)} (${esc(top.club)})`}, ${top.g}.` : ""}${me && !top.me ? ` You're ${ord(me.rank)} with ${me.g}.` : ""}</p>` : ""}
    ${lgTableHTML(L, k, true)}
    <details class="ss lg-more"><summary><div class="ss-head"><span class="ss-club">Full table, top scorers and ratings</span></div></summary><div class="ss-body">${lgBox(k, "panel")}</div></details>`;
}
// the full-time screen's look at the table after a league match, with a button for the rest
function lgFullTime(f){
  const L = f.code==="league" ? lgGet(S.mc.lgk) : null; if (!L) return "";
  return `<div class="lg-ft"><div class="lv-eye">${esc(TIERS[S.mc.lgk].name)} · matchweek ${L.r}</div>${lgTableHTML(L, S.mc.lgk, true)}
    <button type="button" class="btn" data-lv="table">Full table and top scorers</button></div>`;
}
