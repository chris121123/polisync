import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Info, Loader2, Save, Trash2, Zap } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import { getAiConfig, saveAiConfig, testAiConfig } from '../../lib/ai/client.js';

const fieldClass = 'w-full min-h-11 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm tabular-nums text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]';

const FEATURES = [
  { key: 'assistant', label: 'Assistant', description: 'Answers questions about the schedule and records.' },
  { key: 'planner', label: 'Year Planner', description: 'Proposes a full-year weekly base plan.' },
  { key: 'repair', label: 'Daily Repair', description: 'Suggests fixes for same-day conflicts.' },
  { key: 'extract', label: 'Extraction', description: 'Turns photos and scans into staged rows.' },
  { key: 'reports', label: 'Reports', description: 'Writes the narrative around real metrics.' },
];

// The edge accepts http only for a model running on this machine.
const isAllowedBaseUrl = (value) => (
  /^https:\/\/\S+$/i.test(value) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value)
);

const hostOf = (value) => {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
};

const num = (value) => Number(value || 0).toLocaleString('en-US');

const dayWords = (value) => (value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : 'Never');

const formFrom = (config) => ({
  enabled: config.enabled === true,
  baseUrl: config.baseUrl ?? '',
  model: config.model ?? '',
  visionModel: config.visionModel ?? '',
  apiKey: '',
  monthlyTokenCap: String(config.monthlyTokenCap ?? 100000),
  timeoutSeconds: String(config.timeoutSeconds ?? 60),
  maxOutputTokens: config.maxOutputTokens == null ? '' : String(config.maxOutputTokens),
  features: {
    assistant: config.features?.assistant === true,
    planner: config.features?.planner === true,
    repair: config.features?.repair === true,
    extract: config.features?.extract === true,
    reports: config.features?.reports === true,
  },
});

const validate = (form) => {
  const errors = {};
  const url = form.baseUrl.trim().replace(/\/+$/, '');
  if (!url) errors.baseUrl = 'Base URL is required.';
  else if (!isAllowedBaseUrl(url)) errors.baseUrl = 'Use https:// — http:// only for localhost or 127.0.0.1.';
  if (!form.model.trim()) errors.model = 'Model is required.';

  const cap = Number(form.monthlyTokenCap);
  if (!Number.isInteger(cap) || cap < 1000) errors.monthlyTokenCap = 'At least 1,000 tokens.';

  const timeout = Number(form.timeoutSeconds);
  if (!Number.isInteger(timeout) || timeout < 5 || timeout > 120) errors.timeoutSeconds = '5–120 seconds.';

  if (form.maxOutputTokens.trim() !== '') {
    const maxTokens = Number(form.maxOutputTokens);
    if (!Number.isInteger(maxTokens) || maxTokens < 256 || maxTokens > 65536) {
      errors.maxOutputTokens = '256–65,536, or blank.';
    }
  }
  return errors;
};

const patchFrom = (form) => {
  const patch = {
    enabled: form.enabled,
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim(),
    visionModel: form.visionModel.trim(),
    monthlyTokenCap: Number(form.monthlyTokenCap),
    timeoutSeconds: Number(form.timeoutSeconds),
    maxOutputTokens: form.maxOutputTokens.trim() === '' ? null : Number(form.maxOutputTokens),
    features: { ...form.features },
  };
  // An empty field keeps the saved key; only a typed value replaces it.
  if (form.apiKey.trim()) patch.apiKey = form.apiKey.trim();
  return patch;
};

const StatusStrip = ({ config }) => {
  const lastTest = config.lastTest ?? {};
  const testLabel = lastTest.ok === true ? 'Reachable' : lastTest.ok === false ? 'Unreachable' : 'Never tested';
  const items = [
    { label: 'State', value: config.enabled ? 'Enabled' : 'Disabled', lead: true, dot: config.enabled ? 'sa-dot--ok' : '' },
    { label: 'Provider', value: hostOf(config.baseUrl) || 'Not set' },
    { label: 'Model', value: config.model || 'Not set' },
    { label: 'Last test', value: testLabel },
    { label: 'Tokens this month', value: `${num(config.usage?.tokensThisMonth)} / ${num(config.monthlyTokenCap)}` },
  ];
  return (
    <section className="sa-panel" aria-label="Provider status">
      <div className="grid grid-cols-2 gap-px bg-[var(--sa-line-hairline)] sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`min-w-0 bg-[var(--sa-surface-1)] px-3 py-2.5${i === items.length - 1 ? ' col-span-2 sm:col-span-1' : ''}`}
          >
            <p className="sa-micro">{item.label}</p>
            {item.lead ? (
              <p className="mt-1 flex items-center gap-2 truncate text-base text-[var(--sa-text-primary)]" title={item.value}>
                <span className={`sa-dot${item.dot ? ` ${item.dot}` : ''}`} aria-hidden="true" />
                {item.value}
              </p>
            ) : (
              <p className="mt-1 truncate text-[13px] tabular-nums text-[var(--sa-text-primary)]" title={item.value}>{item.value}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const AiProviderPage = () => {
  const { notify } = useGlobalState();

  const [state, setState] = useState({ status: 'loading', config: null, error: null });
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async ({ keepForm = false } = {}) => {
    if (!keepForm) setState({ status: 'loading', config: null, error: null });
    const { data, error } = await getAiConfig();
    if (error || !data) {
      setState({ status: 'error', config: null, error: error ?? { code: 'UNREACHABLE', message: 'Empty response' } });
      return;
    }
    setState({ status: 'ready', config: data, error: null });
    if (!keepForm) setForm(formFrom(data));
  }, []);

  useEffect(() => {
    // Deferred like GlobalSearch's reset: the first paint lands, then the fetch starts.
    queueMicrotask(() => load());
  }, [load]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError(null);
  };
  const setFeature = (key, value) => {
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
    setFormError(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setFormError(null);
    const { data, error } = await saveAiConfig(patchFrom(form));
    setSaving(false);
    if (error) {
      setFormError(error);
      return;
    }
    setTestResult(null);
    setTestError(null);
    notify(`AI settings saved — ${data?.fields?.length ?? 0} ${data?.fields?.length === 1 ? 'field' : 'fields'} updated`, 'success');
    await load();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    const { data, error } = await testAiConfig();
    setTesting(false);
    if (error) setTestError(error);
    else setTestResult(data);
    // Re-read only the status: an unsaved base URL edit must survive the probe.
    await load({ keepForm: true });
  };

  const handleClearKey = async () => {
    setClearing(true);
    const { error } = await saveAiConfig({ apiKey: '__CLEAR__' });
    setClearing(false);
    setShowClear(false);
    if (error) {
      setFormError(error);
      return;
    }
    setTestResult(null);
    setTestError(null);
    notify('Saved API key removed', 'success');
    await load();
  };

  const config = state.config;
  const errors = fieldErrors;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4 sa-rule-b">
        <h1 className="sa-title">AI Provider</h1>
        <p className="sa-sub">Connect a provider, choose features, and cap spend.</p>
      </div>

      {state.status === 'loading' && (
        <section className="sa-panel" aria-busy="true">
          <p className="sr-only" role="status">Loading provider settings…</p>
          <div className="space-y-3" aria-hidden="true">
            <div className="h-3 w-40 bg-[var(--sa-surface-2)]" />
            <div className="h-11 bg-[var(--sa-surface-2)]" />
            <div className="h-11 bg-[var(--sa-surface-2)]" />
            <div className="h-3 w-24 bg-[var(--sa-surface-2)]" />
          </div>
        </section>
      )}

      {state.status === 'error' && (
        <section className="sa-panel">
          <div className="sa-alert sa-alert--danger" role="alert">
            <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="sa-mono">{state.error?.code}</p>
              <p className="mt-0.5 break-words">{state.error?.message}</p>
            </div>
          </div>
          <button type="button" onClick={() => load()} className="sa-btn mt-4 min-h-11">Try again</button>
        </section>
      )}

      {state.status === 'ready' && form && (
        <>
          <StatusStrip config={config} />

          {config.envOverride && (
            <div className="sa-alert" role="note">
              <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--sa-text-muted)]" />
              <p>Environment override active — AI_* edge secrets take precedence over this page.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="sa-panel min-w-0 xl:col-span-2">
              <div className="sa-panel-head">
                <div>
                  <h2 className="sa-panel-title">Connection</h2>
                  <p className="sa-panel-sub">OpenAI-compatible chat completions endpoint</p>
                </div>
                <span className={`sa-badge${config.hasKey ? ' sa-badge--positive' : ' sa-badge--warn'}`}>
                  {config.hasKey ? 'Key saved' : 'No key'}
                </span>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-5" noValidate>
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => set('enabled', e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--sa-gold)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--sa-text-primary)]">AI enabled</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--sa-text-muted)]">The kill switch. Off leaves every page on its non-AI path.</span>
                  </span>
                </label>

                <div>
                  <label htmlFor="ai-base-url" className="sa-label">Base URL</label>
                  <input
                    id="ai-base-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={form.baseUrl}
                    onChange={(e) => set('baseUrl', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    aria-invalid={errors.baseUrl ? 'true' : undefined}
                    aria-describedby="ai-base-url-help"
                    className={fieldClass}
                  />
                  <p id="ai-base-url-help" className="mt-1 text-[11px] text-[var(--sa-text-muted)]">
                    https:// only; http://localhost and http://127.0.0.1 are allowed for local models.
                  </p>
                  {errors.baseUrl && <p className="mt-1 text-[11px] sa-t-danger">{errors.baseUrl}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ai-model" className="sa-label">Model</label>
                    <input
                      id="ai-model"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.model}
                      onChange={(e) => set('model', e.target.value)}
                      placeholder="gpt-4o-mini"
                      aria-invalid={errors.model ? 'true' : undefined}
                      className={fieldClass}
                    />
                    {errors.model && <p className="mt-1 text-[11px] sa-t-danger">{errors.model}</p>}
                  </div>
                  <div>
                    <label htmlFor="ai-vision-model" className="sa-label">Vision model (optional)</label>
                    <input
                      id="ai-vision-model"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.visionModel}
                      onChange={(e) => set('visionModel', e.target.value)}
                      placeholder="Uses the model above when blank"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ai-api-key" className="sa-label">API key</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="ai-api-key"
                      type="password"
                      autoComplete="new-password"
                      value={form.apiKey}
                      onChange={(e) => set('apiKey', e.target.value)}
                      placeholder={config.hasKey ? 'Saved — paste a new key to replace' : 'Paste API key'}
                      aria-describedby="ai-api-key-help"
                      className={`${fieldClass} min-w-0 flex-1`}
                    />
                    {config.hasKey && (
                      <button
                        type="button"
                        onClick={() => setShowClear(true)}
                        className="flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[var(--sa-danger)] px-3 text-[11px] uppercase tracking-[0.1em] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)]"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                        <span>Clear saved key</span>
                      </button>
                    )}
                  </div>
                  <p id="ai-api-key-help" className="mt-1 text-[11px] text-[var(--sa-text-muted)]">
                    The key is write-only: it is never shown again.
                  </p>
                </div>

                <div>
                  <label htmlFor="ai-cap" className="sa-label">Monthly token cap</label>
                  <input
                    id="ai-cap"
                    type="number"
                    inputMode="numeric"
                    min="1000"
                    step="1000"
                    value={form.monthlyTokenCap}
                    onChange={(e) => set('monthlyTokenCap', e.target.value)}
                    aria-invalid={errors.monthlyTokenCap ? 'true' : undefined}
                    className={`${fieldClass} max-w-xs`}
                  />
                  {errors.monthlyTokenCap && <p className="mt-1 text-[11px] sa-t-danger">{errors.monthlyTokenCap}</p>}
                  <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">Calls stop with CAP_EXCEEDED once the month reaches this figure.</p>
                </div>

                <details className="border-t border-[var(--sa-line-hairline)] pt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-2">
                    <span className="sa-micro">Advanced</span>
                  </summary>
                  <div className="grid grid-cols-1 gap-4 pb-1 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ai-timeout" className="sa-label">Timeout (seconds)</label>
                      <input
                        id="ai-timeout"
                        type="number"
                        inputMode="numeric"
                        min="5"
                        max="120"
                        step="1"
                        value={form.timeoutSeconds}
                        onChange={(e) => set('timeoutSeconds', e.target.value)}
                        aria-invalid={errors.timeoutSeconds ? 'true' : undefined}
                        className={fieldClass}
                      />
                      {errors.timeoutSeconds && <p className="mt-1 text-[11px] sa-t-danger">{errors.timeoutSeconds}</p>}
                    </div>
                    <div>
                      <label htmlFor="ai-max-tokens" className="sa-label">Max output tokens</label>
                      <input
                        id="ai-max-tokens"
                        type="number"
                        inputMode="numeric"
                        min="256"
                        max="65536"
                        step="1"
                        value={form.maxOutputTokens}
                        onChange={(e) => set('maxOutputTokens', e.target.value)}
                        placeholder="Provider default"
                        aria-invalid={errors.maxOutputTokens ? 'true' : undefined}
                        className={fieldClass}
                      />
                      {errors.maxOutputTokens && <p className="mt-1 text-[11px] sa-t-danger">{errors.maxOutputTokens}</p>}
                    </div>
                  </div>
                </details>

                {formError && (
                  <div className="sa-alert sa-alert--danger" role="alert">
                    <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="sa-mono">{formError.code}</p>
                      <p className="mt-0.5 break-words">{formError.message}</p>
                    </div>
                  </div>
                )}

                {testError && (
                  <div className="sa-alert sa-alert--danger" role="alert">
                    <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="sa-mono">{testError.code}</p>
                      <p className="mt-0.5 break-words">{testError.message}</p>
                    </div>
                  </div>
                )}

                {testResult && (
                  <div className="sa-alert sa-alert--success" role="status">
                    <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p>
                        Provider reachable — <span className="sa-mono tabular-nums">{testResult.latencyMs} ms</span>
                      </p>
                      <p className="mt-0.5 break-words">
                        Model replied: <span className="sa-mono">{testResult.model}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--sa-line-hairline)] pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="sa-btn sa-btn--primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={1.5} />}
                    <span>{saving ? 'Saving…' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !config.hasKey}
                    className="sa-btn min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} strokeWidth={1.5} />}
                    <span>{testing ? 'Testing…' : 'Test connection'}</span>
                  </button>
                  {!config.hasKey && (
                    <p className="text-[11px] text-[var(--sa-text-muted)]">Save first to test a new key.</p>
                  )}
                </div>
              </form>
            </section>

            <div className="space-y-6">
              <section className="sa-panel min-w-0">
                <div className="sa-panel-head">
                  <div>
                    <h2 className="sa-panel-title">Features</h2>
                    <p className="sa-panel-sub">Saved with the connection</p>
                  </div>
                </div>
                <div className="mt-1">
                  {FEATURES.map((feature) => (
                    <label
                      key={feature.key}
                      className="flex min-h-11 cursor-pointer items-start gap-3 border-b border-[var(--sa-line-row)] py-2.5 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={form.features[feature.key]}
                        onChange={(e) => setFeature(feature.key, e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--sa-gold)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] text-[var(--sa-text-primary)]">{feature.label}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--sa-text-muted)]">{feature.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="sa-panel min-w-0">
                <div className="sa-panel-head">
                  <div>
                    <h2 className="sa-panel-title">Usage</h2>
                    <p className="sa-panel-sub">Month to date</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="sa-bar-row">
                    <span className="sa-bar-label">Tokens</span>
                    <div
                      className="sa-bar"
                      role="img"
                      aria-label={`${config.usage?.capPct ?? 0}% of the monthly cap used`}
                    >
                      <div
                        className="sa-bar-fill"
                        style={{ width: `${Math.min(Math.max(config.usage?.capPct ?? 0, 0), 100)}%` }}
                      />
                    </div>
                    <span className="sa-bar-count tabular-nums">{config.usage?.capPct ?? 0}%</span>
                  </div>
                  <p className="tabular-nums text-[13px] text-[var(--sa-text-primary)]">
                    {num(config.usage?.tokensThisMonth)} <span className="text-[var(--sa-text-muted)]">of {num(config.monthlyTokenCap)}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">
                    {(config.usage?.tokensThisMonth ?? 0) === 0
                      ? 'No usage recorded this month.'
                      : `${num(config.usage?.last30dCalls)} ${config.usage?.last30dCalls === 1 ? 'call' : 'calls'} in the last 30 days.`}
                  </p>
                  <p className="mt-3 border-t border-[var(--sa-line-hairline)] pt-3 text-[11px] text-[var(--sa-text-muted)]">
                    Saved <span className="tabular-nums">{dayWords(config.savedAt)}</span> by {config.savedBy || 'IT Manager'}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <AppModal
        isOpen={showClear}
        onClose={() => (clearing ? undefined : setShowClear(false))}
        labelledBy="ai_clear_key_title"
        describedBy="ai_clear_key_desc"
        maxWidth="max-w-md"
        dismissible={!clearing}
      >
        <ModalHeader
          titleId="ai_clear_key_title"
          title="Clear the saved API key?"
          onClose={clearing ? undefined : () => setShowClear(false)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <p id="ai_clear_key_desc" className="text-sm text-[var(--sa-text-secondary)]">
            Every AI feature stops until a new key is pasted and saved. The saved key is never shown, so it cannot be recovered.
          </p>
        </div>
        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => setShowClear(false)}
            disabled={clearing}
            className="sa-btn min-h-11 flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClearKey}
            disabled={clearing}
            className={clearing
              ? 'flex min-h-11 flex-1 cursor-not-allowed items-center justify-center gap-2 border border-[var(--sa-line-default)] px-3 text-[11px] uppercase tracking-[0.1em] text-[var(--sa-text-muted)]'
              : 'flex min-h-11 flex-1 items-center justify-center gap-2 border border-[var(--sa-danger)] px-3 text-[11px] uppercase tracking-[0.1em] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)]'}
          >
            {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} strokeWidth={1.5} />}
            <span>{clearing ? 'Clearing…' : 'Clear key'}</span>
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default AiProviderPage;
