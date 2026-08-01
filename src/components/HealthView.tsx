/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface HealthData {
  session: { status: string; lastVerifiedAt: string | null; consecutiveFailures: number };
  gauges: {
    comments: { used: number; cap: number };
    connects: { used: number; cap: number };
    dms: { used: number; cap: number };
    total: { used: number; cap: number };
  };
  warnings7d: number;
  risk: string;
  settings: { auto_approve_comments: boolean; auto_approve_connects: boolean; auto_approve_dms: boolean };
}

export const HealthView: React.FC = () => {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/stats/health').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key: string, value: boolean) => {
    if (!data) return;
    setSaving(key);
    const prevSettings = data.settings;
    setData({ ...data, settings: { ...data.settings, [key]: value } });
    try {
      await api.patch('/api/queue/settings', { [key]: value });
    } catch {
      setData({ ...data, settings: prevSettings });
    } finally {
      setSaving(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="page-top">
        <div>
          <div className="page-lbl">Safety</div>
          <h1 className="page-h">Account health</h1>
          <p className="page-sub">Loading…</p>
        </div>
      </div>
    );
  }

  const statusColor = data.session.status === 'active' ? 'var(--suc)' : data.session.status === 'checkpoint' ? 'var(--err)' : '#d9a441';
  const riskColor = data.risk === 'Low' ? 'var(--suc)' : data.risk === 'High' ? 'var(--err)' : '#d9a441';

  const gauges = [
    { label: 'Comments sent (24h)', used: data.gauges.comments.used, limit: data.gauges.comments.cap, color: 'var(--suc)' },
    { label: 'Connection requests (24h)', used: data.gauges.connects.used, limit: data.gauges.connects.cap, color: 'var(--suc)' },
    { label: 'DMs sent (24h)', used: data.gauges.dms.used, limit: data.gauges.dms.cap, color: 'var(--suc)' },
    { label: 'Total actions (24h)', used: data.gauges.total.used, limit: data.gauges.total.cap, color: 'var(--acc)' },
  ];

  const toggles = [
    { key: 'auto_approve_comments', label: 'Auto-approve comments', checked: data.settings.auto_approve_comments },
    { key: 'auto_approve_connects', label: 'Auto-approve connection requests', checked: data.settings.auto_approve_connects },
    { key: 'auto_approve_dms', label: 'Auto-send DMs without approval', checked: data.settings.auto_approve_dms },
  ];

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Safety</div>
          <h1 className="page-h">Account health</h1>
          <p className="page-sub">
            Real 24h rate limits from your action history. Zack auto-pauses on checkpoints or repeated failures.
          </p>
        </div>
      </div>

      <div className="grid3 mb-[18px]">
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Session status</div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor }}></div>
            <span className="font-display text-[18px] font-bold" style={{ color: statusColor }}>
              {data.session.status.charAt(0).toUpperCase() + data.session.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Failed actions (7d)</div>
          <div className="font-display text-[28px] font-extrabold" style={{ color: data.warnings7d > 0 ? 'var(--err)' : 'var(--suc)' }}>
            {data.warnings7d}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Account risk</div>
          <div className="font-display text-[28px] font-extrabold" style={{ color: riskColor }}>{data.risk}</div>
        </div>
      </div>

      <div className="card-e mb-4">
        <div className="text-xs font-semibold mb-3.5">Daily action limits (rolling 24h)</div>
        {gauges.map((g, idx) => (
          <div className="gauge-row" key={idx}>
            <div className="flex-1 text-[13px]">{g.label}</div>
            <div className="gauge-bar-w">
              <div
                className="gauge-bar"
                style={{ width: `${g.limit ? Math.min(100, Math.round((g.used / g.limit) * 100)) : 0}%`, background: g.color }}
              ></div>
            </div>
            <div className="w-10 text-right text-xs font-semibold" style={{ color: g.color }}>
              {g.used}/{g.limit}
            </div>
          </div>
        ))}
      </div>

      <div className="card-e">
        <div className="text-xs font-semibold mb-3.5">Approval settings</div>
        <div id="health-togs">
          {toggles.map(t => (
            <div className="flex items-center justify-between gap-3 text-[13px] mb-3.5" key={t.key}>
              <span>{t.label}{saving === t.key ? ' (saving…)' : ''}</span>
              <label className="tog" htmlFor={t.key}>
                <input
                  type="checkbox"
                  id={t.key}
                  checked={t.checked}
                  onChange={(e) => updateSetting(t.key, e.target.checked)}
                />
                <span className="tog-slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
