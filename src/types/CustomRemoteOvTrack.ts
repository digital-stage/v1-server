/**
 * Each user can overwrite the global stage member track settings with personal preferences.
 */
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";
import {
  CustomRemoteOvTrackId,
  RemoteOvTrackId,
  StageId,
  StageMemberId,
  UserId,
} from "./IdTypes";

export interface CustomRemoteOvTrack extends ThreeDimensionAudioProperties {
  _id: CustomRemoteOvTrackId;
  stageMemberId: StageMemberId; // <-- RELATION

  remoteOvTrackId: RemoteOvTrackId; // <-- RELATION

  directivity: "omni" | "cardioid"; // Overrides track directivity (for user)

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}
