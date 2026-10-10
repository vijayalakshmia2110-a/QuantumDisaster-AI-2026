import { type ReactNode } from 'react';

// ============================================================
// UI Primitives — QuantumDisaster AI
// ============================================================

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`${hover ? 'panel-hover' : 'panel'} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-navy-700">
      <div className="flex items-center gap-3">
        {icon && <div className="text-cyan-400">{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'critical' | 'high' | 'moderate' | 'low' | 'info' | 'success' | 'warning' }) {
  const styles: Record<string, string> = {
    default: 'bg-navy-700 text-slate-300 border-navy-600',
    critical: 'bg-danger-500/15 text-danger-400 border-danger-600/40',
    high: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    moderate: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40',
    low: 'bg-success-500/15 text-success-400 border-success-500/40',
    info: 'bg-cyan-600/15 text-cyan-300 border-cyan-600/40',
    success: 'bg-success-500/15 text-success-400 border-success-500/40',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon, trend, color = 'cyan' }: { label: string; value: string | number; icon: ReactNode; trend?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    danger: 'text-danger-400 bg-danger-500/10',
    success: 'text-success-400 bg-success-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  };
  return (
    <Card hover className="p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.cyan}`}>
          {icon}
        </div>
        {trend && <span className="text-xs text-slate-500">{trend}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-100 mb-1">{value}</div>
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
    </Card>
  );
}

export function ProgressBar({ value, max = 100, color = 'cyan' }: { value: number; max?: number; color?: 'cyan' | 'amber' | 'danger' | 'success' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500',
    amber: 'bg-amber-500',
    danger: 'bg-danger-500',
    success: 'bg-success-500',
  };
  return (
    <div className="w-full h-2 rounded-full bg-navy-700 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center mb-4 text-slate-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{message}</p>
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (!open) return null;
  const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative panel w-full ${sizeMap[size]} max-h-[90vh] overflow-hidden flex flex-col animate-slide-up`}>
        <div className="flex items-center justify-between p-4 border-b border-navy-700 shrink-0">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg">✕</button>
        </div>
        <div className="overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Select({ label, value, onChange, options, className = '' }: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="label-field">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-cyan-600' : 'bg-navy-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  );
}

export function severityBadge(severity: string) {
  const map: Record<string, 'critical' | 'high' | 'moderate' | 'low'> = {
    Critical: 'critical', High: 'high', Moderate: 'moderate', Low: 'low',
  };
  return <Badge variant={map[severity] || 'default'}>{severity}</Badge>;
}

export function statusBadge(status: string) {
  const map: Record<string, 'success' | 'warning' | 'info' | 'critical' | 'default'> = {
    Available: 'success', Assigned: 'info', 'En Route': 'warning', 'At Incident': 'critical',
    Maintenance: 'default', Reported: 'info', Assessing: 'warning', 'Response Planned': 'info',
    'Resources Dispatched': 'warning', Resolved: 'success',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return iso;
  }
}
