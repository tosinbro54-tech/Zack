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

  const [scanUrl, setScanUrl] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ headline?: string; about?: string } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

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

  const handleScanTest = async () => {
    if (!scanUrl.trim()) {
      setScanError('Paste a LinkedIn profile URL first');
      return;
    }
    setScanLoading(true);
    setScanError(null);
    setScanResult(null);
    try {
      const result = await api.post('/api/prospects/scan-profile', { profileUrl: scanUrl.trim() });
      setScanResult(result);
    } catch (err: any) {
      setScanError(err.message || 'Scan failed');
    } finally {
      setScanLoading(false);
    }
  };

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
      <div className="page-top" id="linkedin-page-top">
        <div>
          <div className="page-lbl" id="linkedin-page-label">Connection</div>
          <h1 className="page-h" id="linkedin-page-heading">LinkedIn session</h1>
          <p className="page-sub" id="linkedin-page-sub">
            Paste your session cookies. Zack encrypts them — no password required.
          </p>
        </div>
      </div>

      <div className="max-w-[560px] flex flex-col gap-3.5" id="linkedin-view-container">
        <div className="card-e" id="linkedin-session-card">
          <div className="flex items-center gap-2.5 mb-4" id="linkedin-status-indicator">
            <div className={`w-2.5 h-2.5 rounded-full ${statusDisplay.dotColor}`} id="linkedin-status-dot"></div>
            <span className={`text-[13px] font-semibold ${statusDisplay.textColor}`} id="linkedin-status-text">
              {statusDisplay.label}
            </span>
            {lastVerified && (
              <span className="ml-auto text-[11px] text-[var(--txt3)]" id="linkedin-last-verified">
                Last verified {lastVerified}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-lg font-mono" id="linkedin-error-message">
              {error}
            </div>
          )}

          <div className="fg" id="li-at-group">
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

          <div className="fg" id="li-js-group">
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

          <div className="fg" id="li-csrf-group">
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

          <div className="fg" id="li-proxy-group">
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

          <div className="flex gap-2.5 mt-1" id="linkedin-action-buttons">
            <button className="btn btn-out text-xs" id="btn-clear-linkedin" onClick={handleClear} disabled={loading}>
              Clear
            </button>
            <button className="btn btn-pri text-xs" id="btn-verify-linkedin" onClick={handleVerify} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify session'}
            </button>
          </div>
        </div>

        <div className="card-e" id="linkedin-help-card">
          <div className="text-xs font-semibold mb-3" id="help-heading">How to get your cookies</div>
          <ol className="text-xs text-[var(--txt2)] leading-[2] list-decimal pl-4" id="help-steps-list">
            <li id="step-1">Open LinkedIn in Chrome and sign in</li>
            <li id="step-2">Press F12 → Application → Cookies → www.linkedin.com</li>
            <li id="step-3">Find <code className="bg-[var(--bg3)] px-1.5 py-0.5 rounded">li_at</code> and copy its Value</li>
            <li id="step-4">Find <code className="bg-[var(--bg3)] px-1.5 py-0.5 rounded">JSESSIONID</code> and copy its Value (including quotes)</li>
            <li id="step-5">Paste both above and click Verify session</li>
          </ol>
          <p className="mt-3 text-[11px] text-[var(--txt3)] leading-relaxed" id="security-disclaimer">
            ⚠ Cookies grant access to your account. Encrypted at rest, used only for actions you approve within daily limits.
          </p>
        </div>

        <div className="card-e" id="linkedin-test-card">
          <div className="text-xs font-semibold mb-3" id="test-heading">Test profile scan</div>
          <p className="text-[11px] text-[var(--txt3)] mb-3" id="test-desc">
            Paste a LinkedIn profile URL to test the headline/about scraper against a live profile.
          </p>
          <div className="fg" id="test-url-group">
            <input
              id="scan-url-input"
              className="inp"
              placeholder="https://www.linkedin.com/in/someone/"
              value={scanUrl}
              onChange={e => setScanUrl(e.target.value)}
              disabled={scanLoading}
            />
          </div>
          <button className="btn btn-pri text-xs" id="btn-run-scan-test" onClick={handleScanTest} disabled={scanLoading}>
            {scanLoading ? 'Scanning...' : 'Run test scan'}
          </button>

          {scanError && (
            <div className="mt-3 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-lg font-mono" id="scan-error-message">
              {scanError}
            </div>
          )}

          {scanResult && (
            <div className="mt-3 p-3 bg-[var(--bg3)] text-xs rounded-lg" id="scan-result-container">
              <div className="font-semibold mb-1" id="scan-result-headline-title">Headline</div>
              <div className="mb-3 text-[var(--txt2)]" id="scan-result-headline-value">{scanResult.headline || '(empty)'}</div>
              <div className="font-semibold mb-1" id="scan-result-about-title">About</div>
              <div className="text-[var(--txt2)] whitespace-pre-wrap" id="scan-result-about-value">{scanResult.about || '(empty)'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
