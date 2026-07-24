import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

export const queueRouter = Router();

queueRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('action_queue')
    .select('*')
    .eq('user_id', req.user.id)
    .order('scheduled_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

queueRouter.post('/:id/approve', async (req, res) => {
  const { data, error } = await supabase
    .from('action_queue')
    .update({ status: 'approved' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

queueRouter.post('/:id/reject', async (req, res) => {
  const { data, error } = await supabase
    .from('action_queue')
    .update({ status: 'skipped' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

queueRouter.patch('/settings', async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: req.user.id, ...req.body, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
