/**
 * HighFy TV - Sportmonks API Engine
 * Handles Data Fetching, Normalization, and Status Mapping
 */

class SportmonksService {
    constructor() {
        this.apiToken = CONFIG.SPORTMONKS_API_TOKEN;
        this.baseUrl = CONFIG.BASE_URL;
    }

    /**
     * Map Sportmonks State Shortcodes to App Internal Statuses
     */
    mapMatchStatus(stateCode) {
        if (!stateCode) return "upcoming";
        
        const code = stateCode.toUpperCase();

        // Live Match Statuses
        const liveCodes = ["INPLAY", "INPLAY_1ST_HALF", "INPLAY_2ND_HALF", "HT", "ET", "PEN_BREAK", "LIVE", "1ST_INNINGS", "2ND_INNINGS"];
        // Finished Match Statuses
        const finishedCodes = ["FT", "AET", "FT_PEN", "FINISHED", "CANCL", "POSTP"];

        if (liveCodes.includes(code)) return "live";
        if (finishedCodes.includes(code)) return "finished";
        return "upcoming";
    }

    /**
     * Fetch Football Fixtures & Live Scores
     */
    async fetchFootballEvents() {
        try {
            // Fetch live scores + today's fixtures with participating teams & league info
            const url = `${this.baseUrl}/football/fixtures?api_token=${this.apiToken}&include=participants;league;state&timezone=${CONFIG.TIMEZONE}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Sportmonks API Error: ${response.statusText}`);
            
            const result = await response.json();
            return this.normalizeFootballData(result.data || []);
        } catch (error) {
            console.error("Failed to fetch Football data from Sportmonks:", error);
            return [];
        }
    }

    /**
     * Fetch Cricket Fixtures & Live Scores
     */
    async fetchCricketEvents() {
        try {
            const url = `${this.baseUrl}/cricket/fixtures?api_token=${this.apiToken}&include=localteam;visitorteam;league;state&timezone=${CONFIG.TIMEZONE}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Sportmonks API Error: ${response.statusText}`);
            
            const result = await response.json();
            return this.normalizeCricketData(result.data || []);
        } catch (error) {
            console.error("Failed to fetch Cricket data from Sportmonks:", error);
            return [];
        }
    }

    /**
     * Format Football raw API response into standard HighFy Event Schema
     */
    normalizeFootballData(rawData) {
        return rawData.map(item => {
            const participants = item.participants || [];
            const team1Obj = participants[0] || {};
            const team2Obj = participants[1] || {};
            const stateCode = item.state ? item.state.short_name : "NS";
            const appStatus = this.mapMatchStatus(stateCode);

            // Format Match Time or Live Minute
            let timeOrTimer = "00:00";
            if (appStatus === "live") {
                timeOrTimer = item.minute ? `${item.minute}'` : "LIVE";
            } else if (item.starting_at) {
                const matchTime = new Date(item.starting_at);
                timeOrTimer = matchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return {
                id: `sm-fb-${item.id}`,
                sport: "Football",
                sportIcon: "⚽",
                tournament: item.league ? item.league.name : "Football League",
                team1: team1Obj.name || "Home Team",
                team1Flag: team1Obj.image_path ? `<img src="${team1Obj.image_path}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : "⚽",
                team2: team2Obj.name || "Away Team",
                team2Flag: team2Obj.image_path ? `<img src="${team2Obj.image_path}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : "⚽",
                status: appStatus,
                timeOrTimer: timeOrTimer,
                statusText: appStatus === "upcoming" ? `Starts at ${timeOrTimer}` : (appStatus === "finished" ? "Full Time" : "In Play"),
                isHot: appStatus === "live",
                streamUrls: item.stream_urls || []
            };
        });
    }

    /**
     * Format Cricket raw API response
     */
    normalizeCricketData(rawData) {
        return rawData.map(item => {
            const team1Obj = item.localteam || {};
            const team2Obj = item.visitorteam || {};
            const stateCode = item.state ? item.state.short_name : "NS";
            const appStatus = this.mapMatchStatus(stateCode);

            let timeOrTimer = "00:00";
            if (item.starting_at) {
                const matchTime = new Date(item.starting_at);
                timeOrTimer = matchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return {
                id: `sm-cr-${item.id}`,
                sport: "Cricket",
                sportIcon: "🏏",
                tournament: item.league ? item.league.name : "Cricket Series",
                team1: team1Obj.name || "Team A",
                team1Flag: team1Obj.image_path ? `<img src="${team1Obj.image_path}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : "🏏",
                team2: team2Obj.name || "Team B",
                team2Flag: team2Obj.image_path ? `<img src="${team2Obj.image_path}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : "🏏",
                status: appStatus,
                timeOrTimer: appStatus === "live" ? "LIVE" : timeOrTimer,
                statusText: appStatus === "upcoming" ? `Starts at ${timeOrTimer}` : (appStatus === "finished" ? "Match Ended" : "Live Score"),
                isHot: appStatus === "live",
                streamUrls: item.stream_urls || []
            };
        });
    }

    /**
     * Master Fetch Engine - Loads both Football & Cricket Data
     */
    async getAllEvents() {
        const [football, cricket] = await Promise.all([
            this.fetchFootballEvents(),
            this.fetchCricketEvents()
        ]);
        return [...football, ...cricket];
    }
}

// Global Export
window.sportmonksEngine = new SportmonksService();

