/**
 * API Route: /api/config
 * Fournit la configuration publique pour le frontend
 */

/**
 * Valide que les variables d'env requises sont présentes
 */
function validateConfig() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  const missing = [];
  if (!mapboxToken) missing.push('NEXT_PUBLIC_MAPBOX_TOKEN');
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  }

  return { mapboxToken, supabaseUrl, supabaseKey };
}

/**
 * Headers de sécurité
 */
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Type': 'application/json',
  };
}

/**
 * Valide l'origine CORS
 */
function isAllowedOrigin(req, origin) {
  // Si l'origine n'est pas fournie (ex: même origine), autoriser
  if (!origin) return true;

  const envOrigins = process.env.NEXT_PUBLIC_CORS_ORIGINS;
  
  // Si aucune liste d'origines n'est définie, autoriser les domaines Vercel et localhost
  if (!envOrigins) {
    const host = req.headers.host;
    if (host && origin.includes(host)) return true;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
    if (origin.endsWith('.vercel.app')) return true;
    return true; // Fallback permissif si non configuré
  }

  const allowedOrigins = envOrigins.split(',').map(o => o.trim());
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    const pattern = allowed.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(origin);
  });
}

export default function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;

  // === HANDLE PREFLIGHT (OPTIONS) ===
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // === CORS VALIDATION ===
  if (origin && !isAllowedOrigin(req, origin)) {
    return res.status(403).json({
      error: 'CORS policy violation',
      origin,
    });
  }

  // Set Access-Control-Allow-Origin
  res.setHeader('Access-Control-Allow-Origin', origin || '*');

  // === SET SECURITY HEADERS ===
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // === ALLOW ONLY GET ===
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: 'GET',
    });
  }

  // === VALIDATE CONFIG ===
  let config;
  try {
    config = validateConfig();
  } catch (error) {
    console.error('Configuration error:', error.message);
    return res.status(500).json({
      error: 'Server configuration error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // === RETURN CONFIG ===
  return res.status(200).json({
    mapboxToken: config.mapboxToken,
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}
