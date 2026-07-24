import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { buildVoiceContext } from './voiceLearning.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function generate(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function voiceBlock(ctx) {
  const parts = [];
  if (ctx.toneNotes) parts.push(`Tone notes: ${ctx.toneNotes}`);
  if (ctx.sampleWriting) parts.push(`Examples of the user's actual writing style:\n"""${ctx.sampleWriting}"""`);
  if (ctx.correctionExamples) {
    parts.push(
      `Past examples where the user edited an AI draft - match this direction:\n${ctx.correctionExamples}`
    );
  }
  return parts.join('\n\n') || 'Professional, warm, specific — not generic praise.';
}

export async function draftComment({ userId, postText }) {
  const ctx = await buildVoiceContext(userId, 'comment');
  return generate(`
You are drafting a LinkedIn comment on this post:
"""${postText}"""

${voiceBlock(ctx)}

Write ONE short comment (1-3 sentences) that adds real value or a genuine
perspective. No emojis unless natural. No "Great post!" filler. Match the
user's actual voice above as closely as possible. Return only the comment
text, nothing else.
`);
}

/** Reply to a specific commenter (found while mining a post's comment section), not the post itself. */
export async function draftCommentReply({ userId, originalCommentText, posterContext }) {
  const ctx = await buildVoiceContext(userId, 'comment_reply');
  return generate(`
Someone commented on a LinkedIn post: "${originalCommentText}"
Context on the post/poster: ${posterContext || 'n/a'}

${voiceBlock(ctx)}

Write ONE short, genuine reply directly to THIS PERSON'S comment (not the
original post) - engage with what they specifically said, agree/build on
their point, or ask a real follow-up. 1-2 sentences. No generic praise.
Return only the reply text.
`);
}

export async function draftConnectionNote({ userId, profileHeadline, context }) {
  const ctx = await buildVoiceContext(userId, 'connect_note');
  return generate(`
Write a short LinkedIn connection request note (under 300 characters) to
someone with this headline: "${profileHeadline}".
Context on why we're connecting: ${context}

${voiceBlock(ctx)}

Keep it specific and low-pressure, not salesy. Return only the note text.
`);
}

export async function draftCloserReply({ userId, conversationHistory, closerPersonaNotes }) {
  const ctx = await buildVoiceContext(userId, 'dm');
  return generate(`
You are replying to a LinkedIn DM as a skilled, consultative closer working
an important deal — confident but never pushy, always genuinely useful,
never inventing facts (pricing, availability, etc.) you don't actually have.

Persona notes: ${closerPersonaNotes || ctx.closerPersonaNotes || 'Direct, warm, moves the conversation toward a concrete next step.'}

${voiceBlock(ctx)}

Conversation so far:
${conversationHistory}

Write the next reply. Return only the reply text.
`);
}

/** ICP fit scoring - only called after the cheap rule-based pre-filter passes. */
export async function scoreIcpFit({ headline, about, recentPostTopics, icpCriteria }) {
  const raw = await generate(`
Given this LinkedIn profile:
Headline: ${headline}
About: ${about || 'n/a'}
Recent post topics: ${recentPostTopics?.join(', ') || 'n/a'}

And this ICP definition:
${JSON.stringify(icpCriteria)}

Score how well this person fits the ICP from 0-100 and give a one-sentence
reason. Respond ONLY as JSON: {"score": number, "reason": string}
`);
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { score: 0, reason: 'Could not parse Gemini response' };
  }
}
