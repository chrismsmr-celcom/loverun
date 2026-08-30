/**
 * HELPERS - Fonctions utilitaires réutilisables
 */

import { TIME_FORMAT } from './constants.js';

/**
 * Calcule la distance entre deux points géographiques (Formule de Haversine)
 * @param {number} lat1 - Latitude point 1
 * @param {number} lon1 - Longitude point 1
 * @param {number} lat2 - Latitude point 2
 * @param {number} lon2 - Longitude point 2
 * @returns {number} Distance en km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon terrestre en km
  const toRad = angle => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formate le temps écoulé en MM:SS
 * @param {number} elapsedMs - Temps écoulé en millisecondes
 * @returns {string} Temps au format MM:SS
 */
export function formatTime(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / TIME_FORMAT.MILLISECONDS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / TIME_FORMAT.SECONDS_PER_MINUTE);
  const seconds = totalSeconds % TIME_FORMAT.SECONDS_PER_MINUTE;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formate une distance en km avec décimales
 * @param {number} km - Distance en km
 * @param {number} decimals - Nombre de décimales (par défaut 2)
 * @returns {string} Distance formatée
 */
export function formatDistance(km, decimals = 2) {
  return km.toFixed(decimals);
}

/**
 * Extrait le token d'URL (OAuth Spotify)
 * @returns {string|null} Token ou null
 */
export function extractTokenFromHash() {
  const hashParams = window.location.hash.substring(1).split('&').reduce((acc, item) => {
    if (item) {
      const [key, value] = item.split('=');
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});

  return hashParams.access_token || null;
}

/**
 * Nettoie l'URL après extraction du token
 */
export function cleanUrlHash() {
  if (window.location.hash.includes('access_token')) {
    window.location.hash = '';
  }
}

/**
 * Sélectionne un élément DOM de manière sécurisée
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null}
 */
export function querySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error(`Erreur sélection ${selector}:`, error);
    return null;
  }
}

/**
 * Ajoute un event listener avec gestion d'erreur
 * @param {string} selector - CSS selector
 * @param {string} event - Événement (click, change, etc)
 * @param {Function} handler - Fonction à exécuter
 */
export function addEventListenerSafe(selector, event, handler) {
  const element = querySelector(selector);
  if (element) {
    element.addEventListener(event, handler);
  } else {
    console.warn(`Élément ${selector} non trouvé`);
  }
}

/**
 * Mise à jour sécurisée du texte d'un élément
 * @param {string} selector - CSS selector
 * @param {string|number} text - Texte à afficher
 */
export function updateText(selector, text) {
  const element = querySelector(selector);
  if (element) {
    element.innerText = text;
  }
}

/**
 * Mise à jour sécurisée du style d'un élément
 * @param {string} selector - CSS selector
 * @param {Object} styles - Objet de styles
 */
export function updateStyle(selector, styles) {
  const element = querySelector(selector);
  if (element) {
    Object.assign(element.style, styles);
  }
}

/**
 * Ajout/suppression de classe CSS
 * @param {string} selector - CSS selector
 * @param {string} className - Nom de la classe
 * @param {boolean} add - True pour ajouter, false pour supprimer
 */
export function toggleClass(selector, className, add = true) {
  const element = querySelector(selector);
  if (element) {
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }
}

/**
 * Affichage/masquage sécurisé d'élément
 * @param {string} selector - CSS selector
 * @param {boolean} show - True pour afficher
 * @param {string} display - Type de display (flex, block, etc)
 */
export function toggleVisibility(selector, show = true, display = 'block') {
  const element = querySelector(selector);
  if (element) {
    element.style.display = show ? display : 'none';
  }
}

/**
 * Appel API sécurisé avec retry
 * @param {string} url - URL de l'API
 * @param {Object} options - Options fetch
 * @param {number} retries - Nombre de tentatives
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

/**
 * Validation basique de paramètres
 * @param {Object} data - Données à valider
 * @param {Array<string>} required - Champs requis
 * @returns {boolean} True si valide
 */
export function validateData(data, required = []) {
  return required.every(field => field in data && data[field] !== null);
}

/**
 * Limitation de la fréquence d'exécution (debounce)
 * @param {Function} func - Fonction à throttle
 * @param {number} wait - Délai en ms
 * @returns {Function} Fonction throttled
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Limite la fréquence d'exécution (throttle)
 * @param {Function} func - Fonction à throttle
 * @param {number} limit - Délai en ms
 * @returns {Function} Fonction throttled
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Logger amélioré
 * @param {string} level - 'info', 'warn', 'error', 'debug'
 * @param {string} message - Message à logger
 * @param {*} data - Données additionnelles
 */
export function log(level = 'info', message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    console[level](`${prefix} ${message}`, data);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

/**
 * Copie du texte vers presse-papier
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Erreur copie presse-papier:', error);
    return false;
  }
}

/**
 * Vérifie la disponibilité de features du navigateur
 * @param {string} feature - Feature à vérifier
 * @returns {boolean}
 */
export function checkBrowserFeature(feature) {
  const features = {
    geolocation: 'geolocation' in navigator,
    serviceWorker: 'serviceWorker' in navigator,
    wakeLock: 'wakeLock' in navigator,
    vibration: 'vibrate' in navigator,
    notification: 'Notification' in window,
  };

  return features[feature] || false;
}

/**
 * Formate les erreurs de manière lisible
 * @param {Error} error - Objet erreur
 * @returns {string}
 */
export function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
