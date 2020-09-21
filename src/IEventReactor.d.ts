import {GroupId, StageId, User, UserId} from "./model.common";
import Client from "./model.client";

interface IEventReactor {
    addStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<any>;

    changeStage(user: User, id: StageId, stage: Partial<Client.StagePrototype>): Promise<any>;

    removeStage(user: User, id: StageId): Promise<any>;

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Client.StagePrototype): Promise<UserId[]>;
}

export default IEventReactor;