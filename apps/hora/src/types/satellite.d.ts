declare module 'satellite.js' {
  export interface EciVec3<T = number> {
    x: T;
    y: T;
    z: T;
  }

  export interface GeodeticLocation {
    longitude: number;
    latitude: number;
    height: number;
  }

  export interface SatRec {
    error: number;
  }

  export interface PositionAndVelocity {
    position: EciVec3<number> | boolean;
    velocity: EciVec3<number> | boolean;
  }

  export function twoline2satrec(line1: string, line2: string): SatRec;
  export function propagate(satrec: SatRec, date: Date): PositionAndVelocity;
  export function gstime(date: Date): number;
  export function eciToGeodetic(eci: EciVec3<number>, gmst: number): GeodeticLocation;
  export function degreesLat(radians: number): number;
  export function degreesLong(radians: number): number;
}
