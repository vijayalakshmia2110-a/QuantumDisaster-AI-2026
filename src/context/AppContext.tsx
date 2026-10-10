import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  Incident,
  Zone,
  Resource,
  Vehicle,
  Allocation,
  AppNotification,
  ActivityEntry,
  User,
  AppSettings,
  RoadNode,
  RoadSegment,
  ResourceType,
} from '@/types';
import {
  getInitialIncidents,
  getAllZones,
  getDefaultRoadNodes,
  getDefaultRoadSegments,
  SCENARIOS,
  getDefaultScenario,
} from '@/data/scenarios';
import { DEFAULT_WEIGHTS } from '@/engine/riskScoring';
import { calculatePriority } from '@/engine/riskScoring';

// ============================================================
// Application State & Reducer
// ============================================================

interface AppState {
  user: User | null;
  incidents: Incident[];
  zones: Zone[];
  resources: Resource[];
  vehicles: Vehicle[];
  allocations: Allocation[];
  notifications: AppNotification[];
  activities: ActivityEntry[];
  settings: AppSettings;
  roadNodes: RoadNode[];
  roadSegments: RoadSegment[];
  activeScenarioId: string;
}

type Action =
  | { type: 'SET_USER'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_INCIDENT'; incident: Incident }
  | { type: 'UPDATE_INCIDENT'; incident: Incident }
  | { type: 'DELETE_INCIDENT'; id: string }
  | { type: 'ADD_RESOURCE'; resource: Resource }
  | { type: 'UPDATE_RESOURCE'; resource: Resource }
  | { type: 'ALLOCATE_RESOURCE'; resourceId: string; zoneId: string; quantity: number }
  | { type: 'RELEASE_RESOURCE'; resourceId: string; quantity: number }
  | { type: 'ADD_VEHICLE'; vehicle: Vehicle }
  | { type: 'UPDATE_VEHICLE'; vehicle: Vehicle }
  | { type: 'ASSIGN_VEHICLE'; vehicleId: string; zoneId: string }
  | { type: 'RELEASE_VEHICLE'; vehicleId: string }
  | { type: 'ADD_NOTIFICATION'; notification: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'ADD_ACTIVITY'; activity: ActivityEntry }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'SET_SCENARIO'; scenarioId: string }
  | { type: 'LOAD_SCENARIO_DATA'; zones: Zone[]; resources: Resource[]; vehicles: Vehicle[] }
  | { type: 'UPDATE_ZONES'; zones: Zone[] }
  | { type: 'UPDATE_ROAD_SEGMENTS'; segments: RoadSegment[] }
  | { type: 'RESET_DEMO' };

const STORAGE_KEY = 'quantumdisaster-app-state-v1';

function defaultSettings(): AppSettings {
  return {
    simulationSpeed: 3,
    notifications: {
      incidentCreated: true,
      zoneCritical: true,
      resourceAllocated: true,
      vehicleAssigned: true,
      simulationFinished: true,
      demandUnmet: true,
    },
    riskWeights: { ...DEFAULT_WEIGHTS },
    theme: 'dark-navy',
  };
}

function initialState(): AppState {
  return {
    user: null,
    incidents: getInitialIncidents(),
    zones: getAllZones(),
    resources: getDefaultScenario().resources.map(r => ({ ...r })),
    vehicles: getDefaultScenario().vehicles.map(v => ({ ...v })),
    allocations: [],
    notifications: [],
    activities: [
      {
        id: 'act-init',
        action: 'System Initialized',
        detail: 'QuantumDisaster AI command center online. Sample data loaded.',
        timestamp: new Date().toISOString(),
        icon: 'Activity',
      },
    ],
    settings: defaultSettings(),
    roadNodes: getDefaultRoadNodes(),
    roadSegments: getDefaultRoadSegments(),
    activeScenarioId: 'flood',
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function pushNotification(
  state: AppState,
  n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>,
): AppNotification[] {
  if (!state.settings.notifications[n.type as keyof typeof state.settings.notifications]) {
    return state.notifications;
  }
  const notification: AppNotification = {
    ...n,
    id: uid('ntf'),
    timestamp: new Date().toISOString(),
    read: false,
  };
  return [notification, ...state.notifications].slice(0, 100);
}

function pushActivity(
  state: AppState,
  action: string,
  detail: string,
  icon: string,
): ActivityEntry[] {
  const activity: ActivityEntry = {
    id: uid('act'),
    action,
    detail,
    timestamp: new Date().toISOString(),
    icon,
  };
  return [activity, ...state.activities].slice(0, 50);
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.user,
        activities: pushActivity(state, 'User Login', `${action.user.displayName} entered as ${action.user.role}`, 'LogIn'),
      };

    case 'LOGOUT':
      return { ...state, user: null };

    case 'ADD_INCIDENT': {
      const zone = state.zones.find(z => z.id === action.incident.zoneId);
      const notifs = pushNotification(state, {
        type: 'incident',
        title: 'New Incident Reported',
        message: `${action.incident.name} — ${action.incident.severity} severity in zone ${action.incident.zoneId}.`,
      });
      return {
        ...state,
        incidents: [action.incident, ...state.incidents],
        notifications: notifs,
        activities: pushActivity(state, 'Incident Created', `${action.incident.name} reported in ${action.incident.zoneId}.`, 'AlertTriangle'),
      };
    }

    case 'UPDATE_INCIDENT': {
      const incident = action.incident;
      const oldIncident = state.incidents.find(i => i.id === incident.id);
      const notifs = oldIncident && oldIncident.status !== incident.status
        ? pushNotification(state, {
            type: 'incident',
            title: 'Incident Status Updated',
            message: `${incident.name} → ${incident.status}.`,
          })
        : state.notifications;
      return {
        ...state,
        incidents: state.incidents.map(i => i.id === incident.id ? incident : i),
        notifications: notifs,
        activities: pushActivity(state, 'Incident Updated', `${incident.name} status: ${incident.status}.`, 'Edit'),
      };
    }

    case 'DELETE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.filter(i => i.id !== action.id),
        activities: pushActivity(state, 'Incident Deleted', `Incident ${action.id} removed.`, 'Trash2'),
      };

    case 'ADD_RESOURCE':
      return {
        ...state,
        resources: [...state.resources, action.resource],
        activities: pushActivity(state, 'Resource Added', `${action.resource.type}: ${action.resource.total} units.`, 'PackagePlus'),
      };

    case 'UPDATE_RESOURCE':
      return {
        ...state,
        resources: state.resources.map(r => r.id === action.resource.id ? action.resource : r),
        activities: pushActivity(state, 'Resource Updated', `${action.resource.type} inventory modified.`, 'Edit'),
      };

    case 'ALLOCATE_RESOURCE': {
      const resource = state.resources.find(r => r.id === action.resourceId);
      if (!resource || resource.available < action.quantity || action.quantity <= 0) return state;

      const updatedResources = state.resources.map(r =>
        r.id === action.resourceId
          ? {
              ...r,
              available: r.available - action.quantity,
              allocated: r.allocated + action.quantity,
              assignedZoneId: action.zoneId,
              status: (r.available - action.quantity) === 0 ? 'Fully Allocated' as const
                    : (r.allocated + action.quantity) > 0 ? 'Partially Allocated' as const
                    : r.status,
            }
          : r
      );

      const allocation: Allocation = {
        id: uid('alloc'),
        resourceId: action.resourceId,
        resourceType: resource.type,
        zoneId: action.zoneId,
        quantity: action.quantity,
        timestamp: new Date().toISOString(),
        action: 'allocate',
      };

      const notifs = pushNotification(state, {
        type: 'allocation',
        title: 'Resource Allocated',
        message: `${action.quantity} ${resource.type} allocated to zone ${action.zoneId}.`,
      });

      return {
        ...state,
        resources: updatedResources,
        allocations: [allocation, ...state.allocations].slice(0, 200),
        notifications: notifs,
        activities: pushActivity(state, 'Resource Allocated', `${action.quantity} ${resource.type} → zone ${action.zoneId}.`, 'PackageCheck'),
      };
    }

    case 'RELEASE_RESOURCE': {
      const resource = state.resources.find(r => r.id === action.resourceId);
      if (!resource || resource.allocated < action.quantity || action.quantity <= 0) return state;

      const updatedResources = state.resources.map(r =>
        r.id === action.resourceId
          ? {
              ...r,
              available: r.available + action.quantity,
              allocated: r.allocated - action.quantity,
              assignedZoneId: r.allocated - action.quantity <= 0 ? null : r.assignedZoneId,
              status: (r.allocated - action.quantity) <= 0 ? 'Available' as const : r.status,
            }
          : r
      );

      const allocation: Allocation = {
        id: uid('alloc'),
        resourceId: action.resourceId,
        resourceType: resource.type,
        zoneId: resource.assignedZoneId ?? '',
        quantity: action.quantity,
        timestamp: new Date().toISOString(),
        action: 'release',
      };

      return {
        ...state,
        resources: updatedResources,
        allocations: [allocation, ...state.allocations].slice(0, 200),
        activities: pushActivity(state, 'Resource Released', `${action.quantity} ${resource.type} released from assignment.`, 'PackageMinus'),
      };
    }

    case 'ADD_VEHICLE':
      return {
        ...state,
        vehicles: [...state.vehicles, action.vehicle],
        activities: pushActivity(state, 'Vehicle Added', `${action.vehicle.type} ${action.vehicle.id} added to fleet.`, 'CarPlus'),
      };

    case 'UPDATE_VEHICLE':
      return {
        ...state,
        vehicles: state.vehicles.map(v => v.id === action.vehicle.id ? action.vehicle : v),
        activities: pushActivity(state, 'Vehicle Updated', `${action.vehicle.id} status: ${action.vehicle.status}.`, 'Edit'),
      };

    case 'ASSIGN_VEHICLE': {
      const vehicle = state.vehicles.find(v => v.id === action.vehicleId);
      if (!vehicle) return state;

      const updatedVehicles = state.vehicles.map(v =>
        v.id === action.vehicleId
          ? { ...v, status: 'Assigned' as const, assignedZoneId: action.zoneId, currentAssignment: `Zone ${action.zoneId}` }
          : v
      );

      const notifs = pushNotification(state, {
        type: 'vehicle',
        title: 'Vehicle Assigned',
        message: `${vehicle.type} ${vehicle.id} assigned to zone ${action.zoneId}.`,
      });

      return {
        ...state,
        vehicles: updatedVehicles,
        notifications: notifs,
        activities: pushActivity(state, 'Vehicle Assigned', `${vehicle.type} ${vehicle.id} → zone ${action.zoneId}.`, 'Truck'),
      };
    }

    case 'RELEASE_VEHICLE': {
      const vehicle = state.vehicles.find(v => v.id === action.vehicleId);
      if (!vehicle) return state;

      return {
        ...state,
        vehicles: state.vehicles.map(v =>
          v.id === action.vehicleId
            ? { ...v, status: 'Available' as const, assignedZoneId: null, currentAssignment: null }
            : v
        ),
        activities: pushActivity(state, 'Vehicle Released', `${vehicle.type} ${vehicle.id} returned to available.`, 'Truck'),
      };
    }

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.notification, ...state.notifications].slice(0, 100) };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'ADD_ACTIVITY':
      return { ...state, activities: [action.activity, ...state.activities].slice(0, 50) };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'SET_SCENARIO':
      return { ...state, activeScenarioId: action.scenarioId };

    case 'LOAD_SCENARIO_DATA':
      return {
        ...state,
        zones: action.zones,
        resources: action.resources,
        vehicles: action.vehicles,
        activities: pushActivity(state, 'Scenario Loaded', `Loaded scenario data for ${state.activeScenarioId}.`, 'Database'),
      };

    case 'UPDATE_ZONES':
      return { ...state, zones: action.zones };

    case 'UPDATE_ROAD_SEGMENTS':
      return { ...state, roadSegments: action.segments };

    case 'RESET_DEMO':
      return {
        ...initialState(),
        user: state.user,
        settings: state.settings,
      };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Helpers
  getZoneById: (id: string) => Zone | undefined;
  getIncidentById: (id: string) => Incident | undefined;
  getZonePriority: (zoneId: string) => ReturnType<typeof calculatePriority> | null;
  getAvailableByType: (type: ResourceType) => number;
  resetDemoData: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = initialState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      user: parsed.user ?? null,
    };
  } catch {
    return initialState();
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      const toSave = {
        user: state.user,
        incidents: state.incidents,
        zones: state.zones,
        resources: state.resources,
        vehicles: state.vehicles,
        allocations: state.allocations,
        notifications: state.notifications,
        activities: state.activities,
        settings: state.settings,
        roadNodes: state.roadNodes,
        roadSegments: state.roadSegments,
        activeScenarioId: state.activeScenarioId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // localStorage may be full or unavailable; non-fatal
    }
  }, [state]);

  const getZoneById = useCallback((id: string) => state.zones.find(z => z.id === id), [state.zones]);
  const getIncidentById = useCallback((id: string) => state.incidents.find(i => i.id === id), [state.incidents]);
  const getZonePriority = useCallback((zoneId: string) => {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) return null;
    return calculatePriority(zone, state.settings.riskWeights);
  }, [state.zones, state.settings.riskWeights]);
  const getAvailableByType = useCallback((type: ResourceType) =>
    state.resources.filter(r => r.type === type).reduce((s, r) => s + r.available, 0),
    [state.resources]);
  const resetDemoData = useCallback(() => dispatch({ type: 'RESET_DEMO' }), []);
  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

  return (
    <AppContext.Provider value={{ state, dispatch, getZoneById, getIncidentById, getZonePriority, getAvailableByType, resetDemoData, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { uid };
export { SCENARIOS };
