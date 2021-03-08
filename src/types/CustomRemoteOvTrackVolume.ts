/**
 * Each user can overwrite the global stage member track settings with personal preferences.
 */
import {
  CustomRemoteOvTrackId,
  RemoteOvTrackId,
  StageId,
  StageMemberId,
  UserId,
} from "./IdTypes";

export interface CustomRemoteOvTrackVolume {
  _id: CustomRemoteOvTrackId;
  stageMemberId: StageMemberId; // <-- RELATION

  remoteOvTrackId: RemoteOvTrackId; // <-- RELATION

  volume: number;
  muted: boolean;

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}
