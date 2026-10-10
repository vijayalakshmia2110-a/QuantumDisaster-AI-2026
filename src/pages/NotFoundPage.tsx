import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, ChevronRight } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6 grid-bg">
      <div className="text-center max-w-md animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-danger-500/10 border border-danger-500/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-danger-400" />
        </div>
        <h1 className="text-5xl font-bold text-slate-100 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-300 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Return to the command center to continue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary text-sm flex items-center gap-1.5">
            <Home className="w-4 h-4" /> Home
          </button>
          <button onClick={() => navigate('/app/overview')} className="btn-primary text-sm flex items-center gap-1.5">
            Command Center <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
