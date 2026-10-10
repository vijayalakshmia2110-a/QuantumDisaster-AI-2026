import type {
  RoadNode,
  RoadSegment,
  RouteResult,
  Accessibility,
} from '@/types';

// ============================================================
// Route Optimization Engine — Dijkstra's Algorithm
// ============================================================
// Implements Dijkstra's shortest-path algorithm with
// blocked-road penalties and accessibility constraints.
// ============================================================

const ACCESSIBILITY_COST: Record<Accessibility, number> = {
  Open: 1.0,
  Restricted: 1.5,
  Blocked: 3.0,
  Severed: 10.0,
};

interface Graph {
  nodes: Map<string, RoadNode>;
  adjacency: Map<string, { to: string; segment: RoadSegment }[]>;
}

function buildGraph(nodes: RoadNode[], segments: RoadSegment[]): Graph {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map<string, { to: string; segment: RoadSegment }[]>();

  for (const n of nodes) {
    adjacency.set(n.id, []);
  }

  for (const seg of segments) {
    if (!adjacency.has(seg.from)) adjacency.set(seg.from, []);
    if (!adjacency.has(seg.to)) adjacency.set(seg.to, []);
    adjacency.get(seg.from)!.push({ to: seg.to, segment: seg });
    adjacency.get(seg.to)!.push({ to: seg.from, segment: seg }); // bidirectional
  }

  return { nodes: nodeMap, adjacency };
}

function segmentCost(seg: RoadSegment): number {
  if (seg.blocked) return Infinity;
  const accMultiplier = ACCESSIBILITY_COST[seg.accessibility] ?? 1.5;
  return seg.travelTime * accMultiplier;
}

interface DijkstraResult {
  dist: Map<string, number>;
  prev: Map<string, string | null>;
}

function dijkstra(graph: Graph, start: string): DijkstraResult {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const nodeId of graph.nodes.keys()) {
    dist.set(nodeId, Infinity);
    prev.set(nodeId, null);
  }
  dist.set(start, 0);

  while (true) {
    // Find unvisited node with min distance
    let u: string | null = null;
    let minDist = Infinity;
    for (const [nodeId, d] of dist) {
      if (!visited.has(nodeId) && d < minDist) {
        minDist = d;
        u = nodeId;
      }
    }
    if (u === null || minDist === Infinity) break;
    visited.add(u);

    const neighbors = graph.adjacency.get(u) ?? [];
    for (const { to, segment } of neighbors) {
      if (visited.has(to)) continue;
      const cost = segmentCost(segment);
      if (cost === Infinity) continue;
      const alt = dist.get(u)! + cost;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, u);
      }
    }
  }

  return { dist, prev };
}

function reconstructPath(prev: Map<string, string | null>, target: string): string[] {
  const path: string[] = [];
  let current: string | null = target;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }
  return path;
}

export interface RouteOptions {
  origin: string;
  destination: string;
  vehicleType?: string;
  incidentPriority?: number;
  allowBlocked?: boolean;
}

export function findRoute(
  nodes: RoadNode[],
  segments: RoadSegment[],
  options: RouteOptions,
): { primary: RouteResult; alternative: RouteResult | null } {
  const graph = buildGraph(nodes, segments);

  // Primary route: standard Dijkstra (blocked = Infinity)
  const result1 = dijkstra(graph, options.origin);
  const dist1 = result1.dist.get(options.destination) ?? Infinity;

  let primary: RouteResult;
  if (dist1 === Infinity) {
    primary = {
      path: [],
      distance: 0,
      travelTime: 0,
      cost: Infinity,
      blockedSegments: findBlockedOnPath(graph, options.origin, options.destination),
      explanation: `No feasible route from ${nodes.find(n => n.id === options.origin)?.label ?? options.origin} to ${nodes.find(n => n.id === options.destination)?.label ?? options.destination}. All paths are blocked or inaccessible.`,
      feasible: false,
    };
  } else {
    const path = reconstructPath(result1.prev, options.destination);
    primary = buildRouteResult(graph, path, nodes, options);
  }

  // Alternative route: find second path by removing the first path's segments
  let alternative: RouteResult | null = null;
  if (primary.feasible && primary.path.length > 2) {
    // Remove segments used in primary path
    const primarySegments = new Set<string>();
    for (let i = 0; i < primary.path.length - 1; i++) {
      const seg = findSegment(segments, primary.path[i], primary.path[i + 1]);
      if (seg) primarySegments.add(seg.id);
    }
    const altSegments = segments.filter(s => !primarySegments.has(s.id));
    const altGraph = buildGraph(nodes, altSegments);
    const result2 = dijkstra(altGraph, options.origin);
    const dist2 = result2.dist.get(options.destination) ?? Infinity;

    if (dist2 !== Infinity) {
      const altPath = reconstructPath(result2.prev, options.destination);
      if (altPath.length > 0 && altPath.join(',') !== primary.path.join(',')) {
        alternative = buildRouteResult(altGraph, altPath, nodes, options);
      }
    }
  }

  return { primary, alternative };
}

function findSegment(segments: RoadSegment[], from: string, to: string): RoadSegment | undefined {
  return segments.find(s =>
    (s.from === from && s.to === to) || (s.from === to && s.to === from)
  );
}

function buildRouteResult(
  graph: Graph,
  path: string[],
  nodes: RoadNode[],
  options: RouteOptions,
): RouteResult {
  let distance = 0;
  let travelTime = 0;
  let cost = 0;
  const blockedSegments: string[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const neighbors = graph.adjacency.get(path[i]) ?? [];
    const edge = neighbors.find(n => n.to === path[i + 1]);
    if (edge) {
      distance += edge.segment.distance;
      travelTime += edge.segment.travelTime;
      cost += segmentCost(edge.segment);
      if (edge.segment.blocked) {
        blockedSegments.push(edge.segment.id);
      }
    }
  }

  const pathLabels = path.map(id => nodes.find(n => n.id === id)?.label ?? id);
  const originLabel = pathLabels[0] ?? options.origin;
  const destLabel = pathLabels[pathLabels.length - 1] ?? options.destination;

  const explanation = buildRouteExplanation(pathLabels, distance, travelTime, cost, blockedSegments);

  return {
    path,
    distance: Math.round(distance * 10) / 10,
    travelTime: Math.round(travelTime),
    cost: Math.round(cost * 10) / 10,
    blockedSegments,
    explanation,
    feasible: true,
  };
}

function buildRouteExplanation(
  pathLabels: string[],
  distance: number,
  travelTime: number,
  cost: number,
  blockedSegments: string[],
): string {
  const lines: string[] = [];
  lines.push(`Route: ${pathLabels.join(' → ')}.`);
  lines.push(`Distance: ${distance.toFixed(1)} km, estimated travel time: ${travelTime} min, cost score: ${cost.toFixed(1)}.`);
  if (blockedSegments.length > 0) {
    lines.push(`Warning: ${blockedSegments.length} blocked segment(s) on route.`);
  } else {
    lines.push('All segments on this route are accessible.');
  }
  return lines.join(' ');
}

function findBlockedOnPath(graph: Graph, origin: string, dest: string): string[] {
  const blocked: string[] = [];
  for (const [, neighbors] of graph.adjacency) {
    for (const { segment } of neighbors) {
      if (segment.blocked) blocked.push(segment.id);
    }
  }
  return [...new Set(blocked)];
}
