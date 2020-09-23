import {GroupId, StageId, User, UserId} from "../model.common";
import * as socketIO from "socket.io";
import Server from "../model.server";

interface IEventReactor {
    addStage(user: User, initialStage: Partial<Server.Stage>): Promise<any>;

    changeStage(user: User, id: StageId, stage: Partial<Server.Stage>): Promise<any>;

    leaveStage(userId: UserId): Promise<any>;

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string): Promise<any>;

    removeStage(user: User, id: StageId): Promise<any>;

    addGroup(user: User, stageId: StageId, name: string): Promise<any>;

    changeGroup(user: User, groupId: GroupId, group: Partial<Server.Group>): Promise<any>;

    removeGroup(user: User, groupId: GroupId): Promise<any>;

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Server.Stage): Promise<UserId[]>;

    sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any>;
}

export default IEventReactor;