import { GroupId, StageId } from "./IdTypes";
import { StagePackage } from "./StagePackage";

export interface InitialStagePackage extends StagePackage {
  stageId: StageId;
  groupId: GroupId;
}
