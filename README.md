# HIGHFY TV

A mobile-first, dark, premium Live TV web app. Real HLS playback, real
Sportmonks sports data, no fake anything.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell — header, drawer, tabs, player, sheets |
| `style.css` | All styling — dark theme, red accent, responsive |
| `script.js` | All app logic — rendering, player, favorites, search, sheets |
| `config.js` | Your Sportmonks token + app settings |
| `sportmonks.js` | Sportmonks API integration (real fixtures only) |
| `channels.json` | **Your channel list — edit this to add channels** |
| `categories.json` | Category list shown as chips |
| `events.json` | Not used to fake data — present only as an empty placeholder |

## Adding a channel

Open `channels.json` and add an entry — no JavaScript editing required:

```json
{
  "id": "channel-4",
  "name": "My Channel",
  "category": "sports",
  "logo": "https://example.com/logo.png",
  "url": "https://example.com/stream.m3u8",
  "language": "English",
  "country": "International",
  "quality": "HD"
}
```

- `id` must be unique.
- `category` must match one of the `id` values in `categories.json`
  (`sports`, `bangla`, `news`, `islamic`, `entertainment`, `movies`, `kids`,
  `international`, `music`), or add a new category there first.
- `url` must be a direct `.m3u8` link. If it's blank, the app tells the
  viewer no stream is set instead of trying to play it.

## Adding a category

Add an object to `categories.json`:

```json
{ "id": "documentary", "name": "Documentary", "icon": "film" }
```

It appears automatically as a chip — no code changes needed.

## Enabling live sports (Sportmonks)

1. Get a token at sportmonks.com for the sport(s) you want (football,
   cricket, basketball, tennis are each separate products/subscriptions).
2. Open `config.js` and paste it into `SPORTMONKS_API_TOKEN`.
3. That's it — the Events tab and the Cricket/Football drawer shortcuts
   start pulling real fixtures for the current day in `Asia/Dhaka` time.

**Important limitations, on purpose:**
- **WWE** has no Sportmonks endpoint (it's scripted entertainment, not a
  tracked sport) — the app says so plainly instead of inventing a
  schedule.
- **FIFA** is treated as football fixtures whose competition name
  contains "FIFA" or "World Cup" — it isn't a separate Sportmonks
  product.
- If your token doesn't include a sport's product, Sportmonks returns an
  error and the app shows "Live sports data unavailable" with a Retry
  button rather than fabricating matches.
- A match is only ever shown as **LIVE** when Sportmonks' own status
  field says so — never because the scheduled time has simply passed.

## Network Stream & Playlists

- **Network Stream** (side drawer): paste any `.m3u8` URL and play it
  immediately, without adding it to `channels.json`.
- **Playlists** (side drawer): paste an `.m3u`/`.m3u8` playlist URL. The
  app parses `#EXTINF` entries (name, `tvg-logo`, `group-title`) into
  playable channel cards. If the playlist host blocks cross-origin
  requests (CORS), you'll see a clear error instead of a broken screen —
  that's a server-side restriction on their end, not something a client
  app can bypass.

## Favorites & Settings

Both are stored in `localStorage` on the device, so they survive a
refresh but are local to that browser:
- `hfy_favorites` — array of favorited channel IDs
- `hfy_settings` — auto-refresh, low-quality mode

## Running it

This is a static app — any static file server works:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed URL on your phone or in a mobile-width browser
window. No build step, no bundler, no backend required.

## Player features

Play/pause, volume, mute, fullscreen, Picture-in-Picture (where the
browser supports it), retry-on-error, related channels, share (native
share sheet, falling back to copy-link), and favorite toggle — all in
the full-screen player opened by tapping any channel card.

## Notes on Telegram Mini App

If you deploy this inside a Telegram bot as a Mini App, Telegram's
`window.Telegram.WebApp` JS SDK (loaded separately in your bot's own
HTML wrapper) governs the native chrome (main button, theming, close
behavior). This app doesn't assume Telegram is present, so it runs
identically as a normal website or inside Telegram.
