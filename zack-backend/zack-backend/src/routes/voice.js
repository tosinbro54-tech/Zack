import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { recordCorrection } from '../services/voiceLearning.js';

export const voiceRouter = Router();

// Body: { actionType, aiDraft, finalText?, rating? } - call when a draft is
// edited before sending, or thumbs up/down'd.
voiceRouter.post('/correction', async (req, res) => {
  const { actionType, aiDraft, finalText, rating } = req.body;
  if (!actionType || !aiDraft) return res.status(400).json({ error: 'actionType and aiDraft are required' });
  await recordCorrection(req.user.id, { actionType, aiDraft, finalText, rating });
  res.json({ ok: true });
});

// Seed/update writing samples and tone notes.
voiceRouter.put('/profile', async (req, res) => {
  const { sampleWriting, toneNotes, closerPersonaNotes } = req.body;
  const { data, error } = await supabase
    .from('voice_profile')
    .upsert(
      {
        user_id: req.user.id,
        sample_writing: sampleWriting,
        tone_notes: toneNotes,
        closer_persona_notes: closerPersonaNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

voiceRouter.get('/profile', async (req, res) => {
  const { data } = await supabase.from('voice_profile').select('*').eq('user_id', req.user.id).single();
  res.json(data || {});
});
