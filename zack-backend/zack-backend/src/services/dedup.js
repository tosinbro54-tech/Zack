import { supabase } from '../db/supabaseClient.js';

/** Has this post already been seen (regardless of action taken)? */
export async function hasSeenPost(userId, postUrn) {
  const { data } = await supabase
    .from('seen_posts')
    .select('id, commented, comment_mined')
    .eq('user_id', userId)
    .eq('post_urn', postUrn)
    .maybeSingle();
  return data || null;
}

export async function markPostSeen(userId, postUrn, { trackedProfileId, commented = false, commentMined = false } = {}) {
  await supabase.from('seen_posts').upsert(
    {
      user_id: userId,
      post_urn: postUrn,
      tracked_profile_id: trackedProfileId || null,
      commented,
      comment_mined: commentMined,
    },
    { onConflict: 'user_id,post_urn' }
  );
}

/** Is this profile URL already tracked (creator or ICP prospect)? */
export async function isProfileTracked(userId, profileUrl) {
  const { data } = await supabase
    .from('tracked_profiles')
    .select('id, status')
    .eq('user_id', userId)
    .eq('profile_url', profileUrl)
    .maybeSingle();
  return data || null;
}
