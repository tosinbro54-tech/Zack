/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DashboardStats {
  funnel: { comments: number; connects: number; dms: number; replies: number };
  bars: { label: string; value: number }[];
  recentActivity: { type: string; target: string; status: string; time: string }[];
}

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  stats: DashboardStats | null;
}

const TYPE_COLOR: Record<string, string> = { comment: 'badge-blue', connect: 'badge-amber', dm: 'badge-blue' };
const STATUS_COLOR: Record<string, string> = { done: 'badge-green', scheduled: 'badge-gray', approved: 'badge-amber', failed: 'badge-gray' };

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, stats }) => {
  const funnel = stats
    ? [
        { label: 'Comments', val: stats.funnel.comments, sub: 'last 7d', icon: '💬' },
        { label: 'Connects', val: stats.funnel.connects, sub: 'last 7d', icon: '👤' },
        { label: 'DMs sent', val: stats.funnel.dms, sub: 'last 7d', icon: '📤' },
        { label: 'Replies', val: stats.funnel.replies, sub: 'last 7d', icon: '📥' },
      ]
    : [];

  const bars = stats?.bars.map((b) => b.value) || [];
  const maxB = Math.max(1, ...bars);
  const days = stats?.bars.map((b) => b.label) || [];

  const quick = [
    { icon: '🧭', label: 'Find posts to engage', view: 'discover' },
    { icon: '✨', label: 'Write a new post', view: 'studio' },
    { icon: '📋', label: 'Review queue', view: 'queue' },
    { icon: '👥', label: 'View prospects', view: 'prospects' }
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

      {!stats ? (
        <div className="card-e mb-5 p-4 text-[13px] text-[var(--txt2)]">Loading your pipeline…</div>
      ) : (
        <>
          <div className="grid5 mb-[18px]">
            {funnel.map((s, i) => (
              <div className="metric-card" key={i}>
                <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.08em] text-[var(--txt2)] mb-2">
                  <span>{s.label}</span>
                  <span className="text-sm">{s.icon}</span>
                </div>
                <div className="font-display text-[28px] font-extrabold">{s.val}</div>
                <div className="text-[11px] text-[var(--txt2)] mt-[3px]">{s.sub}</div>
                {i > 0 && funnel[i - 1].val > 0 && (
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
                  <div className="bar" key={idx} style={{ height: `${Math.round((v / maxB) * 100)}%` }} title={`${v} actions`}></div>
                ))}
              </div>
              <div className="flex mt-1">
                {days.map((d, idx) => (
                  <div className="flex-1 text-center text-[9px] text-[var(--txt3)]" key={idx}>{d}</div>
                ))}
              </div>
            </div>

            <div className="card-e">
              <div className="text-[11px] text-[var(--txt2)] uppercase tracking-[0.08em] mb-3.5">Quick actions</div>
              {quick.map((q, idx) => (
                <div key={idx} onClick={() => onNavigate(q.view)} className="flex items-center gap-3 p-2.5 rounded-[9px] cursor-pointer border border-[var(--border)] mb-2 transition-all hover:border-[var(--pri)]">
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
                <tr><th>Action</th><th>Target</th><th>Status</th><th>Time</th></tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((a, idx) => (
                  <tr key={idx}>
                    <td><span className={`badge ${TYPE_COLOR[a.type] || 'badge-gray'}`}>{a.type}</span></td>
                    <td className="text-[var(--txt2)] text-xs max-w-[240px] truncate">{a.target}</td>
                    <td><span className={`badge ${STATUS_COLOR[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                    <td className="text-[var(--txt3)] text-[11px]">{timeAgo(a.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
