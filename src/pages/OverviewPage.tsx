import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Map, Zap, Play, RotateCcw, TrendingUp,
  Activity, Package, Truck, Users, Clock, ChevronRight,
  Edit, Trash2, LogIn, Database,
} from 'lucide-react';
import { useApp, SCENARIOS } from '@/context/AppContext';
import { Card, CardHeader, StatCard, Badge, ProgressBar, EmptyState, formatRelativeTime, severityBadge } from '@/components/ui';
import { calculatePriority, priorityBg } from '@/engine/riskScoring';
import { runFullOptimization } from '@/engine/optimization';
import type { ActivityEntry } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  Activity, AlertTriangle, Package, Truck, Edit, Trash2, LogIn, Database,
};

export function OverviewPage() {
  const navigate = useNavigate();
  const { state, dispatch, resetDemoData } = useApp();

  const stats = useMemo(() => {
    const activeIncidents = state.incidents.filter(i => i.status !== 'Resolved').length;
    const criticalZones = state.zones.filter(z => {
      const p = calculatePriority(z, state.settings.riskWeights);
      return p.category === 'Critical';
    }).length;
    const availableAmbulances = state.resources
      .filter(r => r.type === 'Ambulance')
      .reduce((s, r) => s + r.available, 0);
    const availableRescueTeams = state.resources
      .filter(r => r.type === 'Rescue Team')
      .reduce((s, r) => s + r.available, 0);
    const totalAvailable = state.resources.reduce((s, r) => s + r.available, 0);
    const totalAllocated = state.resources.reduce((s, r) => s + r.allocated, 0);
    const totalDemand = state.zones.reduce((s, z) =>
      s + Object.values(z.demand).reduce((d, v) => d + (v ?? 0), 0), 0);
    const unmetDemand = Math.max(0, totalDemand - totalAllocated);

    return {
      activeIncidents, criticalZones, availableAmbulances, availableRescueTeams,
      resourcesAllocated: totalAllocated, unmetDemand, totalAvailable,
    };
  }, [state.incidents, state.zones, state.resources, state.settings.riskWeights]);

  const severityData = useMemo(() => {
    const counts = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
    state.incidents.forEach(i => { counts[i.severity]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [state.incidents]);

  const zonePriorityData = useMemo(() => {
    return state.zones.slice(0, 8).map(z => {
      const p = calculatePriority(z, state.settings.riskWeights);
      return { name: z.id, score: p.score, category: p.category };
    });
  }, [state.zones, state.settings.riskWeights]);

  const utilizationData = useMemo(() => {
    const types = ['Ambulance', 'Rescue Team', 'Fire Engine', 'Medical Kit', 'Food & Water', 'Shelter'] as const;
    return types.map(t => {
      const resources = state.resources.filter(r => r.type === t);
      const total = resources.reduce((s, r) => s + r.total, 0);
      const allocated = resources.reduce((s, r) => s + r.allocated, 0);
      return {
        name: t,
        allocated,
        available: total - allocated,
        utilization: total > 0 ? Math.round((allocated / total) * 100) : 0,
      };
    });
  }, [state.resources]);

  const optimization = useMemo(() => {
    try {
      return runFullOptimization(state.zones, state.resources, {
        weights: state.settings.riskWeights,
        travelCostWeight: 0.3,
        constraintPenalty: 50,
      });
    } catch {
      return null;
    }
  }, [state.zones, state.resources, state.settings.riskWeights]);

  const recentIncidents = state.incidents.slice(0, 5);
  const recentAllocations = state.allocations.slice(0, 5);
  const vehicleStatuses = useMemo(() => {
    const counts: Record<string, number> = {};
    state.vehicles.forEach(v => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [state.vehicles]);

  const handleScenarioChange = (scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    dispatch({ type: 'SET_SCENARIO', scenarioId });
    dispatch({
      type: 'LOAD_SCENARIO_DATA',
      zones: scenario.zones.map(z => ({ ...z, demand: { ...z.demand } })),
      resources: scenario.resources.map(r => ({ ...r })),
      vehicles: scenario.vehicles.map(v => ({ ...v })),
    });
  };

  const SEVERITY_COLORS: Record<string, string> = {
    Critical: '#ef4444', High: '#f59e0b', Moderate: '#22d3ee', Low: '#22c55e',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top bar with scenario selector + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-slate-500 uppercase tracking-wider">Scenario:</label>
          <select
            value={state.activeScenarioId}
            onChange={e => handleScenarioChange(e.target.value)}
            className="input-field-auto py-1.5 text-sm cursor-pointer"
            style={{ width: 'auto' }}
          >
            {SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/app/simulation')} className="btn-secondary text-xs flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Start Demo
          </button>
          <button onClick={resetDemoData} className="btn-secondary text-xs flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Active Incidents" value={stats.activeIncidents} icon={<AlertTriangle className="w-5 h-5" />} color="amber" />
        <StatCard label="Critical Zones" value={stats.criticalZones} icon={<Map className="w-5 h-5" />} color="danger" />
        <StatCard label="Available Ambulances" value={stats.availableAmbulances} icon={<Truck className="w-5 h-5" />} color="cyan" />
        <StatCard label="Rescue Teams" value={stats.availableRescueTeams} icon={<Users className="w-5 h-5" />} color="success" />
        <StatCard label="Resources Allocated" value={stats.resourcesAllocated} icon={<Package className="w-5 h-5" />} color="blue" />
        <StatCard label="Unmet Demand" value={stats.unmetDemand} icon={<TrendingUp className="w-5 h-5" />} color="danger" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Create Incident', icon: AlertTriangle, path: '/app/incidents', color: 'text-amber-400' },
          { label: 'Open Disaster Map', icon: Map, path: '/app/map', color: 'text-cyan-400' },
          { label: 'Optimize Allocation', icon: Zap, path: '/app/simulation', color: 'text-success-400' },
          { label: 'Run Simulation', icon: Play, path: '/app/simulation', color: 'text-cyan-400' },
        ].map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(a.path)}
              className="panel-hover p-4 flex items-center gap-3 text-left"
            >
              <Icon className={`w-5 h-5 ${a.color}`} />
              <span className="text-sm font-medium text-slate-200 flex-1">{a.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Severity distribution */}
        <Card>
          <CardHeader title="Incident Severity Distribution" icon={<AlertTriangle className="w-4 h-4" />} />
          <div className="p-4 h-56">
            {state.incidents.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="w-6 h-6" />} title="No incidents" message="No incidents to display." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111a2e', border: '1px solid #1f2d4d', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Zone priority */}
        <Card>
          <CardHeader title="Zone Priority Scores" subtitle="Top zones by priority" icon={<Map className="w-4 h-4" />} />
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zonePriorityData}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1f2d4d' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1f2d4d' }} />
                <Tooltip
                  contentStyle={{ background: '#111a2e', border: '1px solid #1f2d4d', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {zonePriorityData.map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.category] ?? '#22d3ee'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Vehicle status */}
        <Card>
          <CardHeader title="Vehicle Status" icon={<Truck className="w-4 h-4" />} />
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vehicleStatuses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {vehicleStatuses.map((_, i) => (
                    <Cell key={i} fill={['#22c55e', '#22d3ee', '#f59e0b', '#ef4444', '#64748b'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111a2e', border: '1px solid #1f2d4d', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Resource utilization + optimization preview */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Resource Utilization" subtitle="Allocated vs available by type" icon={<Package className="w-4 h-4" />} />
          <div className="p-4 space-y-3">
            {utilizationData.map(u => (
              <div key={u.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{u.name}</span>
                  <span className="text-xs text-slate-500">{u.allocated} / {u.allocated + u.available} ({u.utilization}%)</span>
                </div>
                <ProgressBar value={u.utilization} color={u.utilization > 80 ? 'danger' : u.utilization > 50 ? 'amber' : 'cyan'} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Optimization Preview"
            subtitle="Baseline vs Quantum-Inspired"
            icon={<Zap className="w-4 h-4" />}
            action={<button onClick={() => navigate('/app/simulation')} className="btn-ghost text-xs">Details →</button>}
          />
          <div className="p-4 space-y-3">
            {optimization ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="panel p-3">
                    <div className="text-xs text-slate-500 mb-1">Baseline Score</div>
                    <div className="text-xl font-bold text-slate-200">{optimization.baseline.allocationScore}</div>
                    <div className="text-xs text-slate-500 mt-1">Unmet: {optimization.baseline.totalUnmetDemand}</div>
                  </div>
                  <div className="panel p-3 border-cyan-700/40">
                    <div className="text-xs text-cyan-400 mb-1">Optimized Score</div>
                    <div className="text-xl font-bold text-cyan-300">{optimization.optimized.allocationScore}</div>
                    <div className="text-xs text-slate-500 mt-1">Unmet: {optimization.optimized.totalUnmetDemand}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className={`w-4 h-4 ${optimization.improvement >= 0 ? 'text-success-400' : 'text-danger-400'}`} />
                  <span className={optimization.improvement >= 0 ? 'text-success-400' : 'text-danger-400'}>
                    {optimization.improvement >= 0 ? '+' : ''}{optimization.improvement}% improvement
                  </span>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Constraint violations: {optimization.optimized.constraintViolations} |
                  Utilization: {optimization.optimized.utilizationRate}%
                </div>
              </>
            ) : (
              <EmptyState icon={<Zap className="w-6 h-6" />} title="No optimization data" message="Run optimization from the simulation page." />
            )}
          </div>
        </Card>
      </div>

      {/* Recent activity row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent incidents */}
        <Card>
          <CardHeader title="Recent Incidents" icon={<AlertTriangle className="w-4 h-4" />} action={<button onClick={() => navigate('/app/incidents')} className="btn-ghost text-xs">View all →</button>} />
          <div className="divide-y divide-navy-800">
            {recentIncidents.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="w-6 h-6" />} title="No incidents" message="No incidents reported yet." />
            ) : (
              recentIncidents.map(inc => (
                <div key={inc.id} className="p-3 hover:bg-navy-800 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-200 truncate">{inc.name}</span>
                    {severityBadge(inc.severity)}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{inc.disasterType}</span>
                    <span>·</span>
                    <span>Zone {inc.zoneId}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(inc.reportedTime)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent allocations */}
        <Card>
          <CardHeader title="Recent Allocations" icon={<Package className="w-4 h-4" />} action={<button onClick={() => navigate('/app/resources')} className="btn-ghost text-xs">View all →</button>} />
          <div className="divide-y divide-navy-800">
            {recentAllocations.length === 0 ? (
              <EmptyState icon={<Package className="w-6 h-6" />} title="No allocations" message="No resource allocations yet." />
            ) : (
              recentAllocations.map(alloc => (
                <div key={alloc.id} className="p-3 hover:bg-navy-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${alloc.action === 'allocate' ? 'bg-success-400' : 'bg-amber-400'}`} />
                      <span className="text-xs text-slate-200">{alloc.action === 'allocate' ? 'Allocated' : 'Released'} {alloc.quantity} {alloc.resourceType}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{formatRelativeTime(alloc.timestamp)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Zone {alloc.zoneId}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader title="System Activity" icon={<Activity className="w-4 h-4" />} />
          <div className="divide-y divide-navy-800 max-h-64 overflow-y-auto">
            {state.activities.length === 0 ? (
              <EmptyState icon={<Activity className="w-6 h-6" />} title="No activity" message="No recent activity." />
            ) : (
              state.activities.slice(0, 8).map((act: ActivityEntry) => {
                const Icon = ACTIVITY_ICONS[act.icon] ?? Activity;
                return (
                  <div key={act.id} className="p-3 flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200">{act.action}</div>
                      <div className="text-[11px] text-slate-500 truncate">{act.detail}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(act.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
