/* ================= PLAY THE 90 (development) =================
   A whole match, top-down, for the mini-game lab only (lab.js): 11 against 11 on a full pitch, where you control
   just your own player and the other 21 play themselves. Put a finger down anywhere and drag, like a joystick, to
   run; with the ball, Pass finds the best-placed team-mate the way you're facing and Shoot pauses the match for the
   shot mini-game (moments.js: one-on-one, in the box or from range); without it, Call for it asks the man on the ball
   to find you, and Tackle goes in when you're close enough. The teams keep their shape and shift with the ball; the
   man on the ball dribbles, passes into open lanes and shoots; defenders press him. 90 minutes go by in the length
   you pick. Distances are in metres: the pitch is 68 wide and 105 long, you attack the goal at the top.
   Loaded after moments.js, before lab.js. */
const P9_W = 68, P9_L = 105, P9_GOAL = [30.34, 37.66];
// a 4-3-3 for the side attacking the top goal, with the ball on the centre spot: [x, y, position, number]
const P9_SHAPE = [[34, 101, "GK", 1], [57, 82, "RB", 2], [42, 86, "CB", 5], [26, 86, "CB", 6], [11, 82, "LB", 3], [34, 70, "CDM", 4],
  [47, 62, "CM", 8], [21, 62, "CM", 10], [57, 44, "RW", 7], [34, 40, "ST", 9], [11, 44, "LW", 11]];
const P9_YOU = {GK:0, RB:1, CB:2, LB:4, CDM:5, CM:6, CAM:7, RW:8, ST:9, LW:10};
// 90 minutes go by in a few, so everyone moves a quarter quicker than real players, and the chances are a little better
// the shorter the match (tempo: 1 for five minutes), so a short one still has its goals
const P9_PACE = 1.25;
const P9_DRAG = 7;   // how quickly a rolling ball slows, metres a second every second

/* ---------- the match's state ---------- */
function p9New(st, mins){
  const kit = lvKits(st), e = st.lab.ease, a = st.lab.a;
  const team = (side, them) => P9_SHAPE.map(([x, y, pos, num], i)=>{ const hx = them ? P9_W - x : x, hy = them ? P9_L - y : y;
    return {side, i, pos, num, hx, hy, x:hx, y:hy, vx:0, vy:0, fx:0, fy:them ? 1 : -1, cool:0, stun:0}; });
  const M = {us:team(0, false), them:team(1, true), ball:{x:P9_W/2, y:P9_L/2, vx:0, vy:0, owner:null, last:null, pass:null, shot:null},
    t:0, len:mins*60, score:[0, 0], half:1, kick:0, me:{g:0, a:0, sh:0, ps:0, pc:0, tk:0, tw:0, sv:0, touches:0}, msg:null, msgT:0, call:0, freeze:0, kickNext:0, hold:false, saveDue:null,
    kit, str:[1, clamp(1 - e*.6, .8, 1.2)], you:null, joy:null, key:{x:0, y:0}, done:false, lastPass:null, log:[],
    stat:{sh:[0, 0], pa:[0, 0], pc:[0, 0], pos:[0, 0]}, tempo:clamp(5.5/mins, .7, 2)};
  M.you = M.us[P9_YOU[st.lab.pos] ?? 9]; M.you.me = true;
  M.myName = typeof S!=="undefined" && S && S.player && !S.newing && S.player.name ? S.player.name : "You";   // for the scorers
  M.speedMe = (6.4 + (a.pac - 60)/40)*P9_PACE;   // your pace, in metres a second
  p9Kickoff(M, 0);
  return M;
}
const p9All = M => [...M.us, ...M.them];
const p9Mates = (M, p) => p.side ? M.them : M.us;
const p9Foes = (M, p) => p.side ? M.us : M.them;
const p9Dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// the goal a side is attacking (top for you, bottom for them)
const p9GoalY = side => side ? P9_L : 0;
// everybody back in their own half, the ball on the centre spot for the side kicking off
function p9Kickoff(M, side){
  p9All(M).forEach(p=>{ const own = p.side ? Math.max(p.hy, P9_L/2 + 2) : Math.min(p.hy, P9_L/2 - 2); p.x = p.hx; p.y = p.side ? Math.max(own, P9_L/2 + 1) : Math.min(own, P9_L/2 - 1); p.vx = p.vy = 0; p.stun = 0; });
  const taker = (side ? M.them : M.us)[9]; taker.x = P9_W/2; taker.y = P9_L/2 + (side ? -.5 : .5);
  Object.assign(M.ball, {x:P9_W/2, y:P9_L/2, vx:0, vy:0, owner:taker, last:taker, pass:null, shot:null});
  taker.cool = .8;
}
function p9Say(M, txt, s = 1.6){ M.msg = txt; M.msgT = s; }

/* ---------- the ball ---------- */
function p9Kick(M, p, tx, ty, speed, kind){
  const b = M.ball, d = Math.hypot(tx - p.x, ty - p.y) || 1;
  b.owner = null; b.last = p; b.x = p.x + (tx - p.x)/d*.9; b.y = p.y + (ty - p.y)/d*.9; b.vx = (tx - p.x)/d*speed; b.vy = (ty - p.y)/d*speed;
  b.pass = kind==="pass" || kind==="cross" ? {from:p, to:M._to || null, tried:new Set(), air:kind==="cross"} : null; M._to = null;
  p.cool = .5;
}
// a pass: aimed where the receiver's going (or into the space pt ahead of him), a little off for a poorer passer
function p9Pass(M, p, to, skill, pt){
  // weighted to arrive at a pace he can control (into space, nearly stopped), so it doesn't run on out of play
  const tgt = pt ? {x:pt[0], y:pt[1], vx:0, vy:0} : to, d0 = p9Dist(p, tgt), vEnd = pt ? 3 : 7, v0 = Math.sqrt(vEnd*vEnd + 2*P9_DRAG*d0);
  const lead = pt ? 0 : d0/((v0 + vEnd)/2), err = (1.4 - skill)*2.2;
  const tx = clamp(tgt.x + tgt.vx*lead + gauss()*err, 1, P9_W - 1), ty = clamp(tgt.y + tgt.vy*lead + gauss()*err, 1, P9_L - 1), d = Math.hypot(tx - p.x, ty - p.y);
  M._to = to; p9Kick(M, p, tx, ty, Math.sqrt(vEnd*vEnd + 2*P9_DRAG*d), "pass");
  if (p.side===0) M.lastPass = {from:p, to, t:M.t};
  M.stat.pa[p.side]++;
  if (p.me){ M.me.ps++; }
}
// a cross from a wide position to a team-mate in the box: in the air, and he goes for it with whoever's marking him
function p9Cross(M, p, to){
  const tx = clamp(to.x + gauss()*1.5, 8, P9_W - 8), ty = clamp(to.y + gauss()*1.5, 1, P9_L - 1), d = Math.hypot(tx - p.x, ty - p.y);
  M._to = to; p9Kick(M, p, tx, ty, Math.sqrt(36 + 2*P9_DRAG*d), "cross"); M.stat.pa[p.side]++;
  if (p.side===0) M.lastPass = {from:p, to, t:M.t};
  if (p.me) M.me.ps++;
}
// how open a pass to `to` is: no opponent near the line, and how much ground it gains
function p9Lane(M, p, to){
  const foes = p9Foes(M, p), dx = to.x - p.x, dy = to.y - p.y, L = dx*dx + dy*dy || 1;
  let open = 9;
  foes.forEach(f=>{ const t = clamp(((f.x - p.x)*dx + (f.y - p.y)*dy)/L, 0, 1), dd = Math.hypot(p.x + dx*t - f.x, p.y + dy*t - f.y); open = Math.min(open, dd); });
  return open;
}
// the best pass on: [team-mate, the space ahead of him to aim at (a ball in behind) or null], or [null, null]
function p9BestPass(M, p, dir){
  const gy = p9GoalY(p.side), up = p.side ? 1 : -1, foes = p9Foes(M, p); let best = [null, null], bs = -1e9;
  p9Mates(M, p).forEach(q=>{
    if (q===p || q.stun>0) return;
    const d = p9Dist(p, q); if (d<5 || d>42) return;
    const opts = [null];
    // a forward (or you) running in behind: the ball into the space ahead of him, if it's free
    if (["RW", "ST", "LW", "CAM"].includes(q.pos) || q.me){ const sx = clamp(q.x, 4, P9_W - 4), sy = clamp(q.y + up*9, 2, P9_L - 2); if (foes.every(f=>Math.hypot(f.x - sx, f.y - sy)>4.5)) opts.push([sx, sy]); }
    opts.forEach(pt=>{
      const t = pt ? {x:pt[0], y:pt[1]} : q, lane = p9Lane(M, p, t), gain = Math.abs(p.y - gy) - Math.abs(t.y - gy), space = Math.min(...foes.map(f=>Math.hypot(f.x - t.x, f.y - t.y)));
      let s = Math.min(lane, 4)*3 + gain*.5 + Math.min(space, 8)*.8 - d*.08 + (q.pos==="GK" ? -12 : 0) + (pt ? 2 : 0);
      if (dir){ const ang = Math.atan2(t.y - p.y, t.x - p.x) - Math.atan2(dir[1], dir[0]); s += Math.cos(ang)*9; }
      if (M.call>0 && q.me) s += 14;
      if (s>bs){ bs = s; best = [q, pt]; }
    });
  });
  return best;
}

/* ---------- shots ---------- */
// a computer player's shot: in or not, decided by the distance, the angle and the sides' strengths
function p9Shot(M, p){
  const gy = p9GoalY(p.side), d = Math.hypot(p.x - P9_W/2, p.y - gy), ang = Math.abs(p.x - P9_W/2)/Math.max(4, Math.abs(p.y - gy));
  const q = clamp(.4 - (d - 6)*.012 - ang*.06, .04, .5)*(p.header ? .8 : 1)*(p.side ? M.str[1] : 1/M.str[1])*M.tempo; p.header = false;
  const goal = Math.random()<q, onT = goal || Math.random()<.55, tx = goal ? P9_GOAL[0] + .6 + Math.random()*6.1 : onT ? P9_W/2 + gauss()*1.5 : (Math.random()<.5 ? P9_GOAL[0] - 1 - Math.random()*4 : P9_GOAL[1] + 1 + Math.random()*4);
  // you're in goal and it's on target: it's yours to save (the save mini-game), not the dice's
  if (p.side===1 && onT && M.you.pos==="GK" && !M.cpu){ M.saveDue = p; M.stat.sh[1]++; p.cool = .5; p9Say(M, "Shot!", .6); return; }
  p9Kick(M, p, tx, gy + (p.side ? 1.5 : -1.5), 30, "shot");
  M.ball.shot = {by:p, goal, onT, x:tx}; M.stat.sh[p.side]++;
  if (p.side===1) p9Say(M, "Shot!", .8);
}
// your shot: the match stops for the shot mini-game, from where you are
async function p9YouShoot(M, st){
  const p = M.you, d = Math.hypot(p.x - P9_W/2, p.y), inBox = p.y<16.5 && p.x>13.85 && p.x<54.15;
  if (d>34){ p9Say(M, "Too far out", 1); return; }
  const near = M.them.filter(f=>f.pos!=="GK" && f.y<p.y && Math.abs(f.x - p.x)<6).length;
  const v = !inBox ? "long" : near===0 && d<14 ? "oneonone" : "box";
  M.me.sh++; M.stat.sh[0]++; M.paused = true;
  const r = await lvShotCore(st, {q:clamp(1.1 - near*.08 - (d>20 ? .1 : 0), .6, 1)}, v, lvHead(st), {long:"Shot from range", oneonone:"Through on goal!", box:"Shot in the box"}[v]);
  if (r==="skip" || st.lab.quit){ M.done = true; return; }
  const gk = M.them[0];
  if (r.goal){ p9Goal(M, 0, p); }
  else if (r.big==="Over the bar" || r.big==="Hit the wall"){ p9Say(M, r.big, 1.2); p9Restart(M, gk, P9_W/2, 5.5); }
  else { p9Say(M, r.big, 1.2); p9Restart(M, gk, gk.x, gk.y); }
  M.paused = false; p9Draw(M, st, true);
}
// a shot at you in goal: the match stops for the save mini-game
async function p9YouSave(M, st, by){
  M.paused = true;
  const r = await lvGameSave(st, {min:p9Min(M), q:1, g:"save", v:"box"});
  if (r==="skip" || st.lab.quit){ M.done = true; return; }
  if (r.ok){ M.me.sv++; p9Say(M, r.big, 1.2); p9Restart(M, M.you, M.you.x, M.you.y); }
  else p9Goal(M, 1, by);
  M.paused = false; p9Draw(M, st, true);
}
function p9Goal(M, side, by){
  M.score[side]++;
  if (side===0){
    if (by && by.me){ M.me.g++; p9Say(M, "GOAL! You scored!", 2.2); }
    else p9Say(M, "GOAL!", 2);
    const lp = M.lastPass; if (lp && lp.from.me && by && !by.me && M.t - lp.t<10 && lp.to===by){ M.me.a++; p9Say(M, "GOAL! Your assist!", 2.2); }
    M.log.push(`${p9Min(M)}' ${by && by.me ? M.myName : `#${by ? by.num : "?"}`} scored`);
  } else { p9Say(M, "They score", 1.8); M.log.push(`${p9Min(M)}' They scored`); }
  Object.assign(M.ball, {owner:null, vx:0, vy:0, pass:null, shot:null, x:clamp(M.ball.x, P9_GOAL[0] + .5, P9_GOAL[1] - .5), y:side ? P9_L + .8 : -.8});
  p9All(M).forEach(p=>{ p.vx = p.vy = 0; });
  M.freeze = 1.6; M.kickNext = side ? 0 : 1;
}
// a goal kick, a save held, a throw-in: the ball to p, standing at (x, y)
function p9Restart(M, p, x, y){
  p.x = clamp(x, 0, P9_W); p.y = clamp(y, 0, P9_L);
  Object.assign(M.ball, {x:p.x, y:p.y, vx:0, vy:0, owner:p, last:p, pass:null, shot:null}); p.cool = .9;
}
const p9Min = M => Math.min(90, Math.floor(M.t/M.len*90));

/* ---------- one step of the match ---------- */
function p9Step(M, dt){
  M.t += dt; M.call = Math.max(0, M.call - dt); M.msgT = Math.max(0, M.msgT - dt);
  // a moment to take in a goal, or half time, then the kick-off
  if (M.freeze>0){ M.freeze -= dt; if (M.freeze<=0) p9Kickoff(M, M.kickNext); if (M.t<M.len) return; }
  if (M.half===1 && M.t>=M.len/2){ M.half = 2; p9Say(M, "Half time", 2); p9All(M).forEach(p=>{ p.vx = p.vy = 0; }); M.freeze = 2; M.kickNext = 1; return; }
  if (M.t>=M.len){ M.done = true; return; }
  const b = M.ball, carrier = b.owner;
  if (carrier) M.stat.pos[carrier.side] += dt;
  // each side's last defender (the one nearest the goal it defends), for keeping the forwards onside
  const line = def => { const L = (def ? M.them : M.us).filter(q=>q.pos!=="GK").map(q=>q.y); return def ? Math.min(...L) : Math.max(...L); };
  const press = carrier ? p9Foes(M, carrier).filter(q=>q.pos!=="GK" && q.stun<=0).sort((x, y)=>p9Dist(x, carrier) - p9Dist(y, carrier)).slice(0, 2) : [];
  const chase = !carrier && !b.shot ? [0, 1].map(sd=>(sd ? M.them : M.us).filter(q=>!q.stun).sort((x, y)=>p9Dist(x, b) - p9Dist(y, b))[0]) : [];
  // where everyone wants to be: their place in the shape, shifted with the ball; the side with it pushes on, and its
  // forwards make runs as far as the other side's last defender
  p9All(M).forEach(p=>{
    p.cool = Math.max(0, p.cool - dt); p.stun = Math.max(0, p.stun - dt);
    if (p.stun>0){ p.vx *= .8; p.vy *= .8; return; }
    if (p===carrier) return;
    if (p.me && !M.cpu && p9Input(M)) return;
    const has = carrier && carrier.side===p.side, up = p.side ? 1 : -1, fwd = ["RW", "ST", "LW"].includes(p.pos), mid = ["CM", "CDM", "CAM"].includes(p.pos);
    let tx = p.hx + (b.x - P9_W/2)*.35, ty = p.hy + (b.y - P9_L/2)*(p.pos==="GK" ? .06 : .55) + (has ? up*(fwd ? 16 : mid ? 10 : 6) : -up*3);
    if (has && fwd){ const l = line(1 - p.side); ty = p.side ? Math.min(ty, l) : Math.max(ty, l); tx += (p.hx - P9_W/2)*.25; }
    if (p.pos==="GK"){ const gy = p.side ? P9_L - 1 : 1; tx = P9_W/2 + (b.x - P9_W/2)*.18; ty = gy + (p.side ? -1 : 1)*clamp(Math.abs(b.y - gy)*.08, 1, 5); }
    let speed = 5*P9_PACE;
    // one presses the man on the ball, the next covers goal-side of him
    const k = press.indexOf(p);
    if (k===0){ tx = carrier.x; ty = carrier.y + (p.side ? -1.2 : 1.2); speed = 6.3*P9_PACE; }
    else if (k===1){ const gy = p9GoalY(1 - p.side), d = Math.hypot(P9_W/2 - carrier.x, gy - carrier.y) || 1; tx = carrier.x + (P9_W/2 - carrier.x)/d*6; ty = carrier.y + (gy - carrier.y)/d*6; speed = 5.6*P9_PACE; }
    // a pass to you: meet it on its way; a loose ball: the nearest on each side goes for it
    if (b.pass && b.pass.to===p){ const v2 = b.vx*b.vx + b.vy*b.vy || 1, t = clamp(((p.x - b.x)*b.vx + (p.y - b.y)*b.vy)/v2, 0, 2); tx = b.x + b.vx*t; ty = b.y + b.vy*t; speed = 7*P9_PACE; }
    else if (chase.includes(p)){ tx = b.x + b.vx*.3; ty = b.y + b.vy*.3; speed = 7*P9_PACE; }
    p9MoveTo(p, tx, ty, speed*(p.side ? M.str[1] : 1), dt);
  });
  // you, under your own control
  p9Steer(M, dt);
  // the man on the ball: dribble, pass or shoot
  if (carrier && (!carrier.me || M.cpu)) p9Carry(M, carrier, dt);   // M.cpu: your player plays himself too (for testing)
  // the ball itself
  if (b.owner){ const o = b.owner; b.x = o.x + o.fx*.8; b.y = o.y + o.fy*.8; b.vx = o.vx; b.vy = o.vy; }
  else {
    b.x += b.vx*dt; b.y += b.vy*dt; const sp = Math.hypot(b.vx, b.vy), ns = Math.max(0, sp - P9_DRAG*dt); if (sp>0){ b.vx *= ns/sp; b.vy *= ns/sp; }
    if (b.shot) p9ShotFly(M);
    else p9Loose(M);
    if (!M.ball.owner && !M.ball.shot) p9Out(M);
  }
  // a defender close to the man on the ball can win it
  if (b.owner){
    const o = b.owner;
    p9Foes(M, o).forEach(f=>{
      if (f.me || f.stun>0 || f.cool>0 || p9Dist(f, o)>1.5) return;
      f.cool = 1.1;
      const win = Math.random() < (o.me ? .3 : .24)*(f.side ? M.str[1] : 1/M.str[1]);
      if (win){ if (o.me) p9Say(M, "Tackled!", 1); Object.assign(b, {owner:f, last:f, pass:null}); o.stun = .5; f.cool = .4; }
    });
  }
}
function p9MoveTo(p, tx, ty, speed, dt){
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), v = d<.4 ? 0 : Math.min(speed, d*2.2);
  const ax = d ? dx/d*v : 0, ay = d ? dy/d*v : 0;
  p.vx += (ax - p.vx)*Math.min(1, dt*6); p.vy += (ay - p.vy)*Math.min(1, dt*6);
  p.x = clamp(p.x + p.vx*dt, -1, P9_W + 1); p.y = clamp(p.y + p.vy*dt, -1, P9_L + 1);
  if (Math.hypot(p.vx, p.vy)>.5){ const s = Math.hypot(p.vx, p.vy); p.fx = p.vx/s; p.fy = p.vy/s; }
}
// your joystick (or the arrow keys): where you're going and how fast; null when you've let go
function p9Input(M){
  if (M.joy && M.joy.on){ const m = Math.hypot(M.joy.dx, M.joy.dy); if (m>6) return [M.joy.dx/m, M.joy.dy/m, Math.min(1, m/48)]; return [0, 0, 0]; }
  const k = M.key; if (k.x || k.y){ const m = Math.hypot(k.x, k.y); return [k.x/m, k.y/m, 1]; }
  return null;
}
function p9Steer(M, dt){
  const p = M.you, i = p9Input(M); if (!i || p.stun>0) return;
  const hasBall = M.ball.owner===p, sp = M.speedMe*(hasBall ? .86 : 1)*i[2];
  p9MoveTo(p, p.x + i[0]*10, p.y + i[1]*10, sp, dt);
  if (!hasBall && i[2]===0){ p.vx *= .7; p.vy *= .7; }
}
// a computer player on the ball
function p9Carry(M, p, dt){
  if (p.cool>0){ p9MoveTo(p, p.x, p.y + (p.side ? 1 : -1)*2, 3*P9_PACE, dt); return; }
  const gy = p9GoalY(p.side), up = p.side ? 1 : -1, foes = p9Foes(M, p), skill = (p.side ? M.str[1] : 1);
  const near = foes.reduce((m, f)=>!m || p9Dist(f, p)<p9Dist(m, p) ? f : m, null), press = near ? p9Dist(near, p) : 99;
  const dGoal = Math.hypot(p.x - P9_W/2, p.y - gy), central = Math.abs(p.x - P9_W/2)<22;
  if (p.pos==="GK"){ const [to, pt] = p9BestPass(M, p); p9Pass(M, p, to || p9Mates(M, p)[5], .9*skill, pt); return; }
  if (p.side===0 && M.call>0 && !p.me && p9Lane(M, p, M.you)>1.6){ M.call = 0; p9Say(M, "He's found you", .9); p9Pass(M, p, M.you, .95*skill); return; }
  p.think = (p.think ?? 0) - dt;
  if (p.think<=0){
    p.think = .22 + Math.random()*.2;
    // a shot: close in and central, or with a little room from further out; straight away from a cross
    if (p.header && dGoal<20){ p9Shot(M, p); return; }
    if (central && (dGoal<20 || (dGoal<28 && press>1.8)) && Math.random()<(dGoal<12 ? .9 : dGoal<20 ? .65 : .4)){ p9Shot(M, p); return; }
    // wide in the last 25 metres: a cross to whoever's in the box
    if (Math.abs(p.y - gy)<25 && Math.abs(p.x - P9_W/2)>=16 && Math.random()<.55){
      const box = p9Mates(M, p).filter(q=>q!==p && q.pos!=="GK" && Math.abs(q.x - P9_W/2)<14 && Math.abs(q.y - gy)<17);
      if (box.length){ p9Cross(M, p, box[Math.floor(Math.random()*box.length)]); return; }
    }
    // a pass: a safe one under pressure, a forward one when there's a lane, now and then a ball in behind
    const [to, pt] = p9BestPass(M, p);
    if (to){
      const t = pt ? {x:pt[0], y:pt[1]} : to, lane = p9Lane(M, p, t), gain = Math.abs(p.y - gy) - Math.abs(t.y - gy);
      if ((press<2.8 && lane>1.6) || (press<6 && lane>2.4 && gain>3 && Math.random()<.5) || (pt && lane>2.4 && Math.random()<.35)){ p9Pass(M, p, to, .95*skill, pt); return; }
    }
  }
  // dribble on towards goal, swerving away from whoever's closest
  let tx = p.x + (P9_W/2 - p.x)*.2, ty = p.y + up*8;
  if (near && press<7) tx += Math.sign(p.x - near.x || 1)*(7 - press)*1.4;
  p9MoveTo(p, clamp(tx, 3, P9_W - 3), ty, 5.6*P9_PACE*skill, dt);
}
// a loose ball, or a pass on its way: whoever gets to it first
function p9Loose(M){
  const b = M.ball, sp = Math.hypot(b.vx, b.vy);
  let best = null, bd = 1e9;
  // a cross: nobody gets to it until it's at the man it's meant for, then it's him or his marker
  if (b.pass && b.pass.air){
    const to = b.pass.to; if (!to || p9Dist(to, b)>2.2) return;
    const mark = p9Foes(M, to).filter(f=>f.pos!=="GK" || p9Dist(f, to)<3).sort((x, y)=>p9Dist(x, to) - p9Dist(y, to))[0], pass = b.pass;
    if (mark && p9Dist(mark, to)<2.6 && Math.random()<.5){ Object.assign(b, {owner:null, last:mark, pass:null}); const away = mark.side ? 1 : -1; b.vx = gauss()*6; b.vy = -away*14; if (to.me) p9Say(M, "Headed clear", .9); return; }
    Object.assign(b, {owner:to, last:to, pass:null}); to.cool = 0; M.stat.pc[to.side]++; if (pass.from.me && to.side===0) M.me.pc++;
    if (!to.me || M.cpu){ to.think = 0; to.header = true; } else p9Say(M, "Cross on its way to you", .8);
    return;
  }
  p9All(M).forEach(p=>{
    if (p.stun>0 || (b.last===p && p.cool>0)) return;
    const d = p9Dist(p, b), reach = b.pass && b.pass.to===p ? (sp<10 ? 2.1 : 1.7) : p.pos==="GK" ? 1.8 : 1.05;
    if (d>reach) return;
    // a pass going by an opponent: he has a go at cutting it out, once
    if (b.pass && b.pass.from.side!==p.side && sp>8){ if (b.pass.tried.has(p)) return; b.pass.tried.add(p); if (Math.random()>.32) return; }
    if (d<bd){ bd = d; best = p; }
  });
  if (!best) return;
  const pass = b.pass;
  Object.assign(b, {owner:best, last:best, pass:null}); best.cool = .25;
  if (best.me){ M.me.touches++; if (pass && pass.from.side===0) p9Say(M, "On the ball", .6); }
  if (pass && pass.from.me){ if (best.side===0) M.me.pc++; else p9Say(M, "Intercepted", .9); }
  if (pass && pass.from.side===best.side) M.stat.pc[best.side]++;
}
// a shot on its way: in, saved, or wide when it reaches the line
function p9ShotFly(M){
  const b = M.ball, s = b.shot, gy = p9GoalY(s.by.side);
  if (Math.abs(b.y - gy)>1.2 && Math.hypot(b.vx, b.vy)>3) return;
  const gk = (s.by.side ? M.us : M.them)[0];
  b.shot = null;
  if (s.goal) return p9Goal(M, s.by.side, s.by);
  if (s.onT){ if (s.by.side===1) p9Say(M, "Saved!", .9); p9Restart(M, gk, gk.x, gk.y); }
  else { p9Restart(M, gk, P9_W/2, s.by.side ? 5.5 : P9_L - 5.5); }
}
// over a line: a throw-in, a goal kick or a corner
function p9Out(M){
  const b = M.ball, last = b.last || M.us[9];
  if (b.x<0 || b.x>P9_W){
    const side = 1 - last.side, x = b.x<0 ? 0 : P9_W, taker = (side ? M.them : M.us).filter(p=>p.pos!=="GK").sort((p, q)=>Math.hypot(p.x - x, p.y - b.y) - Math.hypot(q.x - x, q.y - b.y))[0];
    return p9Restart(M, taker, x + (x ? -.5 : .5), clamp(b.y, 1, P9_L - 1));
  }
  if (b.y<0 || b.y>P9_L){
    const top = b.y<0, defSide = top ? 1 : 0;   // the side defending that goal
    if (last.side===defSide){
      // a corner to the attackers
      const att = top ? M.us : M.them, taker = att[b.x<P9_W/2 ? 10 : 8], cx = b.x<P9_W/2 ? .5 : P9_W - .5, cy = top ? .5 : P9_L - .5;
      p9Restart(M, taker, cx, cy);
      if (!taker.me){ const box = att.filter(p=>p!==taker && Math.abs(p.y - cy)<20 && p.pos!=="GK"); const to = box[Math.floor(Math.random()*box.length)] || att[9]; p9Pass(M, taker, to, .8); }
      p9Say(M, "Corner", .8);
    } else { const gk = (top ? M.them : M.us)[0]; p9Restart(M, gk, P9_W/2, top ? 5.5 : P9_L - 5.5); }
  }
}

/* ---------- what you see ---------- */
const P9_DOT = 1.7;
function p9Pitch(){
  const line = "rgba(255,255,255,.55)";
  return `<rect x="-4" y="-4" width="${P9_W + 8}" height="${P9_L + 8}" fill="#195C33"/>${[...Array(10)].map((_, i)=>i%2 ? `<rect x="0" y="${i*10.5}" width="${P9_W}" height="10.5" fill="#1E6A3B"/>` : "").join("")}
    <g fill="none" stroke="${line}" stroke-width=".35"><rect x="0" y="0" width="${P9_W}" height="${P9_L}"/><path d="M0 ${P9_L/2}H${P9_W}"/><circle cx="${P9_W/2}" cy="${P9_L/2}" r="9.15"/>
      <rect x="13.85" y="0" width="40.3" height="16.5"/><rect x="24.85" y="0" width="18.3" height="5.5"/><rect x="13.85" y="${P9_L - 16.5}" width="40.3" height="16.5"/><rect x="24.85" y="${P9_L - 5.5}" width="18.3" height="5.5"/>
      <path d="M26.7 16.5a9.15 9.15 0 0 0 14.6 0M26.7 ${P9_L - 16.5}a9.15 9.15 0 0 1 14.6 0"/></g>
    <rect x="${P9_GOAL[0]}" y="-1.6" width="7.32" height="1.6" fill="rgba(255,255,255,.3)" stroke="#fff" stroke-width=".3"/><rect x="${P9_GOAL[0]}" y="${P9_L}" width="7.32" height="1.6" fill="rgba(255,255,255,.3)" stroke="#fff" stroke-width=".3"/>`;
}
function p9Token(p, kit){
  const c = p.side ? kit.them : kit.us, ink = lvLight(c) ? "#15171A" : "#FFFFFF";
  return `<g class="p9-p${p.me ? " me" : ""}" id="p9p${p.side}-${p.i}"><ellipse cx=".3" cy=".5" rx="${P9_DOT}" ry="${P9_DOT*.75}" fill="rgba(0,0,0,.35)"/>
    ${p.me ? `<circle r="${P9_DOT + 1.1}" fill="none" stroke="#F5C542" stroke-width=".55"/>` : ""}<circle r="${P9_DOT}" fill="${p.pos==="GK" ? lgKeeperKit(kit) : c}" stroke="rgba(0,0,0,.45)" stroke-width=".25"/>
    <path class="p9-dir" d="M0 -${P9_DOT + .2}l.8 -.9h-1.6z" fill="${p.me ? "#F5C542" : "rgba(255,255,255,.75)"}"/>
    <text y=".75" text-anchor="middle" font-size="2" font-weight="800" fill="${p.pos==="GK" ? "#15171A" : ink}" font-family="Barlow Condensed,sans-serif">${p.me ? "YOU" : p.num}</text></g>`;
}
// the match screen: drawn again after a shot mini-game has had the stage
function p9Draw(M, st, again){
  lvShow(`${lvHead(st)}<div class="lv-stage p9-stage"><svg viewBox="-3 -5 ${P9_W + 6} ${P9_L + 10}" aria-label="The match">${p9Pitch()}
      <line id="p9pass" stroke="#F5C542" stroke-width=".35" stroke-dasharray="1 1" opacity="0"/>
      ${[...M.us, ...M.them].map(p=>p9Token(p, M.kit)).join("")}
      <g id="p9ball"><circle r=".75" fill="#fff" stroke="#15171A" stroke-width=".25"/></g></svg>
      <div class="p9-score" aria-live="polite"></div><button type="button" class="p9-pause" aria-label="Pause">II</button><div class="p9-msg" aria-live="assertive"></div><div class="p9-joy" hidden><i></i></div></div>
    <div class="p9-btns"><button type="button" class="btn big p9-b2">Pass</button><button type="button" class="btn big primary p9-b1">Shoot</button></div>
    <p class="hint p9-help">Drag anywhere on the pitch to run. ${again ? "" : "Arrow keys and Space / Enter work too."}</p>`);
  p9Wire(M, st);
}
function p9Paint(M){
  const b = M.ball, $ = s => lvEl && lvEl.querySelector(s);
  p9All(M).forEach(p=>{ const g = $(`#p9p${p.side}-${p.i}`); if (!g) return; g.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    const d = g.querySelector(".p9-dir"); if (d) d.setAttribute("transform", `rotate(${(Math.atan2(p.fy, p.fx)*180/Math.PI + 90).toFixed(0)})`); g.classList.toggle("ball", b.owner===p); });
  $("#p9ball")?.setAttribute("transform", `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`);
  const ln = $("#p9pass"); if (ln){ const t = b.pass && b.pass.to; if (t && b.pass.from.side===0){ ln.setAttribute("x1", b.x); ln.setAttribute("y1", b.y); ln.setAttribute("x2", t.x); ln.setAttribute("y2", t.y); ln.setAttribute("opacity", .7); } else ln.setAttribute("opacity", 0); }
  const sc = $(".p9-score"); if (sc) sc.innerHTML = `<b>${M.score[0]}–${M.score[1]}</b><span>${p9Min(M)}'</span>`;
  const m = $(".p9-msg"), show = M.hold || M.msgT>0; if (m){ m.textContent = M.hold ? "Paused" : M.msgT>0 ? M.msg : ""; m.classList.toggle("on", show); }
  const pz = $(".p9-pause"); if (pz){ pz.textContent = M.hold ? "▶" : "II"; pz.setAttribute("aria-label", M.hold ? "Carry on" : "Pause"); }
  const has = b.owner===M.you, gk = M.you.pos==="GK", b1 = $(".p9-b1"), b2 = $(".p9-b2");
  if (b1 && b2){
    const near = !gk && b.owner && b.owner.side===1 && p9Dist(M.you, b.owner)<2.4;
    b1.textContent = has ? (gk ? "Long kick" : "Shoot") : gk ? "In goal" : "Tackle"; b1.disabled = !has && !near; b1.classList.toggle("primary", has || near);
    b2.textContent = has ? "Pass" : M.call>0 ? "Calling…" : "Call for it"; b2.disabled = !has && (gk || !(b.owner && b.owner.side===0 && b.owner!==M.you));
  }
}
// the joystick, the buttons and the keys
function p9Wire(M, st){
  const stage = lvEl.querySelector(".p9-stage"), joy = lvEl.querySelector(".p9-joy"), knob = joy.firstElementChild;
  stage.addEventListener("pointerdown", ev=>{ if (ev.target.closest("button")) return; ev.preventDefault(); try{ stage.setPointerCapture(ev.pointerId); }catch(e){}
    const r = stage.getBoundingClientRect(); M.joy = {on:true, ox:ev.clientX, oy:ev.clientY, dx:0, dy:0}; joy.hidden = false; joy.style.left = `${ev.clientX - r.left}px`; joy.style.top = `${ev.clientY - r.top}px`; knob.style.transform = ""; });
  stage.addEventListener("pointermove", ev=>{ if (!M.joy || !M.joy.on) return; let dx = ev.clientX - M.joy.ox, dy = ev.clientY - M.joy.oy; const m = Math.hypot(dx, dy); if (m>48){ dx *= 48/m; dy *= 48/m; }
    M.joy.dx = dx; M.joy.dy = dy; knob.style.transform = `translate(${dx}px,${dy}px)`; });
  const up = () => { if (M.joy) M.joy.on = false; joy.hidden = true; };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  lvEl.querySelector(".p9-b1").addEventListener("click", ()=>p9Act(M, st, 1));
  lvEl.querySelector(".p9-pause").addEventListener("click", ()=>{ if (!M.paused) M.hold = !M.hold; p9Paint(M); });
  lvEl.querySelector(".p9-b2").addEventListener("click", ()=>p9Act(M, st, 2));
}
function p9Act(M, st, k){
  if (M.paused || M.done) return;
  const b = M.ball, p = M.you;
  if (M.hold) return;
  if (b.owner===p && p.pos==="GK"){
    // in goal: a long kick up to the most open forward, or a short pass
    if (k===1){ const fw = M.us.filter(q=>["RW", "ST", "LW"].includes(q.pos)).sort((x, y)=>Math.min(...M.them.map(f=>p9Dist(f, y))) - Math.min(...M.them.map(f=>p9Dist(f, x))))[0]; return p9Pass(M, p, fw, .6 + st.lab.a.pas/250); }
    const [to, pt] = p9BestPass(M, p); if (to) p9Pass(M, p, to, .7 + st.lab.a.pas/200, pt); return;
  }
  if (b.owner===p){
    if (k===1) return p9YouShoot(M, st);
    const i = p9Input(M), [to, pt] = p9BestPass(M, p, i && i[2] ? [i[0], i[1]] : [p.fx, p.fy]);
    if (to) p9Pass(M, p, to, .7 + st.lab.a.pas/200, pt); return;
  }
  if (k===2){ if (b.owner && b.owner.side===0){ M.call = 2.5; p9Say(M, "Calling for it", .8); } return; }
  // a tackle: close enough, and it's down to your defending (and a bit of luck)
  const o = b.owner; if (!o || o.side!==1 || p9Dist(p, o)>2.4 || p.stun>0) return;
  M.me.tk++;
  if (Math.random() < .38 + (st.lab.a.def - 60)/150){ M.me.tw++; Object.assign(b, {owner:p, last:p, pass:null}); o.stun = .7; p9Say(M, "Won it!", .9); }
  else { p.stun = .7; p9Say(M, "Missed the tackle", .9); }
}

/* ---------- the lab's game ---------- */
async function p9Run(st){
  const len = await lvAsk(`<div class="lv-card lab-pre"><div class="lv-eye">Play the 90 · development</div><h2 class="lv-t">How long?</h2>
    <p>A whole match, 11 against 11. You're the ${esc(st.lab.pos)} with the gold ring: drag anywhere to run, and use the buttons to pass, shoot, call for it and tackle. Your shots are played as the shot mini-game.</p>
    <div class="lv-row">${[3, 5, 8].map(n=>`<button type="button" class="btn ${n===5 ? "primary" : ""} big" data-lv="${n}">${n} minutes</button>`).join("")}</div></div>`);
  if (st.lab.quit || !/^\d+$/.test(len)) return "skip";
  const M = p9New(st, +len);
  st.lab.tally = "";
  p9Draw(M, st);
  const off = lgKeys(k=>{
    const m = {ArrowLeft:[-1, 0], ArrowRight:[1, 0], ArrowUp:[0, -1], ArrowDown:[0, 1], a:[-1, 0], d:[1, 0], w:[0, -1], s:[0, 1]}[k];
    if (m){ if (m[0]) M.key.x = m[0]; if (m[1]) M.key.y = m[1]; return true; }
    if (k===" "){ p9Act(M, st, 1); return true; } if (k==="Enter" || k==="x"){ p9Act(M, st, 2); return true; }
    if (k==="p" || k==="Escape"){ if (!M.paused){ M.hold = !M.hold; p9Paint(M); } return true; }
  }, k=>{ if (["ArrowLeft", "ArrowRight", "a", "d"].includes(k)) M.key.x = 0; if (["ArrowUp", "ArrowDown", "w", "s"].includes(k)) M.key.y = 0; });
  try{
    await new Promise(res=>{
      let last = performance.now();
      const tick = now=>{
        if (st.lab.quit || !lvEl){ M.done = true; return res(); }
        const dt = Math.min(.05, (now - last)/1000); last = now;
        if (!M.paused && !M.hold){ p9Step(M, dt); p9Paint(M); if (M.saveDue){ const by = M.saveDue; M.saveDue = null; p9YouSave(M, st, by); } }
        if (M.done) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  } finally { off(); }
  if (st.lab.quit) return "skip";
  const [f, a] = M.score, me = M.me, win = f>a;
  const gk = M.you.pos==="GK", rt = clamp(6.3 + (f - a)*.25 + me.g*.95 + me.a*.6 + me.tw*.12 + me.pc*.03 - (me.ps - me.pc)*.04 + (gk ? me.sv*.35 - a*.25 + (a===0 ? .7 : 0) : 0), 3.5, 10).toFixed(1);
  return {ok:win, big:win ? `Won ${f}–${a}` : f===a ? `Drew ${f}–${a}` : `Lost ${f}–${a}`,
    small:gk ? `You: ${me.sv} save${me.sv===1 ? "" : "s"}, ${a} conceded${a===0 ? " (a clean sheet)" : ""}, ${me.pc}/${me.ps} passes · rating ${rt}` : `You: ${me.g} goal${me.g===1 ? "" : "s"}, ${me.a} assist${me.a===1 ? "" : "s"}, ${me.pc}/${me.ps} passes, ${me.tw}/${me.tk} tackles · rating ${rt}`,
    score:`${M.log.length ? M.log.join(" · ") : "No goals"} · shots ${M.stat.sh[0]}–${M.stat.sh[1]} · possession ${Math.round(M.stat.pos[0]/Math.max(1, M.stat.pos[0] + M.stat.pos[1])*100)}%`};
}
const LAB_P90 = [{id:"p90", t:"Play the 90", d:"A whole match, top-down, 11 against 11: you control your own player, the rest play themselves. Your shots are played as the shot mini-game.", cat:"full", ic:"move", help:"p90", run:p9Run}];
LV_HELP.p90 = {t:"Play the 90", steps:["A whole match, top-down, with you as the player in the gold ring. The other 21 play themselves.",
  "<b>Put your finger down anywhere and drag</b> to run, like a joystick: the further you drag, the faster you go. Let go and you take up your position again.",
  "With the ball: <b>Pass</b> finds the best-placed team-mate the way you're running, and <b>Shoot</b> stops the match for the shot mini-game.",
  "Without it: <b>Call for it</b> asks the man on the ball to pass to you, and <b>Tackle</b> goes in when you're close to their man on the ball."]};
