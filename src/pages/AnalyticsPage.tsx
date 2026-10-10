import { useMemo, useState } from 'react';
import {
  BarChart3, AlertTriangle, Package, Truck, TrendingUp, Zap, Filter,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, EmptyState, Select, ProgressBar } from '@/components/ui';
import { calculatePriority } from '@/engine/riskScoring';
import { runFullOptimization } from '@/engine/optimization';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, Legend, CartesianGrid,
} from 'recharts';

const CHART_STYLE = { background: '#111a2e', border: '1px solid #1f2d4d', borderRadius: 8, fontSize: 12 };
const LABEL_STYLE = { color: '#94a3b8' };
const AXIS_STYLE = { fill: '#64748b', fontSize: 10 };

const COLORS = ['#22d3ee', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a78bfa'];

export function AnalyticsPage() {
  const { state } = useApp();
  const [filterType, setFilterType] = useState('all');

  const incidents = useMemo(() => {
    if (filterType === 'all') return state.incidents;
    return state.incidents.filter(i => i.disasterType === filterType);
  }, [state.incidents, filterType]);

  const byDisasterType = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.disasterType] = (counts[i.disasterType] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const bySeverity = useMemo(() => {
    const counts = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
    incidents.forEach(i => { counts[i.severity]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const zonePriorityData = useMemo(() => {
    return state.zones.map(z => {
      const p = calculatePriority(z, state.settings.riskWeights);
      return { name: z.id, score: p.score, category: p.category };
    }).sort((a, b) => b.score - a.score);
  }, [state.zones, state.settings.riskWeights]);

  const resourceUtilization = useMemo(() => {
    const types = ['Ambulance', 'Rescue Team', 'Fire Engine', 'Medical Kit', 'Food & Water', 'Shelter'] as const;
    return types.map(t => {
      const items = state.resources.filter(r => r.type === t);
      const total = items.reduce((s, r) => s + r.total, 0);
      const allocated = items.reduce((s, r) => s + r.allocated, 0);
      return { name: t, Allocated: allocated, Available: total - allocated, utilization: total > 0 ? Math.round((allocated / total) * 100) : 0 };
    });
  }, [state.resources]);

  const vehicleStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.vehicles.forEach(v => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [state.vehicles]);

  const demandData = useMemo(() => {
    const types = ['Ambulance', 'Rescue Team', 'Medical Kit', 'Food & Water', 'Shelter'] as const;
    return types.map(t => {
      const demand = state.zones.reduce((s, z) => s + (z.demand[t] ?? 0), 0);
      const fulfilled = state.allocations
        .filter(a => a.resourceType === t && a.action === 'allocate')
        .reduce((s, a) => s + a.quantity, 0);
      return { name: t, Demand: demand, Fulfilled: Math.min(fulfilled, demand) };
    });
  }, [state.zones, state.allocations]);

  const optimizationData = useMemo(() => {
    try {
      const result = runFullOptimization(state.zones, state.resources, {
        weights: state.settings.riskWeights,
        travelCostWeight: 0.3,
        constraintPenalty: 50,
      });
      return [
        { name: 'Allocation Score', Baseline: result.baseline.allocationScore, Optimized: result.optimized.allocationScore },
        { name: 'Unmet Demand', Baseline: result.baseline.totalUnmetDemand, Optimized: result.optimized.totalUnmetDemand },
        { name: 'Utilization %', Baseline: result.baseline.utilizationRate, Optimized: result.optimized.utilizationRate },
        { name: 'Allocated Units', Baseline: result.baseline.totalAllocated, Optimized: result.optimized.totalAllocated },
      ];
    } catch {
      return null;
    }
  }, [state.zones, state.resources, state.settings.riskWeights]);

  const hasData = state.incidents.length > 0 || state.zones.length > 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={filterType} onChange={setFilterType} options={[
            { value: 'all', label: 'All Disaster Types' },
            { value: 'Flood', label: 'Flood' },
            { value: 'Urban Fire', label: 'Urban Fire' },
            { value: 'Earthquake', label: 'Earthquake' },
            { value: 'Cyclone', label: 'Cyclone' },
          ]} className="w-48" />
        </div>
        <span className="text-xs text-slate-500">{incidents.length} incidents · {state.zones.length} zones · {state.resources.length} resources</span>
      </div>

      {!hasData ? (
        <Card>
          <EmptyState icon={<BarChart3 className="w-7 h-7" />} title="No Data Available" message="No data to display analytics. Create incidents and run simulations to populate charts." />
        </Card>
      ) : (
        <>
          {/* Row 1: Disaster type + Severity */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Incidents by Disaster Type" icon={<AlertTriangle className="w-4 h-4" />} />
              <div className="p-4 h-64">
                {byDisasterType.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDisasterType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162038" />
                      <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} />
                      <YAxis tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {byDisasterType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Incidents by Severity" icon={<AlertTriangle className="w-4 h-4" />} />
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#34496f' }}>
                      {bySeverity.map((entry, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#22d3ee', '#22c55e'][i % 4]} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 2: Zone priority + Resource utilization */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Zone Priority Distribution" subtitle="Priority scores across all zones" icon={<TrendingUp className="w-4 h-4" />} />
              <div className="p-4 h-64">
                {zonePriorityData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={zonePriorityData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#162038" />
                      <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} />
                      <YAxis type="category" dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} width={40} />
                      <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {zonePriorityData.map((entry, i) => (
                          <Cell key={i} fill={entry.category === 'Critical' ? '#ef4444' : entry.category === 'High' ? '#f59e0b' : entry.category === 'Moderate' ? '#22d3ee' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Resource Utilization" subtitle="Allocated vs Available by type" icon={<Package className="w-4 h-4" />} />
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceUtilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162038" />
                    <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} />
                    <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar dataKey="Allocated" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Available" stackId="a" fill="#273a5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 3: Vehicle status + Demand vs fulfilled */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Vehicle Status Distribution" icon={<Truck className="w-4 h-4" />} />
              <div className="p-4 h-64">
                {vehicleStatusData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#34496f' }}>
                        {vehicleStatusData.map((_, i) => <Cell key={i} fill={['#22c55e', '#22d3ee', '#f59e0b', '#ef4444', '#64748b'][i % 5]} />)}
                      </Pie>
                      <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Demand vs Fulfilled Demand" subtitle="Resource needs vs actual allocations" icon={<TrendingUp className="w-4 h-4" />} />
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demandData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162038" />
                    <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} />
                    <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar dataKey="Demand" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Fulfilled" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Row 4: Baseline vs Optimized */}
          <Card>
            <CardHeader title="Baseline vs Optimized Allocation" subtitle="Quantum-Inspired Optimization — Classical Simulation" icon={<Zap className="w-4 h-4" />} />
            <div className="p-4 h-72">
              {optimizationData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={optimizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162038" />
                    <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} />
                    <YAxis tick={AXIS_STYLE} axisLine={{ stroke: '#1f2d4d' }} />
                    <Tooltip contentStyle={CHART_STYLE} labelStyle={LABEL_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar dataKey="Baseline" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Optimized" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>
          </Card>

          {/* Summary metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {resourceUtilization.map(r => (
              <Card key={r.name} className="p-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{r.name}</div>
                <div className="text-lg font-bold text-slate-100">{r.utilization}%</div>
                <ProgressBar value={r.utilization} color={r.utilization > 80 ? 'danger' : r.utilization > 50 ? 'amber' : 'cyan'} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No data for this chart</p>
      </div>
    </div>
  );
}
