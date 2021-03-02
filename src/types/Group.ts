import { GroupId, StageId } from "./IdTypes";
import ThreeDimensionAudioProperties from "./ThreeDimensionAudioProperties";

/**
 * A group can be only modified by admins
 */
export interface Group extends ThreeDimensionAudioProperties {
  _id: GroupId;
  name: string;
  color: string;
  stageId: StageId; // <--- RELATION
}
