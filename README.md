# Call Break

Scorekeeper and online multiplayer for a 4-player Call Break card game.

## Live app (full — scorekeeper + online play + voice)

**https://replace-talks-mails-jones.trycloudflare.com**

- **Play Online** — create a room, share the code, play with friends
- **Talk** button — voice chat in the room
- **Scorekeeper** — manual scoring at the table

> This link is served via a free Cloudflare tunnel. If it stops working, run `npm start` locally or deploy to Render (see below).

## Scorekeeper only (static backup)

https://runic-zenith-4g9srdc.shipstatic.com — scorekeeper works; online play does not.

## Local development

```bash
npm install
npm run dev:all
```

- App: http://localhost:5173
- Game server: http://localhost:3001

## Production (self-host)

```bash
npm install
npm run build
npm start
```

Open http://localhost:3001

## Permanent free deploy (Render)

1. Push this repo to GitHub
2. Sign up at https://render.com (free, no credit card)
3. New → Blueprint → connect repo → uses `render.yaml`
4. Your app will be at `https://call-break.onrender.com` (or similar)

## Play Online

1. Open the app → **Play Online**
2. Host creates a room and shares the 6-letter code
3. Three friends join with the code
4. Tap **Talk** to enable voice chat
5. Host starts when all 4 players are in the lobby

## Scoring

- If Won ≥ Call: `Call + ((Won − Call) × 0.1)`
- If Won < Call: `−Call`
- Won hands per round must total 13
- After 5 rounds: 1st collects, 2nd/3rd/4th pay (default 5/10/15)
- **Tied points**: payouts for shared ranks are averaged
