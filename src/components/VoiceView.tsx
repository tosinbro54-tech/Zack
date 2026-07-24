/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VoiceProfile, Icp } from '../types';

interface VoiceViewProps {
  initialVoice: VoiceProfile;
  initialIcp: Icp;
  onSave: (voice: VoiceProfile, icp: Icp) => void;
}

export const VoiceView: React.FC<VoiceViewProps> = ({ initialVoice, initialIcp, onSave }) => {
  const [tone, setTone] = useState(initialVoice.tone);
  const [positioning, setPositioning] = useState(initialVoice.positioning);
  const [offer, setOffer] = useState(initialVoice.offer);
  const [samples, setSamples] = useState(initialVoice.sample_posts.join('\n---\n'));

  const [titles, setTitles] = useState(initialIcp.titles.join(', '));
  const [industries, setIndustries] = useState(initialIcp.industries.join(', '));
  const [locations, setLocations] = useState(initialIcp.locations.join(', '));
  const [keywords, setKeywords] = useState(initialIcp.keywords.join(', '));

  const [styleToggles, setStyleToggles] = useState({
    lb: true,
    hook: false,
    data: true,
    fp: true
  });

  const handleSave = () => {
    const updatedVoice: VoiceProfile = {
      tone,
      positioning,
      offer,
      sample_posts: samples.split('---').map(s => s.trim()).filter(Boolean)
    };

    const updatedIcp: Icp = {
      titles: titles.split(',').map(s => s.trim()).filter(Boolean),
      industries: industries.split(',').map(s => s.trim()).filter(Boolean),
      locations: locations.split(',').map(s => s.trim()).filter(Boolean),
      keywords: keywords.split(',').map(s => s.trim()).filter(Boolean)
    };

    onSave(updatedVoice, updatedIcp);
  };

  const handleToggle = (key: 'lb' | 'hook' | 'data' | 'fp') => {
    setStyleToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglesList = [
    { id: 'v-lb', key: 'lb' as const, label: 'Use line breaks liberally', value: styleToggles.lb },
    { id: 'v-hook', key: 'hook' as const, label: 'End with hook or question', value: styleToggles.hook },
    { id: 'v-data', key: 'data' as const, label: 'Include data / stats', value: styleToggles.data },
    { id: 'v-fp', key: 'fp' as const, label: 'First-person storytelling', value: styleToggles.fp }
  ];

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-lbl">Configuration</div>
          <h1 className="page-h">Voice profile</h1>
          <p className="page-sub">
            Train Zack's style fingerprint. The better this is, the more human-sounding your output.
          </p>
        </div>
      </div>

      <div className="grid2">
        <div className="flex flex-col gap-3.5">
          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">Tone descriptor</div>
            <textarea
              className="ta"
              rows={3}
              value={tone}
              onChange={e => setTone(e.target.value)}
              placeholder="e.g. Conversational, direct, data-driven. Never corporate-speak."
            ></textarea>
          </div>

          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">Your positioning</div>
            <textarea
              className="ta"
              rows={2}
              value={positioning}
              onChange={e => setPositioning(e.target.value)}
              placeholder="e.g. Fractional CMO who turns Series A startups into category leaders."
            ></textarea>
          </div>

          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">What you offer / who you serve</div>
            <textarea
              className="ta"
              rows={2}
              value={offer}
              onChange={e => setOffer(e.target.value)}
              placeholder="e.g. 90-day GTM sprints for B2B SaaS founders doing $1-5M ARR."
            ></textarea>
          </div>

          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">ICP — Titles</div>
            <input
              className="inp mb-2.5"
              value={titles}
              onChange={e => setTitles(e.target.value)}
              placeholder="e.g. VP Sales, Founder, Head of Growth"
            />
            <div className="text-xs font-semibold mb-1.5">Industries</div>
            <input
              className="inp mb-2.5"
              value={industries}
              onChange={e => setIndustries(e.target.value)}
              placeholder="e.g. B2B SaaS, Fintech"
            />
            <div className="text-xs font-semibold mb-1.5">Locations</div>
            <input
              className="inp mb-2.5"
              value={locations}
              onChange={e => setLocations(e.target.value)}
              placeholder="e.g. Nigeria, South Africa"
            />
            <div className="text-xs font-semibold mb-1.5">Keywords</div>
            <input
              className="inp"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. outreach, pipeline"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="card-e">
            <div className="text-xs font-semibold mb-2.5">Sample posts (separated by ---)</div>
            <textarea
              className="ta"
              rows={14}
              value={samples}
              onChange={e => setSamples(e.target.value)}
              placeholder="Paste your best-performing LinkedIn posts here…"
            ></textarea>
            <div className="text-[11px] text-[var(--txt3)] mt-1.5">
              More samples = better AI output quality.
            </div>
          </div>

          <div className="card-e">
            <div className="text-xs font-semibold mb-3">Style</div>
            {togglesList.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-[13px] mb-3">
                <span>{item.label}</span>
                <label className="tog" htmlFor={item.id}>
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={item.value}
                    onChange={() => handleToggle(item.key)}
                  />
                  <span className="tog-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-pri mt-4" onClick={handleSave}>
        Save voice profile
      </button>
    </div>
  );
};
