import {IStorage} from "../IStorage";
import {Device, DeviceId, GroupId, Producer, StageId, StageMemberId, UserId} from "../../model.common";
import Server from "../../model.server";
import Client from "../../model.client";
import * as mongoose from "mongoose";
import {Mongoose} from "mongoose";
import {
    CustomGroupVolumeModel,
    CustomStageMemberVolumeModel,
    DeviceModel,
    GroupModel,
    ProducerModel,
    StageMemberModel,
    StageModel,
    UserModel
} from "./model.mongo";
import * as pino from "pino";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

const uri = "mongodb://127.0.0.1:4321/digitalstage";

type PopulatedStageMember = Server.StageMember & {
    user: Server.User
};
type PopulatedGroup = Server.Group & {
    members: PopulatedStageMember[]
};
type PopulatedStage = Server.Stage & {
    admins: Server.User[],
    groups: PopulatedGroup[]
};

export class MongoStorage implements IStorage {
    private connection: Mongoose;

    async init(): Promise<any> {
        logger.info("[MONGOSTORAGE] Initializing mongo storage ...");
        return mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true})
            .then(connection => this.connection = connection)
            .then(() => this.attachWatchers())
            .then(() => logger.info("[MONGOSTORAGE] DONE initializing mongo storage."))
    }

    private attachWatchers() {
        DeviceModel.watch()
            .on('change', stream => {
                logger.debug(stream);
            });
        UserModel.watch()
            .on('change', stream => {
                logger.debug(stream);
            });
    }

    addStageMember(stageId: StageId, groupId: GroupId, userId: UserId): Promise<Server.StageMember> {
        const stageMember = new StageMemberModel();
        stageMember.stage = stageId;
        stageMember.group = groupId;
        stageMember.user = userId;
        return stageMember.save();
    }

    createGroup(stageId: StageId, name: string): Promise<Server.Group> {
        const group = new GroupModel();
        group.stageId = stageId;
        group.name = name;
        return group.save();
    }

    createStage(name: string, password: string | null, adminId: UserId): Promise<Server.Stage> {
        const stage = new StageModel();
        stage.name = name;
        stage.password = password;
        stage.admins = [adminId];
        return stage.save();
    }

    createUser(uid: string, name: string, avatarUrl: string | null): Promise<Server.User> {
        const user = new UserModel();
        user.uid = uid;
        user.name = name;
        user.avatarUrl = avatarUrl;
        user.lastStages = [];
        user.stage = null;
        return user.save();
    }

    generateStage(userId: UserId, stageId: StageId): Promise<Client.Stage> {
        return StageModel.findById(stageId)
            .populate("admins")
            .populate("groups")
            .exec()
            .then(
                async sStage => {
                    logger.debug(sStage);
                    const sAdmins: Server.User[] = sStage.admins as any;
                    const sGroups: Server.Group[] = sStage.groups as any;
                    // Fetch all stage members of this stage
                    const sStageMembers: Server.StageMember[] = await StageMemberModel.find({stageId: stageId}).populate("userId").exec();
                    // Fetch all producers inside this stage
                    const sProducers: Producer[] = await ProducerModel.find({userId: {$in: sStageMembers.map(sStageMember => sStageMember.user)}}).exec();
                    // Fetch all custom stage member volumes
                    const sCustomStageMemberVolumes: Server.CustomStageMemberVolume[] = await CustomStageMemberVolumeModel.find({
                        userId: userId,
                        stageMemberId: {$in: sStageMembers.map(sStageMember => sStageMember.user)}
                    }).exec();
                    // Fetch all custom group volumes
                    const sCustomGroupVolumes: Server.CustomGroupVolume[] = await CustomGroupVolumeModel.find({
                        userId: userId,
                        groupId: {$in: sGroups.map(sGroup => sGroup._id)}
                    }).exec();
                    const stage: Client.Stage = {
                        _id: sStage._id,
                        name: sStage.name,
                        password: sStage.password,
                        width: sStage.width,
                        length: sStage.length,
                        height: sStage.height,
                        absorption: sStage.absorption,
                        reflection: sStage.reflection,
                        groups: sGroups.map((sGroup): Client.Group => {
                            const customVolume: Server.CustomGroupVolume = sCustomGroupVolumes.find(sCustomGroupVolume => sCustomGroupVolume.groupId === sGroup._id);
                            return {
                                _id: sGroup._id,
                                name: sGroup.name,
                                volume: sGroup.volume,
                                customVolume: customVolume ? customVolume.volume : undefined,
                                members: sStageMembers.filter(sStageMember => sStageMember.group === sGroup._id).map(sStageMember => {
                                    const user: Server.User = sStageMember.user as any;
                                    const customVolume: Server.CustomStageMemberVolume = sCustomStageMemberVolumes.find(sCustomStageMemberVolume => sCustomStageMemberVolume.stageMemberId === sStageMember._id);
                                    return {
                                        _id: sStageMember._id,
                                        name: user.name,
                                        avatarUrl: user.avatarUrl,
                                        isDirector: sStageMember.isDirector,
                                        x: sStageMember.x,
                                        y: sStageMember.y,
                                        z: sStageMember.z,
                                        volume: sStageMember.volume,
                                        customVolume: customVolume ? customVolume.volume : undefined,
                                        videoProducer: sProducers.filter(sProducer => sProducer.userId === user._id),
                                        audioProducer: sProducers.filter(sProducer => sProducer.userId === user._id),
                                        ovProducer: sProducers.filter(sProducer => sProducer.userId === user._id),
                                    }
                                })
                            }
                        }),
                        admins: sAdmins.map(sAdmin => ({
                            _id: sAdmin._id,
                            name: sAdmin.name,
                            avatarUrl: sAdmin.avatarUrl
                        }))
                    };
                    return stage;
                }
            );
    }

    updateUserByUid(uid: string, user: Partial<Omit<Server.User, "_id">>): Promise<Server.User> {
        return UserModel.findOneAndUpdate({uid: uid}, user).exec();
    }

    getUserByUid(uid: UserId): Promise<Server.User> {
        return UserModel.findOne({uid: uid}).exec();
    }

    removeGroup(groupId: GroupId): Promise<Server.Group> {
        return GroupModel.findByIdAndDelete(groupId).exec();
    }

    removeStage(stageId: StageId): Promise<Server.Stage> {
        return StageModel.findByIdAndDelete(stageId).exec();
    }

    removeStageMember(stageMemberId: StageMemberId): Promise<Server.StageMember> {
        return StageMemberModel.findByIdAndDelete(stageMemberId).exec();
    }

    removeUserByUid(uid: string): Promise<Server.User> {
        return UserModel.findOneAndDelete({uid: uid}).exec();
    }

    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number): Promise<Server.CustomGroupVolume> {
        return CustomGroupVolumeModel.findOneAndUpdate({
            userId: userId,
            groupId: groupId
        }, {volume: volume}, {upsert: true}).exec();
    }

    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number): Promise<Server.CustomStageMemberVolume> {
        return CustomStageMemberVolumeModel.findOneAndUpdate({
            stageMemberId: stageMemberId,
            userId: userId
        }, {volume: volume}, {upsert: true}).exec();
    }

    setGroupVolume(groupId: GroupId, volume: number): Promise<Server.Group> {
        return GroupModel.findByIdAndUpdate(groupId, {volume: volume}).exec();
    }

    setStageMemberVolume(stageMemberId: StageMemberId, volume: number): Promise<Server.StageMember> {
        return StageMemberModel.findByIdAndUpdate(stageMemberId, {volume: volume}).exec();
    }

    updateGroup(groupId: GroupId, group: Partial<Omit<Server.Group, "_id">>): Promise<Server.Group> {
        return GroupModel.findByIdAndUpdate(groupId, group).exec();
    }

    updateStage(stageId: StageId, stage: Partial<Omit<Server.Stage, "_id">>): Promise<Server.Stage> {
        return StageModel.findByIdAndUpdate(stageId, stage).exec();
    }

    updateStageMember(stageMemberId: StageMemberId, stageMember: Partial<Omit<Server.StageMember, "_id">>): Promise<Server.StageMember> {
        return new Promise<Server.StageMember>((resolve, reject) => {
            StageMemberModel.findByIdAndUpdate(stageMemberId, stageMember, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
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
        device.videoProducer = [];
        device.audioProducer = [];
        device.ovProducer = [];
        return device.save();
    }

    getDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device> {
        return DeviceModel.findOne({userId: userId, mac: mac}).exec();
    }

    removeDevice(deviceId: DeviceId): Promise<Device> {
        return DeviceModel.findByIdAndDelete(deviceId).exec();
    }

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device> {
        return DeviceModel.findByIdAndUpdate(deviceId, device).exec();
    }

    getDevicesByUser(userId: UserId): Promise<Device[]> {
        return DeviceModel.find({userId: userId}).exec();
    }

    getDevices(): Promise<Device[]> {
        return DeviceModel.find().exec();
    }

    getStage(stageId: StageId): Promise<Server.Stage> {
        return StageModel.findById(stageId).exec();
    }

    getStageMembersByStage(stageId: StageId): Promise<Server.StageMember[]> {
        return StageMemberModel.find({stageId: stageId}).exec();
    }

    getStageMembersByUser(userId: UserId): Promise<Server.StageMember[]> {
        return StageMemberModel.find({userId: userId}).exec();
    }

    getManagedStagesByUser(userId: UserId): Promise<Server.Stage[]> {
        return StageModel.find({admins: userId}).exec();
    }

    getStagesByUser(userId: UserId): Promise<Server.Stage[]> {
        return this.getManagedStagesByUser(userId)
            .then(managedStages => {
                return this.getStageMembersByUser(userId)
                    .then(stageMembers => StageModel.find({'_id': {$in: stageMembers.map(stageMember => stageMember._id)}}).exec())
                    .then(stages => {
                        const filterdStages = stages.filter(stage => managedStages.find(managedStage => managedStage._id.toString() === stage._id.toString()));
                        return [...filterdStages, ...managedStages];
                    })
            });
    }

    getGroup(groupId: GroupId): Promise<Server.Group> {
        return GroupModel.findById(groupId).exec();
    }

    getGroupsByStage(stageId: StageId): Promise<Server.Group[]> {
        return GroupModel.find({stageId: stageId}).exec();
    }

    private transformPopulatedStageToStagePrototype = (stage: PopulatedStage): Client.StagePrototype => {
        return {
            _id: stage._id,
            name: stage.name,
            password: stage.password,
            width: stage.width,
            height: stage.height,
            length: stage.length,
            absorption: stage.absorption,
            reflection: stage.reflection,
            admins: stage.admins && stage.admins.map((admin: Server.User): Client.UserPrototype => ({
                _id: admin._id,
                name: admin.name,
                avatarUrl: admin.avatarUrl
            })),
            groups: stage.groups && stage.groups.map((group: PopulatedGroup): Client.GroupPrototype => ({
                _id: group._id,
                name: group.name,
                volume: group.volume,
                members: group.members.map((stageMember: PopulatedStageMember): Client.GroupMemberPrototype => ({
                    _id: stageMember.user._id,
                    name: stageMember.user.name,
                    avatarUrl: stageMember.user.avatarUrl,
                    isDirector: stageMember.isDirector,
                    volume: stageMember.volume,
                    x: stageMember.x,
                    y: stageMember.y,
                    z: stageMember.z
                }))
            }))
        };
    };

    getStagePrototype(stageId: StageId): Promise<Client.StagePrototype> {
        return this.getStagePrototypes([stageId])
            .then(stages => stages.length > 0 ? stages[0] : undefined);
    }

    getStagePrototypes(stageIds: StageId[]): Promise<Client.StagePrototype[]> {
        if (stageIds.length > 0) {
            if (stageIds.length === 1) {
                return StageModel.findById(stageIds[0])
                    .populate("admins")
                    .populate("groups")
                    .populate("groups.members")
                    .populate("groups.members.user")
                    .exec()
                    .then((stage: any) => [this.transformPopulatedStageToStagePrototype(stage)]);
            } else {
                return StageModel.find({"_id": {$in: stageIds}})
                    .populate("admins")
                    .populate("groups")
                    .populate("groups.members")
                    .populate("groups.members.user")
                    .exec()
                    .then((stages: any) => stages.map(stage => this.transformPopulatedStageToStagePrototype(stage)));
            }
        }
        return new Promise<Client.StagePrototype[]>(resolve => resolve([]));
    }
}