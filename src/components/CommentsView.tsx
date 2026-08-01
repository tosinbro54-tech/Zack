/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface CommentsViewProps {
  onAddToQueue: (type: string, target: string, text: string) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
  voicePrompt: () => string;
}

interface LiveDraft {
  id: string;
  post_text: string;
  author_name: string | null;
  drafted_comment: string;
  discovered_at: string;
}

export const CommentsView: React.FC<CommentsViewProps> = ({ onAddToQueue, callGemini, voicePrompt }) => {
  // Live agent feed - what the automation actually found and drafted
  const [liveDrafts, setLiveDrafts] = useState<LiveDraft[] | null>(null);
  const [queuing, setQueuing] = useState<Record<string, boolean>>({});

  // Manual one-off tool - secondary, for pasting a single post outside the automated flow
  const [showManualTool, setShowManualTool] = useState(false);
  const [postText, setPostText] = useState('');
  const [author, setAuthor] = useState('');
  const [intent, setIntent] = useState('agree_add');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Array<{ text: string }>>([]);

  useEffect(() => {
    api.get('/api/prospects/live-comment-drafts')
      .then(setLiveDrafts)
      .catch(() => setLiveDrafts([]));
  }, []);

  const handleQueueLiveDraft = async (draft: LiveDraft) => {
    setQueuing(prev => ({ ...prev, [draft.id]: true }));
    try {
      await api.post(`/api/prospects/discover-posts/${draft.id}/queue-comment`);
      setLiveDrafts(prev => (prev || []).filter(d => d.id !== draft.id));
      onAddToQueue('Comment', draft.author_name || 'post author', draft.drafted_comment);
    } catch {
      // toast handled by parent's onAddToQueue path already covers failures elsewhere
    } finally {
      setQueuing(prev => ({ ...prev, [draft.id]: false }));
    }
  };

  const handleGenerate = async () => {
    if (postText.trim().length < 20) return;

    setGenerating(true);
    setResults([]);

    const intentMap = {
      agree_add: 'Agree with the post and add a genuine insight or data point',
      challenge: 'Respectfully challenge one assumption with evidence',
      ask_question: 'Ask one sharp specific question that shows deep familiarity with the topic',
      share_story: 'Share a brief personal story that reinforces or adds nuance'
    };

    try {
      const selectedAngle = intentMap[intent as keyof typeof intentMap] || intent;
      const raw = await callGemini(
        voicePrompt(),
        `Post by ${author || 'the author'}: "${postText.slice(0, 800)}"\n\nAngle: ${selectedAngle}\n\nGenerate exactly 3 LinkedIn comments. Return JSON: {"comments":[{"text":"..."},{"text":"..."},{"text":"..."}]}\nMax 280 chars each.`
      );

      let parsed: { comments: Array<{ text: string }> };
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { comments: [{ text: raw }] };
      } catch {
        parsed = { comments: [{ text: raw }] };
      }

      setResults(parsed.comments || [{ text: raw }]);
    } catch {
      // toast handled upstream
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Agents</div>
          <h1 className="page-h">Comment agent</h1>
          <p className="page-sub">
            Real comments drafted by your automation, waiting for review.
          </p>
        </div>
      </div>

      {/* LIVE AGENT FEED */}
      {liveDrafts === null ? (
        <div className="card-e mb-4 p-4 text-[13px] text-[var(--txt2)]">Loading drafts…</div>
      ) : liveDrafts.length === 0 ? (
        <div className="card-e mb-4 p-4 text-[13px] text-[var(--txt2)]">
          No drafted comments yet — the discovery agent hasn't found new posts to comment on since your last check. Check back after your next scan cycle.
        </div>
      ) : (
        <div className="mb-5">
          <div className="text-[13px] font-medium mb-3 font-display">Ready to review</div>
          {liveDrafts.map((d) => (
            <div className="card-e mb-3" key={d.id}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--acc)] mb-2">
                {d.author_name || 'Unknown author'}
              </div>
              <p className="text-[12px] text-[var(--txt2)] mb-2 line-clamp-2">{d.post_text}</p>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap border-t border-[var(--border)] pt-2 mt-2">
                {d.drafted_comment}
              </p>
              <div className="flex gap-2.5 mt-3 justify-end">
                <button
                  className="btn-sm btn-edit cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(d.drafted_comment)}
                >
                  Copy
                </button>
                <button
                  className="btn-sm btn-approve cursor-pointer"
                  onClick={() => handleQueueLiveDraft(d)}
                  disabled={queuing[d.id]}
                >
                  {queuing[d.id] ? 'Queuing…' : '→ Queue'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MANUAL ONE-OFF TOOL - secondary, outside the automated flow */}
      <div
        className="text-[12px] text-[var(--txt2)] cursor-pointer mb-3 flex items-center gap-1.5"
        onClick={() => setShowManualTool(prev => !prev)}
      >
        <span>{showManualTool ? '▾' : '▸'}</span>
        <span>Manual tool: paste a one-off post</span>
      </div>

      {showManualTool && (
        <>
          <div className="card-e mb-4">
            <div className="text-xs font-semibold mb-3.5">Generate from post</div>

            <div className="fg">
              <label htmlFor="c-post">Post text</label>
              <textarea
                id="c-post"
                className="ta"
                rows={6}
                placeholder="Paste the full LinkedIn post you want to comment on…"
                value={postText}
                onChange={e => setPostText(e.target.value)}
              ></textarea>
            </div>

            <div className="fg">
              <label htmlFor="c-author">Author name (optional)</label>
              <input
                id="c-author"
                className="inp"
                placeholder="e.g. Jane Doe"
                value={author}
                onChange={e => setAuthor(e.target.value)}
              />
            </div>

            <div className="fg">
              <label htmlFor="c-intent">Comment angle</label>
              <select
                id="c-intent"
                className="sel w-full"
                value={intent}
                onChange={e => setIntent(e.target.value)}
              >
                <option value="agree_add">Agree + add insight</option>
                <option value="challenge">Respectfully challenge</option>
                <option value="ask_question">Ask sharp question</option>
                <option value="share_story">Share a quick story</option>
              </select>
            </div>

            <button className="btn btn-pri" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <span className="ai-spin"></span>Generating via Gemini…
                </>
              ) : (
                '✨ Generate 3 comments'
              )}
            </button>
          </div>

          {results.length > 0 && (
            <div id="c-results">
              <div className="text-[13px] font-medium mb-3 font-display">Pick your favourite</div>
              {results.map((c, i) => (
                <div className="card-e mb-3" key={i}>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--acc)] mb-2">Option {i + 1}</div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{c.text}</p>
                  <div className="flex gap-2.5 mt-3 justify-end">
                    <button
                      className="btn-sm btn-edit cursor-pointer"
                      onClick={() => navigator.clipboard.writeText(c.text)}
                    >
                      Copy
                    </button>
                    <button
                      className="btn-sm btn-approve cursor-pointer"
                      onClick={() => onAddToQueue('Comment', author || 'the author', c.text)}
                    >
                      → Queue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
