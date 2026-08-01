import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

export const icpRouter = Router();

icpRouter.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('icp_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || null);
  } catch (err) {
    console.error('[icp/get]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

icpRouter.put('/', async (req, res) => {
  try {
    const { criteria } = req.body;
    if (!criteria) return res.status(400).json({ error: 'criteria is required' });

    const { data: existing } = await supabase
      .from('icp_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase.from('icp_profiles').update({ criteria }).eq('id', existing.id).select().single();
    } else {
      result = await supabase
        .from('icp_profiles')
        .insert({ user_id: req.user.id, name: 'Primary ICP', criteria, active: true })
        .select()
        .single();
    }
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json(result.data);
  } catch (err) {
    console.error('[icp/put]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});
