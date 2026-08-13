/**
 * HighFy TV - Application Engine
 * Absolute Relative Paths (`./`) enforced for GitHub Pages project hosting
 */

document.addEventListener("DOMContentLoaded", () => {
    // State
    let channelsData = [];
    let categoriesData = [];
    let eventsData = [];
    let currentFilter = "all";
    let currentSportShortcut = "all";
    let hlsInstance = null;

    // UI Elements
    const views = document.querySelectorAll(".view-screen");
    const navTabs = document.querySelectorAll(".nav-tab");
    const drawerBackdrop = document.getElementById("drawerBackdrop");
    const sideDrawer = document.getElementById("sideDrawer");
    const openDrawerBtn = document.getElementById("openDrawerBtn");
    const searchModal = document.getElementById("searchModal");
    const searchHeaderBtn = document.getElementById("searchHeaderBtn");
    const closeSearchBtn = document.getElementById("closeSearchBtn");
    const searchInput = document.getElementById("searchInput");
    const searchResultsGrid = document.getElementById("searchResultsGrid");

    // Player Overlay Elements
    const playerOverlay = document.getElementById("playerOverlay");
    const videoPlayer = document.getElementById("videoPlayer");
    const videoLoader = document.getElementById("videoLoader");
    const videoError = document.getElementById("videoError");
    const playerTitle = document.getElementById("playerTitle");
    const closePlayerBtn = document.getElementById("closePlayerBtn");
    const streamServersBar = document.getElementById("streamServersBar");
    const retryPlayerBtn = document.getElementById("retryPlayerBtn");

    // Load Initial Data from Local Relative Paths
    async function initData() {
        try {
            const [chanRes, catRes, evtRes] = await Promise.all([
                fetch("./channels.json"),
                fetch("./categories.json"),
                fetch("./events.json")
            ]);

            channelsData = await chanRes.json();
            categoriesData = await catRes.json();
            eventsData = await evtRes.json();

            renderEvents();
            renderSportsGrid();
            renderCategoriesGrid();
        } catch (e) {
            console.error("Error loading JSON feeds:", e);
        }
    }

    // View Switcher Function
    function switchView(viewId) {
        views.forEach(v => v.classList.remove("active"));
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add("active");
        }
        window.scrollTo(0, 0);
    }

    // Bottom Tab Navigation Controller
    navTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetView = tab.getAttribute("data-view");
            navTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            switchView(targetView);
        });
    });

    // Side Drawer Controller
    openDrawerBtn.addEventListener("click", () => {
        sideDrawer.classList.add("open");
        drawerBackdrop.classList.add("active");
    });

    drawerBackdrop.addEventListener("click", closeDrawer);

    function closeDrawer() {
        sideDrawer.classList.remove("open");
        drawerBackdrop.classList.remove("active");
    }

    // Drawer Item Actions
    document.querySelectorAll(".drawer-item").forEach(item => {
        item.addEventListener("click", () => {
            const action = item.getAttribute("data-action");
            closeDrawer();

            if (action === "network-stream") switchView("networkStreamView");
            else if (action === "playlists") switchView("playlistsView");
            else if (action === "cricket-score" || action === "football-score") {
                document.getElementById("scoreTitle").textContent = action === "cricket-score" ? "Cricket Score" : "Football Score";
                switchView("scoreView");
            } else if (action === "force-low-quality") switchView("settingsView");
            else if (action === "telegram") window.open("https://t.me", "_blank");
            else if (action === "website") window.open("https://google.com", "_blank");
            else if (action === "exit") alert("Close the browser tab to exit.");
        });
    });

    // Render Events List
    function renderEvents() {
        const feed = document.getElementById("eventsFeed");
        feed.innerHTML = "";

        let filtered = eventsData;

        if (currentSportShortcut !== "all") {
            filtered = filtered.filter(e => e.sport.toLowerCase() === currentSportShortcut.toLowerCase());
        }

        if (currentFilter !== "all") {
            filtered = filtered.filter(e => e.status.toLowerCase() === currentFilter.toLowerCase());
        }

        // Update Pill Badge Counters
        document.getElementById("cntAll").textContent = eventsData.length;
        document.getElementById("cntLive").textContent = eventsData.filter(e => e.status === "live").length;
        document.getElementById("cntUpcoming").textContent = eventsData.filter(e => e.status === "upcoming").length;
        document.getElementById("cntFinished").textContent = eventsData.filter(e => e.status === "finished").length;

        filtered.forEach(evt => {
            const card = document.createElement("div");
            card.className = "event-card";
            
            const isLive = evt.status === "live";

            card.innerHTML = `
                <div class="event-card-header">
                    ${evt.isHot ? '<span class="hot-badge">HOT</span>' : ''}
                    <span>${evt.sportIcon || '🏏'} ${evt.sport} || ${evt.tournament}</span>
                </div>
                <div class="event-card-body">
                    <div class="team-box">
                        <div class="team-logo">${evt.team1Flag || '🏳️'}</div>
                        <div class="team-name">${evt.team1}</div>
                    </div>
                    <div class="match-status-center">
                        ${isLive ? '<div class="live-indicator"><i class="fa-solid fa-circle"></i> LIVE</div>' : ''}
                        <div class="match-time">${evt.timeOrTimer}</div>
                        ${!isLive ? `<div class="starts-in">${evt.statusText || ''}</div>` : ''}
                    </div>
                    <div class="team-box">
                        <div class="team-logo">${evt.team2Flag || '🏳️'}</div>
                        <div class="team-name">${evt.team2}</div>
                    </div>
                </div>
            `;

            card.addEventListener("click", () => {
                openPlayer(evt.title || `${evt.team1} vs ${evt.team2}`, evt.streamUrls);
            });

            feed.appendChild(card);
        });
    }

    // Filter Pills Click Handler
    document.querySelectorAll(".pill-btn").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".pill-btn").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            currentFilter = pill.getAttribute("data-filter");
            renderEvents();
        });
    });

    // Category Shortcuts Handler
    document.querySelectorAll(".shortcut-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".shortcut-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentSportShortcut = btn.getAttribute("data-sport");
            renderEvents();
        });
    });

    // Render Sports 3-Column Grid
    function renderSportsGrid() {
        const grid = document.getElementById("sportsGrid");
        grid.innerHTML = "";

        const sportsChannels = channelsData.filter(c => c.category.toLowerCase() === "sports");
        sportsChannels.forEach(chan => {
            grid.appendChild(createChannelCard(chan));
        });
    }

    // Render Categories 3-Column Grid
    function renderCategoriesGrid() {
        const grid = document.getElementById("categoriesGrid");
        grid.innerHTML = "";

        categoriesData.forEach(cat => {
            const card = document.createElement("div");
            card.className = "grid-card";
            card.innerHTML = `
                <div class="card-logo-circle">
                    ${cat.icon ? `<img src="${cat.icon}" alt="">` : cat.flag || '📺'}
                </div>
                <div class="card-title">${cat.name}</div>
            `;

            card.addEventListener("click", () => {
                openCategoryChannels(cat.name);
            });

            grid.appendChild(card);
        });
    }

    // Category Channels Drill-Down
    function openCategoryChannels(catName) {
        document.getElementById("categoryTitle").textContent = catName;
        const grid = document.getElementById("categoryChannelsGrid");
        grid.innerHTML = "";

        const catChans = channelsData.filter(c => c.category.toLowerCase() === catName.toLowerCase());
        catChans.forEach(chan => grid.appendChild(createChannelCard(chan)));

        switchView("categoryChannelsView");
    }

    document.getElementById("backToCategoriesBtn").addEventListener("click", () => {
        switchView("categoriesView");
    });

    // Helper: Create Channel Card
    function createChannelCard(chan) {
        const card = document.createElement("div");
        card.className = "grid-card";
        card.innerHTML = `
            <div class="card-logo-circle">
                ${chan.logo ? `<img src="${chan.logo}" alt="" onerror="this.style.display='none'">` : '📺'}
            </div>
            <div class="card-title">${chan.name}</div>
        `;
        card.addEventListener("click", () => {
            openPlayer(chan.name, [{ name: chan.name + " - Auto", url: chan.url }]);
        });
        return card;
    }

    // Video Player & HLS Handler
    function openPlayer(title, streams) {
        playerTitle.textContent = title;
        playerOverlay.classList.add("active");
        renderServerTabs(streams);

        if (streams && streams.length > 0) {
            playStreamUrl(streams[0].url);
        }
    }

    function renderServerTabs(streams) {
        streamServersBar.innerHTML = "";
        if (!streams || streams.length === 0) return;

        streams.forEach((st, idx) => {
            const btn = document.createElement("button");
            btn.className = `server-tab ${idx === 0 ? 'active' : ''}`;
            btn.textContent = st.name || `Server ${idx + 1}`;
            btn.addEventListener("click", () => {
                document.querySelectorAll(".server-tab").forEach(s => s.classList.remove("active"));
                btn.classList.add("active");
                playStreamUrl(st.url);
            });
            streamServersBar.appendChild(btn);
        });
    }

    function playStreamUrl(url) {
        videoError.style.display = "none";
        videoLoader.style.display = "flex";

        if (hlsInstance) {
            hlsInstance.destroy();
        }

        if (Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(url);
            hlsInstance.attachMedia(videoPlayer);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                videoLoader.style.display = "none";
                videoPlayer.play().catch(() => {});
            });
            hlsInstance.on(Hls.Events.ERROR, () => {
                videoLoader.style.display = "none";
                videoError.style.display = "flex";
            });
        } else if (videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
            videoPlayer.src = url;
            videoPlayer.addEventListener("loadedmetadata", () => {
                videoLoader.style.display = "none";
                videoPlayer.play();
            });
        } else {
            videoLoader.style.display = "none";
            videoError.style.display = "flex";
        }
    }

    closePlayerBtn.addEventListener("click", () => {
        playerOverlay.classList.remove("active");
        if (hlsInstance) hlsInstance.destroy();
        videoPlayer.pause();
    });

    retryPlayerBtn.addEventListener("click", () => {
        const activeTab = document.querySelector(".server-tab.active");
        if (activeTab) activeTab.click();
    });

    // Search Engine Overlay
    searchHeaderBtn.addEventListener("click", () => searchModal.classList.add("active"));
    closeSearchBtn.addEventListener("click", () => searchModal.classList.remove("active"));

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        searchResultsGrid.innerHTML = "";
        if (!query) return;

        const matched = channelsData.filter(c => c.name.toLowerCase().includes(query) || c.category.toLowerCase().includes(query));
        matched.forEach(chan => searchResultsGrid.appendChild(createChannelCard(chan)));
    });

    // Header Quick Buttons
    document.getElementById("closeAnnouncement").addEventListener("click", () => {
        document.getElementById("announcementBar").style.display = "none";
    });

    document.getElementById("refreshBtn").addEventListener("click", () => {
        location.reload();
    });

    document.getElementById("headerFavBtn").addEventListener("click", () => {
        switchView("favoritesView");
    });

    document.getElementById("networkStreamHeaderBtn").addEventListener("click", () => {
        switchView("networkStreamView");
    });

    document.getElementById("playNetworkStreamBtn").addEventListener("click", () => {
        const url = document.getElementById("streamUrlInput").value.trim();
        if (url) openPlayer("Custom Network Stream", [{ name: "Direct Stream", url }]);
    });

    // Picture-in-Picture
    document.getElementById("pipBtn").addEventListener("click", async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await videoPlayer.requestPictureInPicture();
            }
        } catch (e) {
            alert("Picture-in-Picture mode not supported on this browser.");
        }
    });

    // Initialize App Data
    initData();
});
