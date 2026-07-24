/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Creator, Prospect } from '../types';
import { api } from '../lib/api';

interface DiscoverViewProps {
  trackedCreators: Creator[];
  onAddCreator: (creator: Creator) => void;
  onRemoveCreator: (id: number) => void;
  onAddProspect: (prospect: Prospect) => void;
  onAddToQueue: (type: string, target: string, text: string) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
  voicePrompt: () => string;
}

interface DraftCommentResult {
  text: string;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  trackedCreators,
  onAddCreator,
  onRemoveCreator,
  onAddProspect,
  onAddToQueue,
  callGemini,
  voicePrompt
}) => {
  const [activeTab, setActiveTab] = useState<'keyword' | 'creators' | 'mine' | 'find-creators'>('keyword');
  const [kwInp, setKwInp] = useState('B2B SaaS outreach');
  const [discovering, setDiscovering] = useState(false);

  // Creators tab
  const [newCreatorUrl, setNewCreatorUrl] = useState('');

  // Finding creators tab
  const [creatorKwInput, setCreatorKwInput] = useState('VP Sales, Founder B2B SaaS');
  const [findingCreators, setFindingCreators] = useState(false);
  const [creatorSuggestions, setCreatorSuggestions] = useState<Array<{ name: string; hl: string; posts: number; reactions: number; score: number }>>([]);

  // Draft comments state
  const [generatingForPost, setGeneratingForPost] = useState<Record<string, boolean>>({});
  const [draftOutputs, setDraftOutputs] = useState<Record<string, DraftCommentResult[]>>({});

  // Mining commenters state
  const [miningForPost, setMiningForPost] = useState<Record<string, boolean>>({});
  const [minedList, setMinedList] = useState<any[]>([]);
  const [discoveredPosts, setDiscoveredPosts] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch with default keyword on mount
    const loadDefaultPosts = async () => {
      try {
        setDiscovering(true);
        const data = await api.post('/api/linkedin/discover', { keyword: kwInp });
        setDiscoveredPosts(data || []);
      } catch (err) {
        console.error('Failed to load initial posts:', err);
      } finally {
        setDiscovering(false);
      }
    };
    loadDefaultPosts();
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const data = await api.post('/api/linkedin/discover', { keyword: kwInp });
      setDiscoveredPosts(data || []);
    } catch (err: any) {
      console.error('Failed to discover posts:', err);
    } finally {
      setDiscovering(false);
    }
  };

  const handleMining = async (urn: string) => {
    setMiningForPost(prev => ({ ...prev, [urn]: true }));
    setActiveTab('mine');
    try {
      const data = await api.post('/api/linkedin/mine', { urn });
      setMinedList(data || []);
    } catch (err: any) {
      console.error('Failed mining comments:', err);
    } finally {
      setMiningForPost(prev => ({ ...prev, [urn]: false }));
    }
  };

  const handleDraftComments = async (urn: string, author: string, postText: string) => {
    setGeneratingForPost(prev => ({ ...prev, [urn]: true }));
    try {
      const raw = await callGemini(
        voicePrompt(),
        `Post by ${author}: "${postText.slice(0, 500)}"\n\nGenerate exactly 3 LinkedIn comments. Return JSON only: {"comments":[{"text":"..."},{"text":"..."},{"text":"..."}]}\nMax 280 chars each.`
      );
      
      let parsed: { comments: DraftCommentResult[] };
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { comments: [{ text: raw }] };
      } catch {
        parsed = { comments: [{ text: raw }] };
      }

      setDraftOutputs(prev => ({
        ...prev,
        [urn]: parsed.comments || [{ text: raw }]
      }));
    } catch (e: any) {
      setDraftOutputs(prev => ({
        ...prev,
        [urn]: [{ text: `Error generating comments: ${e.message}` }]
      }));
    } finally {
      setGeneratingForPost(prev => ({ ...prev, [urn]: false }));
    }
  };

  const handleAddCreator = () => {
    if (!newCreatorUrl.trim()) return;
    const match = newCreatorUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const slug = match ? match[1] : newCreatorUrl;

    const newCreator: Creator = {
      id: Date.now(),
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      hl: 'Tracking…',
      posts_per_week: 0,
      avg_reactions: 0
    };

    onAddCreator(newCreator);
    setNewCreatorUrl('');
  };

  const handleFindCreators = async () => {
    setFindingCreators(true);
    setCreatorSuggestions([]);
    await new Promise(r => setTimeout(r, 1200));

    const suggestions = [
      { name: 'Femi Taiwo', hl: 'VP Sales @ Kuda Bank', posts: 5, reactions: 112, score: 560 },
      { name: 'Ngozi Adeyemi', hl: 'Head of Growth @ Paystack', posts: 4, reactions: 98, score: 392 },
      { name: 'Tunde Balogun', hl: 'Founder @ Credpal', posts: 3, reactions: 67, score: 201 }
    ];

    setCreatorSuggestions(suggestions);
    setFindingCreators(false);
  };

  const handleFollowSuggestion = (s: any) => {
    const fresh: Creator = {
      id: Date.now(),
      slug: s.name.toLowerCase().replace(/ /g, '-'),
      name: s.name,
      hl: s.hl,
      posts_per_week: s.posts,
      avg_reactions: s.reactions
    };
    onAddCreator(fresh);
  };

  const handleProspectAdd = (c: any) => {
    const prospect: Prospect = {
      id: Date.now(),
      name: c.name,
      hl: c.hl,
      co: '',
      score: c.score,
      status: 'new'
    };
    onAddProspect(prospect);
  };

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Prospecting</div>
          <h1 className="page-h">Discover feed</h1>
          <p className="page-sub">Find ICP-fit posts. Draft on-voice comments. Mine commenters as warm prospects.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 border-bottom border-[var(--border)] pb-4 flex-wrap">
        <button
          className={`disc-tab px-4 py-1.5 rounded-8 text-[13px] font-medium border-none cursor-pointer transition-all ${activeTab === 'keyword' ? 'bg-[rgba(108,143,255,0.1)] text-[var(--pri)]' : 'bg-transparent text-[var(--txt2)]'}`}
          onClick={() => setActiveTab('keyword')}
        >
          🔍 Keyword search
        </button>
        <button
          className={`disc-tab px-4 py-1.5 rounded-8 text-[13px] font-medium border-none cursor-pointer transition-all ${activeTab === 'creators' ? 'bg-[rgba(108,143,255,0.1)] text-[var(--pri)]' : 'bg-transparent text-[var(--txt2)]'}`}
          onClick={() => setActiveTab('creators')}
        >
          👥 Creator feed
        </button>
        <button
          className={`disc-tab px-4 py-1.5 rounded-8 text-[13px] font-medium border-none cursor-pointer transition-all ${activeTab === 'mine' ? 'bg-[rgba(108,143,255,0.1)] text-[var(--pri)]' : 'bg-transparent text-[var(--txt2)]'}`}
          onClick={() => setActiveTab('mine')}
        >
          ⛏ Warm prospects
        </button>
        <button
          className={`disc-tab px-4 py-1.5 rounded-8 text-[13px] font-medium border-none cursor-pointer transition-all ${activeTab === 'find-creators' ? 'bg-[rgba(108,143,255,0.1)] text-[var(--pri)]' : 'bg-transparent text-[var(--txt2)]'}`}
          onClick={() => setActiveTab('find-creators')}
        >
          🔭 Find creators
        </button>
      </div>

      {activeTab === 'keyword' && (
        <div id="dtab-keyword">
          <div className="flex gap-2.5 mb-[18px]">
            <input
              className="inp flex-1"
              value={kwInp}
              onChange={e => setKwInp(e.target.value)}
              placeholder="Search terms"
            />
            <button className="btn btn-pri" onClick={handleDiscover} disabled={discovering}>
              {discovering ? 'Scanning…' : 'Discover posts'}
            </button>
          </div>

          <div id="posts-list">
            {discoveredPosts.map(p => {
              const ukey = p.urn.replace(/:/g, '-');
              const isGenerating = generatingForPost[p.urn] || false;
              const hasDrafts = draftOutputs[p.urn];

              return (
                <div className="post-card" key={p.urn}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="avatar-sm">
                      {p.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium">{p.author}</div>
                      <div className="text-[11px] text-[var(--txt2)]">{p.hl}</div>
                    </div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto px-2.5 py-1 rounded-7 border border-[var(--border)] text-[11px] text-[var(--txt2)] hover:border-[var(--pri)] hover:text-[var(--txt)] transition-all"
                    >
                      View ↗
                    </a>
                  </div>

                  <p className="text-xs text-[var(--txt2)] leading-relaxed mb-2.5">{p.text}</p>

                  <div className="flex gap-4 text-[11px] text-[var(--txt3)] mb-3">
                    <span>❤ {p.reactions}</span>
                    <span>💬 {p.comments}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="btn-sm btn-edit cursor-pointer"
                      onClick={() => handleDraftComments(p.urn, p.author, p.text)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <><span className="ai-spin"></span>Drafting...</> : '✨ Draft comment'}
                    </button>
                    <button
                      className="btn-sm btn-edit cursor-pointer"
                      onClick={() => handleMining(p.urn)}
                    >
                      ⛏ Mine commenters
                    </button>
                  </div>

                  {isGenerating && (
                    <div className="mt-3 text-xs text-[var(--txt3)] bg-[var(--bg3)] p-3 rounded-9">
                      <span className="ai-spin"></span> Generating 3 comments via Gemini…
                    </div>
                  )}

                  {!isGenerating && hasDrafts && (
                    <div className="mt-3 bg-[var(--bg1)] border border-[var(--border)] p-3 rounded-11">
                      <div className="text-[11px] text-[var(--txt2)] mb-2">3 comments in your voice</div>
                      {hasDrafts.map((c, i) => (
                        <div key={i} className="comment-draft p-2 mb-2 bg-[var(--bg)] border border-[var(--border)] rounded-9">
                          <p className="text-xs text-[var(--txt2)] leading-relaxed mb-2">{c.text}</p>
                          <div className="flex gap-1.5">
                            <button
                              className="btn-sm btn-approve cursor-pointer"
                              onClick={() => onAddToQueue('Comment', p.author, c.text)}
                            >
                              → Queue
                            </button>
                            <button
                              className="btn-sm btn-edit cursor-pointer"
                              onClick={() => {
                                navigator.clipboard.writeText(c.text);
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'creators' && (
        <div id="dtab-creators">
          <div className="flex gap-2.5 mb-4">
            <input
              className="inp flex-1"
              placeholder="LinkedIn URL: https://linkedin.com/in/username"
              value={newCreatorUrl}
              onChange={e => setNewCreatorUrl(e.target.value)}
            />
            <button className="btn btn-pri" onClick={handleAddCreator}>
              + Add creator
            </button>
          </div>

          {trackedCreators.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-10 mb-2">
              <div className="avatar-sm">
                {c.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-[11px] text-[var(--txt2)]">{c.hl}</div>
              </div>
              <div className="text-right flex-shrink-0 text-xs text-[var(--suc)] font-semibold">
                <div>{c.posts_per_week}x/week</div>
                <div className="text-[10px] text-[var(--txt3)] font-normal">avg {c.avg_reactions} reactions</div>
              </div>
              <button
                className="px-2.5 py-1 text-[11px] bg-transparent text-[var(--txt3)] border border-[var(--border)] rounded-6 cursor-pointer hover:border-[var(--pri)] hover:text-[var(--txt)] ml-3"
                onClick={() => onRemoveCreator(c.id)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="mt-4 p-3.5 bg-[rgba(108,143,255,0.05)] border border-[rgba(108,143,255,0.1)] rounded-10">
            <div className="text-xs font-semibold mb-2">Latest posts from creator list</div>
            {discoveredPosts.slice(0, 2).map(p => (
              <div className="post-card" key={p.urn}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="avatar-sm">{p.author.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <div className="text-[13px] font-medium">{p.author}</div>
                    <div className="text-[11px] text-[var(--txt2)]">{p.hl}</div>
                  </div>
                </div>
                <p className="text-xs text-[var(--txt2)] leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'mine' && (
        <div id="dtab-mine">
          <div className="text-[13px] font-medium mb-3.5 font-display">Warm prospects from post commenters</div>
          <div id="commenters-list">
            {minedList.length === 0 ? (
              <div className="text-center py-10 text-[var(--txt3)] text-[13px]">
                Click "⛏ Mine commenters" on any post to find warm prospects.
              </div>
            ) : (
              minedList.map((c, i) => (
                <div key={i} className="bg-[var(--bg2)] border border-[var(--border)] rounded-11 p-3.5 mb-2.5 flex gap-3 items-start">
                  <div className="avatar-sm">
                    {c.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold">{c.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[rgba(52,211,153,0.12)] text-[var(--suc)]">
                        ICP {c.score}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--txt2)] mt-0.5">{c.hl}</div>
                    <p className="text-xs text-[var(--txt3)] italic mt-1.5 leading-relaxed">
                      "{c.comment}"
                    </p>
                    <div className="text-[10px] text-[var(--txt3)] mt-1">Match: {c.reason}</div>
                  </div>
                  <button
                    onClick={() => handleProspectAdd(c)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-7 bg-[rgba(52,211,153,0.1)] text-[var(--suc)] border-none font-semibold text-[11px] cursor-pointer hover:bg-[rgba(52,211,153,0.2)]"
                  >
                    + Prospect
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'find-creators' && (
        <div id="dtab-find-creators">
          <p className="text-[13px] text-[var(--txt2)] mb-4">
            Searches LinkedIn for creators matching your ICP and scores them by posting frequency × avg engagement.
          </p>
          <div className="flex gap-2.5 mb-4">
            <input
              className="inp flex-1"
              value={creatorKwInput}
              onChange={e => setCreatorKwInput(e.target.value)}
              placeholder="Search titles/industries"
            />
            <button className="btn btn-pri" onClick={handleFindCreators} disabled={findingCreators}>
              {findingCreators ? 'Searching…' : 'Find creators'}
            </button>
          </div>

          <div id="creator-suggestions">
            {findingCreators && (
              <div className="text-xs text-[var(--txt3)] py-3">
                <span className="ai-spin"></span> Searching…
              </div>
            )}
            {!findingCreators && creatorSuggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-10 mb-2">
                <div className="avatar-sm">
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{s.name}</div>
                  <div className="text-[11px] text-[var(--txt2)]">{s.hl}</div>
                  <div className="text-[10px] text-[var(--txt3)] mt-0.5">
                    {s.posts}x/week · avg {s.reactions} reactions · score: {s.score}
                  </div>
                </div>
                <button
                  onClick={() => handleFollowSuggestion(s)}
                  className="px-3 py-1.5 rounded-7 bg-[rgba(52,211,153,0.1)] text-[var(--suc)] border-none cursor-pointer font-semibold text-[11px]"
                >
                  + Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
