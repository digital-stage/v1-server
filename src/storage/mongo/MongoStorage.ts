import {IStorage} from "../IStorage";
import {Device, DeviceId, GroupId, StageId, StageMemberId, UserId} from "../../model.common";
import Server from "../../model.server";
import Client from "../../model.client";
import * as mongoose from "mongoose";
import {Mongoose} from "mongoose";
import {
    CustomGroupVolumeModel,
    CustomStageMemberVolumeModel,
    DeviceModel,
    GroupModel, ProducerModel,
    StageMemberModel,
    StageModel,
    UserModel
} from "./model.mongo";
import CustomGroupVolume = Server.CustomGroupVolume;

const uri = "mongodb://127.0.0.1:4321/digitalstage";

export class MongoStorage implements IStorage {
    private connection: Mongoose;

    async init(): Promise<any> {
        return mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true})
            .then(connection => this.connection = connection)
            .then(() => this.attachWatchers());
    }

    private attachWatchers() {
        DeviceModel.watch()
            .on('change', stream => {
                console.log(stream);
            });
        UserModel.watch()
            .on('change', stream => {
                console.log(stream);
            });
    }

    addStageMember(stageId: StageId, groupId: GroupId, userId: UserId): Promise<Server.StageMember> {
        const stageMember = new StageMemberModel();
        stageMember.stageId = stageId;
        stageMember.groupId = groupId;
        stageMember.userId = userId;
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
        user.lastStageIds = [];
        user.stageId = null;
        return user.save();
    }

    generateStage(userId: UserId, stageId: StageId): Promise<Client.Stage> {
        return StageModel.findById(stageId)
            .populate("admins")
            .populate("groups")
            .exec()
            .then(
                async sStage => {
                    console.log(sStage);
                    const sAdmins: Server.User[] = sStage.admins as any;
                    const sGroups: Server.Group[] = sStage.groups as any;
                    // Fetch all stage members of this stage
                    const sStageMembers: Server.StageMember[] = await StageMemberModel.find({stageId: stageId}).populate("userId").exec();
                    // Fetch all producers inside this stage
                    const sProducers: Server.Producer[] = await ProducerModel.find({userId: {$in: sStageMembers.map(sStageMember => sStageMember.userId)}}).exec();
                    // Fetch all custom stage member volumes
                    const sCustomStageMemberVolumes: Server.CustomStageMemberVolume[] = await CustomStageMemberVolumeModel.find({
                        userId: userId,
                        stageMemberId: {$in: sStageMembers.map(sStageMember => sStageMember.userId)}
                    }).exec();
                    // Fetch all custom group volumes
                    const sCustomGroupVolumes: Server.CustomGroupVolume[] = await CustomGroupVolumeModel.find({
                        userId: userId,
                        groupId: {$in: sGroups.map(sGroup => sGroup._id)}
                    }).exec();
                    const stage: Client.Stage = {
                        _id: sStage._id,
                        name: sStage.name,
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
                                members: sStageMembers.filter(sStageMember => sStageMember.groupId === sGroup._id).map(sStageMember => {
                                    const user: Server.User = sStageMember.userId as any;
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
        return new Promise<Server.User>((resolve, reject) => {
            UserModel.findOneAndUpdate({uid: uid}, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            }, {});
        });
    }

    getUserByUid(uid: UserId): Promise<Server.User> {
        return new Promise<Server.User>((resolve, reject) => {
            UserModel.findOne({uid: uid}, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            }, {});
        });
    }


    removeGroup(groupId: GroupId): Promise<Server.Group> {
        return new Promise<Server.Group>((resolve, reject) => {
            GroupModel.findByIdAndDelete(groupId, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    removeStage(stageId: StageId): Promise<Server.Stage> {
        return new Promise<Server.Stage>((resolve, reject) => {
            StageModel.findByIdAndDelete(stageId, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    removeStageMember(stageMemberId: StageMemberId): Promise<Server.StageMember> {
        return new Promise<Server.StageMember>((resolve, reject) => {
            StageMemberModel.findByIdAndDelete(stageMemberId, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    removeUserByUid(uid: string): Promise<Server.User> {
        return new Promise<Server.User>((resolve, reject) => {
            UserModel.findOneAndDelete({uid: uid}, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number): Promise<Server.CustomGroupVolume> {
        return new Promise<Server.CustomGroupVolume>((resolve, reject) => {
            CustomGroupVolumeModel.findOneAndUpdate({
                userId: userId,
                groupId: groupId
            }, {volume: volume}, {upsert: true}, (err, res) => {
                if (err)
                    reject(err);
                resolve(res);
            });
        });
    }

    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number): Promise<Server.CustomStageMemberVolume> {
        return new Promise<Server.CustomStageMemberVolume>((resolve, reject) => {
            CustomStageMemberVolumeModel.findOneAndUpdate({
                stageMemberId: stageMemberId,
                userId: userId
            }, {volume: volume}, {upsert: true}, (err, res) => {
                if (err)
                    reject(err);
                resolve(res);
            });
        });
    }

    setGroupVolume(groupId: GroupId, volume: number): Promise<Server.Group> {
        return new Promise<Server.Group>((resolve, reject) => {
            GroupModel.findByIdAndUpdate(groupId, {volume: volume}, (err, res) => {
                if (err)
                    reject(err);
                resolve(res);
            });
        });
    }

    setStageMemberVolume(stageMemberId: StageMemberId, volume: number): Promise<Server.StageMember> {
        return new Promise<Server.StageMember>((resolve, reject) => {
            StageMemberModel.findByIdAndUpdate(stageMemberId, {volume: volume}, (err, res) => {
                if (err)
                    reject(err);
                resolve(res);
            });
        });
    }

    updateGroup(groupId: GroupId, group: Partial<Omit<Server.Group, "_id">>): Promise<Server.Group> {
        return new Promise<Server.Group>((resolve, reject) => {
            GroupModel.findByIdAndUpdate(groupId, group, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    updateStage(stageId: StageId, stage: Partial<Omit<Server.Stage, "_id">>): Promise<Server.Stage> {
        return new Promise<Server.Stage>((resolve, reject) => {
            StageModel.findByIdAndUpdate(stageId, stage, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
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
        return new Promise<Device>((resolve, reject) => {
            DeviceModel.findOne({userId: userId, mac: mac}, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    removeDevice(deviceId: DeviceId): Promise<Device> {
        return new Promise<Device>((resolve, reject) => {
            DeviceModel.findByIdAndDelete(deviceId, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device> {
        return new Promise<Device>((resolve, reject) => {
            DeviceModel.findByIdAndUpdate(deviceId, device, (err, res) => {
                if (err) {
                    reject(err);
                }
                console.log("RES IS:");
                console.log(res);
                resolve({...res, ...device});
            });
        });
    }

}