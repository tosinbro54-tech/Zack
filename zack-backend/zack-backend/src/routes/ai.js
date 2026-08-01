import { Router } from 'express';
import { rawGenerate, generateImage } from '../services/gemini.js';

export const aiRouter = Router();

aiRouter.post('/generate', async (req, res) => {
  const { sys, user } = req.body;
  if (!user) return res.status(400).json({ error: 'user prompt is required' });
  try {
    const text = await rawGenerate({ sys: sys || '', user });
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

aiRouter.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;
  try {
    const image = await generateImage(prompt || 'Modern dark minimal LinkedIn hero image');
    if (!image) return res.status(502).json({ error: 'No image returned. Try a different prompt.' });
    res.json({ dataUrl: `data:${image.mimeType};base64,${image.data}` });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
