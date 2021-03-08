import { CustomStageMemberId, StageId, StageMemberId, UserId } from "./IdTypes";
import ThreeDimensionProperties from "./ThreeDimensionProperties";

export interface CustomStageMemberPosition extends ThreeDimensionProperties {
  _id: CustomStageMemberId;
  userId: UserId; // <--- RELATION
  stageMemberId: StageMemberId; // <--- RELATION

  // Optimizations for performance
  stageId: StageId;
}
