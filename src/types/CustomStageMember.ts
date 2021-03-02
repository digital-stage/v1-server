import { CustomStageMemberId, StageId, StageMemberId, UserId } from "./IdTypes";
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";

export interface CustomStageMember extends ThreeDimensionAudioProperties {
  _id: CustomStageMemberId;
  userId: UserId; // <--- RELATION
  stageMemberId: StageMemberId; // <--- RELATION

  // Optimizations for performance
  stageId: StageId;
}
