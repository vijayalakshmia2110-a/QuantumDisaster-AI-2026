import { useState, useMemo } from 'react';
import {
  Truck, Search, Plus, Edit, Navigation, X, MapPin,
} from 'lucide-react';
import { useApp, uid } from '@/context/AppContext';
import {
  Card, CardHeader, Badge, Modal, EmptyState, Select, statusBadge, formatRelativeTime,
} from '@/components/ui';
import type { Vehicle, VehicleType, VehicleStatus } from '@/types';

const VEHICLE_TYPES: VehicleType[] = ['Ambulance', 'Rescue Van', 'Fire Engine', 'Supply Truck', 'Command Vehicle'];
const VEHICLE_STATUSES: VehicleStatus[] = ['Available', 'Assigned', 'En Route', 'At Incident', 'Maintenance'];

const emptyForm = (): Omit<Vehicle, 'id'> => ({
  type: 'Ambulance',
  status: 'Available',
  assignedZoneId: null,
  capacity: 4,
  locationNode: 'N1',
  currentAssignment: null,
});

export function VehiclesPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [assignTarget, setAssignTarget] = useState<Vehicle | null>(null);
  const [assignZone, setAssignZone] = useState('');
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

  const filtered = useMemo(() => {
    return state.vehicles.filter(v => {
      if (filterType !== 'all' && v.type !== filterType) return false;
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!v.id.toLowerCase().includes(q) && !v.type.toLowerCase().includes(q) && !(v.assignedZoneId ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [state.vehicles, search, filterType, filterStatus]);

  const summary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    state.vehicles.forEach(v => { byStatus[v.status] = (byStatus[v.status] ?? 0) + 1; });
    return VEHICLE_STATUSES.map(s => ({ status: s, count: byStatus[s] ?? 0 }));
  }, [state.vehicles]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({ type: v.type, status: v.status, assignedZoneId: v.assignedZoneId, capacity: v.capacity, locationNode: v.locationNode, currentAssignment: v.currentAssignment });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = () => {
    setFormError('');
    if (form.capacity < 1) { setFormError('Capacity must be at least 1.'); return; }
    if (editing) {
      dispatch({ type: 'UPDATE_VEHICLE', vehicle: { ...editing, ...form } });
    } else {
      dispatch({ type: 'ADD_VEHICLE', vehicle: { ...form, id: uid('V') } });
    }
    setShowForm(false);
  };

  const handleAssign = () => {
    if (!assignTarget || !assignZone) return;
    dispatch({ type: 'ASSIGN_VEHICLE', vehicleId: assignTarget.id, zoneId: assignZone });
    setAssignTarget(null);
    setAssignZone('');
  };

  const handleRelease = (v: Vehicle) => {
    dispatch({ type: 'RELEASE_VEHICLE', vehicleId: v.id });
  };

  const handleStatusChange = (v: Vehicle, status: VehicleStatus) => {
    dispatch({ type: 'UPDATE_VEHICLE', vehicle: { ...v, status } });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summary.map(s => (
          <Card key={s.status} hover className="p-3 text-center">
            <div className="text-2xl font-bold text-slate-100">{s.count}</div>
            <div className="text-xs text-slate-500 mt-1">{s.status}</div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm w-52" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="all">All Types</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="all">All Statuses</option>
            {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Vehicle cards grid */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Truck className="w-7 h-7" />} title="No Vehicles" message="No vehicles match your filters." action={<button onClick={handleOpenCreate} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Vehicle</button>} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(v => {
            const node = state.roadNodes.find(n => n.id === v.locationNode);
            return (
              <Card key={v.id} hover className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-slate-200 font-mono">{v.id}</span>
                  </div>
                  {statusBadge(v.status)}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-300">{v.type}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Capacity</span><span className="text-slate-300">{v.capacity} persons</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="text-slate-300">{node?.label ?? v.locationNode}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Assigned Zone</span><span className="text-slate-300">{v.assignedZoneId ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Assignment</span><span className="text-slate-300">{v.currentAssignment ?? '—'}</span></div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-navy-700">
                  <button onClick={() => setDetailVehicle(v)} className="btn-ghost text-xs flex-1">Details</button>
                  {v.status === 'Available' && (
                    <button onClick={() => { setAssignTarget(v); setAssignZone(''); }} className="btn-ghost text-xs flex-1 text-cyan-400">Assign</button>
                  )}
                  {v.status !== 'Available' && v.status !== 'Maintenance' && (
                    <button onClick={() => handleRelease(v)} className="btn-ghost text-xs flex-1 text-amber-400">Release</button>
                  )}
                  <button onClick={() => handleOpenEdit(v)} className="btn-ghost p-1.5"><Edit className="w-3.5 h-3.5" /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'} size="md">
        <div className="space-y-4">
          <Select label="Vehicle Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v as VehicleType }))} options={VEHICLE_TYPES.map(t => ({ value: t, label: t }))} />
          <Select label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v as VehicleStatus }))} options={VEHICLE_STATUSES.map(s => ({ value: s, label: s }))} />
          <div>
            <label className="label-field">Capacity</label>
            <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, parseInt(e.target.value) || 1) }))} className="input-field" min={1} />
          </div>
          <Select
            label="Simulated Location (Road Node)"
            value={form.locationNode}
            onChange={v => setForm(f => ({ ...f, locationNode: v }))}
            options={state.roadNodes.map(n => ({ value: n.id, label: `${n.id} — ${n.label}` }))}
          />
          {formError && <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400">{formError}</div>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Add Vehicle'}</button>
          </div>
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Assign ${assignTarget?.id ?? ''}`} size="sm">
        <div className="space-y-4">
          <div className="text-xs text-slate-500">Vehicle: <span className="text-slate-300">{assignTarget?.type}</span></div>
          <div>
            <label className="label-field">Assign to Zone</label>
            <select value={assignZone} onChange={e => setAssignZone(e.target.value)} className="input-field cursor-pointer">
              <option value="">Select zone...</option>
              {state.zones.map(z => <option key={z.id} value={z.id}>{z.id} — {z.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setAssignTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleAssign} disabled={!assignZone} className="btn-primary disabled:opacity-50">Assign</button>
          </div>
        </div>
      </Modal>

      {/* Details modal */}
      <Modal open={!!detailVehicle} onClose={() => setDetailVehicle(null)} title="Vehicle Details" size="md">
        {detailVehicle && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-100">{detailVehicle.id}</div>
                <div className="text-xs text-slate-500">{detailVehicle.type}</div>
              </div>
              <div className="ml-auto">{statusBadge(detailVehicle.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="panel p-2.5"><div className="text-slate-500 text-[11px]">Capacity</div><div className="text-slate-200 mt-0.5">{detailVehicle.capacity}</div></div>
              <div className="panel p-2.5"><div className="text-slate-500 text-[11px]">Location</div><div className="text-slate-200 mt-0.5">{state.roadNodes.find(n => n.id === detailVehicle.locationNode)?.label ?? detailVehicle.locationNode}</div></div>
              <div className="panel p-2.5"><div className="text-slate-500 text-[11px]">Assigned Zone</div><div className="text-slate-200 mt-0.5">{detailVehicle.assignedZoneId ?? '—'}</div></div>
              <div className="panel p-2.5"><div className="text-slate-500 text-[11px]">Current Assignment</div><div className="text-slate-200 mt-0.5">{detailVehicle.currentAssignment ?? '—'}</div></div>
            </div>

            <div className="panel p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">Change Status</div>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => { handleStatusChange(detailVehicle, s); setDetailVehicle({ ...detailVehicle, status: s }); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      detailVehicle.status === s ? 'bg-cyan-600/15 border-cyan-500 text-cyan-300' : 'bg-navy-800 border-navy-700 text-slate-400 hover:border-cyan-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Simulated location — not real-time GPS tracking.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
