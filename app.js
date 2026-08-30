let map, shareMap, watchId, timerInterval, spotifyPlayer;
let supabaseClient = null;
let startTime = 0, elapsedTime = 0, totalDistance = 0;
let coordinates = [];
let userMarker = null;
let isRunning = false;
let currentGoal = 100;
let isPlayingMusic = false;

// --- INITIALISATION DYNAMIQUE DE LA CONFIG (VERCEL ENV) ---
async function initConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    // Configuration des SDK avec les clés de Vercel
    mapboxgl.accessToken = config.mapboxToken;
    supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

    // Initialisation de la carte après chargement des clés
    initMap();
  } catch (err) {
    console.error("Erreur de chargement de la configuration Vercel:", err);
  }
}

function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [15.3131, -4.3276],
    zoom: 15,
    preserveDrawingBuffer: true
  });

  const markerEl = document.createElement('div');
  markerEl.className = 'user-marker';

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

// Lancer le chargement au démarrage
initConfig();
lucide.createIcons();

// --- 2. SPOTIFY WEB PLAYBACK SDK ---
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

    // Mise à jour pochette & animation égaliseur
    document.getElementById('spCover').src = track.album.images[0].url;
    const eq = document.getElementById('eqAnim');
    const playBtn = document.getElementById('spPlayBtn');

    if (isPlayingMusic) {
      eq.classList.add('eq-active');
      playBtn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i>`;
    } else {
      eq.classList.remove('eq-active');
      playBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
    }
    lucide.createIcons();
  });

  spotifyPlayer.connect();
};

document.getElementById('spPlayBtn').addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.togglePlay();
});

document.getElementById('spNextBtn').addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.nextTrack();
});

// --- 3. GEOLOCATION & RUNNING ---
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
    
    // Activer Screen WakeLock pour iOS
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
          userMarker = new mapboxgl.Marker(markerEl).setLngLat(newCoord).addTo(map);
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

// --- 4. SAUVEGARDE SUPABASE & ANALYSE DEEPSEEK ---
document.getElementById('shareBtn').addEventListener('click', async () => {
  const timeStr = document.getElementById('timer').innerText;
  const distNum = parseFloat(totalDistance.toFixed(2));

  document.getElementById('cardTimer').innerText = timeStr;
  document.getElementById('cardDist').innerText = `${distNum} km`;
  document.getElementById('shareModal').style.display = 'flex';

  // Rendu Carte Miniature
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
    shareMap.getSource('share-route').setData({
      'type': 'Feature',
      'geometry': { 'type': 'LineString', 'coordinates': coordinates }
    });
    fitShareMapBounds();
  }

  // Appel à DeepSeek Proxy (IA Coach)
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

  // Sauvegarde PostgreSQL dans Supabase
  await supabaseClient.from('runs').insert([
    {
      duration: timeStr,
      distance_km: distNum,
      coordinates: coordinates,
      ai_feedback: aiText
    }
  ]);
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
