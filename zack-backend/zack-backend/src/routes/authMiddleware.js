import { supabase } from '../db/supabaseClient.js';

/** Verifies the Supabase auth token sent by the frontend and attaches req.user. */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'missing auth token' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'invalid auth token' });

  req.user = data.user;
  next();
}
