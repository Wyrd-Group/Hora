declare module 'cesium' {
  export class Cartesian3 {
    constructor(x?: number, y?: number, z?: number);
    static fromDegrees(longitude: number, latitude: number, height?: number): Cartesian3;
  }

  export class Color {
    static RED: Color;
    static CYAN: Color;
    static YELLOW: Color;
    static ORANGE: Color;
    static BLACK: Color;
    static WHITE: Color;
    static fromCssColorString(color: string): Color;
    withAlpha(alpha: number): Color;
  }

  export class JulianDate {
    static now(): JulianDate;
    static fromDate(date: Date): JulianDate;
  }

  export class SampledPositionProperty {
    addSample(time: JulianDate, position: Cartesian3): void;
  }

  export enum LabelStyle {
    FILL = 0,
    OUTLINE = 1,
    FILL_AND_OUTLINE = 2,
  }

  export enum VerticalOrigin {
    CENTER = 0,
    BOTTOM = 1,
    TOP = -1,
    BASELINE = 2,
  }

  export enum HorizontalOrigin {
    CENTER = 0,
    LEFT = 1,
    RIGHT = -1,
  }

  export class NearFarScalar {
    constructor(near: number, nearValue: number, far: number, farValue: number);
  }

  export class DistanceDisplayCondition {
    constructor(near: number, far: number);
  }
}
