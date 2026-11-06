import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, Loader2, Save, Trash2, Zap } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import ItxSelect from '../../components/ItxSelect';
import { getAiConfig, listProviderModels, saveAiConfig, testAiConfig } from '../../lib/ai/client.js';

const fieldClass = 'w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 tabular-nums text-[var(--sa-text-primary)]';

// Presets fill the connection fields; Save is what persists the choice.
const PRESETS = {
  commandcode: {
    label: 'CommandCode Provider API',
    baseUrl: 'https://api.commandcode.ai/provider/v1',
    model: 'deepseek/deepseek-v4.1-flash',
    visionModel: 'deepseek/deepseek-v4-flash-vision-exp',
    zdr: true,
    freeTag: 'free — testing only',
    help: 'Key: CommandCode Studio → API keys (any plan except Go has API access).',
  },
  opencode: {
    label: 'OpenCode Console',
    baseUrl: 'https://opencode.ai/inference/openai/v1',
    model: 'deepseek-v4.1-flash',
    visionModel: '',
    zdr: false,
    freeTag: 'free — OpenCode-only',
    help: 'Key: OpenCode Console (paid models only; free models cannot be used from external clients).',
  },
};

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
  zdr: config.zdr !== false,
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

// A row saved before the preset column existed has 'custom' but a recognisable
// URL; show the matching choice — Save then persists it.
const presetFrom = (config) => {
  if (config.providerPreset === 'commandcode' || config.providerPreset === 'opencode') return config.providerPreset;
  if (/^https:\/\/api\.commandcode\.ai\//i.test(config.baseUrl ?? '')) return 'commandcode';
  if (/^https:\/\/opencode\.ai\//i.test(config.baseUrl ?? '')) return 'opencode';
  return 'custom';
};

// The chosen model may predate the list (or come from another provider).
const withSaved = (list, saved) => (
  !saved || list.some((model) => model.id === saved)
    ? list
    : [...list, { id: saved, name: saved, free: /free/i.test(saved), vision: false }]
);

const CUSTOM_ID = '__CUSTOM__';

// Paid first, then the provider's free models tagged in the option label.
const modelSections = (options, freeTag, freeGroup) => {
  const paid = options.filter((model) => !model.free);
  const free = options.filter((model) => model.free);
  const groups = [];
  if (paid.length > 0) groups.push({ label: 'Paid models', options: paid.map((model) => ({ value: model.id, label: model.name })) });
  if (free.length > 0) groups.push({ label: freeGroup, options: free.map((model) => ({ value: model.id, label: `${model.name} — ${freeTag}` })) });
  return groups;
};

const customSection = { options: [{ value: CUSTOM_ID, label: 'Custom model ID…' }] };

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

const patchFrom = (form, preset) => {
  const patch = {
    enabled: form.enabled,
    providerPreset: preset,
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim(),
    visionModel: form.visionModel.trim(),
    zdr: form.zdr,
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
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`min-w-0 py-2.5${i === items.length - 1 ? ' col-span-2 sm:col-span-1' : ''}`}
          >
            <p className="sa-micro">{item.label}</p>
            {item.lead ? (
              <p className="mt-1 flex items-center gap-2 truncate text-sm text-[var(--sa-text-primary)]" title={item.value}>
                <span className={`sa-dot${item.dot ? ` ${item.dot}` : ''}`} aria-hidden="true" />
                {item.value}
                {config.zdr && <span className="sa-badge" title="Require zero data retention">ZDR</span>}
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
  const [preset, setPreset] = useState('custom');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [modelList, setModelList] = useState({ status: 'idle', models: [], visionModels: [], note: null });
  // A custom ID is typed in the text input the "__CUSTOM__" option reveals.
  const [customPick, setCustomPick] = useState({ model: false, visionModel: false });
  const customModelRef = useRef(null);
  const customVisionRef = useRef(null);
  const modelRequest = useRef(0);

  // Server-side fetch (the browser never calls a provider); a newer choice wins.
  const loadModels = useCallback(async (presetValue, baseUrlValue) => {
    const request = modelRequest.current + 1;
    modelRequest.current = request;
    setModelList({ status: 'loading', models: [], visionModels: [], note: null });
    const { data, error } = await listProviderModels({ preset: presetValue, baseUrl: baseUrlValue ?? '' });
    if (request !== modelRequest.current) return;
    if (error) {
      setModelList({ status: 'error', models: [], visionModels: [], note: error.message });
      return;
    }
    setModelList({
      status: 'ready',
      models: data?.models ?? [],
      visionModels: data?.visionModels ?? [],
      note: data?.note ?? null,
    });
  }, []);

  const load = useCallback(async ({ keepForm = false } = {}) => {
    if (!keepForm) setState({ status: 'loading', config: null, error: null });
    const { data, error } = await getAiConfig();
    if (error || !data) {
      setState({ status: 'error', config: null, error: error ?? { code: 'UNREACHABLE', message: 'Empty response' } });
      return;
    }
    setState({ status: 'ready', config: data, error: null });
    if (!keepForm) {
      const nextPreset = presetFrom(data);
      setForm(formFrom(data));
      setPreset(nextPreset);
      setCustomPick({ model: false, visionModel: false });
      loadModels(nextPreset, data.baseUrl);
    }
  }, [loadModels]);

  useEffect(() => {
    // Deferred like GlobalSearch's reset: the first paint lands, then the fetch starts.
    queueMicrotask(() => load());
  }, [load]);

  // A freshly revealed custom-ID input takes the focus.
  useEffect(() => {
    if (customPick.model) customModelRef.current?.focus();
  }, [customPick.model]);
  useEffect(() => {
    if (customPick.visionModel) customVisionRef.current?.focus();
  }, [customPick.visionModel]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Only a hand-edited base URL breaks the preset; a typed model may still be right.
    if (key === 'baseUrl' && preset !== 'custom') {
      setPreset('custom');
      // The list belongs to the previous provider: empty it, never refetch per keystroke.
      modelRequest.current += 1;
      setModelList({ status: 'idle', models: [], visionModels: [], note: null });
    }
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError(null);
  };
  const applyPreset = (value) => {
    setPreset(value);
    const choice = PRESETS[value];
    setForm((prev) => ({
      ...prev,
      baseUrl: choice?.baseUrl ?? '',
      model: choice?.model ?? '',
      visionModel: choice?.visionModel ?? '',
      zdr: choice ? choice.zdr : prev.zdr,
    }));
    setFieldErrors((prev) => ({ ...prev, baseUrl: undefined, model: undefined, visionModel: undefined }));
    setFormError(null);
    setCustomPick({ model: false, visionModel: false });
    loadModels(value, choice?.baseUrl ?? '');
  };
  const setFeature = (key, value) => {
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
    setFormError(null);
  };
  // "__CUSTOM__" only switches the field; the typed ID still lives in the form.
  const pickModel = (key, value) => {
    setCustomPick((prev) => ({ ...prev, [key]: value === CUSTOM_ID }));
    if (value !== CUSTOM_ID) set(key, value);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setFormError(null);
    const { data, error } = await saveAiConfig(patchFrom(form, preset));
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
  const modelOptions = withSaved(modelList.models, form?.model);
  const visionOptions = withSaved(modelList.visionModels, form?.visionModel);
  // The list can belong to a provider chosen by URL while the select says Custom.
  const listPreset = PRESETS[preset] ? preset : presetFrom({ baseUrl: form?.baseUrl });
  const freeTag = PRESETS[listPreset]?.freeTag ?? PRESETS.commandcode.freeTag;
  const freeGroup = freeTag.replace(/^free/, 'Free models');
  const providerLabel = PRESETS[listPreset]?.label ?? 'this provider';
  const listReady = modelList.status === 'ready';
  // A select only when the provider really returned a list; a pinned saved ID
  // alone must never stand in for one.
  const modelsAvailable = listReady && modelList.models.length > 0;
  const visionAvailable = listReady && modelList.visionModels.length > 0;
  const freeChosen = Boolean(form) && (/free/i.test(form.model) || /free/i.test(form.visionModel));
  // A key saved under another provider cannot be cleared from this one.
  const keyProvider = config?.keyProvider ?? null;
  const keyElsewhere = Boolean(config?.hasKey && keyProvider && keyProvider !== preset);
  // Fill geometry only; the text keeps the raw percentage.
  const capPct = Math.min(Math.max(config?.usage?.capPct ?? 0, 0), 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4">
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
          <button type="button" onClick={() => load()} className="sa-btn mt-4">Try again</button>
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
                <div>
                  <label htmlFor="ai-preset" className="sa-label">Provider preset</label>
                  <ItxSelect
                    id="ai-preset"
                    value={preset}
                    onChange={applyPreset}
                    options={[
                      ...Object.entries(PRESETS).map(([value, choice]) => ({ value, label: choice.label })),
                      { value: 'custom', label: 'Custom / other' },
                    ]}
                    className={fieldClass}
                  />
                  <p className="mt-1 text-xs text-[var(--sa-text-muted)]">
                    Presets only fill the fields below — Save is still required.
                  </p>
                  {PRESETS[preset] && (
                    <p className="mt-1 text-xs text-[var(--sa-text-muted)]">{PRESETS[preset].help}</p>
                  )}
                </div>

                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => set('enabled', e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--sa-text-primary)]">AI enabled</span>
                    <span className="mt-0.5 block text-xs text-[var(--sa-text-muted)]">The kill switch. Off leaves every page on its non-AI path.</span>
                  </span>
                </label>

                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.zdr}
                    onChange={(e) => set('zdr', e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--sa-text-primary)]">Require zero data retention</span>
                    <span className="mt-0.5 block text-xs text-[var(--sa-text-muted)]">Sends x-cmd-zdr: 1. Recommended for student data; a model with no ZDR upstream fails with 422 instead of falling back.</span>
                    {preset === 'opencode' && (
                      <span className="mt-0.5 block text-xs text-[var(--sa-text-muted)]">The ZDR header is CommandCode-specific — OpenCode ignores it.</span>
                    )}
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
                  <p id="ai-base-url-help" className="mt-1 text-xs text-[var(--sa-text-muted)]">
                    https:// only; http://localhost and http://127.0.0.1 are allowed for local models.
                  </p>
                  {errors.baseUrl && <p className="mt-1 text-xs sa-t-danger">{errors.baseUrl}</p>}
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ai-model" className="sa-label">Model</label>
                      {modelsAvailable ? (
                        <div className="space-y-2">
                          <ItxSelect
                            id="ai-model"
                            value={customPick.model ? CUSTOM_ID : form.model}
                            onChange={(value) => pickModel('model', value)}
                            placeholder="Select a model"
                            groups={[...modelSections(modelOptions, freeTag, freeGroup), customSection]}
                            aria-describedby="ai-model-help"
                            aria-invalid={errors.model ? 'true' : undefined}
                            required
                            className={fieldClass}
                          />
                          {customPick.model && (
                            <input
                              ref={customModelRef}
                              id="ai-model-custom"
                              type="text"
                              autoComplete="off"
                              spellCheck={false}
                              value={form.model}
                              onChange={(e) => set('model', e.target.value)}
                              placeholder="Exact model ID"
                              aria-label="Custom model ID"
                              aria-invalid={errors.model ? 'true' : undefined}
                              aria-describedby="ai-model-help"
                              className={fieldClass}
                            />
                          )}
                        </div>
                      ) : (
                        <>
                          <input
                            id="ai-model"
                            type="text"
                            list="ai-model-options"
                            autoComplete="off"
                            spellCheck={false}
                            value={form.model}
                            onChange={(e) => set('model', e.target.value)}
                            placeholder="gpt-4o-mini"
                            aria-invalid={errors.model ? 'true' : undefined}
                            aria-describedby="ai-model-help"
                            className={fieldClass}
                          />
                          <datalist id="ai-model-options">
                            {modelOptions.map((model) => {
                              const label = model.free ? `${model.name} (${freeTag})` : model.name;
                              return <option key={model.id} value={model.id} label={label}>{label}</option>;
                            })}
                          </datalist>
                        </>
                      )}
                      {errors.model && <p className="mt-1 text-xs sa-t-danger">{errors.model}</p>}
                    </div>
                    <div>
                      <label htmlFor="ai-vision-model" className="sa-label">Vision model (optional)</label>
                      {visionAvailable ? (
                        <div className="space-y-2">
                          <ItxSelect
                            id="ai-vision-model"
                            value={customPick.visionModel ? CUSTOM_ID : form.visionModel}
                            onChange={(value) => pickModel('visionModel', value)}
                            groups={[
                              { options: [{ value: '', label: '(none — use the model above)' }] },
                              ...modelSections(visionOptions, freeTag, freeGroup),
                              customSection,
                            ]}
                            aria-describedby="ai-model-help"
                            className={fieldClass}
                          />
                          {customPick.visionModel && (
                            <input
                              ref={customVisionRef}
                              id="ai-vision-model-custom"
                              type="text"
                              autoComplete="off"
                              spellCheck={false}
                              value={form.visionModel}
                              onChange={(e) => set('visionModel', e.target.value)}
                              placeholder="Exact model ID"
                              aria-label="Custom vision model ID"
                              aria-describedby="ai-model-help"
                              className={fieldClass}
                            />
                          )}
                        </div>
                      ) : (
                        <>
                          <input
                            id="ai-vision-model"
                            type="text"
                            list="ai-vision-model-options"
                            autoComplete="off"
                            spellCheck={false}
                            value={form.visionModel}
                            onChange={(e) => set('visionModel', e.target.value)}
                            placeholder="Uses the model above when blank"
                            aria-describedby="ai-model-help"
                            className={fieldClass}
                          />
                          <datalist id="ai-vision-model-options">
                            {visionOptions.map((model) => {
                              const label = model.free ? `${model.name} (${freeTag})` : model.name;
                              return <option key={model.id} value={model.id} label={label}>{label}</option>;
                            })}
                          </datalist>
                        </>
                      )}
                    </div>
                  </div>
                  <p id="ai-model-help" className="text-xs text-[var(--sa-text-muted)]">
                    {modelsAvailable
                      ? `${modelList.models.length} ${modelList.models.length === 1 ? 'model' : 'models'} from ${providerLabel} — ${freeTag}.`
                      : 'Choose a listed model or type an ID.'}
                  </p>
                  {modelList.status === 'loading' && (
                    <p className="text-xs text-[var(--sa-text-muted)]" role="status">Loading models…</p>
                  )}
                  {modelList.status === 'error' && (
                    <p className="text-xs sa-t-danger" role="status">Couldn&apos;t load models — type the ID manually.</p>
                  )}
                  {modelList.status === 'ready' && modelList.note && (
                    <p className="text-xs text-[var(--sa-text-muted)]">{modelList.note}</p>
                  )}
                  {freeChosen && (
                    <div className="sa-alert mt-2" role="note">
                      <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                      <p>Free models may retain or train data — testing only, never student data.</p>
                    </div>
                  )}
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
                      placeholder={!config.hasKey
                        ? 'Paste API key'
                        : keyElsewhere ? 'Paste a new key for this provider' : 'Saved — paste a new key to replace'}
                      aria-describedby={keyElsewhere ? 'ai-api-key-warning ai-api-key-help' : 'ai-api-key-help'}
                      className={`${fieldClass} min-w-0 flex-1`}
                    />
                    {config.hasKey && !keyElsewhere && (
                      <button
                        type="button"
                        onClick={() => setShowClear(true)}
                        className="sa-btn itx-danger shrink-0 justify-center"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                        <span>Clear saved key</span>
                      </button>
                    )}
                  </div>
                  {keyElsewhere && (
                    <p id="ai-api-key-warning" className="mt-1 text-xs text-[var(--sa-text-secondary)]">
                      A key is saved for {PRESETS[keyProvider]?.label ?? 'Custom / other'}; this provider may need its own key.
                    </p>
                  )}
                  <p id="ai-api-key-help" className="mt-1 text-xs text-[var(--sa-text-muted)]">
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
                  {errors.monthlyTokenCap && <p className="mt-1 text-xs sa-t-danger">{errors.monthlyTokenCap}</p>}
                  <p className="mt-1 text-xs text-[var(--sa-text-muted)]">Calls stop with CAP_EXCEEDED once the month reaches this figure.</p>
                </div>

                <details className="pt-1">
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
                      {errors.timeoutSeconds && <p className="mt-1 text-xs sa-t-danger">{errors.timeoutSeconds}</p>}
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
                      {errors.maxOutputTokens && <p className="mt-1 text-xs sa-t-danger">{errors.maxOutputTokens}</p>}
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

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="sa-btn sa-btn--primary justify-center disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={1.5} />}
                    <span>{saving ? 'Saving…' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !config.hasKey}
                    className="sa-btn justify-center disabled:cursor-not-allowed"
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} strokeWidth={1.5} />}
                    <span>{testing ? 'Testing…' : 'Test connection'}</span>
                  </button>
                  {!config.hasKey && (
                    <p className="text-xs text-[var(--sa-text-muted)]">Save first to test a new key.</p>
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
                      className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={form.features[feature.key]}
                        onChange={(e) => setFeature(feature.key, e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] text-[var(--sa-text-primary)]">{feature.label}</span>
                        <span className="mt-0.5 block text-xs text-[var(--sa-text-muted)]">{feature.description}</span>
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
                      <svg className="block h-full w-full" viewBox="0 0 100 5" preserveAspectRatio="none" aria-hidden="true">
                        <rect width={capPct} height="5" fill="var(--sa-bar-primary)" />
                      </svg>
                    </div>
                    <span className="sa-bar-count tabular-nums">{config.usage?.capPct ?? 0}%</span>
                  </div>
                  <p className="tabular-nums text-[13px] text-[var(--sa-text-primary)]">
                    {num(config.usage?.tokensThisMonth)} <span className="text-[var(--sa-text-muted)]">of {num(config.monthlyTokenCap)}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--sa-text-muted)]">
                    {(config.usage?.tokensThisMonth ?? 0) === 0
                      ? 'No usage recorded this month.'
                      : `${num(config.usage?.last30dCalls)} ${config.usage?.last30dCalls === 1 ? 'call' : 'calls'} in the last 30 days.`}
                  </p>
                  <p className="mt-4 text-xs text-[var(--sa-text-muted)]">
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
        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => setShowClear(false)}
            disabled={clearing}
            className="sa-btn flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClearKey}
            disabled={clearing}
            className="sa-btn itx-danger flex-1 justify-center disabled:cursor-not-allowed"
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
