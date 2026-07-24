import crypto from 'node:crypto';
import { config } from '../config.js';
import { supabase } from '../db/supabaseClient.js';

const ALGO = 'aes-256-gcm';

function getKey() {
  const key = Buffer.from(config.sessionVaultKey, 'hex');
  if (key.length !== 32) {
    throw new Error('SESSION_VAULT_KEY must be a 32-byte hex string (64 hex chars).');
  }
  return key;
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store iv + tag + ciphertext together, base64
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payload) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** Store a new (or replacement) LinkedIn session for a user, encrypted. */
export async function saveSession(userId, { liAt, jsessionId, csrf, proxy }) {
  const { error } = await supabase.from('linkedin_sessions').upsert(
    {
      user_id: userId,
      li_at_encrypted: encrypt(liAt),
      jsessionid_encrypted: encrypt(jsessionId),
      csrf_encrypted: csrf ? encrypt(csrf) : null,
      proxy: proxy || null,
      status: 'unverified',
      consecutive_failures: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

/** Fetch and decrypt the session for use by the executor. Never log the return value. */
export async function getDecryptedSession(userId) {
  const { data, error } = await supabase
    .from('linkedin_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;

  return {
    id: data.id,
    liAt: decrypt(data.li_at_encrypted),
    jsessionId: decrypt(data.jsessionid_encrypted),
    csrf: data.csrf_encrypted ? decrypt(data.csrf_encrypted) : null,
    proxy: data.proxy,
    status: data.status,
    consecutiveFailures: data.consecutive_failures,
  };
}

export async function markSessionVerified(sessionId) {
  await supabase
    .from('linkedin_sessions')
    .update({ status: 'active', last_verified_at: new Date().toISOString(), consecutive_failures: 0 })
    .eq('id', sessionId);
}

/**
 * Record a failed action against this session. Implements the soft/hard
 * pause logic: 1 failure = soft (will retry), 2 in a row = hard pause.
 * A checkpoint/CAPTCHA signal always hard-pauses immediately regardless of count.
 */
export async function recordSessionFailure(sessionId, { checkpointDetected = false } = {}) {
  const { data } = await supabase
    .from('linkedin_sessions')
    .select('consecutive_failures')
    .eq('id', sessionId)
    .single();

  const nextCount = (data?.consecutive_failures || 0) + 1;
  const hardPause = checkpointDetected || nextCount >= 2;

  await supabase
    .from('linkedin_sessions')
    .update({
      consecutive_failures: nextCount,
      status: hardPause ? (checkpointDetected ? 'checkpoint' : 'expired') : 'active',
    })
    .eq('id', sessionId);

  return { hardPause };
}
