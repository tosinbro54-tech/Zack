/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface StudioViewProps {
  onAddToQueue: (type: string, target: string, text: string) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
  voicePrompt: () => string;
  generateImage: (prompt: string) => Promise<string>;
}

interface CarouselSlide {
  title: string;
  body: string;
}

export const StudioView: React.FC<StudioViewProps> = ({ onAddToQueue, callGemini, voicePrompt, generateImage }) => {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('text');
  const [slidesCount, setSlidesCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);

  // Image Gen States
  const [imgPrompt, setImgPrompt] = useState('');
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatedImgSrc, setGeneratedImgSrc] = useState('');

  const handleGeneratePost = async () => {
    if (topic.trim().length < 3) {
      return;
    }

    setGenerating(true);
    setCarouselSlides([]);
    setOutputText('');

    const instr = {
      text: 'Write a LinkedIn text post with a strong hook, body paragraphs, and 2-3 hashtags.',
      carousel: `Write a LinkedIn carousel. Return JSON: {"hook":"...","body":"...","hashtags":["..."],"slides":[{"title":"...","body":"..."}]} with ${slidesCount} slides.`,
      hook_list: 'Write a LinkedIn post with a punchy hook, numbered list of 5-7 points, then CTA.',
      story: 'Write a LinkedIn post: situation → complication → insight → takeaway.'
    };

    const selectedInstructions = instr[type as keyof typeof instr] || instr.text;

    try {
      const raw = await callGemini(
        voicePrompt(),
        `Topic: "${topic}"\n\nFormat: ${selectedInstructions}\n\nWrite the full post. No preamble.`
      );

      if (type === 'carousel') {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            const parsed = JSON.parse(m[0]);
            setOutputText([parsed.hook || '', parsed.body || '', parsed.hashtags?.join(' ') || ''].filter(Boolean).join('\n\n'));
            if (parsed.slides && parsed.slides.length) {
              setCarouselSlides(parsed.slides);
            }
          } catch {
            setOutputText(raw);
          }
        } else {
          setOutputText(raw);
        }
      } else {
        setOutputText(raw);
      }
    } catch {
      // Errors handled via app notifications
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    const promptValue = imgPrompt.trim() || 'Modern dark minimal LinkedIn hero image';
    setGeneratingImg(true);
    setGeneratedImgSrc('');
    try {
      const dataUrl = await generateImage(promptValue);
      setGeneratedImgSrc(dataUrl);
    } catch (e: any) {
      setGeneratedImgSrc(`Error generating image: ${e.message}`);
    } finally {
      setGeneratingImg(false);
    }
  };

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Content</div>
          <h1 className="page-h">Post & carousel studio</h1>
          <p className="page-sub">Topic in. Full post or carousel out — in your voice via Gemini.</p>
        </div>
      </div>

      <div className="grid2">
        <div className="flex flex-col gap-3.5">
          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">Post topic / angle</div>
            <textarea
              className="ta"
              rows={4}
              placeholder="e.g. Why cold email is dying and warm signal outreach is winning in 2026"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            ></textarea>
            <div className="flex gap-2.5 mt-2.5 items-center flex-wrap">
              <select
                className="sel flex-1 min-w-[120px]"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="text">Text post</option>
                <option value="carousel">Carousel (slides)</option>
                <option value="hook_list">Hook + list</option>
                <option value="story">Storytelling arc</option>
              </select>
              <input
                className="inp w-[70px]"
                type="number"
                min={4}
                max={10}
                value={slidesCount}
                onChange={e => setSlidesCount(parseInt(e.target.value) || 6)}
              />
              <button className="btn btn-pri" onClick={handleGeneratePost} disabled={generating}>
                {generating ? <span className="ai-spin"></span> : 'Generate ✨'}
              </button>
            </div>
          </div>

          {outputText && (
            <div className="card-e" id="s-out-card">
              <div className="text-xs font-semibold mb-2.5">Generated post</div>
              <textarea
                className="ta font-sans text-xs"
                rows={12}
                value={outputText}
                onChange={e => setOutputText(e.target.value)}
              ></textarea>
              <div className="flex gap-2 mt-2.5">
                <button
                  className="btn-sm btn-edit cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(outputText);
                  }}
                >
                  Copy
                </button>
                <button
                  className="btn-sm btn-approve cursor-pointer"
                  onClick={() => onAddToQueue('Post', 'LinkedIn post', outputText)}
                >
                  → Queue
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">Hero image (Gemini)</div>
            <textarea
              className="ta"
              rows={3}
              placeholder="Dark minimal dashboard, electric blue and gold tones…"
              value={imgPrompt}
              onChange={e => setImgPrompt(e.target.value)}
            ></textarea>
            <button className="btn btn-out mt-2.5 text-xs inline-flex items-center gap-1.5" onClick={handleGenerateImage} disabled={generatingImg}>
              {generatingImg ? <><span className="ai-spin"></span>Generating...</> : 'Generate image 🖼'}
            </button>
            {generatedImgSrc && (
              <div id="s-img-res" className="mt-3">
                {generatedImgSrc.startsWith('data:') ? (
                  <img src={generatedImgSrc} style={{ width: '100%', borderRadius: 10 }} alt="Generated Hero" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-xs text-[var(--dan)] bg-[var(--bg3)] p-3 rounded-9">{generatedImgSrc}</div>
                )}
              </div>
            )}
          </div>

          {carouselSlides.length > 0 && (
            <div className="card-e" id="s-slides-card">
              <div className="text-xs font-semibold mb-3">Carousel slides</div>
              <div id="s-slides-grid">
                <div className="grid grid-cols-2 gap-2.5">
                  {carouselSlides.map((s, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-[rgba(108,143,255,0.12)] to-[rgba(240,180,41,0.06)] border border-[var(--border)] rounded-10 p-3.5 min-h-[90px]">
                      <div className="text-[10px] font-mono text-[var(--pri)] mb-1.5">{String(idx + 1).padStart(2, '0')}</div>
                      <div className="font-display text-[13px] font-bold mb-1.5">{s.title}</div>
                      <p className="text-[11px] text-[var(--txt2)] leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">Recent posts</div>
            {["Why I deleted 80% of my outreach templates", "'Always be closing' is outdated. Try this instead.", "3 LinkedIn moves that replaced my SDR spend"].map((t, idx) => (
              <div key={idx} className="flex items-center gap-2.5 py-2 border-bottom border-[var(--border)] last:border-none">
                <span className="text-xs text-[var(--txt2)] flex-1 truncate">{t}</span>
                <span className="badge badge-green">Sent</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
