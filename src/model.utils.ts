export interface ThreeDimensionAudioProperties {
  // SETTINGS
  volume: number;
  muted: boolean;
  // Position relative to stage
  x: number;
  y: number;
  z: number;
  // Rotation relative to stage
  rX: number;
  rY: number;
  rZ: number;
}
