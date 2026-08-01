import { supabase } from '../db/supabaseClient.js';
import { getDecryptedSession } from './sessionVault.js';
import { withSession } from './playwrightSession.js';
import { scanInboxSummary } from './linkedinActions.js';

/** One inbox summary sync per call - fits the same one-lightweight-thing-per-tick pattern as discovery. */
export async function syncInboxSummaryForUser(userId) {
  const session = await getDecryptedSession(userId);
  if (!session || session.status !== 'active') return { synced: 0 };

  let synced = 0;
  await withSession(session, async (page) => {
    const result = await scanInboxSummary(page);
    if (!result.success) return;

    for (const c of result.conversations) {
      await supabase.from('conversations').upsert(
        {
          user_id: userId,
          conversation_urn: c.urn,
          conversation_url: c.conversationUrl,
          participant_name: c.name,
          participant_profile_url: c.profileUrl,
          last_message_preview: c.preview,
          unread: c.isUnread,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,conversation_urn' }
      );
      synced += 1;
    }
  });

  return { synced };
}
