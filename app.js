/**
 * LOVERUN - FRONTEND REFACTORED
 * Application de tracking de running avec coaching IA
 * Version: 2.0.0
 */

import {
  LOCATIONS,
  MAP_STYLES,
  MAP_COLORS,
  GEO_CONFIG,
  SPOTIFY_CONFIG,
  SPOTIFY_STORAGE_KEY,
  GOAL_CONFIG,
  DOM_SELECTORS,
  ERROR_MESSAGES,
  API_ENDPOINTS,
} from './utils/constants.js';

import {
  calculateDistance,
  formatTime,
  formatDistance,
  extractTokenFromHash,
  cleanUrlHash,
  querySelector,
  addEventListenerSafe,
  updateText,
  updateStyle,
  toggleVisibility,
  toggleClass,
  fetchWithRetry,
  log,
  checkBrowserFeature,
} from './utils/helpers.js';

// ============================================
// STATE MANAGEMENT
// ============================================

class LoveRunState {
  constructor() {
    this.map = null;
    this.shareMap = null;
    this.watchId = null;
    this.timerInterval = null;
    this.spotifyPlayer = null;
    this.supabaseClient = null;

    this.isRunning = false;
    this.isPlayingMusic = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.totalDistance = 0;
    this.coordinates = [];
    this.userMarker = null;
    this.currentGoal = GOAL_CONFIG.INITIAL;

    this.spotifyToken = this.loadSpotifyToken();
  }

  loadSpotifyToken() {
    const token = extractTokenFromHash();
    if (token) {
      cleanUrlHash();
      this.spotifyToken = token;
      sessionStorage.setItem(SPOTIFY_STORAGE_KEY, token);
    }
    return sessionStorage.getItem(SPOTIFY_STORAGE_KEY) || null;
  }

  resetRun() {
    this.isRunning = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.totalDistance = 0;
    this.coordinates = [];
    this.currentGoal = GOAL_CONFIG.INITIAL;
  }
}

// ============================================
// CONFIGURATION & INITIALIZATION
// ============================================

class AppConfig {
  static async load() {
    try {
      const response = await fetchWithRetry(API_ENDPOINTS.CONFIG);
      const config = await response.json();

      mapboxgl.accessToken = config.mapboxToken;
      const supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

      return { mapboxgl, supabaseClient };
    } catch (error) {
      log('error', ERROR_MESSAGES.CONFIG_LOAD_FAILED, error);
      throw error;
    }
  }
}

// ============================================
// MAP MANAGEMENT
// ============================================

class MapManager {
  constructor(state) {
    this.state = state;
  }

  initMainMap() {
    this.state.map = new mapboxgl.Map({
      container: DOM_SELECTORS.MAP.slice(1),
      style: MAP_STYLES.DEFAULT,
      center: [LOCATIONS.PARIS.lng, LOCATIONS.PARIS.lat],
      zoom: LOCATIONS.PARIS.zoom,
      preserveDrawingBuffer: true,
    });

    this.state.map.on('load', () => this.setupMainMapLayers());
  }

  setupMainMapLayers() {
    this.state.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
      },
    });

    this.state.map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': MAP_COLORS.ROUTE, 'line-width': MAP_COLORS.ROUTE_WIDTH },
    });
  }

  updateRoute(coordinates) {
    if (this.state.map && this.state.map.getSource('route')) {
      this.state.map.getSource('route').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
      });
    }
  }

  updateUserMarker(lng, lat) {
    if (!this.state.userMarker) {
      const el = document.createElement('div');
      el.className = 'user-marker';
      this.state.userMarker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(this.state.map);
    } else {
      this.state.userMarker.setLngLat([lng, lat]);
    }
  }

  centerMap(lng, lat, zoom = LOCATIONS.DEFAULT_ZOOM) {
    if (this.state.map) {
      this.state.map.flyTo({ center: [lng, lat], zoom });
    }
  }

  initShareMap(coordinates) {
    if (!this.state.shareMap) {
      this.state.shareMap = new mapboxgl.Map({
        container: DOM_SELECTORS.SHARE_MAP.slice(1),
        style: MAP_STYLES.DEFAULT,
        interactive: false,
        preserveDrawingBuffer: true,
      });

      this.state.shareMap.on('load', () => {
        this.state.shareMap.addSource('share-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates },
          },
        });

        this.state.shareMap.addLayer({
          id: 'share-route-line',
          type: 'line',
          source: 'share-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': MAP_COLORS.ROUTE, 'line-width': MAP_COLORS.ROUTE_SHARE_WIDTH },
        });

        this.fitShareMapBounds(coordinates);
      });
    } else if (this.state.shareMap.getSource('share-route')) {
      this.state.shareMap.getSource('share-route').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
      });
      this.fitShareMapBounds(coordinates);
    }
  }

  fitShareMapBounds(coordinates) {
    if (coordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach(coord => bounds.extend(coord));
      this.state.shareMap.fitBounds(bounds, { padding: 30, animate: false });
    }
  }
}

// ============================================
// GEOLOCATION MANAGEMENT
// ============================================

class GeolocationManager {
  constructor(state, mapManager) {
    this.state = state;
    this.mapManager = mapManager;
  }

  init() {
    if (!checkBrowserFeature('geolocation')) {
      log('warn', ERROR_MESSAGES.GEO_NOT_SUPPORTED);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => this.handlePositionSuccess(pos),
      err => this.handlePositionError(err),
      GEO_CONFIG.WATCH_OPTIONS
    );
  }

  handlePositionSuccess(pos) {
    const { latitude, longitude } = pos.coords;
    this.mapManager.updateUserMarker(longitude, latitude);
    this.mapManager.centerMap(longitude, latitude, LOCATIONS.GEOLOCATION_ZOOM);
  }

  handlePositionError(err) {
    log('warn', `${ERROR_MESSAGES.GEO_PERMISSION_DENIED}: ${err.message}`);
  }

  startTracking(onNewCoordinate) {
    if (!checkBrowserFeature('geolocation')) return;

    this.state.watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const newCoord = [longitude, latitude];

        this.mapManager.updateUserMarker(longitude, latitude);

        if (this.state.coordinates.length > 0) {
          const last = this.state.coordinates[this.state.coordinates.length - 1];
          const distance = calculateDistance(last[1], last[0], latitude, longitude);
          this.state.totalDistance += distance;
          onNewCoordinate(newCoord);
        }

        this.state.coordinates.push(newCoord);
        this.mapManager.updateRoute(this.state.coordinates);
        this.mapManager.centerMap(longitude, latitude, LOCATIONS.GEOLOCATION_ZOOM);
      },
      err => this.handlePositionError(err),
      GEO_CONFIG.WATCH_OPTIONS
    );
  }

  stopTracking() {
    if (this.state.watchId) {
      navigator.geolocation.clearWatch(this.state.watchId);
      this.state.watchId = null;
    }
  }
}

// ============================================
// TIMER MANAGEMENT
// ============================================

class TimerManager {
  constructor(state) {
    this.state = state;
  }

  start() {
    this.state.startTime = Date.now() - this.state.elapsedTime;
    this.state.timerInterval = setInterval(() => {
      this.state.elapsedTime = Date.now() - this.state.startTime;
      const timeStr = formatTime(this.state.elapsedTime);
      updateText(DOM_SELECTORS.TIMER, timeStr);
    }, 1000);
  }

  stop() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
  }

  reset() {
    this.stop();
    this.state.elapsedTime = 0;
    updateText(DOM_SELECTORS.TIMER, '00:00');
  }

  getFormattedTime() {
    return formatTime(this.state.elapsedTime);
  }
}

// ============================================
// GOAL MANAGEMENT
// ============================================

class GoalManager {
  constructor(state) {
    this.state = state;
  }

  update() {
    const distMeters = this.state.totalDistance * 1000;
    const progress = (distMeters / this.state.currentGoal) * 100;

    updateStyle(DOM_SELECTORS.PROGRESS_FILL, { width: `${Math.min(progress, 100)}%` });

    if (progress >= 100) {
      updateText(DOM_SELECTORS.GOAL_TEXT, `${this.state.currentGoal}m ${GOAL_CONFIG.SUCCESS_MESSAGE}`);
      setTimeout(() => {
        this.state.currentGoal += GOAL_CONFIG.INCREMENT;
        updateText(DOM_SELECTORS.GOAL_TEXT, `${this.state.currentGoal}m`);
      }, GOAL_CONFIG.SUCCESS_DISPLAY_MS);
    }
  }

  updateDistance() {
    const distStr = formatDistance(this.state.totalDistance);
    updateText(DOM_SELECTORS.DISTANCE, distStr);
  }
}

// ============================================
// SPOTIFY PLAYER
// ============================================

class SpotifyPlayer {
  constructor(state) {
    this.state = state;
  }

  init() {
    if (!this.state.spotifyToken) return;

    this.state.spotifyPlayer = new Spotify.Player({
      name: SPOTIFY_CONFIG.PLAYER_NAME,
      getOAuthToken: cb => cb(this.state.spotifyToken),
      volume: SPOTIFY_CONFIG.DEFAULT_VOLUME,
    });

    this.state.spotifyPlayer.addListener('player_state_changed', state => this.handleStateChange(state));
    this.state.spotifyPlayer.connect();
  }

  handleStateChange(state) {
    if (!state) return;

    const track = state.track_window.current_track;
    this.state.isPlayingMusic = !state.paused;

    const imgUrl = track.album.images[0]?.url;
    if (imgUrl) {
      updateStyle(DOM_SELECTORS.SP_COVER, { backgroundImage: `url(${imgUrl})` });
      querySelector(DOM_SELECTORS.MODAL_SP_COVER).src = imgUrl;
    }

    updateText(DOM_SELECTORS.TRACK_TITLE, track.name);
    updateText(DOM_SELECTORS.TRACK_ARTIST, track.artists.map(a => a.name).join(', '));

    if (this.state.isPlayingMusic) {
      toggleClass(DOM_SELECTORS.EQ_ANIM, 'eq-active', true);
      querySelector(DOM_SELECTORS.MODAL_PLAY_BTN).innerHTML = `<i data-lucide="pause"></i>`;
    } else {
      toggleClass(DOM_SELECTORS.EQ_ANIM, 'eq-active', false);
      querySelector(DOM_SELECTORS.MODAL_PLAY_BTN).innerHTML = `<i data-lucide="play"></i>`;
    }

    lucide.createIcons();
  }

  play() {
    if (this.state.spotifyPlayer) this.state.spotifyPlayer.togglePlay();
  }

  next() {
    if (this.state.spotifyPlayer) this.state.spotifyPlayer.nextTrack();
  }

  previous() {
    if (this.state.spotifyPlayer) this.state.spotifyPlayer.previousTrack();
  }
}

// ============================================
// UI CONTROLLER
// ============================================

class UIController {
  constructor(state, geolocation, timer, goal, mapManager, spotify) {
    this.state = state;
    this.geolocation = geolocation;
    this.timer = timer;
    this.goal = goal;
    this.mapManager = mapManager;
    this.spotify = spotify;
  }

  setupEventListeners() {
    // Start/Pause button
    addEventListenerSafe(DOM_SELECTORS.START_BTN, 'click', () => this.toggleRun());

    // Share button
    addEventListenerSafe(DOM_SELECTORS.SHARE_BTN, 'click', () => this.openShareModal());

    // Spotify modal
    addEventListenerSafe(DOM_SELECTORS.SPOTIFY_HEADER_WIDGET, 'click', () => this.openSpotifyModal());
    addEventListenerSafe(DOM_SELECTORS.CLOSE_SPOTIFY_MODAL, 'click', () => this.closeSpotifyModal());

    // Spotify controls
    addEventListenerSafe(DOM_SELECTORS.SPOTIFY_LOGIN_BTN, 'click', () => {
      window.location.href = API_ENDPOINTS.SPOTIFY_LOGIN;
    });

    addEventListenerSafe(DOM_SELECTORS.MODAL_PLAY_BTN, 'click', () => this.spotify.play());
    addEventListenerSafe(DOM_SELECTORS.MODAL_NEXT_BTN, 'click', () => this.spotify.next());
    addEventListenerSafe(DOM_SELECTORS.MODAL_PREV_BTN, 'click', () => this.spotify.previous());

    // Share modal
    addEventListenerSafe(DOM_SELECTORS.CLOSE_MODAL_BTN, 'click', () => this.closeShareModal());
    addEventListenerSafe(DOM_SELECTORS.DOWNLOAD_BTN, 'click', () => this.downloadImage());
  }

  async toggleRun() {
    if (!this.state.isRunning) {
      this.state.isRunning = true;

      // Request wake lock
      if (checkBrowserFeature('wakeLock')) {
        try {
          await navigator.wakeLock.request('screen');
        } catch (err) {
          log('warn', 'Wake Lock failed', err);
        }
      }

      this.updateRunningUI();
      this.timer.start();
      this.geolocation.startTracking(() => {
        this.goal.updateDistance();
        this.goal.update();
      });
    } else {
      this.state.isRunning = false;
      this.updatePausedUI();
      this.timer.stop();
      this.geolocation.stopTracking();
    }
  }

  updateRunningUI() {
    const startBtn = querySelector(DOM_SELECTORS.START_BTN);
    startBtn.innerHTML = `<i data-lucide="pause"></i> Pause`;
    startBtn.className = 'btn btn-secondary';
    toggleVisibility(DOM_SELECTORS.SHARE_BTN, true, 'flex');
    lucide.createIcons();
  }

  updatePausedUI() {
    const startBtn = querySelector(DOM_SELECTORS.START_BTN);
    startBtn.innerHTML = `<i data-lucide="play"></i> Reprendre`;
    startBtn.className = 'btn btn-primary';
    lucide.createIcons();
  }

  async openShareModal() {
    const timeStr = formatTime(this.state.elapsedTime);
    const distNum = parseFloat(formatDistance(this.state.totalDistance));

    updateText(DOM_SELECTORS.CARD_TIMER, timeStr);
    updateText(DOM_SELECTORS.CARD_DIST, `${distNum} km`);
    toggleVisibility(DOM_SELECTORS.SHARE_MODAL, true, 'flex');

    this.mapManager.initShareMap(this.state.coordinates);

    await this.generateCoachFeedback(distNum, timeStr);

    // Save to Supabase
    if (this.state.supabaseClient) {
      await this.state.supabaseClient.from('runs').insert([
        {
          duration: timeStr,
          distance_km: distNum,
          coordinates: this.state.coordinates,
          ai_feedback: querySelector(DOM_SELECTORS.RANDOM_QUOTE).innerText,
        },
      ]);
    }

    this.state.resetRun();
  }

  async generateCoachFeedback(distance, duration) {
    try {
      updateText(DOM_SELECTORS.RANDOM_QUOTE, '🤖 Coach en train de générer ton feedback...');

      const response = await fetchWithRetry(API_ENDPOINTS.COACH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distance, duration }),
      });

      const data = await response.json();
      updateText(DOM_SELECTORS.RANDOM_QUOTE, data.feedback || 'Session validée ! 🔥');
    } catch (error) {
      log('error', ERROR_MESSAGES.DEEPSEEK_ERROR, error);
      updateText(DOM_SELECTORS.RANDOM_QUOTE, 'Session validée ! 🔥');
    }
  }

  closeShareModal() {
    toggleVisibility(DOM_SELECTORS.SHARE_MODAL, false);
  }

  openSpotifyModal() {
    toggleVisibility(DOM_SELECTORS.SPOTIFY_MODAL, true, 'flex');
    const hasToken = !!this.state.spotifyToken;
    toggleVisibility(DOM_SELECTORS.SP_LOGIN_STATE, !hasToken);
    toggleVisibility(DOM_SELECTORS.SP_PLAYER_STATE, hasToken, 'block');
  }

  closeSpotifyModal() {
    toggleVisibility(DOM_SELECTORS.SPOTIFY_MODAL, false);
  }

  async downloadImage() {
    try {
      const card = querySelector(DOM_SELECTORS.CAPTURE_CARD);
      const canvas = await html2canvas(card, { useCORS: true, allowTaint: true });

      const link = document.createElement('a');
      link.download = `loverun-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      link.click();

      this.closeShareModal();
    } catch (error) {
      log('error', 'Image download failed', error);
    }
  }
}

// ============================================
// APPLICATION INITIALIZATION
// ============================================

class LoveRunApp {
  async init() {
    try {
      // Load config
      const config = await AppConfig.load();
      const state = new LoveRunState();
      state.supabaseClient = config.supabaseClient;

      // Initialize managers
      const mapManager = new MapManager(state);
      const geolocationManager = new GeolocationManager(state, mapManager);
      const timerManager = new TimerManager(state);
      const goalManager = new GoalManager(state);
      const spotifyPlayer = new SpotifyPlayer(state);
      const uiController = new UIController(state, geolocationManager, timerManager, goalManager, mapManager, spotifyPlayer);

      // Setup
      mapManager.initMainMap();
      geolocationManager.init();
      spotifyPlayer.init();
      uiController.setupEventListeners();

      // Register service worker
      if (checkBrowserFeature('serviceWorker')) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          log('info', 'Service Worker registered');
        } catch (error) {
          log('warn', 'Service Worker registration failed', error);
        }
      }

      // Initialize icons
      lucide.createIcons();

      log('info', 'LoveRun initialized successfully');
    } catch (error) {
      log('error', 'Initialization failed', error);
      alert('Erreur lors du chargement de l\'application');
    }
  }
}

// Start the app
const app = new LoveRunApp();
app.init();
