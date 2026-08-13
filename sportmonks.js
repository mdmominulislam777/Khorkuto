/**
 * HighFy TV - Sportmonks API Engine
 * Dynamic Bangladesh Time
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

        this.timezone = "Asia/Dhaka";
    }


    // ==========================================
    // TOKEN
    // ==========================================

    hasToken() {
        return (
            typeof this.apiToken === "string" &&
            this.apiToken.trim().length > 0
        );
    }


    // ==========================================
    // CURRENT BANGLADESH DATE
    // ==========================================

    getDhakaDate() {

        const parts = new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: this.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(new Date());

        const obj = {};

        parts.forEach(part => {
            if (part.type !== "literal") {
                obj[part.type] = part.value;
            }
        });

        return `${obj.year}-${obj.month}-${obj.day}`;
    }


    // ==========================================
    // CURRENT BANGLADESH TIME
    // ==========================================

    getDhakaNow() {
        return new Date();
    }


    // ==========================================
    // API REQUEST
    // ==========================================

    async request(endpoint, label) {

        if (!this.hasToken()) {

            console.warn(
                "HighFy TV: Sportmonks API Token is empty."
            );

            return [];
        }


        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";


        const url =
            `${this.baseUrl}${endpoint}` +
            `${separator}api_token=${encodeURIComponent(
                this.apiToken
            )}`;


        try {

            console.log(
                `Sportmonks ${label}:`,
                endpoint
            );


            const response =
                await fetch(url);


            console.log(
                `Sportmonks ${label} status:`,
                response.status
            );


            const text =
                await response.text();


            let result = {};

            try {
                result =
                    text ? JSON.parse(text) : {};
            } catch (error) {

                console.error(
                    `Sportmonks ${label}: Invalid JSON`,
                    text
                );

                return [];
            }


            if (!response.ok) {

                console.error(
                    `Sportmonks ${label} Error:`,
                    result
                );

                return [];
            }


            if (!Array.isArray(result.data)) {

                console.warn(
                    `Sportmonks ${label}: No data array`
                );

                return [];
            }


            return result.data;


        } catch (error) {

            console.error(
                `Sportmonks ${label} Network Error:`,
                error
            );

            return [];
        }
    }


    // ==========================================
    // STATUS MAPPING
    // ==========================================

    mapMatchStatus(state) {

        if (!state) {
            return null;
        }


        const raw =
            typeof state === "string"
                ? state
                : (
                    state.short_name ||
                    state.name ||
                    state.state ||
                    ""
                );


        const code =
            String(raw)
                .toUpperCase()
                .trim();


        // LIVE
        const liveCodes = [

            "LIVE",
            "INPLAY",
            "IN_PLAY",

            "1ST_HALF",
            "2ND_HALF",

            "INPLAY_1ST_HALF",
            "INPLAY_2ND_HALF",

            "HT",
            "HALF_TIME",

            "ET",
            "EXTRA_TIME",

            "PEN_BREAK",
            "PENALTIES",

            "1ST_INNINGS",
            "2ND_INNINGS",

            "BREAK",
            "INT",
            "INNINGS_BREAK"

        ];


        // FINISHED
        const finishedCodes = [

            "FT",
            "AET",
            "FT_PEN",
            "FINISHED",
            "FULL_TIME",
            "ENDED",

            "CANCL",
            "CANCELLED",
            "CANCELED",

            "POSTP",
            "POSTPONED",

            "ABANDONED"

        ];


        if (liveCodes.includes(code)) {
            return "live";
        }


        if (finishedCodes.includes(code)) {
            return "finished";
        }


        return null;
    }


    // ==========================================
    // SMART STATUS
    // ==========================================

    calculateStatus(item, sport) {

    const apiStatus =
        this.mapMatchStatus(item.state);

    // Sportmonks explicitly says LIVE
    if (apiStatus === "live") {
        return "live";
    }

    // Sportmonks explicitly says FINISHED
    if (apiStatus === "finished") {
        return "finished";
    }

    // If API provides a state but it is not live/finished,
    // trust the API and keep it upcoming.
    if (item.state) {
        return "upcoming";
    }

    // If there is no state at all, DO NOT guess that it is live.
    // Use starting time only for upcoming/finished fallback.
    if (!item.starting_at) {
        return "upcoming";
    }

    const start =
        new Date(item.starting_at);

    const now =
        new Date();

    if (isNaN(start.getTime())) {
        return "upcoming";
    }

    // Future match
    if (start.getTime() > now.getTime()) {
        return "upcoming";
    }

    // Do NOT automatically call an old match LIVE.
    return "finished";
}


    // ==========================================
    // TIME FORMAT
    // ==========================================

    formatTime(dateString) {

        if (!dateString) {
            return "TBD";
        }


        const date =
            new Date(dateString);


        if (isNaN(date.getTime())) {
            return "TBD";
        }


        return new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: this.timezone,
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);
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
                loading="lazy"
                style="
                    width:100%;
                    height:100%;
                    border-radius:50%;
                    object-fit:cover;
                "
            >
        `;
    }


    // ==========================================
    // FOOTBALL LIVE
    // ==========================================

    async fetchFootballLive() {

        const data =
            await this.request(
                "/football/livescores" +
                "?include=participants;league;state",
                "Football Live"
            );


        return this.normalizeFootballData(
            data
        );
    }


    // ==========================================
    // FOOTBALL TODAY
    // ==========================================

    async fetchFootballToday() {

        const today =
            this.getDhakaDate();


        console.log(
            "HighFy TV Bangladesh Date:",
            today
        );


        const data =
            await this.request(
                `/football/fixtures/date/${today}` +
                "?include=participants;league;state" +
                `&timezone=${encodeURIComponent(
                    this.timezone
                )}`,
                "Football Today"
            );


        return this.normalizeFootballData(
            data
        );
    }


    // ==========================================
    // CRICKET TODAY
    // ==========================================

    async fetchCricketToday() {

        const today =
            this.getDhakaDate();


        const data =
            await this.request(
                `/cricket/fixtures/date/${today}` +
                "?include=localteam;visitorteam;league;state" +
                `&timezone=${encodeURIComponent(
                    this.timezone
                )}`,
                "Cricket Today"
            );


        return this.normalizeCricketData(
            data
        );
    }


    // ==========================================
    // FOOTBALL NORMALIZE
    // ==========================================

    normalizeFootballData(rawData) {

        if (!Array.isArray(rawData)) {
            return [];
        }


        return rawData.map(item => {

            const participants =
                Array.isArray(
                    item.participants
                )
                    ? item.participants
                    : [];


            const team1 =
                participants[0] || {};


            const team2 =
                participants[1] || {};


            const status =
                this.calculateStatus(
                    item,
                    "Football"
                );


            const time =
                this.formatTime(
                    item.starting_at
                );


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
                    team1.name ||
                    "Home Team",

                team1Flag:
                    this.makeTeamLogo(
                        team1.image_path,
                        "⚽"
                    ),

                team2:
                    team2.name ||
                    "Away Team",

                team2Flag:
                    this.makeTeamLogo(
                        team2.image_path,
                        "⚽"
                    ),

                status:
                    status,

                timeOrTimer:
                    status === "live"
                        ? (
                            item.minute
                                ? `${item.minute}'`
                                : "LIVE"
                        )
                        : time,

                statusText:
                    status === "live"
                        ? "LIVE NOW"
                        : status === "finished"
                            ? "Full Time"
                            : `Starts at ${time}`,

                isHot:
                    status === "live",

                startingAt:
                    item.starting_at || null,

                streamUrls:
                    item.stream_urls || []

            };

        });
    }


    // ==========================================
    // CRICKET NORMALIZE
    // ==========================================

    normalizeCricketData(rawData) {

        if (!Array.isArray(rawData)) {
            return [];
        }


        return rawData.map(item => {

            const team1 =
                item.localteam ||
                item.local_team ||
                {};


            const team2 =
                item.visitorteam ||
                item.visitor_team ||
                {};


            const status =
                this.calculateStatus(
                    item,
                    "Cricket"
                );


            const time =
                this.formatTime(
                    item.starting_at
                );


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
                    team1.name ||
                    "Team A",

                team1Flag:
                    this.makeTeamLogo(
                        team1.image_path,
                        "🏏"
                    ),

                team2:
                    team2.name ||
                    "Team B",

                team2Flag:
                    this.makeTeamLogo(
                        team2.image_path,
                        "🏏"
                    ),

                status:
                    status,

                timeOrTimer:
                    status === "live"
                        ? "LIVE"
                        : time,

                statusText:
                    status === "live"
                        ? "LIVE NOW"
                        : status === "finished"
                            ? "Match Ended"
                            : `Starts at ${time}`,

                isHot:
                    status === "live",

                startingAt:
                    item.starting_at || null,

                streamUrls:
                    item.stream_urls || []

            };

        });
    }


    // ==========================================
    // REMOVE DUPLICATES
    // ==========================================

    removeDuplicates(events) {

        const map =
            new Map();


        events.forEach(event => {

            if (!event || !event.id) {
                return;
            }


            map.set(
                String(event.id),
                event
            );

        });


        return Array.from(
            map.values()
        );
    }


    // ==========================================
    // SORT EVENTS
    // ==========================================

    sortEvents(events) {

        return events.sort(
            (a, b) => {

                const priority = {
                    live: 0,
                    upcoming: 1,
                    finished: 2
                };


                const pA =
                    priority[a.status] ?? 9;

                const pB =
                    priority[b.status] ?? 9;


                if (pA !== pB) {
                    return pA - pB;
                }


                const timeA =
                    a.startingAt
                        ? new Date(
                            a.startingAt
                        ).getTime()
                        : Infinity;


                const timeB =
                    b.startingAt
                        ? new Date(
                            b.startingAt
                        ).getTime()
                        : Infinity;


                return timeA - timeB;
            }
        );
    }


    // ==========================================
    // MASTER ENGINE
    // ==========================================

    async getAllEvents() {

        if (!this.hasToken()) {

            console.warn(
                "HighFy TV: Sportmonks Token missing."
            );

            return [];
        }


        console.log(
            "================================"
        );

        console.log(
            "HighFy TV Sportmonks Refresh"
        );

        console.log(
            "Bangladesh Date:",
            this.getDhakaDate()
        );

        console.log(
            "================================"
        );


        const results =
            await Promise.allSettled([

                this.fetchFootballLive(),

                this.fetchFootballToday(),

                this.fetchCricketToday()

            ]);


        const footballLive =
            results[0].status === "fulfilled"
                ? results[0].value
                : [];


        const footballToday =
            results[1].status === "fulfilled"
                ? results[1].value
                : [];


        const cricketToday =
            results[2].status === "fulfilled"
                ? results[2].value
                : [];


        console.log(
            "Football Live:",
            footballLive.length
        );

        console.log(
            "Football Today:",
            footballToday.length
        );

        console.log(
            "Cricket Today:",
            cricketToday.length
        );


        const combined = [

            ...footballLive,

            ...footballToday,

            ...cricketToday

        ];


        const unique =
            this.removeDuplicates(
                combined
            );


        const sorted =
            this.sortEvents(
                unique
            );


        console.log(
            "HighFy TV Total Events:",
            sorted.length
        );


        console.log(
            "Live:",
            sorted.filter(
                x => x.status === "live"
            ).length
        );


        console.log(
            "Upcoming:",
            sorted.filter(
                x => x.status === "upcoming"
            ).length
        );


        console.log(
            "Finished:",
            sorted.filter(
                x => x.status === "finished"
            ).length
        );


        return sorted;
    }
}


// ==========================================
// GLOBAL EXPORT
// ==========================================

window.sportmonksEngine =
    new SportmonksService();


console.log(
    "HighFy TV Sportmonks Engine Ready"
);
setTimeout(() => {
    console.log("====== HIGHFY TV EVENTS DEBUG ======");
    console.table(
        eventsData.map(e => ({
            id: e.id,
            sport: e.sport,
            team1: e.team1,
            team2: e.team2,
            status: e.status,
            time: e.timeOrTimer,
            startingAt: e.startingAt
        }))
    );
}, 5000);
