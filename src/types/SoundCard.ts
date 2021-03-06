import { DeviceId, SoundCardId, UserId } from "./IdTypes";

export interface SoundCard {
  // ov-specific
  _id: SoundCardId;
  deviceId: DeviceId;
  name: string; // unique together with userId
  label: string;

  isDefault?: boolean;

  driver: "jack" | "alsa" | "asio" | "webrtc";

  sampleRate: number;
  sampleRates: number[];
  periodSize: number;
  numPeriods: number; // default to 2

  softwareLatency?: number;

  numInputChannels: number;
  numOutputChannels: number;

  inputChannels: number[]; // TODO: Replace this later by track presets
  outputChannels: number[]; // Will be 0 and 1 per default TODO: Later let user decide

  // TODO: For later we should use track presets
  // trackPresetId?: TrackPresetId; // Current default preset (outside or on new stages)

  // Optimizations for performance
  // trackPresets: TrackPresetId[];
  userId: UserId;
}
