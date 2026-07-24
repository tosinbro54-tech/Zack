/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LandingView } from './components/LandingView';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { VoiceView } from './components/VoiceView';
import { LinkedinView } from './components/LinkedinView';
import { DiscoverView } from './components/DiscoverView';
import { CommentsView } from './components/CommentsView';
import { StudioView } from './components/StudioView';
import { ProspectsView } from './components/ProspectsView';
import { OutreachView } from './components/OutreachView';
import { InboxView } from './components/InboxView';
import { QueueView } from './components/QueueView';
import { HealthView } from './components/HealthView';

import {
  INITIAL_QUEUE_ITEMS,
  INITIAL_PROSPECTS,
  INITIAL_CREATORS,
  INITIAL_ICP,
  NAV
} from './data';
import { Creator, Icp, Prospect, QueueItem, VoiceProfile } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  // Navigation views
  const [mainView, setMainView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [userEmail, setUserEmail] = useState('operator@example.com');

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setMainView('app');
        setUserEmail(session.user?.email || 'operator@example.com');
      } else {
        setMainView('landing');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setMainView('app');
        setUserEmail(session.user?.email || 'operator@example.com');
      } else {
        setMainView('landing');
        setUserEmail('operator@example.com');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Shared application states
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return ((import.meta as any).env?.VITE_GEMINI_API_KEY || '') as string;
  });
  
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>({
    tone: 'Conversational, direct, data-driven. Never corporate-speak.',
    positioning: '',
    offer: '',
    sample_posts: []
  });

  const [icp, setIcp] = useState<Icp>(INITIAL_ICP);
  const [queueItems, setQueueItems] = useState<QueueItem[]>(INITIAL_QUEUE_ITEMS);
  const [prospects, setProspects] = useState<Prospect[]>(INITIAL_PROSPECTS);
  const [trackedCreators, setTrackedCreators] = useState<Creator[]>(INITIAL_CREATORS);

  // Floating notifications
  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'err'; show: boolean }>({
    message: '',
    type: 'ok',
    show: false
  });

  // Key selector popup
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Auto-clear notification toast after delay time
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ message, type, show: true });
  };

  const handleLaunch = () => {
    setMainView('auth');
  };

  const handleAuthSuccess = () => {
    showToast('Welcome back, operator ✓', 'ok');
    setTimeout(() => {
      setMainView('app');
      setCurrentView('dashboard');
    }, 350);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMainView('landing');
    showToast('Signed out.', 'ok');
  };

  const handleApiKeySave = (key: string) => {
    if (key.trim()) {
      setGeminiKey(key.trim());
      showToast('Gemini API key saved ✓ — AI generation enabled', 'ok');
      setShowKeyModal(false);
    }
  };

  // Add Comment/DM drafts to the primary review list queue
  const handleAddToQueue = (type: string, target: string, text: string) => {
    const newItem: QueueItem = {
      id: Date.now(),
      type,
      typeColor: type === 'Comment' ? 'badge-blue' : 'badge-amber',
      target,
      text,
      dismissed: false
    };
    setQueueItems(prev => [newItem, ...prev]);
    showToast('Added to approval queue ✓', 'ok');
  };

  const handleApproveItem = (id: number) => {
    setQueueItems(prev => prev.map(item => item.id === id ? { ...item, dismissed: true } : item));
    showToast('Action sent ✓', 'ok');
  };

  const handleRejectItem = (id: number) => {
    setQueueItems(prev => prev.map(item => item.id === id ? { ...item, dismissed: true } : item));
    showToast('Action discarded', 'ok');
  };

  const handleApproveAll = () => {
    setQueueItems(prev => prev.map(item => ({ ...item, dismissed: true })));
    showToast('All approved and queued ✓', 'ok');
  };

  const handleDiscardAll = () => {
    setQueueItems(prev => prev.map(item => ({ ...item, dismissed: true })));
    showToast('All discarded', 'ok');
  };

  // callGemini utility utilizing direct models.generateContent compatibility standard
  const handleCallGemini = async (sys: string, user: string): Promise<string> => {
    if (!geminiKey) {
      showToast('Add your Gemini API key — click "Add key" on dashboard', 'err');
      throw new Error('No Gemini API key.');
    }

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      showToast('Gemini API request failed', 'err');
      throw new Error(`Gemini ${res.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  };

  const retrieveVoicePrompt = () => {
    return [
      "You write LinkedIn content in the OPERATOR'S voice. Match their style exactly.",
      `TONE: ${voiceProfile.tone || 'Conversational, direct, data-driven. No corporate-speak.'}`,
      voiceProfile.positioning ? `POSITIONING: ${voiceProfile.positioning}` : '',
      voiceProfile.offer ? `OFFER: ${voiceProfile.offer}` : '',
      voiceProfile.sample_posts?.length ? `WRITING SAMPLES:\n${voiceProfile.sample_posts.slice(0, 3).join('\n---\n')}` : '',
      'RULES: No jargon. No "I hope this finds you well". No "synergy". Max 3 hashtags. Sound like a human typing fast.'
    ].filter(Boolean).join('\n');
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={setCurrentView}
            onShowKeyModal={() => {
              setTempApiKey(geminiKey);
              setShowKeyModal(true);
            }}
          />
        );
      case 'voice':
        return (
          <VoiceView
            initialVoice={voiceProfile}
            initialIcp={icp}
            onSave={(voice, updatedIcp) => {
              setVoiceProfile(voice);
              setIcp(updatedIcp);
              showToast('Voice profile saved ✓', 'ok');
            }}
          />
        );
      case 'linkedin':
        return (
          <LinkedinView
            onVerify={() => showToast('Session verified ✓ — ready to operate.', 'ok')}
          />
        );
      case 'discover':
        return (
          <DiscoverView
            trackedCreators={trackedCreators}
            onAddCreator={creator => {
              setTrackedCreators(prev => [creator, ...prev]);
              showToast(`${creator.name} added ✓`, 'ok');
            }}
            onRemoveCreator={id => {
              const item = trackedCreators.find(c => c.id === id);
              setTrackedCreators(prev => prev.filter(c => c.id !== id));
              showToast(`${item?.name || 'Creator'} removed`, 'ok');
            }}
            onAddProspect={p => {
              setProspects(prev => [p, ...prev]);
              showToast(`${p.name} added to prospects ✓`, 'ok');
            }}
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
          />
        );
      case 'comments':
        return (
          <CommentsView
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
          />
        );
      case 'studio':
        return (
          <StudioView
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
            geminiKey={geminiKey}
          />
        );
      case 'prospects':
        return (
          <ProspectsView
            prospects={prospects}
            icp={icp}
            onAddProspect={p => {
              setProspects(prev => [p, ...prev]);
              showToast(`${p.name} added ✓`, 'ok');
            }}
            onAddToQueue={handleAddToQueue}
            onUpdateProspectList={setProspects}
            callGemini={handleCallGemini}
          />
        );
      case 'outreach':
        return (
          <OutreachView
            prospects={prospects}
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
          />
        );
      case 'inbox':
        return (
          <InboxView
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
          />
        );
      case 'queue':
        return (
          <QueueView
            queueItems={queueItems}
            onApproveItem={handleApproveItem}
            onRejectItem={handleRejectItem}
            onApproveAll={handleApproveAll}
            onDiscardAll={handleDiscardAll}
          />
        );
      case 'health':
        return (
          <HealthView
            onUpdateSetting={() => showToast('Setting updated ✓', 'ok')}
          />
        );
      default:
        return (
          <DashboardView
            onNavigate={setCurrentView}
            onShowKeyModal={() => setShowKeyModal(true)}
          />
        );
    }
  };

  if (mainView === 'landing') {
    return <LandingView onLaunch={handleLaunch} />;
  }

  if (mainView === 'auth') {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  return (
    <div id="app">
      {/* Toast Notice */}
      <div id="toast" className={`${toast.show ? 'show' : ''} ${toast.type}`}>
        {toast.message}
      </div>

      <aside className="sidebar">
        <div className="sb-head">
          <div className="zlogo-mark" style={{ width: 28, height: 28, fontSize: 11 }}>Z</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>zack.ai</span>
        </div>
        <nav className="sb-nav">
          {NAV.map(n => (
            <div
              key={n.id}
              className={`sb-item ${currentView === n.id ? 'active' : ''}`}
              onClick={() => setCurrentView(n.id)}
            >
              <span className="text-[15px]">{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="sb-user">{userEmail}</div>
          <button className="sb-signout" onClick={handleSignOut}>
            <span>↩</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main">
        {/* Expired alert warning */}
        <div className="li-warn hidden">
          <span>⚠</span>
          <span>LinkedIn session expired. Actions will fail until you reconnect.</span>
          <button onClick={() => setCurrentView('linkedin')}>Reconnect</button>
        </div>

        <div className="page" id="page-content">
          {renderActiveView()}
        </div>
      </main>

      {/* API Key Modal Form */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/75 z-[9998] flex items-center justify-center p-4">
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-16 p-8 w-full max-w-[460px]">
            <h3 className="font-display font-bold text-lg mb-2">Add Gemini API key</h3>
            <p className="text-xs text-[var(--txt2)] mb-4 leading-relaxed">
              Get your free key at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--pri)] hover:underline">
                aistudio.google.com/app/apikey
              </a>. Stays in your browser only.
            </p>
            <input
              className="inp mb-3"
              type="password"
              placeholder="AIza..."
              value={tempApiKey}
              onChange={e => setTempApiKey(e.target.value)}
            />
            <div className="flex gap-2.5">
              <button
                className="btn btn-pri flex-grow"
                onClick={() => handleApiKeySave(tempApiKey)}
              >
                Save key
              </button>
              <button
                className="btn btn-out"
                onClick={() => setShowKeyModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
