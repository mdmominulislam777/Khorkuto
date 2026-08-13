# HighFy TV - Mobile-First Live TV & Sports Web App

HighFy TV is a complete, production-ready, mobile-first Web Application and Telegram Mini App designed for streaming Live TV channels and Sports events.

## 🌟 Features

- **Dynamic Central Data System**: Manage all channels, categories, and events purely via JSON files. No JavaScript editing required!
- **HLS.js Powered Player**: Seamless `.m3u8` video streaming with error recovery, fallback, and quality selection.
- **Telegram Mini App Ready**: Built-in support for `Telegram.WebApp` SDK.
- **PWA & Offline Capable**: Manifest and Service Worker support.
- **Zero Dependencies Backend**: Completely client-side and deployable directly to **GitHub Pages**.

---

## 🛠️ How to Manage Channels (No Coding Required)

**You do NOT need to edit `script.js` or `index.html` to add channels.**

### To Add or Edit Channels:
1. Open `channels.json`.
2. Copy and paste a channel object block.
3. Replace the `url` value with your M3U8 link.

```json
{
  "id": "my-channel-01",
  "name": "My Live Sports",
  "logo": "assets/logo.png",
  "category": "Sports",
  "subcategory": "Cricket",
  "country": "Bangladesh",
  "language": "Bangla",
  "type": "live",
  "status": "live",
  "url": "PASTE_YOUR_M3U8_URL_HERE",
  "quality": "HD",
  "description": "My Live HD Channel"
}
