import {IStorage} from "../IStorage";
import {Mongoose} from "mongoose";
import * as mongoose from "mongoose";
import {
    CustomGroupVolumeModel,
    CustomStageMemberVolumeModel,
    DeviceModel,
    GroupModel,
    StageMemberModel,
    StageModel,
    UserModel
} from "./model.mongo";
import * as pino from "pino";
import {Device, DeviceId, GroupId, StageId, StageMemberId, User, UserId} from "../../model.common";
import Client from "../../model.client";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

const uri = "mongodb://127.0.0.1:4321/digitalstage";

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

    createStageMember(stageId: StageId, groupId: GroupId, userId: UserId): Promise<Client.StageMemberPrototype> {
        const stageMember = new StageMemberModel();
        stageMember.stageId = stageId;
        stageMember.groupId = groupId;
        stageMember.userId = userId;
        return stageMember.save();
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
        return device.save();
    }

    createGroup(adminUserId: UserId, stageId: StageId, name: string): Promise<Client.GroupPrototype> {
        return UserModel.findOne({_id: adminUserId, managedStages: stageId})
            .then(() => {
                const group = new GroupModel();
                group.stageId = stageId;
                group.name = name;
                return group.save();
            });
    }

    createStage(name: string, password: string | null, adminId: UserId): Promise<Client.StagePrototype> {
        const stage = new StageModel();
        stage.name = name;
        stage.password = password;
        return stage.save()
            .then(stage => UserModel.updateOne({_id: adminId}, {$push: {managedStages: stage._id}}));
    }

    createUser(uid: string, name: string, avatarUrl: string | null): Promise<User> {
        const user = new UserModel();
        user.uid = uid;
        user.name = name;
        user.avatarUrl = avatarUrl;
        user.stageId = null;
        user.managedStages = [];
        return user.save();
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

    getGroup(groupId: GroupId): Promise<Client.GroupPrototype> {
        return GroupModel.findById(groupId).lean().exec();
    }

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]> {
        return GroupModel.find({stageId: stageId}).lean().exec();
    }

    getManagedStageByUser(stageId: StageId, userId: UserId): Promise<Client.StagePrototype[]> {
        return UserModel.findById(userId).exec()
            .then(user => StageModel.find({_id: {$in: user.managedStages}}).lean().exec());
    }

    getStage(stageId: StageId): Promise<Client.StagePrototype> {
        return StageModel.findById(stageId).lean().exec();
    }

    getStageMembersByStage(stageId: StageId): Promise<Client.StageMemberPrototype[]> {
        return StageMemberModel.find({stageId: stageId}).lean().exec();
    }

    getStagesByUser(userId: UserId): Promise<Client.StagePrototype[]> {
        return StageMemberModel.find({userId: userId}).exec()
            .then(stageMembers => StageModel.find({_id: {$in: stageMembers.map(stageMember => stageMember.stageId)}}).lean().exec());
    }

    getUserByUid(uid: string): Promise<User> {
        return UserModel.findOne({uid: uid}).lean().exec();
    }

    removeDevice(deviceId: DeviceId): Promise<Device> {
        return DeviceModel.findOneAndRemove({_id: deviceId}).lean().exec()
    }

    removeGroup(groupId: GroupId): Promise<Client.GroupPrototype> {
        return GroupModel.findOneAndRemove({_id: groupId}).lean().exec()
    }

    removeStage(adminUserId: UserId, stageId: StageId): Promise<Client.StagePrototype> {
        return UserModel.findOne({_id: adminUserId, managedStages: stageId})
            .then(user => StageModel.findOneAndRemove({_id: stageId}).lean().exec());
    }

    removeStageMember(stageMemberId: StageMemberId): Promise<Client.StageMemberPrototype> {
        return StageMemberModel.findOneAndRemove({_id: stageMemberId}).lean().exec();
    }

    removeUserByUid(uid: string): Promise<User> {
        return UserModel.findOneAndRemove({uid: uid}).lean().exec();
    }

    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number): Promise<Client.CustomGroupVolume> {
        return CustomGroupVolumeModel.findOneAndUpdate({
            userId: userId,
            groupId: groupId
        }, {volume: volume}, {upsert: true}).lean().exec();
    }

    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number): Promise<Client.CustomStageMemberVolume> {
        return CustomStageMemberVolumeModel.findOneAndUpdate({
            userId: userId,
            stageMemberId: stageMemberId
        }, {volume: volume}, {upsert: true}).lean().exec();
    }

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device> {
        return DeviceModel.findByIdAndUpdate(deviceId, device).lean().exec();
    }

    updateGroup(adminUserId: UserId, groupId: GroupId, group: Partial<Omit<Client.GroupPrototype, "_id">>): Promise<Client.GroupPrototype> {
        return GroupModel.findById(groupId).lean().exec()
            .then(group => {
                // Now check if user has rights
                return UserModel.findOne({_id: adminUserId, managedStages: group.stageId}).exec()
                    .then(() => {
                        // User has rights
                        return GroupModel.deleteOne({_id: adminUserId}).exec()
                            .then(() => group);
                    })
            });
    }

    updateStage(adminUserId: UserId, stageId: StageId, stage: Partial<Omit<Client.StagePrototype, "_id">>): Promise<Client.StagePrototype> {
        return UserModel.findOne({_id: adminUserId, managedStages: stageId}).exec()
            .then(() => {
                // User has rights
                return StageModel.findByIdAndUpdate(stageId, stage).lean().exec()
            });
    }

    updateStageMember(adminUserId: UserId, stageMemberId: StageMemberId, stageMember: Partial<Omit<Client.StageMemberPrototype, "_id">>): Promise<Client.StageMemberPrototype> {
        return StageMemberModel.findById(stageMemberId).exec()
            .then(member => {
                return UserModel.findOne({_id: adminUserId, managedStages: member.stageId})
                    .then(() => {
                        // User has rights
                        return StageMemberModel.findByIdAndUpdate(stageMemberId, stageMember).lean().exec();
                    })
            });
    }

    updateUserByUid(uid: string, user: Partial<Omit<User, "_id">>): Promise<User> {
        return UserModel.findOneAndUpdate({uid: uid}, user).lean().exec();
    }
}