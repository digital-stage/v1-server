import * as mongoose from "mongoose";
import {Device, Producer, Router, User} from "../../model.common";
import Client from "../../model.client";
import * as pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});


const StageSchema = new mongoose.Schema({
    name: {type: String},
    password: {type: String},

    admins: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],

    // 3D Room specific
    width: {type: Number},
    length: {type: Number},
    height: {type: Number},
    absorption: {type: Number},
    reflection: {type: Number},
});
type StageType = Client.StagePrototype & mongoose.Document;
const OnStageRemoved = (stage: StageType) => {
    logger.debug("[MONGO MODEL] Performing delete hook for stage " + stage._id + ": " + stage.name);
    return Promise.all([
        mongoose.model('Group').deleteMany({stageId: stage._id}).exec(),
        mongoose.model('StageMember').deleteMany({stageId: stage._id}).exec(),
        mongoose.model('User').updateMany({stage: stage._id}, {stageId: null}).exec(),
    ]);
}
StageSchema.post('remove', OnStageRemoved);
StageSchema.post('findOneAndRemove', OnStageRemoved);
export const StageModel = mongoose.model<StageType>('Stage', StageSchema);


const GroupSchema = new mongoose.Schema({
    name: {type: String},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},

    volume: {type: Number}
});
export type GroupType = Client.GroupPrototype & mongoose.Document;
const OnGroupRemoved = (group: GroupType) => {
    logger.debug("[MONGO MODEL] Performing delete hook for group " + group._id + ": " + group.name);
    return Promise.all([
        mongoose.model('CustomGroupVolume').deleteMany({groupId: group._id}).exec(),
        mongoose.model('StageMember').deleteMany({groupId: group._id}).exec()
    ])
};
GroupSchema.post('remove', OnGroupRemoved);
GroupSchema.post('findOneAndRemove', OnGroupRemoved);
export const GroupModel = mongoose.model<GroupType>('Group', GroupSchema);


const CustomGroupVolumeSchema = new mongoose.Schema({
    groupId: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    volume: {type: Number}
});
CustomGroupVolumeSchema.index({groupId: 1, userId: 1}, {unique: true});
type CustomGroupVolumeType = Client.CustomGroupVolume & mongoose.Document;
export const CustomGroupVolumeModel = mongoose.model<CustomGroupVolumeType>('CustomGroupVolume', CustomGroupVolumeSchema);


const StageMemberSchema = new mongoose.Schema({
    name: {type: String},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},
    groupId: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},

    isDirector: {type: Boolean},

    volume: {type: Number},
    x: {type: Number},
    y: {type: Number},
    z: {type: Number},
});
type StageMemberType = Client.StageMemberPrototype & mongoose.Document;
const OnStageMemberRemoved = (stageMember: StageMemberType) => {
    logger.debug("[MONGO MODEL] Performing delete hook for stage member " + stageMember._id + " for user " + stageMember.userId);
    return Promise.all([
        mongoose.model('User').updateMany({stageMembers: stageMember._id}, {$pull: {stageMembers: stageMember._id}}).exec(),
        mongoose.model('CustomStageMemberVolume').deleteMany({stageMemberId: stageMember._id}).exec()
    ])
};
StageMemberSchema.post('remove', OnStageMemberRemoved);
StageMemberSchema.post('findOneAndRemove', OnStageMemberRemoved);
StageMemberSchema.index({userId: 1, stageId: 1}, {unique: true});
export const StageMemberModel = mongoose.model<StageMemberType>('StageMember', StageMemberSchema);


const CustomStageMemberVolumeSchema = new mongoose.Schema({
    stageMemberId: {type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    volume: {type: Number}
});
CustomStageMemberVolumeSchema.index({stageMemberId: 1, userId: 1}, {unique: true});
type CustomStageMemberVolumeType = Client.CustomStageMemberVolume & mongoose.Document;
export const CustomStageMemberVolumeModel = mongoose.model<CustomStageMemberVolumeType>('CustomStageMemberVolume', CustomStageMemberVolumeSchema);


const UserSchema = new mongoose.Schema({
    uid: {type: String, index: true},
    name: {type: String, required: true, unique: true, index: true},
    avatarUrl: {type: String},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},

    stageMemberId: {type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'},

    //stageMembers: [{type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'}]
}, {timestamps: true});
export type UserType = User & mongoose.Document;
const OnUserRemoved = (user: UserType) => {
    logger.debug("[MONGO MODEL] Performing delete hook for user " + user._id + ":" + user.name);
    return Promise.all([
        mongoose.model('Device').deleteMany({userId: user._id}).exec(),
        mongoose.model('StageMember').deleteMany({userId: user._id}).exec(),
        mongoose.model('Stage').deleteMany({$and: [{admins: user._id}, {admins: {$size: 1}}]}).exec()
    ]);
};
UserSchema.post('remove', OnUserRemoved);
UserSchema.post('findOneAndRemove', OnUserRemoved);
export const UserModel = mongoose.model<UserType>('User', UserSchema);

const DeviceSchema = new mongoose.Schema({
    name: {type: String},
    mac: {type: String},
    online: {type: Boolean},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    canAudio: {type: Boolean},
    canVideo: {type: Boolean},
    sendAudio: {type: Boolean},
    sendVideo: {type: Boolean},
    receiveAudio: {type: Boolean},
    receiveVideo: {type: Boolean},
    inputAudioDevices: [{
        id: {type: String},
        label: {type: String}
    }],
    inputVideoDevices: [{
        id: {type: String},
        label: {type: String}
    }],
    outputAudioDevices: [{
        id: {type: String},
        label: {type: String}
    }],
    inputVideoDevice: {type: String},
    inputAudioDevice: {type: String},
    outputAudioDevice: {type: String},
    audioProducers: [{type: mongoose.Schema.Types.ObjectId, ref: 'Producer'}],
    videoProducers: [{type: mongoose.Schema.Types.ObjectId, ref: 'Producer'}],
    ovProducers: [{type: mongoose.Schema.Types.ObjectId, ref: 'Producer'}],

    server: {type: String},
}, {timestamps: true});
DeviceSchema.index("mac", {
    unique: true,
    partialFilterExpression: {
        "mac": {
            $type: "string"
        }
    }
});
export type DeviceType = Device & mongoose.Document;
const OnDeviceRemoved = (device: DeviceType) => {
    logger.debug("[MONGO MODEL] Performing delete hook for device " + device._id + ":" + device.name);
    return Promise.all([
        mongoose.model('Producer').deleteMany({deviceId: device._id}).exec()
    ]);
};
DeviceSchema.post('remove', OnDeviceRemoved);
DeviceSchema.post('findOneAndRemove', OnDeviceRemoved);
export const DeviceModel = mongoose.model<DeviceType>('Device', DeviceSchema);

const ProducerSchema = new mongoose.Schema({
    name: {type: String},
    avatarUrl: {type: String},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    deviceId: {type: mongoose.Schema.Types.ObjectId, ref: 'Device'},
    kind: {type: String},
    routerId: {type: mongoose.Schema.Types.ObjectId, ref: 'Router'},
}, {timestamps: true});
type ProducerType = Producer & mongoose.Document;
export const ProducerModel = mongoose.model<ProducerType>('Producer', ProducerSchema);


const RouterSchema = new mongoose.Schema({
    name: {type: String},
    ipv4: {type: String},
    ipv6: {type: String},
    port: {type: Number},
}, {timestamps: true});
type RouterType = Router & mongoose.Document;
const OnRouterRemoved = (router: RouterType) => {
    logger.debug("[MONGO MODEL] Performing delete hook for router " + router._id + ":" + router.ipv4);
    return Promise.all([
        mongoose.model('Producer').deleteMany({routerId: router._id}).exec()
    ]);
};
RouterSchema.post('remove', OnRouterRemoved);
RouterSchema.post('findOneAndRemove', OnRouterRemoved);
export const RouterModel = mongoose.model<RouterType>('Router', RouterSchema);