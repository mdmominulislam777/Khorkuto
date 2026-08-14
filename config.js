/**
 * HIGHFY TV — Global Configuration
 * ---------------------------------------------------------------
 * Paste your real Sportmonks API token below. Never commit a real
 * token to a public repository — treat this file as a secret.
 *
 * Get a token at: https://www.sportmonks.com/
 * ---------------------------------------------------------------
 */

const CONFIG = {
  // Paste your Sportmonks API token here. Leave empty to disable live sports.
  SPORTMONKS_API_TOKEN: "",

  // Sportmonks base URL (football endpoint shown; see sportmonks.js for
  // how other sports are mapped). Change only if Sportmonks changes their API.
  BASE_URL: "https://api.sportmonks.com/v3",

  // All match times / dates shown in the app use this timezone.
  TIMEZONE: "Asia/Dhaka",

  // How often (in milliseconds) live event data is automatically refreshed.
  AUTO_REFRESH_INTERVAL: 30000,

  // App identity — used in Settings/About and Share.
  APP_NAME: "HIGHFY TV",
  APP_VERSION: "1.0.0",

  // Links used by the side drawer. Replace with your real links.
  LINKS: {
    TELEGRAM: "https://t.me/",
    WEBSITE: "https://example.com",
  },
};

// Freeze so runtime code can't accidentally mutate shared config.
Object.freeze(CONFIG.LINKS);
Object.freeze(CONFIG);
