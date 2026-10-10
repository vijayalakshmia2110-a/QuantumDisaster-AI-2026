import type {
  Scenario,
  Zone,
  Resource,
  OptimizationResult,
  SimulationStatus,
  SimulationState,
} from '@/types';
import { baselineAllocation, optimizedAllocation, DEFAULT_OPT_CONFIG } from './optimization';
import { calculatePriority } from './riskScoring';

// ============================================================
// Simulation Engine — QuantumDisaster AI
// ============================================================
// Manages the live disaster simulation lifecycle:
// init → baseline → optimize → tick (escalation) → complete
// ============================================================

export function initSimulation(scenario: Scenario): SimulationStatus {
  const zones = scenario.zones.map(z => ({ ...z, demand: { ...z.demand } }));
  const resources = scenario.resources.map(r => ({ ...r }));

  const baseline = baselineAllocation(zones, resources, DEFAULT_OPT_CONFIG);
  const optimized = optimizedAllocation(zones, resources, DEFAULT_OPT_CONFIG);

  return {
    state: 'idle',
    scenarioId: scenario.id,
    tick: 0,
    simTime: 'T+00:00',
    zones,
    resources,
    baseline,
    optimized,
    log: [
      `Simulation initialized: ${scenario.name}.`,
      `Loaded ${zones.length} zones and ${resources.length} resource records.`,
      'Risk scores calculated for all zones.',
      'Baseline allocation computed.',
      'Quantum-inspired optimization computed.',
    ],
  };
}

export function startSimulation(status: SimulationStatus): SimulationStatus {
  if (status.state === 'completed' || status.state === 'error') {
    return { ...status, state: 'running' };
  }
  return {
    ...status,
    state: 'running',
    log: [...status.log, 'Simulation started.'],
  };
}

export function pauseSimulation(status: SimulationStatus): SimulationStatus {
  if (status.state !== 'running') return status;
  return {
    ...status,
    state: 'paused',
    log: [...status.log, 'Simulation paused.'],
  };
}

export function resumeSimulation(status: SimulationStatus): SimulationStatus {
  if (status.state !== 'paused') return status;
  return {
    ...status,
    state: 'running',
    log: [...status.log, 'Simulation resumed.'],
  };
}

export function tickSimulation(status: SimulationStatus): SimulationStatus {
  if (status.state !== 'running') return status;

  const tick = status.tick + 1;
  const minutes = tick * 5;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const simTime = `T+${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  // Evolve zones: severity may escalate, demand may increase, accessibility may worsen
  const zones = status.zones.map(z => {
    // 20% chance of escalation per tick (deterministic based on tick + zone hash)
    const hash = (tick * 31 + z.id.charCodeAt(2) * 17) % 10;
    let newZone = { ...z, demand: { ...z.demand } };

    if (hash < 2 && z.severity === 'Moderate') {
      newZone.severity = 'High';
      newZone.demand.Ambulance = (newZone.demand.Ambulance ?? 0) + 1;
    } else if (hash < 2 && z.severity === 'Low') {
      newZone.severity = 'Moderate';
    }

    // Accessibility degrades occasionally
    if (hash === 3 && z.accessibility === 'Open') {
      newZone.accessibility = 'Restricted';
    } else if (hash === 4 && z.accessibility === 'Restricted') {
      newZone.accessibility = 'Blocked';
    }

    // Medical urgency may increase
    if (hash === 5 && z.medicalUrgency === 'Moderate') {
      newZone.medicalUrgency = 'High';
      newZone.demand['Medical Kit'] = (newZone.demand['Medical Kit'] ?? 0) + 5;
    }

    return newZone;
  });

  // Recalculate allocations
  const baseline = baselineAllocation(zones, status.resources, DEFAULT_OPT_CONFIG);
  const optimized = optimizedAllocation(zones, status.resources, DEFAULT_OPT_CONFIG);

  const log = [...status.log];

  // Log significant events
  const escalated = zones.filter((z, i) => {
    const old = status.zones[i];
    return z.severity !== old.severity;
  });
  if (escalated.length > 0) {
    log.push(`[${simTime}] Severity escalated in ${escalated.length} zone(s): ${escalated.map(z => z.id).join(', ')}.`);
  }

  const accessChanged = zones.filter((z, i) => z.accessibility !== status.zones[i].accessibility);
  if (accessChanged.length > 0) {
    log.push(`[${simTime}] Accessibility degraded in ${accessChanged.length} zone(s).`);
  }

  if (optimized.totalUnmetDemand > 0) {
    log.push(`[${simTime}] Unmet demand: ${optimized.totalUnmetDemand} units. Optimization score: ${optimized.allocationScore}.`);
  }

  // Auto-complete after 24 ticks (2 hours simulated)
  const state: SimulationState = tick >= 24 ? 'completed' : 'running';
  if (state === 'completed') {
    log.push('Simulation completed — 2-hour operational window elapsed.');
  }

  return {
    ...status,
    state,
    tick,
    simTime,
    zones,
    baseline,
    optimized,
    log,
  };
}

export function resetSimulation(scenario: Scenario): SimulationStatus {
  return initSimulation(scenario);
}

export function runOptimizationOnly(status: SimulationStatus): SimulationStatus {
  const baseline = baselineAllocation(status.zones, status.resources, DEFAULT_OPT_CONFIG);
  const optimized = optimizedAllocation(status.zones, status.resources, DEFAULT_OPT_CONFIG);
  return {
    ...status,
    baseline,
    optimized,
    log: [...status.log, `[${status.simTime}] Optimization re-run. Score: ${optimized.allocationScore}. Unmet demand: ${optimized.totalUnmetDemand}.`],
  };
}

export function makeResourceUnavailable(
  status: SimulationStatus,
  resourceType: string,
  quantity: number,
): SimulationStatus {
  const resources = status.resources.map(r => {
    if (r.type === resourceType && r.available >= quantity) {
      const newAvailable = r.available - quantity;
      return {
        ...r,
        available: newAvailable,
        total: r.total - quantity,
        status: newAvailable === 0 ? 'Depleted' as const : newAvailable < r.total ? 'Partially Allocated' as const : r.status,
      };
    }
    return r;
  });

  const baseline = baselineAllocation(status.zones, resources, DEFAULT_OPT_CONFIG);
  const optimized = optimizedAllocation(status.zones, resources, DEFAULT_OPT_CONFIG);

  return {
    ...status,
    resources,
    baseline,
    optimized,
    log: [...status.log, `[${status.simTime}] Resource unavailable: ${quantity} ${resourceType} removed. Recalculated allocations. New score: ${optimized.allocationScore}.`],
  };
}

export function getZonePriorities(zones: Zone[]) {
  return zones.map(z => ({
    zone: z,
    priority: calculatePriority(z),
  }));
}
