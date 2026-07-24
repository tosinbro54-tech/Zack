/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TICKERS, MODULES, STEPS, SAFETY_PTS } from '../data';

interface LandingViewProps {
  onLaunch: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onLaunch }) => {
  const tickerItems = [...TICKERS, ...TICKERS, ...TICKERS];

  return (
    <div id="landing">
      <header className="land-header">
        <div className="zlogo">
          <div className="zlogo-mark">Z</div>
          <span className="zlogo-text">zack.ai</span>
        </div>
        <nav className="land-nav hidden md:flex">
          <a href="#modules-s">Modules</a>
          <a href="#how-s">How it works</a>
          <a href="#safety-s">Safety</a>
        </nav>
        <button className="btn btn-pri" onClick={onLaunch}>
          Launch operator →
        </button>
      </header>

      <section className="hero">
        <div className="live-badge">
          <div className="dot-pulse"></div>
          LIVE · onboarding 27 operators this week
        </div>
        <h1 className="hero-h">
          Imagine never hunting<br />
          <span className="grad-txt">for leads on LinkedIn</span><br />
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--acc)' }}>ever again.</span>
        </h1>
        <p className="hero-sub">
          Zack is your <strong>autonomous AI networking &amp; prospecting agent</strong> — it finds the exact founders, buyers, and partners you serve, revives dormant connections, writes posts in your voice, and opens every conversation while you sleep.
        </p>
        <div className="hero-ctas">
          <button className="btn btn-pri btn-lg" onClick={onLaunch}>
            Start using Zack now →
          </button>
          <button
            className="btn btn-out btn-lg"
            onClick={() => document.getElementById('how-s')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See how it works
          </button>
        </div>
        <div className="trust">
          <span><span className="ck">✓</span> No password handoff — account-safe</span>
          <span><span className="ck">✓</span> Human-mimic behaviour, not a spam bot</span>
          <span><span className="ck">✓</span> Setup in 12 minutes</span>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-inner" id="ticker">
          {tickerItems.map((t, idx) => (
            <div key={idx} className="tick-item">
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--pri)', display: 'inline-block' }}></span>
              {t}
            </div>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-val grad-txt">12×</div>
          <div className="stat-lbl">more conversations started</div>
        </div>
        <div className="stat-box">
          <div className="stat-val grad-txt">37 hrs</div>
          <div className="stat-lbl">of prospecting saved/month</div>
        </div>
        <div className="stat-box">
          <div className="stat-val grad-txt">$0</div>
          <div className="stat-lbl">ad spend required</div>
        </div>
        <div className="stat-box">
          <div className="stat-val grad-txt">9.4/10</div>
          <div className="stat-lbl">operator satisfaction</div>
        </div>
      </div>

      <section className="land-section" id="modules-s">
        <div className="sec-lbl">The tribe</div>
        <h2 className="sec-h">One operator. <span className="grad-txt">A workforce of agents.</span></h2>
        <p className="sec-sub">Scout finds them. Strategist scores them. Copywriter opens them. Closer books them.</p>
        <div className="modules-grid" id="modules-grid">
          {MODULES.map((m, idx) => (
            <div className="mod-card" key={idx}>
              <div className="mod-icon">{m.icon}</div>
              <div className="mod-title">{m.t}</div>
              <p className="mod-desc">{m.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" id="how-s" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="sec-lbl">12-minute setup</div>
        <h2 className="sec-h">From zero to autonomous in <span style={{ color: 'var(--pri)' }}>four steps.</span></h2>
        <div className="steps-grid" id="steps-grid">
          {STEPS.map((s, idx) => (
            <div className="step-card" key={idx}>
              <div className="step-n">{s.n}</div>
              <div className="step-title">{s.t}</div>
              <p className="step-desc">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="safety-grid" id="safety-s">
        <div>
          <div className="sec-lbl">Account-safe by design</div>
          <h2 className="sec-h">Looks like <span className="grad-txt">a real human operator.</span></h2>
          <p style={{ color: 'var(--txt2)', marginTop: 16, lineHeight: 1.7, fontSize: 14 }}>
            Zack uses the same Voyager endpoints your LinkedIn tab uses — throttled to human cadence, with approval gates and a live rate-limit gauge.
          </p>
        </div>
        <div className="safety-list" id="safety-list">
          {SAFETY_PTS.map((p, idx) => (
            <div className="safety-item" key={idx}>
              <span className="ck">✓</span>
              <span style={{ fontSize: 13 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="final-cta">
        <h2 style={{ fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>
          Stop hunting. <span className="grad-txt">Start closing.</span>
        </h2>
        <p style={{ color: 'var(--txt2)', marginTop: 14, fontSize: 15 }}>
          12 minutes to set up. Your first 5 scored leads waiting before lunch.
        </p>
        <button className="btn btn-pri btn-lg" style={{ marginTop: 30 }} onClick={onLaunch}>
          Launch your operator →
        </button>
      </div>

      <footer className="land-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="zlogo-mark" style={{ width: 24, height: 24, fontSize: 10 }}>Z</div>
          <strong style={{ color: 'var(--txt)' }}>zack.ai</strong>
        </div>
        <div>© 2026 — Built for operators who close.</div>
      </footer>
    </div>
  );
};
