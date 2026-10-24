import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google Gemini AI if API key is present
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (err) {
    console.warn('Failed to initialize Google Gen AI client:', err);
  }
}

// Fallback procedural commentary if AI key is unavailable or fails
function getFallbackCommentary(event: string, playerName: string, teamCode: string, amountCr: number): string {
  if (event === 'sold') {
    return `HAMMER DOWN! ${playerName} is officially sold to ${teamCode} for a massive ₹${amountCr.toFixed(2)} Crore! What a statement buy!`;
  }
  if (event === 'rtm') {
    return `RIGHT TO MATCH EXERCISED! ${teamCode} steps in and matches the ₹${amountCr.toFixed(2)} Cr bid to bring ${playerName} back home!`;
  }
  if (event === 'unsold') {
    return `No bids for ${playerName} in this round. He goes into the accelerated pool for the later rounds!`;
  }
  return `Paddle raised by ${teamCode}! The bid for ${playerName} climbs to ₹${amountCr.toFixed(2)} Crore! Who wants to challenge?`;
}

// AI Commentary API
app.post('/api/commentary', async (req: Request, res: Response) => {
  const { event, playerName, teamCode, teamName, amountCr, role, isOverseas } = req.body;

  if (!playerName) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  if (!aiClient || !process.env.GEMINI_API_KEY) {
    return res.json({
      commentary: getFallbackCommentary(event, playerName, teamCode || 'Franchise', amountCr || 1.0)
    });
  }

  try {
    const prompt = `Generate a single, super energetic, 1-2 sentence live IPL auction commentary for broadcast.
Event: ${event.toUpperCase()}
Player: ${playerName} (${role}, ${isOverseas ? 'Overseas' : 'Indian'})
Franchise: ${teamName} (${teamCode})
Price: ₹${amountCr} Crore.
Tone: Energetic broadcast commentator like Harsha Bhogle / Ravi Shastri / Ian Bishop. Keep under 30 words.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an iconic IPL auction arena TV broadcaster. Return only the energetic commentator spoken quote without quotes or meta text.'
      }
    });

    const text = response.text?.trim() || getFallbackCommentary(event, playerName, teamCode || 'Franchise', amountCr || 1.0);
    return res.json({ commentary: text });
  } catch (error) {
    console.error('Gemini commentary error:', error);
    return res.json({
      commentary: getFallbackCommentary(event, playerName, teamCode || 'Franchise', amountCr || 1.0)
    });
  }
});

// AI Player Scout API
app.post('/api/player-scout', async (req: Request, res: Response) => {
  const { player, teamCode } = req.body;
  if (!player || !player.name) {
    return res.status(400).json({ error: 'Player data is required' });
  }

  if (!aiClient || !process.env.GEMINI_API_KEY) {
    return res.json({
      insight: `${player.name} provides proven ${player.role} prowess, ideally fitting modern T20 match-ups.`
    });
  }

  try {
    const prompt = `Give a concise 2-sentence tactical scouting insight on ${player.name} (${player.role}, ${player.isOverseas ? 'Overseas' : 'Indian'}) base price ₹${player.basePriceCr} Cr, for IPL franchise ${teamCode || 'any franchise'}. Highlight key strengths and value.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a professional IPL cricket analyst and data scout. Keep your tactical breakdown crisp, analytical, and under 35 words.'
      }
    });

    return res.json({ insight: response.text?.trim() || `${player.name} is a high-impact ${player.role}.` });
  } catch (error) {
    console.error('Gemini scout error:', error);
    return res.json({ insight: `${player.name} provides valuable T20 firepower and role flexibility.` });
  }
});

// Serve frontend in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IPL Auction Arena server listening on port ${PORT}`);
});
