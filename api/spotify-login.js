export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ 
      error: "SPOTIFY_CLIENT_ID manquant dans les variables Vercel." 
    });
  }

  // URL fixe nettoyée sans slash final ambigu
  const redirectUri = "https://loverun-silk.vercel.app/";

  const scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state'
  ].join(' ');

  const authUrl = `https://accounts.spotify.com/authorize?` +
    `response_type=token` +
    `&client_id=${encodeURIComponent(clientId.trim())}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
}
