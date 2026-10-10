import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Map, Package, Truck, Route,
  PlayCircle, BarChart3, Settings as SettingsIcon, Bell, LogOut,
  Menu, X, Shield, ChevronRight, Search,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatRelativeTime } from './ui';

const MENU_ITEMS = [
  { path: '/app/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/app/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/app/map', label: 'Disaster Map', icon: Map },
  { path: '/app/resources', label: 'Resources', icon: Package },
  { path: '/app/vehicles', label: 'Vehicles', icon: Truck },
  { path: '/app/routes', label: 'Route Optimizer', icon: Route },
  { path: '/app/simulation', label: 'Live Simulation', icon: PlayCircle },
  { path: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/app/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppLayout() {
  const { state, dispatch, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = state.notifications.filter(n => !n.read).length;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPage = MENU_ITEMS.find(m => location.pathname.startsWith(m.path));

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Sidebar — Desktop */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy-900 border-r border-navy-700 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 p-4 border-b border-navy-700 h-16 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-cyan-600/15 border border-cyan-600/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 leading-tight">QuantumDisaster</div>
            <div className="text-xs text-cyan-400 font-medium">AI Command Center</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden btn-ghost px-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-0.5 ${
                  active
                    ? 'bg-cyan-600/15 text-cyan-300 border-l-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-navy-700 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center text-xs font-bold text-cyan-400">
              {state.user?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{state.user?.displayName}</div>
              <div className="text-xs text-slate-500 truncate">{state.user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200">
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-navy-900 border-b border-navy-700 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost px-1">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-slate-100">{currentPage?.label ?? 'Dashboard'}</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Simulated operational environment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Simulated data indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="status-dot bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-medium">SIMULATED DATA</span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative btn-ghost p-2"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 panel shadow-2xl z-50 animate-slide-down max-h-96 flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b border-navy-700 shrink-0">
                    <span className="text-sm font-semibold text-slate-100">Notifications</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Mark all read
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
                        className="text-xs text-slate-500 hover:text-danger-400"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {state.notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500">No notifications</div>
                    ) : (
                      state.notifications.slice(0, 20).map(n => (
                        <div
                          key={n.id}
                          onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id })}
                          className={`p-3 border-b border-navy-800 cursor-pointer hover:bg-navy-800 transition-colors ${!n.read ? 'bg-cyan-600/5' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && <span className="status-dot bg-cyan-400 mt-1.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-200">{n.title}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                              <div className="text-[10px] text-slate-600 mt-1">{formatRelativeTime(n.timestamp)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 grid-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const location = useLocation();

  if (!state.user) {
    return <RedirectToLogin from={location.pathname} />;
  }
  return <>{children}</>;
}

function RedirectToLogin({ from }: { from: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login', { state: { from } });
  }, [navigate, from]);
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Redirecting to login...</div>
    </div>
  );
}
