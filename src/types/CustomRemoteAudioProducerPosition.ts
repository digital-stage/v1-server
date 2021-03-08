import {
  CustomRemoteAudioProducerId,
  RemoteAudioProducerId,
  StageId,
  StageMemberId,
  UserId,
} from "./IdTypes";
import ThreeDimensionProperties from "./ThreeDimensionProperties";

export interface CustomRemoteAudioProducerPosition
  extends ThreeDimensionProperties {
  _id: CustomRemoteAudioProducerId;
  userId: UserId; // <-- RELATION
  remoteAudioProducerId: RemoteAudioProducerId; // <-- RELATION

  // Optimizations for performance
  stageId: StageId;
  stageMemberId: StageMemberId;
}
