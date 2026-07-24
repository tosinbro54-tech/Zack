/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Icp, Prospect } from '../types';

interface ProspectsViewProps {
  prospects: Prospect[];
  icp: Icp;
  onAddProspect: (prospect: Prospect) => void;
  onAddToQueue: (type: string, target: string, text: string) => void;
  onUpdateProspectList: (updatedList: Prospect[]) => void;
  callGemini: (sys: string, user: string) => Promise<string>;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'badge-gray',
  queued: 'badge-blue',
  connected: 'badge-blue',
  messaged: 'badge-amber',
  replied: 'badge-amber',
  booked: 'badge-green',
  closed_won: 'badge-green'
};

export const ProspectsView: React.FC<ProspectsViewProps> = ({
  prospects,
  icp,
  onAddProspect,
  onAddToQueue,
  onUpdateProspectList,
  callGemini
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [hl, setHl] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');

  const [scoringList, setScoringList] = useState<Record<number, boolean>>({});

  const handleScoreProspect = async (id: number) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;

    setScoringList(prev => ({ ...prev, [id]: true }));

    try {
      const raw = await callGemini(
        'You are an ICP scorer. Return JSON only.',
        `Score this prospect against ICP: ${JSON.stringify(icp)}\nProspect: ${prospect.name}, ${prospect.hl}\nReturn JSON matching schema: {"score":0-100,"reasoning":"one sentence"}`
      );

      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          const score = parsed.score ?? prospect.score;
          
          const updated = prospects.map(p => p.id === id ? { ...p, score } : p);
          onUpdateProspectList(updated);
        } catch {
          // ignore parsing error
        }
      }
    } catch {
      // ignore gemini calling error
    } finally {
      setScoringList(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProspect: Prospect = {
      id: Date.now(),
      name: name.trim(),
      hl: hl.trim(),
      co: company.trim(),
      score: 0,
      status: 'new'
    };

    onAddProspect(newProspect);
    setShowAddModal(false);

    setName('');
    setHl('');
    setCompany('');
    setNotes('');
  };

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">CRM</div>
          <h1 className="page-h">Prospects</h1>
          <p className="page-sub">Your scored LinkedIn pipeline.</p>
        </div>
        <button className="btn btn-pri" onClick={() => setShowAddModal(true)}>
          + Add prospect
        </button>
      </div>

      <div className="card-e mb-4 p-4.5">
        <div className="text-[11px] text-[var(--txt2)] mb-1.5 uppercase tracking-wide">
          ICP definition
        </div>
        <div className="text-[13px] text-[var(--txt)]">
          {icp.titles.slice(0, 3).join(', ')} at {icp.industries.join('/')} companies in {icp.locations.join(', ')}.
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Score</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map(p => {
              const isScoring = scoringList[p.id] || false;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar-sm w-7 h-7 text-[10px] font-bold">
                        {p.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-[13px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-[var(--txt2)] text-xs">{p.hl}</td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 15,
                        fontWeight: 700,
                        color: p.score >= 80 ? 'var(--suc)' : p.score >= 60 ? 'var(--acc)' : 'var(--txt2)'
                      }}
                    >
                      {p.score}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[p.status] || 'badge-gray'}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-sm btn-edit cursor-pointer mr-1"
                      onClick={() => handleScoreProspect(p.id)}
                      disabled={isScoring}
                    >
                      {isScoring ? 'Scoring...' : 'Score ✨'}
                    </button>
                    <button
                      className="btn-sm btn-approve cursor-pointer"
                      onClick={() =>
                        onAddToQueue(
                          'DM',
                          p.name,
                          `Hey ${p.name.split(' ')[0]}, saw your post on warm signal outreach — worth a quick 15 min?`
                        )
                      }
                    >
                      → Outreach
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-[9998] flex items-center justify-center p-4">
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-16 p-7 w-full max-w-[440px]">
            <h3 className="font-display font-bold text-lg mb-4">Add prospect</h3>
            
            <form onSubmit={handleAddSubmit}>
              <div className="fg mb-3">
                <label className="block text-xs mb-1">Full name *</label>
                <input
                  className="inp"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div className="fg mb-3">
                <label className="block text-xs mb-1">Headline</label>
                <input
                  className="inp"
                  value={hl}
                  onChange={e => setHl(e.target.value)}
                  placeholder="e.g. VP Sales @ Acme"
                />
              </div>

              <div className="fg mb-3">
                <label className="block text-xs mb-1">Company</label>
                <input
                  className="inp"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="fg mb-4">
                <label className="block text-xs mb-1">Notes</label>
                <input
                  className="inp"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Insert notes..."
                />
              </div>

              <div className="flex gap-2.5">
                <button type="submit" className="btn btn-pri flex-grow">
                  Add
                </button>
                <button
                  type="button"
                  className="btn btn-out"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
