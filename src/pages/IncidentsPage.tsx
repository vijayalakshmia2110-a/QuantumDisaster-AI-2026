import { useState, useMemo } from 'react';
import {
  AlertTriangle, Search, Plus, Edit, Trash2, X, Filter,
  ArrowUpDown, ChevronRight,
} from 'lucide-react';
import { useApp, uid } from '@/context/AppContext';
import {
  Card, CardHeader, Badge, Modal, ConfirmDialog, EmptyState,
  Select, severityBadge, statusBadge, formatRelativeTime,
} from '@/components/ui';
import { calculatePriority, priorityBg } from '@/engine/riskScoring';
import { DISASTER_TYPES } from '@/data/scenarios';
import type { Incident, DisasterType, Severity, MedicalUrgency, Accessibility, IncidentStatus } from '@/types';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Moderate', 'Low'];
const MEDICAL_URGENCIES: MedicalUrgency[] = ['Critical', 'High', 'Moderate', 'Low'];
const ACCESSIBILITIES: Accessibility[] = ['Open', 'Restricted', 'Blocked', 'Severed'];
const STATUSES: IncidentStatus[] = ['Reported', 'Assessing', 'Response Planned', 'Resources Dispatched', 'Resolved'];

const emptyForm = (): Omit<Incident, 'id' | 'reportedTime'> => ({
  name: '',
  disasterType: 'Flood',
  zoneId: '',
  severity: 'High',
  populationAffected: 1000,
  medicalUrgency: 'Moderate',
  infrastructureDamage: 40,
  accessibility: 'Restricted',
  description: '',
  status: 'Reported',
});

export function IncidentsPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'time' | 'severity' | 'priority'>('time');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    let result = state.incidents.filter(i => {
      if (filterType !== 'all' && i.disasterType !== filterType) return false;
      if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false;
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q) && !i.zoneId.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'time') {
      result = [...result].sort((a, b) => new Date(b.reportedTime).getTime() - new Date(a.reportedTime).getTime());
    } else if (sortBy === 'severity') {
      const order = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      result = [...result].sort((a, b) => order[a.severity] - order[b.severity]);
    } else if (sortBy === 'priority') {
      result = [...result].sort((a, b) => {
        const pa = calculatePriority({ ...i_toZoneLike(a) }, state.settings.riskWeights).score;
        const pb = calculatePriority({ ...i_toZoneLike(b) }, state.settings.riskWeights).score;
        return pb - pa;
      });
    }
    return result;
  }, [state.incidents, search, filterType, filterSeverity, filterStatus, sortBy, state.settings.riskWeights]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (inc: Incident) => {
    setEditing(inc);
    setForm({
      name: inc.name, disasterType: inc.disasterType, zoneId: inc.zoneId,
      severity: inc.severity, populationAffected: inc.populationAffected,
      medicalUrgency: inc.medicalUrgency, infrastructureDamage: inc.infrastructureDamage,
      accessibility: inc.accessibility, description: inc.description, status: inc.status,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = () => {
    setFormError('');
    if (!form.name.trim() || form.name.trim().length < 3) {
      setFormError('Incident name must be at least 3 characters.');
      return;
    }
    if (!form.zoneId) {
      setFormError('Please select an affected zone.');
      return;
    }
    if (form.populationAffected < 0) {
      setFormError('Population affected cannot be negative.');
      return;
    }
    if (form.infrastructureDamage < 0 || form.infrastructureDamage > 100) {
      setFormError('Infrastructure damage must be 0–100.');
      return;
    }

    if (editing) {
      dispatch({
        type: 'UPDATE_INCIDENT',
        incident: { ...editing, ...form, name: form.name.trim() },
      });
    } else {
      dispatch({
        type: 'ADD_INCIDENT',
        incident: {
          ...form,
          id: `INC-${String(state.incidents.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-3)}`,
          name: form.name.trim(),
          reportedTime: new Date().toISOString(),
        },
      });
    }
    setShowForm(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      dispatch({ type: 'DELETE_INCIDENT', id: deleteTarget.id });
      if (selectedIncident?.id === deleteTarget.id) setSelectedIncident(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-56"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="all">All Types</option>
            {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="all">All Severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="time">Sort: Recent</option>
            <option value="severity">Sort: Severity</option>
            <option value="priority">Sort: Priority</option>
          </select>
          <button onClick={handleOpenCreate} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Incident
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle className="w-7 h-7" />}
            title="No Incidents Found"
            message="No incidents match your filters. Try adjusting your search or create a new incident."
            action={<button onClick={handleOpenCreate} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Create Incident</button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Incident</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Zone</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">Priority</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Reported</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {filtered.map(inc => {
                  const priority = calculatePriority(i_toZoneLike(inc), state.settings.riskWeights);
                  return (
                    <tr key={inc.id} className="hover:bg-navy-800/50 transition-colors cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                      <td className="p-3">
                        <div className="font-medium text-slate-200 text-sm">{inc.name}</div>
                        <div className="text-xs text-slate-500">{inc.id}</div>
                      </td>
                      <td className="p-3 text-slate-400">{inc.disasterType}</td>
                      <td className="p-3 text-slate-400">{inc.zoneId}</td>
                      <td className="p-3">{severityBadge(inc.severity)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityBg(priority.category)}`}>
                          {priority.score} · {priority.category}
                        </span>
                      </td>
                      <td className="p-3">{statusBadge(inc.status)}</td>
                      <td className="p-3 text-xs text-slate-500">{formatRelativeTime(inc.reportedTime)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleOpenEdit(inc)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget(inc)} className="btn-ghost p-1.5 hover:text-danger-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Incident details modal */}
      <Modal open={!!selectedIncident} onClose={() => setSelectedIncident(null)} title="Incident Details" size="lg">
        {selectedIncident && <IncidentDetails incident={selectedIncident} onEdit={() => { handleOpenEdit(selectedIncident); setSelectedIncident(null); }} />}
      </Modal>

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Incident' : 'Create New Incident'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label-field">Incident Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Riverside Flooding — Sector A"
              className="input-field"
              maxLength={80}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Select
              label="Disaster Type"
              value={form.disasterType}
              onChange={v => setForm(f => ({ ...f, disasterType: v as DisasterType }))}
              options={DISASTER_TYPES.map(t => ({ value: t, label: t }))}
            />
            <div>
              <label className="label-field">Affected Zone</label>
              <select
                value={form.zoneId}
                onChange={e => setForm(f => ({ ...f, zoneId: e.target.value }))}
                className="input-field cursor-pointer"
              >
                <option value="">Select a zone...</option>
                {state.zones.map(z => (
                  <option key={z.id} value={z.id}>{z.id} — {z.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select label="Severity" value={form.severity} onChange={v => setForm(f => ({ ...f, severity: v as Severity }))} options={SEVERITIES.map(s => ({ value: s, label: s }))} />
            <Select label="Medical Urgency" value={form.medicalUrgency} onChange={v => setForm(f => ({ ...f, medicalUrgency: v as MedicalUrgency }))} options={MEDICAL_URGENCIES.map(s => ({ value: s, label: s }))} />
            <Select label="Accessibility" value={form.accessibility} onChange={v => setForm(f => ({ ...f, accessibility: v as Accessibility }))} options={ACCESSIBILITIES.map(s => ({ value: s, label: s }))} />
            <Select label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v as IncidentStatus }))} options={STATUSES.map(s => ({ value: s, label: s }))} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label-field">Population Affected</label>
              <input
                type="number"
                value={form.populationAffected}
                onChange={e => setForm(f => ({ ...f, populationAffected: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="input-field"
                min={0}
              />
            </div>
            <div>
              <label className="label-field">Infrastructure Damage (0–100)</label>
              <input
                type="number"
                value={form.infrastructureDamage}
                onChange={e => setForm(f => ({ ...f, infrastructureDamage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                className="input-field"
                min={0}
                max={100}
              />
            </div>
          </div>

          <div>
            <label className="label-field">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the situation..."
              className="input-field min-h-[80px] resize-y"
              maxLength={500}
            />
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400">
              {formError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">{editing ? 'Update Incident' : 'Create Incident'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Incident"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function i_toZoneLike(inc: Incident) {
  return {
    severity: inc.severity,
    populationAffected: inc.populationAffected,
    population: inc.populationAffected,
    medicalUrgency: inc.medicalUrgency,
    infrastructureDamage: inc.infrastructureDamage,
    accessibility: inc.accessibility,
  };
}

function IncidentDetails({ incident, onEdit }: { incident: Incident; onEdit: () => void }) {
  const { state, dispatch } = useApp();
  const priority = calculatePriority(i_toZoneLike(incident), state.settings.riskWeights);
  const zone = state.zones.find(z => z.id === incident.zoneId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{incident.name}</h3>
          <p className="text-xs text-slate-500">{incident.id} · Reported {formatRelativeTime(incident.reportedTime)}</p>
        </div>
        <button onClick={onEdit} className="btn-secondary text-xs flex items-center gap-1.5">
          <Edit className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Disaster Type</div>
          <div className="text-sm text-slate-200">{incident.disasterType}</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Zone</div>
          <div className="text-sm text-slate-200">{incident.zoneId} {zone ? `— ${zone.name}` : ''}</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Status</div>
          {statusBadge(incident.status)}
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Severity</div>
          {severityBadge(incident.severity)}
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Population Affected</div>
          <div className="text-sm text-slate-200">{incident.populationAffected.toLocaleString()}</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Medical Urgency</div>
          <div className="text-sm text-slate-200">{incident.medicalUrgency}</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Infrastructure Damage</div>
          <div className="text-sm text-slate-200">{incident.infrastructureDamage}/100</div>
        </div>
        <div className="panel p-3">
          <div className="text-xs text-slate-500 mb-1">Accessibility</div>
          <div className="text-sm text-slate-200">{incident.accessibility}</div>
        </div>
        <div className={`panel p-3 border ${priorityBg(priority.category)}`}>
          <div className="text-xs text-slate-500 mb-1">Priority Score</div>
          <div className="text-lg font-bold">{priority.score} · {priority.category}</div>
        </div>
      </div>

      {/* Priority explanation */}
      <div className="panel p-4">
        <div className="text-xs font-semibold text-slate-300 mb-2">AI-Inspired Priority Breakdown</div>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {Object.entries(priority.factors).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className="text-xs text-slate-500 mb-1 capitalize">{key}</div>
              <div className="text-sm font-bold text-slate-200">{val}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{priority.explanation}</p>
      </div>

      {incident.description && (
        <div className="panel p-4">
          <div className="text-xs font-semibold text-slate-300 mb-2">Description</div>
          <p className="text-sm text-slate-400 leading-relaxed">{incident.description}</p>
        </div>
      )}

      {/* Status update */}
      <div className="panel p-4">
        <div className="text-xs font-semibold text-slate-300 mb-2">Update Status</div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => dispatch({ type: 'UPDATE_INCIDENT', incident: { ...incident, status: s } })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                incident.status === s
                  ? 'bg-cyan-600/15 border-cyan-500 text-cyan-300'
                  : 'bg-navy-800 border-navy-700 text-slate-400 hover:border-cyan-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
