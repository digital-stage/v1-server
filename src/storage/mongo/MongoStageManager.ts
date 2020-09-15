import {
    Device,
    DeviceId,
    GroupId,
    Producer,
    ProducerId,
    RouterId,
    StageId,
    StageMemberId, User,
} from "../../model.common";
import Client from "../../model.client";
import {
    CustomGroupVolumeModel, CustomStageMemberVolumeModel,
    DeviceModel,
    GroupModel,
    ProducerModel,
    StageMemberModel,
    StageModel,
    UserModel
} from "./model.mongo";
import SocketServer from "../../socket/SocketServer";
import * as pino from "pino";
import * as mongoose from "mongoose";
import {IDeviceManager, IStageManager} from "../IManager";
import {ServerDeviceEvents, ServerStageEvents} from "../../events";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

const URL: string = process.env.MONGO_URL || "mongodb://127.0.0.1:4321/digitalstage";

const USE_WATCHER: boolean = false;

class MongoStageManager implements IStageManager, IDeviceManager {
    private initialized: boolean = false;

    init(): Promise<any> {
        if (!this.initialized) {
            this.initialized = true;
            logger.info("[MONGOSTORAGE] Initializing mongo storage ...");
            return mongoose.connect(URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false
            })
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

    addGroup(user: User, stageId: StageId, name: string): Promise<Client.GroupPrototype> {
        return StageModel.findOne({_id: stageId, admins: user._id})
            .then(() => {
                const group = new GroupModel();
                group.stageId = stageId;
                group.name = name;
                return group.save();
            });
    }

    addProducer(user: User, device: Device, kind: "audio" | "video" | "ov", routerId: RouterId): Promise<Producer> {
        const producer = new ProducerModel();
        producer.userId = user._id;
        producer.deviceId = device._id;
        producer.kind = kind;
        producer.routerId = routerId;
        return producer.save();
    }

    createStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<Client.StagePrototype> {
        console.log("Creating stage");
        const stage = new StageModel();
        stage.name = initialStage.name;
        stage.password = initialStage.password;
        stage.width = initialStage.width || 25;
        stage.length = initialStage.length || 13;
        stage.height = initialStage.height || 7.5;
        stage.reflection = initialStage.reflection || 0.7;
        stage.absorption = initialStage.absorption || 0.6;
        stage.admins = [user._id];
        return stage.save();
    }

    getStageSnapshotByUser(user: User): Promise<Client.Stage> {
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
                        userId: user._id,
                        stageId: stage._id
                    }).exec();
                    const customGroupMemberVolumes = await CustomStageMemberVolumeModel.find({
                        userId: user._id,
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
    }

    getUserByUid(uid: string): Promise<User> {
        return UserModel.findOne({uid: uid}).lean().exec();
    }

    getUsersByStage(stageId: StageId): Promise<User[]> {
        return StageMemberModel.find({stageId: stageId}).exec()
            .then(stageMembers => {
                return UserModel.find(
                    {
                        $or: [
                            {managedStages: stageId},
                            {stage: stageId},
                            {
                                stageMembers: {
                                    $in: stageMembers.map(stageMember => stageMember._id)
                                }
                            }
                        ]
                    }
                ).lean().exec();
            });
    }

    getUsersWithActiveStage(stageId: StageId): Promise<User[]> {
        return UserModel.find({stageId: stageId}).lean().exec();
    }

    joinStage(user: User, stageId: StageId, groupId: GroupId, password?: string): Promise<Client.GroupMemberPrototype> {
        return StageModel.findById(stageId).lean().exec()
            .then(stage => {
                if (stage.password && stage.password !== password) {
                    throw new Error("Invalid password");
                } else {
                    const stageMember = new StageMemberModel();
                    stageMember.userId = user._id;
                    stageMember.stageId = stageId;
                    stageMember.groupId = groupId;
                    stageMember.volume = 1;
                    return stageMember.save()
                        .then(() => {
                            SocketServer.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, stageId);
                            return {
                                ...stageMember.toObject(),
                                name: user.name,
                                avatarUrl: user.avatarUrl
                            }
                        });
                }
            });
    }

    leaveStage(user: User): Promise<boolean> {
        return UserModel.findByIdAndUpdate(user._id, {
            stageId: undefined
        }).exec()
            .then(() => true)
            .catch(() => false);
    }

    removeGroup(user: User, groupId: GroupId): Promise<Client.GroupPrototype> {
        return GroupModel.findById(groupId)
            .exec()
            .then(group => StageModel.findOne({_id: group.stageId, admins: user._id}).exec().then(
                () => group.deleteOne().then(() => group.toObject())
            ))
    }

    removeProducer(device: Device, producerId: ProducerId): Promise<Producer> {
        return ProducerModel.findOneAndRemove({
            _id: producerId,
            deviceId: device._id,
        }).lean().exec();
    }

    removeStage(user: User, stageId: StageId): Promise<Client.StagePrototype> {
        return StageModel.findOneAndRemove({_id: stageId, admins: user._id}).lean().exec();
    }

    setCustomGroupVolume(user: User, groupId: GroupId, volume: number) {
        return CustomGroupVolumeModel.findOneAndUpdate({
            userId: user._id,
            groupId: groupId,
        }, {volume: volume}, {
            upsert: true
        }).lean().exec();
    }

    updateGroup(user: User, groupId: GroupId, doc: Partial<Client.GroupPrototype>): Promise<Client.GroupPrototype> {
        console.log("updateGroup");
        console.log(doc);
        return GroupModel.findOne({
            _id: groupId,
        }).exec()
            .then(
                group => {
                    console.log(group);
                    return UserModel.findOne({_id: user._id, managedStages: group.stageId}).lean().exec()
                        .then(() => {
                                console.log("Now updating");
                                return group.updateOne(doc)
                                    .then(() => group.toObject())
                            }
                        );
                });
    }

    updateProducer(device: Device, producerId: ProducerId, producer: Partial<Producer>): Promise<Producer> {
        return ProducerModel.findOneAndUpdate({_id: producerId, deviceId: device._id}, producer)
            .lean().exec();
    }

    updateStage(user: User, stageId: StageId, stage: Partial<Client.StagePrototype>): Promise<Client.StagePrototype> {
        return StageModel.findOneAndUpdate({_id: stageId, admins: user._id}, stage).lean().exec();
    }

    createDevice(user: User, server: string, initialDevice: Partial<Omit<Device, "_id">>): Promise<Device> {
        const device = new DeviceModel();
        device.server = server;
        device.mac = initialDevice.mac;
        device.canVideo = initialDevice.canVideo;
        device.canAudio = initialDevice.canAudio;
        device.sendAudio = initialDevice.sendAudio;
        device.sendVideo = initialDevice.sendVideo;
        device.receiveAudio = initialDevice.receiveAudio;
        device.receiveVideo = initialDevice.receiveVideo;
        device.inputVideoDevices = initialDevice.inputVideoDevices;
        device.inputAudioDevices = initialDevice.inputAudioDevices;
        device.outputAudioDevices = initialDevice.outputAudioDevices;
        device.inputVideoDevice = initialDevice.inputVideoDevice;
        device.inputAudioDevice = initialDevice.inputAudioDevice;
        device.outputAudioDevice = initialDevice.outputAudioDevice;
        device.online = initialDevice.online;
        device.name = initialDevice.name ? initialDevice.name : "";
        device.userId = user._id;
        return device.save();
    }

    getDeviceByUserAndMac(user: User, mac: string): Promise<Device> {
        return DeviceModel.findOne({userId: user._id, mac: mac}).lean().exec();
    }

    getDevices(): Promise<Device[]> {
        return DeviceModel.find().lean().exec();
    }

    getDevicesByUser(user: User): Promise<Device[]> {
        return DeviceModel.find({userId: user._id}).lean().exec();
    }

    removeDevice(deviceId: DeviceId): Promise<Device> {
        return DeviceModel.findByIdAndRemove(deviceId).lean().exec();
    }

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device> {
        return DeviceModel.findByIdAndUpdate(deviceId, device).lean().exec();
    }

    generateGroupMembersByStage(stageId: StageId): Promise<Client.GroupMemberPrototype[]> {
        return Promise.resolve([]);
    }

    getActiveStageSnapshotByUser(user: User): Promise<Client.Stage> {
        return Promise.resolve(undefined);
    }

    getCustomGroupVolumesByUserAndStage(user: User, stageId: StageId): Promise<Client.CustomGroupVolume[]> {
        return Promise.resolve([]);
    }

    getCustomStageMemberVolumesByUserAndStage(user: User, stageId: StageId): Promise<Client.CustomStageMemberVolume[]> {
        return Promise.resolve([]);
    }

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]> {
        return GroupModel.find({stageId: stageId}).lean().exec();
    }

    getProducersByStage(stageId: StageId): Promise<Producer[]> {
        return this.getUsersWithActiveStage(stageId)
            .then(users => ProducerModel.find({userId: {$in: users.map(user => user._id)}}).lean().exec());
    }

    getStagesByUser(user: User): Promise<Client.StagePrototype[]> {
        return this.getManagedStages(user)
            .then(managedStages => {
                return StageMemberModel.find({userId: user._id}).lean().exec()
                    .then(stageMembers => {
                        return StageModel.find({_id: {$in: stageMembers.map(stageMember => stageMember.stageId)}}).lean().exec()
                            .then(stages => [...managedStages, ...stages]);
                    })
            });
    }

    setCustomStageMemberVolume(user: User, stageMemberId: StageMemberId, volume: number): Promise<Client.CustomStageMemberVolume> {
        return CustomStageMemberVolumeModel.findOneAndUpdate({
            userId: user._id,
            stageMemberId: stageMemberId,
        }, {volume: volume}, {
            upsert: true
        }).lean().exec();
    }

    updateStageMember(user: User, id: StageMemberId, groupMember: Partial<Client.StageMemberPrototype>): Promise<Client.StageMemberPrototype> {
        return StageMemberModel.findById(id).exec()
            .then(stageMember => {
                return StageModel.findOne({_id: stageMember.stageId, admins: user._id})
                    .then(() => stageMember.update(groupMember)
                        .then(() => stageMember.toObject()))
            });
    }

    createUserWithUid(uid: string, name: string, avatarUrl?: string): Promise<User> {
        const user = new UserModel();
        user.uid = uid;
        user.name = name;
        user.avatarUrl = avatarUrl;
        return user.save()
            .then(user => user.toObject());
    }

    getStage(stageId: StageId): Promise<Client.StagePrototype> {
        return StageModel.findById(stageId).lean().exec();
    }

    getManagedStages(user: User): Promise<Client.StagePrototype[]> {
        return StageModel.find({admins: user._id}).lean().exec();
    }

    getJoinedUsersOfStage(stageId: StageId): Promise<User[]> {
        return UserModel.find({stageId: stageId}).lean().exec();
    }

    getUser(id: string): Promise<User> {
        return UserModel.findById(id).lean().exec();
    }

    getUsersManagingStage(stageId: StageId): Promise<User[]> {
        return UserModel.find({managedStages: stageId}).lean().exec();
    }

    removeDevicesByServer(server: string): Promise<any> {
        return DeviceModel.remove({server: server}).exec();
    }

    isStageManager(user: User, stageId: string): Promise<boolean> {
        return StageModel.findOne({_id: stageId, admins: user._id}).exec().then(() => true).catch(() => false);
    }
}

export default MongoStageManager;