// The only AI module that talks to Supabase. Every call goes through an edge
// function; the provider key never reaches the browser (plan §5.0, D1).
import { supabase } from '../supabase.js';

// functions.invoke leaves `data` empty on non-2xx; the real reason is in error.context.
const readFailure = async (error) => {
  try {
    const body = await error?.context?.json?.();
    if (body?.error?.code) return { code: body.error.code, message: body.error.message || error.message };
  } catch {
    // non-JSON body: fall through to the transport message
  }
  return { code: 'UNREACHABLE', message: error?.message || 'The AI service could not be reached' };
};

const EXPIRED = { code: 'UNAUTHORIZED', message: 'Session expired — sign out and sign back in.' };
const SIGN_IN = { code: 'UNAUTHORIZED', message: 'Sign in required.' };

// The edge answers 401 when the access token has expired; one refresh + retry is enough.
const retryOnExpired = async (fn, body, retried) => {
  if (retried) return { error: EXPIRED };
  const { data } = await supabase.auth.getSession();
  if (!data?.session) return { error: SIGN_IN };
  const { error } = await supabase.auth.refreshSession();
  return error ? { error: EXPIRED } : invoke(fn, body, true);
};

const invoke = async (fn, body, retried = false) => {
  if (!supabase) return { error: { code: 'UNREACHABLE', message: 'No database client configured' } };
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    const failure = error ? await readFailure(error) : data?.error;
    if (failure?.code) {
      if (failure.code === 'UNAUTHORIZED' || error?.context?.status === 401) {
        return retryOnExpired(fn, body, retried);
      }
      return { error: { code: failure.code, message: failure.message } };
    }
    return { data };
  } catch (error) {
    return { error: { code: 'UNREACHABLE', message: error?.message || 'The AI service could not be reached' } };
  }
};

export const getAiConfig = () => invoke('ai-config', { action: 'get' });

export const saveAiConfig = (patch) => invoke('ai-config', { action: 'save', patch });

export const testAiConfig = () => invoke('ai-config', { action: 'test' });

export const listThreads = () => invoke('ai-assistant', { action: 'threads' });

export const getThreadMessages = (threadId) => invoke('ai-assistant', { action: 'messages', threadId });

export const sendAssistantMessage = ({ threadId, message, context }) => invoke('ai-assistant', {
  action: 'send',
  threadId: threadId ?? undefined,
  message,
  context,
});
