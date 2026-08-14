/**
 * HIGHFY TV — Main application logic
 * Single source of truth for state; every other file (channels.json,
 * categories.json, config.js, sportmonks.js) feeds into this file.
 */

(() => {
  "use strict";

  /* ============================= STATE ============================= */
  const state = {
    channels: [],          // from channels.json (+ playlist-loaded channels merged in for browsing)
    categories: [],        // from categories.json
    favorites: new Set(JSON.parse(localStorage.getItem("hfy_favorites") || "[]")),
    settings: Object.assign(
      { autoRefresh: true, lowQuality: false },
      JSON.parse(localStorage.getItem("hfy_settings") || "{}")
    ),
    activeCategory: "all",
    activeTab: "categories",
    searchQuery: "",
    currentPlaying: null,   // channel object currently in the player
    hls: null,
    eventSport: "football",
    eventStatus: "all",
    eventsCache: { events: [], errors: [] },
    eventsRefreshTimer: null,
    playlistChannels: [],
  };

  /* ============================= UTIL ============================= */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  function toast(msg, ms = 2200) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), ms);
  }

  function saveFavorites() {
    localStorage.setItem("hfy_favorites", JSON.stringify(Array.from(state.favorites)));
  }
  function saveSettings() {
    localStorage.setItem("hfy_settings", JSON.stringify(state.settings));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function categoryLabel(id) {
    const cat = state.categories.find((c) => c.id === id);
    return cat ? cat.name : id;
  }

  /* ============================= LOAD DATA ============================= */
  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  async function bootstrap() {
    $("#appVersion").textContent = CONFIG.APP_VERSION;
    $("#aboutVersion").textContent = `Version ${CONFIG.APP_VERSION}`;
    $("#drawerCopyright").textContent = `© ${new Date().getFullYear()} ${CONFIG.APP_NAME}`;

    try {
      const [channels, categories] = await Promise.all([
        loadJSON("channels.json"),
        loadJSON("categories.json"),
      ]);
      state.channels = Array.isArray(channels) ? channels : [];
      state.categories = Array.isArray(categories) ? categories : [];
    } catch (err) {
      console.error(err);
      toast("Could not load channel data");
      state.channels = [];
      state.categories = [{ id: "all", name: "All" }];
    }

    renderCategoryChips();
    renderChannelGrid();
    renderSportsTab();
    renderEventSportChips();
    renderEventStatusChips();
    wireEvents();
    applySettingsToUI();

    // First load of events happens lazily when the Events tab is opened,
    // to avoid burning API calls the user never sees.
  }

  /* ============================= CATEGORY CHIPS ============================= */
  function renderCategoryChips() {
    const row = $("#categoryChips");
    row.innerHTML = "";
    state.categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (cat.id === state.activeCategory ? " active" : "");
      const count = cat.id === "all"
        ? state.channels.length
        : state.channels.filter((c) => c.category === cat.id).length;
      btn.innerHTML = `${escapeHtml(cat.name)} <span class="chip-count">${count}</span>`;
      btn.addEventListener("click", () => {
        state.activeCategory = cat.id;
        renderCategoryChips();
        renderChannelGrid();
      });
      row.appendChild(btn);
    });
  }

  /* ============================= CHANNEL GRID ============================= */
  function matchesSearch(channel, q) {
    if (!q) return true;
    const hay = [channel.name, channel.category, channel.language, channel.country]
      .join(" ")
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function getFilteredChannels() {
    return state.channels.filter((c) => {
      const catOk = state.activeCategory === "all" || c.category === state.activeCategory;
      return catOk && matchesSearch(c, state.searchQuery);
    });
  }

  function channelCardHTML(channel) {
    const isFav = state.favorites.has(channel.id);
    const logo = channel.logo
      ? `<img src="${escapeHtml(channel.logo)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : "";
    return `
      <div class="channel-card" data-id="${escapeHtml(channel.id)}" tabindex="0" role="button">
        <button class="fav-btn ${isFav ? "active" : ""}" data-fav="${escapeHtml(channel.id)}" aria-label="Toggle favorite">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4A5.5 5.5 0 0 1 12 7a5.5 5.5 0 0 1 6.5-3C22 4.5 23.5 8 22 11.7 19.5 16.4 12 21 12 21z"/></svg>
        </button>
        <div class="badge-row">
          ${channel.quality ? `<span class="badge hd">${escapeHtml(channel.quality)}</span>` : ""}
        </div>
        <div class="channel-logo-wrap">${logo}</div>
        <div class="channel-name">${escapeHtml(channel.name)}</div>
        <div class="channel-meta">${escapeHtml(channel.language || "")}${channel.country ? " · " + escapeHtml(channel.country) : ""}</div>
      </div>`;
  }

  function renderChannelGrid() {
    const grid = $("#channelGrid");
    const list = getFilteredChannels();
    $("#channelSectionTitle").textContent =
      state.activeCategory === "all" ? "All Channels" : categoryLabel(state.activeCategory);
    $("#channelCount").textContent = list.length;
    grid.innerHTML = list.map(channelCardHTML).join("");
    $("#channelEmpty").hidden = list.length !== 0;
    bindChannelCardEvents(grid);
  }

  function renderSportsTab() {
    const grid = $("#sportsChannelGrid");
    const list = state.channels.filter((c) => c.category === "sports");
    $("#sportsChannelCount").textContent = list.length;
    grid.innerHTML = list.map(channelCardHTML).join("") ||
      `<p class="empty-state">No sports channels yet. Add some in channels.json with "category": "sports".</p>`;
    bindChannelCardEvents(grid);
  }

  function bindChannelCardEvents(scope) {
    $$(".channel-card", scope).forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".fav-btn")) return;
        const id = card.dataset.id;
        const channel = findChannelById(id);
        if (channel) openPlayer(channel);
      });
    });
    $$(".fav-btn", scope).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.fav);
      });
    });
  }

  function findChannelById(id) {
    return (
      state.channels.find((c) => c.id === id) ||
      state.playlistChannels.find((c) => c.id === id)
    );
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      toast("Removed from favorites");
    } else {
      state.favorites.add(id);
      toast("Added to favorites");
    }
    saveFavorites();
    // Re-render whatever grids are visible so the heart icon updates everywhere.
    renderChannelGrid();
    renderSportsTab();
    if (!$("#playerOverlay").hidden) updatePlayerFavIcon();
    if (state.activeTab === "favorites-sheet") renderFavoritesList();
  }

  /* ============================= TABS (bottom nav) ============================= */
  function switchTab(tab) {
    state.activeTab = tab;
    $$(".tab-panel").forEach((p) => (p.hidden = p.dataset.tab !== tab));
    $$(".bn-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    if (tab === "events" && state.eventsCache.events.length === 0) {
      loadEvents();
    }
  }

  /* ============================= EVENTS (Sportmonks) ============================= */
  const EVENT_SPORTS = [
    { id: "cricket", label: "Cricket" },
    { id: "football", label: "Football" },
    { id: "wwe", label: "WWE" },
    { id: "fifa", label: "FIFA" },
    { id: "tennis", label: "Tennis" },
    { id: "basketball", label: "Basketball" },
  ];
  const EVENT_STATUSES = ["all", "live", "upcoming", "finished"];

  function renderEventSportChips() {
    const row = $("#eventSportChips");
    row.innerHTML = "";
    EVENT_SPORTS.forEach((s) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (s.id === state.eventSport ? " active" : "");
      btn.textContent = s.label;
      btn.addEventListener("click", () => {
        state.eventSport = s.id;
        renderEventSportChips();
        loadEvents();
      });
      row.appendChild(btn);
    });
  }

  function renderEventStatusChips() {
    const row = $("#eventStatusChips");
    const counts = { all: 0, live: 0, upcoming: 0, finished: 0 };
    state.eventsCache.events.forEach((e) => {
      counts.all += 1;
      const key = e.status.toLowerCase();
      if (counts[key] !== undefined) counts[key] += 1;
    });
    row.innerHTML = "";
    EVENT_STATUSES.forEach((s) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (s === state.eventStatus ? " active" : "");
      btn.innerHTML = `${s[0].toUpperCase() + s.slice(1)} <span class="chip-count">${counts[s]}</span>`;
      btn.addEventListener("click", () => {
        state.eventStatus = s;
        renderEventStatusChips();
        renderEventsList();
      });
      row.appendChild(btn);
    });
  }

  async function loadEvents() {
    clearTimeout(state.eventsRefreshTimer);
    const sport = EVENT_SPORTS.find((s) => s.id === state.eventSport);
    $("#eventsApiError").hidden = true;
    $("#eventsEmpty").hidden = true;

    if (sport.id === "wwe") {
      $("#eventsList").innerHTML = "";
      $("#eventsApiErrorText").textContent =
        "WWE is not a tracked sport in Sportmonks, so no live schedule is available here.";
      $("#eventsApiError").hidden = false;
      $("#eventsRetry").hidden = true;
      return;
    }
    $("#eventsRetry").hidden = false;

    if (!SPORTMONKS.hasToken()) {
      $("#eventsList").innerHTML = "";
      $("#eventsApiErrorText").textContent =
        "Add your Sportmonks API token in config.js to see live sports data.";
      $("#eventsApiError").hidden = false;
      return;
    }

    $("#eventsList").innerHTML = `<div class="events-list"><p class="empty-state">Loading events…</p></div>`;

    try {
      const result = await SPORTMONKS.fetchEvents(state.eventSport);
      state.eventsCache.events = result;
      state.eventsCache.errors = [];
      renderEventStatusChips();
      renderEventsList();

      if (state.settings.autoRefresh) {
        state.eventsRefreshTimer = setTimeout(loadEvents, CONFIG.AUTO_REFRESH_INTERVAL);
      }
    } catch (err) {
      console.error(err);
      state.eventsCache.events = [];
      $("#eventsList").innerHTML = "";
      $("#eventsApiErrorText").textContent = "Live sports data unavailable";
      $("#eventsApiError").hidden = false;
      renderEventStatusChips();
    }
  }

  function renderEventsList() {
    const list = state.eventsCache.events.filter((e) =>
      state.eventStatus === "all" ? true : e.status.toLowerCase() === state.eventStatus
    );
    const container = $("#eventsList");
    $("#eventsEmpty").hidden = list.length !== 0;
    container.innerHTML = list.map(eventCardHTML).join("");
  }

  function eventCardHTML(ev) {
    const time = ev.startingAt
      ? new Date(ev.startingAt.replace(" ", "T")).toLocaleString("en-GB", {
          timeZone: CONFIG.TIMEZONE,
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        })
      : "—";
    const statusClass = ev.status.toLowerCase();
    return `
      <div class="event-card">
        <div class="event-tournament"><span>${escapeHtml(ev.tournament)}</span><span>${escapeHtml(time)}</span></div>
        <div class="event-teams">
          <div class="event-team">
            ${ev.teamHome.logo ? `<img src="${escapeHtml(ev.teamHome.logo)}" alt="" onerror="this.style.display='none'"/>` : ""}
            <span>${escapeHtml(ev.teamHome.name)}</span>
          </div>
          <span class="event-vs">VS</span>
          <div class="event-team">
            ${ev.teamAway.logo ? `<img src="${escapeHtml(ev.teamAway.logo)}" alt="" onerror="this.style.display='none'"/>` : ""}
            <span>${escapeHtml(ev.teamAway.name)}</span>
          </div>
        </div>
        <div class="event-status-row"><span class="status-pill ${statusClass}">${escapeHtml(ev.status)}</span></div>
      </div>`;
  }

  /* ============================= PLAYER ============================= */
  const video = () => $("#videoPlayer");

  function openPlayer(channel) {
    if (!channel.url) {
      toast("No stream URL set for this channel yet");
      return;
    }
    state.currentPlaying = channel;
    $("#playerOverlay").hidden = false;
    document.body.style.overflow = "hidden";
    $("#playerChannelName").textContent = channel.name;
    updatePlayerFavIcon();
    renderRelatedChannels(channel);
    startStream(channel.url);
  }

  function closePlayer() {
    $("#playerOverlay").hidden = true;
    document.body.style.overflow = "";
    destroyStream();
    state.currentPlaying = null;
  }

  function destroyStream() {
    const v = video();
    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }
    v.pause();
    v.removeAttribute("src");
    v.load();
  }

  function startStream(url) {
    destroyStream();
    const v = video();
    $("#playerError").hidden = true;
    $("#playerLoading").hidden = false;
    setPlayIcon(false);

    const onReady = () => {
      $("#playerLoading").hidden = true;
      v.play().then(() => setPlayIcon(true)).catch(() => setPlayIcon(false));
    };
    const onFail = () => {
      $("#playerLoading").hidden = true;
      $("#playerError").hidden = false;
    };

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: state.settings.lowQuality ? 15 : 30,
        capLevelToPlayerSize: state.settings.lowQuality,
      });
      state.hls = hls;
      hls.loadSource(url);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          console.error("HLS fatal error", data);
          onFail();
        }
      });
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
      v.addEventListener("loadedmetadata", onReady, { once: true });
      v.addEventListener("error", onFail, { once: true });
    } else {
      onFail();
      toast("This browser can't play HLS streams");
    }
  }

  function retryStream() {
    if (state.currentPlaying) startStream(state.currentPlaying.url);
    else if (state._lastManualUrl) startStream(state._lastManualUrl);
  }

  function setPlayIcon(isPlaying) {
    $("#iconPlay").hidden = isPlaying;
    $("#iconPause").hidden = !isPlaying;
  }

  function updatePlayerFavIcon() {
    if (!state.currentPlaying) return;
    const btn = $("#playerFav");
    const isFav = state.favorites.has(state.currentPlaying.id);
    btn.classList.toggle("active", isFav);
  }

  function renderRelatedChannels(channel) {
    const related = state.channels
      .filter((c) => c.category === channel.category && c.id !== channel.id)
      .slice(0, 6);
    $("#relatedChannels").innerHTML = related.map(channelCardHTML).join("") ||
      `<p class="empty-state">No related channels</p>`;
    bindChannelCardEvents($("#relatedChannels"));
  }

  /* ============================= NETWORK STREAM / M3U ============================= */
  function playManualUrl(url) {
    if (!/^https?:\/\/.+/i.test(url)) {
      toast("Enter a valid stream URL");
      return;
    }
    state.currentPlaying = { id: "manual-" + Date.now(), name: "Network Stream", url, category: "network" };
    state._lastManualUrl = url;
    closeSheet("networkStreamSheet");
    $("#playerOverlay").hidden = false;
    document.body.style.overflow = "hidden";
    $("#playerChannelName").textContent = "Network Stream";
    $("#relatedChannels").innerHTML = "";
    startStream(url);
  }

  function parseM3U(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    let pending = null;
    lines.forEach((line) => {
      line = line.trim();
      if (line.startsWith("#EXTINF")) {
        const nameMatch = line.match(/,(.*)$/);
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        const groupMatch = line.match(/group-title="([^"]*)"/i);
        pending = {
          name: nameMatch ? nameMatch[1].trim() : "Unknown channel",
          logo: logoMatch ? logoMatch[1] : "",
          category: groupMatch ? groupMatch[1].toLowerCase() : "international",
        };
      } else if (line && !line.startsWith("#") && pending) {
        out.push({
          id: "m3u-" + out.length + "-" + Date.now(),
          name: pending.name,
          logo: pending.logo,
          category: pending.category,
          url: line,
          language: "",
          country: "",
          quality: "",
        });
        pending = null;
      }
    });
    return out;
  }

  async function loadPlaylist(url) {
    const errEl = $("#playlistError");
    errEl.hidden = true;
    $("#playlistGrid").innerHTML = `<p class="empty-state">Loading playlist…</p>`;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("Bad response");
      const text = await res.text();
      const parsed = parseM3U(text);
      if (parsed.length === 0) throw new Error("No channels found");
      state.playlistChannels = parsed;
      $("#playlistGrid").innerHTML = parsed.map(channelCardHTML).join("");
      bindChannelCardEvents($("#playlistGrid"));
      toast(`Loaded ${parsed.length} channels`);
    } catch (err) {
      console.error(err);
      $("#playlistGrid").innerHTML = "";
      errEl.textContent =
        "Couldn't load this playlist. It may be blocked by CORS or the URL may be invalid.";
      errEl.hidden = false;
    }
  }

  /* ============================= FAVORITES VIEW (via drawer) ============================= */
  function showFavorites() {
    const favChannels = state.channels.filter((c) => state.favorites.has(c.id));
    state.activeCategory = "all";
    state.searchQuery = "";
    $("#searchInput").value = "";
    switchTab("categories");
    $("#channelSectionTitle").textContent = "Favorites";
    $("#channelCount").textContent = favChannels.length;
    $("#channelGrid").innerHTML = favChannels.map(channelCardHTML).join("");
    $("#channelEmpty").hidden = favChannels.length !== 0;
    bindChannelCardEvents($("#channelGrid"));
    // Reset the chip row selection visually without changing filter logic below.
    $$(".chip").forEach((c) => c.classList.remove("active"));
  }
  function renderFavoritesList() { showFavorites(); }

  /* ============================= SHEETS / DRAWER ============================= */
  function openSheet(id) {
    $("#sheetOverlay").classList.add("open");
    const sheet = $("#" + id);
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("open"));
  }
  function closeSheet(id) {
    const sheet = $("#" + id);
    sheet.classList.remove("open");
    $("#sheetOverlay").classList.remove("open");
    setTimeout(() => { sheet.hidden = true; }, 250);
  }
  function closeAllSheets() {
    $$(".sheet").forEach((s) => { s.classList.remove("open"); s.hidden = true; });
    $("#sheetOverlay").classList.remove("open");
  }

  function openDrawer() {
    $("#drawer").classList.add("open");
    $("#drawerOverlay").classList.add("open");
  }
  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawerOverlay").classList.remove("open");
  }

  function applySettingsToUI() {
    $("#setAutoRefresh").checked = state.settings.autoRefresh;
    $("#setLowQuality").checked = state.settings.lowQuality;
  }

  /* ============================= SHARE ============================= */
  async function shareApp(channel) {
    const shareData = channel
      ? { title: channel.name, text: `Watch ${channel.name} on ${CONFIG.APP_NAME}`, url: location.href }
      : { title: CONFIG.APP_NAME, text: `Check out ${CONFIG.APP_NAME} — live channels & sports`, url: location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (_) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast("Link copied to clipboard");
      } catch (_) {
        toast(shareData.url);
      }
    }
  }

  /* ============================= EVENT WIRING ============================= */
  function wireEvents() {
    // Header
    $("#drawerToggle").addEventListener("click", openDrawer);
    $("#drawerOverlay").addEventListener("click", closeDrawer);
    $("#searchToggle").addEventListener("click", () => {
      const bar = $("#searchBar");
      bar.classList.toggle("open");
      if (bar.classList.contains("open")) $("#searchInput").focus();
    });
    $("#searchClear").addEventListener("click", () => {
      $("#searchInput").value = "";
      state.searchQuery = "";
      $("#searchBar").classList.remove("open");
      renderChannelGrid();
    });
    $("#searchInput").addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      renderChannelGrid();
    });
    $("#favToggleTop").addEventListener("click", showFavorites);

    // Bottom nav
    $$(".bn-item").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Drawer actions
    $$(".drawer-list li[data-action]").forEach((li) => {
      li.addEventListener("click", () => {
        const action = li.dataset.action;
        closeDrawer();
        switch (action) {
          case "network-stream": openSheet("networkStreamSheet"); break;
          case "playlists": openSheet("playlistSheet"); break;
          case "favorites": showFavorites(); break;
          case "cricket":
            switchTab("events"); state.eventSport = "cricket";
            renderEventSportChips(); loadEvents();
            break;
          case "football":
            switchTab("events"); state.eventSport = "football";
            renderEventSportChips(); loadEvents();
            break;
          case "settings": openSheet("settingsSheet"); break;
          case "telegram": window.open(CONFIG.LINKS.TELEGRAM, "_blank"); break;
          case "website": window.open(CONFIG.LINKS.WEBSITE, "_blank"); break;
          case "share": shareApp(); break;
          case "about": openSheet("aboutSheet"); break;
        }
      });
    });

    // Sheet overlay click closes topmost sheet
    $("#sheetOverlay").addEventListener("click", closeAllSheets);

    // Settings sheet
    $("#settingsClose").addEventListener("click", () => closeSheet("settingsSheet"));
    $("#setAutoRefresh").addEventListener("change", (e) => {
      state.settings.autoRefresh = e.target.checked;
      saveSettings();
      if (e.target.checked && state.activeTab === "events") loadEvents();
      else clearTimeout(state.eventsRefreshTimer);
    });
    $("#setLowQuality").addEventListener("change", (e) => {
      state.settings.lowQuality = e.target.checked;
      saveSettings();
    });
    $("#setClearFavorites").addEventListener("click", () => {
      state.favorites.clear();
      saveFavorites();
      renderChannelGrid();
      renderSportsTab();
      toast("Favorites cleared");
    });
    $("#setAboutBtn").addEventListener("click", () => { closeSheet("settingsSheet"); openSheet("aboutSheet"); });
    $("#aboutClose").addEventListener("click", () => closeSheet("aboutSheet"));

    // Network stream sheet
    $("#networkStreamClose").addEventListener("click", () => closeSheet("networkStreamSheet"));
    $("#networkStreamPlay").addEventListener("click", () => {
      playManualUrl($("#networkStreamInput").value.trim());
    });

    // Playlist sheet
    $("#playlistClose").addEventListener("click", () => closeSheet("playlistSheet"));
    $("#playlistLoad").addEventListener("click", () => {
      const url = $("#playlistInput").value.trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        const errEl = $("#playlistError");
        errEl.textContent = "Enter a valid playlist URL";
        errEl.hidden = false;
        return;
      }
      loadPlaylist(url);
    });

    // Events tab
    $("#eventsRetry").addEventListener("click", loadEvents);

    // Player controls
    $("#playerBack").addEventListener("click", closePlayer);
    $("#playerRetry").addEventListener("click", retryStream);
    $("#playerFav").addEventListener("click", () => {
      if (state.currentPlaying && !state.currentPlaying.id.startsWith("manual-")) {
        toggleFavorite(state.currentPlaying.id);
      }
    });
    $("#playerShare").addEventListener("click", () => shareApp(state.currentPlaying));

    $("#ctrlPlayPause").addEventListener("click", () => {
      const v = video();
      if (v.paused) { v.play(); setPlayIcon(true); } else { v.pause(); setPlayIcon(false); }
    });
    $("#ctrlMute").addEventListener("click", () => {
      const v = video();
      v.muted = !v.muted;
      toast(v.muted ? "Muted" : "Unmuted");
    });
    $("#ctrlVolume").addEventListener("input", (e) => {
      video().volume = parseFloat(e.target.value);
    });
    $("#ctrlFullscreen").addEventListener("click", () => {
      const stage = $(".player-stage");
      if (!document.fullscreenElement) {
        (stage.requestFullscreen || stage.webkitRequestFullscreen || (() => {})).call(stage);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
      }
    });
    $("#ctrlPip").addEventListener("click", async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await video().requestPictureInPicture();
        } else {
          toast("Picture-in-picture isn't supported here");
        }
      } catch (err) {
        toast("Couldn't start picture-in-picture");
      }
    });

    // Keep play/pause icon in sync if the user controls video another way
    video().addEventListener("play", () => setPlayIcon(true));
    video().addEventListener("pause", () => setPlayIcon(false));
  }

  /* ============================= INIT ============================= */
  document.addEventListener("DOMContentLoaded", bootstrap);
})();
