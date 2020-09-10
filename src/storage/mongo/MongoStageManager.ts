import {IDeviceManagement, IStageManagement} from "../IStorage";
import {
    Device,
    DeviceId,
    GroupId,
    Producer,
    ProducerId,
    RouterId,
    StageId,
    StageMemberId, User,
    UserId
} from "../../model.common";
import Client from "../../model.client";
import {
    CustomGroupVolumeModel, CustomStageMemberVolumeModel,
    DeviceModel,
    ProducerModel,
    StageMemberModel,
    StageModel,
    UserModel
} from "./model.mongo";
import SocketServer from "../../socket/SocketServer";
import {ServerStageEvents} from "../../socket/SocketStageEvent";
import * as pino from "pino";
import * as mongoose from "mongoose";
import {ServerDeviceEvents} from "../../socket/SocketDeviceEvent";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

const uri = "mongodb://127.0.0.1:4321/digitalstage";

const USE_WATCHER: boolean = false;

class MongoStageManager implements IStageManagement, IDeviceManagement {
    private initialized: boolean = false;

    init(): Promise<any> {
        if (!this.initialized) {
            this.initialized = true;
            logger.info("[MONGOSTORAGE] Initializing mongo storage ...");
            return mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true})
                .then(() => this.attachWatchers())
                .then(() => logger.info("[MONGOSTORAGE] DONE initializing mongo storage."))
        }
    }

    private attachWatchers() {
        if (USE_WATCHER) {
            DeviceModel.watch()
                .on('change', (stream: any) => {
                    console.log(stream);
                    const device: Device = stream.fullDocument;
                    switch (stream.operationType) {
                        case "insert":
                            SocketServer.sendToUser(device.userId, ServerDeviceEvents.DEVICE_ADDED, device);
                            break;
                        case "update":
                            SocketServer.sendToUser(device.userId, ServerDeviceEvents.DEVICE_CHANGED, device);
                            break;
                        case "delete":
                            SocketServer.sendToUser(device.userId, ServerDeviceEvents.DEVICE_REMOVED, device._id);
                            break;
                    }
                });
        }
    }

    addGroup(userId: UserId, stageId: StageId, name: string) {
    }

    addProducer(userId: UserId, deviceId: DeviceId, kind: "audio" | "video" | "ov", routerId: RouterId) {
    }

    createStage(userId: UserId, name: string, password) {
        const stage = new StageModel();
        stage.name = name;
        stage.password = password;
        return stage.save()
            .then(stage => UserModel.updateOne({_id: userId}, {$push: {managedStages: stage._id}}));
    }

    getStageSnapshotByUser(userId: UserId): Promise<Client.Stage> {
        return UserModel.findById(userId).exec()
            .then(user => {
                if (user.stageId) {
                    return StageModel.findById(user.stageId).lean().exec()
                        .then(async stage => {
                            // We need all producers of this stage
                            // Since producers are not connected to a stage, first get all active users
                            const users = await this.getUsersWithActiveStage(stage._id);
                            const producers = await ProducerModel.find({userId: {$in: users.map(user => user._id)}}).exec();

                            // Now get all groups and members
                            const groups = await this.getGroupsByStage(stage._id);
                            const groupMembers = await this.generateGroupMembersByStage(stage._id);

                            // Also get all custom group and group member volumes
                            const customGroupVolumes = await CustomGroupVolumeModel.find({
                                userId: userId,
                                stageId: stage._id
                            }).exec();
                            const customGroupMemberVolumes = await CustomStageMemberVolumeModel.find({
                                userId: userId,
                                stageId: stage._id
                            }).exec();

                            const stageSnapshot: Client.Stage = {
                                ...stage,
                                groups: groups.map(group => ({
                                    ...group,
                                    customVolume: customGroupVolumes.find(v => v.groupId === group._id).volume,
                                    members: groupMembers.map(groupMember => ({
                                        ...groupMember,
                                        customVolume: customGroupMemberVolumes.find(v => v.stageMemberId === groupMember._id).volume,
                                        audioProducers: producers.filter(p => p.kind === "audio" && p.userId === groupMember.userId),
                                        videoProducers: producers.filter(p => p.kind === "video" && p.userId === groupMember.userId),
                                        ovProducers: producers.filter(p => p.kind === "ov" && p.userId === groupMember.userId),
                                    }))
                                }))
                            }
                            return stageSnapshot;
                        })
                }
                return null;
            });
    }

    getUserByUid(uid: string): Promise<User> {
        return UserModel.findOne({uid: uid}).lean().exec();
    }

    getUsersByStage(stageId: StageId): Promise<User[]> {
        return StageMemberModel.find({stageId: stageId}).exec()
            .then(stageMembers => UserModel.find({_id: {$in: stageMembers.map(stageMember => stageMember.userId)}}).lean().exec());
    }

    getUsersWithActiveStage(stageId: StageId): Promise<User[]> {
        return UserModel.find({stageId: stageId}).lean().exec();
    }

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string) {
        return StageModel.findById(stageId).exec()
            .then(stage => {
                if (stage.password && stage.password !== password) {
                    throw new Error("Invalid password");
                } else {
                    const stageMember = new StageMemberModel();
                    stageMember.userId = userId;
                    stageMember.stageId = stageId;
                    stageMember.groupId = groupId;
                    stageMember.volume = 1;
                    stageMember.save()
                        .then(() => SocketServer.sendToUser(userId, ServerStageEvents.STAGE_JOINED, stageId));
                }
            });
    }

    leaveStage(userId: UserId) {
        return UserModel.findByIdAndUpdate(userId, {
            stageId: undefined
        }).exec();
    }

    removeGroup(userId: UserId, groupId: GroupId) {
    }

    removeProducer(userId: UserId, producerId: ProducerId) {
    }

    removeStage(userId: UserId, stageId: StageId) {
    }

    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number) {
    }

    updateGroup(userId: UserId, groupId: GroupId, group: Partial<Client.GroupPrototype>) {
    }

    updateGroupMember(id: StageMemberId, groupMember: Partial<Client.StageMemberPrototype>) {
    }

    updateProducer(userId: UserId, producerId: ProducerId, producer: Partial<Producer>) {
    }

    updateStage(userId: UserId, stageId: StageId, stage: Partial<Client.StagePrototype>) {
    }

    createDevice(userId: UserId, initialDevice: Partial<Omit<Device, "_id">>): Promise<Device> {
        const device = new DeviceModel();
        device.mac = initialDevice.mac;
        device.canVideo = initialDevice.canVideo;
        device.canAudio = initialDevice.canAudio;
        device.sendAudio = initialDevice.sendAudio;
        device.sendVideo = initialDevice.sendVideo;
        device.receiveAudio = initialDevice.receiveAudio;
        device.receiveVideo = initialDevice.receiveVideo;
        device.online = initialDevice.online;
        device.name = initialDevice.name ? initialDevice.name : "";
        device.userId = userId;
        return device.save()
            .then(device => {
                if (!USE_WATCHER) {
                    SocketServer.sendToUser(device.userId, ServerDeviceEvents.DEVICE_ADDED, device);
                }
                return device;
            })
    }

    getDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device> {
        return DeviceModel.findOne({userId: userId, mac: mac}).lean().exec();
    }

    getDevices(): Promise<Device[]> {
        return DeviceModel.find().lean().exec();
    }

    getDevicesByUser(userId: UserId): Promise<Device[]> {
        return DeviceModel.find({userId: userId}).lean().exec();
    }

    removeDevice(deviceId: DeviceId): Promise<Device> {
        return DeviceModel.findByIdAndRemove(deviceId).lean().exec()
            .then(device => {
                if (!USE_WATCHER) {
                    SocketServer.sendToUser(device.userId, ServerDeviceEvents.DEVICE_REMOVED, deviceId);
                }
                return device;
            })
    }

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device> {


        return DeviceModel.findByIdAndUpdate(deviceId, device).lean().exec()
            .then(updatedDevice => {
                //TODO: Don't call the sendToUser in the then, call it directly
                // BUT AGAIN: This don't work ... where is the userId coming from then?!? .. :(
                if (!USE_WATCHER) {
                    SocketServer.sendToUser(updatedDevice.userId, ServerDeviceEvents.DEVICE_CHANGED, {
                        ...updatedDevice,
                        _id: deviceId
                    });
                }
                return updatedDevice;
            })
    }

    generateGroupMembersByStage(stageId: StageId): Promise<Client.GroupMemberPrototype[]> {
        return Promise.resolve([]);
    }

    getActiveStageSnapshotByUser(userId: UserId): Promise<Client.Stage> {
        return Promise.resolve(undefined);
    }

    getCustomGroupVolumesByUserAndStage(userId: UserId, stageId: StageId): Promise<Client.CustomGroupVolume[]> {
        return Promise.resolve([]);
    }

    getCustomStageMemberVolumesByUserAndStage(userId: UserId, stageId: StageId): Promise<Client.CustomStageMemberVolume[]> {
        return Promise.resolve([]);
    }

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]> {
        return Promise.resolve([]);
    }

    getProducersByStage(stageId: StageId): Promise<Producer[]> {
        return Promise.resolve([]);
    }

    getStagesByUser(userId: UserId): Promise<Client.StagePrototype[]> {
        return StageMemberModel.find({userId: userId}).exec()
            .then(stageMembers => StageModel.find({_id: {$in: stageMembers.map(stageMember => stageMember.stageId)}}).lean().exec());
    }

    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number) {
    }

    updateStageMember(id: StageMemberId, groupMember: Partial<Client.StageMemberPrototype>) {
    }
}

export const manager: IStageManagement & IDeviceManagement = new MongoStageManager();