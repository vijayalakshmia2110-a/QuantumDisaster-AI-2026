import type {
  Zone,
  Incident,
  RiskWeights,
  PriorityResult,
  PriorityCategory,
  Severity,
  MedicalUrgency,
  Accessibility,
} from '@/types';

// ============================================================
// AI-Inspired Risk Scoring Engine
// ============================================================
// This is a transparent, weighted scoring model.
// It is NOT a trained machine-learning model.
// It is an "AI-inspired" heuristic for demonstration purposes.
// ============================================================

export const DEFAULT_WEIGHTS: RiskWeights = {
  severity: 0.35,
  population: 0.25,
  medical: 0.25,
  infrastructure: 0.10,
  accessibility: 0.05,
};

export function normalizeWeights(weights: RiskWeights): RiskWeights {
  const sum =
    weights.severity +
    weights.population +
    weights.medical +
    weights.infrastructure +
    weights.accessibility;
  if (sum === 0) return DEFAULT_WEIGHTS;
  return {
    severity: weights.severity / sum,
    population: weights.population / sum,
    medical: weights.medical / sum,
    infrastructure: weights.infrastructure / sum,
    accessibility: weights.accessibility / sum,
  };
}

function severityToValue(s: Severity): number {
  switch (s) {
    case 'Critical': return 100;
    case 'High': return 75;
    case 'Moderate': return 50;
    case 'Low': return 25;
    default: return 0;
  }
}

function medicalToValue(m: MedicalUrgency): number {
  switch (m) {
    case 'Critical': return 100;
    case 'High': return 75;
    case 'Moderate': return 50;
    case 'Low': return 25;
    default: return 0;
  }
}

function accessibilityToValue(a: Accessibility): number {
  switch (a) {
    case 'Severed': return 100;
    case 'Blocked': return 80;
    case 'Restricted': return 50;
    case 'Open': return 10;
    default: return 0;
  }
}

export function normalizePopulation(populationAffected: number, maxPopulation: number): number {
  if (maxPopulation <= 0) return 0;
  return Math.min(100, Math.round((populationAffected / maxPopulation) * 100));
}

export function categoryFromScore(score: number): PriorityCategory {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

export function calculatePriority(
  zone: Pick<
    Zone,
    'severity' | 'populationAffected' | 'population' | 'medicalUrgency' | 'infrastructureDamage' | 'accessibility'
  >,
  weights: RiskWeights = DEFAULT_WEIGHTS,
): PriorityResult {
  const sevVal = severityToValue(zone.severity);
  const maxPop = Math.max(zone.population, zone.populationAffected, 1);
  const popVal = normalizePopulation(zone.populationAffected, maxPop);
  const medVal = medicalToValue(zone.medicalUrgency);
  const infraVal = Math.min(100, Math.max(0, zone.infrastructureDamage));
  const accVal = accessibilityToValue(zone.accessibility);

  const nw = normalizeWeights(weights);
  const score = Math.round(
    Math.max(0, Math.min(100,
      sevVal * nw.severity +
      popVal * nw.population +
      medVal * nw.medical +
      infraVal * nw.infrastructure +
      accVal * nw.accessibility
    ))
  );

  const category = categoryFromScore(score);
  const explanation = buildExplanation(score, category, {
    severity: sevVal,
    population: popVal,
    medical: medVal,
    infrastructure: infraVal,
    accessibility: accVal,
  }, nw);

  return {
    score,
    category,
    factors: {
      severity: sevVal,
      population: popVal,
      medical: medVal,
      infrastructure: infraVal,
      accessibility: accVal,
    },
    explanation,
  };
}

function buildExplanation(
  score: number,
  category: PriorityCategory,
  factors: PriorityResult['factors'],
  weights: RiskWeights,
): string {
  const parts: string[] = [];
  const w = (n: number) => `${Math.round(n * 100)}%`;

  parts.push(`Priority score ${score}/100 → ${category}.`);
  parts.push(
    `Severity ${factors.severity}×${w(weights.severity)}, ` +
    `Population ${factors.population}×${w(weights.population)}, ` +
    `Medical ${factors.medical}×${w(weights.medical)}, ` +
    `Infrastructure ${factors.infrastructure}×${w(weights.infrastructure)}, ` +
    `Accessibility ${factors.accessibility}×${w(weights.accessibility)}.`
  );

  const dominant = Object.entries({
    severity: factors.severity * weights.severity,
    population: factors.population * weights.population,
    medical: factors.medical * weights.medical,
    infrastructure: factors.infrastructure * weights.infrastructure,
    accessibility: factors.accessibility * weights.accessibility,
  }).sort((a, b) => b[1] - a[1])[0];

  parts.push(`Dominant contributing factor: ${dominant[0]}.`);
  return parts.join(' ');
}

export function incidentToZoneLike(incident: Incident) {
  return {
    severity: incident.severity,
    populationAffected: incident.populationAffected,
    population: incident.populationAffected,
    medicalUrgency: incident.medicalUrgency,
    infrastructureDamage: incident.infrastructureDamage,
    accessibility: incident.accessibility,
  };
}

export function priorityColor(category: PriorityCategory): string {
  switch (category) {
    case 'Critical': return 'text-danger-400';
    case 'High': return 'text-amber-400';
    case 'Moderate': return 'text-cyan-400';
    case 'Low': return 'text-success-400';
    default: return 'text-slate-400';
  }
}

export function priorityBg(category: PriorityCategory): string {
  switch (category) {
    case 'Critical': return 'bg-danger-500/20 border-danger-600/40 text-danger-400';
    case 'High': return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
    case 'Moderate': return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400';
    case 'Low': return 'bg-success-500/15 border-success-500/40 text-success-400';
    default: return 'bg-navy-700 border-navy-600 text-slate-400';
  }
}
