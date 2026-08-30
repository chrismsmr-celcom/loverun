/**
 * API Route: /api/spotify-login (OAuth 2.0 with PKCE)
 * Initie le processus d'authentification Spotify avec PKCE
 */

import crypto from 'crypto';

/**
 * Génère un code challenge pour PKCE
 */
function generatePKCEChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Génère un state aléatoire pour validation
 */
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Récupère l'URL de redirection selon l'environnement
 */
function getRedirectUri(req) {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${host}/api/auth/spotify/callback`;
}

/**
 * Valide les variables d'env
 */
function validateEnvironment() {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    throw new Error('SPOTIFY_CLIENT_ID manquant');
  }
}

export default function handler(req, res) {
  try {
    // === VALIDATE METHOD ===
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // === VALIDATE ENV ===
    validateEnvironment();

    const clientId = process.env.SPOTIFY_CLIENT_ID.trim();
    const redirectUri = getRedirectUri(req);

    // === GENERATE PKCE ===
    const { codeVerifier, codeChallenge } = generatePKCEChallenge();
    const state = generateState();

    // === STORE PKCE IN SESSION/COOKIE (À implémenter avec session store) ===
    // Pour un déploiement production, stocker dans Redis ou similaire
    res.setHeader('Set-Cookie', [
      `spotify_code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
      `spotify_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    ]);

    // === SPOTIFY SCOPES ===
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-modify-playback-state',
      'user-read-playback-state',
    ];

    // === BUILD AUTHORIZATION URL ===
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('show_dialog', 'true');

    // === REDIRECT ===
    return res.redirect(307, authUrl.toString());
  } catch (error) {
    console.error('Spotify login error:', error);
    return res.status(500).json({
      error: 'Spotify authentication failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
