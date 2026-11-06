// The only AI module that talks to Supabase. Every call goes through an edge
// function; the provider key never reaches the browser (plan §5.0, D1).
import { supabase } from '../supabase.js';

// functions.invoke leaves `data` empty on non-2xx; the real reason is in error.context.
const readFailure = async (error) => {
  try {
    const body = await error?.context?.json?.();
    if (body?.error?.code) {
      return { code: body.error.code, message: body.error.message || error.message, errors: body.error.errors };
    }
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
      return { error: { code: failure.code, message: failure.message, errors: failure.errors } };
    }
    return { data };
  } catch (error) {
    return { error: { code: 'UNREACHABLE', message: error?.message || 'The AI service could not be reached' } };
  }
};

export const getAiConfig = () => invoke('ai-config', { action: 'get' });

export const saveAiConfig = (patch) => invoke('ai-config', { action: 'save', patch });

export const testAiConfig = () => invoke('ai-config', { action: 'test' });

// Server-side model list for the selected provider; the browser never calls one.
export const listProviderModels = ({ preset, baseUrl }) => invoke('ai-config', { action: 'models', preset, baseUrl });

// Planner: a proposal is previewed first; applying needs the single-use token it returned.
export const proposeAiPlan = (body) => invoke('ai-plan', { action: 'propose', ...body });

export const commitAiPlan = ({ jobId, confirmToken }) => invoke('ai-plan', { action: 'commit', jobId, confirmToken });

export const listThreads = () => invoke('ai-assistant', { action: 'threads' });

export const getThreadMessages = (threadId) => invoke('ai-assistant', { action: 'messages', threadId });

export const sendAssistantMessage = ({ threadId, message, context }) => invoke('ai-assistant', {
  action: 'send',
  threadId: threadId ?? undefined,
  message,
  context,
});

// Import pipeline (plan §5.3). Excel rows are parsed in the browser and arrive as
// plain objects; a photo is read from the `requirements` bucket after consent.
export const stageImportExcel = ({ fileName, rows }) => invoke('ai-import', { action: 'stage-excel', fileName, rows });

export const extractImportImage = ({ filePath, consent }) => invoke('ai-import', { action: 'extract-image', filePath, consent });

export const resolveImportBatch = (batchId) => invoke('ai-import', { action: 'resolve', batchId });

export const validateImportBatch = (batchId) => invoke('ai-import', { action: 'validate', batchId });

export const applyImportBatch = ({ batchId, confirmToken }) => invoke('ai-import', { action: 'apply', batchId, confirmToken });

export const discardImportBatch = (batchId) => invoke('ai-import', { action: 'discard', batchId });

// Reports (plan §5.4): the edge computes every metric; the model writes prose only.
export const generateAiReport = (body) => invoke('ai-reports', { action: 'generate', ...body });
