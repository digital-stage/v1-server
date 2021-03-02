import {StageId, StageMemberId, UserId} from "./IdTypes";

export interface User {
  _id: UserId;
  uid?: string;

  // SETTINGS
  name: string;
  avatarUrl?: string;

  stageId?: StageId; // <--- RELATION
  stageMemberId?: StageMemberId; // <--- RELATION
}
