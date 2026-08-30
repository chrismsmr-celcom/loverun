export default function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const redirect_uri = `${protocol}://${host}/`;

  const scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state'
  ].join(' ');

  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

  res.redirect(authUrl);
}
