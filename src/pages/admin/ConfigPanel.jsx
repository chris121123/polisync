import { Sliders, Info } from 'lucide-react';

export const ConfigPanel = ({
  configForm,
  setConfigForm,
  handleSaveConfig,
  configLoading,
  isConfigDirty,
}) => (
  <div className="bg-ps-surface rounded-xl shadow-sm border border-ps-border p-6 space-y-6">
    <div className="border-b border-ps-border pb-4">
      <h2 className="text-base font-semibold text-ps-ink-1 flex items-center gap-2">
        <Sliders size={18} className="text-ps-accent" />
        Platform Scheduling Settings
      </h2>
      <p className="text-xs text-ps-ink-2 mt-1">
        Global constraints and operational parameters for automated and manual scheduling engines.
      </p>
    </div>

    {/* Audit Notice Callout */}
    <div className="p-3.5 rounded-lg bg-ps-bg border border-ps-border flex items-start gap-3">
      <Info size={16} className="text-ps-accent shrink-0 mt-0.5" />
      <div className="text-xs text-ps-ink-2 leading-relaxed">
        <span className="font-medium text-ps-ink-1">Audit Notice: </span>
        Changes are logged when audit schema supports <code className="px-1 py-0.5 bg-ps-surface border border-ps-border rounded font-mono text-ps-accent">config_changed</code>.
      </div>
    </div>

    <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl">
      {/* Auto-Scheduler Toggle — primary control, moved to top */}
      <div className="p-4 rounded-xl border border-ps-border bg-ps-bg/40 flex items-start gap-3">
        <input
          type="checkbox"
          id="auto_schedule_enabled"
          checked={configForm.auto_schedule_enabled}
          onChange={e => setConfigForm(p => ({ ...p, auto_schedule_enabled: e.target.checked }))}
          className="mt-1 rounded border-ps-border text-ps-accent focus:ring-ps-accent/20"
        />
        <label htmlFor="auto_schedule_enabled" className="cursor-pointer">
          <span className="text-sm font-semibold text-ps-ink-1 block">Auto-Scheduler Engine</span>
          <span className="text-xs text-ps-ink-2 block mt-0.5">Enable automated constraint-satisfaction solver runs for pending student assignments. Disable to use manual scheduling only.</span>
        </label>
      </div>

      {/* Operating Hours */}
      <div>
        <label className="block text-sm font-medium text-ps-ink-1 mb-2">Center Operating Hours</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs text-ps-ink-2 mb-1">Start Time</span>
            <input
              type="time"
              value={configForm.operating_start_time}
              onChange={e => setConfigForm(p => ({ ...p, operating_start_time: e.target.value }))}
              className="w-full px-3 py-2 bg-ps-bg border border-ps-border rounded-lg text-sm text-ps-ink-1 focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
            />
          </div>
          <div>
            <span className="block text-xs text-ps-ink-2 mb-1">End Time</span>
            <input
              type="time"
              value={configForm.operating_end_time}
              onChange={e => setConfigForm(p => ({ ...p, operating_end_time: e.target.value }))}
              className="w-full px-3 py-2 bg-ps-bg border border-ps-border rounded-lg text-sm text-ps-ink-1 focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
            />
          </div>
        </div>
      </div>

      {/* Numeric Constraints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ps-ink-1 mb-1">Max Daily Hours Per Student</label>
          <input
            type="number"
            step="0.5"
            min="1"
            max="12"
            value={configForm.max_daily_hours_per_student}
            onChange={e => setConfigForm(p => ({ ...p, max_daily_hours_per_student: e.target.value }))}
            className="w-full px-3 py-2 bg-ps-bg border border-ps-border rounded-lg text-sm text-ps-ink-1 focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
          />
          <span className="text-xs text-ps-ink-2 mt-1 block">Upper limit on daily scheduled therapy time</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-ps-ink-1 mb-1">Minimum Break Minutes</label>
          <input
            type="number"
            step="5"
            min="0"
            max="60"
            value={configForm.min_break_minutes}
            onChange={e => setConfigForm(p => ({ ...p, min_break_minutes: e.target.value }))}
            className="w-full px-3 py-2 bg-ps-bg border border-ps-border rounded-lg text-sm text-ps-ink-1 focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
          />
          <span className="text-xs text-ps-ink-2 mt-1 block">Buffer between back-to-back sessions</span>
        </div>
      </div>

      {/* Allow Overbooking Toggle */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={configForm.allow_overbook}
            onChange={e => setConfigForm(p => ({ ...p, allow_overbook: e.target.checked }))}
            className="mt-1 rounded border-ps-border text-ps-accent focus:ring-ps-accent/20"
          />
          <div>
            <span className="text-sm font-medium text-ps-ink-1 block">Allow Overbooking</span>
            <span className="text-xs text-ps-ink-2 block">Permit scheduling sessions beyond room maximum capacity when explicitly approved</span>
          </div>
        </label>
      </div>

      <div className="pt-4 border-t border-ps-border flex items-center gap-4">
        <button
          type="submit"
          disabled={configLoading}
          className="px-5 py-2.5 bg-ps-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ps-accent"
        >
          {configLoading ? 'Saving...' : 'Save Configuration'}
        </button>
        {isConfigDirty && !configLoading && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-ps-warn">
            <span className="w-1.5 h-1.5 rounded-full bg-ps-warn" />
            Unsaved changes
          </span>
        )}
      </div>
    </form>
  </div>
);
