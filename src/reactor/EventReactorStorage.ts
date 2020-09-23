import {StageMemberType, GroupType, StageType, UserType, ProducerType, DeviceType} from "../storage/mongo/mongo.types";
import {Device, Producer, RouterId, StageId, User, UserId} from "../model.common";
import ISocketServer from "../ISocketServer";
import Model from "../storage/mongo/model.mongo";
import {ServerDeviceEvents, ServerStageEvents} from "../events";
import * as pino from "pino";
import {Errors} from "../errors";
import Server from "../model.server";
import * as socketIO from "socket.io";
import StageMemberModel = Model.StageMemberModel;
import GroupModel = Model.GroupModel;
import CustomGroupVolumeModel = Model.CustomGroupVolumeModel;
import UserModel = Model.UserModel;
import ProducerModel = Model.ProducerModel;
import {serverAddress} from "../index";
import DeviceModel = Model.DeviceModel;

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export interface IEventReactorStorage {
    addDevice(user: User, initialDevice: Partial<Device>): Promise<DeviceType>;

    updateDevice(device: DeviceType, update: Partial<Device>): Promise<DeviceType>;

    getDeviceByMac(user: User, mac: string): Promise<DeviceType>;

    removeDevice(device: DeviceType): Promise<any>;

    addStage(user: User, initialStage: Partial<Server.Stage>): Promise<any>;

    updateStage(stage: StageType, fields: Partial<Server.Stage>): Promise<any>;

    joinStage(user: UserType, stage: StageType, group: GroupType, password?: string): Promise<any>;

    leaveStage(user: UserType, skipLeaveNotification?: boolean): Promise<any>;

    removeStage(stage: StageType): Promise<any>;

    addGroup(stage: StageType, name: string): Promise<any>;

    updateGroup(group: GroupType, fields: Partial<Server.Group>): Promise<any>;

    removeGroup(group: GroupType): Promise<any>;

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Server.Stage): Promise<UserId[]>;

    sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any>;

    addProducer(device: Device, user: UserType, kind: "audio" | "video" | "ov", routerId?: RouterId): Promise<any>;

    updateProducer(producer: ProducerType, update: Partial<Producer>): Promise<any>;

    removeProducer(producer: ProducerType): Promise<any>;
}

class EventReactorStorage implements IEventReactorStorage {
    private server: ISocketServer;

    constructor(server: ISocketServer) {
        this.server = server;
    }

    addDevice(user: User, initialDevice: Partial<Device>): Promise<DeviceType> {
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
            userId: user._id,
            online: true
        };
        return new Model.DeviceModel(device).save()
            .then(device => {
                this.server.sendToUser(user._id, ServerDeviceEvents.DEVICE_ADDED, device);
                return device;
            });
    }

    getDeviceByMac(user: User, mac: string): Promise<DeviceType> {
        return DeviceModel.findOne({userId: user._id, mac: mac}).exec();
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

    public addStage(user: User, initialStage: Partial<Server.Stage>) {
        // ADD STAGE
        const stage = new Model.StageModel();
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

    public async joinStage(user: UserType, stage: StageType, group: GroupType, password?: string) {
        logger.debug("[EVENT REACTOR] User " + user.name + " wants to join stage " + stage.name + " and group " + group.name);
        // First check password
        if (stage.password && stage.password !== password) {
            throw new Error(Errors.INVALID_PASSWORD);
        }
        const isAdmin: boolean = stage.admins.find(admin => admin.toString() === user._id.toString()) !== undefined;
        await this.leaveStage(user, true);
        // Create or get group member
        let groupMember = await Model.StageMemberModel.findOne({
            userId: user._id,
            stageId: stage._id
        }).exec();
        const wasUserAlreadyInStage = groupMember !== null;
        if (!groupMember) {
            groupMember = new Model.StageMemberModel();
            groupMember.userId = user._id;
            groupMember.volume = 1.0;
            groupMember.isDirector = false;
            groupMember.stageId = stage._id;
        }
        groupMember.groupId = group._id;
        groupMember.online = true;
        groupMember = await groupMember.save();

        // Assign user
        user = await Model.UserModel.findById(user._id).exec();
        user.stageId = stage._id;
        user.stageMemberId = groupMember._id;
        await Model.UserModel.findByIdAndUpdate(user._id, {
            stageId: stage._id,
            stageMemberId: groupMember._id
        });

        await this.server.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, {
            stageId: stage._id,
            groupId: group._id
        });

        if (!wasUserAlreadyInStage && !isAdmin) {
            console.log("Sending whole stage");
            await this.sendStageToUser(user._id, stage);
        }

        await this.sendStageMembersToUser(user._id, stage._id);

        // NOW the user is also a joined stage member (!)
        if (wasUserAlreadyInStage) {
            await this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                _id: groupMember._id,
                online: true,
                groupId: group._id
            });
        } else {
            await this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember.toObject());
        }

        // Publish existing producers
        return Model.ProducerModel.find({userId: user._id}).exec()
            .then(producers => producers.map(producer => {
                producer.stageMemberId = groupMember._id;
                producer.save()
                    .then(producer => this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.STAGE_PRODUCER_ADDED, producer.toObject()))
            }))
    }

    public async leaveStage(user: UserType, skipLeaveNotification?: boolean): Promise<any> {
        if (user.stageId) {
            const stageId = user.stageId;
            const groupMember = await StageMemberModel.findById(user.stageMemberId).exec();
            if (!groupMember) {
                throw new Error("No group member?");
            }
            // First clean up client by revoking stage
            await this.revokeStageMembersFromUser(user._id, stageId);
            // Update group member (before finally leaving)
            groupMember.online = false;
            await groupMember.save();
            await this.server.sendToJoinedStageMembers(stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                _id: groupMember._id,
                online: false
            });
            logger.debug("[EVENT REACTOR] Set group member " + user.name + " of stage to offline");

            // Leave the user <-> stage member connection
            user.stageId = undefined;
            user.stageMemberId = undefined;
            await user.save();

            if (!skipLeaveNotification) {
                await this.server.sendToUser(user._id, ServerStageEvents.STAGE_LEFT);
            }

            // NOW the user is no joined stage member any more

            // Remove producers
            const producers = await Model.ProducerModel.find({stageMemberId: groupMember._id}).exec();
            for (const producer of producers) {
                await producer.updateOne({
                    stageMemberId: undefined
                }).then(() => this.server.sendToJoinedStageMembers(stageId, ServerStageEvents.STAGE_PRODUCER_REMOVED, producer));
            }
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
                    await this.revokeStageFromUser(userId, stage._id);
                }
            })
            .then(() => stage.remove());
    }

    public addGroup(stage: StageType, name: string): Promise<any> {
        const group = new Model.GroupModel();
        group.name = name;
        group.stageId = stage._id;
        return group.save()
            .then(group => this.server.sendToStage(stage._id, ServerStageEvents.GROUP_ADDED, group.toObject()))
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


    addProducer(device: Device, user: UserType, kind: "audio" | "video" | "ov", routerId?: RouterId): Promise<ProducerType> {
        const producer = new ProducerModel();
        producer.userId = user._id;
        producer.deviceId = device._id;
        producer.kind = kind;
        //producer.routerId = routerId;
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
                this.server.sendToUser(device.userId, ServerDeviceEvents.PRODUCER_ADDED, producer.toObject());
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
            const groupMember = groupMembers.find(groupMember => groupMember._id.toString() === user.stageMemberId.toString());
            const stage = stages.find(stage => stage._id.toString() === user.stageId.toString());
            if (stage && groupMember) {
                await this.sendStageMembersToDevice(socket, user._id, stage._id);
                await this.server.sendToDevice(socket, ServerStageEvents.STAGE_JOINED, {
                    stageId: user.stageId,
                    groupId: groupMember.groupId
                });
            } else {
                logger.error("Group member or stage should exists, but could not be found");
            }
        }
    }

    private async sendStageToUser(userId: UserId, stage: StageType): Promise<any> {
        const groups = await GroupModel.find({stageId: stage._id}).lean().exec();
        this.server.sendToUser(userId, ServerStageEvents.STAGE_ADDED, stage.toObject());
        for (const group of groups) {
            this.server.sendToUser(userId, ServerStageEvents.GROUP_ADDED, group);
        }
    }

    private async revokeStageFromUser(userId: UserId, stageId: StageId): Promise<any> {
        const groups = await GroupModel.find({stageId: stageId}).lean().exec();
        for (const group of groups) {
            this.server.sendToUser(userId, ServerStageEvents.GROUP_REMOVED, group._id);
        }
        this.server.sendToUser(userId, ServerStageEvents.STAGE_REMOVED, stageId);
    }

    private static async getStageMembers(userId: UserId, stageId: StageId): Promise<{
        stageMembers: Server.StageMember[],
        customGroupVolumes: Server.CustomGroupVolume[],
        customStageMemberVolumes: Server.CustomStageMemberVolume[],
        producers: Producer[],
    }> {
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
            stageMembers,
            customGroupVolumes,
            customStageMemberVolumes,
            producers
        }
    }

    private async sendStageMembersToUser(userId: UserId, stageId: StageId): Promise<any> {
        const {stageMembers, customGroupVolumes, customStageMemberVolumes, producers} = await EventReactorStorage.getStageMembers(userId, stageId);
        for (const stageMember of stageMembers) {
            this.server.sendToUser(userId, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember);
        }
        for (const customGroupVolume of customGroupVolumes) {
            this.server.sendToUser(userId, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, customGroupVolume);
        }
        for (const customStageMemberVolume of customStageMemberVolumes) {
            this.server.sendToUser(userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, customStageMemberVolume);
        }
        for (const producer of producers) {
            this.server.sendToUser(userId, ServerStageEvents.STAGE_PRODUCER_ADDED, producer);
        }
    }

    private async sendStageMembersToDevice(socket: socketIO.Socket, userId: UserId, stageId: StageId): Promise<any> {
        const {stageMembers, customGroupVolumes, customStageMemberVolumes, producers} = await EventReactorStorage.getStageMembers(userId, stageId);
        for (const stageMember of stageMembers) {
            this.server.sendToDevice(socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember);
        }
        for (const customGroupVolume of customGroupVolumes) {
            this.server.sendToDevice(socket, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, customGroupVolume);
        }
        for (const customStageMemberVolume of customStageMemberVolumes) {
            this.server.sendToDevice(socket, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, customStageMemberVolume);
        }
        for (const producer of producers) {
            this.server.sendToDevice(socket, ServerStageEvents.STAGE_PRODUCER_ADDED, producer);
        }
    }

    private async revokeStageMembersFromUser(userId: UserId, stageId: StageId): Promise<any> {
        const {stageMembers, customGroupVolumes, customStageMemberVolumes, producers} = await EventReactorStorage.getStageMembers(userId, stageId);
        for (const stageMember of stageMembers) {
            this.server.sendToUser(userId, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMember._id);
        }
        for (const customGroupVolume of customGroupVolumes) {
            this.server.sendToUser(userId, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, customGroupVolume._id);
        }
        for (const customStageMemberVolume of customStageMemberVolumes) {
            this.server.sendToUser(userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, customStageMemberVolume._id);
        }
        for (const producer of producers) {
            this.server.sendToUser(userId, ServerStageEvents.STAGE_PRODUCER_REMOVED, producer._id);
        }
    }

    public getUserIdsByStageId(stageId: StageId): Promise<UserId[]> {
        return Model.StageModel.findById(stageId).lean().exec()
            .then(stage => {
                if (stage) {
                    return this.getUserIdsByStage(stage);
                }
                return [];
            })
    }

    public getUserIdsByStage(stage: Server.Stage): Promise<UserId[]> {
        return Model.StageMemberModel.find({stageId: stage._id}).exec()
            .then(stageMembers => ([...new Set([...stage.admins, ...stageMembers.map(stageMember => stageMember.userId)])]));
    }
}

export default EventReactorStorage;