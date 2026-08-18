export type BluetoothConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export type MoveCommand = 'F' | 'B' | 'L' | 'R' | 'S';

export type CommandSource = 'MANUAL' | 'AUTONOMOUS' | 'SAFETY_OVERRIDE' | 'SYSTEM';

export type ManeuverType =
  | 'START'
  | 'STRAIGHT'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'TURN_SLIGHT_LEFT'
  | 'TURN_SLIGHT_RIGHT'
  | 'TURN_SHARP_LEFT'
  | 'TURN_SHARP_RIGHT'
  | 'UTURN'
  | 'ARRIVE';

export type StepExecutionStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStep {
  id: string;
  stepIndex: number;
  maneuver: ManeuverType;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number; // calibrated calculation
  command: MoveCommand; // 'F' | 'L' | 'R' | 'S'
  turnCommand?: MoveCommand; // 'L' | 'R' if turn required before forward motion
  startLocation: LatLng;
  endLocation: LatLng;
  status: StepExecutionStatus;
  progressPercent?: number;
}

export interface RoutePlan {
  id: string;
  name: string;
  description?: string;
  origin: { name: string; location: LatLng };
  destination: { name: string; location: LatLng };
  totalDistanceMeters: number;
  estimatedDurationSec: number;
  steps: RouteStep[];
  polylineCoordinates: LatLng[];
  createdAt: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

export type ExecutionMode = 'TIME_BASED' | 'GPS_DISTANCE_BASED';

export interface CalibrationSettings {
  bluetoothDeviceName: string;
  bluetoothMac: string;
  googleDirectionsApiKey: string;
  turnDurationMs: number; // duration for 90-degree pivot turn in ms (default: 850)
  secondsPerMeter: number; // time to travel 1 meter in seconds (default: 1.5)
  gpsTriggerThresholdMeters: number; // threshold distance to reach waypoint (default: 5.0)
  safetyStopBufferMs: number; // stop pause buffer between maneuvers (default: 400)
  executionMode: ExecutionMode;
  autoReconnect: boolean;
  enableAudioBeeps: boolean;
  simulationSpeedMultiplier: number;
  motorPwmSpeed: number; // 0 - 255 for Arduino PWM
}

export interface RobotTelemetry {
  currentGps: {
    lat: number;
    lng: number;
    accuracy: number; // in meters
    speed: number | null; // in m/s
    heading: number | null; // in degrees
    timestamp: number;
  };
  isGpsLocked: boolean;
  isSimulatedGps: boolean;
  activeStepIndex: number;
  distanceToNextWaypoint: number; // meters
  distanceToFinalDestination: number; // meters
  bearingToNextWaypoint: number; // degrees
  totalDistanceTravelled: number; // meters
  currentManeuver: string;
  currentCommand: MoveCommand;
  lastCommandSent: {
    command: MoveCommand;
    time: string;
    source: CommandSource;
    description: string;
  } | null;
  batteryPercent: number;
  obstacleDetected: boolean;
  obstacleDistanceCm?: number;
  hardwareWatchdogSec: number;
}

export type LogCategory = 'BLUETOOTH' | 'NAVIGATION' | 'MANUAL' | 'GPS' | 'ERROR' | 'SAFETY';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  commandChar?: string;
  details?: Record<string, unknown> | string;
}

export type ActiveTab = 'MANUAL' | 'ROUTE' | 'TRACKING' | 'LOGS' | 'SETTINGS';
