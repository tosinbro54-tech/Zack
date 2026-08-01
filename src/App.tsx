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

import { NAV } from './data';
import { Creator, Icp, Prospect, QueueItem, VoiceProfile } from './types';
import { supabase } from './lib/supabase';
import { api } from './lib/api';

const DEFAULT_ICP: Icp = { titles: [], industries: [], locations: [], keywords: [] };

export default function App() {
  const [mainView, setMainView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [currentView, setCurrentView] = useState<string>('dashboard');

  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>({
    tone: 'Conversational, direct, data-driven. Never corporate-speak.',
    positioning: '',
    offer: '',
    sample_posts: []
  });

  const [icp, setIcp] = useState<Icp>(DEFAULT_ICP);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [trackedCreators, setTrackedCreators] = useState<Creator[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'err'; show: boolean }>({
    message: '',
    type: 'ok',
    show: false
  });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ message, type, show: true });
  };

  // Load real data once we're inside the app
  useEffect(() => {
    if (mainView !== 'app') return;

    api.get('/api/prospects').then((data) => {
      setProspects(data.filter((p: any) => p.kind === 'icp_prospect'));
      setTrackedCreators(data.filter((p: any) => p.kind === 'creator'));
    }).catch(() => showToast('Failed to load prospects', 'err'));

    api.get('/api/queue').then(setQueueItems).catch(() => showToast('Failed to load queue', 'err'));

    api.get('/api/stats/dashboard').then(setStats).catch(() => showToast('Failed to load stats', 'err'));

    api.get('/api/icp').then((data) => {
      if (data?.criteria) {
        setIcp({ ...DEFAULT_ICP, ...data.criteria });
      }
    }).catch(() => {});

    api.get('/api/voice/profile').then((data) => {
      if (data?.sample_writing || data?.tone_notes) {
        setVoiceProfile((prev) => ({
          ...prev,
          tone: data.tone_notes || prev.tone,
          sample_posts: data.sample_writing ? data.sample_writing.split('---') : prev.sample_posts,
        }));
      }
    }).catch(() => {});
  }, [mainView]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setMainView('app'); setCurrentView('dashboard'); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setMainView('landing');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLaunch = () => setMainView('auth');

  const handleAuthSuccess = () => {
    showToast('Welcome back, operator ✓', 'ok');
    setTimeout(() => { setMainView('app'); setCurrentView('dashboard'); }, 350);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMainView('landing');
    showToast('Signed out.', 'ok');
  };

  // Now hits the backend proxy - Gemini key never touches the browser.
  const handleCallGemini = async (sys: string, user: string): Promise<string> => {
    try {
      const data = await api.post('/api/ai/generate', { sys, user });
      return data.text || '';
    } catch (err) {
      showToast('AI request failed', 'err');
      throw err;
    }
  };

  const handleAddToQueue = async (type: string, target: string, text: string) => {
    try {
      const item = await api.post('/api/queue', {
        actionType: type.toLowerCase(),
        targetLabel: target,
        text,
      });
      setQueueItems(prev => [item, ...prev]);
      showToast('Added to approval queue ✓', 'ok');
    } catch {
      showToast('Failed to add to queue', 'err');
    }
  };

  const handleApproveItem = async (id: string | number) => {
    try {
      await api.post(`/api/queue/${id}/approve`);
      setQueueItems(prev => prev.map(item => item.id === id ? { ...item, dismissed: true } : item));
      showToast('Action sent ✓', 'ok');
    } catch {
      showToast('Failed to approve', 'err');
    }
  };

  const handleRejectItem = async (id: string | number) => {
    try {
      await api.post(`/api/queue/${id}/reject`);
      setQueueItems(prev => prev.map(item => item.id === id ? { ...item, dismissed: true } : item));
      showToast('Action discarded', 'ok');
    } catch {
      showToast('Failed to discard', 'err');
    }
  };

  const handleApproveAll = async () => {
    await Promise.all(queueItems.map(item => api.post(`/api/queue/${item.id}/approve`).catch(() => {})));
    setQueueItems(prev => prev.map(item => ({ ...item, dismissed: true })));
    showToast('All approved and queued ✓', 'ok');
  };

  const handleDiscardAll = async () => {
    await Promise.all(queueItems.map(item => api.post(`/api/queue/${item.id}/reject`).catch(() => {})));
    setQueueItems(prev => prev.map(item => ({ ...item, dismissed: true })));
    showToast('All discarded', 'ok');
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
        return <DashboardView onNavigate={setCurrentView} stats={stats} />;
      case 'voice':
        return (
          <VoiceView
            initialVoice={voiceProfile}
            initialIcp={icp}
            onSave={async (voice, updatedIcp) => {
              setVoiceProfile(voice);
              setIcp(updatedIcp);
              try {
                await api.put('/api/voice/profile', {
                  toneNotes: voice.tone,
                  sampleWriting: voice.sample_posts?.join('---'),
                });
                await api.put('/api/icp', { criteria: updatedIcp });
                showToast('Voice profile saved ✓', 'ok');
              } catch {
                showToast('Failed to save voice profile', 'err');
              }
            }}
          />
        );
      case 'linkedin':
        return <LinkedinView onVerify={() => showToast('LinkedIn session verified and active.', 'ok')} />;
      case 'discover':
        return (
          <DiscoverView
            trackedCreators={trackedCreators}
            onAddCreator={async (creator) => {
              try {
                const saved = await api.post('/api/prospects', {
                  profileUrl: creator.profileUrl || creator.name,
                  kind: 'creator',
                  fullName: creator.name,
                  headline: creator.hl,
                });
                setTrackedCreators(prev => [saved, ...prev]);
                showToast(`${creator.name} added ✓`, 'ok');
              } catch {
                showToast('Failed to add creator', 'err');
              }
            }}
            onRemoveCreator={async (id) => {
              try {
                await api.del(`/api/prospects/${id}`);
                setTrackedCreators(prev => prev.filter(c => c.id !== id));
                showToast('Creator removed', 'ok');
              } catch {
                showToast('Failed to remove creator', 'err');
              }
            }}
            onAddProspect={async (p) => {
              try {
                const saved = await api.post('/api/prospects', {
                  profileUrl: p.profileUrl || p.name,
                  kind: 'icp_prospect',
                  fullName: p.name,
                  headline: p.hl,
                });
                setProspects(prev => [saved, ...prev]);
                showToast(`${p.name} added to prospects ✓`, 'ok');
              } catch {
                showToast('Failed to add prospect', 'err');
              }
            }}
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
          />
        );
      case 'comments':
        return <CommentsView onAddToQueue={handleAddToQueue} callGemini={handleCallGemini} voicePrompt={retrieveVoicePrompt} />;
      case 'studio':
        return (
          <StudioView
            onAddToQueue={handleAddToQueue}
            callGemini={handleCallGemini}
            voicePrompt={retrieveVoicePrompt}
            generateImage={async (prompt: string) => {
              const data = await api.post('/api/ai/generate-image', { prompt });
              return data.dataUrl;
            }}
          />
        );
      case 'prospects':
        return (
          <ProspectsView
            prospects={prospects}
            icp={icp}
            onAddProspect={async (p) => {
              try {
                const saved = await api.post('/api/prospects', {
                  profileUrl: p.profileUrl || p.name,
                  kind: 'icp_prospect',
                  fullName: p.name,
                  headline: p.hl,
                });
                setProspects(prev => [saved, ...prev]);
                showToast(`${p.name} added ✓`, 'ok');
              } catch {
                showToast('Failed to add prospect', 'err');
              }
            }}
            onAddToQueue={handleAddToQueue}
            onUpdateProspectList={setProspects}
            callGemini={handleCallGemini}
          />
        );
      case 'outreach':
        return <OutreachView prospects={prospects} onAddToQueue={handleAddToQueue} callGemini={handleCallGemini} voicePrompt={retrieveVoicePrompt} />;
      case 'inbox':
        return <InboxView onAddToQueue={handleAddToQueue} callGemini={handleCallGemini} voicePrompt={retrieveVoicePrompt} />;
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
        return <HealthView />;
      default:
        return <DashboardView onNavigate={setCurrentView} stats={stats} />;
    }
  };

  if (mainView === 'landing') return <LandingView onLaunch={handleLaunch} />;
  if (mainView === 'auth') return <AuthView onSuccess={handleAuthSuccess} />;

  return (
    <div id="app">
      <div id="toast" className={`${toast.show ? 'show' : ''} ${toast.type}`}>{toast.message}</div>

      <aside className="sidebar">
        <div className="sb-head">
          <div className="zlogo-mark" style={{ width: 28, height: 28, fontSize: 11 }}>Z</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>zack.ai</span>
        </div>
        <nav className="sb-nav">
          {NAV.map(n => (
            <div key={n.id} className={`sb-item ${currentView === n.id ? 'active' : ''}`} onClick={() => setCurrentView(n.id)}>
              <span className="text-[15px]">{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="sb-user">operator@example.com</div>
          <button className="sb-signout" onClick={handleSignOut}>
            <span>↩</span><span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="li-warn hidden">
          <span>⚠</span>
          <span>LinkedIn session expired. Actions will fail until you reconnect.</span>
          <button onClick={() => setCurrentView('linkedin')}>Reconnect</button>
        </div>
        <div className="page" id="page-content">{renderActiveView()}</div>
      </main>
    </div>
  );
}
