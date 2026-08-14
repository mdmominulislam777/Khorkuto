/**
 * HIGHFY TV — Sportmonks API integration
 * ---------------------------------------------------------------
 * This module only ever returns data that actually came back from
 * Sportmonks. It never invents matches, scores, or status. If the
 * token is missing or a request fails, callers get a clear error
 * instead of a silently-faked result.
 *
 * IMPORTANT — Sportmonks is split into separate products per sport,
 * each with its own base path and its own subscription:
 *   Football   -> /v3/football/...
 *   Cricket    -> /v3/cricket/...
 *   Basketball -> /v3/basketball/...
 *   Tennis     -> /v3/tennis/...
 * "WWE" is scripted entertainment, not a tracked sport, so no
 * Sportmonks endpoint exists for it — the app is upfront about that
 * instead of guessing. "FIFA" is treated as football competitions
 * that belong to FIFA (World Cup, qualifiers, Club World Cup, etc.)
 * filtered from the football endpoint, not a separate product.
 *
 * Your plan must include the relevant product or these calls will
 * return a 4xx from Sportmonks — that response is surfaced as-is.
 * ---------------------------------------------------------------
 */

const SPORTMONKS = (() => {
  const SPORTS = {
    football: { path: "football", label: "Football" },
    cricket: { path: "cricket", label: "Cricket" },
    basketball: { path: "basketball", label: "Basketball" },
    tennis: { path: "tennis", label: "Tennis" },
    fifa: { path: "football", label: "FIFA", fifaOnly: true },
    wwe: { unsupported: true, label: "WWE" },
  };

  function hasToken() {
    return Boolean(CONFIG.SPORTMONKS_API_TOKEN && CONFIG.SPORTMONKS_API_TOKEN.trim().length > 0);
  }

  function todayInTimezone() {
    // en-CA gives YYYY-MM-DD directly, which is what Sportmonks expects.
    return new Date().toLocaleDateString("en-CA", { timeZone: CONFIG.TIMEZONE });
  }

  /**
   * Normalizes whatever Sportmonks reports as the fixture/match state
   * into exactly one of: "LIVE", "UPCOMING", "FINISHED", "UNKNOWN".
   * We only ever trust the API's own state field — never the clock.
   */
  function normalizeStatus(rawState) {
    if (!rawState) return "UNKNOWN";
    const s = String(rawState).toUpperCase();

    const liveStates = [
      "LIVE", "INPLAY", "IN_PLAY", "1ST_HALF", "2ND_HALF", "HT", "HALFTIME",
      "ET", "EXTRA_TIME", "PEN_LIVE", "PENALTIES", "INT", "INNINGS_BREAK",
      "IN_PROGRESS", "STARTED",
    ];
    const notStartedStates = [
      "NS", "NOT_STARTED", "SCHEDULED", "TBA", "FIXTURE_NOT_STARTED", "UPCOMING",
    ];
    const finishedStates = [
      "FT", "FT_PEN", "AET", "FINISHED", "ENDED", "AWARDED", "CANCELLED",
      "CANCELED", "POSTPONED", "ABANDONED", "WO", "COMPLETED",
    ];

    if (liveStates.includes(s)) return "LIVE";
    if (notStartedStates.includes(s)) return "UPCOMING";
    if (finishedStates.includes(s)) return "FINISHED";
    return "UNKNOWN";
  }

  async function apiGet(path, params = {}) {
    if (!hasToken()) {
      const err = new Error("NO_TOKEN");
      err.code = "NO_TOKEN";
      throw err;
    }
    const url = new URL(`${CONFIG.BASE_URL}/${path}`);
    url.searchParams.set("api_token", CONFIG.SPORTMONKS_API_TOKEN);
    url.searchParams.set("timezone", CONFIG.TIMEZONE);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    let res;
    try {
      res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    } catch (networkErr) {
      const err = new Error("NETWORK_ERROR");
      err.code = "NETWORK_ERROR";
      err.cause = networkErr;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(`API_ERROR_${res.status}`);
      err.code = "API_ERROR";
      err.status = res.status;
      try {
        err.body = await res.json();
      } catch (_) {
        /* ignore body parse failure */
      }
      throw err;
    }

    return res.json();
  }

  function mapFixtureToEvent(fixture, sportLabel) {
    // Sportmonks football/basketball/etc fixture shape (v3):
    // fixture.participants -> [{name, image_path, meta:{location}}]
    // fixture.state -> {state, short_name} (when include=state is used)
    // fixture.starting_at -> "YYYY-MM-DD HH:mm:ss" in requested timezone
    const participants = fixture.participants || [];
    const home = participants.find((p) => p.meta && p.meta.location === "home") || participants[0];
    const away = participants.find((p) => p.meta && p.meta.location === "away") || participants[1];

    const rawState =
      (fixture.state && (fixture.state.state || fixture.state.short_name)) ||
      fixture.status ||
      null;

    return {
      id: fixture.id,
      sport: sportLabel,
      tournament: (fixture.league && fixture.league.name) || fixture.name || "—",
      teamHome: {
        name: home ? home.name : "TBD",
        logo: home ? home.image_path : null,
      },
      teamAway: {
        name: away ? away.name : "TBD",
        logo: away ? away.image_path : null,
      },
      startingAt: fixture.starting_at || null,
      status: normalizeStatus(rawState),
      rawState,
    };
  }

  /**
   * Fetch today's fixtures for one sport key ("cricket", "football",
   * "basketball", "tennis", "fifa"). "wwe" always resolves to an
   * unsupported result since Sportmonks has no such data.
   */
  async function fetchEvents(sportKey) {
    const sport = SPORTS[sportKey];
    if (!sport) throw new Error(`Unknown sport: ${sportKey}`);

    if (sport.unsupported) {
      const err = new Error("SPORT_UNSUPPORTED");
      err.code = "SPORT_UNSUPPORTED";
      throw err;
    }

    const date = todayInTimezone();
    // include=participants;state;league gives us teams, live state, and competition name
    const data = await apiGet(`${sport.path}/fixtures/date/${date}`, {
      include: "participants;state;league",
    });

    let fixtures = Array.isArray(data.data) ? data.data : [];

    if (sport.fifaOnly) {
      fixtures = fixtures.filter((f) => {
        const leagueName = (f.league && f.league.name) || "";
        return /fifa|world cup/i.test(leagueName);
      });
    }

    return fixtures.map((f) => mapFixtureToEvent(f, sport.label));
  }

  /**
   * Fetches events across all requested sport keys and merges them,
   * tagging each with which sport it belongs to. Individual sport
   * failures don't take down the whole call — they're reported
   * per-sport so the UI can show partial data plus an error note.
   */
  async function fetchAllEvents(sportKeys) {
    const results = await Promise.allSettled(sportKeys.map((k) => fetchEvents(k)));
    const events = [];
    const errors = [];

    results.forEach((r, i) => {
      const key = sportKeys[i];
      if (r.status === "fulfilled") {
        events.push(...r.value);
      } else {
        errors.push({ sport: key, error: r.reason });
      }
    });

    return { events, errors };
  }

  return {
    SPORTS,
    hasToken,
    normalizeStatus,
    fetchEvents,
    fetchAllEvents,
  };
})();
