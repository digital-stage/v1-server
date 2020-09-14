"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const model_mongo_1 = require("./model.mongo");
const SocketServer_1 = require("../../socket/SocketServer");
const pino = require("pino");
const mongoose = require("mongoose");
const events_1 = require("../../events");
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const uri = "mongodb://127.0.0.1:4321/digitalstage";
const USE_WATCHER = false;
class MongoStageManager {
    constructor() {
        this.initialized = false;
    }
    init() {
        if (!this.initialized) {
            this.initialized = true;
            logger.info("[MONGOSTORAGE] Initializing mongo storage ...");
            return mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false
            })
                .then(() => this.attachWatchers())
                .then(() => logger.info("[MONGOSTORAGE] DONE initializing mongo storage."));
        }
    }
    attachWatchers() {
        if (USE_WATCHER) {
            model_mongo_1.DeviceModel.watch()
                .on('change', (stream) => {
                console.log(stream);
                const device = stream.fullDocument;
                switch (stream.operationType) {
                    case "insert":
                        SocketServer_1.default.sendToUser(device.userId, events_1.ServerDeviceEvents.DEVICE_ADDED, device);
                        break;
                    case "update":
                        SocketServer_1.default.sendToUser(device.userId, events_1.ServerDeviceEvents.DEVICE_CHANGED, device);
                        break;
                    case "delete":
                        SocketServer_1.default.sendToUser(device.userId, events_1.ServerDeviceEvents.DEVICE_REMOVED, device._id);
                        break;
                }
            });
        }
    }
    addGroup(user, stageId, name) {
        return model_mongo_1.StageModel.findOne({ _id: stageId, admins: user._id })
            .then(() => {
            const group = new model_mongo_1.GroupModel();
            group.stageId = stageId;
            group.name = name;
            return group.save();
        });
    }
    addProducer(user, device, kind, routerId) {
        const producer = new model_mongo_1.ProducerModel();
        producer.userId = user._id;
        producer.deviceId = device._id;
        producer.kind = kind;
        producer.routerId = routerId;
        return producer.save();
    }
    createStage(user, name, password) {
        console.log("Creating stage");
        const stage = new model_mongo_1.StageModel();
        stage.name = name;
        stage.password = password;
        return stage.save()
            .then(() => {
            console.log("Stage is:");
            console.log(stage);
            return model_mongo_1.UserModel.findByIdAndUpdate(user._id, { $push: { managedStages: stage._id } }).exec()
                .then(() => stage);
        });
    }
    getStageSnapshotByUser(user) {
        if (user.stageId) {
            return model_mongo_1.StageModel.findById(user.stageId).lean().exec()
                .then((stage) => __awaiter(this, void 0, void 0, function* () {
                // We need all producers of this stage
                // Since producers are not connected to a stage, first get all active users
                const users = yield this.getUsersWithActiveStage(stage._id);
                const producers = yield model_mongo_1.ProducerModel.find({ userId: { $in: users.map(user => user._id) } }).exec();
                // Now get all groups and members
                const groups = yield this.getGroupsByStage(stage._id);
                const groupMembers = yield this.generateGroupMembersByStage(stage._id);
                // Also get all custom group and group member volumes
                const customGroupVolumes = yield model_mongo_1.CustomGroupVolumeModel.find({
                    userId: user._id,
                    stageId: stage._id
                }).exec();
                const customGroupMemberVolumes = yield model_mongo_1.CustomStageMemberVolumeModel.find({
                    userId: user._id,
                    stageId: stage._id
                }).exec();
                const stageSnapshot = Object.assign(Object.assign({}, stage), { groups: groups.map(group => (Object.assign(Object.assign({}, group), { customVolume: customGroupVolumes.find(v => v.groupId === group._id).volume, members: groupMembers.map(groupMember => (Object.assign(Object.assign({}, groupMember), { customVolume: customGroupMemberVolumes.find(v => v.stageMemberId === groupMember._id).volume, audioProducers: producers.filter(p => p.kind === "audio" && p.userId === groupMember.userId), videoProducers: producers.filter(p => p.kind === "video" && p.userId === groupMember.userId), ovProducers: producers.filter(p => p.kind === "ov" && p.userId === groupMember.userId) }))) }))) });
                return stageSnapshot;
            }));
        }
        return null;
    }
    getUserByUid(uid) {
        return model_mongo_1.UserModel.findOne({ uid: uid }).lean().exec();
    }
    getUsersByStage(stageId) {
        return model_mongo_1.StageMemberModel.find({ stageId: stageId }).exec()
            .then(stageMembers => {
            return model_mongo_1.UserModel.find({
                $or: [
                    { managedStages: stageId },
                    { stage: stageId },
                    {
                        stageMembers: {
                            $in: stageMembers.map(stageMember => stageMember._id)
                        }
                    }
                ]
            }).lean().exec();
        });
    }
    getUsersWithActiveStage(stageId) {
        return model_mongo_1.UserModel.find({ stageId: stageId }).lean().exec();
    }
    joinStage(user, stageId, groupId, password) {
        return model_mongo_1.StageModel.findById(stageId).lean().exec()
            .then(stage => {
            if (stage.password && stage.password !== password) {
                throw new Error("Invalid password");
            }
            else {
                const stageMember = new model_mongo_1.StageMemberModel();
                stageMember.userId = user._id;
                stageMember.stageId = stageId;
                stageMember.groupId = groupId;
                stageMember.volume = 1;
                return stageMember.save()
                    .then(() => {
                    SocketServer_1.default.sendToUser(user._id, events_1.ServerStageEvents.STAGE_JOINED, stageId);
                    return Object.assign(Object.assign({}, stageMember.toObject()), { name: user.name, avatarUrl: user.avatarUrl });
                });
            }
        });
    }
    leaveStage(user) {
        return model_mongo_1.UserModel.findByIdAndUpdate(user._id, {
            stageId: undefined
        }).exec()
            .then(() => true)
            .catch(() => false);
    }
    removeGroup(user, groupId) {
        return model_mongo_1.GroupModel.findById(groupId)
            .exec()
            .then(group => model_mongo_1.UserModel.findById(user._id).exec()
            .then(user => {
            if (user.managedStages.indexOf(group.stageId) !== -1) {
                return group.deleteOne()
                    .then(() => group);
            }
        }));
    }
    removeProducer(device, producerId) {
        return model_mongo_1.ProducerModel.findOneAndRemove({
            _id: producerId,
            deviceId: device._id,
        }).lean().exec();
    }
    removeStage(user, stageId) {
        logger.debug("[MONGO MANAGER] removeStage(" + user.name + ", " + stageId + ")");
        return model_mongo_1.StageModel.findOneAndRemove({
            _id: stageId,
            admins: user._id,
        }).lean().exec();
    }
    setCustomGroupVolume(user, groupId, volume) {
        return model_mongo_1.CustomGroupVolumeModel.findOneAndUpdate({
            userId: user._id,
            groupId: groupId,
        }, { volume: volume }, {
            upsert: true
        }).lean().exec();
    }
    updateGroup(user, groupId, group) {
        return model_mongo_1.GroupModel.findOne({
            _id: groupId,
        }).exec()
            .then(group => model_mongo_1.UserModel.findById(user._id)
            .then(user => {
            if (user.managedStages.indexOf(group.stageId) !== -1)
                return group.remove()
                    .then(() => group.toObject());
            throw new Error("Not allowed");
        }));
    }
    updateProducer(device, producerId, producer) {
        return model_mongo_1.ProducerModel.findOneAndUpdate({ _id: producerId, deviceId: device._id }, producer)
            .lean().exec();
    }
    updateStage(user, stageId, stage) {
        return model_mongo_1.StageModel.findOneAndUpdate({ _id: stageId, admins: user._id }, stage)
            .lean().exec();
    }
    createDevice(user, server, initialDevice) {
        const device = new model_mongo_1.DeviceModel();
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
    getDeviceByUserAndMac(user, mac) {
        return model_mongo_1.DeviceModel.findOne({ userId: user._id, mac: mac }).lean().exec();
    }
    getDevices() {
        return model_mongo_1.DeviceModel.find().lean().exec();
    }
    getDevicesByUser(user) {
        return model_mongo_1.DeviceModel.find({ userId: user._id }).lean().exec();
    }
    removeDevice(deviceId) {
        return model_mongo_1.DeviceModel.findByIdAndRemove(deviceId).lean().exec();
    }
    updateDevice(deviceId, device) {
        return model_mongo_1.DeviceModel.findByIdAndUpdate(deviceId, device).lean().exec();
    }
    generateGroupMembersByStage(stageId) {
        return Promise.resolve([]);
    }
    getActiveStageSnapshotByUser(user) {
        return Promise.resolve(undefined);
    }
    getCustomGroupVolumesByUserAndStage(user, stageId) {
        return Promise.resolve([]);
    }
    getCustomStageMemberVolumesByUserAndStage(user, stageId) {
        return Promise.resolve([]);
    }
    getGroupsByStage(stageId) {
        return model_mongo_1.GroupModel.find({ stageId: stageId }).lean().exec();
    }
    getProducersByStage(stageId) {
        return this.getUsersWithActiveStage(stageId)
            .then(users => model_mongo_1.ProducerModel.find({ userId: { $in: users.map(user => user._id) } }).lean().exec());
    }
    getStagesByUser(user) {
        return this.getManagedStages(user)
            .then(managedStages => {
            return model_mongo_1.StageMemberModel.find({ userId: user._id }).lean().exec()
                .then(stageMembers => {
                return model_mongo_1.StageModel.find({ _id: { $in: stageMembers.map(stageMember => stageMember.stageId) } }).lean().exec()
                    .then(stages => [...managedStages, ...stages]);
            });
        });
    }
    setCustomStageMemberVolume(user, stageMemberId, volume) {
        return model_mongo_1.CustomStageMemberVolumeModel.findOneAndUpdate({
            userId: user._id,
            stageMemberId: stageMemberId,
        }, { volume: volume }, {
            upsert: true
        }).lean().exec();
    }
    updateStageMember(user, id, groupMember) {
        return model_mongo_1.StageMemberModel.findById(id).exec()
            .then(stageMember => model_mongo_1.UserModel.findById(user._id).lean().exec()
            .then(user => {
            if (user.managedStages.indexOf(stageMember.stageId) !== -1) {
                return stageMember.update(groupMember)
                    .then(() => stageMember.toObject());
            }
            throw new Error("Not allowed");
        }));
    }
    createUserWithUid(uid, name, avatarUrl) {
        const user = new model_mongo_1.UserModel();
        user.uid = uid;
        user.name = name;
        user.avatarUrl = avatarUrl;
        return user.save()
            .then(user => user.toObject());
    }
    getStage(stageId) {
        return model_mongo_1.StageModel.findById(stageId).lean().exec();
    }
    getManagedStages(user) {
        return this.getUser(user._id)
            .then(user => model_mongo_1.StageModel.find({ _id: { $in: user.managedStages } }).lean().exec());
    }
    getJoinedUsersOfStage(stageId) {
        return model_mongo_1.UserModel.find({ stageId: stageId }).lean().exec();
    }
    getUser(id) {
        return model_mongo_1.UserModel.findById(id).lean().exec();
    }
    getUsersManagingStage(stageId) {
        return model_mongo_1.UserModel.find({ managedStages: stageId }).lean().exec();
    }
    removeDevicesByServer(server) {
        return model_mongo_1.DeviceModel.remove({ server: server }).exec();
    }
}
exports.default = MongoStageManager;
//# sourceMappingURL=MongoStageManager.js.map