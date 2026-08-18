import { LatLng } from '../types/robot';

/**
 * Calculates the great circle distance between two points on Earth using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistanceMeters(point1: LatLng, point2: LatLng): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates initial bearing from point1 to point2 in degrees (0 - 360).
 */
export function calculateBearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Converts degrees to radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Linearly interpolates a position between two coordinates given fraction (0 to 1).
 */
export function interpolatePosition(start: LatLng, end: LatLng, fraction: number): LatLng {
  const clamped = Math.max(0, Math.min(1, fraction));
  return {
    lat: start.lat + (end.lat - start.lat) * clamped,
    lng: start.lng + (end.lng - start.lng) * clamped,
  };
}

/**
 * Formats distance into readable meter / kilometer string.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formats duration in seconds into mm:ss or hh:mm:ss.
 */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats speed into m/s and km/h.
 */
export function formatSpeed(speedMs: number | null): string {
  if (speedMs === null || isNaN(speedMs) || speedMs < 0.05) {
    return '0.0 km/h (0.0 m/s)';
  }
  const kmh = (speedMs * 3.6).toFixed(1);
  const ms = speedMs.toFixed(1);
  return `${kmh} km/h (${ms} m/s)`;
}
