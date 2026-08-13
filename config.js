/**
 * HighFy TV - Sportmonks API Configuration
 */

const CONFIG = {
    // আপনার আসল Sportmonks API Token এখানে বসান
    SPORTMONKS_API_TOKEN: "https://api.sportmonks.com/v3/football/teams/85?api_token=YOUR_TOKEN&include=upcoming.participants;upcoming.league",
    
    // Base URL for Sportmonks v3 API
    BASE_URL: "https://api.sportmonks.com/v3",
    
    // Default Sport Mode: 'football' or 'cricket'
    DEFAULT_SPORT: "football",
    
    // Auto Refresh Rate (milliseconds) - 30 seconds for live score updates
    AUTO_REFRESH_INTERVAL: 30000,
    
    // Default Timezone
    TIMEZONE: "Asia/Dhaka"
};
