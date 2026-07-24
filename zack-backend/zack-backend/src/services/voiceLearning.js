import { supabase } from '../db/supabaseClient.js';

/** Call whenever a draft is edited before being sent, or rated. */
export async function recordCorrection(userId, { actionType, aiDraft, finalText, rating }) {
  await supabase.from('voice_corrections').insert({
    user_id: userId,
    action_type: actionType,
    ai_draft: aiDraft,
    final_text: finalText || null,
    rating: rating || null,
  });
}

/**
 * Pulls a small, relevant sample of past corrections + the user's seeded
 * writing samples to inject into a drafting prompt as few-shot context.
 * Kept small on purpose - this rides along on every draft call, so it
 * shouldn't balloon token usage.
 */
export async function buildVoiceContext(userId, actionType, { maxCorrections = 4 } = {}) {
  const { data: profile } = await supabase
    .from('voice_profile')
    .select('sample_writing, tone_notes, closer_persona_notes')
    .eq('user_id', userId)
    .single();

  // Prioritize real edits (most informative) over standalone down-ratings.
  const { data: corrections } = await supabase
    .from('voice_corrections')
    .select('ai_draft, final_text, rating')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .not('final_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(maxCorrections);

  const correctionExamples = (corrections || [])
    .filter((c) => c.final_text && c.final_text !== c.ai_draft)
    .map((c) => `AI wrote: "${c.ai_draft}"\nYou changed it to: "${c.final_text}"`)
    .join('\n\n');

  return {
    sampleWriting: profile?.sample_writing || '',
    toneNotes: profile?.tone_notes || '',
    closerPersonaNotes: profile?.closer_persona_notes || '',
    correctionExamples,
  };
}
