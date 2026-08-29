# Call Break

Scorekeeper and online multiplayer for a 4-player Call Break card game.

## Live app (scorekeeper only)

Static scorekeeper deployments do not include the online game server. For **Play Online**, run the full stack below or deploy to Render/Fly.

## Local development

```bash
npm install
npm run dev:all
```

- App: http://localhost:5173
- Game server: http://localhost:3001

## Production (scorekeeper + online play)

```bash
npm install
npm run build
npm start
```

Open http://localhost:3001 — serves the UI and WebSocket game server on one port.

## Play Online

1. Open the app and choose **Play Online**
2. Host creates a room and shares the 6-letter code
3. Three friends join with the code
4. Host starts when all 4 players are in the lobby
5. Bid your call, then play cards (spades are trump)

## Scoring

- If Won ≥ Call: `Call + ((Won − Call) × 0.1)`
- If Won < Call: `−Call`
- Won hands per round must total 13
- After 5 rounds: 1st collects, 2nd/3rd/4th pay (default 5/10/15)
- **Tied points**: payouts for shared ranks are averaged

## Deploy

**Render:** connect repo and use `render.yaml`

**Fly.io:** `fly launch` then `fly deploy`

**Static only:** `npm run deploy` (scorekeeper works; online play needs the Node server)
