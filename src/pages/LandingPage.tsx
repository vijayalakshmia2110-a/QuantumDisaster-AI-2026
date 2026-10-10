import { useNavigate } from 'react-router-dom';
import {
  Shield, Activity, Brain, PackageCheck, Route as RouteIcon, FlaskConical,
  ArrowRight, Play, AlertTriangle, Zap, Target, GitBranch, Cpu, Database,
  CheckCircle2, Layers,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 text-slate-200 overflow-x-hidden">
      {/* Nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/15 border border-cyan-600/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100">QuantumDisaster</span>
              <span className="text-cyan-400 text-sm font-bold"> AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="btn-ghost text-sm hidden sm:block">Sign In</button>
            <button onClick={() => navigate('/login')} className="btn-primary text-sm">
              Get Started
              <ArrowRight className="w-4 h-4 ml-1 inline" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-600/10 border border-cyan-600/20 mb-6 animate-fade-in">
            <span className="status-dot bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-300 font-medium tracking-wide">QHack India 2026 — Quantum AI & Software</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 leading-tight mb-6 animate-slide-up">
            Turning Disaster Intelligence into
            <br />
            <span className="text-cyan-400">Optimized Emergency Response</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed animate-slide-up">
            QuantumDisaster AI combines AI-assisted risk prioritization with quantum-inspired
            optimization to help coordinate emergency resources across multiple affected zones.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap animate-slide-up">
            <button onClick={() => navigate('/login')} className="btn-primary text-sm flex items-center gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/login')} className="btn-secondary text-sm flex items-center gap-2">
              <Play className="w-4 h-4" />
              Watch Demo
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-6 max-w-xl mx-auto">
            Simulated prototype. Does not predict real disasters, use real quantum hardware, or dispatch real emergency services.
          </p>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-navy-800">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="panel p-6">
            <div className="w-10 h-10 rounded-lg bg-danger-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-danger-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">The Problem</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              During disasters, emergency coordinators must rapidly prioritize affected zones and
              allocate limited resources — ambulances, rescue teams, medical supplies — under
              uncertainty, blocked roads, and competing demands. Manual decisions are slow,
              inconsistent, and often leave critical zones underserved.
            </p>
          </div>
          <div className="panel p-6">
            <div className="w-10 h-10 rounded-lg bg-success-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5 text-success-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Our Solution</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              A decision-support simulator that scores zone urgency using a transparent weighted
              risk model, then allocates resources via a QUBO-inspired classical optimizer that
              respects availability constraints, minimizes unmet demand, and explains every
              allocation decision to the coordinator.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-navy-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-2">Core Features</h2>
          <p className="text-sm text-slate-500 text-center mb-10">Four integrated capabilities for intelligent disaster response</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="panel p-5 hover:border-cyan-700 transition-all duration-200 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-navy-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-2">How the System Works</h2>
          <p className="text-sm text-slate-500 text-center mb-10">From incident data to optimized allocation in five stages</p>
          <div className="grid md:grid-cols-5 gap-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="panel p-4 text-center relative">
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <Icon className="w-7 h-7 text-cyan-400 mx-auto mb-3" />
                  <h4 className="text-xs font-semibold text-slate-200 mb-1">{step.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-navy-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-2">Technology Overview</h2>
          <p className="text-sm text-slate-500 text-center mb-10">Built entirely with free, open-source tools — no paid APIs or quantum hardware</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="panel p-4 flex items-start gap-3">
                  <Icon className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-navy-800">
        <div className="max-w-3xl mx-auto panel p-6 border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-1">Responsible AI Disclaimer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                QuantumDisaster AI is a prototype decision-support simulator for educational and
                research purposes. It uses an AI-inspired weighted scoring model — not a trained
                machine-learning model. The optimization engine is a classical simulation inspired
                by QUBO formulations — it does not use real quantum hardware and does not claim
                quantum speedup. All disaster data is simulated. This system does not predict actual
                disasters, does not connect to real emergency services, and should not be used for
                real-world emergency dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-navy-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-3">Ready to Enter the Command Center?</h2>
          <p className="text-sm text-slate-400 mb-6">Start the guided flood-emergency demo or explore the dashboard yourself.</p>
          <button onClick={() => navigate('/login')} className="btn-primary text-sm inline-flex items-center gap-2">
            Enter Command Center
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-navy-800">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-300">QuantumDisaster AI</span>
          </div>
          <p className="text-xs text-slate-600">QHack India 2026 — Quantum AI & Software Track</p>
          <p className="text-xs text-slate-600 mt-1">Prototype. All data is simulated. Not for real-world use.</p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: 'AI Risk Assessment',
    desc: 'Transparent weighted scoring of severity, population, medical urgency, infrastructure damage, and accessibility risk for each affected zone.',
    icon: Brain,
    color: 'bg-cyan-500/10 text-cyan-400',
  },
  {
    title: 'Intelligent Resource Allocation',
    desc: 'QUBO-inspired classical optimizer distributes limited emergency resources to minimize unmet demand and prioritize critical zones.',
    icon: PackageCheck,
    color: 'bg-success-500/10 text-success-400',
  },
  {
    title: 'Emergency Route Optimization',
    desc: "Dijkstra's algorithm finds feasible routes across a road network with blocked segments, accessibility constraints, and travel-time costs.",
    icon: RouteIcon,
    color: 'bg-amber-500/10 text-amber-400',
  },
  {
    title: 'What-If Simulation',
    desc: 'Modify resources, severity, population, or road blockages and instantly see how priorities, allocations, and unmet demand change.',
    icon: FlaskConical,
    color: 'bg-danger-500/10 text-danger-400',
  },
];

const STEPS = [
  { title: 'Input Incidents', desc: 'Enter disaster type, zone, severity, population, medical urgency, and accessibility.', icon: AlertTriangle },
  { title: 'Score Priority', desc: 'AI-inspired weighted model calculates a 0–100 priority score for each zone.', icon: Target },
  { title: 'Optimize Allocation', desc: 'QUBO-inspired optimizer assigns resources to minimize unmet demand.', icon: Zap },
  { title: 'Recommend Routes', desc: 'Dijkstra finds feasible paths accounting for blocked roads and accessibility.', icon: GitBranch },
  { title: 'Simulate & Compare', desc: 'Run live scenarios, compare baseline vs optimized, and explore what-if changes.', icon: FlaskConical },
];

const TECH = [
  { name: 'React + TypeScript', desc: 'Type-safe component architecture', icon: Layers },
  { name: 'Vite', desc: 'Fast dev server and build tool', icon: Zap },
  { name: 'Tailwind CSS', desc: 'Utility-first dark-navy design system', icon: Cpu },
  { name: 'React Router', desc: 'Client-side routing for all dashboard pages', icon: GitBranch },
  { name: 'Recharts', desc: 'Data visualization for analytics and charts', icon: Activity },
  { name: 'localStorage', desc: 'Client-side persistence for demo state', icon: Database },
];
