/**
 * API Route: /api/config
 * Fournit la configuration publique pour le frontend
 */

/**
 * Valide que les variables d'env requises sont présentes
 */
function validateConfig() {
  const required = [
    'NEXT_PUBLIC_MAPBOX_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  }
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
function isAllowedOrigin(origin) {
  const allowedOrigins = process.env.NEXT_PUBLIC_CORS_ORIGINS?.split(',') || [];
  return allowedOrigins.some(allowed => {
    const pattern = allowed.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(origin);
  });
}

export default function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;

  // === CORS VALIDATION ===
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({
      error: 'CORS policy violation',
      origin,
    });
  }

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
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration error:', error.message);
    return res.status(500).json({
      error: 'Server configuration error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // === RETURN CONFIG ===
  return res.status(200).json({
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}
