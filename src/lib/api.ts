import { supabase } from './supabase';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL as string || '';

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    return res.json();
  },

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
};
