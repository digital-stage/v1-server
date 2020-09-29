import {Device, DeviceId, GroupId, Producer, StageId, User, UserId} from "../model.common";
import Model from "../storage/mongo/model.mongo";
import IEventReactor from "./IEventReactor";
import ISocketServer from "../ISocketServer";
import GroupModel = Model.GroupModel;
import {Errors} from "../errors";
import * as socketIO from "socket.io";
import EventReactorStorage, {IEventReactorStorage} from "../reactor/EventReactorStorage";
import StageModel = Model.StageModel;
import UserModel = Model.UserModel;
import Server from "../model.server";
import ProducerModel = Model.ProducerModel;
import * as pino from "pino";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

class EventReactor implements IEventReactor {
    private readonly server: ISocketServer;
    private readonly database: IEventReactorStorage;

    constructor(server: ISocketServer) {
        this.server = server;
        this.database = new EventReactorStorage(this.server);
    }

    addDevice(userId: UserId, initialDevice: Partial<Device>): Promise<any> {
        return this.database.addDevice(userId, initialDevice);
    }

    getDeviceByMac(userId: UserId, mac: string): Promise<any> {
        return this.database.getDeviceByMac(userId, mac);
    }

    addStage(userId: UserId, initialStage: Partial<Server.Stage>): Promise<any> {
        return this.database.addStage(userId, initialStage);
    }

    changeStage(userId: UserId, id: StageId, fields: Partial<Server.Stage>): Promise<any> {
        return StageModel.findOne({_id: id, admins: userId}).exec()
            .then(stage => {
                if (stage)
                    return this.database.updateStage(stage, fields)
            });
    }

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string): Promise<any> {
        return StageModel.findById(stageId, {admins: 1, password: 1}).lean().exec()
            .then(stage => {
                if (!stage) {
                    throw new Error(Errors.NOT_FOUND);
                }
                return GroupModel.findById(groupId, {_id: 1}).lean().exec()
                    .then(group => {
                        if (!group)
                            throw new Error(Errors.NOT_FOUND);
                        // Refresh user
                        if (stage.password && stage.password !== password) {
                            throw new Error(Errors.INVALID_PASSWORD);
                        }
                        return UserModel.findById(userId).exec()
                            .then(user => this.database.joinStage(user, stage, group._id));
                    })
            })
    }

    public leaveStage(userId: UserId): Promise<any> {
        // Refresh user model first
        return UserModel.findById(userId).exec()
            .then(user => {
                if (!user)
                    throw new Error("User not found");
                return this.database.leaveStage(user);
            });
    }

    public removeStage(userId: UserId, stageId: StageId): Promise<any> {
        // For all active users: leave stage first
        // Remove all groups
        return Model.StageModel.findOne({_id: stageId, admins: userId}).exec()
            .then(stage => {
                if (stage) {
                    return this.database.removeStage(stage);
                }
            })
    }

    public addGroup(user: User, stageId: StageId, name: string): Promise<any> {
        return Model.StageModel.findOne({_id: stageId, admins: user._id}, {_id: 1}).exec()
            .then(stage => {
                if (stage) {
                    return this.database.addGroup(stage._id, name);
                }
            })
    }

    public changeGroup(user: User, groupId: GroupId, update: Partial<Server.Group>): Promise<any> {
        return Model.GroupModel.findById(groupId).exec()
            .then(
                group => Model.StageModel.findOne({_id: group.stageId, admins: user._id}).exec()
                    .then(stage => {
                        if (stage) {
                            return this.database.updateGroup(group, update);
                        }
                    })
            );
    }

    public removeGroup(user: User, groupId: GroupId): Promise<any> {
        return Model.GroupModel.findById(groupId).exec().then(
            group => {
                if (group) {
                    return Model.StageModel.findOne({_id: group.stageId, admins: user._id}).lean().exec()
                        .then(stage => {
                            if (stage) {
                                return this.database.removeGroup(group);
                            }
                        })
                }
            }
        )
    }

    addProducer(device: Device, kind: "audio" | "video" | "ov", routerId?: string, routerProducerId?: string): Promise<Producer> {
        return UserModel.findById(device.userId).exec()
            .then(user => {
                if (user) {
                    return this.database.addProducer(device._id, user, kind, routerId, routerProducerId);
                }
                throw new Error("Could not find user");
            })
            .then(producer => {
                logger.debug("[EVENT REACTOR] addProducer -> " + producer._id);
                return producer;
            })
    }

    changeProducer(deviceId: DeviceId, producerId: string, update: Partial<Producer>): Promise<Producer> {
        logger.debug("[EVENT REACTOR] changeProducer -> " + producerId);
        return ProducerModel.findOne({_id: producerId, deviceId: deviceId}).exec()
            .then(producer => {
                if (producer) {
                    return this.database.updateProducer(producer, {
                        ...update,
                        _id: undefined
                    });
                }
                throw new Error("Could not find producer");
            });
    }

    removeProducer(deviceId: DeviceId, producerId: string): Promise<Producer> {
        logger.debug("[EVENT REACTOR] removeProducer -> " + producerId);
        return ProducerModel.findOne({_id: producerId, deviceId: deviceId}).exec()
            .then(producer => {
                if (producer) {
                    return this.database.removeProducer(producer);
                }
                //throw new Error("Could not find producer");
            })
    }

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]> {
        return this.database.getUserIdsByStageId(stageId);
    }

    getUserIdsByStage(stage: Server.Stage): Promise<UserId[]> {
        return this.database.getUserIdsByStage(stage);
    }

    sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any> {
        return this.database.sendInitialToDevice(socket, user);
    }
}

export default EventReactor;