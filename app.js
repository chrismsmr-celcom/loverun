/**
 * LOVERUN - FRONTEND REFACTORED
 * Application de tracking de running avec coaching IA
 * Version: 2.0.0
 */

// ============================================
// CONSTANTES ET HELPERS INTEGRÉS (Browser Ready)
// ============================================

const LOCATIONS = {
  PARIS: { lng: 2.3522, lat: 48.8566, zoom: 13 },
  DEFAULT_ZOOM: 15,
  GEOLOCATION_ZOOM: 16
};

const MAP_STYLES = {
  DEFAULT: 'mapbox://styles/mapbox/dark-v11'
};

const MAP_COLORS = {
  ROUTE: '#ff2d55',
  ROUTE_WIDTH: 5,
  ROUTE_SHARE_WIDTH: 6
};

const GEO_CONFIG = {
  WATCH_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
};

const SPOTIFY_CONFIG = {
  PLAYER_NAME: 'LoveRun Player',
  DEFAULT_VOLUME: 0.8
};

const SPOTIFY_STORAGE_KEY = 'spotify_access_token';

const GOAL_CONFIG = {
  INITIAL: 500,
  INCREMENT: 500,
  SUCCESS_MESSAGE: 'atteint ! 🎉',
  SUCCESS_DISPLAY_MS: 3000
};

const DOM_SELECTORS = {
  MAP: '#map',
  SHARE_MAP: '#share-map',
  TIMER: '#timer',
  DISTANCE: '#distance-display',
  PROGRESS_FILL: '#progress-fill',
  GOAL_TEXT: '#goal-text',
  START_BTN: '#start-btn',
  SHARE_BTN: '#share-btn',
  SPOTIFY_HEADER_WIDGET: '#spotify-widget',
  SPOTIFY_MODAL: '#spotify-modal',
  CLOSE_SPOTIFY_MODAL: '#close-spotify-modal',
  SPOTIFY_LOGIN_BTN: '#spotify-login-btn',
  SP_LOGIN_STATE: '#sp-login-state',
  SP_PLAYER_STATE: '#sp-player-state',
  SP_COVER: '#spotify-cover',
  MODAL_SP_COVER: '#modal-spotify-cover',
  TRACK_TITLE: '#track-title',
  TRACK_ARTIST: '#track-artist',
  EQ_ANIM: '#eq-animation',
  MODAL_PLAY_BTN: '#sp-play-btn',
  MODAL_NEXT_BTN: '#sp-next-btn',
  MODAL_PREV_BTN: '#sp-prev-btn',
  SHARE_MODAL: '#share-modal',
  CLOSE_MODAL_BTN: '#close-modal-btn',
  DOWNLOAD_BTN: '#download-card-btn',
  CARD_TIMER: '#card-timer',
  CARD_DIST: '#card-distance',
  CAPTURE_CARD: '#capture-card',
  RANDOM_QUOTE: '#ai-coach-quote'
};

const ERROR_MESSAGES = {
  CONFIG_LOAD_FAILED: 'Impossible de charger la configuration API.',
  GEO_NOT_SUPPORTED: 'La géolocalisation n\'est pas supportée par votre navigateur.',
  GEO_PERMISSION_DENIED: 'Permission de géolocalisation refusée.',
  DEEPSEEK_ERROR: 'Erreur lors de la génération du feedback IA.'
};

const API_ENDPOINTS = {
  CONFIG: '/api/config',
  SPOTIFY_LOGIN: '/api/spotify-login',
  COACH: '/api/coach'
};

// --- Helpers ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDistance(distKm) {
  return distKm.toFixed(2);
}

function extractTokenFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

function cleanUrlHash() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState('', document.title, window.location.pathname + window.location.search);
  } else {
    window.location.hash = '';
  }
}

function querySelector(selector) {
  return document.querySelector(selector);
}

function addEventListenerSafe(selector, event, handler) {
  const el = querySelector(selector);
  if (el) {
    el.addEventListener(event, handler);
  }
}

function updateText(selector, text) {
  const el = querySelector(selector);
  if (el) el.textContent = text;
}

function updateStyle(selector, styles) {
  const el = querySelector(selector);
  if (el) {
    Object.assign(el.style, styles);
  }
}

function toggleVisibility(selector, visible, displayStyle = 'block') {
  const el = querySelector(selector);
  if (el) {
    el.style.display = visible ? displayStyle : 'none';
  }
}

function toggleClass(selector, className, add) {
  const el = querySelector(selector);
  if (el) {
    el.classList.toggle(className, add);
  }
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
}

function log(level, message, detail = '') {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, detail);
}

function checkBrowserFeature(feature) {
  switch (feature) {
    case 'geolocation': return 'geolocation' in navigator;
    case 'wakeLock': return 'wakeLock' in navigator;
    case 'serviceWorker': return 'serviceWorker' in navigator;
    default: return false;
  }
}

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

      if (window.mapboxgl) {
        window.mapboxgl.accessToken = config.mapboxToken;
      }
      
      let supabaseClient = null;
      if (window.supabase && config.supabaseUrl && config.supabaseKey) {
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      }

      return { mapboxgl: window.mapboxgl, supabaseClient };
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
    if (!window.mapboxgl) return;

    const mapContainer = querySelector(DOM_SELECTORS.MAP);
    if (!mapContainer) return;

    this.state.map = new window.mapboxgl.Map({
      container: mapContainer,
      style: MAP_STYLES.DEFAULT,
      center: [LOCATIONS.PARIS.lng, LOCATIONS.PARIS.lat],
      zoom: LOCATIONS.PARIS.zoom,
      preserveDrawingBuffer: true,
    });

    this.state.map.on('load', () => this.setupMainMapLayers());
  }

  setupMainMapLayers() {
    if (!this.state.map) return;

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
    if (!this.state.map || !window.mapboxgl) return;

    if (!this.state.userMarker) {
      const el = document.createElement('div');
      el.className = 'user-marker';
      this.state.userMarker = new window.mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(this.state.map);
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
    if (!window.mapboxgl) return;

    const shareContainer = querySelector(DOM_SELECTORS.SHARE_MAP);
    if (!shareContainer) return;

    if (!this.state.shareMap) {
      this.state.shareMap = new window.mapboxgl.Map({
        container: shareContainer,
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
    if (coordinates.length > 0 && window.mapboxgl && this.state.shareMap) {
      const bounds = new window.mapboxgl.LngLatBounds();
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
    if (!this.state.spotifyToken) {
      log('info', 'Token Spotify absent, initialisation du player ignorée.');
      return;
    }

    // 1. Définir le callback global AVANT tout
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!window.Spotify) return;

      this.state.spotifyPlayer = new window.Spotify.Player({
        name: SPOTIFY_CONFIG.PLAYER_NAME,
        getOAuthToken: cb => cb(this.state.spotifyToken),
        volume: SPOTIFY_CONFIG.DEFAULT_VOLUME,
      });

      this.state.spotifyPlayer.addListener('player_state_changed', state => this.handleStateChange(state));
      this.state.spotifyPlayer.connect();
    };

    // 2. SÉCURITÉ : Si le script SDK est déjà chargé par le navigateur avant l'exécution de ce code
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }
  }

  handleStateChange(state) {
    if (!state) return;

    const track = state.track_window.current_track;
    this.state.isPlayingMusic = !state.paused;

    const imgUrl = track.album.images[0]?.url;
    if (imgUrl) {
      updateStyle(DOM_SELECTORS.SP_COVER, { backgroundImage: `url(${imgUrl})` });
      const modalCover = querySelector(DOM_SELECTORS.MODAL_SP_COVER);
      if (modalCover) modalCover.src = imgUrl;
    }

    updateText(DOM_SELECTORS.TRACK_TITLE, track.name);
    updateText(DOM_SELECTORS.TRACK_ARTIST, track.artists.map(a => a.name).join(', '));

    if (this.state.isPlayingMusic) {
      toggleClass(DOM_SELECTORS.EQ_ANIM, 'eq-active', true);
      const playBtn = querySelector(DOM_SELECTORS.MODAL_PLAY_BTN);
      if (playBtn) playBtn.innerHTML = `<i data-lucide="pause"></i>`;
    } else {
      toggleClass(DOM_SELECTORS.EQ_ANIM, 'eq-active', false);
      const playBtn = querySelector(DOM_SELECTORS.MODAL_PLAY_BTN);
      if (playBtn) playBtn.innerHTML = `<i data-lucide="play"></i>`;
    }

    if (window.lucide) window.lucide.createIcons();
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
    addEventListenerSafe(DOM_SELECTORS.START_BTN, 'click', () => this.toggleRun());
    addEventListenerSafe(DOM_SELECTORS.SHARE_BTN, 'click', () => this.openShareModal());

    addEventListenerSafe(DOM_SELECTORS.SPOTIFY_HEADER_WIDGET, 'click', () => this.openSpotifyModal());
    addEventListenerSafe(DOM_SELECTORS.CLOSE_SPOTIFY_MODAL, 'click', () => this.closeSpotifyModal());

    addEventListenerSafe(DOM_SELECTORS.SPOTIFY_LOGIN_BTN, 'click', () => {
      window.location.href = API_ENDPOINTS.SPOTIFY_LOGIN;
    });

    addEventListenerSafe(DOM_SELECTORS.MODAL_PLAY_BTN, 'click', () => this.spotify.play());
    addEventListenerSafe(DOM_SELECTORS.MODAL_NEXT_BTN, 'click', () => this.spotify.next());
    addEventListenerSafe(DOM_SELECTORS.MODAL_PREV_BTN, 'click', () => this.spotify.previous());

    addEventListenerSafe(DOM_SELECTORS.CLOSE_MODAL_BTN, 'click', () => this.closeShareModal());
    addEventListenerSafe(DOM_SELECTORS.DOWNLOAD_BTN, 'click', () => this.downloadImage());
  }

  async toggleRun() {
    if (!this.state.isRunning) {
      this.state.isRunning = true;

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
    if (startBtn) {
      startBtn.innerHTML = `<i data-lucide="pause"></i> Pause`;
      startBtn.className = 'btn btn-secondary';
    }
    toggleVisibility(DOM_SELECTORS.SHARE_BTN, true, 'flex');
    if (window.lucide) window.lucide.createIcons();
  }

  updatePausedUI() {
    const startBtn = querySelector(DOM_SELECTORS.START_BTN);
    if (startBtn) {
      startBtn.innerHTML = `<i data-lucide="play"></i> Reprendre`;
      startBtn.className = 'btn btn-primary';
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async openShareModal() {
    const timeStr = formatTime(this.state.elapsedTime);
    const distNum = parseFloat(formatDistance(this.state.totalDistance));

    updateText(DOM_SELECTORS.CARD_TIMER, timeStr);
    updateText(DOM_SELECTORS.CARD_DIST, `${distNum} km`);
    toggleVisibility(DOM_SELECTORS.SHARE_MODAL, true, 'flex');

    this.mapManager.initShareMap(this.state.coordinates);

    await this.generateCoachFeedback(distNum, timeStr);

    if (this.state.supabaseClient) {
      const quoteEl = querySelector(DOM_SELECTORS.RANDOM_QUOTE);
      await this.state.supabaseClient.from('runs').insert([
        {
          duration: timeStr,
          distance_km: distNum,
          coordinates: this.state.coordinates,
          ai_feedback: quoteEl ? quoteEl.innerText : 'Run terminé !',
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
      if (!card || !window.html2canvas) return;

      const canvas = await window.html2canvas(card, { useCORS: true, allowTaint: true });

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
      const config = await AppConfig.load();
      const state = new LoveRunState();
      state.supabaseClient = config.supabaseClient;

      const mapManager = new MapManager(state);
      const geolocationManager = new GeolocationManager(state, mapManager);
      const timerManager = new TimerManager(state);
      const goalManager = new GoalManager(state);
      const spotifyPlayer = new SpotifyPlayer(state);
      const uiController = new UIController(state, geolocationManager, timerManager, goalManager, mapManager, spotifyPlayer);

      mapManager.initMainMap();
      geolocationManager.init();
      spotifyPlayer.init();
      uiController.setupEventListeners();

      if (checkBrowserFeature('serviceWorker')) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          log('info', 'Service Worker registered');
        } catch (error) {
          log('warn', 'Service Worker registration failed', error);
        }
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }

      log('info', 'LoveRun initialized successfully');
    } catch (error) {
      log('error', 'Initialization failed', error);
    }
  }
}

// Démarrage de l'application une fois le DOM chargé
document.addEventListener('DOMContentLoaded', () => {
  const app = new LoveRunApp();
  app.init();
});
