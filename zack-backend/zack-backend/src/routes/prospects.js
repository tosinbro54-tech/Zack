import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { isProfileTracked } from '../services/dedup.js';

export const prospectsRouter = Router();

prospectsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tracked_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manual add (creator or ICP prospect)
prospectsRouter.post('/', async (req, res) => {
  const { profileUrl, kind, fullName, headline, icpProfileId } = req.body;
  if (!profileUrl || !kind) return res.status(400).json({ error: 'profileUrl and kind are required' });

  const existing = await isProfileTracked(req.user.id, profileUrl);
  if (existing) return res.status(409).json({ error: 'already tracked', existing });

  const { data, error } = await supabase
    .from('tracked_profiles')
    .insert({
      user_id: req.user.id,
      profile_url: profileUrl,
      kind,
      full_name: fullName,
      headline,
      icp_profile_id: icpProfileId || null,
      source: 'manual',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

prospectsRouter.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tracked_profiles')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

prospectsRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('tracked_profiles').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
