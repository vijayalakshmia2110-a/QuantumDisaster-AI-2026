import type {
  Scenario,
  Zone,
  Resource,
  Vehicle,
  RoadNode,
  RoadSegment,
  Incident,
  DisasterType,
} from '@/types';

// ============================================================
// Deterministic Sample Data — QuantumDisaster AI
// ============================================================
// All data is SIMULATED and does not represent real disasters.
// ============================================================

// --- Road Network (shared base, reused with per-scenario tweaks) ---

const BASE_ROAD_NODES: RoadNode[] = [
  { id: 'N1', label: 'Command Center', x: 15, y: 85, isDepot: true },
  { id: 'N2', label: 'Central Hub', x: 38, y: 60 },
  { id: 'N3', label: 'Hospital', x: 80, y: 30, isHospital: true },
  { id: 'N4', label: 'North Junction', x: 28, y: 30 },
  { id: 'N5', label: 'East Gate', x: 65, y: 55 },
  { id: 'N6', label: 'South Depot', x: 50, y: 88 },
  { id: 'N7', label: 'West Bridge', x: 10, y: 50 },
  { id: 'N8', label: 'Relief Camp', x: 88, y: 72 },
];

const BASE_ROAD_SEGMENTS: RoadSegment[] = [
  { id: 'R1', from: 'N1', to: 'N2', distance: 4.5, travelTime: 12, accessibility: 'Open', blocked: false },
  { id: 'R2', from: 'N2', to: 'N4', distance: 3.2, travelTime: 9, accessibility: 'Open', blocked: false },
  { id: 'R3', from: 'N2', to: 'N5', distance: 5.0, travelTime: 14, accessibility: 'Restricted', blocked: false },
  { id: 'R4', from: 'N5', to: 'N3', distance: 3.8, travelTime: 11, accessibility: 'Open', blocked: false },
  { id: 'R5', from: 'N1', to: 'N7', distance: 2.5, travelTime: 7, accessibility: 'Open', blocked: false },
  { id: 'R6', from: 'N7', to: 'N4', distance: 4.0, travelTime: 13, accessibility: 'Restricted', blocked: false },
  { id: 'R7', from: 'N4', to: 'N3', distance: 6.5, travelTime: 18, accessibility: 'Open', blocked: false },
  { id: 'R8', from: 'N1', to: 'N6', distance: 3.5, travelTime: 10, accessibility: 'Open', blocked: false },
  { id: 'R9', from: 'N6', to: 'N5', distance: 5.2, travelTime: 15, accessibility: 'Restricted', blocked: false },
  { id: 'R10', from: 'N5', to: 'N8', distance: 3.0, travelTime: 8, accessibility: 'Open', blocked: false },
  { id: 'R11', from: 'N6', to: 'N8', distance: 7.0, travelTime: 20, accessibility: 'Open', blocked: false },
  { id: 'R12', from: 'N3', to: 'N8', distance: 6.0, travelTime: 17, accessibility: 'Restricted', blocked: false },
];

// ============================================================
// Scenario 1: Flood Emergency (the guided demo scenario)
// ============================================================

function floodZones(): Zone[] {
  return [
    {
      id: 'F-01', name: 'Flood Zone F-01', disasterType: 'Flood',
      severity: 'High', population: 12000, populationAffected: 4500,
      medicalUrgency: 'Moderate', infrastructureDamage: 45, accessibility: 'Restricted',
      demand: { Ambulance: 4, 'Rescue Team': 3, 'Medical Kit': 20, 'Food & Water': 200, Shelter: 150 },
      x: 20, y: 18, w: 22, h: 16, color: '#3b82f6',
    },
    {
      id: 'F-02', name: 'Flood Zone F-02', disasterType: 'Flood',
      severity: 'Critical', population: 18000, populationAffected: 12000,
      medicalUrgency: 'High', infrastructureDamage: 70, accessibility: 'Blocked',
      demand: { Ambulance: 10, 'Rescue Team': 6, 'Medical Kit': 50, 'Food & Water': 500, Shelter: 400 },
      x: 48, y: 12, w: 24, h: 18, color: '#ef4444',
    },
    {
      id: 'F-03', name: 'Flood Zone F-03', disasterType: 'Flood',
      severity: 'High', population: 5000, populationAffected: 3000,
      medicalUrgency: 'High', infrastructureDamage: 55, accessibility: 'Severed',
      demand: { Ambulance: 5, 'Rescue Team': 4, 'Medical Kit': 15, 'Food & Water': 150, Shelter: 80 },
      x: 75, y: 18, w: 20, h: 14, color: '#f59e0b',
    },
    {
      id: 'F-04', name: 'Flood Zone F-04', disasterType: 'Flood',
      severity: 'High', population: 25000, populationAffected: 15000,
      medicalUrgency: 'Moderate', infrastructureDamage: 50, accessibility: 'Restricted',
      demand: { Ambulance: 6, 'Rescue Team': 5, 'Medical Kit': 30, 'Food & Water': 600, Shelter: 500 },
      x: 15, y: 45, w: 20, h: 15, color: '#3b82f6',
    },
    {
      id: 'F-05', name: 'Flood Zone F-05', disasterType: 'Flood',
      severity: 'Moderate', population: 10000, populationAffected: 3500,
      medicalUrgency: 'Low', infrastructureDamage: 30, accessibility: 'Open',
      demand: { Ambulance: 2, 'Rescue Team': 2, 'Medical Kit': 10, 'Food & Water': 120, Shelter: 100 },
      x: 42, y: 42, w: 18, h: 12, color: '#22d3ee',
    },
    {
      id: 'F-06', name: 'Flood Zone F-06', disasterType: 'Flood',
      severity: 'Critical', population: 8000, populationAffected: 6000,
      medicalUrgency: 'Critical', infrastructureDamage: 65, accessibility: 'Restricted',
      demand: { Ambulance: 8, 'Rescue Team': 5, 'Medical Kit': 40, 'Food & Water': 250, Shelter: 200 },
      x: 68, y: 45, w: 22, h: 15, color: '#ef4444',
    },
  ];
}

function defaultResources(): Resource[] {
  return [
    { id: 'R-A1', type: 'Ambulance', total: 15, available: 15, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-A2', type: 'Ambulance', total: 10, available: 10, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-T1', type: 'Rescue Team', total: 12, available: 12, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-T2', type: 'Rescue Team', total: 8, available: 8, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-F1', type: 'Fire Engine', total: 6, available: 6, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-M1', type: 'Medical Kit', total: 200, available: 200, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-M2', type: 'Medical Kit', total: 150, available: 150, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-W1', type: 'Food & Water', total: 1500, available: 1500, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-W2', type: 'Food & Water', total: 1000, available: 1000, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-S1', type: 'Shelter', total: 800, available: 800, allocated: 0, assignedZoneId: null, status: 'Available' },
    { id: 'R-S2', type: 'Shelter', total: 600, available: 600, allocated: 0, assignedZoneId: null, status: 'Available' },
  ];
}

function defaultVehicles(): Vehicle[] {
  return [
    { id: 'V-01', type: 'Ambulance', status: 'Available', assignedZoneId: null, capacity: 4, locationNode: 'N1', currentAssignment: null },
    { id: 'V-02', type: 'Ambulance', status: 'Available', assignedZoneId: null, capacity: 4, locationNode: 'N1', currentAssignment: null },
    { id: 'V-03', type: 'Rescue Van', status: 'Available', assignedZoneId: null, capacity: 8, locationNode: 'N1', currentAssignment: null },
    { id: 'V-04', type: 'Rescue Van', status: 'Available', assignedZoneId: null, capacity: 8, locationNode: 'N6', currentAssignment: null },
    { id: 'V-05', type: 'Fire Engine', status: 'Available', assignedZoneId: null, capacity: 6, locationNode: 'N1', currentAssignment: null },
    { id: 'V-06', type: 'Supply Truck', status: 'Available', assignedZoneId: null, capacity: 20, locationNode: 'N6', currentAssignment: null },
    { id: 'V-07', type: 'Supply Truck', status: 'Available', assignedZoneId: null, capacity: 20, locationNode: 'N1', currentAssignment: null },
    { id: 'V-08', type: 'Command Vehicle', status: 'Available', assignedZoneId: null, capacity: 5, locationNode: 'N1', currentAssignment: null },
    { id: 'V-09', type: 'Ambulance', status: 'Maintenance', assignedZoneId: null, capacity: 4, locationNode: 'N7', currentAssignment: null },
    { id: 'V-10', type: 'Rescue Van', status: 'Available', assignedZoneId: null, capacity: 8, locationNode: 'N7', currentAssignment: null },
  ];
}

const FLOOD_ROAD_SEGMENTS: RoadSegment[] = BASE_ROAD_SEGMENTS.map(s => {
  if (s.id === 'R3') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  if (s.id === 'R6') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  if (s.id === 'R9') return { ...s, accessibility: 'Restricted' as const };
  return s;
});

// ============================================================
// Scenario 2: Urban Fire
// ============================================================

function fireZones(): Zone[] {
  return [
    {
      id: 'U-01', name: 'Fire Zone U-01', disasterType: 'Urban Fire',
      severity: 'Critical', population: 6000, populationAffected: 4000,
      medicalUrgency: 'Critical', infrastructureDamage: 80, accessibility: 'Restricted',
      demand: { 'Fire Engine': 5, Ambulance: 8, 'Rescue Team': 4, 'Medical Kit': 40, Shelter: 100 },
      x: 30, y: 20, w: 22, h: 16, color: '#ef4444',
    },
    {
      id: 'U-02', name: 'Fire Zone U-02', disasterType: 'Urban Fire',
      severity: 'High', population: 4000, populationAffected: 2500,
      medicalUrgency: 'High', infrastructureDamage: 60, accessibility: 'Open',
      demand: { 'Fire Engine': 3, Ambulance: 5, 'Rescue Team': 3, 'Medical Kit': 20, Shelter: 60 },
      x: 58, y: 25, w: 20, h: 14, color: '#f59e0b',
    },
    {
      id: 'U-03', name: 'Fire Zone U-03', disasterType: 'Urban Fire',
      severity: 'Moderate', population: 3000, populationAffected: 1000,
      medicalUrgency: 'Moderate', infrastructureDamage: 35, accessibility: 'Open',
      demand: { 'Fire Engine': 1, Ambulance: 2, 'Rescue Team': 1, 'Medical Kit': 8, Shelter: 30 },
      x: 45, y: 50, w: 18, h: 12, color: '#22d3ee',
    },
    {
      id: 'U-04', name: 'Fire Zone U-04', disasterType: 'Urban Fire',
      severity: 'High', population: 5000, populationAffected: 3000,
      medicalUrgency: 'High', infrastructureDamage: 55, accessibility: 'Restricted',
      demand: { 'Fire Engine': 2, Ambulance: 4, 'Rescue Team': 2, 'Medical Kit': 15, Shelter: 50 },
      x: 72, y: 48, w: 20, h: 14, color: '#f59e0b',
    },
  ];
}

const FIRE_ROAD_SEGMENTS: RoadSegment[] = BASE_ROAD_SEGMENTS.map(s => {
  if (s.id === 'R2') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  return s;
});

// ============================================================
// Scenario 3: Earthquake
// ============================================================

function earthquakeZones(): Zone[] {
  return [
    {
      id: 'E-01', name: 'Quake Zone E-01', disasterType: 'Earthquake',
      severity: 'Critical', population: 20000, populationAffected: 16000,
      medicalUrgency: 'Critical', infrastructureDamage: 90, accessibility: 'Severed',
      demand: { Ambulance: 12, 'Rescue Team': 8, 'Medical Kit': 60, 'Food & Water': 800, Shelter: 600 },
      x: 25, y: 15, w: 24, h: 18, color: '#ef4444',
    },
    {
      id: 'E-02', name: 'Quake Zone E-02', disasterType: 'Earthquake',
      severity: 'High', population: 15000, populationAffected: 8000,
      medicalUrgency: 'High', infrastructureDamage: 65, accessibility: 'Blocked',
      demand: { Ambulance: 7, 'Rescue Team': 5, 'Medical Kit': 35, 'Food & Water': 400, Shelter: 300 },
      x: 55, y: 20, w: 22, h: 16, color: '#f59e0b',
    },
    {
      id: 'E-03', name: 'Quake Zone E-03', disasterType: 'Earthquake',
      severity: 'Moderate', population: 10000, populationAffected: 3000,
      medicalUrgency: 'Moderate', infrastructureDamage: 40, accessibility: 'Restricted',
      demand: { Ambulance: 3, 'Rescue Team': 2, 'Medical Kit': 12, 'Food & Water': 150, Shelter: 100 },
      x: 70, y: 50, w: 20, h: 14, color: '#22d3ee',
    },
    {
      id: 'E-04', name: 'Quake Zone E-04', disasterType: 'Earthquake',
      severity: 'High', population: 12000, populationAffected: 7000,
      medicalUrgency: 'High', infrastructureDamage: 55, accessibility: 'Restricted',
      demand: { Ambulance: 5, 'Rescue Team': 4, 'Medical Kit': 25, 'Food & Water': 300, Shelter: 200 },
      x: 18, y: 48, w: 20, h: 14, color: '#f59e0b',
    },
  ];
}

const EARTHQUAKE_ROAD_SEGMENTS: RoadSegment[] = BASE_ROAD_SEGMENTS.map(s => {
  if (s.id === 'R6') return { ...s, blocked: true, accessibility: 'Severed' as const };
  if (s.id === 'R7') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  if (s.id === 'R12') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  return s;
});

// ============================================================
// Scenario 4: Cyclone
// ============================================================

function cycloneZones(): Zone[] {
  return [
    {
      id: 'C-01', name: 'Cyclone Zone C-01', disasterType: 'Cyclone',
      severity: 'Critical', population: 30000, populationAffected: 22000,
      medicalUrgency: 'High', infrastructureDamage: 75, accessibility: 'Blocked',
      demand: { Ambulance: 10, 'Rescue Team': 7, 'Medical Kit': 50, 'Food & Water': 1000, Shelter: 800 },
      x: 30, y: 18, w: 26, h: 18, color: '#ef4444',
    },
    {
      id: 'C-02', name: 'Cyclone Zone C-02', disasterType: 'Cyclone',
      severity: 'High', population: 18000, populationAffected: 10000,
      medicalUrgency: 'High', infrastructureDamage: 60, accessibility: 'Restricted',
      demand: { Ambulance: 6, 'Rescue Team': 4, 'Medical Kit': 30, 'Food & Water': 500, Shelter: 400 },
      x: 62, y: 22, w: 22, h: 16, color: '#f59e0b',
    },
    {
      id: 'C-03', name: 'Cyclone Zone C-03', disasterType: 'Cyclone',
      severity: 'Moderate', population: 8000, populationAffected: 2000,
      medicalUrgency: 'Moderate', infrastructureDamage: 35, accessibility: 'Open',
      demand: { Ambulance: 2, 'Rescue Team': 2, 'Medical Kit': 10, 'Food & Water': 100, Shelter: 80 },
      x: 20, y: 50, w: 18, h: 12, color: '#22d3ee',
    },
    {
      id: 'C-04', name: 'Cyclone Zone C-04', disasterType: 'Cyclone',
      severity: 'High', population: 14000, populationAffected: 8000,
      medicalUrgency: 'Moderate', infrastructureDamage: 50, accessibility: 'Restricted',
      demand: { Ambulance: 4, 'Rescue Team': 3, 'Medical Kit': 20, 'Food & Water': 350, Shelter: 250 },
      x: 50, y: 48, w: 22, h: 15, color: '#f59e0b',
    },
  ];
}

const CYCLONE_ROAD_SEGMENTS: RoadSegment[] = BASE_ROAD_SEGMENTS.map(s => {
  if (s.id === 'R3') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  if (s.id === 'R9') return { ...s, blocked: true, accessibility: 'Blocked' as const };
  if (s.id === 'R11') return { ...s, accessibility: 'Restricted' as const };
  return s;
});

// ============================================================
// Scenario Definitions
// ============================================================

export const SCENARIOS: Scenario[] = [
  {
    id: 'flood',
    name: 'Flood Emergency',
    disasterType: 'Flood',
    description: 'Severe flooding across 6 zones with varying severity, medical demand, and road access.',
    zones: floodZones(),
    resources: defaultResources(),
    vehicles: defaultVehicles(),
    roadNodes: BASE_ROAD_NODES,
    roadSegments: FLOOD_ROAD_SEGMENTS,
  },
  {
    id: 'fire',
    name: 'Urban Fire',
    disasterType: 'Urban Fire',
    description: 'Multiple structural fires across 4 urban zones with critical medical needs.',
    zones: fireZones(),
    resources: defaultResources().map(r => {
      if (r.type === 'Fire Engine') return { ...r, total: 10, available: 10 };
      return r;
    }),
    vehicles: defaultVehicles(),
    roadNodes: BASE_ROAD_NODES,
    roadSegments: FIRE_ROAD_SEGMENTS,
  },
  {
    id: 'earthquake',
    name: 'Earthquake',
    disasterType: 'Earthquake',
    description: 'Major earthquake affecting 4 zones with severe infrastructure damage and severed roads.',
    zones: earthquakeZones(),
    resources: defaultResources().map(r => {
      if (r.type === 'Fire Engine') return { ...r, total: 4, available: 4 };
      if (r.type === 'Rescue Team') return { ...r, total: 20, available: 20 };
      return r;
    }),
    vehicles: defaultVehicles(),
    roadNodes: BASE_ROAD_NODES,
    roadSegments: EARTHQUAKE_ROAD_SEGMENTS,
  },
  {
    id: 'cyclone',
    name: 'Cyclone',
    disasterType: 'Cyclone',
    description: 'Cyclone impact across 4 zones with widespread displacement and blocked coastal roads.',
    zones: cycloneZones(),
    resources: defaultResources().map(r => {
      if (r.type === 'Shelter') return { ...r, total: 1500, available: 1500 };
      if (r.type === 'Food & Water') return { ...r, total: 3000, available: 3000 };
      return r;
    }),
    vehicles: defaultVehicles(),
    roadNodes: BASE_ROAD_NODES,
    roadSegments: CYCLONE_ROAD_SEGMENTS,
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

export function getDefaultScenario(): Scenario {
  return SCENARIOS[0];
}

// ============================================================
// Initial Incidents (derived from flood scenario)
// ============================================================

export function getInitialIncidents(): Incident[] {
  const now = new Date();
  const iso = (offsetMin: number) => new Date(now.getTime() - offsetMin * 60000).toISOString();

  return [
    {
      id: 'INC-001',
      name: 'Riverside Flooding — Sector F-02',
      disasterType: 'Flood',
      zoneId: 'F-02',
      severity: 'Critical',
      populationAffected: 12000,
      medicalUrgency: 'High',
      infrastructureDamage: 70,
      accessibility: 'Blocked',
      description: 'Severe flooding in the riverside sector. Multiple buildings submerged. High medical urgency with stranded residents.',
      reportedTime: iso(45),
      status: 'Resources Dispatched',
    },
    {
      id: 'INC-002',
      name: 'Isolated Community — F-03',
      disasterType: 'Flood',
      zoneId: 'F-03',
      severity: 'High',
      populationAffected: 3000,
      medicalUrgency: 'High',
      infrastructureDamage: 55,
      accessibility: 'Severed',
      description: 'Community cut off by floodwaters. Road access severed. Medical supplies urgently needed.',
      reportedTime: iso(38),
      status: 'Assessing',
    },
    {
      id: 'INC-003',
      name: 'Urban Fire — Sector U-01',
      disasterType: 'Urban Fire',
      zoneId: 'U-01',
      severity: 'Critical',
      populationAffected: 4000,
      medicalUrgency: 'Critical',
      infrastructureDamage: 80,
      accessibility: 'Restricted',
      description: 'Large structural fire in the commercial district. Multiple casualties reported. Fire spread risk high.',
      reportedTime: iso(20),
      status: 'Response Planned',
    },
    {
      id: 'INC-004',
      name: 'Flood Evacuation — F-06',
      disasterType: 'Flood',
      zoneId: 'F-06',
      severity: 'Critical',
      populationAffected: 6000,
      medicalUrgency: 'Critical',
      infrastructureDamage: 65,
      accessibility: 'Restricted',
      description: 'Critical medical need in evacuation zone. Partially blocked route limiting access. Shelter demand high.',
      reportedTime: iso(15),
      status: 'Reported',
    },
    {
      id: 'INC-005',
      name: 'Quake Aftermath — E-01',
      disasterType: 'Earthquake',
      zoneId: 'E-01',
      severity: 'Critical',
      populationAffected: 16000,
      medicalUrgency: 'Critical',
      infrastructureDamage: 90,
      accessibility: 'Severed',
      description: 'Major earthquake damage. Infrastructure collapse. Roads severed. Mass casualties expected.',
      reportedTime: iso(60),
      status: 'Resources Dispatched',
    },
    {
      id: 'INC-006',
      name: 'Cyclone Landfall — C-01',
      disasterType: 'Cyclone',
      zoneId: 'C-01',
      severity: 'Critical',
      populationAffected: 22000,
      medicalUrgency: 'High',
      infrastructureDamage: 75,
      accessibility: 'Blocked',
      description: 'Cyclone made landfall. Widespread damage. Large-scale evacuation required.',
      reportedTime: iso(90),
      status: 'Response Planned',
    },
    {
      id: 'INC-007',
      name: 'Flood Relief — F-04',
      disasterType: 'Flood',
      zoneId: 'F-04',
      severity: 'High',
      populationAffected: 15000,
      medicalUrgency: 'Moderate',
      infrastructureDamage: 50,
      accessibility: 'Restricted',
      description: 'Large population affected by rising water levels. Shelter and food demand high.',
      reportedTime: iso(30),
      status: 'Assessing',
    },
  ];
}

// ============================================================
// All zones combined (for the main app data)
// ============================================================

export function getAllZones(): Zone[] {
  return SCENARIOS.flatMap(s => s.zones);
}

export function getDefaultRoadNodes(): RoadNode[] {
  return BASE_ROAD_NODES;
}

export function getDefaultRoadSegments(): RoadSegment[] {
  return FLOOD_ROAD_SEGMENTS;
}

export const DISASTER_TYPES: DisasterType[] = ['Flood', 'Urban Fire', 'Earthquake', 'Cyclone'];

// ============================================================
// Guided Demo Steps
// ============================================================

export interface DemoStep {
  title: string;
  description: string;
}

export const DEMO_STEPS: DemoStep[] = [
  { title: 'Load Flood Scenario', description: 'Initialize the flood emergency scenario with 6 affected zones.' },
  { title: 'Show Affected Zones', description: 'Display all 6 flood zones with their severity and population data.' },
  { title: 'Calculate Risk Scores', description: 'Run the AI-inspired risk scoring engine on each zone to determine priority.' },
  { title: 'Display Available Resources', description: 'Show the current resource inventory available for allocation.' },
  { title: 'Run Baseline Allocation', description: 'Execute proportional allocation based on population affected.' },
  { title: 'Run Quantum-Inspired Optimization', description: 'Execute the QUBO-inspired optimization with priority weighting and local search.' },
  { title: 'Compare Results', description: 'Compare baseline vs optimized allocation scores and unmet demand.' },
  { title: 'Explain Allocation Decisions', description: 'Show the reasoning behind each allocation recommendation.' },
  { title: 'Show Unmet Demand', description: 'Highlight any remaining unmet resource demand across zones.' },
  { title: 'Simulate Resource Unavailability', description: 'Remove 5 ambulances from inventory and recalculate recommendations.' },
  { title: 'Recalculate Recommendations', description: 'Re-run optimization with reduced resources and show updated allocations.' },
];
