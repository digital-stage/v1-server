import {ISocketServer} from "./SocketServer";
import {StageId, User} from "../model.common";
import {StageModel} from "../storage/mongo/model.mongo";
import {ServerStageEvents} from "../events";
import Client from "../model.client";

export interface IEventReactor {
    addStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<any>;

    changeStage(user: User, id: StageId, stage: Partial<Client.StagePrototype>): Promise<any>;

    removeStage(user: User, id: StageId): Promise<any>;

}

class EventReactor implements IEventReactor {
    private readonly server: ISocketServer;

    constructor(server: ISocketServer) {
        this.server = server;
    }

    addStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<any> {
        // ADD STAGE
        const stage = new StageModel();
        stage.name = initialStage.name;
        stage.password = initialStage.password;
        stage.width = initialStage.width || 25;
        stage.length = initialStage.length || 13;
        stage.height = initialStage.height || 7.5;
        stage.reflection = initialStage.reflection || 0.7;
        stage.absorption = initialStage.absorption || 0.6;
        stage.admins = initialStage.admins ? [...initialStage.admins, user._id] : [user._id];
        return stage.save()
            .then(stage => stage.admins.forEach(admin => this.server.sendToUser(admin, ServerStageEvents.STAGE_ADDED, stage)));
    }

    changeStage(user: User, id: StageId, stage: Partial<Client.StagePrototype>): Promise<any> {
        // CHANGE STAGE
        return StageModel.findOneAndUpdate({_id: id, admins: user._id}, stage).lean().exec()
            .then(() => this.server.sendToStage(id, ServerStageEvents.STAGE_CHANGED, {
                ...stage,
                id: id
            }));
    }

    removeStage(user: User, id: StageId): Promise<any> {
        // REMOVE STAGE
        return StageModel
            .findOne({_id: id, admins: user._id})
            .exec()
            .then(stage => {
                if (stage) {
                    //TODO: Remove associated too
                    return this.server.getUserIdsByStage(stage)
                        .then(userIds => {
                            stage
                                .remove()
                                .then(() => userIds.forEach(userId => this.server.sendToUser(userId, ServerStageEvents.STAGE_REMOVED, id)))
                        });
                }
            })
    }
}

export default EventReactor;