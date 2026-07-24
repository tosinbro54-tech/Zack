/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onShowKeyModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onShowKeyModal }) => {
  const funnel = [
    { label: 'Comments', val: 47, sub: 'last 7d', icon: '💬' },
    { label: 'Connects', val: 23, sub: 'last 7d', icon: '👤' },
    { label: 'DMs sent', val: 18, sub: 'last 7d', icon: '📤' },
    { label: 'Replies', val: 9, sub: '50% reply rate', icon: '📥' },
    { label: 'Booked', val: 3, sub: '33% close rate', icon: '📅' }
  ];

  const bars = [12, 18, 9, 22, 15, 28, 19];
  const maxB = Math.max(...bars);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const quick = [
    { icon: '🧭', label: 'Find posts to engage', view: 'discover' },
    { icon: '✨', label: 'Write a new post', view: 'studio' },
    { icon: '📋', label: 'Review queue', view: 'queue' },
    { icon: '👥', label: 'View prospects', view: 'prospects' }
  ];

  const activity = [
    { type: 'Comment', tc: 'badge-blue', target: 'Marcus Webb — "AI in SaaS sales…"', status: 'Sent ✓', sc: 'badge-green', time: '2m ago' },
    { type: 'Connect', tc: 'badge-amber', target: 'Sarah Okonkwo · Founder @ Paydeck', status: 'Pending', sc: 'badge-amber', time: '18m ago' },
    { type: 'DM', tc: 'badge-blue', target: 'Tunde Adesola · VP Sales @ Verto', status: 'Replied ✓', sc: 'badge-green', time: '1h ago' },
    { type: 'Comment', tc: 'badge-blue', target: 'Priya Nair — "B2B content in 2026…"', status: 'Queued', sc: 'badge-gray', time: '2h ago' }
  ];

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Mission control</div>
          <h1 className="page-h">Operator dashboard</h1>
          <p className="page-sub">Your LinkedIn pipeline — last 7 days.</p>
        </div>
        <button className="btn btn-pri" onClick={() => onNavigate('discover')}>
          🧭 Find posts to engage
        </button>
      </div>

      <div className="grid5 mb-[18px]">
        {funnel.map((s, i) => (
          <div className="metric-card" key={i}>
            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.08em] text-[var(--txt2)] mb-2">
              <span>{s.label}</span>
              <span className="text-sm">{s.icon}</span>
            </div>
            <div className="font-display text-[28px] font-extrabold">{s.val}</div>
            <div className="text-[11px] text-[var(--txt2)] mt-[3px]">{s.sub}</div>
            {i > 0 && (
              <div className="text-[9px] uppercase text-[var(--pri)] tracking-[0.06em] mt-1.5">
                {Math.round((s.val / funnel[i - 1].val) * 100)}% conv.
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid2 mb-5">
        <div className="card-e">
          <div className="text-[11px] text-[var(--txt2)] uppercase tracking-[0.08em] mb-3">
            Activity this week
          </div>
          <div className="bar-chart">
            {bars.map((v, idx) => (
              <div
                className="bar"
                key={idx}
                style={{ height: `${Math.round((v / maxB) * 100)}%` }}
                title={`${v} actions`}
              ></div>
            ))}
          </div>
          <div className="flex mt-1">
            {days.map((d, idx) => (
              <div className="flex-1 text-center text-[9px] text-[var(--txt3)]" key={idx}>
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className="card-e">
          <div className="text-[11px] text-[var(--txt2)] uppercase tracking-[0.08em] mb-3.5">
            Quick actions
          </div>
          {quick.map((q, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate(q.view)}
              className="flex items-center gap-3 p-2.5 rounded-[9px] cursor-pointer border border-[var(--border)] mb-2 transition-all hover:border-[var(--pri)]"
            >
              <span className="text-lg">{q.icon}</span>
              <span className="text-[13px]">{q.label}</span>
              <span className="ml-auto text-[var(--txt3)]">→</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[13px] font-medium mb-3 font-display">Recent activity</div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Action</th>
              <th>Target</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((a, idx) => (
              <tr key={idx}>
                <td>
                  <span className={`badge ${a.tc}`}>{a.type}</span>
                </td>
                <td className="text-[var(--txt2)] text-xs max-w-[240px] truncate">
                  {a.target}
                </td>
                <td>
                  <span className={`badge ${a.sc}`}>{a.status}</span>
                </td>
                <td className="text-[var(--txt3)] text-[11px]">{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3.5 bg-[rgba(108,143,255,0.06)] border border-[rgba(108,143,255,0.15)] rounded-11 flex items-center gap-2.5 flex-wrap">
        <span className="text-xs text-[var(--pri)]">
          ⚙ Add your Gemini API key to enable real AI generation
        </span>
        <button
          onClick={onShowKeyModal}
          className="ml-auto px-3.5 py-1.5 rounded-7 border border-[rgba(108,143,255,0.3)] bg-transparent color-[var(--pri)] text-xs cursor-pointer hover:border-[var(--pri)] transition-all"
        >
          Add key
        </button>
      </div>
    </div>
  );
};
