/**
 * Each user can overwrite the global group settings with personal preferences
 */
import { CustomGroupId, GroupId, StageId, UserId } from "./IdTypes";
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";

export interface CustomGroup extends ThreeDimensionAudioProperties {
  _id: CustomGroupId;
  userId: UserId; // <--- RELATION
  groupId: GroupId; // <--- RELATION

  customizeVolume: boolean;
  customizePosition: boolean;

  // Optimizations for performance
  stageId: StageId;
}
