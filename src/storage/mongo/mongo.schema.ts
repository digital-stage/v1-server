import * as mongoose from "mongoose";

export const StageSchema = new mongoose.Schema({
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
export const GroupSchema = new mongoose.Schema({
    name: {type: String},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},

    volume: {type: Number}
});
export const CustomGroupVolumeSchema = new mongoose.Schema({
    groupId: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    volume: {type: Number}
});
CustomGroupVolumeSchema.index({groupId: 1, userId: 1}, {unique: true});
export const StageMemberSchema = new mongoose.Schema({
    name: {type: String},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},
    groupId: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},

    online: {type: Boolean},

    isDirector: {type: Boolean},

    volume: {type: Number},
    x: {type: Number},
    y: {type: Number},
    z: {type: Number},
});
StageMemberSchema.index({userId: 1, stageId: 1}, {unique: true});
export const CustomStageMemberVolumeSchema = new mongoose.Schema({
    stageMemberId: {type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    volume: {type: Number}
});
CustomStageMemberVolumeSchema.index({stageMemberId: 1, userId: 1}, {unique: true});
export const UserSchema = new mongoose.Schema({
    uid: {type: String, index: true},
    name: {type: String, required: true, unique: true, index: true},
    avatarUrl: {type: String},
    stageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Stage'},

    stageMemberId: {type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'},

    //stageMembers: [{type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'}]
}, {timestamps: true});
export const DeviceSchema = new mongoose.Schema({
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
export const ProducerSchema = new mongoose.Schema({
    name: {type: String},
    avatarUrl: {type: String},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    deviceId: {type: mongoose.Schema.Types.ObjectId, ref: 'Device'},
    stageMemberId: {type: mongoose.Schema.Types.ObjectId, ref: 'StageMember'},
    kind: {type: String},
    routerId: {type: mongoose.Schema.Types.ObjectId, ref: 'Router'},
}, {timestamps: true});
export const RouterSchema = new mongoose.Schema({
    name: {type: String},
    ipv4: {type: String},
    ipv6: {type: String},
    port: {type: Number},
}, {timestamps: true});