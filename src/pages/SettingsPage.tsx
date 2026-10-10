import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, User, Bell, Sliders, Database, LogOut,
  Save, RotateCcw, AlertTriangle, Shield, Gauge,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, Badge, Toggle, ConfirmDialog, Select } from '@/components/ui';
import { DEFAULT_WEIGHTS, normalizeWeights } from '@/engine/riskScoring';
import type { AppSettings, RiskWeights } from '@/types';

export function SettingsPage() {
  const navigate = useNavigate();
  const { state, dispatch, resetDemoData, logout } = useApp();
  const [displayName, setDisplayName] = useState(state.user?.displayName ?? '');
  const [email, setEmail] = useState(state.user?.email ?? '');
  const [simSpeed, setSimSpeed] = useState(state.settings.simulationSpeed);
  const [notifPrefs, setNotifPrefs] = useState(state.settings.notifications);
  const [weights, setWeights] = useState<RiskWeights>(state.settings.riskWeights);
  const [theme, setTheme] = useState(state.settings.theme);
  const [saveMsg, setSaveMsg] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSettingsResetConfirm, setShowSettingsResetConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [weightError, setWeightError] = useState('');

  const weightSum = weights.severity + weights.population + weights.medical + weights.infrastructure + weights.accessibility;

  const handleSave = () => {
    setWeightError('');
    let normalizedWeights = weights;
    if (weightSum !== 1) {
      normalizedWeights = normalizeWeights(weights);
      setWeights(normalizedWeights);
    }
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        simulationSpeed: simSpeed,
        notifications: notifPrefs,
        riskWeights: normalizedWeights,
        theme,
      },
    });
    if (state.user && displayName.trim() !== state.user.displayName) {
      dispatch({
        type: 'SET_USER',
        user: { ...state.user, displayName: displayName.trim(), email: email.trim() || null },
      });
    }
    setSaveMsg('Settings saved successfully.');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleResetSettings = () => {
    setSimSpeed(3);
    setNotifPrefs({
      incidentCreated: true, zoneCritical: true, resourceAllocated: true,
      vehicleAssigned: true, simulationFinished: true, demandUnmet: true,
    });
    setWeights({ ...DEFAULT_WEIGHTS });
    setTheme('dark-navy');
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        simulationSpeed: 3,
        notifications: {
          incidentCreated: true, zoneCritical: true, resourceAllocated: true,
          vehicleAssigned: true, simulationFinished: true, demandUnmet: true,
        },
        riskWeights: { ...DEFAULT_WEIGHTS },
        theme: 'dark-navy' as const,
      },
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleWeightChange = (key: keyof RiskWeights, value: number) => {
    setWeights(w => ({ ...w, [key]: Math.max(0, Math.min(1, value)) }));
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      {/* User profile */}
      <Card>
        <CardHeader title="User Profile" icon={<User className="w-4 h-4" />} />
        <div className="p-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input-field" maxLength={40} />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" maxLength={80} />
          </div>
          <div>
            <label className="label-field">Role</label>
            <div className="input-field flex items-center justify-between cursor-default">
              <span>{state.user?.role}</span>
              <Badge variant="info">Active</Badge>
            </div>
          </div>
          <div>
            <label className="label-field">Login Time</label>
            <div className="input-field flex items-center cursor-default">
              {state.user ? new Date(state.user.loginTime).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      </Card>

      {/* Theme preferences */}
      <Card>
        <CardHeader title="Theme Preferences" icon={<Shield className="w-4 h-4" />} />
        <div className="p-4">
          <Select
            label="Dashboard Theme"
            value={theme}
            onChange={v => setTheme(v as AppSettings['theme'])}
            options={[
              { value: 'dark-navy', label: 'Dark Navy (Default)' },
              { value: 'midnight', label: 'Midnight Blue' },
              { value: 'arctic', label: 'Arctic' },
            ]}
          />
          <p className="text-xs text-slate-600 mt-2">Theme selection is saved. The current prototype uses the Dark Navy theme.</p>
        </div>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader title="Notification Preferences" icon={<Bell className="w-4 h-4" />} />
        <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-1">
          <Toggle checked={notifPrefs.incidentCreated} onChange={v => setNotifPrefs(p => ({ ...p, incidentCreated: v }))} label="Incident Created" />
          <Toggle checked={notifPrefs.zoneCritical} onChange={v => setNotifPrefs(p => ({ ...p, zoneCritical: v }))} label="Zone Becomes Critical" />
          <Toggle checked={notifPrefs.resourceAllocated} onChange={v => setNotifPrefs(p => ({ ...p, resourceAllocated: v }))} label="Resource Allocated" />
          <Toggle checked={notifPrefs.vehicleAssigned} onChange={v => setNotifPrefs(p => ({ ...p, vehicleAssigned: v }))} label="Vehicle Assigned" />
          <Toggle checked={notifPrefs.simulationFinished} onChange={v => setNotifPrefs(p => ({ ...p, simulationFinished: v }))} label="Simulation Finished" />
          <Toggle checked={notifPrefs.demandUnmet} onChange={v => setNotifPrefs(p => ({ ...p, demandUnmet: v }))} label="Demand Remains Unmet" />
        </div>
      </Card>

      {/* Simulation preferences */}
      <Card>
        <CardHeader title="Simulation Preferences" icon={<Gauge className="w-4 h-4" />} />
        <div className="p-4">
          <label className="label-field">Simulation Speed: {simSpeed} ticks / {Math.max(200, Math.round(2000 / simSpeed))}ms interval</label>
          <input type="range" min={1} max={10} step={1} value={simSpeed} onChange={e => setSimSpeed(parseInt(e.target.value))} className="w-full accent-cyan-500" />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>Slow (1)</span><span>Fast (10)</span>
          </div>
        </div>
      </Card>

      {/* Risk scoring configuration */}
      <Card>
        <CardHeader title="Risk Scoring Configuration" subtitle="AI-Inspired weighted model — weights auto-normalize" icon={<Sliders className="w-4 h-4" />} />
        <div className="p-4 space-y-3">
          {([
            { key: 'severity', label: 'Disaster Severity' },
            { key: 'population', label: 'Population Affected' },
            { key: 'medical', label: 'Medical Urgency' },
            { key: 'infrastructure', label: 'Infrastructure Damage' },
            { key: 'accessibility', label: 'Accessibility Risk' },
          ] as { key: keyof RiskWeights; label: string }[]).map(item => (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{item.label}</span>
                <span className="text-xs text-slate-300 font-medium">{Math.round(weights[item.key] * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights[item.key]}
                onChange={e => handleWeightChange(item.key, parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-navy-700">
            <span className="text-slate-500">Weight Sum</span>
            <span className={weightSum === 1 ? 'text-success-400 font-medium' : 'text-amber-400 font-medium'}>
              {Math.round(weightSum * 100)}% {weightSum !== 1 && '(will auto-normalize on save)'}
            </span>
          </div>
          {weightError && <div className="text-xs text-danger-400">{weightError}</div>}
          <div className="panel p-3">
            <div className="text-xs font-semibold text-slate-300 mb-1">Formula</div>
            <code className="text-[11px] text-cyan-400 font-mono">
              priorityScore = severity×{weights.severity} + population×{weights.population} + medical×{weights.medical} + infrastructure×{weights.infrastructure} + accessibility×{weights.accessibility}
            </code>
          </div>
        </div>
      </Card>

      {/* Save / Reset */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-1.5">
            <Save className="w-4 h-4" /> Save Settings
          </button>
          <button onClick={() => setShowSettingsResetConfirm(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Reset Settings
          </button>
        </div>
        {saveMsg && <span className="text-xs text-success-400 animate-fade-in">{saveMsg}</span>}
      </div>

      {/* Data management */}
      <Card className="border-amber-500/20">
        <CardHeader title="Data Management" icon={<Database className="w-4 h-4" />} />
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between panel p-3">
            <div>
              <div className="text-sm text-slate-200">Reset Demo Data</div>
              <div className="text-xs text-slate-500 mt-0.5">Restore all incidents, zones, resources, and vehicles to default sample data.</div>
            </div>
            <button onClick={() => setShowResetConfirm(true)} className="btn-secondary text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
          <div className="flex items-center justify-between panel p-3">
            <div>
              <div className="text-sm text-slate-200">Log Out</div>
              <div className="text-xs text-slate-500 mt-0.5">Sign out of the command center and return to the landing page.</div>
            </div>
            <button onClick={() => setShowLogoutConfirm(true)} className="btn-danger text-sm flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={resetDemoData}
        title="Reset Demo Data"
        message="This will restore all data to default sample values. Your settings will be preserved. Continue?"
        confirmLabel="Reset Data"
        danger
      />
      <ConfirmDialog
        open={showSettingsResetConfirm}
        onClose={() => setShowSettingsResetConfirm(false)}
        onConfirm={handleResetSettings}
        title="Reset Settings"
        message="This will restore all settings to their default values. Continue?"
        confirmLabel="Reset Settings"
        danger
      />
      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="You will be signed out and returned to the landing page. Continue?"
        confirmLabel="Log Out"
        danger
      />
    </div>
  );
}
