/**
 * Each user can overwrite the global group settings with personal preferences
 */
import ThreeDimensionProperties from "./ThreeDimensionProperties";
import { CustomGroupId, GroupId, StageId, UserId } from "./IdTypes";

export interface CustomGroupPosition extends ThreeDimensionProperties {
  _id: CustomGroupId;
  userId: UserId; // <--- RELATION
  groupId: GroupId; // <--- RELATION

  // Optimizations for performance
  stageId: StageId;
}
