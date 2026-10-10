import { useState, useMemo } from 'react';
import { Map, X, Navigation, AlertTriangle, Package } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, Badge, EmptyState, ProgressBar, severityBadge } from '@/components/ui';
import { calculatePriority, priorityBg } from '@/engine/riskScoring';
import type { Zone, Severity } from '@/types';

const FILTERS: (Severity | 'All')[] = ['All', 'Critical', 'High', 'Moderate', 'Low'];

const SEVERITY_FILL: Record<string, string> = {
  Critical: '#ef444440', High: '#f59e0b40', Moderate: '#22d3ee40', Low: '#22c55e40',
};
const SEVERITY_STROKE: Record<string, string> = {
  Critical: '#ef4444', High: '#f59e0b', Moderate: '#22d3ee', Low: '#22c55e',
};

export function DisasterMapPage() {
  const { state } = useApp();
  const [filter, setFilter] = useState<Severity | 'All'>('All');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const filteredZones = useMemo(() => {
    if (filter === 'All') return state.zones;
    return state.zones.filter(z => {
      const p = calculatePriority(z, state.settings.riskWeights);
      return p.category === filter;
    });
  }, [state.zones, filter, state.settings.riskWeights]);

  const zonePriorities = useMemo(() => {
    return state.zones.map(z => ({ zone: z, priority: calculatePriority(z, state.settings.riskWeights) }));
  }, [state.zones, state.settings.riskWeights]);

  // Get resources allocated to the selected zone
  const zoneResources = useMemo(() => {
    if (!selectedZone) return [];
    return state.resources.filter(r => r.assignedZoneId === selectedZone.id);
  }, [state.resources, selectedZone]);

  // Recommended allocation for selected zone
  const recommendedAllocation = useMemo(() => {
    if (!selectedZone) return null;
    const priority = calculatePriority(selectedZone, state.settings.riskWeights);
    return { priority, demand: selectedZone.demand };
  }, [selectedZone]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filter === f
                  ? 'bg-cyan-600/15 border-cyan-500 text-cyan-300'
                  : 'bg-navy-850 border-navy-700 text-slate-400 hover:border-cyan-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500"><span className="status-dot bg-danger-500" /> Critical</span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="status-dot bg-amber-500" /> High</span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="status-dot bg-cyan-500" /> Moderate</span>
          <span className="flex items-center gap-1.5 text-slate-500"><span className="status-dot bg-success-500" /> Low</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader
            title="Simulated Operational Map"
            subtitle="Schematic visualization — not a real geographic map"
            icon={<Map className="w-4 h-4" />}
          />
          <div className="p-4">
            <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
              <svg viewBox="0 0 100 62.5" className="w-full h-full" style={{ background: '#0a0f1c', borderRadius: 8 }}>
                {/* Grid */}
                {[0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100].map(x => (
                  <line key={`v${x}`} x1={x} y1={0} x2={x} y2={62.5} stroke="#162038" strokeWidth={0.15} />
                ))}
                {[0, 12.5, 25, 37.5, 50, 62.5].map(y => (
                  <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke="#162038" strokeWidth={0.15} />
                ))}

                {/* Road network */}
                {state.roadSegments.map(seg => {
                  const from = state.roadNodes.find(n => n.id === seg.from);
                  const to = state.roadNodes.find(n => n.id === seg.to);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={seg.id}
                      x1={from.x} y1={from.y}
                      x2={to.x} y2={to.y}
                      stroke={seg.blocked ? '#ef4444' : '#273a5e'}
                      strokeWidth={seg.blocked ? 0.5 : 0.35}
                      strokeDasharray={seg.blocked ? '1.5,1' : 'none'}
                    />
                  );
                })}

                {/* Road nodes */}
                {state.roadNodes.map(n => (
                  <g key={n.id}>
                    {n.isDepot && (
                      <circle cx={n.x} cy={n.y} r={2.5} fill="#06b6d430" stroke="#06b6d4" strokeWidth={0.3} />
                    )}
                    {n.isHospital && (
                      <rect x={n.x - 2} y={n.y - 2} width={4} height={4} fill="#22c55e30" stroke="#22c55e" strokeWidth={0.3} rx={0.5} />
                    )}
                    <circle cx={n.x} cy={n.y} r={0.8} fill={n.isDepot || n.isHospital ? '#22d3ee' : '#34496f'} />
                    <text x={n.x} y={n.y - 1.5} fill="#64748b" fontSize={1.4} textAnchor="middle">{n.label}</text>
                  </g>
                ))}

                {/* Zones */}
                {filteredZones.map(z => {
                  const p = calculatePriority(z, state.settings.riskWeights);
                  const isSel = selectedZone?.id === z.id;
                  return (
                    <g
                      key={z.id}
                      onClick={() => setSelectedZone(z)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={z.x} y={z.y}
                        width={z.w} height={z.h}
                        rx={1.5}
                        fill={SEVERITY_FILL[p.category] ?? '#22d3ee30'}
                        stroke={SEVERITY_STROKE[p.category] ?? '#22d3ee'}
                        strokeWidth={isSel ? 0.6 : 0.3}
                        strokeDasharray={isSel ? 'none' : 'none'}
                        opacity={isSel ? 1 : 0.8}
                        className="transition-all"
                      />
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 - 1} fill="#e2e8f0" fontSize={2} fontWeight="bold" textAnchor="middle">{z.id}</text>
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 2} fill="#94a3b8" fontSize={1.3} textAnchor="middle">{p.score}</text>
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} fill="#64748b" fontSize={1} textAnchor="middle">{p.category}</text>
                    </g>
                  );
                })}

                {/* Blocked road markers */}
                {state.roadSegments.filter(s => s.blocked).map(seg => {
                  const from = state.roadNodes.find(n => n.id === seg.from);
                  const to = state.roadNodes.find(n => n.id === seg.to);
                  if (!from || !to) return null;
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2;
                  return (
                    <g key={`b-${seg.id}`}>
                      <circle cx={mx} cy={my} r={0.8} fill="#ef4444" />
                      <text x={mx} y={my - 1.2} fill="#ef4444" fontSize={1.2} textAnchor="middle">✕</text>
                    </g>
                  );
                })}
              </svg>

              {/* Legend overlay */}
              <div className="absolute bottom-2 left-2 panel p-2 text-[10px] space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <circle cx={0} cy={0} r={3} fill="#06b6d4" style={{ width: 6, height: 6, borderRadius: '50%' }} />
                  Depot
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span style={{ width: 6, height: 6, borderRadius: 1, border: '1px solid #22c55e' }} />
                  Hospital
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span style={{ width: 8, height: 0, borderTop: '2px dashed #ef4444' }} />
                  Blocked Road
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Zone details panel */}
        <Card>
          <CardHeader title="Zone Details" subtitle={selectedZone ? selectedZone.id : 'Select a zone'} icon={<Navigation className="w-4 h-4" />} />
          <div className="p-4">
            {!selectedZone ? (
              <EmptyState
                icon={<Map className="w-6 h-6" />}
                title="No Zone Selected"
                message="Click on a zone in the map to view its details, priority score, and recommended resource allocation."
              />
            ) : (
              <ZoneDetails
                zone={selectedZone}
                priority={calculatePriority(selectedZone, state.settings.riskWeights)}
                resources={zoneResources}
                recommended={recommendedAllocation}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Zone list */}
      <Card>
        <CardHeader title="All Zones" subtitle={`${filteredZones.length} zone(s)`} icon={<AlertTriangle className="w-4 h-4" />} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {zonePriorities
            .filter(({ priority }) => filter === 'All' || priority.category === filter)
            .sort((a, b) => b.priority.score - a.priority.score)
            .map(({ zone, priority }) => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={`panel p-3 text-left transition-all hover:border-cyan-700 ${selectedZone?.id === zone.id ? 'border-cyan-500 ring-1 ring-cyan-500/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">{zone.id}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityBg(priority.category)}`}>
                    {priority.score} · {priority.category}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-2">{zone.name}</div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                  <div>Pop: <span className="text-slate-300">{zone.populationAffected.toLocaleString()}</span></div>
                  <div>Severity: <span className="text-slate-300">{zone.severity}</span></div>
                  <div>Medical: <span className="text-slate-300">{zone.medicalUrgency}</span></div>
                  <div>Access: <span className="text-slate-300">{zone.accessibility}</span></div>
                </div>
              </button>
            ))}
        </div>
      </Card>
    </div>
  );
}

function ZoneDetails({ zone, priority, resources, recommended }: {
  zone: Zone;
  priority: ReturnType<typeof calculatePriority>;
  resources: { type: string; available: number; allocated: number }[];
  recommended: { priority: ReturnType<typeof calculatePriority>; demand: Partial<Record<string, number>> } | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-100">{zone.id}</div>
          <div className="text-xs text-slate-500">{zone.name}</div>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${priorityBg(priority.category)}`}>
          {priority.score} · {priority.category}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="panel p-2.5">
          <div className="text-slate-500 text-[11px]">Severity</div>
          <div className="text-slate-200 font-medium mt-0.5">{zone.severity}</div>
        </div>
        <div className="panel p-2.5">
          <div className="text-slate-500 text-[11px]">Population</div>
          <div className="text-slate-200 font-medium mt-0.5">{zone.populationAffected.toLocaleString()}</div>
        </div>
        <div className="panel p-2.5">
          <div className="text-slate-500 text-[11px]">Medical Urgency</div>
          <div className="text-slate-200 font-medium mt-0.5">{zone.medicalUrgency}</div>
        </div>
        <div className="panel p-2.5">
          <div className="text-slate-500 text-[11px]">Infrastructure</div>
          <div className="text-slate-200 font-medium mt-0.5">{zone.infrastructureDamage}/100</div>
        </div>
        <div className="panel p-2.5">
          <div className="text-slate-500 text-[11px]">Accessibility</div>
          <div className="text-slate-200 font-medium mt-0.5">{zone.accessibility}</div>
        </div>
        <div className="panel p-2.5">
          <div className="text-slate-500 text-[11px]">Disaster Type</div>
          <div className="text-slate-200 font-medium mt-0.5">{zone.disasterType}</div>
        </div>
      </div>

      {/* Priority factors */}
      <div className="panel p-3">
        <div className="text-xs font-semibold text-slate-300 mb-2">Priority Factors</div>
        <div className="space-y-1.5">
          {Object.entries(priority.factors).map(([key, val]) => (
            <div key={key}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-400 capitalize">{key}</span>
                <span className="text-slate-300 font-medium">{val}/100</span>
              </div>
              <ProgressBar value={val} color={val > 75 ? 'danger' : val > 50 ? 'amber' : 'cyan'} />
            </div>
          ))}
        </div>
      </div>

      {/* Demand */}
      {recommended && Object.keys(recommended.demand).length > 0 && (
        <div className="panel p-3">
          <div className="text-xs font-semibold text-slate-300 mb-2">Resource Demand</div>
          <div className="space-y-1">
            {Object.entries(recommended.demand).map(([type, qty]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{type}</span>
                <Badge variant="warning">{qty} units</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocated resources */}
      <div className="panel p-3">
        <div className="text-xs font-semibold text-slate-300 mb-2">Available Resources in Zone</div>
        {resources.length === 0 ? (
          <div className="text-xs text-slate-500">No resources currently assigned to this zone.</div>
        ) : (
          <div className="space-y-1">
            {resources.map(r => (
              <div key={r.type} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{r.type}</span>
                <span className="text-slate-300">{r.allocated} allocated · {r.available} available</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500 leading-relaxed">{priority.explanation}</div>
    </div>
  );
}
