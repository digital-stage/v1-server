import {StageId, UserId} from "./model.common";
import * as socketIO from "socket.io";

export interface ISocketServer {
    sendToStage(stageId: StageId, event: string, payload?: any): Promise<void>;

    sendToStageManagers(stageId: StageId, event: string, payload?: any): Promise<void>;

    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any): Promise<void>;

    sendToDevice(socket: socketIO.Socket, event: string, payload?: any): void;

    sendToAll(event: string, payload?: any): void;

    sendToUser(userId: UserId, event: string, payload?: any): void;

    init();
}

export default ISocketServer;