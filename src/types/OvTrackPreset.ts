/**
 * A preset for channels / track configuration
 */
import { SoundCardId, OvTrackPresetId, UserId } from "./IdTypes";

export interface OvTrackPreset {
  _id: OvTrackPresetId;
  userId: UserId; // <--- RELATION
  soundCardId: SoundCardId; // <--- RELATION
  name: string;
  inputChannels: number[];
  outputChannels: number[]; // For the output use simple numbers TODO: @Giso, is this enough?

  // Optimization
  // trackIds: TrackId[];
}
