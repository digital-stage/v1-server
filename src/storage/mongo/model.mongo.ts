import * as mongoose from "mongoose";
import {Device, Producer, Router, User} from "../../model.common";
import Client from "../../model.client";

const StageSchema = new mongoose.Schema({
    name: {type: String},
    password: {type: String},

    // 3D Room specific
    width: {type: Number},
    length: {type: Number},
    height: {type: Number},
    absorption: {type: Number},
    reflection: {type: Number},
});
type StageType = Client.StagePrototype & mongoose.Document;

StageSchema.pre('deleteOne', function (next) {
    mongoose.model("Group").deleteMany({'stageId': this["_id"]}, (err) => {
        if (err) {
            console.log(`[error] ${err}`);
            next(err);
        } else {
            console.log('success');
            next();
        }
    });
    mongoose.model("StageMember").deleteMany({'stageId': this["_id"]}, err => {
        if (err) {
            console.log(`[error] ${err}`);
            next(err);
        } else {
            console.log('success');
            next();
        }
    });
});
StageSchema.pre('deleteMany', function (next) {
    console.log("StageSchema deleteMany hook: " + this["_id"]);
    mongoose.model('Group').deleteMany({stageId: this["_id"]}, next);
    mongoose.model('StageMember').deleteMany({stageId: this["_id"]}, next);
    mongoose.model('User').updateMany({stageId: this["_id"]}, {stageId: null}, next);
    mongoose.model('User').updateMany({lastStageIds: this["_id"]}, {$pull: {lastStageIds: this["_id"]}}, next);
});
export const StageModel = mongoose.model<StageType>('Stage', StageSchema);


const GroupSchema = new mongoose.Schema({
    name: {type: String},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},
    //members: [{type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'}],

    volume: {type: Number}
});
GroupSchema.pre('deleteMany', function (next) {
    console.log("GroupSchema deleteMany hook: " + this["_id"]);
    mongoose.model('CustomGroupVolume').deleteMany({groupId: this["_id"]}, next);
    mongoose.model('StageMember').deleteMany({groupId: this["_id"]}, next);
});
type GroupType = Client.GroupPrototype & mongoose.Document;
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
StageMemberSchema.pre('deleteMany', function (next) {
    console.log("StageMemberSchema deleteMany hook: " + this["_id"]);
    mongoose.model('CustomStageMemberVolume').deleteMany({stageMemberId: this["_id"]}, next);
});
StageMemberSchema.index({userId: 1, stageId: 1}, {unique: true});
type StageMemberType = Client.StageMemberPrototype & mongoose.Document;
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
    name: {type: String},
    avatarUrl: {type: String},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},
    managedStages: [{type: mongoose.Schema.Types.ObjectId, ref: 'Stage'}]
}, {timestamps: true});
UserSchema.pre('deleteMany', function (next) {
    console.log("UserSchema deleteMany hook: " + this["_id"]);
    mongoose.model('Device').deleteMany({userId: this["_id"]}, next);
    mongoose.model('StageMember').deleteMany({userId: this["_id"]}, next);
});
type UserType = User & mongoose.Document;
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
    ovProducers: [{type: mongoose.Schema.Types.ObjectId, ref: 'Producer'}]
}, {timestamps: true});
DeviceSchema.index("mac", {
    unique: true,
    partialFilterExpression: {
        "mac": {
            $type: "string"
        }
    }
});
DeviceSchema.pre('deleteMany', function (next) {
    console.log("DeviceSchema deleteMany hook: " + this["_id"]);
    mongoose.model('Producer').deleteMany({deviceId: this["_id"]}, next);
});
export type DeviceType = Device & mongoose.Document;
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
RouterSchema.pre('deleteMany', function (next) {
    console.log("RouterSchema deleteMany hook: " + this["_id"]);
    mongoose.model('Producer').deleteMany({routerId: this["_id"]}, next);
});
type RouterType = Router & mongoose.Document;
export const RouterModel = mongoose.model<RouterType>('Router', RouterSchema);