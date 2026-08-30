let map, shareMap, watchId, timerInterval, spotifyPlayer;
let supabaseClient = null;
let startTime = 0, elapsedTime = 0, totalDistance = 0;
let coordinates = [];
let userMarker = null;
let isRunning = false;
let currentGoal = 100;
let isPlayingMusic = false;
let SPOTIFY_TOKEN = null;

// --- 1. CAPTURE AUTOMATIQUE DU TOKEN SPOTIFY (OAUTH) ---
const hashParams = window.location.hash.substring(1).split('&').reduce((initial, item) => {
  if (item) {
    var parts = item.split('=');
    initial[parts[0]] = decodeURIComponent(parts[1]);
  }
  return initial;
}, {});

if (hashParams.access_token) {
  SPOTIFY_TOKEN = hashParams.access_token;
  window.location.hash = ''; // Nettoie l'URL
}

// --- 2. CONFIGURATION VERCEL ---
async function initConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    mapboxgl.accessToken = config.mapboxToken;
    supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

    initMap();
    initCurrentLocation();
  } catch (err) {
    console.error("Erreur de chargement de la configuration Vercel:", err);
  }
}

function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [2.3522, 48.8566],
    zoom: 15,
    preserveDrawingBuffer: true
  });

  map.on('load', () => {
    map.addSource('route', {
      'type': 'geojson',
      'data': { 'type': 'Feature', 'geometry': { 'type': 'LineString', 'coordinates': [] } }
    });

    map.addLayer({
      'id': 'route-line',
      'type': 'line',
      'source': 'route',
      'layout': { 'line-join': 'round', 'line-cap': 'round' },
      'paint': { 'line-color': '#10b981', 'line-width': 6 }
    });
  });
}

function initCurrentLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const initialPos = [longitude, latitude];

      if (!userMarker) {
        const el = document.createElement('div');
        el.className = 'user-marker';
        userMarker = new mapboxgl.Marker({ element: el }).setLngLat(initialPos).addTo(map);
      } else {
        userMarker.setLngLat(initialPos);
      }
      map.flyTo({ center: initialPos, zoom: 16 });
    }, (err) => console.warn("Géolocalisation initiale non autorisée", err), { enableHighAccuracy: true });
  }
}

// --- 3. GESTION DU MODAL & SDK SPOTIFY ---
const spotifyModal = document.getElementById('spotifyModal');
const spLoginState = document.getElementById('spLoginState');
const spPlayerState = document.getElementById('spPlayerState');

document.getElementById('spotifyHeaderWidget').addEventListener('click', () => {
  spotifyModal.style.display = 'flex';
  if (SPOTIFY_TOKEN) {
    spLoginState.style.display = 'none';
    spPlayerState.style.display = 'block';
  } else {
    spLoginState.style.display = 'block';
    spPlayerState.style.display = 'none';
  }
});

document.getElementById('closeSpotifyModal').addEventListener('click', () => {
  spotifyModal.style.display = 'none';
});

document.getElementById('spotifyLoginBtn').addEventListener('click', () => {
  window.location.href = '/api/spotify-login';
});

window.onSpotifyWebPlaybackSDKReady = () => {
  if (!SPOTIFY_TOKEN) return;

  spotifyPlayer = new Spotify.Player({
    name: 'LoveRun Player',
    getOAuthToken: cb => { cb(SPOTIFY_TOKEN); },
    volume: 0.8
  });

  spotifyPlayer.addListener('player_state_changed', state => {
    if (!state) return;
    const track = state.track_window.current_track;
    isPlayingMusic = !state.paused;

    const imgUrl = track.album.images[0].url;
    document.getElementById('spCover').src = imgUrl;
    document.getElementById('modalSpCover').src = imgUrl;
    document.getElementById('trackTitle').innerText = track.name;
    document.getElementById('trackArtist').innerText = track.artists.map(a => a.name).join(', ');

    const eq = document.getElementById('eqAnim');
    const modalPlayBtn = document.getElementById('modalPlayBtn');

    if (isPlayingMusic) {
      eq.classList.add('eq-active');
      modalPlayBtn.innerHTML = `<i data-lucide="pause"></i>`;
    } else {
      eq.classList.remove('eq-active');
      modalPlayBtn.innerHTML = `<i data-lucide="play"></i>`;
    }
    lucide.createIcons();
  });

  spotifyPlayer.connect();
};

document.getElementById('modalPlayBtn').addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.togglePlay();
});

document.getElementById('modalNextBtn').addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.nextTrack();
});

document.getElementById('modalPrevBtn').addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.previousTrack();
});

// --- 4. GÉOLOCALISATION & COURSE ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function updateGoalProgress() {
  const distMeters = totalDistance * 1000;
  let progress = (distMeters / currentGoal) * 100;

  if (progress >= 100) {
    document.getElementById('goalText').innerText = `${currentGoal}m Atteint ! ❤️`;
    setTimeout(() => {
      currentGoal += 100;
      document.getElementById('goalText').innerText = `${currentGoal}m`;
    }, 2000);
  }
  document.getElementById('progressFill').style.width = `${Math.min(progress, 100)}%`;
}

async function toggleRun() {
  const startBtn = document.getElementById('startBtn');
  const shareBtn = document.getElementById('shareBtn');

  if (!isRunning) {
    isRunning = true;
    
    if ('wakeLock' in navigator) {
      try { await navigator.wakeLock.request('screen'); } catch (e) {}
    }

    startBtn.innerHTML = `<i data-lucide="pause"></i> Pause`;
    startBtn.className = 'btn btn-secondary';
    shareBtn.style.display = 'flex';
    lucide.createIcons();

    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
      elapsedTime = Date.now() - startTime;
      const sec = Math.floor((elapsedTime / 1000) % 60);
      const min = Math.floor((elapsedTime / (1000 * 60)) % 60);
      document.getElementById('timer').innerText = 
        `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }, 1000);

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoord = [longitude, latitude];

        if (!userMarker) {
          const el = document.createElement('div');
          el.className = 'user-marker';
          userMarker = new mapboxgl.Marker({ element: el }).setLngLat(newCoord).addTo(map);
        } else {
          userMarker.setLngLat(newCoord);
        }

        if (coordinates.length > 0) {
          const last = coordinates[coordinates.length - 1];
          totalDistance += calculateDistance(last[1], last[0], latitude, longitude);
          document.getElementById('distance').innerText = totalDistance.toFixed(2);
          updateGoalProgress();
        }

        coordinates.push(newCoord);

        if (map.getSource('route')) {
          map.getSource('route').setData({
            'type': 'Feature',
            'geometry': { 'type': 'LineString', 'coordinates': coordinates }
          });
        }
        map.flyTo({ center: newCoord, zoom: 16 });
      }, (err) => console.error(err), { enableHighAccuracy: true });
    }
  } else {
    isRunning = false;
    clearInterval(timerInterval);
    navigator.geolocation.clearWatch(watchId);
    startBtn.innerHTML = `<i data-lucide="play"></i> Reprendre`;
    startBtn.className = 'btn btn-primary';
    lucide.createIcons();
  }
}

// --- 5. SHARE MODAL & DEEPSEEK & SUPABASE ---
document.getElementById('shareBtn').addEventListener('click', async () => {
  const timeStr = document.getElementById('timer').innerText;
  const distNum = parseFloat(totalDistance.toFixed(2));

  document.getElementById('cardTimer').innerText = timeStr;
  document.getElementById('cardDist').innerText = `${distNum} km`;
  document.getElementById('shareModal').style.display = 'flex';

  if (!shareMap) {
    shareMap = new mapboxgl.Map({
      container: 'shareMap',
      style: 'mapbox://styles/mapbox/light-v11',
      interactive: false,
      preserveDrawingBuffer: true
    });
    shareMap.on('load', () => {
      shareMap.addSource('share-route', {
        'type': 'geojson',
        'data': { 'type': 'Feature', 'geometry': { 'type': 'LineString', 'coordinates': coordinates } }
      });
      shareMap.addLayer({
        'id': 'share-route-line',
        'type': 'line',
        'source': 'share-route',
        'layout': { 'line-join': 'round', 'line-cap': 'round' },
        'paint': { 'line-color': '#10b981', 'line-width': 5 }
      });
      fitShareMapBounds();
    });
  } else {
    if (shareMap.getSource('share-route')) {
      shareMap.getSource('share-route').setData({
        'type': 'Feature',
        'geometry': { 'type': 'LineString', 'coordinates': coordinates }
      });
    }
    fitShareMapBounds();
  }

  let aiText = "Session validée ! 🔥";
  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distance: distNum, duration: timeStr })
    });
    const data = await res.json();
    if (data.feedback) aiText = data.feedback;
  } catch (err) {
    console.error("Erreur DeepSeek:", err);
  }

  document.getElementById('randomQuote').innerText = aiText;

  if (supabaseClient) {
    await supabaseClient.from('runs').insert([
      {
        duration: timeStr,
        distance_km: distNum,
        coordinates: coordinates,
        ai_feedback: aiText
      }
    ]);
  }
});

function fitShareMapBounds() {
  if (coordinates.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coord => bounds.extend(coord));
    shareMap.fitBounds(bounds, { padding: 30, animate: false });
  }
}

document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('shareModal').style.display = 'none';
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const card = document.getElementById('captureCard');
  html2canvas(card, { useCORS: true, allowTaint: true }).then(canvas => {
    const link = document.createElement('a');
    link.download = `loverun-record.png`;
    link.href = canvas.toDataURL();
    link.click();
    document.getElementById('shareModal').style.display = 'none';
  });
});

document.getElementById('startBtn').addEventListener('click', toggleRun);

// Démarrer l'application
initConfig();
lucide.createIcons();
