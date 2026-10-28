import { Sliders, Info } from 'lucide-react';

const fieldClass = 'w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm tabular-nums text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]';

export const ConfigPanel = ({
  configForm,
  setConfigForm,
  handleSaveConfig,
  configLoading,
  isConfigDirty,
}) => (
  <div className="sa-panel space-y-6">
    <div className="sa-panel-head">
      <div>
        <h2 className="sa-panel-title flex items-center gap-2">
          <Sliders size={16} strokeWidth={1.5} className="shrink-0 text-[var(--sa-text-muted)]" />
          Platform Scheduling Settings
        </h2>
        <p className="sa-panel-sub">
          Global constraints and operational parameters for automated and manual scheduling engines.
        </p>
      </div>
    </div>

    {/* Audit Notice Callout */}
    <div className="sa-alert">
      <Info size={16} strokeWidth={1.5} className="shrink-0 mt-0.5 text-[var(--sa-text-muted)]" />
      <div className="text-xs text-[var(--sa-text-secondary)] leading-relaxed">
        <span className="text-[var(--sa-text-primary)]">Audit Notice: </span>
        Changes are logged when audit schema supports <code className="sa-mono border border-[var(--sa-line-hairline)] px-1 py-0.5">config_changed</code>.
      </div>
    </div>

    <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl">
      {/* Auto-Scheduler Toggle — primary control, moved to top */}
      <div className="border border-[var(--sa-line-default)] p-4 flex items-start gap-3">
        <input
          type="checkbox"
          id="auto_schedule_enabled"
          checked={configForm.auto_schedule_enabled}
          onChange={e => setConfigForm(p => ({ ...p, auto_schedule_enabled: e.target.checked }))}
          className="mt-1 h-4 w-4 accent-[var(--sa-gold)]"
        />
        <label htmlFor="auto_schedule_enabled" className="cursor-pointer">
          <span className="block text-sm text-[var(--sa-text-primary)]">Auto-Scheduler Engine</span>
          <span className="mt-0.5 block text-[11px] text-[var(--sa-text-muted)]">Enable automated constraint-satisfaction solver runs for pending student assignments. Disable to use manual scheduling only.</span>
        </label>
      </div>

      {/* Operating Hours */}
      <div>
        <p className="sa-label">Center Operating Hours</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="sa-label">Start Time</span>
            <input
              type="time"
              value={configForm.operating_start_time}
              onChange={e => setConfigForm(p => ({ ...p, operating_start_time: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <span className="sa-label">End Time</span>
            <input
              type="time"
              value={configForm.operating_end_time}
              onChange={e => setConfigForm(p => ({ ...p, operating_end_time: e.target.value }))}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {/* Numeric Constraints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="max_daily_hours_per_student" className="sa-label">Max Daily Hours Per Student</label>
          <input
            id="max_daily_hours_per_student"
            type="number"
            step="0.5"
            min="1"
            max="12"
            value={configForm.max_daily_hours_per_student}
            onChange={e => setConfigForm(p => ({ ...p, max_daily_hours_per_student: e.target.value }))}
            className={fieldClass}
          />
          <span className="mt-1 block text-[11px] text-[var(--sa-text-muted)]">Upper limit on daily scheduled therapy time</span>
        </div>

        <div>
          <label htmlFor="min_break_minutes" className="sa-label">Minimum Break Minutes</label>
          <input
            id="min_break_minutes"
            type="number"
            step="5"
            min="0"
            max="60"
            value={configForm.min_break_minutes}
            onChange={e => setConfigForm(p => ({ ...p, min_break_minutes: e.target.value }))}
            className={fieldClass}
          />
          <span className="mt-1 block text-[11px] text-[var(--sa-text-muted)]">Buffer between back-to-back sessions</span>
        </div>
      </div>

      {/* Allow Overbooking Toggle */}
      <div className="border-t border-[var(--sa-line-hairline)] pt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={configForm.allow_overbook}
            onChange={e => setConfigForm(p => ({ ...p, allow_overbook: e.target.checked }))}
            className="mt-1 h-4 w-4 accent-[var(--sa-gold)]"
          />
          <div>
            <span className="block text-sm text-[var(--sa-text-primary)]">Allow Overbooking</span>
            <span className="block text-[11px] text-[var(--sa-text-muted)]">Permit scheduling sessions beyond room maximum capacity when explicitly approved</span>
          </div>
        </label>
      </div>

      <div className="pt-4 border-t border-[var(--sa-line-hairline)] flex items-center gap-4">
        <button
          type="submit"
          disabled={configLoading}
          className="sa-btn sa-btn--primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {configLoading ? 'Saving...' : 'Save Configuration'}
        </button>
        {isConfigDirty && !configLoading && (
          <span className="flex items-center gap-2 text-[11px] text-[var(--sa-text-muted)]">
            <span className="sa-marker sa-marker--danger" />
            Unsaved changes
          </span>
        )}
      </div>
    </form>
  </div>
);
