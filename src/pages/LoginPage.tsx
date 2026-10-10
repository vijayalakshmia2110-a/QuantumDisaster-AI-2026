import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, ArrowRight, User, Mail, AlertTriangle,
  Radio, Stethoscope, Settings, ShieldCheck,
} from 'lucide-react';
import { useApp, uid } from '@/context/AppContext';
import type { UserRole } from '@/types';

const ROLES: { role: UserRole; icon: typeof Radio; desc: string }[] = [
  { role: 'Emergency Coordinator', icon: Radio, desc: 'Full command center access. Manage incidents, resources, and simulations.' },
  { role: 'Field Responder', icon: Shield, desc: 'View incidents, zones, and route recommendations in the field.' },
  { role: 'Medical Coordinator', icon: Stethoscope, desc: 'Focus on medical urgency, ambulance allocation, and supply dispatch.' },
  { role: 'Administrator', icon: ShieldCheck, desc: 'Full system access including settings, data management, and configuration.' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState('');

  const from = (location.state as { from?: string })?.from ?? '/app/overview';

  const handleEnter = () => {
    setError('');
    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email or leave it blank.');
      return;
    }
    if (!selectedRole) {
      setError('Please select a role to continue.');
      return;
    }

    dispatch({
      type: 'SET_USER',
      user: {
        displayName: displayName.trim(),
        email: email.trim() || null,
        role: selectedRole,
        loginTime: new Date().toISOString(),
      },
    });

    // Add a welcome notification
    dispatch({
      type: 'ADD_NOTIFICATION',
      notification: {
        id: uid('ntf'),
        type: 'system',
        title: 'Welcome to Command Center',
        message: `Signed in as ${selectedRole}. Simulated data loaded.`,
        timestamp: new Date().toISOString(),
        read: false,
      },
    });

    navigate(from);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="lg:w-2/5 bg-navy-900 border-r border-navy-700 p-8 lg:p-12 flex flex-col justify-center grid-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-md mx-auto lg:mx-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/15 border border-cyan-600/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100">QuantumDisaster AI</div>
              <div className="text-xs text-cyan-400">Emergency Command Center</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-4 leading-tight">
            Coordinate emergency response with intelligent optimization.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            Enter the simulated command center to prioritize zones, allocate resources,
            optimize routes, and run disaster-response simulations.
          </p>
          <div className="space-y-2">
            {['AI-inspired risk scoring', 'QUBO-inspired resource optimization', 'Dijkstra route planning', 'Live disaster simulation'].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <span className="status-dot bg-cyan-400" />
                {f}
              </div>
            ))}
          </div>
          <div className="mt-8 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400/90">
              Mock authentication — no external service required. Your role and name are stored locally.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="lg:w-3/5 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-bold text-slate-100 mb-1">Enter Command Center</h1>
          <p className="text-sm text-slate-500 mb-6">Select your role to access the dashboard.</p>

          {/* Display name */}
          <div className="mb-4">
            <label className="label-field">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnter()}
                placeholder="e.g. Commander Sharma"
                className="input-field pl-10"
                maxLength={40}
                autoFocus
              />
            </div>
          </div>

          {/* Email (optional) */}
          <div className="mb-6">
            <label className="label-field">Email <span className="text-slate-600 normal-case">(optional)</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnter()}
                placeholder="commander@response.gov"
                className="input-field pl-10"
                maxLength={80}
              />
            </div>
          </div>

          {/* Role selection */}
          <div className="mb-6">
            <label className="label-field">Select Role</label>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {ROLES.map(({ role, icon: Icon, desc }) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    selectedRole === role
                      ? 'bg-cyan-600/15 border-cyan-500 ring-1 ring-cyan-500/30'
                      : 'bg-navy-850 border-navy-700 hover:border-cyan-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${selectedRole === role ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className={`text-xs font-semibold ${selectedRole === role ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 flex items-center gap-2 animate-slide-down">
              <AlertTriangle className="w-4 h-4 text-danger-400 shrink-0" />
              <span className="text-xs text-danger-400">{error}</span>
            </div>
          )}

          <button onClick={handleEnter} className="btn-primary w-full flex items-center justify-center gap-2">
            Enter Command Center
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-slate-600 text-center mt-4">
            By entering, you acknowledge this is a simulated prototype.
          </p>
        </div>
      </div>
    </div>
  );
}
