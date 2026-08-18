import {
  CalibrationSettings,
  LatLng,
  MoveCommand,
  RobotTelemetry,
  RoutePlan,
  RouteStep,
} from '../types/robot';
import { bluetoothService } from './bluetoothService';
import {
  calculateBearingDegrees,
  calculateHaversineDistanceMeters,
  interpolatePosition,
} from './geoService';

export type RouteStateListener = (
  route: RoutePlan | null,
  telemetry: Partial<RobotTelemetry>
) => void;

class RouteExecutionEngine {
  private currentRoute: RoutePlan | null = null;
  private activeStepIndex = 0;
  private isRunning = false;
  private isPaused = false;
  private executionTimer: any = null;
  private simulationInterval: any = null;

  private currentRobotPos: LatLng = { lat: 37.7749, lng: -122.4194 };
  private currentHeading: number = 0;
  private currentSpeedMs: number = 0;
  private totalDistanceTravelled: number = 0;

  private settings: CalibrationSettings = {
    bluetoothDeviceName: 'HC-05-ROBOT-01',
    bluetoothMac: '98:D3:31:F4:2A:1B',
    googleDirectionsApiKey: '',
    turnDurationMs: 850,
    secondsPerMeter: 1.5,
    gpsTriggerThresholdMeters: 5.0,
    safetyStopBufferMs: 400,
    executionMode: 'TIME_BASED',
    autoReconnect: true,
    enableAudioBeeps: true,
    simulationSpeedMultiplier: 1.5,
    motorPwmSpeed: 200,
  };

  private listeners: Set<RouteStateListener> = new Set();

  public setSettings(newSettings: Partial<CalibrationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): CalibrationSettings {
    return this.settings;
  }

  public getCurrentRoute(): RoutePlan | null {
    return this.currentRoute;
  }

  public isRouteRunning(): boolean {
    return this.isRunning;
  }

  public isRoutePaused(): boolean {
    return this.isPaused;
  }

  public addListener(listener: RouteStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    if (!this.currentRoute) return;

    let distToNext = 0;
    let distToDest = 0;
    let bearing = 0;

    const currentStep = this.currentRoute.steps[this.activeStepIndex];
    if (currentStep) {
      distToNext = calculateHaversineDistanceMeters(this.currentRobotPos, currentStep.endLocation);
      bearing = calculateBearingDegrees(this.currentRobotPos, currentStep.endLocation);
    }

    const finalLocation = this.currentRoute.destination.location;
    distToDest = calculateHaversineDistanceMeters(this.currentRobotPos, finalLocation);

    const telemetry: Partial<RobotTelemetry> = {
      activeStepIndex: this.activeStepIndex,
      currentGps: {
        lat: this.currentRobotPos.lat,
        lng: this.currentRobotPos.lng,
        accuracy: 2.5,
        speed: this.isRunning && !this.isPaused ? this.currentSpeedMs : 0,
        heading: this.currentHeading,
        timestamp: Date.now(),
      },
      distanceToNextWaypoint: Math.max(0, distToNext),
      distanceToFinalDestination: Math.max(0, distToDest),
      bearingToNextWaypoint: bearing,
      totalDistanceTravelled: this.totalDistanceTravelled,
      currentManeuver: currentStep ? currentStep.instruction : 'Idle',
    };

    this.listeners.forEach((fn) => fn(this.currentRoute, telemetry));
  }

  /**
   * Load and prepare a route for execution
   */
  public loadRoute(route: RoutePlan) {
    this.stopRoute(false);
    this.currentRoute = {
      ...route,
      steps: route.steps.map((s) => ({ ...s, status: 'PENDING', progressPercent: 0 })),
      status: 'IDLE',
    };
    this.activeStepIndex = 0;
    this.currentRobotPos = route.origin.location;
    this.totalDistanceTravelled = 0;
    this.notify();
  }

  /**
   * Start executing current loaded route
   */
  public async startRoute(): Promise<boolean> {
    if (!this.currentRoute || this.currentRoute.steps.length === 0) {
      return false;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.currentRoute.status = 'RUNNING';
    this.currentSpeedMs = 1.0 / this.settings.secondsPerMeter;

    this.executeCurrentStep();
    return true;
  }

  /**
   * Pause execution (e.g. from UI or upon manual D-Pad touch override)
   */
  public pauseRoute(reason: string = 'User Paused') {
    if (!this.isRunning) return;

    this.isPaused = true;
    if (this.currentRoute) {
      this.currentRoute.status = 'PAUSED';
    }

    if (this.executionTimer) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    this.currentSpeedMs = 0;
    // Send immediate safety stop
    bluetoothService.sendCommand('S', 'SAFETY_OVERRIDE', `Emergency Stop: ${reason}`);
    this.notify();
  }

  /**
   * Resume paused route execution
   */
  public resumeRoute() {
    if (!this.isRunning || !this.isPaused || !this.currentRoute) return;

    this.isPaused = false;
    this.currentRoute.status = 'RUNNING';
    this.currentSpeedMs = 1.0 / this.settings.secondsPerMeter;
    this.executeCurrentStep();
  }

  /**
   * Fully stops and resets the route runner
   */
  public stopRoute(sendStopCommand: boolean = true) {
    this.isRunning = false;
    this.isPaused = false;

    if (this.executionTimer) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.currentRoute) {
      this.currentRoute.status = 'IDLE';
    }

    this.currentSpeedMs = 0;
    if (sendStopCommand) {
      bluetoothService.sendCommand('S', 'AUTONOMOUS', 'Route Aborted / Stopped');
    }
    this.notify();
  }

  /**
   * Core step sequencer with safety stop buffer and turn handling
   */
  private async executeCurrentStep() {
    if (!this.isRunning || this.isPaused || !this.currentRoute) return;

    if (this.activeStepIndex >= this.currentRoute.steps.length) {
      // Completed full route
      this.completeRoute();
      return;
    }

    const step = this.currentRoute.steps[this.activeStepIndex];
    step.status = 'EXECUTING';
    this.notify();

    // 1. If step requires a pre-turn (L or R), perform turn first with safety buffer
    if (step.turnCommand) {
      const turnCmd = step.turnCommand;
      const turnDuration = this.settings.turnDurationMs;

      // Send Stop safety buffer before turning
      await bluetoothService.sendCommand('S', 'AUTONOMOUS', 'Safety Halt before Pivot Turn');
      await this.sleep(this.settings.safetyStopBufferMs);

      if (!this.isRunning || this.isPaused) return;

      // Send Turn Command
      await bluetoothService.sendCommand(
        turnCmd,
        'AUTONOMOUS',
        `Executing Maneuver: ${step.maneuver} (${turnDuration}ms)`
      );

      // Rotate simulated heading
      const angleDelta = turnCmd === 'L' ? -90 : 90;
      this.currentHeading = (this.currentHeading + angleDelta + 360) % 360;

      await this.sleep(turnDuration);

      if (!this.isRunning || this.isPaused) return;

      // Send Stop safety buffer after completing turn
      await bluetoothService.sendCommand('S', 'AUTONOMOUS', 'Completed Pivot Turn - Re-aligning');
      await this.sleep(this.settings.safetyStopBufferMs);
    }

    if (!this.isRunning || this.isPaused) return;

    // 2. Execute forward travel for the step
    await bluetoothService.sendCommand(
      'F',
      'AUTONOMOUS',
      `Forward Motion: Step ${step.stepIndex}/${this.currentRoute.steps.length} (${step.distanceMeters}m)`
    );

    // 3. Execution mode handling: TIME_BASED vs GPS_DISTANCE_BASED
    if (this.settings.executionMode === 'TIME_BASED') {
      this.runTimeBasedStep(step);
    } else {
      this.runGpsBasedStep(step);
    }
  }

  private runTimeBasedStep(step: RouteStep) {
    const totalDurationMs =
      (step.durationSeconds * 1000) / this.settings.simulationSpeedMultiplier;
    const startTime = Date.now();
    const startLoc = { ...this.currentRobotPos };
    const targetLoc = step.endLocation;

    if (this.simulationInterval) clearInterval(this.simulationInterval);

    this.simulationInterval = setInterval(() => {
      if (!this.isRunning || this.isPaused) {
        clearInterval(this.simulationInterval);
        return;
      }

      const elapsed = Date.now() - startTime;
      const fraction = Math.min(1, elapsed / totalDurationMs);
      step.progressPercent = Math.round(fraction * 100);

      this.currentRobotPos = interpolatePosition(startLoc, targetLoc, fraction);
      this.totalDistanceTravelled += (step.distanceMeters * (1 / (totalDurationMs / 100))) / 10;
      this.notify();

      if (fraction >= 1) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
        this.finishStepAndAdvance(step);
      }
    }, 100);
  }

  private runGpsBasedStep(step: RouteStep) {
    const targetLoc = step.endLocation;
    const thresholdMeters = this.settings.gpsTriggerThresholdMeters;
    const startLoc = { ...this.currentRobotPos };
    const stepDistance = calculateHaversineDistanceMeters(startLoc, targetLoc);

    if (this.simulationInterval) clearInterval(this.simulationInterval);

    // Simulate GPS movement toward the waypoint
    let progress = 0;
    const stepRate = 0.04 * this.settings.simulationSpeedMultiplier;

    this.simulationInterval = setInterval(() => {
      if (!this.isRunning || this.isPaused) {
        clearInterval(this.simulationInterval);
        return;
      }

      progress += stepRate;
      this.currentRobotPos = interpolatePosition(startLoc, targetLoc, progress);

      const remainingDist = calculateHaversineDistanceMeters(this.currentRobotPos, targetLoc);
      step.progressPercent = Math.min(100, Math.round(((stepDistance - remainingDist) / stepDistance) * 100));
      this.notify();

      // Trigger condition: within threshold meters
      if (remainingDist <= thresholdMeters || progress >= 1) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
        this.finishStepAndAdvance(step);
      }
    }, 150);
  }

  private async finishStepAndAdvance(step: RouteStep) {
    step.status = 'COMPLETED';
    step.progressPercent = 100;

    // Safety halt between steps
    await bluetoothService.sendCommand('S', 'AUTONOMOUS', `Step ${step.stepIndex} Waypoint Reached`);
    await this.sleep(this.settings.safetyStopBufferMs);

    this.activeStepIndex++;
    this.notify();

    if (this.isRunning && !this.isPaused) {
      this.executeCurrentStep();
    }
  }

  private async completeRoute() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.currentRoute) {
      this.currentRoute.status = 'COMPLETED';
    }
    this.currentSpeedMs = 0;

    await bluetoothService.sendCommand('S', 'AUTONOMOUS', 'Destination Reached! Delivery Complete.');
    this.notify();
  }

  /**
   * Update live GPS from device geolocation watchPosition
   */
  public updateRealGps(coords: LatLng, speed: number | null, heading: number | null, accuracy: number) {
    this.currentRobotPos = coords;
    if (heading !== null) this.currentHeading = heading;
    if (speed !== null) this.currentSpeedMs = speed;

    if (this.isRunning && !this.isPaused && this.settings.executionMode === 'GPS_DISTANCE_BASED') {
      const currentStep = this.currentRoute?.steps[this.activeStepIndex];
      if (currentStep) {
        const remaining = calculateHaversineDistanceMeters(coords, currentStep.endLocation);
        if (remaining <= this.settings.gpsTriggerThresholdMeters) {
          if (this.simulationInterval) clearInterval(this.simulationInterval);
          this.finishStepAndAdvance(currentStep);
        }
      }
    }

    this.notify();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const routeEngine = new RouteExecutionEngine();
