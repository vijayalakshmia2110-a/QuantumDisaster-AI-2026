// ============================================================
// Core Domain Types — QuantumDisaster AI
// ============================================================

export type DisasterType = 'Flood' | 'Urban Fire' | 'Earthquake' | 'Cyclone';

export type Severity = 'Critical' | 'High' | 'Moderate' | 'Low';

export type IncidentStatus =
  | 'Reported'
  | 'Assessing'
  | 'Response Planned'
  | 'Resources Dispatched'
  | 'Resolved';

export type MedicalUrgency = 'Critical' | 'High' | 'Moderate' | 'Low';

export type Accessibility = 'Open' | 'Restricted' | 'Blocked' | 'Severed';

export type PriorityCategory = 'Critical' | 'High' | 'Moderate' | 'Low';

// ============================================================
// Incidents
// ============================================================

export interface Incident {
  id: string;
  name: string;
  disasterType: DisasterType;
  zoneId: string;
  severity: Severity;
  populationAffected: number;
  medicalUrgency: MedicalUrgency;
  infrastructureDamage: number; // 0-100
  accessibility: Accessibility;
  description: string;
  reportedTime: string; // ISO
  status: IncidentStatus;
}

// ============================================================
// Zones (affected geographic areas)
// ============================================================

export interface Zone {
  id: string;
  name: string;
  disasterType: DisasterType;
  severity: Severity;
  population: number;
  populationAffected: number;
  medicalUrgency: MedicalUrgency;
  infrastructureDamage: number; // 0-100
  accessibility: Accessibility;
  // Demand per resource type (units needed)
  demand: Partial<Record<ResourceType, number>>;
  // Map coordinates on the SVG grid (0-100 scale)
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// ============================================================
// Resources
// ============================================================

export type ResourceType =
  | 'Ambulance'
  | 'Rescue Team'
  | 'Fire Engine'
  | 'Medical Kit'
  | 'Food & Water'
  | 'Shelter';

export interface Resource {
  id: string;
  type: ResourceType;
  total: number;
  available: number;
  allocated: number;
  assignedZoneId: string | null;
  status: 'Available' | 'Partially Allocated' | 'Fully Allocated' | 'Depleted';
}

export interface Allocation {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  zoneId: string;
  quantity: number;
  timestamp: string;
  action: 'allocate' | 'release';
}

// ============================================================
// Vehicles
// ============================================================

export type VehicleType =
  | 'Ambulance'
  | 'Rescue Van'
  | 'Fire Engine'
  | 'Supply Truck'
  | 'Command Vehicle';

export type VehicleStatus =
  | 'Available'
  | 'Assigned'
  | 'En Route'
  | 'At Incident'
  | 'Maintenance';

export interface Vehicle {
  id: string;
  type: VehicleType;
  status: VehicleStatus;
  assignedZoneId: string | null;
  capacity: number;
  locationNode: string; // node ID in road network
  currentAssignment: string | null;
}

// ============================================================
// Road Network
// ============================================================

export interface RoadNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isDepot?: boolean;
  isHospital?: boolean;
}

export interface RoadSegment {
  id: string;
  from: string; // node ID
  to: string;   // node ID
  distance: number; // km
  travelTime: number; // minutes
  accessibility: Accessibility;
  blocked: boolean;
}

export interface RouteResult {
  path: string[];
  distance: number;
  travelTime: number;
  cost: number;
  blockedSegments: string[];
  explanation: string;
  feasible: boolean;
}

// ============================================================
// Risk Scoring
// ============================================================

export interface RiskWeights {
  severity: number;
  population: number;
  medical: number;
  infrastructure: number;
  accessibility: number;
}

export interface PriorityResult {
  score: number; // 0-100
  category: PriorityCategory;
  factors: {
    severity: number;
    population: number;
    medical: number;
    infrastructure: number;
    accessibility: number;
  };
  explanation: string;
}

// ============================================================
// Optimization
// ============================================================

export interface AllocationAssignment {
  zoneId: string;
  resourceType: ResourceType;
  quantity: number;
  priorityScore: number;
  travelCost: number;
}

export interface OptimizationResult {
  assignments: AllocationAssignment[];
  totalAllocated: number;
  totalUnmetDemand: number;
  utilizationRate: number; // 0-100
  allocationScore: number; // 0-100, higher is better
  constraintViolations: number;
  explanation: string[];
}

export interface OptimizationComparison {
  baseline: OptimizationResult;
  optimized: OptimizationResult;
  improvement: number; // percentage improvement
  scoreDelta: number;
}

// ============================================================
// Notifications & Activity
// ============================================================

export type NotificationType = 'incident' | 'zone' | 'allocation' | 'vehicle' | 'simulation' | 'demand' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: string;
}

// ============================================================
// User & Settings
// ============================================================

export type UserRole =
  | 'Emergency Coordinator'
  | 'Field Responder'
  | 'Medical Coordinator'
  | 'Administrator';

export interface User {
  displayName: string;
  email: string | null;
  role: UserRole;
  loginTime: string;
}

export interface AppSettings {
  simulationSpeed: number; // ticks per second (1-10)
  notifications: {
    incidentCreated: boolean;
    zoneCritical: boolean;
    resourceAllocated: boolean;
    vehicleAssigned: boolean;
    simulationFinished: boolean;
    demandUnmet: boolean;
  };
  riskWeights: RiskWeights;
  theme: 'dark-navy' | 'midnight' | 'arctic';
}

// ============================================================
// Simulation
// ============================================================

export type SimulationState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface SimulationStatus {
  state: SimulationState;
  scenarioId: string | null;
  tick: number;
  simTime: string; // simulated time label
  zones: Zone[];
  resources: Resource[];
  baseline: OptimizationResult | null;
  optimized: OptimizationResult | null;
  log: string[];
}

// ============================================================
// Scenarios (for simulation + demo)
// ============================================================

export interface Scenario {
  id: string;
  name: string;
  disasterType: DisasterType;
  description: string;
  zones: Zone[];
  resources: Resource[];
  vehicles: Vehicle[];
  roadNodes: RoadNode[];
  roadSegments: RoadSegment[];
}
