import { useState, useMemo } from 'react';
import {
  Route as RouteIcon, Navigation, RefreshCw, MapPin, Clock,
  AlertTriangle, CheckCircle2, XCircle, GitBranch, Gauge,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, Badge, EmptyState, Select } from '@/components/ui';
import { findRoute } from '@/engine/routeOptimizer';
import type { RouteResult, RoadSegment } from '@/types';

export function RouteOptimizerPage() {
  const { state } = useApp();
  const [origin, setOrigin] = useState(state.roadNodes[0]?.id ?? '');
  const [destination, setDestination] = useState(state.roadNodes[2]?.id ?? '');
  const [vehicleType, setVehicleType] = useState('Ambulance');
  const [priority, setPriority] = useState('High');
  const [routeResult, setRouteResult] = useState<{ primary: RouteResult; alternative: RouteResult | null } | null>(null);
  const [calculating, setCalculating] = useState(false);

  const nodeOptions = state.roadNodes.map(n => ({ value: n.id, label: `${n.id} — ${n.label}${n.isDepot ? ' (Depot)' : ''}${n.isHospital ? ' (Hospital)' : ''}` }));

  const blockedSegments = useMemo(() => state.roadSegments.filter(s => s.blocked), [state.roadSegments]);

  const handleCalculate = () => {
    setCalculating(true);
    setTimeout(() => {
      try {
        const result = findRoute(state.roadNodes, state.roadSegments, {
          origin,
          destination,
          vehicleType,
          incidentPriority: parseInt(priority) || 50,
        });
        setRouteResult(result);
      } catch {
        setRouteResult(null);
      }
      setCalculating(false);
    }, 300);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Inputs */}
      <Card>
        <CardHeader title="Route Planner" subtitle="Find optimal emergency routes through the road network" icon={<RouteIcon className="w-4 h-4" />} />
        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select label="Origin" value={origin} onChange={setOrigin} options={nodeOptions} />
            <Select label="Destination" value={destination} onChange={setDestination} options={nodeOptions} />
            <Select label="Vehicle Type" value={vehicleType} onChange={setVehicleType} options={[
              { value: 'Ambulance', label: 'Ambulance' },
              { value: 'Rescue Van', label: 'Rescue Van' },
              { value: 'Fire Engine', label: 'Fire Engine' },
              { value: 'Supply Truck', label: 'Supply Truck' },
              { value: 'Command Vehicle', label: 'Command Vehicle' },
            ]} />
            <Select label="Incident Priority" value={priority} onChange={setPriority} options={[
              { value: '90', label: 'Critical (90)' },
              { value: '70', label: 'High (70)' },
              { value: '50', label: 'Moderate (50)' },
              { value: '25', label: 'Low (25)' },
            ]} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCalculate} disabled={calculating || origin === destination} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
              {calculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {calculating ? 'Calculating...' : 'Calculate Route'}
            </button>
            {origin === destination && <span className="text-xs text-amber-400">Origin and destination must differ.</span>}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Map visualization */}
        <Card>
          <CardHeader title="Road Network" subtitle="Simulated — blocked roads shown in red" icon={<MapPin className="w-4 h-4" />} />
          <div className="p-4">
            <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
              <svg viewBox="0 0 100 62.5" className="w-full h-full" style={{ background: '#0a0f1c', borderRadius: 8 }}>
                {/* Grid */}
                {[0, 25, 50, 75, 100].map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={62.5} stroke="#162038" strokeWidth={0.15} />)}
                {[0, 31.25, 62.5].map(y => <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke="#162038" strokeWidth={0.15} />)}

                {/* Road segments */}
                {state.roadSegments.map(seg => {
                  const from = state.roadNodes.find(n => n.id === seg.from);
                  const to = state.roadNodes.find(n => n.id === seg.to);
                  if (!from || !to) return null;
                  const onRoute = routeResult?.primary.path.some((id, i) =>
                    (id === seg.from && routeResult.primary.path[i + 1] === seg.to) ||
                    (id === seg.to && routeResult.primary.path[i + 1] === seg.from)
                  );
                  const onAltRoute = routeResult?.alternative?.path.some((id, i) =>
                    (id === seg.from && routeResult.alternative!.path[i + 1] === seg.to) ||
                    (id === seg.to && routeResult.alternative!.path[i + 1] === seg.from)
                  );
                  return (
                    <line
                      key={seg.id}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={onRoute ? '#22d3ee' : onAltRoute ? '#f59e0b' : seg.blocked ? '#ef4444' : '#273a5e'}
                      strokeWidth={onRoute || onAltRoute ? 0.7 : seg.blocked ? 0.5 : 0.35}
                      strokeDasharray={seg.blocked && !onRoute && !onAltRoute ? '1.5,1' : 'none'}
                    />
                  );
                })}

                {/* Nodes */}
                {state.roadNodes.map(n => {
                  const isOrigin = n.id === origin;
                  const isDest = n.id === destination;
                  return (
                    <g key={n.id}>
                      {isOrigin && <circle cx={n.x} cy={n.y} r={3} fill="#22d3ee40" stroke="#22d3ee" strokeWidth={0.4} />}
                      {isDest && <circle cx={n.x} cy={n.y} r={3} fill="#22c55e40" stroke="#22c55e" strokeWidth={0.4} />}
                      <circle cx={n.x} cy={n.y} r={isOrigin || isDest ? 1.2 : 0.8} fill={isOrigin ? '#22d3ee' : isDest ? '#22c55e' : '#34496f'} />
                      <text x={n.x} y={n.y - 1.5} fill={isOrigin || isDest ? '#e2e8f0' : '#64748b'} fontSize={1.4} textAnchor="middle" fontWeight={isOrigin || isDest ? 'bold' : 'normal'}>{n.label}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="absolute bottom-2 left-2 panel p-2 text-[10px] space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400"><span style={{ width: 12, height: 0, borderTop: '2px solid #22d3ee' }} /> Primary Route</div>
                <div className="flex items-center gap-1.5 text-slate-400"><span style={{ width: 12, height: 0, borderTop: '2px solid #f59e0b' }} /> Alternative</div>
                <div className="flex items-center gap-1.5 text-slate-400"><span style={{ width: 12, height: 0, borderTop: '2px dashed #ef4444' }} /> Blocked</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Route results */}
        <Card>
          <CardHeader title="Route Results" icon={<GitBranch className="w-4 h-4" />} />
          <div className="p-4">
            {!routeResult ? (
              <EmptyState icon={<Navigation className="w-6 h-6" />} title="No Route Calculated" message="Select origin and destination, then click Calculate Route." action={<button onClick={handleCalculate} disabled={origin === destination} className="btn-primary text-sm disabled:opacity-50">Calculate</button>} />
            ) : !routeResult.primary.feasible ? (
              <div className="panel p-4 border-danger-500/30 text-center">
                <XCircle className="w-10 h-10 text-danger-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-danger-400 mb-1">No Feasible Route</h3>
                <p className="text-xs text-slate-500">{routeResult.primary.explanation}</p>
                <div className="mt-3 text-xs text-slate-500">
                  Blocked segments: {blockedSegments.map(s => s.id).join(', ')}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Primary route */}
                <div className="panel p-4 border-cyan-700/40">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-cyan-300">Recommended Route</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Distance</div>
                      <div className="text-sm font-bold text-slate-200">{routeResult.primary.distance} km</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Travel Time</div>
                      <div className="text-sm font-bold text-slate-200">{routeResult.primary.travelTime} min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Cost Score</div>
                      <div className="text-sm font-bold text-slate-200">{routeResult.primary.cost}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap text-xs text-slate-300 mb-2">
                    {routeResult.primary.path.map((id, i) => {
                      const node = state.roadNodes.find(n => n.id === id);
                      return (
                        <span key={i} className="flex items-center gap-1">
                          <Badge variant={i === 0 ? 'success' : i === routeResult.primary.path.length - 1 ? 'critical' : 'info'}>
                            {node?.label ?? id}
                          </Badge>
                          {i < routeResult.primary.path.length - 1 && <span className="text-slate-600">→</span>}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{routeResult.primary.explanation}</p>
                </div>

                {/* Alternative route */}
                {routeResult.alternative && (
                  <div className="panel p-4 border-amber-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-400">Alternative Route</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center"><div className="text-xs text-slate-500 mb-1">Distance</div><div className="text-sm font-bold text-slate-200">{routeResult.alternative.distance} km</div></div>
                      <div className="text-center"><div className="text-xs text-slate-500 mb-1">Travel Time</div><div className="text-sm font-bold text-slate-200">{routeResult.alternative.travelTime} min</div></div>
                      <div className="text-center"><div className="text-xs text-slate-500 mb-1">Cost Score</div><div className="text-sm font-bold text-slate-200">{routeResult.alternative.cost}</div></div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap text-xs text-slate-400 mb-2">
                      {routeResult.alternative.path.map((id, i) => {
                        const node = state.roadNodes.find(n => n.id === id);
                        return <span key={i} className="flex items-center gap-1"><span className="text-slate-400">{node?.label ?? id}</span>{i < routeResult.alternative!.path.length - 1 && <span className="text-slate-600">→</span>}</span>;
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{routeResult.alternative.explanation}</p>
                  </div>
                )}

                {/* Blocked segments info */}
                {routeResult.primary.blockedSegments.length > 0 && (
                  <div className="panel p-3 border-danger-500/20">
                    <div className="flex items-center gap-2 text-xs text-danger-400 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Blocked Segments on Route
                    </div>
                    <div className="text-xs text-slate-500">{routeResult.primary.blockedSegments.join(', ')}</div>
                  </div>
                )}

                <button onClick={handleCalculate} className="btn-secondary text-sm w-full flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Recalculate Route
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Road network details */}
      <Card>
        <CardHeader title="Road Network Details" subtitle={`${state.roadSegments.length} segments · ${blockedSegments.length} blocked`} icon={<Gauge className="w-4 h-4" />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left p-3 font-medium">Segment</th>
                <th className="text-left p-3 font-medium">From → To</th>
                <th className="text-left p-3 font-medium">Distance</th>
                <th className="text-left p-3 font-medium">Travel Time</th>
                <th className="text-left p-3 font-medium">Accessibility</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {state.roadSegments.map((seg: RoadSegment) => {
                const from = state.roadNodes.find(n => n.id === seg.from);
                const to = state.roadNodes.find(n => n.id === seg.to);
                return (
                  <tr key={seg.id} className="hover:bg-navy-800/50">
                    <td className="p-3 text-xs font-mono text-slate-500">{seg.id}</td>
                    <td className="p-3 text-slate-300">{from?.label} → {to?.label}</td>
                    <td className="p-3 text-slate-400">{seg.distance} km</td>
                    <td className="p-3 text-slate-400">{seg.travelTime} min</td>
                    <td className="p-3"><Badge variant={seg.accessibility === 'Open' ? 'success' : seg.accessibility === 'Restricted' ? 'warning' : 'critical'}>{seg.accessibility}</Badge></td>
                    <td className="p-3">{seg.blocked ? <Badge variant="critical">Blocked</Badge> : <Badge variant="success">Open</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
