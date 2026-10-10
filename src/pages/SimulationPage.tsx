import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  PlayCircle, Play, Pause, RotateCcw, Zap, FlaskConical, ChevronRight,
  AlertTriangle, Clock, TrendingUp, Package, Activity, SkipForward,
  Info,
} from 'lucide-react';
import { useApp, SCENARIOS } from '@/context/AppContext';
import { Card, CardHeader, Badge, EmptyState, ProgressBar } from '@/components/ui';
import { calculatePriority, priorityBg } from '@/engine/riskScoring';
import { baselineAllocation, optimizedAllocation, runFullOptimization, DEFAULT_OPT_CONFIG } from '@/engine/optimization';
import { initSimulation, startSimulation, pauseSimulation, resumeSimulation, tickSimulation, resetSimulation, runOptimizationOnly, makeResourceUnavailable } from '@/engine/simulation';
import { DEMO_STEPS } from '@/data/scenarios';
import type { SimulationStatus, Zone, Resource, OptimizationResult, OptimizationComparison } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

type Tab = 'simulation' | 'whatif' | 'demo';

export function SimulationPage() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<Tab>('simulation');
  const [scenarioId, setScenarioId] = useState(state.activeScenarioId);
  const [sim, setSim] = useState<SimulationStatus | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = useMemo(() => SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0], [scenarioId]);

  // Initialize simulation when scenario changes
  const loadSimulation = useCallback(() => {
    if (scenario) {
      setSim(initSimulation(scenario));
      dispatch({ type: 'SET_SCENARIO', scenarioId: scenario.id });
    }
  }, [scenario, dispatch]);

  useEffect(() => {
    if (!sim) loadSimulation();
  }, [sim, loadSimulation]);

  // Timer effect
  useEffect(() => {
    if (sim?.state === 'running') {
      const speed = state.settings.simulationSpeed;
      const intervalMs = Math.max(200, Math.round(2000 / speed));
      timerRef.current = setInterval(() => {
        setSim(prev => prev ? tickSimulation(prev) : prev);
      }, intervalMs);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [sim?.state, state.settings.simulationSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleStart = () => { if (sim) setSim(startSimulation(sim)); };
  const handlePause = () => { if (sim) setSim(pauseSimulation(sim)); if (timerRef.current) clearInterval(timerRef.current); };
  const handleResume = () => { if (sim) setSim(resumeSimulation(sim)); };
  const handleReset = () => { if (scenario) setSim(resetSimulation(scenario)); };
  const handleOptimize = () => { if (sim) setSim(runOptimizationOnly(sim)); };
  const handleScenarioChange = (id: string) => {
    setScenarioId(id);
    const s = SCENARIOS.find(x => x.id === id);
    if (s) {
      setSim(initSimulation(s));
      dispatch({ type: 'SET_SCENARIO', scenarioId: id });
      dispatch({ type: 'LOAD_SCENARIO_DATA', zones: s.zones.map(z => ({ ...z, demand: { ...z.demand } })), resources: s.resources.map(r => ({ ...r })), vehicles: s.vehicles.map(v => ({ ...v })) });
    }
  };

  if (!sim) {
    return (
      <Card>
        <EmptyState icon={<PlayCircle className="w-7 h-7" />} title="Initializing..." message="Loading simulation data." />
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'simulation' as Tab, label: 'Live Simulation', icon: PlayCircle },
          { id: 'whatif' as Tab, label: 'What-If Analysis', icon: FlaskConical },
          { id: 'demo' as Tab, label: 'Guided Demo', icon: Activity },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-all ${
                tab === t.id ? 'bg-cyan-600/15 border-cyan-500 text-cyan-300' : 'bg-navy-850 border-navy-700 text-slate-400 hover:border-cyan-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'simulation' && (
        <LiveSimulation
          sim={sim}
          scenarioId={scenarioId}
          onScenarioChange={handleScenarioChange}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onOptimize={handleOptimize}
          riskWeights={state.settings.riskWeights}
        />
      )}
      {tab === 'whatif' && <WhatIfAnalysis sim={sim} riskWeights={state.settings.riskWeights} />}
      {tab === 'demo' && <GuidedDemo riskWeights={state.settings.riskWeights} />}
    </div>
  );
}

// ============================================================
// Live Simulation Tab
// ============================================================

function LiveSimulation({ sim, scenarioId, onScenarioChange, onStart, onPause, onResume, onReset, onOptimize, riskWeights }: {
  sim: SimulationStatus;
  scenarioId: string;
  onScenarioChange: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onOptimize: () => void;
  riskWeights: typeof DEFAULT_OPT_CONFIG.weights;
}) {
  const comparison: OptimizationComparison = useMemo(() => ({
    baseline: sim.baseline!,
    optimized: sim.optimized!,
    improvement: sim.baseline!.allocationScore > 0
      ? Math.round(((sim.optimized!.allocationScore - sim.baseline!.allocationScore) / sim.baseline!.allocationScore) * 100)
      : 0,
    scoreDelta: sim.optimized!.allocationScore - sim.baseline!.allocationScore,
  }), [sim.baseline, sim.optimized]);

  const zoneData = useMemo(() => {
    return sim.zones.map(z => {
      const p = calculatePriority(z, riskWeights);
      return { name: z.id, score: p.score, category: p.category, population: z.populationAffected };
    });
  }, [sim.zones, riskWeights]);

  const stateColor = { idle: 'text-slate-400', running: 'text-success-400', paused: 'text-amber-400', completed: 'text-cyan-400', error: 'text-danger-400' };
  const stateBg = { idle: 'bg-navy-700', running: 'bg-success-500/20 border-success-500/40', paused: 'bg-amber-500/15 border-amber-500/40', completed: 'bg-cyan-500/15 border-cyan-500/40', error: 'bg-danger-500/15 border-danger-500/40' };

  return (
    <>
      {/* Control bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={scenarioId} onChange={e => onScenarioChange(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
              {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 ${stateBg[sim.state]}`}>
              <span className={`status-dot ${sim.state === 'running' ? 'bg-success-400 animate-pulse' : sim.state === 'paused' ? 'bg-amber-400' : sim.state === 'completed' ? 'bg-cyan-400' : 'bg-slate-500'}`} />
              <span className={stateColor[sim.state]}>{sim.state.charAt(0).toUpperCase() + sim.state.slice(1)}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {sim.simTime}
            </div>
            <div className="text-xs text-slate-500">Tick: {sim.tick}/24</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {sim.state === 'idle' || sim.state === 'completed' ? (
              <button onClick={onStart} className="btn-primary text-sm flex items-center gap-1.5">
                <Play className="w-4 h-4" /> Start
              </button>
            ) : sim.state === 'running' ? (
              <button onClick={onPause} className="btn-secondary text-sm flex items-center gap-1.5">
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : (
              <button onClick={onResume} className="btn-primary text-sm flex items-center gap-1.5">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            <button onClick={onReset} className="btn-secondary text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={onOptimize} className="btn-secondary text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Optimize
            </button>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={sim.tick} max={24} color={sim.state === 'completed' ? 'cyan' : 'success'} />
        </div>
      </Card>

      {/* Optimization comparison */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Baseline Allocation" subtitle="Proportional by population" icon={<TrendingUp className="w-4 h-4" />} />
          <div className="p-4 space-y-2">
            <ResultMetrics result={sim.baseline!} />
          </div>
        </Card>
        <Card className="border-cyan-700/40">
          <CardHeader
            title="Quantum-Inspired Optimization"
            subtitle="Classical Simulation — QUBO-inspired"
            icon={<Zap className="w-4 h-4" />}
            action={<Badge variant="info">+{comparison.improvement}%</Badge>}
          />
          <div className="p-4 space-y-2">
            <ResultMetrics result={sim.optimized!} highlight />
          </div>
        </Card>
      </div>

      {/* Zone priorities chart */}
      <Card>
        <CardHeader title="Zone Priority Scores" subtitle="Live priority calculations" icon={<AlertTriangle className="w-4 h-4" />} />
        <div className="p-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162038" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1f2d4d' }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1f2d4d' }} />
              <Tooltip contentStyle={{ background: '#111a2e', border: '1px solid #1f2d4d', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {zoneData.map((entry, i) => (
                  <Cell key={i} fill={entry.category === 'Critical' ? '#ef4444' : entry.category === 'High' ? '#f59e0b' : entry.category === 'Moderate' ? '#22d3ee' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Zone table + assignment list */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Affected Zones" subtitle={`${sim.zones.length} zones`} icon={<AlertTriangle className="w-4 h-4" />} />
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy-850">
                <tr className="border-b border-navy-700 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left p-2 font-medium">Zone</th>
                  <th className="text-left p-2 font-medium">Severity</th>
                  <th className="text-left p-2 font-medium">Pop.</th>
                  <th className="text-left p-2 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {sim.zones.map(z => {
                  const p = calculatePriority(z, riskWeights);
                  return (
                    <tr key={z.id} className="hover:bg-navy-800/50">
                      <td className="p-2 text-slate-200 font-medium text-xs">{z.id}</td>
                      <td className="p-2 text-slate-400 text-xs">{z.severity}</td>
                      <td className="p-2 text-slate-400 text-xs">{z.populationAffected.toLocaleString()}</td>
                      <td className="p-2"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityBg(p.category)}`}>{p.score}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recommended Assignments" subtitle="From optimized allocation" icon={<Package className="w-4 h-4" />} />
          <div className="p-4 max-h-80 overflow-y-auto space-y-2">
            {sim.optimized!.assignments.length === 0 ? (
              <EmptyState icon={<Package className="w-6 h-6" />} title="No Assignments" message="No allocation recommendations." />
            ) : (
              sim.optimized!.assignments.map((a, i) => (
                <div key={i} className="panel p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="status-dot bg-cyan-400" />
                    <span className="text-xs text-slate-200">{a.quantity} × {a.resourceType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">→ Zone {a.zoneId}</span>
                    <Badge variant={a.priorityScore >= 75 ? 'critical' : a.priorityScore >= 50 ? 'high' : 'moderate'}>{a.priorityScore}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Optimization explanation */}
      <Card>
        <CardHeader title="Allocation Explanation" subtitle="Reasoning behind optimized decisions" icon={<Info className="w-4 h-4" />} />
        <div className="p-4 space-y-1.5">
          {sim.optimized!.explanation.map((line, i) => (
            <div key={i} className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
              <ChevronRight className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />
              {line}
            </div>
          ))}
        </div>
      </Card>

      {/* Simulation log */}
      <Card>
        <CardHeader title="Simulation Log" subtitle={`${sim.log.length} events`} icon={<Activity className="w-4 h-4" />} />
        <div className="p-4 max-h-48 overflow-y-auto space-y-1">
          {sim.log.slice(-20).reverse().map((line, i) => (
            <div key={i} className="text-xs text-slate-500 font-momo leading-relaxed flex items-start gap-2">
              <span className="text-cyan-600 shrink-0">›</span> {line}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function ResultMetrics({ result, highlight }: { result: OptimizationResult; highlight?: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className={`panel p-3 ${highlight ? 'border-cyan-700/30' : ''}`}>
          <div className="text-xs text-slate-500 mb-1">Allocation Score</div>
          <div className={`text-xl font-bold ${highlight ? 'text-cyan-300' : 'text-slate-200'}`}>{result.allocationScore}/100</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Unmet Demand</div>
          <div className={`text-xl font-bold ${result.totalUnmetDemand > 0 ? 'text-amber-400' : 'text-success-400'}`}>{result.totalUnmetDemand}</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Utilization</div>
          <div className="text-xl font-bold text-slate-200">{result.utilizationRate}%</div>
          <ProgressBar value={result.utilizationRate} color={result.utilizationRate > 80 ? 'danger' : 'cyan'} />
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Constraint Violations</div>
          <div className={`text-xl font-bold ${result.constraintViolations > 0 ? 'text-danger-400' : 'text-success-400'}`}>{result.constraintViolations}</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Total Allocated</span>
        <span className="text-slate-300 font-medium">{result.totalAllocated} units</span>
      </div>
    </>
  );
}

// ============================================================
// What-If Analysis Tab
// ============================================================

function WhatIfAnalysis({ sim, riskWeights }: { sim: SimulationStatus; riskWeights: typeof DEFAULT_OPT_CONFIG.weights }) {
  const [modAmbulances, setModAmbulances] = useState(0);
  const [modRescueTeams, setModRescueTeams] = useState(0);
  const [modMedicalKits, setModMedicalKits] = useState(0);
  const [modPopFactor, setModPopFactor] = useState(100);
  const [modSeverityChange, setModSeverityChange] = useState('none');
  const [modBlockRoad, setModBlockRoad] = useState('none');

  const baselineResult = useMemo(() => sim.optimized!, [sim.optimized]);

  const modifiedResult = useMemo(() => {
    // Clone zones with modifications
    let zones: Zone[] = sim.zones.map(z => ({ ...z, demand: { ...z.demand } }));

    // Population factor
    if (modPopFactor !== 100) {
      const factor = modPopFactor / 100;
      zones = zones.map(z => ({ ...z, populationAffected: Math.round(z.populationAffected * factor) }));
    }

    // Severity change
    if (modSeverityChange !== 'none') {
      zones = zones.map(z => {
        if (modSeverityChange === 'increase' && z.severity !== 'Critical') {
          const order = ['Low', 'Moderate', 'High', 'Critical'];
          const next = order[Math.min(order.indexOf(z.severity) + 1, 3)];
          return { ...z, severity: next as typeof z.severity };
        }
        if (modSeverityChange === 'decrease' && z.severity !== 'Low') {
          const order = ['Low', 'Moderate', 'High', 'Critical'];
          const prev = order[Math.max(order.indexOf(z.severity) - 1, 0)];
          return { ...z, severity: prev as typeof z.severity };
        }
        return z;
      });
    }

    // Clone resources with modifications
    let resources: Resource[] = sim.resources.map(r => ({ ...r }));

    if (modAmbulances !== 0) {
      resources = resources.map(r => r.type === 'Ambulance'
        ? { ...r, available: Math.max(0, r.available + modAmbulances), total: Math.max(0, r.total + modAmbulances) }
        : r
      );
    }
    if (modRescueTeams !== 0) {
      resources = resources.map(r => r.type === 'Rescue Team'
        ? { ...r, available: Math.max(0, r.available + modRescueTeams), total: Math.max(0, r.total + modRescueTeams) }
        : r
      );
    }
    if (modMedicalKits !== 0) {
      resources = resources.map(r => r.type === 'Medical Kit'
        ? { ...r, available: Math.max(0, r.available + modMedicalKits), total: Math.max(0, r.total + modMedicalKits) }
        : r
      );
    }

    try {
      const config = { weights: riskWeights, travelCostWeight: 0.3, constraintPenalty: 50 };
      return optimizedAllocation(zones, resources, config);
    } catch {
      return null;
    }
  }, [sim.zones, sim.resources, modAmbulances, modRescueTeams, modMedicalKits, modPopFactor, modSeverityChange, riskWeights]);

  const hasChanges = modAmbulances !== 0 || modRescueTeams !== 0 || modMedicalKits !== 0 || modPopFactor !== 100 || modSeverityChange !== 'none';

  const handleReset = () => {
    setModAmbulances(0);
    setModRescueTeams(0);
    setModMedicalKits(0);
    setModPopFactor(100);
    setModSeverityChange('none');
    setModBlockRoad('none');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="What-If Scenario Analysis" subtitle="Modify parameters and compare with baseline" icon={<FlaskConical className="w-4 h-4" />} />
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ambulances */}
          <div>
            <label className="label-field">Ambulances Adjustment</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setModAmbulances(v => v - 1)} className="btn-ghost px-2 py-1 text-lg">−</button>
              <input type="number" value={modAmbulances} onChange={e => setModAmbulances(parseInt(e.target.value) || 0)} className="input-field text-center" />
              <button onClick={() => setModAmbulances(v => v + 1)} className="btn-ghost px-2 py-1 text-lg">+</button>
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Current available: {sim.resources.filter(r => r.type === 'Ambulance').reduce((s, r) => s + r.available, 0)}</div>
          </div>
          {/* Rescue Teams */}
          <div>
            <label className="label-field">Rescue Teams Adjustment</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setModRescueTeams(v => v - 1)} className="btn-ghost px-2 py-1 text-lg">−</button>
              <input type="number" value={modRescueTeams} onChange={e => setModRescueTeams(parseInt(e.target.value) || 0)} className="input-field text-center" />
              <button onClick={() => setModRescueTeams(v => v + 1)} className="btn-ghost px-2 py-1 text-lg">+</button>
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Current available: {sim.resources.filter(r => r.type === 'Rescue Team').reduce((s, r) => s + r.available, 0)}</div>
          </div>
          {/* Medical Kits */}
          <div>
            <label className="label-field">Medical Kits Adjustment</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setModMedicalKits(v => v - 10)} className="btn-ghost px-2 py-1 text-lg">−</button>
              <input type="number" value={modMedicalKits} onChange={e => setModMedicalKits(parseInt(e.target.value) || 0)} className="input-field text-center" />
              <button onClick={() => setModMedicalKits(v => v + 10)} className="btn-ghost px-2 py-1 text-lg">+</button>
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Current available: {sim.resources.filter(r => r.type === 'Medical Kit').reduce((s, r) => s + r.available, 0)}</div>
          </div>
          {/* Population */}
          <div>
            <label className="label-field">Population Affected: {modPopFactor}%</label>
            <input type="range" min={50} max={200} step={10} value={modPopFactor} onChange={e => setModPopFactor(parseInt(e.target.value))} className="w-full accent-cyan-500" />
          </div>
          {/* Severity */}
          <div>
            <label className="label-field">Zone Severity Change</label>
            <select value={modSeverityChange} onChange={e => setModSeverityChange(e.target.value)} className="input-field cursor-pointer">
              <option value="none">No Change</option>
              <option value="increase">Increase All by 1 Level</option>
              <option value="decrease">Decrease All by 1 Level</option>
            </select>
          </div>
          {/* Road blockage */}
          <div>
            <label className="label-field">Road Blockage Toggle</label>
            <select value={modBlockRoad} onChange={e => setModBlockRoad(e.target.value)} className="input-field cursor-pointer">
              <option value="none">No Change</option>
              <option value="block">Block All Restricted Roads</option>
              <option value="unblock">Unblock All Roads</option>
            </select>
          </div>
        </div>
        <div className="px-4 pb-4 flex justify-end">
          <button onClick={handleReset} className="btn-secondary text-sm flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Reset to Baseline
          </button>
        </div>
      </Card>

      {/* Comparison */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Baseline Results" icon={<TrendingUp className="w-4 h-4" />} />
          <div className="p-4"><ResultMetrics result={baselineResult} /></div>
        </Card>
        <Card className={hasChanges ? 'border-cyan-700/40' : ''}>
          <CardHeader title="Modified Results" subtitle={hasChanges ? 'With what-if changes applied' : 'No changes made'} icon={<FlaskConical className="w-4 h-4" />} />
          <div className="p-4">
            {modifiedResult ? <ResultMetrics result={modifiedResult} highlight /> : <EmptyState icon={<FlaskConical className="w-6 h-6" />} title="Calculation Error" message="Could not compute modified results." />}
          </div>
        </Card>
      </div>

      {/* Differences */}
      {modifiedResult && hasChanges && (
        <Card>
          <CardHeader title="Differences" subtitle="Baseline vs Modified" icon={<TrendingUp className="w-4 h-4" />} />
          <div className="p-4 space-y-2">
            <DiffRow label="Allocation Score" baseline={baselineResult.allocationScore} modified={modifiedResult.allocationScore} />
            <DiffRow label="Unmet Demand" baseline={baselineResult.totalUnmetDemand} modified={modifiedResult.totalUnmetDemand} invertGood />
            <DiffRow label="Utilization Rate" baseline={baselineResult.utilizationRate} modified={modifiedResult.utilizationRate} suffix="%" />
            <DiffRow label="Total Allocated" baseline={baselineResult.totalAllocated} modified={modifiedResult.totalAllocated} />
            <DiffRow label="Constraint Violations" baseline={baselineResult.constraintViolations} modified={modifiedResult.constraintViolations} invertGood />
            <div className="panel p-3 mt-3">
              <div className="text-xs font-semibold text-slate-300 mb-1">Explanation</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {modifiedResult.allocationScore > baselineResult.allocationScore
                  ? `The modified scenario improves the allocation score by ${modifiedResult.allocationScore - baselineResult.allocationScore} points. `
                  : modifiedResult.allocationScore < baselineResult.allocationScore
                  ? `The modified scenario decreases the allocation score by ${baselineResult.allocationScore - modifiedResult.allocationScore} points. `
                  : 'No change in allocation score. '
                }
                {modifiedResult.totalUnmetDemand < baselineResult.totalUnmetDemand
                  ? `Unmet demand reduced by ${baselineResult.totalUnmetDemand - modifiedResult.totalUnmetDemand} units.`
                  : modifiedResult.totalUnmetDemand > baselineResult.totalUnmetDemand
                  ? `Unmet demand increased by ${modifiedResult.totalUnmetDemand - baselineResult.totalUnmetDemand} units.`
                  : 'Unmet demand unchanged.'
                }
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function DiffRow({ label, baseline, modified, invertGood, suffix }: { label: string; baseline: number; modified: number; invertGood?: boolean; suffix?: string }) {
  const diff = modified - baseline;
  const isGood = invertGood ? diff < 0 : diff > 0;
  const isBad = invertGood ? diff > 0 : diff < 0;
  return (
    <div className="flex items-center justify-between panel p-2.5">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500">{baseline}{suffix}</span>
        <span className="text-slate-600">→</span>
        <span className="text-slate-200 font-medium">{modified}{suffix}</span>
        {diff !== 0 && (
          <span className={`font-medium ${isGood ? 'text-success-400' : isBad ? 'text-danger-400' : 'text-amber-400'}`}>
            {diff > 0 ? '+' : ''}{diff}{suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Guided Demo Tab
// ============================================================

function GuidedDemo({ riskWeights }: { riskWeights: typeof DEFAULT_OPT_CONFIG.weights }) {
  const floodScenario = SCENARIOS[0]; // Flood Emergency
  const [step, setStep] = useState(0);
  const [sim, setSim] = useState<SimulationStatus>(() => initSimulation(floodScenario));

  const handleNext = () => {
    if (step >= DEMO_STEPS.length - 1) return;
    const nextStep = step + 1;
    setStep(nextStep);

    // Step 10: Simulate resource becoming unavailable
    if (nextStep === 9) {
      setSim(prev => makeResourceUnavailable(prev, 'Ambulance', 5));
    }
    // Step 11: Recalculate
    if (nextStep === 10) {
      setSim(prev => runOptimizationOnly(prev));
    }
  };

  const handleReset = () => {
    setStep(0);
    setSim(initSimulation(floodScenario));
  };

  const handleStart = () => {
    setStep(0);
    setSim(initSimulation(floodScenario));
    setStep(1);
  };

  const currentStep = DEMO_STEPS[step];
  const isLastStep = step === DEMO_STEPS.length - 1;

  return (
    <div className="space-y-4">
      {/* Demo controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Guided Flood Emergency Demonstration</h3>
            <p className="text-xs text-slate-500 mt-0.5">Fictional scenario — 6 flood-affected zones with deterministic data</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleStart} className="btn-primary text-sm flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Start Demo
            </button>
            <button onClick={handleNext} disabled={step === 0 || isLastStep} className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50">
              <SkipForward className="w-4 h-4" /> Next Step
            </button>
            <button onClick={handleReset} className="btn-secondary text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </Card>

      {/* Progress indicator */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-xs text-slate-500">Step {step === 0 ? 0 : step} of {DEMO_STEPS.length}</div>
          <ProgressBar value={step} max={DEMO_STEPS.length} color="cyan" />
        </div>
        {currentStep && step > 0 && (
          <div className="panel p-3 border-cyan-700/30 animate-slide-down">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">{step}</span>
              <span className="text-sm font-semibold text-cyan-300">{currentStep.title}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-7">{currentStep.description}</p>
          </div>
        )}
      </Card>

      {/* Demo content based on step */}
      {step > 0 && (
        <>
          {/* Steps 1-3: Zones and risk scores */}
          {step <= 3 && (
            <Card>
              <CardHeader title="Affected Zones & Risk Scores" icon={<AlertTriangle className="w-4 h-4" />} />
              <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sim.zones.map(z => {
                  const p = calculatePriority(z, riskWeights);
                  return (
                    <div key={z.id} className="panel p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-200">{z.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityBg(p.category)}`}>{p.score} · {p.category}</span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <div>Population: <span className="text-slate-300">{z.populationAffected.toLocaleString()}</span></div>
                        <div>Severity: <span className="text-slate-300">{z.severity}</span></div>
                        <div>Medical: <span className="text-slate-300">{z.medicalUrgency}</span></div>
                        <div>Access: <span className="text-slate-300">{z.accessibility}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Step 4: Available resources */}
          {step === 4 && (
            <Card>
              <CardHeader title="Available Resources" icon={<Package className="w-4 h-4" />} />
              <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(['Ambulance', 'Rescue Team', 'Fire Engine', 'Medical Kit', 'Food & Water', 'Shelter'] as const).map(t => {
                  const total = sim.resources.filter(r => r.type === t).reduce((s, r) => s + r.available, 0);
                  return (
                    <div key={t} className="panel p-3 text-center">
                      <div className="text-2xl font-bold text-cyan-300">{total}</div>
                      <div className="text-xs text-slate-500 mt-1">{t}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Steps 5-8: Allocation comparison */}
          {step >= 5 && step <= 8 && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader title="Baseline Allocation" icon={<TrendingUp className="w-4 h-4" />} />
                <div className="p-4"><ResultMetrics result={sim.baseline!} /></div>
              </Card>
              <Card className="border-cyan-700/40">
                <CardHeader title="Quantum-Inspired Optimization" subtitle="Classical Simulation" icon={<Zap className="w-4 h-4" />} />
                <div className="p-4"><ResultMetrics result={sim.optimized!} highlight /></div>
              </Card>
            </div>
          )}

          {/* Step 7: Comparison detail */}
          {step === 7 && (
            <Card>
              <CardHeader title="Baseline vs Optimized Comparison" icon={<TrendingUp className="w-4 h-4" />} />
              <div className="p-4 space-y-2">
                <DiffRow label="Allocation Score" baseline={sim.baseline!.allocationScore} modified={sim.optimized!.allocationScore} />
                <DiffRow label="Unmet Demand" baseline={sim.baseline!.totalUnmetDemand} modified={sim.optimized!.totalUnmetDemand} invertGood />
                <DiffRow label="Utilization" baseline={sim.baseline!.utilizationRate} modified={sim.optimized!.utilizationRate} suffix="%" />
                <DiffRow label="Total Allocated" baseline={sim.baseline!.totalAllocated} modified={sim.optimized!.totalAllocated} />
              </div>
            </Card>
          )}

          {/* Step 8: Explanation */}
          {step === 8 && (
            <Card>
              <CardHeader title="Allocation Decision Explanations" icon={<Info className="w-4 h-4" />} />
              <div className="p-4 space-y-1.5">
                {sim.optimized!.explanation.map((line, i) => (
                  <div key={i} className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />{line}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Step 9: Unmet demand */}
          {step === 9 && (
            <Card>
              <CardHeader title="Unmet Demand Analysis" icon={<AlertTriangle className="w-4 h-4" />} />
              <div className="p-4">
                {sim.optimized!.totalUnmetDemand === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-success-400 text-3xl font-bold mb-2">0</div>
                    <div className="text-sm text-slate-400">All demand fulfilled — no unmet demand.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="panel p-3 text-center">
                      <div className="text-amber-400 text-3xl font-bold">{sim.optimized!.totalUnmetDemand}</div>
                      <div className="text-xs text-slate-500 mt-1">Total unmet demand units</div>
                    </div>
                    <p className="text-xs text-slate-500">The optimizer prioritized the most urgent zones. Some lower-priority zones may have unmet demand due to resource constraints.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Steps 10-11: Resource unavailability + recalculation */}
          {step >= 10 && (
            <>
              <Card className="border-amber-500/30">
                <CardHeader title="Resource Unavailability Simulation" subtitle="5 ambulances removed from inventory" icon={<AlertTriangle className="w-4 h-4" />} />
                <div className="p-4 grid lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Ambulances available after reduction:</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {sim.resources.filter(r => r.type === 'Ambulance').reduce((s, r) => s + r.available, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-2">New Optimization Score:</div>
                    <div className="text-2xl font-bold text-cyan-300">{sim.optimized!.allocationScore}</div>
                    <div className="text-xs text-slate-500 mt-1">Unmet demand: {sim.optimized!.totalUnmetDemand}</div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Recalculated Allocations" subtitle="With reduced ambulance availability" icon={<Zap className="w-4 h-4" />} />
                <div className="p-4">
                  <ResultMetrics result={sim.optimized!} highlight />
                  <div className="mt-4 space-y-1.5">
                    {sim.optimized!.explanation.map((line, i) => (
                      <div key={i} className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />{line}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Demo complete */}
          {isLastStep && (
            <Card className="p-6 text-center border-success-500/30">
              <div className="w-12 h-12 rounded-full bg-success-500/15 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-success-400" />
              </div>
              <h3 className="text-sm font-semibold text-success-400 mb-1">Demo Complete</h3>
              <p className="text-xs text-slate-500 mb-4">You've walked through the full flood emergency demonstration.</p>
              <button onClick={handleReset} className="btn-primary text-sm inline-flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Run Again
              </button>
            </Card>
          )}
        </>
      )}

      {step === 0 && (
        <Card>
          <EmptyState
            icon={<PlayCircle className="w-8 h-8" />}
            title="Flood Emergency Demo"
            message="This guided demo walks through 11 steps: loading the flood scenario, calculating risk scores, running baseline and quantum-inspired optimization, comparing results, and simulating resource unavailability."
            action={<button onClick={handleStart} className="btn-primary text-sm flex items-center gap-1.5"><Play className="w-4 h-4" /> Start Demo</button>}
          />
        </Card>
      )}
    </div>
  );
}
