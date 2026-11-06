import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { EMPTY_CONFIG } from './userManagementConstants.js';
import { ConfigPanel } from './ConfigPanel.jsx';
import { SchedulerConsole } from './SchedulerConsole.jsx';

const ConfigPage = () => {
  const { schedulingSettings, notify, saveSchedulingSettings } = useGlobalState();

  // ── Platform Configuration Form State ──
  const [configForm, setConfigForm] = useState(EMPTY_CONFIG);
  const [initialConfigForm, setInitialConfigForm] = useState(EMPTY_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);

  const isConfigDirty = JSON.stringify(configForm) !== JSON.stringify(initialConfigForm);

  useEffect(() => {
    if (schedulingSettings) {
      const loaded = {
        operating_start_time: schedulingSettings.operating_start_time || '08:00',
        operating_end_time: schedulingSettings.operating_end_time || '17:00',
        allow_overbook: !!schedulingSettings.allow_overbook,
        max_daily_hours_per_student: schedulingSettings.max_daily_hours_per_student ?? 4.0,
        auto_schedule_enabled: !!schedulingSettings.auto_schedule_enabled,
        min_break_minutes: schedulingSettings.min_break_minutes ?? 15,
        year_start: schedulingSettings.year_start || '',
        year_end: schedulingSettings.year_end || '',
      };
      setConfigForm(loaded);
      setInitialConfigForm(loaded);
    }
  }, [schedulingSettings]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      const { error } = await saveSchedulingSettings(configForm, schedulingSettings?.id || 1);
      if (error) throw error;
      if (notify) notify('Platform configuration updated successfully');
      setInitialConfigForm({ ...configForm });
    } catch (err) {
      if (notify) notify(err.message || 'Failed to update configuration', 'error');
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-page-entry">
      <div className="space-y-6 lg:max-w-3xl">
        <div>
          <h1 className="sa-title">System Engine &amp; Runtime</h1>
          <p className="sa-sub">Scheduler rules and runtime settings for the platform.</p>
        </div>

        <ConfigPanel
          configForm={configForm}
          setConfigForm={setConfigForm}
          handleSaveConfig={handleSaveConfig}
          configLoading={configLoading}
          isConfigDirty={isConfigDirty}
        />

        <SchedulerConsole />
      </div>
    </div>
  );
};

export default ConfigPage;
