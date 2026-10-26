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

- **Training.** Each week, pick a focus (finishing, passing, pace, defending or shot-stopping, stamina, match prep, or rest) and how hard to train. Hard training grows you faster but tires you and raises the injury risk. Young players grow fast, and over-30s fight decline.
- **Selection.** Whether you start, come off the bench or sit out depends on the manager's trust, how your overall rating compares with the squad, your form and how tired you are.
- **Matches.** Fixtures are simulated from your attributes, form, sharpness and fitness. Your goals and assists come out of the team's scorelines. ★ marks the big games.
- **Key moments.** In every match you're picked for you play the 2–4 moments that involve you, or 1 if you come off the bench:
  - **Shots:** pick a spot in the goal, then stop the power bar in the green.
  - **Passes:** tap the teammate who isn't marked before time runs out.
  - **Tackles and blocks:** tap when the attacker or the ball is in the green.
  - **Saves (keepers):** watch the shot and dive the right way.

  Your attributes, form and sharpness set how forgiving each one is, and better opponents have better keepers. The rest of the match is simulated around your moments, so the final score includes what you did. *Play next week* plays one week; *Play to January* plays straight through, match after match. To skip a game, tap *Sim the match* on its intro, or *Sim the rest* partway through.

  The first time a player meets key moments, and each kind of mini-game, a short card with a diagram explains how it works. *How to play* on any match's intro shows them again.
- **Gold coins.** Every match you play with key moments earns coins: a win is worth 50, a draw 10 and a defeat nothing; each goal adds 20 and each assist 15, and an own goal costs 10. Simmed matches earn nothing. Your total shows next to your name, and the full-time screen breaks down each match. Coins belong to the account, so they carry across careers, and they travel in backup files.
- **Shop.** Tap your coins at the top, or *Shop* in the match centre, to spend them:

  | Item | What it does | Cost |
  | --- | --- | --- |
  | Boots: Sniper, Maestro, Lightning, Rock (Safe-hands gloves for keepers) and Engine | +2 / +4 / +6 to finishing, passing, pace, defending (or shot-stopping) or stamina in every match. Wear one pair at a time; boots are kept on your account across careers | 250, then 450 to Silver and 800 to Gold |
  | Double training | Training gains doubled for 4 weeks | 250 |
  | Personal coach | +1 to your training focus now, up to 3 times a season | 400 |
  | Physio | Fitness back to 100 | 75 |
  | Sharpness drills | Sharpness back to 100 | 75 |
  | Injury treatment | Halves the time left on your current injury | 300 |

  The shop also sells **coin packs** for real money: 500 coins for £0.99 up to 15,000 for £14.99. Payments aren't connected yet, so for now tapping a pack just adds the coins, and the shop says so. To take real payments later, connect a provider (for example Stripe Checkout) in `shopCheckout()` in `shop.js` and set `SHOP_PAYMENTS` to `true`. Coins and accounts currently live only on the player's phone, so before charging money you'll also want online accounts, so paid coins can't be lost or edited.
- **Results count.** Your club's league points and cup runs come from these fixtures, and your half-season numbers feed the same reviews, transfer offers and awards as before.

- **Targets and clauses.** Each season the manager sets three targets: appearances, an output target for your position (goals, goals and assists, assists or clean sheets) and an average rating. Meeting them wins his trust, so you start more; missing them costs it. Time out injured is allowed for, and a January move brings new half-season targets. Your agent also adds clauses: hit a stretch number and a bigger club will bid for you in the summer, or make enough appearances and your wage goes up. Progress shows in the match centre, with inbox updates at the halfway point and at the end of the season.

Prefer to log a real FC career? Use *Enter your stats by hand* under the match centre. A season is played in one mode throughout, so switching mid-season takes effect the next season.

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
| `moments.js` | Key moments: the live match screen and its shot, pass, tackle/block and save mini-games |
| `targets.js` | The manager's season targets and your agent's clauses |
| `shop.js` | The shop: boots and training boosts bought with gold coins |
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
