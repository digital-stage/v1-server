/**
 * A track is always assigned to a specific stage member and channel of an sound card.
 *
 */
import { DeviceId, SoundCardId, OvTrackId, UserId } from "./IdTypes";

export interface OvTrack {
  _id: OvTrackId;
  soundCardId: SoundCardId;
  channel: number; // UNIQUE WITH TRACK PRESET ID

  // trackPresetId: TrackPresetId; // <--- RELATION

  // Optimizations for performance
  userId: UserId;
  deviceId: DeviceId;
}
