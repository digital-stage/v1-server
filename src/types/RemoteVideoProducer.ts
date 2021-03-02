import {
  GlobalVideoProducerId,
  RemoteVideoProducerId,
  StageId,
  StageMemberId,
  UserId,
} from "./IdTypes";

export interface RemoteVideoProducer {
  _id: RemoteVideoProducerId;
  stageMemberId: StageMemberId; // <-- RELATION
  globalProducerId: GlobalVideoProducerId; // <-- RELATION

  online: boolean;

  // Optimizations for performance
  userId: UserId;
  stageId: StageId;
}
