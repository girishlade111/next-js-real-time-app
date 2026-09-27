# Next.js Real-Time Sports Scoreboard

A real-time sports scoreboard app ("Tablero Deportivo") built with Next.js 15 and React. Open the **Control Panel** on one screen/window and the **Public Display** on another — every score, timer, and quarter update syncs in real time using the browser's `BroadcastChannel` / `localStorage` event bridge. No server or database required.

## Features

**Control Panel** (`/control`)
- Team name and score editing (+/- steppers)
- Game clock: countdown or count-up mode, configurable period duration
- Quarter/period tracker (quarters + overtime)
- Start / pause / reset controls
- Red-border "alert" toggle for emphasis
- Heartbeat that pushes state changes to all connected displays
- Connected-displays counter

**Public Display** (`/display`)
- Big, TV-friendly scoreboard view
- Auto-updates the moment the control panel changes anything
- Connection-loss recovery — re-reads the latest state from localStorage

## How the "real-time" works

There is no backend. The control panel writes the game state to `localStorage` on every change; `storage` events plus `BroadcastChannel` messages notify every open display window instantly. Perfect for local networks and venue setups where both views run in browsers on the same machine.

## Tech Stack

- **Framework:** Next.js 15 (App Router, static export)
- **UI:** React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **Icons:** lucide-react
- **Sync:** BroadcastChannel + localStorage storage events

## Quick Start

```bash
# install dependencies
npm install

# run the dev server
npm run dev
# open http://localhost:3000

# production build (static export to ./out)
npm run build

# serve the static build
npx serve out
```

**Demo:** open `http://localhost:3000/control` in one tab and `http://localhost:3000/display` in another — changes in the control tab appear on the display tab instantly.

## Project Structure

```
app/
  page.tsx            # home — links to control and display views
  control/page.tsx    # control panel (score editor, clock, quarters)
  display/page.tsx    # public display (read-only scoreboard)
  layout.tsx          # root layout
components/
  theme-provider.tsx  # dark/light theme
  ui/                 # shadcn/ui components (button, card, input, ...)
lib/utils.ts          # cn() utility
public/               # static assets
```

## Environment Variables

None required — everything runs client-side in the browser.

## Deployment

The app builds to a fully static export (`output: 'export'`, files in `./out`), so it can be hosted on any static host: GitHub Pages, Cloudflare Pages, Netlify, or any static file server.

> **Note:** `next.config.mjs` sets `basePath: '/next-js-real-time-app'` for deployment under a GitHub Pages project subpath. Remove `basePath` when deploying to a root domain or Vercel.

```bash
npm run build   # emits ./out
```

---

Built by Girish Lade — [ladestack.in](https://ladestack.in)
