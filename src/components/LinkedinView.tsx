/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface LinkedinViewProps {
  onVerify: () => void;
}

export const LinkedinView: React.FC<LinkedinViewProps> = ({ onVerify }) => {
  const [liAt, setLiAt] = useState('');
  const [jsessionId, setJsessionId] = useState('');
  const [csrf, setCsrf] = useState('');
  const [proxy, setProxy] = useState('');
  
  const [status, setStatus] = useState<'unverified' | 'active' | 'checkpoint' | 'expired'>('unverified');
  const [lastVerified, setLastVerified] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.get('/api/linkedin/session/status');
        if (data) {
          setStatus(data.status || 'unverified');
          if (data.last_verified_at) {
            setLastVerified(new Date(data.last_verified_at).toLocaleString());
          }
        }
      } catch (err: any) {
        console.error('Failed to load session status:', err);
        setError('Could not load session status — see below for details.');
      }
    };
    fetchStatus();
  }, []);

  const handleClear = () => {
    setLiAt('');
    setJsessionId('');
    setCsrf('');
    setProxy('');
    setError(null);
  };

  const handleVerify = async () => {
    if (!liAt.trim() || !jsessionId.trim()) {
      setError('Both li_at and JSESSIONID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Save session
      await api.post('/api/linkedin/session', {
        liAt: liAt.trim(),
        jsessionId: jsessionId.trim(),
        csrf: csrf.trim() || undefined,
        proxy: proxy.trim() || undefined,
      });

      // 2. Verify session
      const verifyResult = await api.post('/api/linkedin/session/verify');

      if (verifyResult.ok && verifyResult.status === 'active') {
        setStatus('active');
        setLastVerified(new Date().toLocaleString());
        onVerify();
      } else {
        const failStatus = verifyResult.status || 'expired';
        setStatus(failStatus);
        setError(`Verification failed: Session status is "${failStatus}"`);
      }
    } catch (err: any) {
      setError(err.message || 'Verification process failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return {
          dotColor: 'bg-[var(--suc)]',
          textColor: 'text-[var(--suc)]',
          label: 'Session active',
        };
      case 'checkpoint':
        return {
          dotColor: 'bg-amber-500',
          textColor: 'text-amber-500',
          label: 'Checkpoint triggered',
        };
      case 'expired':
        return {
          dotColor: 'bg-[var(--dan)]',
          textColor: 'text-[var(--dan)]',
          label: 'Session expired',
        };
      default:
        return {
          dotColor: 'bg-neutral-600',
          textColor: 'text-[var(--txt3)]',
          label: 'Not connected',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Connection</div>
          <h1 className="page-h">LinkedIn session</h1>
          <p className="page-sub">
            Paste your session cookies. Zack encrypts them — no password required.
          </p>
        </div>
      </div>

      <div className="max-w-[560px] flex flex-col gap-3.5">
        <div className="card-e">
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${statusDisplay.dotColor}`}></div>
            <span className={`text-[13px] font-semibold ${statusDisplay.textColor}`}>
              {statusDisplay.label}
            </span>
            {lastVerified && (
              <span className="ml-auto text-[11px] text-[var(--txt3)]">
                Last verified {lastVerified}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-lg font-mono">
              {error}
            </div>
          )}

          <div className="fg">
            <label htmlFor="li-at">li_at cookie <span className="text-[var(--dan)]">*</span></label>
            <input
              id="li-at"
              className="inp"
              type="password"
              placeholder="AQEFABoA…"
              value={liAt}
              onChange={e => setLiAt(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label htmlFor="li-js">JSESSIONID <span className="text-[var(--dan)]">*</span></label>
            <input
              id="li-js"
              className="inp"
              type="password"
              placeholder='"ajax:123…"'
              value={jsessionId}
              onChange={e => setJsessionId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label htmlFor="li-csrf">CSRF token (optional)</label>
            <input
              id="li-csrf"
              className="inp"
              placeholder="ajax:123…"
              value={csrf}
              onChange={e => setCsrf(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label htmlFor="li-proxy">Proxy URL (optional)</label>
            <input
              id="li-proxy"
              className="inp"
              placeholder="https://user:pass@host:port"
              value={proxy}
              onChange={e => setProxy(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2.5 mt-1">
            <button className="btn btn-out text-xs" onClick={handleClear} disabled={loading}>
              Clear
            </button>
            <button className="btn btn-pri text-xs" onClick={handleVerify} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify session'}
            </button>
          </div>
        </div>

        <div className="card-e">
          <div className="text-xs font-semibold mb-3">How to get your cookies</div>
          <ol className="text-xs text-[var(--txt2)] leading-[2] list-decimal pl-4">
            <li>Open LinkedIn in Chrome and sign in</li>
            <li>Press F12 → Application → Cookies → www.linkedin.com</li>
            <li>Find <code className="bg-[var(--bg3)] px-1.5 py-0.5 rounded">li_at</code> and copy its Value</li>
            <li>Find <code className="bg-[var(--bg3)] px-1.5 py-0.5 rounded">JSESSIONID</code> and copy its Value (including quotes)</li>
            <li>Paste both above and click Verify session</li>
          </ol>
          <p className="mt-3 text-[11px] text-[var(--txt3)] leading-relaxed">
            ⚠ Cookies grant access to your account. Encrypted at rest, used only for actions you approve within daily limits.
          </p>
        </div>
      </div>
    </div>
  );
};
