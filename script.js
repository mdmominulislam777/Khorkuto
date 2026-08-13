/**
 * HIGHFY TV - CENTRAL APPLICATION CONTROLLER
 * Fully Dynamic, JSON-Driven Live TV & Sports Engine
 */

// Global Application State
const AppState = {
  channels: [],
  events: [],
  categories: [],
  settings: {},
  favorites: JSON.parse(localStorage.getItem('highfy_favs')) || [],
  history: JSON.parse(localStorage.getItem('highfy_history')) || [],
  currentChannel: null,
  hlsInstance: null,
  activeSportFilter: 'all',
  activeCategoryFilter: null,
  isLowQualityForced: localStorage.getItem('highfy_lowq') === 'true',
  currentLang: localStorage.getItem('highfy_lang') || 'en'
};

// Dictionary for Internationalization (English & Bangla)
const Translations = {
  en: {
    tagline: "Premium Live TV & Sports",
    featured: "Featured Events",
    recentlyWatched: "Recently Watched",
    clear: "Clear",
    liveNow: "Live Matches & Events",
    popularChannels: "Popular Live Channels",
    sportsHub: "Sports Hub",
    sportsSubtitle: "Select a sport to filter live matches and streams",
    allCategories: "Explore Categories",
    myFavorites: "My Favorites",
    clearAll: "Clear All",
    noFavoritesTitle: "No Favorites Saved",
    noFavoritesDesc: "Tap the star icon on any channel card or player to save it here.",
    settings: "Settings",
    language: "App Language",
    forceLowQuality: "Force Low Quality",
    autoplay: "Autoplay Stream",
    clearAppCache: "Clear App Cache & Storage",
    aboutApp: "About HighFy TV",
    version: "Application Version",
    platform: "Platform Mode",
    navHome: "Home",
    navSports: "Sports",
    navCategories: "Categories",
    navFavorites: "Favorites",
    navSettings: "Settings"
  },
  bn: {
    tagline: "প্রিমিয়াম লাইভ টিভি ও স্পোর্টস",
    featured: "বিশেষ ইভেন্টসমূহ",
    recentlyWatched: "সাম্প্রতিক দেখা চ্যানেল",
    clear: "মুছুন",
    liveNow: "চলমান ম্যাচ ও ইভেন্ট",
    popularChannels: "জনপ্রিয় চ্যানেলসমূহ",
    sportsHub: "স্পোর্টস হাব",
    sportsSubtitle: "লাইভ ম্যাচ দেখতে আপনার পছন্দের খেলা সিলেক্ট করুন",
    allCategories: "ক্যাটাগরি সমূহ",
    myFavorites: "পছন্দের তালিকা",
    clearAll: "সব মুছুন",
    noFavoritesTitle: "কোন ফেভারিট পাওয়া যায়নি",
    noFavoritesDesc: "চ্যানেল কার্ড বা প্লেয়ার থেকে স্টার আইকনে ক্লিক করে সেভ করুন।",
    settings: "সেটিংস",
    language: "অ্যাপের ভাষা",
    forceLowQuality: "লো কোয়ালিটি ফোর্স করুন",
    autoplay: "অটোপ্লে স্ট্রিম",
    clearAppCache: "ক্যাশ ও মেমোরি ক্লিয়ার করুন",
    aboutApp: "HighFy TV সম্পর্কে",
    version: "অ্যাপ্লিকেশন ভার্সন",
    platform: "প্ল্যাটফর্ম মোড",
    navHome: "হোম",
    navSports: "স্পোর্টস",
    navCategories: "ক্যাটাগরি",
    navFavorites: "ফেভারিট",
    navSettings: "সেটিংস"
  }
};

// Application Initialization Entry Point
document.addEventListener('DOMContentLoaded', async () => {
  initTelegramSDK();
  await loadAppData();
  setupNavigation();
  setupSearch();
  setupDrawerAndModals();
  applyLanguage(AppState.currentLang);
  
  // Hide Splash Screen
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.classList.add('hidden'), 400);
    }
  }, 600);
});

/* ==========================================================================
   DATA LOADING SYSTEM (CENTRAL JSON ENGINE)
   ========================================================================== */
async function loadAppData() {
  try {
    const [channelsRes, eventsRes, categoriesRes, settingsRes] = await Promise.all([
      fetch('channels.json').then(r => r.json()).catch(() => []),
      fetch('events.json').then(r => r.json()).catch(() => []),
      fetch('categories.json').then(r => r.json()).catch(() => []),
      fetch('settings.json').then(r => r.json()).catch(() => ({}))
    ]);

    // Data Validation
    AppState.channels = Array.isArray(channelsRes) ? channelsRes.filter(validateChannel) : [];
    AppState.events = Array.isArray(eventsRes) ? eventsRes : [];
    AppState.categories = Array.isArray(categoriesRes) ? categoriesRes : [];
    AppState.settings = settingsRes || {};

    // Initial Render Actions
    renderHomeView();
    renderSportsView();
    renderCategoriesView();
    renderFavoritesView();
    updateDrawerLowQStatus();

  } catch (err) {
    console.error('Error loading core JSON data:', err);
    showToast('Failed to load channel directory.');
  }
}

function validateChannel(ch) {
  if (!ch.id || !ch.name || !ch.url) {
    console.warn('Skipping invalid channel object:', ch);
    return false;
  }
  return true;
}

/* ==========================================================================
   TELEGRAM MINI APP INTEGRATION
   ========================================================================== */
function initTelegramSDK() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    // Apply Telegram Theme if available
    if (tg.colorScheme === 'dark') {
      document.body.classList.add('tg-dark-theme');
    }
    
    document.getElementById('platform-type-label').innerText = 'Telegram Mini App';
  }
}

/* ==========================================================================
   NAVIGATION & TAB SYSTEM
   ========================================================================== */
function setupNavigation() {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      
      // Update Active Nav State
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Switch Views
      document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
      const activeView = document.getElementById(targetId);
      if (activeView) activeView.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.getElementById('home-brand-btn').addEventListener('click', () => {
    document.querySelector('.bottom-nav .nav-item[data-target="view-home"]').click();
  });
}

/* ==========================================================================
   RENDER HOME VIEW
   ========================================================================== */
function renderHomeView() {
  // Render Featured Events
  const featuredContainer = document.getElementById('featured-carousel');
  featuredContainer.innerHTML = '';
  
  const featuredEvents = AppState.events.slice(0, 3);
  if (featuredEvents.length === 0) {
    featuredContainer.innerHTML = '<p class="text-muted">No featured matches live at the moment.</p>';
  } else {
    featuredEvents.forEach(evt => {
      const card = document.createElement('div');
      card.className = 'featured-card';
      card.innerHTML = `
        <div class="featured-card-content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge badge-live">LIVE</span>
            <span class="size-12 text-muted">${evt.tournament || 'Live Sport'}</span>
          </div>
          <div class="featured-teams">
            <div class="team-item">
              <img src="${evt.team1Logo}" onerror="this.src='assets/logo.png'" class="team-logo">
              <span class="team-item-name">${evt.team1}</span>
            </div>
            <span class="vs-pill">VS</span>
            <div class="team-item">
              <img src="${evt.team2Logo}" onerror="this.src='assets/logo.png'" class="team-logo">
              <span class="team-item-name">${evt.team2}</span>
            </div>
          </div>
        </div>
      `;
      card.addEventListener('click', () => playChannelById(evt.channelId));
      featuredContainer.appendChild(card);
    });
  }

  // Render Recently Watched
  renderRecentChannels();

  // Render Live Sports Fixtures
  const eventsListContainer = document.getElementById('live-events-list');
  eventsListContainer.innerHTML = '';
  
  if (AppState.events.length === 0) {
    eventsListContainer.innerHTML = '<p class="text-muted">No scheduled sports matches right now.</p>';
  } else {
    AppState.events.forEach(evt => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        <div class="event-card-teams">
          <i class="fa-solid fa-trophy text-accent"></i>
          <div>
            <div class="event-team-name">${evt.team1} vs ${evt.team2}</div>
            <div class="size-12 text-muted">${evt.sport} • ${evt.tournament}</div>
          </div>
        </div>
        <span class="badge badge-live">WATCH</span>
      `;
      card.addEventListener('click', () => playChannelById(evt.channelId));
      eventsListContainer.appendChild(card);
    });
  }
  document.getElementById('live-events-count').innerText = `${AppState.events.length} LIVE`;

  // Render Popular Home Channels
  const channelsGrid = document.getElementById('home-channels-grid');
  renderChannelGrid(channelsGrid, AppState.channels);
}

/* ==========================================================================
   RENDER RECENTLY WATCHED
   ========================================================================== */
function renderRecentChannels() {
  const recentSection = document.getElementById('recent-section');
  const recentContainer = document.getElementById('recent-channels-list');
  
  if (AppState.history.length === 0) {
    recentSection.classList.add('hidden');
    return;
  }

  recentSection.classList.remove('hidden');
  recentContainer.innerHTML = '';

  AppState.history.forEach(ch => {
    const card = createChannelCardElement(ch);
    recentContainer.appendChild(card);
  });

  document.getElementById('clear-history-btn').onclick = () => {
    AppState.history = [];
    localStorage.removeItem('highfy_history');
    renderRecentChannels();
    showToast('Watch history cleared');
  };
}

/* ==========================================================================
   RENDER SPORTS HUB VIEW
   ========================================================================== */
function renderSportsView() {
  const sportsList = ['All', 'Cricket', 'Football', 'Basketball', 'Tennis', 'WWE', 'UFC', 'Formula 1'];
  const chipsContainer = document.getElementById('sports-filter-chips');
  chipsContainer.innerHTML = '';

  sportsList.forEach(sport => {
    const chip = document.createElement('button');
    chip.className = `chip ${AppState.activeSportFilter.toLowerCase() === sport.toLowerCase() ? 'active' : ''}`;
    chip.innerText = sport;
    chip.addEventListener('click', () => {
      AppState.activeSportFilter = sport.toLowerCase();
      renderSportsView();
    });
    chipsContainer.appendChild(chip);
  });

  // Filter Events & Channels by Sport
  const filteredEvents = AppState.activeSportFilter === 'all' 
    ? AppState.events 
    : AppState.events.filter(e => e.sport.toLowerCase() === AppState.activeSportFilter);

  const filteredChannels = AppState.activeSportFilter === 'all'
    ? AppState.channels.filter(c => c.category.toLowerCase() === 'sports' || c.subcategory?.toLowerCase() === AppState.activeSportFilter)
    : AppState.channels.filter(c => c.subcategory?.toLowerCase() === AppState.activeSportFilter || c.category.toLowerCase() === AppState.activeSportFilter);

  // Render Filtered Sports Events
  const sportsEventsGrid = document.getElementById('sports-events-grid');
  sportsEventsGrid.innerHTML = '';
  if (filteredEvents.length === 0) {
    sportsEventsGrid.innerHTML = '<p class="text-muted">No active live matches found for this sport.</p>';
  } else {
    filteredEvents.forEach(evt => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        <div class="event-card-teams">
          <i class="fa-solid fa-circle-play text-accent"></i>
          <div>
            <div class="event-team-name">${evt.team1} vs ${evt.team2}</div>
            <div class="size-12 text-muted">${evt.tournament}</div>
          </div>
        </div>
        <span class="badge badge-live">LIVE</span>
      `;
      card.addEventListener('click', () => playChannelById(evt.channelId));
      sportsEventsGrid.appendChild(card);
    });
  }

  // Render Filtered Sports Channels
  const sportsChannelsGrid = document.getElementById('sports-channels-grid');
  renderChannelGrid(sportsChannelsGrid, filteredChannels);
}

/* ==========================================================================
   RENDER CATEGORIES VIEW
   ========================================================================== */
function renderCategoriesView() {
  const catGrid = document.getElementById('categories-grid');
  catGrid.innerHTML = '';

  AppState.categories.forEach(cat => {
    // Count channels belonging to this category
    const count = AppState.channels.filter(c => 
      c.category.toLowerCase() === cat.name.toLowerCase() || 
      c.subcategory?.toLowerCase() === cat.name.toLowerCase() ||
      c.country?.toLowerCase() === cat.name.toLowerCase()
    ).length;

    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="category-icon-wrapper">
        <i class="fa-solid ${cat.icon || 'fa-tv'}"></i>
      </div>
      <div>
        <div class="category-title">${cat.name}</div>
        <div class="category-count">${count} Channels</div>
      </div>
    `;

    card.addEventListener('click', () => {
      showCategoryChannels(cat.name);
    });

    catGrid.appendChild(card);
  });

  document.getElementById('reset-category-filter').addEventListener('click', () => {
    document.getElementById('category-channels-wrapper').classList.add('hidden');
    document.getElementById('categories-grid').classList.remove('hidden');
  });
}

function showCategoryChannels(catName) {
  const filtered = AppState.channels.filter(c => 
    c.category.toLowerCase() === catName.toLowerCase() || 
    c.subcategory?.toLowerCase() === catName.toLowerCase() ||
    c.country?.toLowerCase() === catName.toLowerCase()
  );

  document.getElementById('categories-grid').classList.add('hidden');
  const wrapper = document.getElementById('category-channels-wrapper');
  wrapper.classList.remove('hidden');

  document.getElementById('selected-category-title').innerText = `${catName} Channels`;
  renderChannelGrid(document.getElementById('category-filtered-channels'), filtered);
}

/* ==========================================================================
   RENDER FAVORITES VIEW
   ========================================================================== */
function renderFavoritesView() {
  const favGrid = document.getElementById('favorites-grid');
  const emptyState = document.getElementById('favorites-empty');

  const favChannels = AppState.channels.filter(c => AppState.favorites.includes(c.id));

  if (favChannels.length === 0) {
    favGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    renderChannelGrid(favGrid, favChannels);
  }

  document.getElementById('clear-favs-btn').onclick = () => {
    AppState.favorites = [];
    localStorage.removeItem('highfy_favs');
    renderFavoritesView();
    showToast('Favorites cleared');
  };
}

/* ==========================================================================
   CHANNEL CARD HELPER BUILDER
   ========================================================================== */
function renderChannelGrid(container, list) {
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No channels found.</p>';
    return;
  }
  list.forEach(ch => {
    const card = createChannelCardElement(ch);
    container.appendChild(card);
  });
}

function createChannelCardElement(ch) {
  const isFav = AppState.favorites.includes(ch.id);
  const card = document.createElement('div');
  card.className = 'channel-card';
  
  card.innerHTML = `
    <button class="card-fav-btn ${isFav ? 'active' : ''}" aria-label="Favorite">
      <i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i>
    </button>
    <img src="${ch.logo}" onerror="this.src='assets/logo.png'" alt="${ch.name}" class="channel-card-logo" loading="lazy">
    <div class="channel-card-title">${ch.name}</div>
    <div class="channel-card-sub">${ch.category} • ${ch.quality || 'HD'}</div>
  `;

  // Play channel on card click
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-fav-btn')) return; // Ignore if clicking favorite star
    playChannel(ch);
  });

  // Toggle favorite star
  const favBtn = card.querySelector('.card-fav-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(ch.id);
    const updatedFav = AppState.favorites.includes(ch.id);
    favBtn.classList.toggle('active', updatedFav);
    favBtn.querySelector('i').className = `fa-${updatedFav ? 'solid' : 'regular'} fa-star`;
  });

  return card;
}

function toggleFavorite(id) {
  if (AppState.favorites.includes(id)) {
    AppState.favorites = AppState.favorites.filter(favId => favId !== id);
    showToast('Removed from favorites');
  } else {
    AppState.favorites.push(id);
    showToast('Added to favorites');
  }
  localStorage.setItem('highfy_favs', JSON.stringify(AppState.favorites));
  renderFavoritesView();
}

/* ==========================================================================
   VIDEO PLAYER & HLS ENGINE
   ========================================================================== */
function playChannelById(channelId) {
  const channel = AppState.channels.find(c => c.id === channelId);
  if (channel) {
    playChannel(channel);
  } else {
    showToast('Channel stream not found');
  }
}

function playChannel(channel) {
  AppState.currentChannel = channel;
  addToHistory(channel);

  const modal = document.getElementById('player-modal');
  modal.classList.remove('hidden');

  // Update Player UI Headers
  document.getElementById('player-channel-title').innerText = channel.name;
  document.getElementById('player-meta-title').innerText = channel.name;
  document.getElementById('player-meta-desc').innerText = `${channel.category} • ${channel.country || 'Global'} • ${channel.language || ''}`;
  document.getElementById('player-logo-img').src = channel.logo;

  // Update Player Favorite Button
  const favBtn = document.getElementById('player-fav-btn');
  const isFav = AppState.favorites.includes(channel.id);
  favBtn.querySelector('i').className = `fa-${isFav ? 'solid' : 'regular'} fa-star`;
  favBtn.onclick = () => {
    toggleFavorite(channel.id);
    const updatedFav = AppState.favorites.includes(channel.id);
    favBtn.querySelector('i').className = `fa-${updatedFav ? 'solid' : 'regular'} fa-star`;
  };

  // Render Related Channels (Same category)
  const related = AppState.channels.filter(c => c.category === channel.category && c.id !== channel.id).slice(0, 6);
  renderChannelGrid(document.getElementById('player-related-grid'), related);

  // Initialize HLS Playback Engine
  initializeHlsStream(channel.url);
}

function initializeHlsStream(streamUrl) {
  const video = document.getElementById('main-video-player');
  const loader = document.getElementById('video-loader');
  const errorOverlay = document.getElementById('video-error-overlay');

  loader.classList.remove('hidden');
  errorOverlay.classList.add('hidden');

  // Destroy previous HLS instance if active
  if (AppState.hlsInstance) {
    AppState.hlsInstance.destroy();
    AppState.hlsInstance = null;
  }

  // Check HLS.js support
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90
    });

    AppState.hlsInstance = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      loader.classList.add('hidden');
      if (AppState.isLowQualityForced && hls.levels.length > 0) {
        hls.currentLevel = 0; // Force lowest quality index
      }
      video.play().catch(e => console.log('Autoplay blocked:', e));
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            loader.classList.add('hidden');
            errorOverlay.classList.remove('hidden');
            break;
        }
      }
    });

  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native Safari / iOS HLS Fallback
    video.src = streamUrl;
    video.addEventListener('loadedmetadata', () => {
      loader.classList.add('hidden');
      video.play();
    });
    video.addEventListener('error', () => {
      loader.classList.add('hidden');
      errorOverlay.classList.remove('hidden');
    });
  } else {
    loader.classList.add('hidden');
    errorOverlay.classList.remove('hidden');
    document.getElementById('video-error-msg').innerText = 'HLS playback is not supported on this browser.';
  }

  // Player Overlay Controls
  document.getElementById('player-back-btn').onclick = closePlayerModal;
  document.getElementById('player-retry-btn').onclick = () => initializeHlsStream(streamUrl);
  document.getElementById('player-share-btn').onclick = () => shareChannel(AppState.currentChannel);
}

function closePlayerModal() {
  const modal = document.getElementById('player-modal');
  modal.classList.add('hidden');
  modal.classList.remove('floating-mode');

  const video = document.getElementById('main-video-player');
  video.pause();
  if (AppState.hlsInstance) {
    AppState.hlsInstance.destroy();
    AppState.hlsInstance = null;
  }
}

function addToHistory(channel) {
  AppState.history = AppState.history.filter(c => c.id !== channel.id);
  AppState.history.unshift(channel);
  if (AppState.history.length > 10) AppState.history.pop();
  localStorage.setItem('highfy_history', JSON.stringify(AppState.history));
  renderRecentChannels();
}

/* ==========================================================================
   SEARCH SYSTEM
   ========================================================================== */
function setupSearch() {
  const toggleBtn = document.getElementById('search-toggle-btn');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear-btn');

  toggleBtn.addEventListener('click', () => {
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) {
      input.focus();
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    overlay.classList.add('hidden');
    renderHomeView();
  });

  // Debounced Instant Search
  let timeout = null;
  input.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderHomeView();
        return;
      }

      const filtered = AppState.channels.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.subcategory?.toLowerCase().includes(query) ||
        c.country?.toLowerCase().includes(query) ||
        c.language?.toLowerCase().includes(query)
      );

      // Switch to home view to display search results
      document.querySelector('.bottom-nav .nav-item[data-target="view-home"]').click();
      renderChannelGrid(document.getElementById('home-channels-grid'), filtered);
    }, 250);
  });
}

/* ==========================================================================
   DRAWER & MODALS SYSTEM
   ========================================================================== */
function setupDrawerAndModals() {
  const drawer = document.getElementById('side-drawer');
  const overlay = document.getElementById('side-drawer-overlay');
  const menuBtn = document.getElementById('menu-btn');
  const closeBtn = document.getElementById('close-drawer-btn');

  const openDrawer = () => {
    drawer.classList.add('open');
    overlay.classList.remove('hidden');
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    overlay.classList.add('hidden');
  };

  menuBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Network Stream Playlist Modal Trigger
  document.getElementById('drawer-network-stream').addEventListener('click', () => {
    closeDrawer();
    document.getElementById('network-modal').classList.remove('hidden');
  });

  document.getElementById('close-network-modal').onclick = () => {
    document.getElementById('network-modal').classList.add('hidden');
  };
  document.getElementById('cancel-network-btn').onclick = () => {
    document.getElementById('network-modal').classList.add('hidden');
  };

  document.getElementById('play-network-btn').onclick = () => {
    const url = document.getElementById('custom-m3u8-input').value.trim();
    if (url) {
      document.getElementById('network-modal').classList.add('hidden');
      playChannel({
        id: 'custom-' + Date.now(),
        name: 'Network Stream',
        logo: 'assets/logo.png',
        category: 'Custom',
        url: url
      });
    } else {
      showToast('Please enter a valid M3U8 URL');
    }
  };

  // Force Low Quality Toggle
  document.getElementById('drawer-toggle-lowq').addEventListener('click', () => {
    AppState.isLowQualityForced = !AppState.isLowQualityForced;
    localStorage.setItem('highfy_lowq', AppState.isLowQualityForced);
    document.getElementById('setting-force-low').checked = AppState.isLowQualityForced;
    updateDrawerLowQStatus();
    showToast(`Force Low Quality: ${AppState.isLowQualityForced ? 'ON' : 'OFF'}`);
  });

  document.getElementById('setting-force-low').addEventListener('change', (e) => {
    AppState.isLowQualityForced = e.target.checked;
    localStorage.setItem('highfy_lowq', AppState.isLowQualityForced);
    updateDrawerLowQStatus();
  });

  // Language Switcher Event
  document.getElementById('setting-language-select').value = AppState.currentLang;
  document.getElementById('setting-language-select').addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });

  // Settings Actions
  document.getElementById('btn-clear-cache').onclick = () => {
    localStorage.clear();
    showToast('Storage & Preferences cleared');
    setTimeout(() => location.reload(), 1000);
  };

  // External Drawer Links
  document.getElementById('drawer-telegram-btn').onclick = () => {
    window.open(AppState.settings.telegramUrl || 'https://t.me', '_blank');
  };
  document.getElementById('btn-open-telegram').onclick = () => {
    window.open(AppState.settings.telegramUrl || 'https://t.me', '_blank');
  };
  document.getElementById('drawer-contact-btn').onclick = () => {
    window.open(AppState.settings.contactUrl || '#', '_blank');
  };
  document.getElementById('drawer-website-btn').onclick = () => {
    window.open(AppState.settings.websiteUrl || '#', '_blank');
  };
  document.getElementById('drawer-share-btn').onclick = shareApp;
}

function updateDrawerLowQStatus() {
  const badge = document.getElementById('drawer-lowq-status');
  badge.innerText = AppState.isLowQualityForced ? 'ON' : 'OFF';
  badge.style.color = AppState.isLowQualityForced ? 'var(--status-success)' : 'var(--text-muted)';
}

/* ==========================================================================
   LANGUAGE & TRANSLATION ENGINE
   ========================================================================== */
function applyLanguage(lang) {
  if (!Translations[lang]) return;
  AppState.currentLang = lang;
  localStorage.setItem('highfy_lang', lang);

  const dict = Translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.innerText = dict[key];
  });
}

/* ==========================================================================
   SHARE SYSTEM & TOAST MESSAGES
   ========================================================================== */
function shareApp() {
  if (navigator.share) {
    navigator.share({
      title: 'HighFy TV',
      text: 'Watch Live TV & Sports Streams on HighFy TV!',
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('App link copied to clipboard!');
  }
}

function shareChannel(ch) {
  if (!ch) return;
  if (navigator.share) {
    navigator.share({
      title: ch.name + ' - HighFy TV',
      text: `Watch ${ch.name} Live on HighFy TV!`,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('Channel link copied!');
  }
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
