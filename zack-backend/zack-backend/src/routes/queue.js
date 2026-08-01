import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

export const queueRouter = Router();

queueRouter.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('action_queue')
      .select('*')
      .eq('user_id', req.user.id)
      .order('scheduled_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[queue/get]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

queueRouter.get('/pending-dms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('action_queue')
      .select('*, tracked_profiles(full_name, headline)')
      .eq('user_id', req.user.id)
      .eq('action_type', 'dm')
      .in('status', ['queued', 'scheduled'])
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[queue/pending-dms]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

queueRouter.post('/', async (req, res) => {
  try {
    const { actionType, targetLabel, text, trackedProfileId } = req.body;
    const { data, error } = await supabase
      .from('action_queue')
      .insert({
        user_id: req.user.id,
        action_type: actionType || 'dm',
        tracked_profile_id: trackedProfileId || null,
        payload: { text, targetLabel },
        requires_approval: true,
        status: 'queued',
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[queue/post]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

queueRouter.post('/:id/approve', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('action_queue')
      .update({ status: 'approved' })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[queue/approve]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

queueRouter.post('/:id/reject', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('action_queue')
      .update({ status: 'skipped' })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[queue/reject]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

queueRouter.patch('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: req.user.id, ...req.body, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[queue/settings]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});
