import {
  CustomRemoteAudioProducerId,
  RemoteAudioProducerId,
  StageId,
  UserId,
} from "./IdTypes";

export interface CustomRemoteAudioProducerVolume {
  _id: CustomRemoteAudioProducerId;
  userId: UserId; // <-- RELATION
  remoteAudioProducerId: RemoteAudioProducerId; // <-- RELATION

  volume: number;
  muted: boolean;

  // Optimizations for performance
  stageId: StageId;
}
