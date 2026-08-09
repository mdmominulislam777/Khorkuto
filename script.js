// ১. লাইভ ম্যাচ ডেটাবেজ (Events)
const matchesDatabase = [
  {
    id: 1,
    sport: "Cricket",
    league: "India Tour of Sri Lanka - Warm-Up",
    team1: "India",
    team2: "Sri Lanka",
    team1_logo: "https://flagcdn.com/w80/in.png",
    team2_logo: "https://flagcdn.com/w80/lk.png",
    startTime: "2026-08-09T16:00:00",
    streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  {
    id: 2,
    sport: "Cricket",
    league: "The Hundred Women",
    team1: "Sunrisers Leeds Women",
    team2: "Welsh Fire Women",
    team1_logo: "https://via.placeholder.com/40",
    team2_logo: "https://via.placeholder.com/40",
    startTime: "2026-08-09T17:00:00",
    streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  {
    id: 3,
    sport: "Cricket",
    league: "ICC CWC League 2",
    team1: "Scotland",
    team2: "United Arab Emirates",
    team1_logo: "https://flagcdn.com/w80/gb-sct.png",
    team2_logo: "https://flagcdn.com/w80/ae.png",
    startTime: "2026-08-09T17:00:00",
    streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  {
    id: 4,
    sport: "Football",
    league: "Club Friendly Games",
    team1: "Manchester City",
    team2: "Atlético Madrid",
    team1_logo: "https://via.placeholder.com/40",
    team2_logo: "https://via.placeholder.com/40",
    startTime: "2026-08-09T17:30:00",
    streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  {
    id: 5,
    sport: "Football",
    league: "2. Bundesliga",
    team1: "Energie Cottbus",
    team2: "Hannover 96",
    team1_logo: "https://via.placeholder.com/40",
    team2_logo: "https://via.placeholder.com/40",
    startTime: "2026-08-09T18:00:00",
    streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  }
];

// ২. ক্যাটাগরি ডেটাবেজ (Categories Tab)
const categoriesList = [
  { title: "Live Sports HD", icon: "🏆", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Live Sports SD", icon: "⚽", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "India", icon: "🇮🇳", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Bengali", icon: "🇧🇩", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Kolkata", icon: "🎭", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Pakistan", icon: "🇵🇰", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "News", icon: "📰", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Kids", icon: "🎈", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Islamic", icon: "🕌", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Radio", icon: "📻", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Movie", icon: "🎬", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Music", icon: "🎵", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
];

// ৩. স্পোর্টস চ্যানেল ডেটাবেজ (Sports Tab)
const sportsChannelsList = [
  { name: "Sports", icon: "🥊", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "TNT Sports", icon: "📺", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "BeIN Sports", icon: "⚽", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "TSN Sports", icon: "🏎️", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "SSC", icon: "🟢", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Star Sports", icon: "⭐", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Sony Sports", icon: "🎮", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Sky Sports", icon: "🌤️", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Fox Sports", icon: "🦊", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "ESPN", icon: "🔴", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "DAZN", icon: "🥊", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "T Sports", icon: "🏆", streamUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
];

let currentSport = "All";
let currentStatus = "All";

// ৪. সাইড ড্রয়ার টগল
function toggleDrawer() {
  document.getElementById('drawer').classList.toggle('open');
  document.getElementById('drawerOverlay').classList.toggle('open');
}

// ৫. বটম ন্যাভিগেশন পেজ সুইচিং
function switchPage(pageId, title, btnElement) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  document.getElementById('page-' + pageId).classList.add('active');
  document.getElementById('pageTitle').innerText = title;
  btnElement.classList.add('active');
}

// ৬. সময় ও লাইভ স্ট্যাটাস অটো ক্যালকুলেটর
function getMatchStatus(startTimeStr) {
  const now = new Date();
  const matchTime = new Date(startTimeStr);
  const diffMs = matchTime - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 0 && diffHours >= -2.5) {
    return { status: "LIVE", text: "● LIVE", isLive: true };
  } else if (diffHours < -2.5) {
    return { status: "Finished", text: "Finished", isLive: false };
  } else {
    const hoursLeft = Math.floor(diffHours);
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    let timeText = hoursLeft > 0 ? `Starts in ${hoursLeft}h ${minsLeft}m` : `Starts in ${minsLeft}m`;
    return { status: "Upcoming", text: timeText, isLive: false };
  }
}

// ৭. অ্যাপ রেন্ডার ও ফিল্টার লজিক
function renderApp() {
  const eventsContainer = document.getElementById("eventsList");
  eventsContainer.innerHTML = "";

  let filtered = matchesDatabase.filter(m => {
    const matchInfo = getMatchStatus(m.startTime);
    const sportMatch = (currentSport === "All" || m.sport === currentSport);
    
    let statusMatch = true;
    if (currentStatus === "Live") statusMatch = matchInfo.status === "LIVE";
    if (currentStatus === "Upcoming") statusMatch = matchInfo.status === "Upcoming";
    if (currentStatus === "Finished") statusMatch = matchInfo.status === "Finished";

    return sportMatch && statusMatch;
  });

  if(filtered.length === 0) {
    eventsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color:#64748b;">কোনো ম্যাচ পাওয়া যায়নি</div>`;
  } else {
    filtered.forEach(m => {
      const matchInfo = getMatchStatus(m.startTime);
      const matchDateObj = new Date(m.startTime);
      
      const formattedTime = matchDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedDate = matchDateObj.toLocaleDateString('en-GB');

      const card = document.createElement("div");
      card.className = "event-card";
      card.onclick = () => playStream(`${m.team1} vs ${m.team2}`, m.streamUrl);

      card.innerHTML = `
        <div class="card-header-badge">${m.sport} || ${m.league}</div>
        <div class="card-content">
          <div class="team">
            <img class="team-logo" src="${m.team1_logo}" alt="${m.team1}">
            <span class="team-name">${m.team1}</span>
          </div>
          <div class="match-info">
            <span class="match-time">${formattedTime}</span>
            <span class="match-date">${formattedDate}</span>
            <span class="match-status ${matchInfo.isLive ? 'status-live' : ''}">${matchInfo.text}</span>
          </div>
          <div class="team">
            <img class="team-logo" src="${m.team2_logo}" alt="${m.team2}">
            <span class="team-name">${m.team2}</span>
          </div>
        </div>
      `;
      eventsContainer.appendChild(card);
    });
  }

  renderFilters();
  renderGridPages();
}

// ৮. ক্যাটাগরি ও ফিল্টার বাটনসমূহ
function renderFilters() {
  const sportsList = [
    { name: "All", icon: "🌐" },
    { name: "Football", icon: "⚽" },
    { name: "Cricket", icon: "🏏" }
  ];

  const carousel = document.getElementById("sportCategories");
  carousel.innerHTML = sportsList.map(s => {
    const count = s.name === "All" ? matchesDatabase.length : matchesDatabase.filter(m => m.sport === s.name).length;
    return `
      <div class="sport-item ${currentSport === s.name ? 'active' : ''}" onclick="setSport('${s.name}')">
        <div class="icon-wrapper">${s.icon} <span class="badge">${count}</span></div>
        <span>${s.name}</span>
      </div>
    `;
  }).join('');

  const statuses = ["All", "Live", "Upcoming", "Finished"];
  const statusPills = document.getElementById("statusPills");
  statusPills.innerHTML = statuses.map(st => {
    return `<button class="pill ${currentStatus === st ? 'active' : ''}" onclick="setStatus('${st}')">${st}</button>`;
  }).join('');
}

// ৯. Categories এবং Sports গ্রিড লোড করা
function renderGridPages() {
  // Categories Page
  const catGrid = document.getElementById("categoriesGrid");
  catGrid.innerHTML = categoriesList.map(c => `
    <div class="grid-card" onclick="playStream('${c.title}', '${c.streamUrl}')">
      <div class="grid-icon">${c.icon}</div>
      <div class="grid-title">${c.title}</div>
    </div>
  `).join('');

  // Sports Page
  const spGrid = document.getElementById("sportsGrid");
  spGrid.innerHTML = sportsChannelsList.map(s => `
    <div class="grid-card" onclick="playStream('${s.name}', '${s.streamUrl}')">
      <div class="grid-icon">${s.icon}</div>
      <div class="grid-title">${s.name}</div>
    </div>
  `).join('');
}

function setSport(sport) { currentSport = sport; renderApp(); }
function setStatus(status) { currentStatus = status; renderApp(); }

// ১০. লাইভ স্ট্রিমিং প্লেয়ার চালু করা
function playStream(title, url) {
  const modal = document.getElementById('playerModal');
  const player = document.getElementById('videoPlayer');
  document.getElementById('channelTitle').innerText = "লাইভ স্ট্রিম: " + title;
  
  player.src = url;
  modal.classList.add('open');
  player.play();
}

function closePlayer() {
  const modal = document.getElementById('playerModal');
  const player = document.getElementById('videoPlayer');
  player.pause();
  player.src = "";
  modal.classList.remove('open');
}

// অটো রিফ্রেশ ও ফার্স্ট লোড
setInterval(renderApp, 60000);
renderApp();
