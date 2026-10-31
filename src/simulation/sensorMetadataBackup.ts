/**
 * Backup of the original demo sensor metadata (S01–S04).
 * Coordinates in this file are historical reference only —
 * when applying to newly placed sensors, keep the editor lat/lng.
 */

export interface SensorMetadataTemplate {
  /** Preferred id when remapping (S01…S04) */
  templateId: string;
  order: number;
  name: string;
  village: string;
  area: string;
  locationLabel: string;
  baseline: {
    flowRateLps: number;
    waterLevelM: number;
  };
  /** Illustrative defaults used when seeding current readings */
  defaults: {
    flowVelocityMps: number;
    batteryPercent: number;
    signalPercent: number;
  };
  /** Original demo coordinates (reference only; not applied on restore) */
  originalLocation?: {
    lat: number;
    lng: number;
  };
}

export const SENSOR_METADATA_BACKUP: SensorMetadataTemplate[] = [
  {
    templateId: "S01",
    order: 0,
    name: "Upper Channel",
    village: "Lefke",
    area: "Upper Valley Intake",
    locationLabel: "Upper Valley Intake (Illustrative)",
    baseline: { flowRateLps: 12.0, waterLevelM: 0.42 },
    defaults: {
      flowVelocityMps: 0.86,
      batteryPercent: 96,
      signalPercent: 94,
    },
    originalLocation: { lat: 35.1065, lng: 32.8452 },
  },
  {
    templateId: "S02",
    order: 1,
    name: "Central Channel",
    village: "Lefke",
    area: "Central Town Aqueduct",
    locationLabel: "Central Town Aqueduct Section (Illustrative)",
    baseline: { flowRateLps: 10.5, waterLevelM: 0.38 },
    defaults: {
      flowVelocityMps: 0.79,
      batteryPercent: 91,
      signalPercent: 92,
    },
    originalLocation: { lat: 35.1118, lng: 32.8498 },
  },
  {
    templateId: "S03",
    order: 2,
    name: "Village Approach",
    village: "Bağlıköy",
    area: "Orchard Distribution Zone",
    locationLabel: "Orchard & Village Distribution Approach (Illustrative)",
    baseline: { flowRateLps: 8.0, waterLevelM: 0.31 },
    defaults: {
      flowVelocityMps: 0.68,
      batteryPercent: 88,
      signalPercent: 85,
    },
    originalLocation: { lat: 35.1174, lng: 32.8546 },
  },
  {
    templateId: "S04",
    order: 3,
    name: "Lower Channel",
    village: "Gaziveren",
    area: "Lower Agricultural Plains",
    locationLabel: "Lower Agricultural Outlying Section (Illustrative)",
    baseline: { flowRateLps: 6.5, waterLevelM: 0.25 },
    defaults: {
      flowVelocityMps: 0.58,
      batteryPercent: 84,
      signalPercent: 81,
    },
    originalLocation: { lat: 35.1232, lng: 32.8595 },
  },
];
