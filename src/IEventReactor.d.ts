import {GroupId, StageId, User, UserId} from "./model.common";
import Client from "./model.client";

interface IEventReactor {
    addStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<any>;

    changeStage(user: User, id: StageId, stage: Partial<Client.StagePrototype>): Promise<any>;

    leaveStage(user: User): Promise<any>;

    /**
     * Create or get group member, assign it to the user
     * @param user
     * @param stageId
     * @param groupId
     * @param password
     */
    joinStage(user: User, stageId: StageId, groupId: GroupId, password?: string): Promise<any>;

    removeStage(user: User, id: StageId): Promise<any>;

    addGroup(user: User, stageId: StageId, name: string): Promise<any>;

    changeGroup(user: User, groupId: GroupId, group: Partial<Client.GroupPrototype>): Promise<any>;

    removeGroup(user: User, groupId: GroupId): Promise<any>;

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Client.StagePrototype): Promise<UserId[]>;
}

export default IEventReactor;