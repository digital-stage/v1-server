import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";
import {
  GlobalAudioProducerId,
  RemoteAudioProducerId,
  StageId,
  StageMemberId,
  UserId,
} from "./IdTypes";

export interface RemoteAudioProducer extends ThreeDimensionAudioProperties {
  _id: RemoteAudioProducerId;
  stageMemberId: StageMemberId; // <-- RELATION
  globalProducerId: GlobalAudioProducerId; // <-- RELATION

  online: boolean;

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}
