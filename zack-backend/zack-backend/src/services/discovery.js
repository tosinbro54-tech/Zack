import { supabase } from '../db/supabaseClient.js';
import { getDecryptedSession } from './sessionVault.js';
import { withSession } from './playwrightSession.js';
import { scanProfileActivity } from './linkedinActions.js';
import { hasSeenPost, markPostSeen } from './dedup.js';
import { draftComment } from './gemini.js';
import { randomOverscrollDays } from './warmup.js';

/**
 * Scans ONE tracked profile per call (the least-recently-scanned one) for
 * new posts and stores them as discovered_posts, ready to review/queue.
 * One profile per tick keeps this looking like normal browsing rather than
 * a bulk sweep every few minutes.
 */
export async function discoverNewPostsForUser(userId) {
  const session = await getDecryptedSession(userId);
  if (!session || session.status !== 'active') return { discovered: 0 };

  const { data: profile } = await supabase
    .from('tracked_profiles')
    .select('*')
    .eq('user_id', userId)
    .in('kind', ['creator', 'icp_prospect'])
    .order('cadence_last_computed_at', { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (!profile) return { discovered: 0 };

  let discovered = 0;

  await withSession(session, async (page) => {
    const targetCount = 5 + Math.floor(Math.random() * 4); // 5-8, varies per visit
    const result = await scanProfileActivity(page, {
      profileUrl: profile.profile_url,
      targetCount,
      pacing: [3000, 8000],
    });

    if (!result.success) return;

    for (const post of result.posts) {
      const already = await hasSeenPost(userId, post.urn);
      if (already) continue;

      const draftedComment = await draftComment({ userId, postText: post.text }).catch(() => null);

      await supabase.from('discovered_posts').insert({
        user_id: userId,
        tracked_profile_id: profile.id,
        post_urn: post.urn,
        post_url: profile.profile_url, // TODO: scanProfileActivity should also capture the per-post URL once selectors are verified
        post_text: post.text,
        author_name: profile.full_name,
        drafted_comment: draftedComment,
      });

      await markPostSeen(userId, post.urn, { trackedProfileId: profile.id });
      discovered += 1;
    }

    await supabase
      .from('tracked_profiles')
      .update({ cadence_last_computed_at: new Date().toISOString() })
      .eq('id', profile.id);
  });

  return { discovered };
}
