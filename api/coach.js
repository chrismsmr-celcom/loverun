export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { distance, duration } = req.body;

  const prompt = `Tu es un coach de running au ton décalé, drôle et ultra motivant pour l'application LoveRun. 
  Le coureur vient de réaliser ${distance} km en un temps de ${duration}. 
  Rédige un débriefing percutant (2 phrases max) plein de second degré avec des emojis.`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const feedback = data.choices[0].message.content;
    return res.status(200).json({ feedback });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur génération IA' });
  }
}
