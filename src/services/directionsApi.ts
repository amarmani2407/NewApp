import { LatLng, ManeuverType, MoveCommand, RoutePlan, RouteStep } from '../types/robot';
import { calculateHaversineDistanceMeters } from './geoService';

export interface DirectionsApiResponse {
  routes: Array<{
    summary: string;
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        maneuver?: string;
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
        polyline?: { points: string };
      }>;
    }>;
    overview_polyline?: { points: string };
  }>;
  status: string;
}

/**
 * Strips HTML tags from Google Maps Directions instructions (e.g. <b>Turn left</b> on <b>Main St</b>).
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Maps Google Directions API maneuver strings to standard robot ManeuverType and Bluetooth commands.
 */
export function parseManeuverToCommand(
  maneuverStr?: string,
  instructionText?: string
): { maneuver: ManeuverType; command: MoveCommand; turnCommand?: MoveCommand } {
  const m = (maneuverStr || '').toLowerCase();
  const text = (instructionText || '').toLowerCase();

  if (m.includes('turn-left') || text.includes('turn left')) {
    return { maneuver: 'TURN_LEFT', command: 'F', turnCommand: 'L' };
  }
  if (m.includes('turn-right') || text.includes('turn right')) {
    return { maneuver: 'TURN_RIGHT', command: 'F', turnCommand: 'R' };
  }
  if (m.includes('turn-slight-left') || text.includes('slight left')) {
    return { maneuver: 'TURN_SLIGHT_LEFT', command: 'F', turnCommand: 'L' };
  }
  if (m.includes('turn-slight-right') || text.includes('slight right')) {
    return { maneuver: 'TURN_SLIGHT_RIGHT', command: 'F', turnCommand: 'R' };
  }
  if (m.includes('turn-sharp-left') || text.includes('sharp left')) {
    return { maneuver: 'TURN_SHARP_LEFT', command: 'F', turnCommand: 'L' };
  }
  if (m.includes('turn-sharp-right') || text.includes('sharp right')) {
    return { maneuver: 'TURN_SHARP_RIGHT', command: 'F', turnCommand: 'R' };
  }
  if (m.includes('uturn') || text.includes('u-turn')) {
    return { maneuver: 'UTURN', command: 'F', turnCommand: 'L' };
  }
  if (text.includes('arrive') || text.includes('destination')) {
    return { maneuver: 'ARRIVE', command: 'S' };
  }

  // Default straight travel
  return { maneuver: 'STRAIGHT', command: 'F' };
}

/**
 * Decodes Google encoded polyline string into array of LatLng coordinates.
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Converts Google Directions API JSON payload into a structured Robot RoutePlan.
 */
export function parseDirectionsResponseToRoutePlan(
  json: DirectionsApiResponse,
  planName: string,
  secondsPerMeter: number = 1.5
): RoutePlan {
  if (!json.routes || json.routes.length === 0 || !json.routes[0].legs || json.routes[0].legs.length === 0) {
    throw new Error('Directions response contains no valid routes.');
  }

  const leg = json.routes[0].legs[0];
  const steps: RouteStep[] = [];
  let polylineCoords: LatLng[] = [];

  if (json.routes[0].overview_polyline?.points) {
    polylineCoords = decodePolyline(json.routes[0].overview_polyline.points);
  }

  leg.steps.forEach((step, idx) => {
    const rawInstruction = stripHtmlTags(step.html_instructions);
    const { maneuver, command, turnCommand } = parseManeuverToCommand(step.maneuver, rawInstruction);
    const distanceM = step.distance.value || 10;
    const durationSec = Math.max(2, Math.round(distanceM * secondsPerMeter));

    const startLoc: LatLng = { lat: step.start_location.lat, lng: step.start_location.lng };
    const endLoc: LatLng = { lat: step.end_location.lat, lng: step.end_location.lng };

    steps.push({
      id: `step-${idx + 1}-${Date.now()}`,
      stepIndex: idx + 1,
      maneuver,
      instruction: rawInstruction || `Step ${idx + 1}: Move forward ${distanceM}m`,
      distanceMeters: distanceM,
      durationSeconds: durationSec,
      command,
      turnCommand,
      startLocation: startLoc,
      endLocation: endLoc,
      status: 'PENDING',
    });

    if (polylineCoords.length === 0) {
      polylineCoords.push(startLoc);
      if (idx === leg.steps.length - 1) {
        polylineCoords.push(endLoc);
      }
    }
  });

  return {
    id: `route-${Date.now()}`,
    name: planName || `Route: ${leg.start_address.split(',')[0]} → ${leg.end_address.split(',')[0]}`,
    origin: {
      name: leg.start_address || 'Origin',
      location: { lat: leg.start_location.lat, lng: leg.start_location.lng },
    },
    destination: {
      name: leg.end_address || 'Destination',
      location: { lat: leg.end_location.lat, lng: leg.end_location.lng },
    },
    totalDistanceMeters: leg.distance.value,
    estimatedDurationSec: Math.round(leg.distance.value * secondsPerMeter),
    steps,
    polylineCoordinates: polylineCoords,
    createdAt: new Date().toLocaleTimeString(),
    status: 'IDLE',
  };
}

/**
 * Creates a synthetic multi-waypoint route between any 2 coordinates for instant offline planning.
 */
export function generateSyntheticRoute(
  origin: LatLng,
  destination: LatLng,
  originName: string = 'Origin Point',
  destName: string = 'Target Destination',
  secondsPerMeter: number = 1.5
): RoutePlan {
  const directDistance = calculateHaversineDistanceMeters(origin, destination);
  const numSteps = directDistance > 100 ? 4 : directDistance > 40 ? 3 : 2;

  const latDelta = (destination.lat - origin.lat) / numSteps;
  const lngDelta = (destination.lng - origin.lng) / numSteps;

  const steps: RouteStep[] = [];
  const polylineCoords: LatLng[] = [origin];

  let currentLat = origin.lat;
  let currentLng = origin.lng;

  for (let i = 0; i < numSteps; i++) {
    const isLast = i === numSteps - 1;
    const nextLat = isLast ? destination.lat : currentLat + latDelta;
    const nextLng = isLast ? destination.lng : currentLng + lngDelta;

    const startLoc = { lat: currentLat, lng: currentLng };
    const endLoc = { lat: nextLat, lng: nextLng };
    const stepDist = Math.max(10, Math.round(calculateHaversineDistanceMeters(startLoc, endLoc)));
    const duration = Math.max(3, Math.round(stepDist * secondsPerMeter));

    let maneuver: ManeuverType = 'STRAIGHT';
    let turnCmd: MoveCommand | undefined = undefined;
    let instr = `Proceed straight along waypoint ${i + 1} (${stepDist}m)`;

    if (i === 1) {
      maneuver = 'TURN_RIGHT';
      turnCmd = 'R';
      instr = `Turn RIGHT toward Intermediate Sector B (${stepDist}m)`;
    } else if (i === 2) {
      maneuver = 'TURN_LEFT';
      turnCmd = 'L';
      instr = `Turn LEFT aligning with Destination Gate (${stepDist}m)`;
    } else if (isLast) {
      instr = `Final approach straight to delivery mark (${stepDist}m)`;
    }

    steps.push({
      id: `synth-step-${i + 1}-${Date.now()}`,
      stepIndex: i + 1,
      maneuver,
      instruction: instr,
      distanceMeters: stepDist,
      durationSeconds: duration,
      command: 'F',
      turnCommand: turnCmd,
      startLocation: startLoc,
      endLocation: endLoc,
      status: 'PENDING',
    });

    polylineCoords.push(endLoc);
    currentLat = nextLat;
    currentLng = nextLng;
  }

  const totalDist = steps.reduce((sum, s) => sum + s.distanceMeters, 0);

  return {
    id: `route-custom-${Date.now()}`,
    name: `${originName} → ${destName}`,
    origin: { name: originName, location: origin },
    destination: { name: destName, location: destination },
    totalDistanceMeters: totalDist,
    estimatedDurationSec: Math.round(totalDist * secondsPerMeter),
    steps,
    polylineCoordinates: polylineCoords,
    createdAt: new Date().toLocaleTimeString(),
    status: 'IDLE',
  };
}
