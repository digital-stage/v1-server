import {StageMemberId, UserId} from "./IdTypes";

export interface ChatMessage {
  userId: UserId;
  stageMemberId: StageMemberId;
  message: string;
  time: number;
}

export type ChatMessages = ChatMessage[];
