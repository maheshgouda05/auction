import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function apiMiddlewarePlugin(): Plugin {
  let aiClient: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({});
    } catch (err) {
      console.warn('Gemini AI init in Vite dev server plugin:', err);
    }
  }

  return {
    name: 'api-middleware-plugin',
    configureServer(server) {
      server.middlewares.use('/api/commentary', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { event, playerName, teamCode, teamName, amountCr, role, isOverseas } = data;

            let commentary = `Paddle raised by ${teamCode || 'Franchise'}! The bid for ${playerName} climbs to ₹${(amountCr || 1.0).toFixed(2)} Cr!`;
            if (event === 'sold') {
              commentary = `HAMMER DOWN! ${playerName} is officially sold to ${teamCode} for ₹${(amountCr || 1.0).toFixed(2)} Crore!`;
            } else if (event === 'rtm') {
              commentary = `RIGHT TO MATCH! ${teamCode} matches the ₹${(amountCr || 1.0).toFixed(2)} Cr bid to bring ${playerName} back!`;
            } else if (event === 'unsold') {
              commentary = `No bids for ${playerName} in this round. He goes to the unsold pool.`;
            }

            if (aiClient && process.env.GEMINI_API_KEY && playerName) {
              try {
                const prompt = `Generate a single, super energetic, 1-2 sentence live IPL auction commentary for broadcast.
Event: ${(event || 'bid').toUpperCase()}
Player: ${playerName} (${role || 'player'}, ${isOverseas ? 'Overseas' : 'Indian'})
Franchise: ${teamName || teamCode || 'Franchise'} (${teamCode || ''})
Price: ₹${amountCr} Crore.
Tone: Energetic broadcast commentator like Harsha Bhogle / Ravi Shastri / Ian Bishop. Keep under 30 words.`;

                const aiRes = await aiClient.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: prompt,
                  config: {
                    systemInstruction: 'You are an iconic IPL auction arena TV broadcaster. Return only the energetic commentator spoken quote without quotes or meta text.'
                  }
                });

                if (aiRes.text) {
                  commentary = aiRes.text.trim();
                }
              } catch (e) {
                console.warn('Gemini commentary error in dev middleware:', e);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ commentary }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid payload' }));
          }
        });
      });

      server.middlewares.use('/api/player-scout', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { player, teamCode } = data;

            let insight = `${player?.name || 'The player'} provides reliable ${player?.role || 'team'} depth.`;

            if (aiClient && process.env.GEMINI_API_KEY && player?.name) {
              try {
                const prompt = `Give a concise 2-sentence tactical scouting insight on ${player.name} (${player.role}, ${player.isOverseas ? 'Overseas' : 'Indian'}) base price ₹${player.basePriceCr} Cr, for IPL franchise ${teamCode || 'any franchise'}. Highlight key strengths and value.`;

                const aiRes = await aiClient.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: prompt,
                  config: {
                    systemInstruction: 'You are a professional IPL cricket analyst and data scout. Keep your tactical breakdown crisp, analytical, and under 35 words.'
                  }
                });

                if (aiRes.text) {
                  insight = aiRes.text.trim();
                }
              } catch (e) {
                console.warn('Gemini scout error in dev middleware:', e);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ insight }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid payload' }));
          }
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
