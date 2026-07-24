/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { INBOX_MSGS } from '../data';

interface InboxViewProps {
  onAddToQueue: (type: string, target: string, text: string) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
  voicePrompt: () => string;
}

export const InboxView: React.FC<InboxViewProps> = ({ onAddToQueue, callGemini, voicePrompt }) => {
  const [messages, setMessages] = useState(INBOX_MSGS);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Active dialogue thread states
  const [instruction, setInstruction] = useState('');
  const [replyText, setReplyText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [aiDraftOutput, setAiDraftOutput] = useState('');

  const currentMsg = messages.find(m => m.id === selectedId);

  const handleSelectConv = (id: number) => {
    setSelectedId(id);
    setReplyText('');
    setAiDraftOutput('');
    setInstruction('');
    
    // Clear unread indicator
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
  };

  const handleDraftReply = async () => {
    if (!currentMsg) return;
    setDrafting(true);
    setAiDraftOutput('');

    try {
      const raw = await callGemini(
        voicePrompt(),
        `LinkedIn DM with ${currentMsg.name}.\nTheir message: "${currentMsg.prev}"\n${instruction ? `Instructions: ${instruction}\n` : ''}\nWrite a natural reply in my voice. Max 300 chars. Just the reply, no quotes.`
      );

      const cleaned = raw.trim();
      setReplyText(cleaned);
      setAiDraftOutput(cleaned);
    } catch {
      // Ignored: failures updated on alerts
    } finally {
      setDrafting(false);
    }
  };

  const handleSendNow = () => {
    if (!replyText.trim()) return;
    setReplyText('');
    setAiDraftOutput('');
    setInstruction('');
  };

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Inbox</div>
          <h1 className="page-h">Inbox + reply agent</h1>
          <p className="page-sub">AI reads your LinkedIn DMs and drafts replies in your voice. You approve before anything sends.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] grid-cols-1 border border-[var(--border)] rounded-[13px] overflow-hidden h-[520px]">
        {/* Left pane: Conversations */}
        <div className="border-right border-[var(--border)] flex flex-col h-full bg-[var(--sb)] overflow-hidden">
          <div className="p-3 border-bottom border-[var(--border)] text-xs font-semibold">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto">
            {messages.map(m => (
              <div
                className={`inbox-item ${selectedId === m.id ? 'bg-[var(--bg3)]' : ''}`}
                onClick={() => handleSelectConv(m.id)}
                key={m.id}
              >
                <div className={`avatar-sm w-[38px] h-[38px] rounded-full text-xs font-semibold shrink-0 ${m.unread ? 'bg-[rgba(108,143,255,0.15)] text-[var(--pri)]' : 'bg-[var(--bg3)] text-[var(--txt2)]'}`}>
                  {m.av}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold flex items-center gap-1.5">
                    {m.name}
                    {m.unread && (
                      <span className="text-[9px] bg-[var(--pri)] text-white px-1.5 py-0.5 rounded">NEW</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--txt2)] truncate mt-0.5">{m.prev}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-[10px] text-[var(--txt3)]">{m.time}</div>
                  {m.unread && <div className="w-1.5 h-1.5 rounded-full bg-[var(--pri)]"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: Active Thread details */}
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden" id="conv-pane">
          {currentMsg ? (
            <>
              <div className="flex items-center gap-2.5 p-3.5 border-bottom border-[var(--border)]">
                <div className="avatar-sm w-9 h-9 text-xs font-semibold bg-[var(--bg3)]">
                  {currentMsg.av}
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{currentMsg.name}</div>
                  <div className="text-[11px] text-[var(--txt2)]">1st connection</div>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 flex flex-col justify-end">
                <div className="bg-[var(--bg3)] rounded-10 p-3 max-w-[80%] mb-3 mr-auto self-start">
                  <p className="text-xs text-[var(--txt2)] leading-relaxed">{currentMsg.prev}</p>
                </div>

                {aiDraftOutput && (
                  <div className="bg-[rgba(108,143,255,0.08)] border border-[rgba(108,143,255,0.2)] rounded-10 p-3 max-w-[80%] ml-auto mb-3 self-end">
                    <div className="text-[10px] text-[var(--pri)] mb-1 font-semibold">AI draft</div>
                    <p className="text-xs text-[var(--txt)] leading-relaxed">{aiDraftOutput}</p>
                  </div>
                )}
              </div>

              <div className="p-3.5 border-top border-[var(--border)] bg-[var(--bg2)]">
                <input
                  className="inp mb-2 text-xs"
                  placeholder="Instructions for AI (optional)…"
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                />
                <textarea
                  className="ta text-xs mb-2 h-20"
                  placeholder="Click Draft reply for AI, or type your own…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                ></textarea>
                <div className="flex gap-2">
                  <button
                    className="btn btn-out text-xs inline-flex items-center gap-1.5"
                    onClick={handleDraftReply}
                    disabled={drafting}
                  >
                    {drafting ? <><span className="ai-spin"></span>Drafting...</> : '✨ Draft reply'}
                  </button>
                  <button className="btn btn-pri text-xs" onClick={handleSendNow}>
                    Send now
                  </button>
                  <button
                    className="btn btn-out text-xs"
                    onClick={() => {
                      if (replyText.trim()) {
                        onAddToQueue('message', currentMsg.name, replyText);
                        setReplyText('');
                        setAiDraftOutput('');
                        setInstruction('');
                      }
                    }}
                  >
                    → Queue
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--txt3)] text-[13px] bg-[var(--bg2)]">
              ← Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
