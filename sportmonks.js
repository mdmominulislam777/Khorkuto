/**
 * HighFy TV - Sportmonks API Engine
 * Football + Cricket
 */

class SportmonksService {

    constructor() {
        this.apiToken =
            typeof CONFIG !== "undefined"
                ? CONFIG.SPORTMONKS_API_TOKEN
                : "";

        this.baseUrl =
            typeof CONFIG !== "undefined"
                ? CONFIG.BASE_URL
                : "https://api.sportmonks.com/v3";

        this.timezone =
            typeof CONFIG !== "undefined"
                ? CONFIG.TIMEZONE
                : "Asia/Dhaka";
    }


    // ==========================================
    // STATUS MAPPING
    // ==========================================

    mapMatchStatus(stateCode) {

        if (!stateCode) {
            return "upcoming";
        }

        const code =
            String(stateCode).toUpperCase().trim();


        const liveCodes = [
            "INPLAY",
            "INPLAY_1ST_HALF",
            "INPLAY_2ND_HALF",
            "HT",
            "ET",
            "PEN_BREAK",
            "LIVE",
            "1ST_INNINGS",
            "2ND_INNINGS",
            "BREAK",
            "INT"
        ];


        const finishedCodes = [
            "FT",
            "AET",
            "FT_PEN",
            "FINISHED",
            "CANCL",
            "CANCELLED",
            "POSTP",
            "POSTPONED"
        ];


        if (liveCodes.includes(code)) {
            return "live";
        }


        if (finishedCodes.includes(code)) {
            return "finished";
        }


        return "upcoming";
    }


    // ==========================================
    // TOKEN CHECK
    // ==========================================

    hasToken() {

        return (
            typeof this.apiToken === "string" &&
            this.apiToken.trim().length > 0
        );

    }


    // ==========================================
    // COMMON API REQUEST
    // ==========================================

    async request(endpoint, label = "API") {

        if (!this.hasToken()) {

            console.warn(
                `Sportmonks ${label}: API token is empty.`
            );

            return [];
        }


        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";


        const url =
            `${this.baseUrl}${endpoint}` +
            `${separator}api_token=${encodeURIComponent(this.apiToken)}`;


        try {

            console.log(
                `Sportmonks ${label}: requesting data...`
            );


            const response =
                await fetch(url);


            console.log(
                `Sportmonks ${label} HTTP status:`,
                response.status
            );


            const text =
                await response.text();


            let result;

            try {

                result =
                    text ? JSON.parse(text) : {};

            } catch (jsonError) {

                console.error(
                    `Sportmonks ${label}: Invalid JSON response`,
                    text
                );

                return [];

            }


            if (!response.ok) {

                console.error(
                    `Sportmonks ${label} API Error:`,
                    result
                );

                return [];

            }


            if (
                result &&
                result.message &&
                !result.data
            ) {

                console.warn(
                    `Sportmonks ${label}:`,
                    result.message
                );

            }


            return Array.isArray(result.data)
                ? result.data
                : [];

        } catch (error) {

            console.error(
                `Sportmonks ${label} Network Error:`,
                error
            );

            return [];

        }

    }


    // ==========================================
    // FOOTBALL LIVE
    // ==========================================

    async fetchFootballLive() {

        const data =
            await this.request(
                "/football/livescores",
                "Football Live"
            );


        return this.normalizeFootballData(data);

    }


    // ==========================================
    // FOOTBALL FIXTURES
    // ==========================================

    async fetchFootballFixtures() {

        const data =
            await this.request(
                "/football/fixtures/date/today" +
                "?include=participants;league;state" +
                `&timezone=${encodeURIComponent(this.timezone)}`,
                "Football Fixtures"
            );


        return this.normalizeFootballData(data);

    }


    // ==========================================
    // CRICKET FIXTURES
    // ==========================================

    async fetchCricketFixtures() {

        const data =
            await this.request(
                "/cricket/fixtures/date/today" +
                "?include=localteam;visitorteam;league;state" +
                `&timezone=${encodeURIComponent(this.timezone)}`,
                "Cricket Fixtures"
            );


        return this.normalizeCricketData(data);

    }


    // ==========================================
    // FOOTBALL NORMALIZER
    // ==========================================

    normalizeFootballData(rawData) {

        if (!Array.isArray(rawData)) {
            return [];
        }


        return rawData.map(item => {

            const participants =
                Array.isArray(item.participants)
                    ? item.participants
                    : [];


            const team1Obj =
                participants[0] || {};

            const team2Obj =
                participants[1] || {};


            const stateCode =
                item.state?.short_name ||
                item.state?.name ||
                "NS";


            const status =
                this.mapMatchStatus(
                    stateCode
                );


            let timeOrTimer =
                "TBD";


            if (status === "live") {

                timeOrTimer =
                    item.minute
                        ? `${item.minute}'`
                        : "LIVE";

            } else if (item.starting_at) {

                const date =
                    new Date(item.starting_at);


                timeOrTimer =
                    date.toLocaleTimeString(
                        "en-GB",
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: this.timezone
                        }
                    );

            }


            return {

                id:
                    `sm-fb-${item.id}`,

                sport:
                    "Football",

                sportIcon:
                    "⚽",

                tournament:
                    item.league?.name ||
                    "Football",

                team1:
                    team1Obj.name ||
                    "Home Team",

                team1Flag:
                    this.makeTeamLogo(
                        team1Obj.image_path,
                        "⚽"
                    ),

                team2:
                    team2Obj.name ||
                    "Away Team",

                team2Flag:
                    this.makeTeamLogo(
                        team2Obj.image_path,
                        "⚽"
                    ),

                status:
                    status,

                timeOrTimer:
                    timeOrTimer,

                statusText:
                    status === "live"
                        ? "In Play"
                        : status === "finished"
                            ? "Full Time"
                            : `Starts at ${timeOrTimer}`,

                isHot:
                    status === "live",

                streamUrls:
                    item.stream_urls || []

            };

        });

    }


    // ==========================================
    // CRICKET NORMALIZER
    // ==========================================

    normalizeCricketData(rawData) {

        if (!Array.isArray(rawData)) {
            return [];
        }


        return rawData.map(item => {

            const team1Obj =
                item.localteam ||
                item.local_team ||
                {};


            const team2Obj =
                item.visitorteam ||
                item.visitor_team ||
                {};


            const stateCode =
                item.state?.short_name ||
                item.state?.name ||
                "NS";


            const status =
                this.mapMatchStatus(
                    stateCode
                );


            let timeOrTimer =
                "TBD";


            if (
                status === "live"
            ) {

                timeOrTimer =
                    "LIVE";

            } else if (
                item.starting_at
            ) {

                const date =
                    new Date(item.starting_at);


                timeOrTimer =
                    date.toLocaleTimeString(
                        "en-GB",
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: this.timezone
                        }
                    );

            }


            return {

                id:
                    `sm-cr-${item.id}`,

                sport:
                    "Cricket",

                sportIcon:
                    "🏏",

                tournament:
                    item.league?.name ||
                    "Cricket",

                team1:
                    team1Obj.name ||
                    "Team A",

                team1Flag:
                    this.makeTeamLogo(
                        team1Obj.image_path,
                        "🏏"
                    ),

                team2:
                    team2Obj.name ||
                    "Team B",

                team2Flag:
                    this.makeTeamLogo(
                        team2Obj.image_path,
                        "🏏"
                    ),

                status:
                    status,

                timeOrTimer:
                    timeOrTimer,

                statusText:
                    status === "live"
                        ? "Live Score"
                        : status === "finished"
                            ? "Match Ended"
                            : `Starts at ${timeOrTimer}`,

                isHot:
                    status === "live",

                streamUrls:
                    item.stream_urls || []

            };

        });

    }


    // ==========================================
    // TEAM LOGO
    // ==========================================

    makeTeamLogo(imagePath, fallback) {

        if (!imagePath) {
            return fallback;
        }


        const safeUrl =
            String(imagePath)
                .replace(/"/g, "&quot;");


        return `
            <img
                src="${safeUrl}"
                alt=""
                style="
                    width:100%;
                    height:100%;
                    border-radius:50%;
                    object-fit:cover;
                "
                loading="lazy"
            >
        `;

    }


    // ==========================================
    // MASTER EVENT ENGINE
    // ==========================================

    async getAllEvents() {

        if (!this.hasToken()) {

            console.warn(
                "Sportmonks: No API token configured."
            );

            return [];

        }


        try {

            const results =
                await Promise.allSettled([

                    this.fetchFootballLive(),

                    this.fetchFootballFixtures(),

                    this.fetchCricketFixtures()

                ]);


            const footballLive =
                results[0].status === "fulfilled"
                    ? results[0].value
                    : [];


            const footballFixtures =
                results[1].status === "fulfilled"
                    ? results[1].value
                    : [];


            const cricketFixtures =
                results[2].status === "fulfilled"
                    ? results[2].value
                    : [];


            const combined = [
                ...footballLive,
                ...footballFixtures,
                ...cricketFixtures
            ];


            // Remove duplicate matches
            const unique =
                Array.from(
                    new Map(
                        combined.map(event => [
                            event.id,
                            event
                        ])
                    ).values()
                );


            console.log(
                "Sportmonks total events:",
                unique.length
            );


            return unique;

        } catch (error) {

            console.error(
                "Sportmonks master engine error:",
                error
            );

            return [];

        }

    }

}


// ==========================================
// GLOBAL ENGINE
// ==========================================

window.sportmonksEngine =
    new SportmonksService();

console.log(
    "HighFy TV Sportmonks Engine Loaded:",
    window.sportmonksEngine
);
