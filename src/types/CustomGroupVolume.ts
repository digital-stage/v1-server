/**
 * Each user can overwrite the global group settings with personal preferences
 */
import { CustomGroupId, GroupId, StageId, UserId } from "./IdTypes";

export interface CustomGroupVolume {
  _id: CustomGroupId;
  userId: UserId; // <--- RELATION
  groupId: GroupId; // <--- RELATION

  volume: number;
  muted: boolean;

  // Optimizations for performance
  stageId: StageId;
}
