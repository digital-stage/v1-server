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
import DeviceModel = Model.DeviceModel;
import * as pino from "pino";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

class EventReactor implements IEventReactor {
    private readonly server: ISocketServer;
    private readonly database: IEventReactorStorage;

    constructor(server: ISocketServer) {
        this.server = server;
        this.database = new EventReactorStorage(this.server);
    }

    addDevice(user: User, initialDevice: Partial<Device>): Promise<any> {
        return this.database.addDevice(user, initialDevice);
    }

    getDeviceByMac(user: User, mac: string): Promise<any> {
        return this.database.getDeviceByMac(user, mac);
    }

    updateDevice(user: User, id: DeviceId, update: Partial<Device>): Promise<Device> {
        return DeviceModel.findById(id).exec()
            .then(device => {
                if (device) {
                    if (device.userId.toString() === user._id.toString()) {
                        return this.database.updateDevice(device, update);
                    }
                    logger.warn("[EVENT REACTOR] User " + user.name + " tried to modify unowned device " + id);
                }
                logger.warn("[EVENT REACTOR] Could not find device " + id + " to update");
            });
    }

    removeDevice(user: User, deviceId: DeviceId) {
        return DeviceModel.findById(deviceId).exec()
            .then(device => {
                if (device.userId.toString() === user._id.toString())
                    return this.database.removeDevice(device);

                logger.warn("[EVENT REACTOR] User " + user.name + " tried to remove unowned device " + deviceId);
            });
    }

    addStage(user: User, initialStage: Partial<Server.Stage>): Promise<any> {
        return this.database.addStage(user, initialStage);
    }

    changeStage(user: User, id: StageId, fields: Partial<Server.Stage>): Promise<any> {
        return StageModel.findOne({_id: id, admins: user._id}).exec()
            .then(stage => {
                if (stage)
                    return this.database.updateStage(stage, fields)
            });
    }

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string) {
        return StageModel.findById(stageId).exec()
            .then(stage => {
                if (!stage) {
                    throw new Error(Errors.NOT_FOUND);
                }
                return GroupModel.findById(groupId).exec()
                    .then(group => {
                        if (!group)
                            throw new Error(Errors.NOT_FOUND);
                        // Refresh user
                        return UserModel.findById(userId).exec()
                            .then(user => this.database.joinStage(user, stage, group, password));
                    })
            })
    }

    public leaveStage(userId: UserId): Promise<any> {
        // Refresh user model first
        return UserModel.findById(userId).exec()
            .then(user => this.database.leaveStage(user));
    }

    public removeStage(user: User, stageId: StageId): Promise<any> {
        // For all active users: leave stage first
        // Remove all groups
        return Model.StageModel.findOne({_id: stageId, admins: user._id}).exec()
            .then(stage => {
                if (stage) {
                    return this.database.removeStage(stage);
                }
            })
    }

    public addGroup(user: User, stageId: StageId, name: string): Promise<any> {
        return Model.StageModel.findOne({_id: stageId, admins: user._id}).exec()
            .then(stage => {
                if (stage) {
                    return this.database.addGroup(stage, name);
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

    addProducer(device: Device, kind: "audio" | "video" | "ov", routerId?: string): Promise<Producer> {
        return UserModel.findById(device.userId).exec()
            .then(user => {
                if (user) {
                    return this.database.addProducer(device, user, kind, routerId);
                }
                throw new Error("Could not find user");
            })
    }

    changeProducer(device: Device, producerId: string, update: Partial<Producer>): Promise<Producer> {
        return ProducerModel.findOne({_id: producerId, deviceId: device._id}).exec()
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

    removeProducer(device: Device, producerId: string): Promise<Producer> {
        return ProducerModel.findOne({_id: producerId, deviceId: device._id}).exec()
            .then(producer => {
                if (producer) {
                    return this.database.removeProducer(producer);
                }
                throw new Error("Could not find producer");
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