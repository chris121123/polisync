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

const invoke = async (fn, body) => {
  if (!supabase) return { error: { code: 'UNREACHABLE', message: 'No database client configured' } };
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) return { error: await readFailure(error) };
    if (data?.error?.code) return { error: { code: data.error.code, message: data.error.message } };
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
