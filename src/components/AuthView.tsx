/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthViewProps {
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setError(null);
    setAuthMode(prev => prev === 'signin' ? 'signup' : 'signin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (signUpError) throw signUpError;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div id="auth">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="zlogo-mark">Z</div>
          zack.ai
        </div>
        <h1 className="auth-h">
          {authMode === 'signin' ? 'Operator sign in' : 'Create your account'}
        </h1>
        <p className="auth-sub">
          {authMode === 'signin' ? 'Resume autonomous prospecting.' : 'Onboard in 12 minutes.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-lg text-center font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {authMode === 'signup' && (
            <div className="fg" id="name-fg">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                className="inp"
                type="text"
                placeholder="Jane Operator"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="fg">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="inp"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="fg">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="inp"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-block" disabled={loading}>
            {loading ? 'Processing...' : (authMode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div className="auth-switch">
          <button
            onClick={handleToggle}
            className="text-[var(--pri)] cursor-pointer hover:underline border-none bg-transparent"
          >
            {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already an operator? Sign in'}
          </button>
        </div>
        <p className="auth-note">
          By continuing you accept the account-safe operating limits.
        </p>
      </div>
    </div>
  );
};
