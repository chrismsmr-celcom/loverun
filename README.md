# 🏃‍♂️❤️ LoveRun

**LoveRun** est une application web progressive de tracking de running avec coaching IA, musique Spotify intégrée et cartographie en temps réel.

## 🎯 Caractéristiques

- 📍 **Suivi GPS en temps réel** - Carte interactive avec votre position live
- 🎵 **Lecteur Spotify intégré** - Contrôlez votre musique sans quitter l'app
- 🤖 **Coaching IA** - Feedback personnalisé après chaque run via DeepSeek
- 📊 **Statistiques détaillées** - Temps, distance, vitesse moyenne
- 🎯 **Objectifs progressifs** - Défis de distance auto-évolutifs
- 📱 **PWA (Progressive Web App)** - Installable sur mobile et desktop
- 🔓 **OAuth 2.0 PKCE** - Authentification Spotify sécurisée
- 📸 **Partage d'image** - Téléchargez vos runs en image

## 📋 Prérequis

- Node.js >= 18.0.0
- npm >= 9.0.0
- Compte Spotify Premium (pour le lecteur)
- Clés API pour:
  - Mapbox
  - Supabase
  - DeepSeek
  - Spotify OAuth

## 🚀 Installation rapide

### 1. Cloner le repository

```bash
git clone https://github.com/chrismsmr-celcom/loverun.git
cd loverun
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Remplir `.env.local` avec vos clés API:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk_...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
DEEPSEEK_API_KEY=...
```

### 4. Démarrer le serveur de développement

```bash
npm run dev
```

L'application sera accessible à `http://localhost:3000`

## 🔑 Configuration des APIs

### Mapbox

1. Aller sur [mapbox.com](https://mapbox.com)
2. Créer un compte et récupérer votre **public token**
3. Ajouter dans `.env.local`:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=pk_...
   ```

### Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Créer une table `runs` avec colonnes:
   ```
   - id (UUID, primary key)
   - user_id (UUID)
   - duration (text)
   - distance_km (numeric)
   - coordinates (jsonb array)
   - ai_feedback (text)
   - created_at (timestamp)
   ```
3. Récupérer `Project URL` et `Anon Key`

### Spotify

1. Aller sur [developer.spotify.com](https://developer.spotify.com)
2. Créer une app Spotify
3. Ajouter `Redirect URI`: `http://localhost:3000/api/auth/spotify/callback`
4. Copier `Client ID` et `Client Secret`

### DeepSeek

1. S'inscrire sur [api.deepseek.com](https://api.deepseek.com)
2. Générer une clé API
3. Ajouter dans `.env.local`:
   ```env
   DEEPSEEK_API_KEY=sk_...
   ```

## 📦 Structure du projet

```
loverun/
├── api/                    # Routes API Vercel
│   ├── config.js          # Configuration publique
│   ├── coach.js           # Coaching IA via DeepSeek
│   └── spotify-login.js   # OAuth Spotify
├── utils/
│   ├── constants.js       # Configuration centralisée
│   └── helpers.js         # Fonctions utilitaires
├── public/
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service Worker
├── styles/
│   └── main.css           # CSS séparé (optionnel)
├── app.js                 # Frontend principal
├── index.html             # Template HTML
├── package.json           # Dépendances
├── .env.example           # Variables d'environnement template
├── .eslintrc.json         # Configuration ESLint
└── prettier.config.js     # Configuration Prettier
```

## 🛠️ Scripts disponibles

```bash
# Développement
npm run dev              # Démarrer le serveur dev

# Production
npm run build            # Build pour production
npm run start            # Démarrer le serveur prod

# Code quality
npm run lint             # Vérifier le code avec ESLint
npm run lint:fix         # Corriger les erreurs ESLint
npm run format           # Formater le code avec Prettier
npm run format:check     # Vérifier le formatting

# Testing
npm test                 # Exécuter les tests
npm run test:watch       # Mode watch pour tests
```

## 🔐 Sécurité

### Variables d'environnement

- Jamais commit `.env.local` ✅
- Utiliser `.env.example` comme template
- Tous les secrets dans variables Vercel pour le production

### CORS

Les origines autorisées sont définies dans `NEXT_PUBLIC_CORS_ORIGINS`:

```env
NEXT_PUBLIC_CORS_ORIGINS=http://localhost:3000,https://loverun-silk.vercel.app
```

### OAuth

- Utilise PKCE (Proof Key for Code Exchange) pour Spotify
- State parameter pour prévention CSRF
- Tokens stockés de manière sécurisée

### Rate Limiting

API `coach` limité à 10 requêtes/minute par IP pour éviter les abus

## 📱 PWA (Progressive Web App)

L'app peut être installée sur mobile comme app native:

1. **Sur iOS**: Partage > Ajouter à l'écran d'accueil
2. **Sur Android**: Menu > Installer l'app

L'installation active:
- Service Worker pour mode offline
- Manifest JSON avec icônes
- Wake Lock pour garder l'écran allumé pendant le run

## 📊 API Endpoints

### GET `/api/config`

Récupère la configuration publique

**Response:**
```json
{
  "mapboxToken": "pk_...",
  "supabaseUrl": "https://...supabase.co",
  "supabaseKey": "eyJ..."
}
```

### POST `/api/coach`

Génère un feedback IA

**Request:**
```json
{
  "distance": 5.2,
  "duration": "42:30"
}
```

**Response:**
```json
{
  "feedback": "5km en 42min? T'es LÉGENDE! 🔥",
  "distance": 5.2,
  "duration": "42:30"
}
```

### GET `/api/spotify-login`

Initie le processus OAuth Spotify (redirects vers authorize page)

## 🐛 Troubleshooting

### Géolocalisation ne fonctionne pas

- Vérifier que HTTPS est activé (obligatoire pour géolocation)
- Accepter la permission de localisation
- Vérifier que le GPS du téléphone est activé

### Spotify ne se connecte pas

- Vérifier que vous avez un compte **Premium**
- Vérifier le `Client ID` et `Client Secret`
- Vérifier le `Redirect URI` dans les settings Spotify

### Coach IA ne répond pas

- Vérifier la clé API DeepSeek
- Vérifier le rate limiting (10 req/min par IP)
- Vérifier les logs: `npm run dev`

### Map n'affiche pas la route

- Vérifier le token Mapbox
- Vérifier que les permissions de géolocation sont acceptées
- Vérifier la console browser pour les erreurs

## 🚀 Déploiement

### Vercel (Recommandé)

1. Push votre code sur GitHub
2. Connecter le repo à Vercel
3. Ajouter les variables d'environnement dans Vercel
4. Déployer!

```bash
# Ou en CLI
npm i -g vercel
vercel
```

### Variables Vercel

Ajouter tous les `.env` variables dans Vercel Dashboard:
- `NEXT_PUBLIC_*` - Public (visible frontend)
- Autres - Secret (serveur seulement)

## 📈 Performance

- **Lighthouse Score**: >90
- **Core Web Vitals**: All Green
- **Bundle Size**: <200KB gzipped
- **Time to Interactive**: <2s

## 🧪 Tests

```bash
# Exécuter tests
npm test

# Couverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

## 🔄 Code Style

Automatiquement formaté avec Prettier et validé avec ESLint

```bash
# Format automatique
npm run format

# Vérifier
npm run lint
npm run format:check
```

## 🤝 Contribution

1. Fork le repo
2. Créer une branch: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Pull Request

## 📝 Changelog

### v1.0.0 (2024)

- ✨ Initial release
- 🗺️ Real-time GPS tracking
- 🎵 Spotify integration
- 🤖 AI coaching
- 📱 PWA support

## 📄 License

MIT - Voir [LICENSE](LICENSE)

## 📞 Support

- **Email**: support@loverun.app
- **Issues**: [GitHub Issues](https://github.com/chrismsmr-celcom/loverun/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chrismsmr-celcom/loverun/discussions)

## 🙏 Remerciements

- Mapbox pour la cartographie
- Spotify pour l'intégration musique
- DeepSeek pour le coaching IA
- Supabase pour la base de données

---

**Fait avec ❤️ pour les runners** 🏃‍♂️
