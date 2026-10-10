import type {
  Zone,
  Resource,
  ResourceType,
  OptimizationResult,
  OptimizationComparison,
  AllocationAssignment,
  RiskWeights,
} from '@/types';
import { calculatePriority } from './riskScoring';

// ============================================================
// Quantum-Inspired Optimization Engine — Classical Simulation
// ============================================================
// This module simulates a QUBO-style binary optimization approach
// using a classical greedy + local-search heuristic.
//
// It does NOT use real quantum hardware and does NOT claim
// quantum speedup. It is a classical simulation inspired by
// QUBO formulations used in quantum annealing.
// ============================================================

// --- QUBO Model Documentation ---
// Decision variables: x[z][r] ∈ {0,1} — assign 1 unit of resource r to zone z
// Objective: maximize Σ priority[z] × x[z][r] - λ × travelCost[z][r] × x[z][r]
// Constraints (penalty): μ × (Σ x[z][r] - available[r])² for over-allocation
// Priority reward: higher-priority zones get allocation preference
// Travel-cost penalty: distant or hard-to-reach zones cost more
// Constraint penalties: heavy penalty for exceeding availability

export interface OptimizationConfig {
  weights: RiskWeights;
  travelCostWeight: number; // λ
  constraintPenalty: number; // μ
}

export const DEFAULT_OPT_CONFIG: OptimizationConfig = {
  weights: {
    severity: 0.35,
    population: 0.25,
    medical: 0.25,
    infrastructure: 0.10,
    accessibility: 0.05,
  },
  travelCostWeight: 0.3,
  constraintPenalty: 50,
};

const ALL_RESOURCE_TYPES: ResourceType[] = [
  'Ambulance', 'Rescue Team', 'Fire Engine', 'Medical Kit', 'Food & Water', 'Shelter',
];

/**
 * Baseline allocation: proportional distribution by population affected.
 * Simple, fair, but ignores priority urgency.
 */
export function baselineAllocation(
  zones: Zone[],
  resources: Resource[],
  config: OptimizationConfig = DEFAULT_OPT_CONFIG,
): OptimizationResult {
  const assignments: AllocationAssignment[] = [];
  const remaining = new Map<ResourceType, number>();
  const resourceByType = new Map<ResourceType, Resource[]>();

  for (const r of resources) {
    remaining.set(r.type, (remaining.get(r.type) ?? 0) + r.available);
    if (!resourceByType.has(r.type)) resourceByType.set(r.type, []);
    resourceByType.get(r.type)!.push(r);
  }

  const totalPop = zones.reduce((s, z) => s + z.populationAffected, 0) || 1;

  for (const zone of zones) {
    const popShare = zone.populationAffected / totalPop;

    for (const rType of ALL_RESOURCE_TYPES) {
      const avail = remaining.get(rType) ?? 0;
      if (avail <= 0) continue;

      const demand = zone.demand[rType] ?? 0;
      if (demand <= 0) continue;

      const allocQty = Math.min(demand, Math.max(1, Math.round(avail * popShare)));
      const actualQty = Math.min(allocQty, avail);
      if (actualQty <= 0) continue;

      remaining.set(rType, avail - actualQty);
      const priority = calculatePriority(zone, config.weights);
      assignments.push({
        zoneId: zone.id,
        resourceType: rType,
        quantity: actualQty,
        priorityScore: priority.score,
        travelCost: estimateTravelCost(zone),
      });
    }
  }

  return evaluateResult(zones, resources, assignments, config);
}

/**
 * Quantum-inspired optimization: greedy by priority + local search swap.
 * Models the QUBO objective function and iteratively improves.
 */
export function optimizedAllocation(
  zones: Zone[],
  resources: Resource[],
  config: OptimizationConfig = DEFAULT_OPT_CONFIG,
): OptimizationResult {
  // Step 1: Compute priorities for all zones
  const zonePriorities = zones.map(z => ({
    zone: z,
    priority: calculatePriority(z, config.weights),
  }));

  // Step 2: Sort zones by priority score descending (urgency first)
  zonePriorities.sort((a, b) => b.priority.score - a.priority.score);

  // Step 3: Available resources pool
  const remaining = new Map<ResourceType, number>();
  for (const r of resources) {
    remaining.set(r.type, (remaining.get(r.type) ?? 0) + r.available);
  }

  const assignments: AllocationAssignment[] = [];

  // Step 4: Greedy assignment — highest priority zone first, fill demand
  for (const { zone, priority } of zonePriorities) {
    for (const rType of ALL_RESOURCE_TYPES) {
      const avail = remaining.get(rType) ?? 0;
      if (avail <= 0) continue;

      const demand = zone.demand[rType] ?? 0;
      if (demand <= 0) continue;

      // Allocate up to demand, limited by availability
      const allocQty = Math.min(demand, avail);
      if (allocQty <= 0) continue;

      remaining.set(rType, avail - allocQty);
      assignments.push({
        zoneId: zone.id,
        resourceType: rType,
        quantity: allocQty,
        priorityScore: priority.score,
        travelCost: estimateTravelCost(zone),
      });
    }
  }

  // Step 5: Local search — try swapping units from low-priority to high-priority zones
  const improved = localSearchSwap(zones, resources, assignments, config);

  return evaluateResult(zones, resources, improved, config);
}

/**
 * Local search: for each resource type, check if moving a unit from
 * a lower-priority zone to a higher-priority zone with unmet demand
 * improves the objective score.
 */
function localSearchSwap(
  zones: Zone[],
  resources: Resource[],
  assignments: AllocationAssignment[],
  config: OptimizationConfig,
): AllocationAssignment[] {
  const result = assignments.map(a => ({ ...a }));
  const zoneMap = new Map(zones.map(z => [z.id, z]));
  const priorities = new Map(zones.map(z => [z.id, calculatePriority(z, config.weights).score]));

  let improved = true;
  let iterations = 0;
  const maxIter = 50;

  while (improved && iterations < maxIter) {
    improved = false;
    iterations++;

    for (const rType of ALL_RESOURCE_TYPES) {
      const typeAssignments = result.filter(a => a.resourceType === rType);
      if (typeAssignments.length < 2) continue;

      // Sort by priority ascending (lowest first — candidate to lose a unit)
      const sorted = [...typeAssignments].sort((a, b) => a.priorityScore - b.priorityScore);

      // Check demand fulfillment
      for (let i = 0; i < sorted.length; i++) {
        const low = sorted[i];
        const lowZone = zoneMap.get(low.zoneId);
        if (!lowZone) continue;

        // Find a higher-priority zone with unmet demand for this resource
        for (let j = sorted.length - 1; j > i; j--) {
          const high = sorted[j];
          if (high.priorityScore <= low.priorityScore) break;

          const highZone = zoneMap.get(high.zoneId);
          if (!highZone) continue;

          const highDemand = highZone.demand[rType] ?? 0;
          const highAllocated = result
            .filter(a => a.zoneId === high.zoneId && a.resourceType === rType)
            .reduce((s, a) => s + a.quantity, 0);

          if (highAllocated < highDemand && low.quantity > 1) {
            // Swap one unit
            low.quantity -= 1;
            const existing = result.find(a => a.zoneId === high.zoneId && a.resourceType === rType);
            if (existing) {
              existing.quantity += 1;
            } else {
              result.push({
                zoneId: high.zoneId,
                resourceType: rType,
                quantity: 1,
                priorityScore: priorities.get(high.zoneId) ?? 0,
                travelCost: estimateTravelCost(highZone),
              });
            }
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }

  return result;
}

function estimateTravelCost(zone: Zone): number {
  // Simple heuristic: zones with worse accessibility have higher travel cost
  const accCost = { Open: 1, Restricted: 3, Blocked: 8, Severed: 20 };
  return accCost[zone.accessibility] ?? 5;
}

function evaluateResult(
  zones: Zone[],
  resources: Resource[],
  assignments: AllocationAssignment[],
  config: OptimizationConfig,
): OptimizationResult {
  const totalAllocated = assignments.reduce((s, a) => s + a.quantity, 0);

  // Calculate unmet demand
  let totalUnmetDemand = 0;
  let totalDemand = 0;
  for (const zone of zones) {
    for (const [rType, demand] of Object.entries(zone.demand)) {
      if (demand <= 0) continue;
      totalDemand += demand;
      const allocated = assignments
        .filter(a => a.zoneId === zone.id && a.resourceType === rType)
        .reduce((s, a) => s + a.quantity, 0);
      totalUnmetDemand += Math.max(0, demand - allocated);
    }
  }

  // Utilization rate
  const totalAvailable = resources.reduce((s, r) => s + r.available, 0);
  const utilizationRate = totalAvailable > 0
    ? Math.round((totalAllocated / totalAvailable) * 100)
    : 0;

  // Allocation score: reward fulfilling high-priority demand, penalize unmet demand + travel cost
  const priorityReward = assignments.reduce((s, a) => s + a.priorityScore * a.quantity, 0);
  const travelPenalty = assignments.reduce(
    (s, a) => s + a.travelCost * a.quantity * config.travelCostWeight, 0,
  );
  const unmetPenalty = totalUnmetDemand * 10;
  const rawScore = priorityReward - travelPenalty - unmetPenalty;

  // Normalize to 0-100
  const maxPossible = totalDemand * 100 || 1;
  const allocationScore = Math.max(0, Math.min(100, Math.round((rawScore / maxPossible) * 100)));

  // Constraint violations: check if any allocation exceeds available
  let constraintViolations = 0;
  const allocByType = new Map<ResourceType, number>();
  for (const a of assignments) {
    allocByType.set(a.resourceType, (allocByType.get(a.resourceType) ?? 0) + a.quantity);
  }
  for (const [rType, qty] of allocByType) {
    const avail = resources.filter(r => r.type === rType).reduce((s, r) => s + r.available, 0);
    if (qty > avail) constraintViolations++;
  }

  const explanation = buildExplanation(zones, assignments, totalAllocated, totalUnmetDemand, utilizationRate);

  return {
    assignments,
    totalAllocated,
    totalUnmetDemand,
    utilizationRate,
    allocationScore,
    constraintViolations,
    explanation,
  };
}

function buildExplanation(
  zones: Zone[],
  assignments: AllocationAssignment[],
  totalAllocated: number,
  unmetDemand: number,
  utilization: number,
): string[] {
  const lines: string[] = [];

  if (assignments.length === 0) {
    lines.push('No allocations produced — no zones with demand or no available resources.');
    return lines;
  }

  lines.push(`Allocated ${totalAllocated} resource units across ${new Set(assignments.map(a => a.zoneId)).size} zone(s).`);

  // Group by zone
  const byZone = new Map<string, AllocationAssignment[]>();
  for (const a of assignments) {
    if (!byZone.has(a.zoneId)) byZone.set(a.zoneId, []);
    byZone.get(a.zoneId)!.push(a);
  }

  for (const [zoneId, zoneAllocs] of byZone) {
    const zone = zones.find(z => z.id === zoneId);
    const zoneName = zone?.name ?? zoneId;
    const total = zoneAllocs.reduce((s, a) => s + a.quantity, 0);
    const topPriority = Math.max(...zoneAllocs.map(a => a.priorityScore));
    lines.push(`${zoneName}: ${total} units assigned (priority ${topPriority}).`);
  }

  if (unmetDemand > 0) {
    lines.push(`Unmet demand: ${unmetDemand} units remain unfulfilled.`);
  } else {
    lines.push('All demand fulfilled — no unmet demand.');
  }

  lines.push(`Resource utilization: ${utilization}%.`);

  return lines;
}

export function compareOptimizations(
  baseline: OptimizationResult,
  optimized: OptimizationResult,
): OptimizationComparison {
  const scoreDelta = optimized.allocationScore - baseline.allocationScore;
  const improvement = baseline.allocationScore > 0
    ? Math.round((scoreDelta / baseline.allocationScore) * 100)
    : 0;

  return {
    baseline,
    optimized,
    improvement,
    scoreDelta,
  };
}

export function runFullOptimization(
  zones: Zone[],
  resources: Resource[],
  config: OptimizationConfig = DEFAULT_OPT_CONFIG,
): OptimizationComparison {
  const baseline = baselineAllocation(zones, resources, config);
  const optimized = optimizedAllocation(zones, resources, config);
  return compareOptimizations(baseline, optimized);
}
