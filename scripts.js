/**
 * HighFy TV - Main Application Script
 * Integrated with Sportmonks Live Score Engine
 */

// ==========================================
// ১. Global State Variables (গ্লোবাল স্টেট)
// ==========================================
let channelsData = [];
let categoriesData = [];
let eventsData = [];
let activeEventFilter = 'all'; // ডিফল্ট ফিল্টার: 'all', 'live', 'upcoming', 'finished'

// ==========================================
// ২. App Startup (অ্যাপ চলা শুরু করবে)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initData();
    setupTabListeners();
});

/**
 * অ্যাপের প্রাথমিক ডাটা ফেচ করা এবং অটো-রিফ্রেশ চালু করা
 */
async function initData() {
    try {
        // ১. লোকাল JSON ডাটা ফেচ (চ্যানেল এবং ক্যাটাগরি)
        const [chanRes, catRes] = await Promise.all([
            fetch("./channels.json"),
            fetch("./categories.json")
        ]);

        channelsData = await chanRes.json();
        categoriesData = await catRes.json();

        // ২. Sportmonks API Engine থেকে আসল ইভেন্ট ডাটা লোড
        await loadSportmonksEvents();

        // ৩. চ্যানেল ও ক্যাটাগরি ইউআই রেন্ডার
        renderSportsGrid();
        renderCategoriesGrid();

        // ৪. লাইভ স্কোরের জন্য অটো-রিফ্রেশ টাইমার (config.js থেকে ইন্টারভাল নিবে)
        const refreshInterval = (typeof CONFIG !== 'undefined' && CONFIG.AUTO_REFRESH_INTERVAL) ? CONFIG.AUTO_REFRESH_INTERVAL : 30000;
        
        setInterval(async () => {
            await loadSportmonksEvents();
        }, refreshInterval);

    } catch (e) {
        console.error("Error initializing app data:", e);
    }
}

/**
 * Sportmonks API থেকে লাইভ ম্যাচ ফেচ করার মূল ফাংশন
 */
async function loadSportmonksEvents() {
    try {
        let apiEvents = [];

        // Sportmonks Engine গ্লোবালি উপলব্ধ থাকলে ডাটা ফেচ করবে
        if (window.sportmonksEngine) {
            apiEvents = await window.sportmonksEngine.getAllEvents();
        }

        // যদি API সফলভাবে ডাটা ফেরত দেয় তবে তা ব্যবহার করবে, নতুবা events.json ব্যাকআপ হিসেবে কাজ করবে
        if (apiEvents && apiEvents.length > 0) {
            eventsData = apiEvents;
        } else {
            const fallbackRes = await fetch("./events.json");
            eventsData = await fallbackRes.json();
        }
    } catch (error) {
        console.warn("Sportmonks fetch failed, switching to local backup:", error);
        try {
            const fallbackRes = await fetch("./events.json");
            eventsData = await fallbackRes.json();
        } catch (fallbackErr) {
            console.error("Failed to load fallback events:", fallbackErr);
        }
    }

    // নতুন ডাটা দিয়ে ইউজার ইন্টারফেস রি-রেন্ডার করা
    renderEvents(activeEventFilter);
}

// ==========================================
// ৩. Dynamic Rendering (UI প্রদর্শন লজিক)
// ==========================================

/**
 * Status (All, Live, Upcoming, Finished) অনুযায়ী ম্যাচ দেখাবে
 */
function renderEvents(filter = 'all') {
    const eventsContainer = document.getElementById("events-container");
    if (!eventsContainer) return;

    activeEventFilter = filter; // বর্তমান ট্যাবের ফিল্টার স্টেট ধরে রাখা

    // ফিল্টারিং লজিক
    const filteredEvents = eventsData.filter(event => {
        if (filter === 'all') return true;
        return event.status === filter; // 'live', 'upcoming', 'finished'
    });

    if (filteredEvents.length === 0) {
        eventsContainer.innerHTML = `<div class="no-events-msg">কোনো ${filter.toUpperCase()} ম্যাচ পাওয়া যায়নি।</div>`;
        return;
    }

    eventsContainer.innerHTML = filteredEvents.map(event => {
        // ব্যাজের স্টাইল নির্বাচন
        let statusBadgeClass = "badge-upcoming";
        if (event.status === "live") statusBadgeClass = "badge-live";
        if (event.status === "finished") statusBadgeClass = "badge-finished";

        return `
            <div class="event-card ${event.status === 'live' ? 'live-card' : ''}" onclick="openEventStream('${event.id}')">
                <div class="event-header">
                    <span class="sport-title">${event.sportIcon || '🏆'} ${event.tournament}</span>
                    <span class="status-badge ${statusBadgeClass}">${event.status.toUpperCase()}</span>
                </div>
                <div class="event-body">
                    <div class="team">
                        <div class="team-flag-box">${event.team1Flag}</div>
                        <span class="team-name">${event.team1}</span>
                    </div>
                    <div class="match-center">
                        <span class="timer">${event.timeOrTimer}</span>
                    </div>
                    <div class="team">
                        <div class="team-flag-box">${event.team2Flag}</div>
                        <span class="team-name">${event.team2}</span>
                    </div>
                </div>
                <div class="event-footer">
                    <small>${event.statusText}</small>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Channels Grid রেন্ডার
 */
function renderSportsGrid() {
    const channelsContainer = document.getElementById("channels-container");
    if (!channelsContainer || !channelsData) return;

    channelsContainer.innerHTML = channelsData.map(channel => `
        <div class="channel-card" onclick="playChannel('${channel.id}')">
            <img src="${channel.logo}" alt="${channel.name}">
            <p>${channel.name}</p>
        </div>
    `).join('');
}

/**
 * Categories Grid রেন্ডার
 */
function renderCategoriesGrid() {
    const categoriesContainer = document.getElementById("categories-container");
    if (!categoriesContainer || !categoriesData) return;

    categoriesContainer.innerHTML = categoriesData.map(cat => `
        <button class="cat-btn" onclick="filterByCategory('${cat.id}')">
            ${cat.name}
        </button>
    `).join('');
}

// ==========================================
// ৪. Event Handlers & Interactions
// ==========================================

/**
 * All, Live, Upcoming, Finished ট্যাবের ক্লিক লিসেনার
 */
function setupTabListeners() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            tabButtons.forEach(b => b.classList.remove("active"));
            
            const targetBtn = e.target.closest(".tab-btn") || e.target;
            targetBtn.classList.add("active");

            const filterType = targetBtn.getAttribute("data-filter") || 'all';
            renderEvents(filterType);
        });
    });
}

/**
 * ম্যাচে ক্লিক করলে স্ট্রিম বা ডিটেইলস ওপেন করার লজিক
 */
function openEventStream(eventId) {
    const selectedEvent = eventsData.find(e => e.id === eventId);
    if (selectedEvent) {
        console.log("Selected Event Details:", selectedEvent);
        // প্লেয়ার বা স্ট্রিম পপ-আপ ওপেন করার লজিক এখানে যুক্ত করুন
    }
}
