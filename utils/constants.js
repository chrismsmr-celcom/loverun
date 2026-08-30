/**
 * CONSTANTS - Configuration centralisée de l'application
 * À utiliser partout au lieu de magic strings/numbers
 */

// === LOCATIONS ===
export const LOCATIONS = {
  PARIS: {
    name: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    zoom: 15,
  },
  DEFAULT_ZOOM: 16,
  GEOLOCATION_ZOOM: 16,
};

// === MAP STYLING ===
export const MAP_STYLES = {
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  DEFAULT: 'mapbox://styles/mapbox/light-v11',
};

export const MAP_COLORS = {
  ROUTE: '#10b981',
  ROUTE_WIDTH: 6,
  ROUTE_SHARE_WIDTH: 5,
  MARKER_COLOR: '#10b981',
  MARKER_SIZE: 22,
  MARKER_BORDER: 3,
};

// === GOALS ===
export const GOAL_CONFIG = {
  INITIAL: 100, // meters
  INCREMENT: 100, // meters
  SUCCESS_MESSAGE: 'Atteint ! ❤️',
  SUCCESS_DISPLAY_MS: 2000,
};

// === GEOLOCATION ===
export const GEO_CONFIG = {
  ENABLE_HIGH_ACCURACY: true,
  TIMEOUT_MS: 10000,
  MAX_AGE_MS: 0,
  WATCH_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  },
};

// === SPOTIFY ===
export const SPOTIFY_CONFIG = {
  PLAYER_NAME: 'LoveRun Player',
  DEFAULT_VOLUME: 0.8,
  SCOPES: [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
  ],
};

export const SPOTIFY_STORAGE_KEY = 'loverun_spotify_token';

// === UI STATES ===
export const UI_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
};

// === API ENDPOINTS ===
export const API_ENDPOINTS = {
  CONFIG: '/api/config',
  COACH: '/api/coach',
  SPOTIFY_LOGIN: '/api/spotify-login',
  SUPABASE_RUNS: 'runs',
};

// === ANIMATIONS ===
export const ANIMATIONS = {
  HEARTBEAT_MS: 1200,
  EQ_DURATIONS: [600, 800, 500], // ms pour chaque barre EQ
  EQ_DELAYS: [0, 200, 400], // ms delays
};

// === DOM SELECTORS (pour éviter les répétitions) ===
export const DOM_SELECTORS = {
  // Map
  MAP: '#map',
  SHARE_MAP: '#shareMap',

  // Modals
  SPOTIFY_MODAL: '#spotifyModal',
  SHARE_MODAL: '#shareModal',

  // Buttons
  START_BTN: '#startBtn',
  SHARE_BTN: '#shareBtn',
  CLOSE_SPOTIFY_MODAL: '#closeSpotifyModal',
  CLOSE_MODAL_BTN: '#closeModalBtn',
  SPOTIFY_LOGIN_BTN: '#spotifyLoginBtn',
  MODAL_PLAY_BTN: '#modalPlayBtn',
  MODAL_NEXT_BTN: '#modalNextBtn',
  MODAL_PREV_BTN: '#modalPrevBtn',
  DOWNLOAD_BTN: '#downloadBtn',
  SPOTIFY_HEADER_WIDGET: '#spotifyHeaderWidget',

  // Display elements
  TIMER: '#timer',
  DISTANCE: '#distance',
  GOAL_TEXT: '#goalText',
  PROGRESS_FILL: '#progressFill',
  TRACK_TITLE: '#trackTitle',
  TRACK_ARTIST: '#trackArtist',
  RANDOM_QUOTE: '#randomQuote',
  CARD_TIMER: '#cardTimer',
  CARD_DIST: '#cardDist',

  // Images
  SP_COVER: '#spCover',
  MODAL_SP_COVER: '#modalSpCover',

  // Spotify UI
  SP_LOGIN_STATE: '#spLoginState',
  SP_PLAYER_STATE: '#spPlayerState',
  EQ_ANIM: '#eqAnim',

  // Capture card
  CAPTURE_CARD: '#captureCard',
};

// === ERROR MESSAGES ===
export const ERROR_MESSAGES = {
  CONFIG_LOAD_FAILED: 'Erreur de chargement de la configuration',
  GEO_PERMISSION_DENIED: 'Géolocalisation refusée',
  GEO_NOT_SUPPORTED: 'Géolocalisation non supportée',
  API_ERROR: 'Erreur lors de la communication avec le serveur',
  SPOTIFY_ERROR: 'Erreur Spotify',
  DEEPSEEK_ERROR: 'Erreur génération IA',
  SUPABASE_ERROR: 'Erreur base de données',
  CANVAS_ERROR: 'Erreur lors de la capture de l\'image',
};

// === SUCCESS MESSAGES ===
export const SUCCESS_MESSAGES = {
  SESSION_SAVED: 'Session sauvegardée !',
  IMAGE_DOWNLOADED: 'Image téléchargée',
  SPOTIFY_CONNECTED: 'Connecté à Spotify',
};

// === VALIDATION ===
export const VALIDATION = {
  MIN_DISTANCE_KM: 0.01,
  MAX_DISTANCE_KM: 200, // 200km max par run
  MIN_DURATION_SECONDS: 60,
  MAX_DURATION_SECONDS: 86400 * 7, // 7 days max
};

// === TIME FORMATTING ===
export const TIME_FORMAT = {
  SECONDS_PER_MINUTE: 60,
  MILLISECONDS_PER_SECOND: 1000,
};

// === API CONFIG ===
export const API_CONFIG = {
  TIMEOUT_MS: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

// === RATE LIMITING ===
export const RATE_LIMIT_CONFIG = {
  COACH_REQUESTS_PER_MINUTE: 10,
  CONFIG_REQUESTS_PER_MINUTE: 100,
};
