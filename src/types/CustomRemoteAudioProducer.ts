import {
  CustomRemoteAudioProducerId,
  RemoteAudioProducerId,
  StageId,
  UserId,
} from "./IdTypes";
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";

export interface CustomRemoteAudioProducer
  extends ThreeDimensionAudioProperties {
  _id: CustomRemoteAudioProducerId;
  userId: UserId; // <-- RELATION
  remoteAudioProducerId: RemoteAudioProducerId; // <-- RELATION

  customizeVolume: boolean;
  customizePosition: boolean;

  // Optimizations for performance
  stageId: StageId;
}
