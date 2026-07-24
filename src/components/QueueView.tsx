/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QueueItem } from '../types';

interface QueueViewProps {
  queueItems: QueueItem[];
  onApproveItem: (id: number) => void;
  onRejectItem: (id: number) => void;
  onApproveAll: () => void;
  onDiscardAll: () => void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  queueItems,
  onApproveItem,
  onRejectItem,
  onApproveAll,
  onDiscardAll
}) => {
  const [autoSchedule, setAutoSchedule] = useState(false);

  const activeItems = queueItems.filter(item => !item.dismissed);

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Approval</div>
          <h1 className="page-h">Approval queue</h1>
          <p className="page-sub font-sans">Every outbound action lands here first. Nothing sends without your say-so.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[var(--txt2)]">Auto-scheduler:</span>
          <label className="tog" htmlFor="auto-tog-cb">
            <input
              type="checkbox"
              id="auto-tog-cb"
              checked={autoSchedule}
              onChange={() => setAutoSchedule(prev => !prev)}
            />
            <span className="tog-slider"></span>
          </label>
        </div>
      </div>

      <div className="grid4 mb-5">
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Pending</div>
          <div className="font-display text-[28px] font-extrabold" id="q-count">{activeItems.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Sent today</div>
          <div className="font-display text-[28px] font-extrabold text-[var(--suc)]">12</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Daily limit</div>
          <div className="font-display text-[28px] font-extrabold">80</div>
        </div>
        <div className="metric-card">
          <div className="text-[10px] uppercase tracking-wider text-[var(--txt2)] mb-2">Remaining</div>
          <div className="font-display text-[28px] font-extrabold text-[var(--acc)]">68</div>
        </div>
      </div>

      <div className="flex gap-2.5 mb-4">
        <button className="btn btn-pri" onClick={onApproveAll}>✓ Approve all</button>
        <button className="btn btn-out" onClick={onDiscardAll}>✗ Discard all</button>
      </div>

      <div id="q-list">
        {activeItems.length === 0 ? (
          <div className="text-center py-10 text-[var(--txt3)] text-[13px]">
            Queue is empty. Generate comments in Discover to fill it.
          </div>
        ) : (
          activeItems.map(item => (
            <div className="q-item" id={`qi-${item.id}`} key={item.id}>
              <span className={`badge ${item.typeColor} shrink-0`}>{item.type}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{item.target}</div>
                <div className="text-xs text-[var(--txt2)] mt-0.5 truncate">{item.text}</div>
                <div className="flex gap-1.5 mt-2">
                  <button className="btn-sm btn-approve cursor-pointer" onClick={() => onApproveItem(item.id)}>✓ Send</button>
                  <button className="btn-sm btn-edit cursor-pointer" onClick={() => {}}>Edit</button>
                  <button className="btn-sm btn-reject cursor-pointer" onClick={() => onRejectItem(item.id)}>✗ Discard</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
