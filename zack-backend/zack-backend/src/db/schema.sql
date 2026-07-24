-- ============================================================
-- Zack.ai schema
-- Run this in Supabase SQL editor
-- ============================================================

-- One row per LinkedIn session (encrypted at rest, see sessionVault.js)
create table if not exists linkedin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  li_at_encrypted text not null,
  jsessionid_encrypted text not null,
  csrf_encrypted text,
  proxy text,
  status text not null default 'unverified' check (status in ('unverified','active','expired','checkpoint')),
  last_verified_at timestamptz,
  consecutive_failures int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- People/creators/ICPs being tracked
create table if not exists tracked_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_url text not null,
  full_name text,
  headline text,
  kind text not null check (kind in ('creator','icp_prospect')),
  -- posting cadence, computed from scanned history
  posts_per_week numeric,
  frequency_tier text check (frequency_tier in ('frequent','moderate','infrequent')),
  cadence_last_computed_at timestamptz,
  -- ICP fit
  icp_fit_score numeric,
  icp_fit_reason text,
  icp_profile_id uuid references icp_profiles(id),
  -- pipeline status
  status text not null default 'discovered' check (
    status in ('discovered','warming','ready_to_connect','connection_sent','connected','messaged','replied','connection_expired','dropped')
  ),
  comments_landed int not null default 0,
  comments_required int, -- set from tier at warm-up start
  connection_sent_at timestamptz,
  connection_expires_at timestamptz,
  source text, -- 'manual' | 'comment_mining' | 'discovery_suggestion'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, profile_url)
);

-- Multiple ICP definitions can run at once
create table if not exists icp_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  criteria jsonb not null, -- titles, industries, keywords, seniority etc.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Posts already evaluated/acted on — dedup by LinkedIn's post URN
create table if not exists seen_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_urn text not null,
  tracked_profile_id uuid references tracked_profiles(id),
  commented boolean not null default false,
  comment_mined boolean not null default false,
  seen_at timestamptz not null default now(),
  unique (user_id, post_urn)
);

-- The approval/action queue
create table if not exists action_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in ('comment','connect','dm','post','scan')),
  tracked_profile_id uuid references tracked_profiles(id),
  post_urn text,
  payload jsonb not null, -- drafted text, target, etc.
  status text not null default 'queued' check (
    status in ('queued','scheduled','approved','running','done','failed','skipped')
  ),
  requires_approval boolean not null default false,
  scheduled_at timestamptz, -- randomized execution time (jitter)
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

-- Daily counters per action type, used by the rate limiter
create table if not exists daily_action_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  count int not null default 0,
  window_start timestamptz not null, -- rolling 24h window start
  created_at timestamptz not null default now()
);

-- Global settings incl. approval toggle
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_approve_comments boolean not null default true,
  auto_approve_connects boolean not null default true,
  auto_approve_dms boolean not null default false,
  daily_caps jsonb not null default '{"comment":30,"connect":18,"dm":22,"scan_profile_views":180}',
  updated_at timestamptz not null default now()
);

-- Voice/ICP config, persisted (was useState before)
create table if not exists voice_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tone_notes text,
  sample_writing text,
  closer_persona_notes text,
  updated_at timestamptz not null default now()
);

-- Captures edits made to AI drafts (before/after) and thumbs up/down, used
-- to steer future drafts closer to the user's actual voice over time.
create table if not exists voice_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in ('comment','comment_reply','connect_note','dm')),
  ai_draft text not null,
  final_text text, -- null if only rated, not edited
  rating text check (rating in ('up','down')), -- optional standalone signal
  created_at timestamptz not null default now()
);

create index if not exists idx_voice_corrections_user_type on voice_corrections(user_id, action_type, created_at desc);

create index if not exists idx_tracked_profiles_status on tracked_profiles(user_id, status);
create index if not exists idx_action_queue_scheduled on action_queue(status, scheduled_at);
create index if not exists idx_seen_posts_urn on seen_posts(user_id, post_urn);
