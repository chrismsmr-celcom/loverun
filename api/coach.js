/**
 * API Route: /api/coach
 * Génère un feedback IA basé sur la performance du run
 */

import { VALIDATION } from '../utils/constants.js';

// Simple in-memory rate limiting (À remplacer par Redis en production)
const requestCounts = new Map();

/**
 * Valide les paramètres de requête
 */
function validateRequest(body) {
  const { distance, duration } = body;

  // Vérifier les types
  if (typeof distance !== 'number' || typeof duration !== 'string') {
    throw new Error('Types invalides: distance (number), duration (string)');
  }

  // Vérifier les valeurs
  if (distance < VALIDATION.MIN_DISTANCE_KM || distance > VALIDATION.MAX_DISTANCE_KM) {
    throw new Error(
      `Distance invalide: ${VALIDATION.MIN_DISTANCE_KM} à ${VALIDATION.MAX_DISTANCE_KM} km`
    );
  }

  // Valider format de durée (MM:SS)
  const durationRegex = /^(\d{1,2}):(\d{2})$/;
  if (!durationRegex.test(duration)) {
    throw new Error('Format durée invalide: MM:SS requis');
  }

  return { distance, duration };
}

/**
 * Applique le rate limiting
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const key = `coach_${ip}`;

  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const timestamps = requestCounts.get(key);
  const oneMinuteAgo = now - 60000;

  // Nettoyer les anciens timestamps
  const recent = timestamps.filter(ts => ts > oneMinuteAgo);
  requestCounts.set(key, recent);

  const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 10, 10);
  if (recent.length >= limit) {
    return false;
  }

  recent.push(now);
  requestCounts.set(key, recent);
  return true;
}

/**
 * Extrait l'IP du client
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    'unknown'
  );
}

/**
 * Construit le prompt pour DeepSeek
 */
function buildCoachPrompt(distance, duration) {
  return `Tu es un coach de running au ton décalé, drôle et ultra motivant pour l'application LoveRun.
Le coureur vient de réaliser ${distance} km en un temps de ${duration}.
Rédige un débriefing percutant (2 phrases max) plein de second degré avec des emojis.
Sois encourageant et bienveillant. Mentionne des chiffres ou observations spécifiques du run.`;
}

/**
 * Appelle l'API DeepSeek avec timeout
 */
async function callDeepSeekAPI(prompt, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid DeepSeek response format');
    }

    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  const clientIp = getClientIp(req);
  const timestamp = new Date().toISOString();

  try {
    // === METHOD VALIDATION ===
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        allowed: 'POST',
      });
    }

    // === RATE LIMITING ===
    if (!checkRateLimit(clientIp)) {
      console.warn(`[${timestamp}] Rate limit exceeded for ${clientIp}`);
      return res.status(429).json({
        error: 'Trop de requêtes',
        message: 'Attends quelques secondes avant de relancer',
      });
    }

    // === VALIDATE REQUEST ===
    let validatedData;
    try {
      validatedData = validateRequest(req.body);
    } catch (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    const { distance, duration } = validatedData;

    // === CHECK ENV ===
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error(`[${timestamp}] DEEPSEEK_API_KEY not configured`);
      return res.status(500).json({
        error: 'Service unavailable',
      });
    }

    // === CALL DEEPSEEK ===
    const prompt = buildCoachPrompt(distance, duration);
    const feedback = await callDeepSeekAPI(prompt);

    console.log(`[${timestamp}] Coaching feedback generated for ${distance}km run`);

    return res.status(200).json({
      feedback,
      distance,
      duration,
      timestamp,
    });
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    const isTimeout = error.name === 'AbortError' || errorMessage.includes('timeout');

    console.error(`[${timestamp}] Coach API error:`, {
      error: errorMessage,
      isTimeout,
      ip: clientIp,
    });

    if (isTimeout) {
      return res.status(504).json({
        error: 'Coach unavailable',
        message: 'Le coach AI est temporairement indisponible. Réessaye dans quelques secondes!',
      });
    }

    return res.status(500).json({
      error: 'Coaching error',
      message:
        process.env.NODE_ENV === 'development'
          ? errorMessage
          : 'Une erreur est survenue lors de la génération du coaching',
    });
  }
}
