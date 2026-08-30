// api/config.js
export default function handler(req, res) {
  res.status(200).json({
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
