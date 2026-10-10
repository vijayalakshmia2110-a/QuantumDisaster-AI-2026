import { useState, useMemo } from 'react';
import {
  Package, Search, Plus, Edit, Trash2, ArrowUpRight, ArrowDownRight,
  History, X,
} from 'lucide-react';
import { useApp, uid } from '@/context/AppContext';
import {
  Card, CardHeader, Badge, Modal, ConfirmDialog, EmptyState,
  Select, ProgressBar, formatRelativeTime,
} from '@/components/ui';
import type { Resource, ResourceType } from '@/types';

const RESOURCE_TYPES: ResourceType[] = ['Ambulance', 'Rescue Team', 'Fire Engine', 'Medical Kit', 'Food & Water', 'Shelter'];

const emptyForm = (): Omit<Resource, 'id'> => ({
  type: 'Ambulance',
  total: 10,
  available: 10,
  allocated: 0,
  assignedZoneId: null,
  status: 'Available',
});

export function ResourcesPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [allocTarget, setAllocTarget] = useState<Resource | null>(null);
  const [allocZone, setAllocZone] = useState('');
  const [allocQty, setAllocQty] = useState(1);
  const [allocError, setAllocError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<Resource | null>(null);
  const [releaseQty, setReleaseQty] = useState(1);

  const filtered = useMemo(() => {
    return state.resources.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.id.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q) && !(r.assignedZoneId ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [state.resources, search, filterType]);

  const summary = useMemo(() => {
    const byType = RESOURCE_TYPES.map(t => {
      const items = state.resources.filter(r => r.type === t);
      const total = items.reduce((s, r) => s + r.total, 0);
      const available = items.reduce((s, r) => s + r.available, 0);
      const allocated = items.reduce((s, r) => s + r.allocated, 0);
      return { type: t, total, available, allocated, utilization: total > 0 ? Math.round((allocated / total) * 100) : 0 };
    });
    return byType;
  }, [state.resources]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (r: Resource) => {
    setEditing(r);
    setForm({ type: r.type, total: r.total, available: r.available, allocated: r.allocated, assignedZoneId: r.assignedZoneId, status: r.status });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = () => {
    setFormError('');
    if (form.total < 0) { setFormError('Total quantity cannot be negative.'); return; }
    if (form.available < 0) { setFormError('Available quantity cannot be negative.'); return; }
    if (form.available > form.total) { setFormError('Available cannot exceed total.'); return; }
    if (editing) {
      dispatch({ type: 'UPDATE_RESOURCE', resource: { ...editing, ...form } });
    } else {
      dispatch({ type: 'ADD_RESOURCE', resource: { ...form, id: uid('R') } });
    }
    setShowForm(false);
  };

  const handleAllocate = () => {
    setAllocError('');
    if (!allocTarget) return;
    if (!allocZone) { setAllocError('Select a zone.'); return; }
    if (allocQty <= 0) { setAllocError('Quantity must be positive.'); return; }
    if (allocQty > allocTarget.available) { setAllocError(`Only ${allocTarget.available} available.`); return; }
    dispatch({ type: 'ALLOCATE_RESOURCE', resourceId: allocTarget.id, zoneId: allocZone, quantity: allocQty });
    setAllocTarget(null);
    setAllocZone('');
    setAllocQty(1);
  };

  const handleRelease = () => {
    if (!releaseTarget || releaseQty <= 0 || releaseQty > releaseTarget.allocated) return;
    dispatch({ type: 'RELEASE_RESOURCE', resourceId: releaseTarget.id, quantity: releaseQty });
    setReleaseTarget(null);
    setReleaseQty(1);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      dispatch({ type: 'UPDATE_RESOURCE', resource: { ...deleteTarget, total: 0, available: 0, allocated: 0, status: 'Depleted' } });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary by type */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {summary.map(s => (
          <Card key={s.type} hover className="p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.type}</div>
            <div className="text-xl font-bold text-slate-100">{s.available}</div>
            <div className="text-xs text-slate-500 mb-2">available of {s.total}</div>
            <ProgressBar value={s.utilization} color={s.utilization > 80 ? 'danger' : s.utilization > 50 ? 'amber' : 'cyan'} />
            <div className="text-[10px] text-slate-600 mt-1">{s.utilization}% utilized</div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm w-52" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field py-2 text-sm cursor-pointer" style={{ width: 'auto' }}>
            <option value="all">All Types</option>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <History className="w-4 h-4" /> History
          </button>
          <button onClick={handleOpenCreate} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Package className="w-7 h-7" />} title="No Resources" message="No resources match your filters." action={<button onClick={handleOpenCreate} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Resource</button>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Total</th>
                  <th className="text-left p-3 font-medium">Available</th>
                  <th className="text-left p-3 font-medium">Allocated</th>
                  <th className="text-left p-3 font-medium">Zone</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Utilization</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {filtered.map(r => {
                  const util = r.total > 0 ? Math.round((r.allocated / r.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="hover:bg-navy-800/50 transition-colors">
                      <td className="p-3 text-xs text-slate-500 font-mono">{r.id}</td>
                      <td className="p-3 text-slate-200 font-medium">{r.type}</td>
                      <td className="p-3 text-slate-300">{r.total}</td>
                      <td className="p-3">
                        <span className={r.available === 0 ? 'text-danger-400 font-medium' : 'text-success-400 font-medium'}>{r.available}</span>
                      </td>
                      <td className="p-3 text-slate-300">{r.allocated}</td>
                      <td className="p-3 text-slate-400">{r.assignedZoneId ?? '—'}</td>
                      <td className="p-3">
                        <Badge variant={r.status === 'Available' ? 'success' : r.status === 'Depleted' ? 'critical' : r.status === 'Fully Allocated' ? 'warning' : 'info'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3" style={{ minWidth: 80 }}>
                        <ProgressBar value={util} color={util > 80 ? 'danger' : util > 50 ? 'amber' : 'cyan'} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setAllocTarget(r); setAllocZone(r.assignedZoneId ?? ''); setAllocQty(1); setAllocError(''); }} disabled={r.available === 0} className="btn-ghost p-1.5 disabled:opacity-30" title="Allocate">
                            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button onClick={() => { setReleaseTarget(r); setReleaseQty(1); }} disabled={r.allocated === 0} className="btn-ghost p-1.5 disabled:opacity-30" title="Release">
                            <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <button onClick={() => handleOpenEdit(r)} className="btn-ghost p-1.5" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
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

      {/* Add/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Resource' : 'Add Resource'} size="md">
        <div className="space-y-4">
          <Select label="Resource Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v as ResourceType }))} options={RESOURCE_TYPES.map(t => ({ value: t, label: t }))} />
          <div>
            <label className="label-field">Total Quantity</label>
            <input type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: Math.max(0, parseInt(e.target.value) || 0), available: editing ? f.available : Math.max(0, parseInt(e.target.value) || 0) - f.allocated }))} className="input-field" min={0} />
          </div>
          {editing && (
            <div>
              <label className="label-field">Available Quantity</label>
              <input type="number" value={form.available} onChange={e => setForm(f => ({ ...f, available: Math.min(f.total, Math.max(0, parseInt(e.target.value) || 0)) }))} className="input-field" min={0} max={form.total} />
            </div>
          )}
          {formError && <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400">{formError}</div>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Add Resource'}</button>
          </div>
        </div>
      </Modal>

      {/* Allocate modal */}
      <Modal open={!!allocTarget} onClose={() => setAllocTarget(null)} title={`Allocate ${allocTarget?.type ?? ''}`} size="sm">
        <div className="space-y-4">
          <div className="text-xs text-slate-500">Available: <span className="text-success-400 font-medium">{allocTarget?.available}</span></div>
          <div>
            <label className="label-field">Assign to Zone</label>
            <select value={allocZone} onChange={e => setAllocZone(e.target.value)} className="input-field cursor-pointer">
              <option value="">Select zone...</option>
              {state.zones.map(z => <option key={z.id} value={z.id}>{z.id} — {z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Quantity</label>
            <input type="number" value={allocQty} onChange={e => setAllocQty(Math.max(1, parseInt(e.target.value) || 1))} className="input-field" min={1} max={allocTarget?.available ?? 1} />
          </div>
          {allocError && <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400">{allocError}</div>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setAllocTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleAllocate} className="btn-primary">Allocate</button>
          </div>
        </div>
      </Modal>

      {/* Release modal */}
      <Modal open={!!releaseTarget} onClose={() => setReleaseTarget(null)} title={`Release ${releaseTarget?.type ?? ''}`} size="sm">
        <div className="space-y-4">
          <div className="text-xs text-slate-500">Allocated: <span className="text-amber-400 font-medium">{releaseTarget?.allocated}</span></div>
          <div>
            <label className="label-field">Quantity to Release</label>
            <input type="number" value={releaseQty} onChange={e => setReleaseQty(Math.max(1, parseInt(e.target.value) || 1))} className="input-field" min={1} max={releaseTarget?.allocated ?? 1} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setReleaseTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleRelease} className="btn-primary">Release</button>
          </div>
        </div>
      </Modal>

      {/* History modal */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Allocation History" size="lg">
        {state.allocations.length === 0 ? (
          <EmptyState icon={<History className="w-6 h-6" />} title="No History" message="No allocation actions yet." />
        ) : (
          <div className="divide-y divide-navy-800 max-h-96 overflow-y-auto">
            {state.allocations.map(a => (
              <div key={a.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`status-dot ${a.action === 'allocate' ? 'bg-success-400' : 'bg-amber-400'}`} />
                  <div>
                    <div className="text-xs text-slate-200">
                      {a.action === 'allocate' ? 'Allocated' : 'Released'} {a.quantity} {a.resourceType}
                      {a.action === 'allocate' ? ` → ${a.zoneId}` : ` from ${a.zoneId || 'assignment'}`}
                    </div>
                    <div className="text-[11px] text-slate-500">{formatRelativeTime(a.timestamp)}</div>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-mono">{a.resourceId}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove Resource" message={`Set ${deleteTarget?.type} (${deleteTarget?.id}) quantity to zero?`} confirmLabel="Remove" danger />
    </div>
  );
}
