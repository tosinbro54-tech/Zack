/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HealthViewProps {
  onUpdateSetting: () => void;
}

export const HealthView: React.FC<HealthViewProps> = ({ onUpdateSetting }) => {
  const gauges = [
    { label: 'Connection requests (today)', used: 8, limit: 20, color: 'var(--suc)' },
    { label: 'Comments sent (today)', used: 12, limit: 25, color: 'var(--suc)' },
    { label: 'DMs sent (today)', used: 5, limit: 30, color: 'var(--suc)' },
    { label: 'Profile views (today)', used: 23, limit: 50, color: 'var(--acc)' },
    { label: 'Total actions (today)', used: 48, limit: 80, color: 'var(--acc)' }
  ];

  const safetySettings = [
    { id: 'ht1', label: 'Pause-on-warning (auto-pause if LinkedIn flags)', def: true },
    { id: 'ht2', label: 'Require manual approval for all DMs', def: true },
    { id: 'ht3', label: 'Randomise send timing (±12 min window)', def: true },
    { id: 'ht4', label: 'Send daily activity report to email', def: false }
  ];

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Safety</div>
          <h1 className="page-h">Account health</h1>
          <p className="page-sub">
            Real-time rate limits and safety status. Zack auto-pauses if any ceiling is breached.
          </p>
        </div>
      </div>

      <div className="grid3 mb-[18px]">
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Session status</div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--suc)]"></div>
            <span className="font-display text-[18px] font-bold text-[var(--suc)]">Active</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Warnings (7d)</div>
          <div className="font-display text-[28px] font-extrabold text-[var(--suc)]">0</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Account risk</div>
          <div className="font-display text-[28px] font-extrabold text-[var(--suc)]">Low</div>
        </div>
      </div>

      <div className="card-e mb-4">
        <div className="text-xs font-semibold mb-3.5">Daily action limits</div>
        {gauges.map((g, idx) => (
          <div className="gauge-row" key={idx}>
            <div className="flex-1 text-[13px]">{g.label}</div>
            <div className="gauge-bar-w">
              <div
                className="gauge-bar"
                style={{ width: `${Math.round((g.used / g.limit) * 100)}%`, background: g.color }}
              ></div>
            </div>
            <div className="w-10 text-right text-xs font-semibold" style={{ color: g.color }}>
              {g.used}/{g.limit}
            </div>
          </div>
        ))}
      </div>

      <div className="card-e">
        <div className="text-xs font-semibold mb-3.5">Safety settings</div>
        <div id="health-togs">
          {safetySettings.map(s => (
            <div className="flex items-center justify-between gap-3 text-[13px] mb-3.5" key={s.id}>
              <span>{s.label}</span>
              <label className="tog" htmlFor={s.id}>
                <input
                  type="checkbox"
                  id={s.id}
                  defaultChecked={s.def}
                  onChange={onUpdateSetting}
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
