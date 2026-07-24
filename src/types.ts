/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VoiceProfile {
  tone: string;
  positioning: string;
  offer: string;
  sample_posts: string[];
}

export interface QueueItem {
  id: number;
  type: string;
  typeColor: string;
  target: string;
  text: string;
  dismissed: boolean;
}

export interface Prospect {
  id: number;
  name: string;
  hl: string;
  co: string;
  score: number;
  status: 'new' | 'queued' | 'connected' | 'messaged' | 'replied' | 'booked' | 'closed_won';
}

export interface Creator {
  id: number;
  slug: string;
  name: string;
  hl: string;
  posts_per_week: number;
  avg_reactions: number;
}

export interface Icp {
  titles: string[];
  industries: string[];
  locations: string[];
  keywords: string[];
}
