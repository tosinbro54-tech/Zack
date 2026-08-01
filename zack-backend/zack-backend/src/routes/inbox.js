import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { getDecryptedSession } from '../services/sessionVault.js';
import { withSession } from '../services/playwrightSession.js';
import { scanConversationThread } from '../services/linkedinActions.js';

export const inboxRouter = Router();

inboxRouter.get('/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[inbox/conversations]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

inboxRouter.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { data: convo } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (!convo) return res.status(404).json({ error: 'not found' });

    const session = await getDecryptedSession(req.user.id);
    if (!session || session.status !== 'active') return res.status(400).json({ error: 'no active LinkedIn session' });

    const result = await withSession(session, (page) =>
      scanConversationThread(page, { conversationUrl: convo.conversation_url })
    );
    if (!result.success) return res.status(502).json({ error: 'could not read thread' });

    for (const m of result.messages) {
      await supabase.from('messages').insert({
        conversation_id: convo.id,
        user_id: req.user.id,
        sender: m.sender,
        text: m.text,
      });
    }
    await supabase.from('conversations').update({ unread: false }).eq('id', convo.id);

    res.json(result.messages);
  } catch (err) {
    console.error('[inbox/messages]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

inboxRouter.post('/conversations/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const { data: convo } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (!convo) return res.status(404).json({ error: 'not found' });

    await supabase.from('action_queue').insert({
      user_id: req.user.id,
      action_type: 'reply',
      tracked_profile_id: convo.tracked_profile_id,
      payload: { conversationUrl: convo.conversation_url, text, targetLabel: convo.participant_name },
      requires_approval: true,
      status: 'queued',
      scheduled_at: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[inbox/reply]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});
