/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface CommentsViewProps {
  onAddToQueue: (type: string, target: string, text: string) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
  voicePrompt: () => string;
}

export const CommentsView: React.FC<CommentsViewProps> = ({ onAddToQueue, callGemini, voicePrompt }) => {
  const [postText, setPostText] = useState('');
  const [author, setAuthor] = useState('');
  const [intent, setIntent] = useState('agree_add');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Array<{ text: string }>>([]);

  const handleGenerate = async () => {
    if (postText.trim().length < 20) {
      return;
    }

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
      // Handled inside App.tsx or displayed through alerts/toast callbacks
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
            Paste any LinkedIn post → get 3 personalised comments in your voice via Gemini.
          </p>
        </div>
      </div>

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
                  onClick={() => {
                    navigator.clipboard.writeText(c.text);
                  }}
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
    </div>
  );
};
