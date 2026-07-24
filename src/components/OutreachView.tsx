/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Prospect } from '../types';

interface OutreachViewProps {
  prospects: Prospect[];
  onAddToQueue: (type: string, target: string, text: string) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
  voicePrompt: () => string;
}

interface OptionResult {
  text: string;
}

export const OutreachView: React.FC<OutreachViewProps> = ({
  prospects,
  onAddToQueue,
  callGemini,
  voicePrompt
}) => {
  const [type, setType] = useState('opening_dm');
  const [selectedProspectId, setSelectedProspectId] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectHeadline, setProspectHeadline] = useState('');
  const [prospectCompany, setProspectCompany] = useState('');
  const [angle, setAngle] = useState('');
  const [inboundText, setInboundText] = useState('');

  const [generating, setGenerating] = useState(false);
  const [options, setOptions] = useState<OptionResult[]>([]);

  // List of initial static outbound card items we keep for simulation
  const [pendingDrafts, setPendingDrafts] = useState([
    { id: 101, name: 'Sarah Okonkwo', hl: 'VP GTM @ Paydeck', text: "Hey Sarah, saw your post on warm signal outreach — worth a quick 15 min?" },
    { id: 102, name: 'Tunde Adesola', hl: 'VP Sales @ Verto FX', text: "Hey Tunde, loved your GTM advice. We are executing a similar sprint this quarter." },
    { id: 103, name: 'Marcus Webb', hl: 'Founder @ Closerstack', text: "Hey Marcus, your post on cold email fatigue is spot-on. Lets stay connected." }
  ]);

  const handleProspectChange = (idStr: string) => {
    setSelectedProspectId(idStr);
    if (!idStr) return;

    const matched = prospects.find(p => p.id === parseInt(idStr));
    if (matched) {
      setProspectName(matched.name);
      setProspectHeadline(matched.hl);
      setProspectCompany(matched.co || '');
    }
  };

  const handleGenerateOutreach = async () => {
    if (!prospectName.trim()) {
      return;
    }

    setGenerating(true);
    setOptions([]);

    const recipes = {
      connection_note: { cap: 'max 280 chars', instr: 'Personalised connection note — reference ONE specific thing about them. No pitch. End warm.' },
      opening_dm: { cap: 'max 600 chars', instr: 'Opening DM after they accept. Hook → shared relevance → ONE small ask. NO pitch deck yet.' },
      followup_1: { cap: 'max 350 chars', instr: "Follow-up to silence. Add value. Do NOT say 'just bumping this'." },
      reply_to_inbound: { cap: 'max 600 chars', instr: `They said: "${inboundText}". Write 3 reply options from low-pressure rapport to direct bridge-to-call.` }
    };

    const r = recipes[type as keyof typeof recipes] || recipes.opening_dm;

    try {
      const raw = await callGemini(
        voicePrompt(),
        `PROSPECT: ${prospectName}${prospectHeadline ? `, ${prospectHeadline}` : ''}${prospectCompany ? `, ${prospectCompany}` : ''}\nOFFER: ${angle || '(use voice profile)'}\nTASK: ${r.instr}\nLENGTH: ${r.cap}\nReturn JSON: {"options":[{"text":"..."},{"text":"..."},{"text":"..."}]}`
      );

      let parsed: { options: OptionResult[] };
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { options: [{ text: raw }] };
      } catch {
        parsed = { options: [{ text: raw }] };
      }

      setOptions(parsed.options || [{ text: raw }]);
    } catch {
      // Ignored: reported via notification alerts
    } finally {
      setGenerating(false);
    }
  };

  const handleDiscardDraft = (id: number) => {
    setPendingDrafts(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Outreach</div>
          <h1 className="page-h">Outreach drafts</h1>
          <p className="page-sub">Connection notes, opening DMs, follow-ups, inbound replies — all in your voice via Gemini.</p>
        </div>
      </div>

      <div className="card-e mb-4">
        <div className="text-xs font-semibold mb-3.5">Generate new outreach</div>
        
        <div className="grid2 gap-3 mb-3">
          <div>
            <label className="text-xs mb-1 block">Type</label>
            <select
              className="sel w-full mt-1.5"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="connection_note">Connection note (300 chars)</option>
              <option value="opening_dm">Opening DM</option>
              <option value="followup_1">Follow-up to silence</option>
              <option value="reply_to_inbound">Reply to inbound</option>
            </select>
          </div>

          <div>
            <label className="text-xs mb-1 block">From CRM</label>
            <select
              className="sel w-full mt-1.5"
              value={selectedProspectId}
              onChange={e => handleProspectChange(e.target.value)}
            >
              <option value="">Type name below…</option>
              {prospects.map(p => (
                <option value={p.id} key={p.id}>
                  {p.name} · {p.co}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <div>
            <label className="text-xs mb-1 block">Name</label>
            <input
              className="inp mt-1.5"
              placeholder="Jane Doe"
              value={prospectName}
              onChange={e => setProspectName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block">Headline</label>
            <input
              className="inp mt-1.5"
              placeholder="VP Sales @ Acme"
              value={prospectHeadline}
              onChange={e => setProspectHeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block">Company</label>
            <input
              className="inp mt-1.5"
              placeholder="Acme"
              value={prospectCompany}
              onChange={e => setProspectCompany(e.target.value)}
            />
          </div>
        </div>

        <div className="fg">
          <label className="text-xs mb-1 block">Offer / angle hook</label>
          <input
            className="inp"
            placeholder="e.g. We help Series A founders 3x demo bookings without ads"
            value={angle}
            onChange={e => setAngle(e.target.value)}
          />
        </div>

        {type === 'reply_to_inbound' && (
          <div className="fg" id="inbound-div">
            <label className="text-xs mb-1 block">Their inbound message</label>
            <textarea
              className="ta"
              rows={3}
              placeholder="Paste what they said…"
              value={inboundText}
              onChange={e => setInboundText(e.target.value)}
            ></textarea>
          </div>
        )}

        <button className="btn btn-pri" onClick={handleGenerateOutreach} disabled={generating}>
          {generating ? <span className="ai-spin"></span> : 'Generate message ✨'}
        </button>
      </div>

      {options.length > 0 && (
        <div id="ot-results" className="mb-4">
          {options.map((o, idx) => (
            <div className="card-e mb-3" key={idx}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--acc)] mb-2">Option {idx + 1}</div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{o.text}</p>
              <div className="flex gap-2.5 justify-end mt-3">
                <button
                  className="btn-sm btn-edit cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(o.text)}
                >
                  Copy
                </button>
                <button
                  className="btn-sm btn-approve cursor-pointer"
                  onClick={() => onAddToQueue('DM', prospectName, o.text)}
                >
                  → Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="divider"></div>

      <div className="text-[13px] font-medium mb-3 font-display">Pending outreach drafts</div>
      {pendingDrafts.map(d => (
        <div className="q-item" key={d.id}>
          <span className="badge badge-amber shrink-0">DM</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold">
              {d.name} <span className="text-[10px] text-[var(--txt3)] ml-1.5 font-normal">{d.hl}</span>
            </div>
            <div className="text-xs text-[var(--txt2)] mt-1 truncate">{d.text}</div>
            <div className="flex gap-1.5 mt-2">
              <button
                className="btn-sm btn-approve cursor-pointer"
                onClick={() => {
                  onAddToQueue('DM', d.name, d.text);
                  handleDiscardDraft(d.id);
                }}
              >
                Approve
              </button>
              <button className="btn-sm btn-edit cursor-pointer" onClick={() => {}}>
                Edit
              </button>
              <button className="btn-sm btn-reject cursor-pointer" onClick={() => handleDiscardDraft(d.id)}>
                Discard
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
