/**
 * HighFy TV - Main Application Script
 * Sportmonks + Channels + Categories
 */

let channelsData = [];
let categoriesData = [];
let eventsData = [];
let activeEventFilter = "all";


// ==========================================
// APP STARTUP
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    initData();
    setupTabListeners();
    setupSportFilters();
});


// ==========================================
// INITIAL DATA
// ==========================================

async function initData() {
    try {

        const [chanRes, catRes] = await Promise.all([
            fetch("./channels.json"),
            fetch("./categories.json")
        ]);

        if (!chanRes.ok) {
            throw new Error("channels.json failed to load");
        }

        if (!catRes.ok) {
            throw new Error("categories.json failed to load");
        }

        channelsData = await chanRes.json();
        categoriesData = await catRes.json();

        console.log("Channels loaded:", channelsData);
        console.log("Categories loaded:", categoriesData);

        // Load Sportmonks events
        await loadSportmonksEvents();

        // Render channels and categories
        renderSportsGrid();
        renderCategoriesGrid();

        // Auto refresh
        const refreshInterval =
            typeof CONFIG !== "undefined" &&
            CONFIG.AUTO_REFRESH_INTERVAL
                ? CONFIG.AUTO_REFRESH_INTERVAL
                : 30000;

        setInterval(() => {
            loadSportmonksEvents();
        }, refreshInterval);

    } catch (error) {

        console.error("HighFy TV initialization error:", error);

        // Try local events backup
        await loadFallbackEvents();

        renderSportsGrid();
        renderCategoriesGrid();
    }
}


// ==========================================
// SPORTMONKS EVENTS
// ==========================================

async function loadSportmonksEvents() {

    try {

        let apiEvents = [];

        if (
            window.sportmonksEngine &&
            typeof window.sportmonksEngine.getAllEvents === "function"
        ) {

            apiEvents =
                await window.sportmonksEngine.getAllEvents();

        } else {

            console.warn(
                "Sportmonks engine is not available."
            );

        }


        if (Array.isArray(apiEvents) && apiEvents.length > 0) {

            eventsData = apiEvents;

            console.log(
                "Sportmonks events loaded:",
                eventsData.length
            );

        } else {

            console.warn(
                "No Sportmonks events found. Loading local events.json..."
            );

            await loadFallbackEvents();

        }

    } catch (error) {

        console.error(
            "Sportmonks fetch error:",
            error
        );

        await loadFallbackEvents();

    }

    updateEventCounters();

    renderEvents(activeEventFilter);
}


// ==========================================
// LOCAL FALLBACK
// ==========================================

async function loadFallbackEvents() {

    try {

        const response =
            await fetch("./events.json");

        if (!response.ok) {
            throw new Error(
                "events.json not found"
            );
        }

        const data =
            await response.json();

        eventsData =
            Array.isArray(data)
                ? data
                : [];

        console.log(
            "Fallback events loaded:",
            eventsData.length
        );

    } catch (error) {

        console.error(
            "Fallback events failed:",
            error
        );

        eventsData = [];

    }
}


// ==========================================
// EVENT COUNTERS
// ==========================================

function updateEventCounters() {

    const allCount =
        eventsData.length;

    const liveCount =
        eventsData.filter(
            event => event.status === "live"
        ).length;

    const upcomingCount =
        eventsData.filter(
            event => event.status === "upcoming"
        ).length;

    const finishedCount =
        eventsData.filter(
            event => event.status === "finished"
        ).length;


    const allElement =
        document.getElementById("cntAll");

    const liveElement =
        document.getElementById("cntLive");

    const upcomingElement =
        document.getElementById("cntUpcoming");

    const finishedElement =
        document.getElementById("cntFinished");


    if (allElement)
        allElement.textContent = allCount;

    if (liveElement)
        liveElement.textContent = liveCount;

    if (upcomingElement)
        upcomingElement.textContent = upcomingCount;

    if (finishedElement)
        finishedElement.textContent = finishedCount;
}


// ==========================================
// EVENTS RENDER
// ==========================================

function renderEvents(filter = "all") {

    const eventsContainer =
        document.getElementById("eventsFeed");

    if (!eventsContainer) {

        console.error(
            "eventsFeed element not found"
        );

        return;
    }


    activeEventFilter = filter;


    const filteredEvents =
        eventsData.filter(event => {

            if (filter === "all") {
                return true;
            }

            return event.status === filter;

        });


    if (filteredEvents.length === 0) {

        eventsContainer.innerHTML = `
            <div class="no-events-msg">
                <i class="fa-solid fa-calendar-xmark"></i>
                <p>No ${filter.toUpperCase()} matches found.</p>
            </div>
        `;

        return;
    }


    eventsContainer.innerHTML =
        filteredEvents.map(event => {

            let statusBadgeClass =
                "badge-upcoming";

            if (event.status === "live") {
                statusBadgeClass =
                    "badge-live";
            }

            if (event.status === "finished") {
                statusBadgeClass =
                    "badge-finished";
            }


            const team1Flag =
                event.team1Flag ||
                event.sportIcon ||
                "⚽";

            const team2Flag =
                event.team2Flag ||
                event.sportIcon ||
                "⚽";


            return `
                <div
                    class="event-card ${
                        event.status === "live"
                            ? "live-card"
                            : ""
                    }"
                    onclick="openEventStream('${event.id}')"
                >

                    <div class="event-header">

                        <span class="sport-title">
                            ${
                                event.sportIcon ||
                                "🏆"
                            }
                            ${
                                event.tournament ||
                                "Sports Event"
                            }
                        </span>

                        <span
                            class="status-badge ${statusBadgeClass}"
                        >
                            ${
                                event.status
                                    ? event.status.toUpperCase()
                                    : "UPCOMING"
                            }
                        </span>

                    </div>


                    <div class="event-body">

                        <div class="team">

                            <div class="team-flag-box">
                                ${team1Flag}
                            </div>

                            <span class="team-name">
                                ${
                                    event.team1 ||
                                    "Home Team"
                                }
                            </span>

                        </div>


                        <div class="match-center">

                            <span class="timer">
                                ${
                                    event.timeOrTimer ||
                                    "00:00"
                                }
                            </span>

                            ${
                                event.status === "live"
                                    ? `
                                    <span class="live-indicator">
                                        LIVE
                                    </span>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="team">

                            <div class="team-flag-box">
                                ${team2Flag}
                            </div>

                            <span class="team-name">
                                ${
                                    event.team2 ||
                                    "Away Team"
                                }
                            </span>

                        </div>

                    </div>


                    <div class="event-footer">

                        <small>
                            ${
                                event.statusText ||
                                ""
                            }
                        </small>

                    </div>

                </div>
            `;

        }).join("");
}


// ==========================================
// SPORTS CHANNEL GRID
// ==========================================

function renderSportsGrid() {

    const container =
        document.getElementById("sportsGrid");

    if (!container) {
        console.warn(
            "sportsGrid element not found"
        );
        return;
    }


    if (!Array.isArray(channelsData) ||
        channelsData.length === 0) {

        container.innerHTML = `
            <div class="no-events-msg">
                No channels available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        channelsData.map(channel => {

            return `
                <div
                    class="channel-card"
                    onclick="playChannel('${channel.id || ""}')"
                >

                    <img
                        src="${
                            channel.logo ||
                            ""
                        }"
                        alt="${
                            channel.name ||
                            "Channel"
                        }"
                        loading="lazy"
                    >

                    <p>
                        ${
                            channel.name ||
                            "Unknown Channel"
                        }
                    </p>

                </div>
            `;

        }).join("");
}


// ==========================================
// CATEGORY GRID
// ==========================================

function renderCategoriesGrid() {

    const container =
        document.getElementById(
            "categoriesGrid"
        );

    if (!container) {
        console.warn(
            "categoriesGrid element not found"
        );
        return;
    }


    if (!Array.isArray(categoriesData) ||
        categoriesData.length === 0) {

        container.innerHTML = `
            <div class="no-events-msg">
                No categories available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        categoriesData.map(category => {

            return `
                <button
                    class="cat-btn"
                    onclick="filterByCategory('${category.id || ""}')"
                >
                    ${
                        category.name ||
                        "Category"
                    }
                </button>
            `;

        }).join("");
}


// ==========================================
// EVENT FILTER BUTTONS
// ==========================================

function setupTabListeners() {

    const buttons =
        document.querySelectorAll(
            ".pill-btn[data-filter]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                buttons.forEach(btn => {
                    btn.classList.remove(
                        "active"
                    );
                });


                button.classList.add(
                    "active"
                );


                const filter =
                    button.getAttribute(
                        "data-filter"
                    ) || "all";


                renderEvents(filter);

            }
        );

    });
}


// ==========================================
// SPORT SHORTCUTS
// ==========================================

function setupSportFilters() {

    const buttons =
        document.querySelectorAll(
            ".shortcut-btn[data-sport]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                buttons.forEach(btn => {
                    btn.classList.remove(
                        "active"
                    );
                });


                button.classList.add(
                    "active"
                );


                const sport =
                    button.getAttribute(
                        "data-sport"
                    );


                filterEventsBySport(
                    sport
                );

            }
        );

    });
}


// ==========================================
// SPORT FILTER
// ==========================================

function filterEventsBySport(sport) {

    const container =
        document.getElementById(
            "eventsFeed"
        );

    if (!container) return;


    let filteredEvents;


    if (sport === "all") {

        filteredEvents =
            eventsData;

    } else {

        filteredEvents =
            eventsData.filter(event => {

                const eventSport =
                    String(
                        event.sport || ""
                    ).toLowerCase();


                if (sport === "football") {
                    return eventSport === "football";
                }

                if (sport === "cricket") {
                    return eventSport === "cricket";
                }

                if (sport === "wwe") {
                    return eventSport.includes("wwe");
                }

                if (sport === "fifa") {
                    return (
                        eventSport.includes("fifa") ||
                        String(
                            event.tournament || ""
                        )
                        .toLowerCase()
                        .includes("fifa")
                    );
                }

                return false;

            });

    }


    renderFilteredEvents(
        filteredEvents
    );
}


// ==========================================
// RENDER CUSTOM FILTERED EVENTS
// ==========================================

function renderFilteredEvents(list) {

    const originalData =
        eventsData;

    eventsData =
        Array.isArray(list)
            ? list
            : [];

    renderEvents(
        activeEventFilter
    );

    eventsData =
        originalData;

    updateEventCounters();
}


// ==========================================
// OPEN EVENT STREAM
// ==========================================

function openEventStream(eventId) {

    const event =
        eventsData.find(
            item =>
                String(item.id) ===
                String(eventId)
        );


    if (!event) {
        console.warn(
            "Event not found:",
            eventId
        );
        return;
    }


    console.log(
        "Selected Event:",
        event
    );


    // যদি stream URL থাকে
    if (
        event.streamUrls &&
        event.streamUrls.length > 0
    ) {

        const streamUrl =
            typeof event.streamUrls[0] === "string"
                ? event.streamUrls[0]
                : event.streamUrls[0].url;


        if (
            streamUrl &&
            typeof window.playStream ===
                "function"
        ) {

            window.playStream(
                streamUrl,
                event.team1 +
                " vs " +
                event.team2
            );

        }

    }

}


// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

window.loadSportmonksEvents =
    loadSportmonksEvents;

window.renderEvents =
    renderEvents;

window.openEventStream =
    openEventStream;

window.renderSportsGrid =
    renderSportsGrid;

window.renderCategoriesGrid =
    renderCategoriesGrid;
