export default function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = 'https://loverun-silk.vercel.app/'; // Ton URL Vercel
  const scope = 'streaming user-read-email user-read-private user-modify-playback-state';

  const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  
  res.redirect(authUrl);
}
