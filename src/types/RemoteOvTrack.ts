/**
 * A stage member track is a track,
 * that has been published and assigned to the related stage member.
 * So all other stage members will receive this track.
 *
 * Important: a track can point to an ov-based track or an webrtc-based producer (!)
 *
 * However, spatial audio settings are stored for both,
 * maybe for integrating webrtc and ov later and use
 * the web audio api panner for 3D audio interpolation later.
 */
import {StageMemberId, RemoteOvTrackId, OvTrackId, UserId, DeviceId, StageId} from "./IdTypes";
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";

export interface RemoteOvTrack extends ThreeDimensionAudioProperties {
  _id: RemoteOvTrackId;
  ovTrackId: OvTrackId; // <-- RELATION
  stageMemberId: StageMemberId; // <-- RELATION
  channel: number; // UNIQUE WITH TRACK PRESET ID

  online: boolean;

  directivity: 'omni' | 'cardioid'; // Overrides track directivity (for stage)

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}
