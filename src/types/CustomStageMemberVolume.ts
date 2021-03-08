import { CustomStageMemberId, StageId, StageMemberId, UserId } from "./IdTypes";

export interface CustomStageMemberVolume {
  _id: CustomStageMemberId;
  userId: UserId; // <--- RELATION
  stageMemberId: StageMemberId; // <--- RELATION

  volume: number;
  muted: boolean;

  // Optimizations for performance
  stageId: StageId;
}
