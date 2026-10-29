# the-mobile-game
making the game accessible and downloadable on phones via just a link.

**English Footballing Pyramid** is a football career mode: build your player, then play from the National League to the Champions League. It started as a Claude artifact. This repo is a standalone version that runs on its own, with no Claude account needed.

- **One link to share.** Open it on any phone and you can play straight away in the browser.
- **Installs like an app.** Add it to the home screen. It opens full screen, has its own icon and works without signal.
- **Accounts.** Each player creates an account (a name and a password) the first time they open the game. Their career and Legacy save to that account automatically.
- **Free to host.** It's plain HTML, CSS and JavaScript on GitHub Pages: no server, no database, no build step.

## Put it online (one time)

1. Get these files onto the `main` branch (merge the pull request).
2. On GitHub, open the repo's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose **`main`** and **`/ (root)`**, then **Save**.
4. After a minute or two the game is live at:

   **https://joshboakye500-eng.github.io/the-mobile-game/**

That's the link to share. Every later push to `main` updates it, and players pick up the new version the next time they open the game with signal.

To try it before merging, pick this work's branch in step 3 instead of `main`, then switch back to `main` after merging.

## How a season plays

Each half-season is a **match centre**: a fixture list for your club (league, cups and Europe), played week by week.

Every club has its own badge, drawn from its colours, in the tables, fixture lists, the match centre and on the match screens. Players wear their club's kit (shirt, shorts and socks), the goal has a crowd and advertising boards behind it, and a goal you score or set up ends in a burst of confetti in your club's colours.

The match screens move: players run with their arms pumping, kick the ball when they pass or cross, jump for headers and throw their arms up when you score, while the crowd jumps with them. The keeper shifts his weight before a shot and dives for it, the ball curls, spins and bulges the net, and when you shoot your own boot swings through the ball in the colours of the pair you're wearing. Each new screen eases in, and so do the app's tabs, views and dialogs.

The Season screen keeps it short: this week's match (both badges, the competition and the ground) and the play buttons at the top, then your key numbers and this week's training, then tabs for recent results, the league table, your targets, your attributes and the full fixture list. *Stats*, *Club & leagues*, *Legacy*, the shop and the summer transfer window (offers, loans and the season report) are split into tabs the same way, transfer offers keep their negotiation folded away until you tap *Negotiate*, and on phones the header and your player card fold down to a single row (tap *Full profile* for the whole card).

- **Training.** Each week, pick a focus (finishing, passing, pace, defending or shot-stopping, stamina, match prep, or rest) and how hard to train. Hard training grows you faster but tires you and raises the injury risk. Young players grow fast, and over-30s fight decline.
- **Training drills.** Once a week you can do a drill for your training focus: shooting practice, a passing drill, sprint starts for pace, a tackling drill (shot-stopping for keepers), a beep test for stamina, or free kicks for match prep. They're quicker, easier versions of the match mini-games, plus two of their own. The better the session, the more that attribute grows on top of the week's training: a perfect score adds about the same again, and even players near their peak gain a little. Free kicks sharpen you instead.
- **Selection.** Whether you start, come off the bench or sit out depends on the manager's trust, how your overall rating compares with the squad, your form, how tired you are and how you train. He marks every week's training: good drills and hard sessions raise your chances of starting and of coming off the bench, and poor drills lower them. The match centre shows how he rates your training.
- **Minutes played.** Every match records the minutes you played and the minutes your team played while you were there. *Stats* shows the share for each season, and your average a season.
- **Matches.** Fixtures are simulated from your attributes, form, sharpness and fitness. Your goals and assists come out of the team's scorelines. ★ marks the big games.
- **Key moments.** Every match you're picked for is played as quick mini-games for the moments that involve you. A starter gets about 4: more against weaker teams and when your team is in form, fewer against the best (keepers the other way round). Off the bench you get 1 or 2. There are 12 mini-games, drawn by position (30 more are being tried out in the mini-game lab):
  - **Attack:** shots (one-on-ones, in the box, long range, free kicks over a wall), headers (tap as the rings meet), passes (pick the free man), take-ons (read the defender and go the other way), crosses (pick the free runner on his spot), and a three-step **attacking move** that ends in a shot or a square ball for an assist.
  - **Drag the ball:** shots, free kicks, passes, crosses and the square ball are played by dragging. For a shot, drag the ball up to your spot in the goal, hold while the power bar swings, and let go in the green. For a pass, cross or square ball, drag the ball towards the man you want and let go. Tapping still works too. The timing games (headers, tackles, saves and so on) stay as taps.
  - **Defence:** tackles and blocks (timing) and interceptions (read the passer's eyes).
  - **Keepers:** saves and penalties (react to the shot), claiming crosses (ring timing) and rushing out (wait for the heavy touch).

  The keeper you shoot at is their real number one, with his name and rating on the goal. He's as good as his level: a non-league keeper is much easier to beat than a Premier League one, and a poor keeper now and then gets a hand to it and still lets it in. Your teammates' chances are the same: they score more often against a weak keeper.

  Your attributes, boots, form and sharpness set how forgiving each one is. How many attacking or defending moments you get, and how good the chances are, follow how the match is going for your team. The rest of the match is simulated around your moments, so the final score includes what you did. *Play next week* plays one week; *Play to January* plays straight through. To skip a game, tap *Sim the match* on its intro, or *Sim the rest* partway through.
- **Team form.** Your team's last five results show in the match centre and before each match, next to your opponent's. A team on a run plays with more confidence, and you get more chances.
- **Squads and line-ups.** Every club has a starting XI of made-up players, named for the country it plays in, with shirt numbers and ratings built around the club's strength. Squads change gradually: each player stays a few seasons before someone new arrives. Before each match you see both line-ups on a pitch, each side's average rating and the opponent's key man. You take the place of the player in your position.
- **Player cards and your squad.** Tap any player in the top scorers, assists or ratings lists, on the line-ups pitch or in the transfer list to open their card: rating, age, nationality, how long they've been at the club (and who they were signed from, for how much), and their league games, goals, assists and average rating this season, with where they rank. Your own card links to your full profile. *Club & leagues → Squad* lists your club's XI with everyone's rating and season numbers.
- **Summer transfers.** Every summer the best players at smaller clubs can move up to bigger clubs that need them in their position, for a fee that fits their rating, age and the league they join; the selling club brings in someone new. Each league sells up to four players a summer. Your inbox gets the round-up (the biggest deal and any business at your club), and *Club & leagues* lists every deal in and out of the league you're looking at.
- **Roll of honour.** Each league's champions every season of your career, with the Golden Boot and Player of the Season for the seasons you played in it, and the English cups' winners, under *Club & leagues*. A player's card shows any of those awards they've won, and a signing's card shows the clubs they've played for.
- **The league, week by week.** Your whole league is played out one round a week alongside your fixtures: every club plays every other home and away. After each league match the full-time screen shows the table around you, with the full table, top scorers, assists, average ratings and the round's results a tap away. The same table and leaderboards are in the match centre and under *Club & leagues*. At the end of the season this table is the final one, and the Golden Boot and Playmaker awards go to the league's real leaders.
- **The cups, round by round.** In a match centre season the FA Cup, the League Cup, the EFL Trophy and the FA Trophy are played out in full: each round is a real draw among the clubs still in it and the clubs that join at that round (non-league first, the Football League next, the Premier League from the FA Cup's 3rd Round), so your opponent comes from the draw and the cup carries on after you're out. The match centre's *Cups* view shows where you are, the latest round's results and each cup's top scorers; your inbox gets the winners at the end of the season. Where the numbers don't divide, some clubs get a bye in an early round, never you. A cup tie against a club far below you counts the gap in quality only up to a point, so a giant expects about four goals rather than a dozen. Before the semi-finals the big clubs rest players against much weaker sides (and the small clubs raise their game), so early-round upsets happen. A season you started before this version keeps the old draws until it ends.
- **International tournaments, played.** When your country picks you for a summer tournament (World Cup, Euros, Copa América, Africa Cup of Nations, Asian Cup, Gold Cup), you play it game by game:
  - **The full field:** 48 nations at the World Cup, 24 at the Euros and so on, drawn into groups of four from seeding pots, with the hosts top seeds.
  - **Groups:** every group game is simulated alongside yours, with tables, and the best third-placed sides go through where the format needs them.
  - **Knockouts:** a seeded bracket, with extra time and penalties when it's level, all the way to a winner.
  - **Your games:** play the key moments or sim each match. How much you play follows your role (starter, bench or squad reserve).

  The tournament screen shows your next game, your results and ratings, your group, every group, the knockouts and the top scorers. Caps, a winner's medal, your value and the Ballon d'Or follow as before. The World Cup 2034 and other tournaments played mid-season are still simulated. With the Editor pen you can type in your own numbers instead, before the first game.
- **Europe, in full.** In a match centre season the Champions League, the Europa League and the Conference League are all played out, week by week:
  - **36 clubs each:** the game's own clubs that qualified, topped up with real clubs from the rest of Europe.
  - **A real league phase:** 8 matchdays (6 in the Conference League), with every other game simulated alongside yours and a full table. 1st to 8th go straight to the last 16, and 9th to 24th play a two-legged knockout play-off.
  - **A seeded bracket:** two legs a round, so 1st and 2nd can only meet in the final, which is a one-off at a neutral ground.

  The match centre's *Europe* view shows all three competitions: the table, the knockout draw and results, top scorers and recent winners. You can follow them even when your club isn't in Europe. Your inbox gets the winners at the end of the season. A season you started before this version keeps the old way until it ends.
- **Scorers and Player of the Match.** Every match shows who scored and set up the goals, and every player gets a match rating on the same scale as yours. The best rating on the pitch is Player of the Match, worth 25 extra gold coins when it's you.
- **Your rating matters.** Your season's average rating sits at the top of the match centre, on your card and on the full-time screen. Every rating moves your form and the manager's trust, a good game teaches you more than a poor one, and the season average counts for 40% of how your season is judged: your market value, transfer offers and the newspapers' verdict. The league's Player of the Season, Young Player of the Season and Team of the Season go to the best average ratings, and great ratings help your Ballon d'Or case.
- **Your output follows your team's.** Your goals and assists are your share of what your team scores, about what a teammate of the same quality in your position would get, plus a little more. A star at a top side scores like one; at a struggling side your numbers drop with the team's, and you lift them by being better than your teammates and playing your key moments well.

  The first time a player meets key moments, and each kind of mini-game, a short card with a diagram explains how it works. *How to play* on any match's intro shows them again.
- **Gold coins.** Every match you play with key moments earns coins: a win is worth 50, a draw 10 and a defeat nothing; each goal adds 20 and each assist 15, and an own goal costs 10. Simmed matches earn nothing. Your total shows next to your name, and the full-time screen breaks down each match. Coins belong to the account, so they carry across careers, and they travel in backup files.
- **Shop.** Tap your coins at the top, or *Shop* in the match centre, to spend them:

  | Item | What it does | Cost |
  | --- | --- | --- |
  | Boots: Sniper, Maestro, Lightning, Rock (Safe-hands gloves for keepers) and Engine | +2 / +4 / +6 to finishing, passing, pace, defending (or shot-stopping) or stamina in every match. Wear one pair at a time; boots are kept on your account across careers. Each pair has its own colours, with bronze, silver or gold studs to match its level, and the pair you wear shows on your card and in your attributes | 250, then 450 to Silver and 800 to Gold |
  | Double training | Training gains doubled for 4 weeks | 250 |
  | Personal coach | +1 to your training focus now, up to 3 times a season | 400 |
  | Physio | Fitness back to 100 | 75 |
  | Sharpness drills | Sharpness back to 100 | 75 |
  | Injury treatment | Halves the time left on your current injury | 300 |

  The shop also sells **coin packs** for real money: 500 coins for £0.99 up to 15,000 for £14.99. Payments aren't connected yet, so for now tapping a pack just adds the coins, and the shop says so. To take real payments later, connect a provider (for example Stripe Checkout) in `shopCheckout()` in `shop.js` and set `SHOP_PAYMENTS` to `true`. Coins and accounts currently live only on the player's phone, so before charging money you'll also want online accounts, so paid coins can't be lost or edited.

  **The Editor pen** (£5.99, in the shop's *Editor pen* tab) is yours to keep on the account. Only with it can you:
  - enter your season and tournament stats by hand;
  - edit your player whenever you like: every attribute and your potential, from the *Edit your player* button on your player card or under *Season → You*, with your overall worked out as you go.

  Without it, seasons are played in the match centre, and international tournaments are played game by game (below). Like the coin packs, it's free for now: tapping it just gives you the pen.
- **Results count.** Your club's league points and cup runs come from these fixtures, and your half-season numbers feed the same reviews, transfer offers and awards as before. Trophies are hard to win: one great player lifts a team only so far, and form swings matches less than it did. A big club wins about one trophy every season or two, as real ones do.

- **Targets and clauses.** Each season the manager sets three targets: appearances, an output target for your position (goals, goals and assists, assists or clean sheets) and an average rating. Meeting them wins his trust, so you start more; missing them costs it. Time out injured is allowed for, and a January move brings new half-season targets. Your agent also adds clauses: hit a stretch number and a bigger club will bid for you in the summer, or make enough appearances and your wage goes up. Progress shows in the match centre, with inbox updates at the halfway point and at the end of the season.

## Mini-game lab (development)

The **mini-game lab** is a development area for trying out mini-games: every one in one place, to play as often as you like. The 30 new games are only in the lab, never in matches or training, and nothing you play there touches your career, your coins or your saves.

It's hidden from players. To show it on a phone, open the Account menu and tap the *Game version* line at the bottom five times (or open the game once with `?dev` at the end of its address): a **Development** section appears in the menu with *Open the mini-game lab*. *Hide this section* (or five more taps) hides it again.

- Pick **Easy**, **Normal** or **Hard** at the top, and filter by *In matches*, *Training*, *New* or *Drag*.
- **In matches:** every key-moment game, with the shots and saves split up, 16 in all: one-on-ones, shots in the box and from range, free kicks, headers, passes, the attacking move, take-ons, crosses, tackles, blocks, interceptions, saves, penalty saves, claiming crosses and rushing out.
- **Training:** the sprint-start and beep-test drills.
- **New, lab only:** 20 games that aren't in matches yet: penalty shootout, keepy-uppy, crossbar challenge, nutmeg, target practice, dribble slalom, volley, through ball, switch the play, one-two, bicycle kick, chip the keeper, skill combo, race to the ball, offside trap, clear the cross, rondo, shield the ball, bend it (swipe a curling free kick) and air duel.
- **Drag, lab only:** 10 games played by dragging the ball or a player:
  - *Top bins:* drag onto a target in the goal and let go with the power in the green.
  - *Corner kick:* swipe a curling corner onto the free man's head, round the defender at the near post.
  - *Dribble drag:* drag your man past chasing defenders into the box.
  - *Through the gap:* drag a pass through a sliding back line.
  - *Fingertips:* drag yourself across the goal to save.
  - *Flick-ups:* keepy-uppy by swiping, steering the ball with each swipe.
  - *Chip it:* pull back like a slingshot to lob the keeper.
  - *Flick penalty:* the direction of your flick is the aim, its speed the height, with a Panenka.
  - *Block it:* drag into the line of a shot.
  - *Pass golf:* roll the ball round cones to a teammate in as few passes as you can.

Each game has a card with how to play it, a score at the end, and *Play again*.

**Legacy.** The *Hall of fame* ranks every career on the account by the stat you pick from the *Rank by* list, grouped into career, goals, trophies, country and money. Each row shows the player, where they are now, the stat you ranked by and their headline numbers. *Head to head* puts the top ten side by side.

**Legacy profiles.** Every career on the account is in *Legacy*: tap a player (or your own name on your card) for their profile, with their totals, average rating, Player of the Match awards, a career timeline, their trophies and every season's numbers, including minutes and rating.

Prefer to log a real FC career? With the Editor pen, use *Enter your stats by hand* under the match centre. A season is played in one mode throughout, so switching mid-season takes effect the next season. A save that was already entering stats by hand finishes that season that way, then goes back to the match centre unless you have the pen.

## Installing it on a phone

The game shows these steps on its first screen and in the **Account** menu.

- **Android (Chrome, Edge, Samsung Internet):** tap **Install the app** when it appears, or open the browser menu **⋮** and choose **Install app** or **Add to Home screen**.
- **iPhone / iPad (Safari, Chrome):** tap **Share**, then **Add to Home Screen**, then **Add**.

## How accounts work

Accounts live on the phone itself, so there's no email, no sign-up server and nothing to verify.

- A player picks a name and a password. The password is stored only as a salted hash (PBKDF2-SHA256).
- Each account keeps its own career and Legacy, so several people can share one phone.
- Players can change their password, sign out, or delete their account from the **Account** menu (tap their name in the header).
- **Moving to another phone:** in the Account menu, tap **Download backup**, then on the new phone create an account and tap **Load backup**.
- **Bringing a career over from the Claude version:** in the Claude artifact go to **Legacy → Your saves → Download backup**. Then load that file in this version from the Account menu, and tick *also replaces my current career* if you already have one.
- Passwords can't be reset, because nobody but the phone has the account. If a player forgets theirs, the sign-in screen lets them remove that account and start again.
- Deleting the browser's site data for the game, or uninstalling the app on some phones, deletes saves too. Backups are the safety net.

Players on different phones can't see each other's careers. That would need an online database, and a free one (for example Supabase or Firebase) can be added later if you want shared leaderboards or accounts that follow players between phones.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page: header, game area, app and phone settings |
| `game.js` / `game.css` | The game itself, taken from the artifact. Saving now goes to the signed-in account instead of Claude |
| `account.js` | Accounts, the sign-in screen, the Account menu and the install instructions |
| `matchcentre.js` | The match centre: fixtures, training, attributes, form, selection and match simulation |
| `moments.js` | Key moments: the live match screen, its mini-games, and the drawing and animation they share (players, ball, goal, crowd) |
| `labgames.js` | The 30 new mini-games (10 of them played by dragging), played only in the lab |
| `lab.js` | The mini-game lab under the Account menu's Development section |
| `squads.js` | Every club's starting XI, the line-ups before a match, scorers, match ratings, Player of the Match, player cards, the Squad view and the summer transfers between clubs |
| `league.js` | Your league played out week by week: the table, top scorers, assists, ratings and results, and the roll of honour |
| `tournament.js` | International tournaments played game by game: the field, the group draw and tables, the knockout bracket, your games with key moments, nations' kits and player names |
| `europe.js` | The Champions League, Europa League and Conference League played out in full: 36 clubs each, the league phase table, the knockout bracket, top scorers and winners |
| `cups.js` | The English cups played out in full: the draws, every tie, top scorers and the winners |
| `drills.js` | Weekly training drills: easier mini-games that grow your attributes and earn you game time |
| `crests.js` | Every club's badge, drawn from its colours |
| `targets.js` | The manager's season targets and your agent's clauses |
| `shop.js` | The shop: boots (and their icons) and training boosts bought with gold coins, coin packs, and the Editor pen with its player editor |
| `sw.js` | Offline support: keeps a copy of the game on the phone |
| `manifest.webmanifest`, `icons/` | App name, colours and home-screen icons |
| `fonts/` | The game's fonts (Big Shoulders Display, Barlow, Barlow Condensed), served from here under the SIL Open Font License |

## Making changes

Edit the files and push to `main`. When the network is good, phones fetch the newest versions of the game's files. If you **rename or remove** a file, also change `CACHE` in `sw.js` (for example to `"pyramid-v2"`) and update its file list, so phones drop the old copy.

To run it on your computer:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk works too, but without offline support.
