import {StageMemberType, GroupType, StageType, UserType, ProducerType, DeviceType} from "../storage/mongoose/mongo.types";
import {Device, DeviceId, GroupId, Producer, RouterId, StageId, User, UserId} from "../model.common";
import ISocketServer from "../../src/ISocketServer";
import Model from "../storage/mongoose/model.mongo";
import {ServerDeviceEvents, ServerStageEvents} from "../../src/events";
import * as pino from "pino";
import Server from "../../src/model.server";
import * as socketIO from "socket.io";
import StageMemberModel = Model.StageMemberModel;
import GroupModel = Model.GroupModel;
import CustomGroupVolumeModel = Model.CustomGroupVolumeModel;
import UserModel = Model.UserModel;
import ProducerModel = Model.ProducerModel;
import DeviceModel = Model.DeviceModel;
import {serverAddress} from "../../src";
import {Set} from "immutable";


const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export interface IEventReactorStorage {
    addDevice(userId: UserId, initialDevice: Partial<Device>): Promise<DeviceType>;

    updateDevice(device: DeviceType, update: Partial<Device>): Promise<DeviceType>;

    getDeviceByMac(userId: UserId, mac: string): Promise<DeviceType>;

    removeDevice(device: DeviceType): Promise<any>;

    addStage(userId: UserId, initialStage: Partial<Server.Stage>): Promise<any>;

    updateStage(stage: StageType, fields: Partial<Server.Stage>): Promise<any>;

    joinStage(user: UserType, stage: { _id: StageId, admins: UserId[] }, groupId: GroupId): Promise<any>;

    leaveStage(user: UserType, skipLeaveNotification?: boolean): Promise<any>;

    removeStage(stage: StageType): Promise<any>;

    addGroup(stageId: StageId, name: string): Promise<any>;

    updateGroup(group: GroupType, fields: Partial<Server.Group>): Promise<any>;

    removeGroup(group: GroupType): Promise<any>;

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Server.Stage): Promise<UserId[]>;

    sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any>;

    addProducer(deviceId: DeviceId, user: UserType, kind: "audio" | "video" | "ov", routerId?: RouterId, routerProducerId?: string): Promise<any>;

    updateProducer(producer: ProducerType, update: Partial<Producer>): Promise<any>;

    removeProducer(producer: ProducerType): Promise<any>;
}

class EventReactorStorage implements IEventReactorStorage {
    private server: ISocketServer;

    constructor(server: ISocketServer) {
        this.server = server;
    }

    addDevice(userId: UserId, initialDevice: Partial<Device>): Promise<DeviceType> {
        const device: Omit<Device, "_id"> = {
            canVideo: false,
            canAudio: false,
            sendAudio: false,
            sendVideo: false,
            receiveAudio: false,
            receiveVideo: false,
            name: "",
            ...initialDevice,
            server: serverAddress,
            userId: userId,
            online: true
        };
        return new Model.DeviceModel(device).save()
            .then(device => {
                this.server.sendToUser(userId, ServerDeviceEvents.DEVICE_ADDED, device);
                return device;
            });
    }

    getDeviceByMac(userId: UserId, mac: string): Promise<DeviceType> {
        return DeviceModel.findOne({userId: userId, mac: mac}).exec();
    }

    updateDevice(device: DeviceType, update: Partial<Device>): Promise<any> {
        return device.updateOne({
            ...update,
            _id: undefined
        })
            .then(device => {
                this.server.sendToUser(device.userId, ServerDeviceEvents.DEVICE_CHANGED, update);
                return device;
            });
    }

    removeDevice(device: DeviceType): Promise<any> {
        return device.remove()
            .then(() => {
                this.server.sendToUser(device.userId, ServerDeviceEvents.DEVICE_REMOVED, device._id);
            });
    }

    public addStage(userId: UserId, initialStage: Partial<Server.Stage>) {
        // ADD STAGE
        const stage = new Model.StageModel();
        stage.name = initialStage.name;
        stage.password = initialStage.password;
        stage.width = initialStage.width || 25;
        stage.length = initialStage.length || 13;
        stage.height = initialStage.height || 7.5;
        stage.reflection = initialStage.reflection || 0.7;
        stage.absorption = initialStage.absorption || 0.6;
        stage.admins = initialStage.admins ? [...initialStage.admins, userId] : [userId];
        return stage.save()
            .then(stage => stage.admins.forEach(admin => this.server.sendToUser(admin, ServerStageEvents.STAGE_ADDED, stage)));
    }

    public updateStage(stage: StageType, fields: Partial<Server.Stage>) {
        // CHANGE STAGE
        return stage.updateOne({
            ...fields,
            _id: undefined
        })
            .then(() => this.server.sendToStage(stage._id, ServerStageEvents.STAGE_CHANGED, {
                ...stage,
                id: stage._id
            }));
    }

    //TODO: Performance's still ~140ms
    public async joinStage(user: UserType, stage: {
        _id: StageId,
        admins: UserId[]
    }, groupId: GroupId) {
        let startTime = Date.now();
        const isAdmin: boolean = stage.admins.find(admin => admin.toString() === user._id.toString()) !== undefined;
        const previousStageId = user.stageId;
        const previousStageMemberId = user.stageMemberId;

        // Create or get group member
        let stageMember = await Model.StageMemberModel.findOne({
            userId: user._id,
            stageId: stage._id
        }).exec();
        const wasUserAlreadyInStage = stageMember !== null;
        if (!stageMember) {
            stageMember = new Model.StageMemberModel();
            stageMember.name = user.name;
            stageMember.avatarUrl = user.avatarUrl;
            stageMember.userId = user._id;
            stageMember.volume = 1.0;
            stageMember.isDirector = false;
            stageMember.stageId = stage._id;
        }
        stageMember.groupId = groupId;
        stageMember.online = true;
        stageMember = await stageMember.save(); // must by sync (we need the _id)

        // Send group member to new stage (async!)
        this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember.toObject());

        user.stageId = stage._id;
        user.stageMemberId = stageMember._id;
        await user.save();

        // Send whole stage
        const wholeStage = await EventReactorStorage.getWholeStage(user._id, stage._id, isAdmin || wasUserAlreadyInStage);
        this.server.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, {
            ...wholeStage,
            stageId: stage._id,
            groupId: groupId,
        });

        if (previousStageId) {
            // Set old stage member offline
            Model.StageMemberModel.updateOne({_id: previousStageMemberId}, {online: false}).exec()
                .then(() => this.server.sendToJoinedStageMembers(previousStageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                    online: false,
                    _id: previousStageMemberId
                }));
        }

        // Assign producers of user to new stage and inform their stage members (async!)
        Model.ProducerModel.updateMany({userId: user._id}, {stageMemberId: stageMember._id}).exec()
            .then(() => Model.ProducerModel.find({userId: user._id}).lean().exec())
            .then(producers => {
                // Inform stage
                producers.forEach(producer => this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.STAGE_PRODUCER_ADDED, producer));
            });
        console.log("joinStage: " + (Date.now() - startTime) + "ms");
        return true;
    }

    //TODO: Performance's still ~40ms
    public async leaveStage(user: UserType, skipLeaveNotification?: boolean): Promise<any> {
        let startTime = Date.now()
        if (user.stageId) {
            const previousStageId = user.stageId;

            const previousGroupMember = await StageMemberModel.findById(user.stageMemberId).exec();

            // Leave the user <-> stage member connection
            user.stageId = undefined;
            user.stageMemberId = undefined;
            await user.save();

            this.server.sendToUser(user._id, ServerStageEvents.STAGE_LEFT);

            previousGroupMember.online = false;
            previousGroupMember.save()
                .then(() => this.server.sendToJoinedStageMembers(previousStageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                        _id: previousGroupMember._id,
                        online: false
                    })
                )
                .then(() => logger.debug("[EVENT REACTOR] Set group member " + user.name + " of stage to offline"))

            // Remove producers
            Model.ProducerModel.updateMany({userId: user._id}, {online: false}).exec()
                .then(() => Model.ProducerModel.find({userId: user._id}, {_id: 1}).lean().exec())
                .then(previousProducers => previousProducers.forEach(previousProducer => this.server.sendToJoinedStageMembers(previousStageId, ServerStageEvents.STAGE_PRODUCER_REMOVED, previousProducer._id)));

            console.log("leaveStage: " + (Date.now() - startTime) + "ms");
        }
    }


    public async removeStage(stage: StageType) {
        const groups = await GroupModel.find({stageId: stage._id}).exec();
        for (const group of groups) {
            await this.removeGroup(group);
        }
        return this.getUserIdsByStage(stage)
            .then(async userIds => {
                for (const userId of userIds) {
                    await this.revokeStageAndGroupsFromUser(userId, stage._id);
                }
            })
            .then(() => stage.remove());
    }

    public addGroup(stageId: StageId, name: string): Promise<any> {
        const group = new Model.GroupModel();
        group.name = name;
        group.stageId = stageId;
        group.volume = 1;
        return group.save()
            .then(group => this.server.sendToStage(stageId, ServerStageEvents.GROUP_ADDED, group.toObject()))
            .then(() => logger.debug("[EVENT REACTOR DATABASE] Added group " + group.name))
    }

    public updateGroup(group: GroupType, fields: Partial<Server.Group>): Promise<any> {
        return group.updateOne(fields)
            .then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_CHANGED, {
                ...fields,
                _id: group._id
            }))
            .then(() => logger.debug("[EVENT REACTOR] Updated group " + group.name))
    }

    public async removeGroup(group: GroupType): Promise<any> {
        // Remove all custom group volumes
        await CustomGroupVolumeModel.find({groupId: group._id}).exec()
            .then(volumes => Promise.all(volumes.map(volume => volume.remove().then(() => this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, volume._id)))));
        // remove all group members
        await StageMemberModel.find({groupId: group._id}).exec()
            .then(stageMembers => Promise.all(stageMembers.map(stageMember => this.removeStageMember(stageMember))))
        return group.remove()
            .then(() => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_REMOVED, group._id));
    }

    public updateGroupMember(groupMember: StageMemberType, update: Partial<Server.StageMember>) {
        return groupMember.updateOne(update).exec()
            .then(() => this.server.sendToJoinedStageMembers(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                ...update,
                _id: groupMember._id
            }))
    }

    public removeStageMember(stageMember: StageMemberType) {
        return UserModel.findById(stageMember.userId).exec()
            .then(user => {
                if (user.stageMemberId && user.stageMemberId.toString() === stageMember._id.toString()) {
                    // If user is connected, let user leave first
                    return this.leaveStage(user);
                }
            })
            // Remove all custom group member volumes
            .then(() => Model.CustomStageMemberVolumeModel.find({stageMemberId: stageMember._id}).exec()
                .then(volumes => volumes.forEach(volume => volume.remove().then(() => this.server.sendToStage(stageMember.stageId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, volume._id))))
            )
            // Remove group member
            .then(() => stageMember.remove())
            .then(() => this.server.sendToJoinedStageMembers(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMember._id));
    }


    addProducer(deviceId: DeviceId, user: UserType, kind: "audio" | "video" | "ov", routerId?: RouterId, routerProducerId?: string): Promise<ProducerType> {
        const producer = new ProducerModel();
        producer.userId = user._id;
        producer.deviceId = deviceId;
        producer.kind = kind;
        producer.routerId = routerId;
        producer.routerProducerId = routerProducerId;
        if (user.stageMemberId) {
            producer.stageMemberId = user.stageMemberId;
        }
        return producer.save()
            .then(async producer => {
                if (producer.stageMemberId) {
                    // Inform all stage members first
                    await this.server.sendToStage(user.stageId, ServerStageEvents.STAGE_PRODUCER_ADDED, producer.toObject());
                }
                // Inform user
                this.server.sendToUser(deviceId, ServerDeviceEvents.PRODUCER_ADDED, producer.toObject());
                return producer;
            });
    }

    updateProducer(producer: ProducerType, update: Partial<Producer>): Promise<ProducerType> {
        return producer.update(producer)
            .then(async () => {
                if (producer.stageMemberId) {
                    // Inform all stage members first
                    await StageMemberModel.findById(producer.stageMemberId).lean().exec()
                        .then(stageMember => this.server.sendToJoinedStageMembers(stageMember.stageId, ServerStageEvents.STAGE_PRODUCER_CHANGED, {
                            ...update,
                            _id: producer._id
                        }));
                }
                // Inform user
                this.server.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_CHANGED, producer);
                return producer;
            });
    }

    removeProducer(producer: ProducerType): Promise<ProducerType> {
        return producer.remove()
            .then(async () => {
                if (producer.stageMemberId) {
                    // Inform all stage members first
                    await StageMemberModel.findById(producer.stageMemberId).lean().exec()
                        .then(stageMember => this.server.sendToJoinedStageMembers(stageMember.stageId, ServerStageEvents.STAGE_PRODUCER_REMOVED, producer._id));
                }
                this.server.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_REMOVED, producer._id);
                return producer;
            })
    }


    //**** SEND / REVOKE METHODS *****/
    public async sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any> {
        if (user.stageMemberId) {
            await Model.StageMemberModel.findByIdAndUpdate(user.stageMemberId, {online: true}).exec();
        }
        const groupMembers = await Model.StageMemberModel.find({userId: user._id}).lean().exec();
        // Get all managed stages and stages, where the user was or is in
        const stages = await Model.StageModel.find({$or: [{_id: {$in: groupMembers.map(groupMember => groupMember.stageId)}}, {admins: user._id}]}).exec();
        for (const stage of stages) {
            await this.server.sendToDevice(socket, ServerStageEvents.STAGE_ADDED, stage.toObject());
        }
        const groups = await GroupModel.find({stageId: {$in: stages.map(stage => stage._id)}}).lean().exec();
        for (const group of groups) {
            await this.server.sendToDevice(socket, ServerStageEvents.GROUP_ADDED, group);
        }
        if (user.stageMemberId) {
            const stageMember = groupMembers.find(groupMember => groupMember._id.toString() === user.stageMemberId.toString());
            if (stageMember) {
                const wholeStage = await EventReactorStorage.getWholeStage(user._id, user.stageId, true);
                this.server.sendToDevice(socket, ServerStageEvents.STAGE_JOINED, {
                    ...wholeStage,
                    stageId: user.stageId,
                    groupId: stageMember.groupId
                });
            } else {
                logger.error("Group member or stage should exists, but could not be found");
            }
        }
    }

    private async revokeStageAndGroupsFromUser(userId: UserId, stageId: StageId): Promise<any> {
        const groups = await GroupModel.find({stageId: stageId}).lean().exec();
        for (const group of groups) {
            this.server.sendToUser(userId, ServerStageEvents.GROUP_REMOVED, group._id);
        }
        this.server.sendToUser(userId, ServerStageEvents.STAGE_REMOVED, stageId);
    }

    private static async getWholeStage(userId: UserId, stageId: StageId, skipStageAndGroups: boolean): Promise<{
        stage?: Server.Stage;
        groups?: Server.Group[];
        stageMembers: Server.StageMember[];
        customGroupVolumes: Server.CustomGroupVolume[];
        customStageMemberVolumes: Server.CustomStageMemberVolume[];
        producers: Producer[];
    }> {
        const stage = skipStageAndGroups ? undefined : await Model.StageModel.findById(stageId).lean().exec();
        const groups = skipStageAndGroups ? undefined : await Model.GroupModel.find({stageId: stageId}).lean().exec();
        const stageMembers = await Model.StageMemberModel.find({stageId: stageId}).lean().exec();
        const customGroupVolumes = await Model.CustomGroupVolumeModel.find({
            stageId: stageId,
            userId: userId
        }).lean().exec();
        const stageMemberIds: string[] = stageMembers.map(stageMember => stageMember._id);
        const customStageMemberVolumes = await Model.CustomStageMemberVolumeModel.find({
            userId: userId,
            stageMemberId: {$in: stageMemberIds}
        }).lean().exec();
        const producers = await Model.ProducerModel.find({stageMemberId: {$in: stageMemberIds}}).lean().exec();

        return {
            stage,
            groups,
            stageMembers,
            customGroupVolumes,
            customStageMemberVolumes,
            producers
        }
    }

    public getUserIdsByStageId(stageId: StageId): Promise<UserId[]> {
        return Model.StageModel.findById(stageId, {admins: 1}).lean().exec()
            .then(stage => {
                if (stage) {
                    return this.getUserIdsByStage(stage);
                }
                return [];
            })
    }

    public getUserIdsByStage(stage: Server.Stage): Promise<UserId[]> {
        return Model.StageMemberModel.find({stageId: stage._id}, {userId: 1}).lean().exec()
            .then(stageMembers => Set<string>([...stage.admins.map(admin => admin.toString()), ...stageMembers.map(stageMember => stageMember.userId.toString())]).toArray())
    }
}

export default EventReactorStorage;