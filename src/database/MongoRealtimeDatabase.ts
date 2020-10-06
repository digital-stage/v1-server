import {Db, MongoClient, ObjectId} from "mongodb";
import {
    CustomGroup,
    CustomGroupId,
    CustomStageMember,
    CustomStageMemberId,
    Device,
    DeviceId,
    GlobalAudioProducer,
    Group,
    GroupId,
    SoundCard,
    GlobalVideoProducer,
    SoundCardId,
    Stage,
    StageId,
    StageMember,
    StageMemberAudioProducer,
    StageMemberId,
    StageMemberOvTrack,
    StageMemberVideoProducer,
    Track,
    TrackId,
    TrackPreset,
    TrackPresetId,
    User,
    UserId,
    GlobalAudioProducerId,
    GlobalVideoProducerId,
    StageMemberVideoProducerId,
    StageMemberAudioProducerId,
    StageMemberOvTrackId, CustomStageMemberOvTrack, CustomStageMemberAudioProducer
} from "../model.server";
import {ServerDeviceEvents, ServerStageEvents} from "../events";
import * as socketIO from "socket.io";
import {Set} from "immutable";
import * as pino from "pino";
import {IRealtimeDatabase} from "./IRealtimeDatabase";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

enum Collections {
    USERS = "users",

    DEVICES = "devices",
    SOUND_CARDS = "soundcards",
    TRACK_PRESETS = "trackpresets",
    TRACKS = "tracks",
    AUDIO_PRODUCERS = "audioproducers",
    VIDEO_PRODUCERS = "videoproducers",

    STAGES = "stages",
    GROUPS = "groups",
    CUSTOM_GROUPS = "customgroup",
    STAGE_MEMBERS = "stagemembers",
    CUSTOM_STAGE_MEMBERS = "customstagemembers",
    STAGE_MEMBER_AUDIOS = "stagememberaudios",
    STAGE_MEMBER_VIDEOS = "stagemembervideos",
    STAGE_MEMBER_OVS = "stagememberovs",
    CUSTOM_STAGE_MEMBER_AUDIOS = "customstagememberaudios",
    CUSTOM_STAGE_MEMBER_OVS = "customstagememberovs"
}


export class MongoRealtimeDatabase implements IRealtimeDatabase {
    private _mongoClient: MongoClient;
    private _db: Db;
    private readonly _io: socketIO.Server;

    constructor(io: socketIO.Server, url: string) {
        this._io = io;
        this._mongoClient = new MongoClient(url, {
            useNewUrlParser: true
        });
    }

    db() {
        return this._db;
    }

    createAudioProducer(initial: Omit<GlobalAudioProducer, "_id">): Promise<GlobalAudioProducer> {
        return this._db.collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS).insertOne(initial)
            .then(result => result.ops[0])
            .then(producer => {
                this.sendToUser(initial.userId, ServerDeviceEvents.AUDIO_PRODUCER_ADDED, producer);
                // Publish producer?
                this.readUser(initial.userId)
                    .then(user => {
                        if (user.stageMemberId) {
                            return this.createStageMemberAudioProducer({
                                stageMemberId: user.stageMemberId,
                                globalProducerId: producer._id,
                                volume: 1,
                                x: 0,
                                y: 0,
                                z: 0,
                                rX: 0,
                                rY: 0,
                                rZ: 0,
                                userId: user._id,
                                stageId: user.stageId,
                                online: true
                            });
                        }
                    });
                return producer;
            });
    }

    readAudioProducer(id: GlobalAudioProducerId): Promise<GlobalAudioProducer> {
        return this._db.collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS).findOne({
            _id: new ObjectId(id)
        });
    }

    updateAudioProducer(deviceId: StageMemberId, id: GlobalAudioProducerId, update: Partial<Omit<GlobalAudioProducer, "_id">>): Promise<GlobalAudioProducer> {
        return this._db.collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS).findOneAndUpdate({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        }, {
            $set: update
        })
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.AUDIO_PRODUCER_CHANGED, {
                        ...update,
                        _id: result.value._id
                    });
                }
                return result.value;
            })
    }

    deleteAudioProducer(deviceId: StageMemberId, id: GlobalAudioProducerId): Promise<GlobalAudioProducer> {
        return this._db.collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS).findOneAndDelete({
            deviceId: new ObjectId(deviceId),
            _id: new ObjectId(id)
        })
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.AUDIO_PRODUCER_REMOVED, result.value._id);
                    // Also delete all published producers
                    this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).find({
                        globalProducerId: result.value._id
                    }, {projection: {_id: 1}})
                        .toArray()
                        .then(globalProducers => globalProducers.map(globalProducer => this.deleteStageMemberAudioProducer(globalProducer._id)));
                }
                return result.value;
            })
    }

    createVideoProducer(initial: Omit<GlobalVideoProducer, "_id">): Promise<GlobalVideoProducer> {
        return this._db.collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS).insertOne(initial)
            .then(result => result.ops[0])
            .then(producer => {
                this.sendToUser(initial.userId, ServerDeviceEvents.VIDEO_PRODUCER_ADDED, producer);
                // Publish producer?
                this.readUser(initial.userId)
                    .then(user => {
                        if (user.stageMemberId) {
                            return this.createStageMemberVideoProducer({
                                stageMemberId: user.stageMemberId,
                                globalProducerId: producer._id,
                                userId: user._id,
                                stageId: user.stageId,
                                online: true
                            });
                        }
                    });
                return producer;
            });
    }

    readVideoProducer(id: GlobalVideoProducerId): Promise<GlobalVideoProducer> {
        return this._db.collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS).findOne({
            _id: new ObjectId(id)
        }).then(result => {
            return result;
        })
    }

    updateVideoProducer(deviceId: DeviceId, id: GlobalVideoProducerId, update: Partial<Omit<GlobalVideoProducer, "_id">>): Promise<GlobalVideoProducer> {
        return this._db.collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS).findOneAndUpdate({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        }, {
            $set: update
        })
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.VIDEO_PRODUCER_CHANGED, {
                        ...update,
                        _id: result.value._id
                    });
                }
                return result.value;
            })
    }

    deleteVideoProducer(deviceId: DeviceId, id: GlobalVideoProducerId): Promise<GlobalVideoProducer> {
        return this._db.collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS).findOneAndDelete({
            deviceId: new ObjectId(deviceId),
            _id: new ObjectId(id)
        })
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.VIDEO_PRODUCER_REMOVED, result.value._id);
                    // Also delete all published producers
                    this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).find({
                        globalProducerId: result.value._id
                    }, {projection: {_id: 1}})
                        .toArray()
                        .then(globalProducers => globalProducers.map(globalProducer => this.deleteStageMemberVideoProducer(globalProducer._id)));
                }
                return result.value;
            })
    }

    createStageMemberOvTrack(initial: Omit<StageMemberOvTrack, "_id">): Promise<StageMemberOvTrack> {
        return this._db.collection<StageMemberOvTrack>(Collections.STAGE_MEMBER_OVS).insertOne(initial)
            .then(result => result.ops[0])
            .then(track => {
                this.sendToJoinedStageMembers(initial.stageId, ServerStageEvents.STAGE_MEMBER_OV_ADDED, track);
                return track;
            });
    }

    readStageMemberOvTrack(id: StageMemberOvTrackId): Promise<StageMemberOvTrack> {
        return this._db.collection<StageMemberOvTrack>(Collections.STAGE_MEMBER_OVS).findOne({
            _id: new ObjectId(id)
        });
    }

    updateStageMemberOvTrack(id: StageMemberOvTrackId, update: Partial<Omit<StageMemberOvTrack, "_id">>): Promise<StageMemberOvTrack> {
        return this._db.collection<StageMemberOvTrack>(Collections.STAGE_MEMBER_OVS).findOneAndUpdate({
            _id: new ObjectId(id)
        }, {
            $set: update
        })
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_OV_CHANGED, {
                        ...update,
                        _id: result.value._id
                    });
                }
                return result.value;
            })
    }

    deleteStageMemberOvTrack(id: StageMemberOvTrackId): Promise<StageMemberOvTrack> {
        return this._db.collection<StageMemberOvTrack>(Collections.STAGE_MEMBER_OVS).findOneAndDelete({
            _id: new ObjectId(id)
        })
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_OV_REMOVED, result.value._id);
                }
                return result.value;
            })
    }

    createStageMemberAudioProducer(initial: Omit<StageMemberAudioProducer, "_id">): Promise<StageMemberAudioProducer> {
        return this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).insertOne(initial)
            .then(result => result.ops[0])
            .then(producer => {
                this.sendToJoinedStageMembers(initial.stageId, ServerStageEvents.STAGE_MEMBER_AUDIO_ADDED, producer);
                return producer;
            });
    }

    readStageMemberAudioProducer(id: StageMemberAudioProducerId): Promise<StageMemberAudioProducer> {
        return this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).findOne({
            _id: new ObjectId(id)
        });
    }

    updateStageMemberAudioProducer(id: StageMemberAudioProducerId, update: Partial<Omit<StageMemberAudioProducer, "_id">>): Promise<StageMemberAudioProducer> {
        return this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).findOneAndUpdate({
            _id: new ObjectId(id)
        }, {
            $set: update
        })
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_AUDIO_CHANGED, {
                        ...update,
                        _id: result.value._id
                    });
                }
                return result.value;
            })
    }

    deleteStageMemberAudioProducer(id: StageMemberAudioProducerId): Promise<StageMemberAudioProducer> {
        return this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).findOneAndDelete({
            _id: new ObjectId(id)
        })
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_AUDIO_REMOVED, result.value._id);
                }
                return result.value;
            })
    }

    createStageMemberVideoProducer(initial: Omit<StageMemberVideoProducer, "_id">): Promise<StageMemberVideoProducer> {
        return this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).insertOne(initial)
            .then(result => result.ops[0])
            .then(producer => {
                this.sendToJoinedStageMembers(initial.stageId, ServerStageEvents.STAGE_MEMBER_VIDEO_ADDED, producer);
                return producer;
            });
    }

    readStageMemberVideoProducer(id: StageMemberVideoProducerId): Promise<StageMemberVideoProducer> {
        return this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).findOne({
            _id: new ObjectId(id)
        });
    }

    updateStageMemberVideoProducer(id: StageMemberVideoProducerId, update: Partial<Omit<StageMemberVideoProducer, "_id">>): Promise<StageMemberVideoProducer> {
        return this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).findOneAndUpdate({
            _id: new ObjectId(id)
        }, {
            $set: update
        })
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_VIDEO_CHANGED, {
                        ...update,
                        _id: result.value._id
                    });
                }
                return result.value;
            })
    }

    deleteStageMemberVideoProducer(id: StageMemberVideoProducerId): Promise<StageMemberVideoProducer> {
        return this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).findOneAndDelete({
            _id: new ObjectId(id)
        })
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_VIDEO_REMOVED, result.value._id);
                }
                return result.value;
            })
    }

    async connect(database: string): Promise<void> {
        if (this._mongoClient.isConnected()) {
            logger.warn("[MONGO REALTIME DATABASE] Reconnecting");
            await this.disconnect()
        }
        this._mongoClient = await this._mongoClient.connect();
        this._db = this._mongoClient.db(database);
        if (this._mongoClient.isConnected()) {
            logger.info("[MONGO REALTIME DATABASE] Connected to " + database);
        }
        //TODO: Clean up old devices etc.
    }

    disconnect() {
        return this._mongoClient.close();
    }


    createUser(initial: Omit<User, "_id" | "stageId" | "stageMemberId">): Promise<User> {
        return this._db.collection<User>(Collections.USERS).insertOne(initial)
            .then(result => result.ops[0]);
    }

    readUser(id: UserId): Promise<User | null> {
        return this._db.collection<User>(Collections.USERS).findOne({_id: new ObjectId(id)});
    }

    readUserByUid(uid: string): Promise<User | null> {
        return this._db.collection<User>(Collections.USERS).findOne({uid: uid});
    }

    updateUser(id: UserId, update: Partial<Omit<User, "_id">>): Promise<User> {
        return this._db.collection<User>(Collections.USERS).findOneAndUpdate({_id: new ObjectId(id)}, {$set: {update}})
            .then(result => {
                //TODO: Update all associated (Stage Members), too

                this.sendToUser(id, ServerStageEvents.USER_CHANGED, {
                    ...update,
                    _id: id
                })
                return result.value;
            });
    }

    deleteUser(id: UserId): Promise<User> {
        return this._db.collection<User>(Collections.USERS).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                //TODO: Remove all associated, too
                if (result.value) {
                    if (result.value.stageId) {
                        // Remove
                    }
                }
                return result.value;
            })
    }


    createDevice(init: Omit<Device, "_id">): Promise<Device> {
        return this._db.collection(Collections.DEVICES).insertOne(init)
            .then(result => result.ops[0])
            .then(device => {
                this.sendToUser(init.userId, ServerDeviceEvents.DEVICE_ADDED, device)
                return device;
            })
    }

    readDevicesByUser(userId: UserId): Promise<Device[]> {
        return this._db.collection<Device>(Collections.DEVICES).find({userId: new ObjectId(userId)}).toArray();
    }

    readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device | null> {
        return this._db.collection<Device>(Collections.DEVICES).findOne({userId: new ObjectId(userId), mac: mac});
    }

    readDevice(id: DeviceId): Promise<Device | null> {
        return this._db.collection<Device>(Collections.DEVICES).findOne({_id: new ObjectId(id)});
    }

    readDevicesByServer(server: string): Promise<Device[]> {
        return this._db.collection<Device>(Collections.DEVICES).find({server: server}).toArray();
    }

    updateDevice(userId: UserId, id: DeviceId, update: Partial<Omit<Device, "_id">>): Promise<Device> {
        // Update first ;)
        this.sendToUser(userId, ServerDeviceEvents.DEVICE_CHANGED, {
            ...update,
            user: userId,
            _id: id,
        });
        return this._db.collection<Device>(Collections.DEVICES).findOneAndUpdate({_id: new ObjectId(id)}, {$set: {update}})
            .then(result => {
                //TODO: Update all associated (Stage Members), too

                if (Object.keys(update).find(key => key === "online")) {
                    if (update.online) {

                    } else {

                    }
                }
                return result.value;
            });
    }

    deleteDevice(id: DeviceId): Promise<Device> {
        const objId = new ObjectId(id);
        return this._db.collection<Device>(Collections.DEVICES).findOneAndDelete({_id: objId})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.DEVICE_REMOVED, id);

                    // Delete associated producers
                    this._db.collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS).find({
                        deviceId: objId
                    }, {projection: {_id: 1}})
                        .toArray()
                        .then(producers => producers.map(producer => this.deleteVideoProducer(id, producer._id)));

                    this._db.collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS).find({
                        deviceId: objId
                    }, {projection: {_id: 1}})
                        .toArray()
                        .then(producers => producers.map(producer => this.deleteAudioProducer(id, producer._id)));

                    this._db.collection<Track>(Collections.TRACKS).find({
                        deviceId: objId
                    }, {projection: {_id: 1}})
                        .toArray()
                        .then(tracks => tracks.map(track => this.deleteTrack(id, track._id)));
                }
                return result.value;
            })
    }

    createStage(init: Partial<Omit<Stage, "_id">>): Promise<Stage> {
        const stage: Omit<Stage, "_id"> = {
            name: "",
            password: "",
            width: 13,
            length: 25,
            height: 7.5,
            absorption: 0.6,
            damping: 0.7,
            admins: [],
            ...init,
        }
        return this._db.collection<Stage>(Collections.STAGES).insertOne(stage)
            .then(result => {
                stage.admins.forEach(adminId => this.sendToUser(adminId, ServerStageEvents.STAGE_ADDED, stage));
                return result.ops[0];
            });
    }


    async joinStage(userId: UserId, stageId: StageId, groupId: GroupId): Promise<Stage> {
        let startTime = Date.now();

        let user: User = await this.readUser(userId);
        const stage: Stage = await this.readStage(stageId);
        const isAdmin: boolean = stage.admins.find(admin => admin.toString() === userId.toString()) !== undefined;
        const previousStageId = user.stageId;
        const previousStageMemberId = user.stageMemberId;

        let stageMember = await this._db.collection(Collections.STAGE_MEMBERS).findOne({
            userId: user._id,
            stageId: stage._id
        });
        const wasUserAlreadyInStage = stageMember !== null;
        if (!stageMember) {
            // Create stage member
            stageMember = await this.createStageMember({
                userId: user._id,
                stageId: stage._id,
                groupId: groupId,
                online: true,
                isDirector: false,
                volume: 1,
                x: 0,
                y: 0,
                z: 0,
                rX: 0,
                rY: 0,
                rZ: 0
            });
        } else {
            // Update stage member
            stageMember = await this.updateStageMember(stageMember._id, {
                groupId: groupId,
                online: true
            });
        }

        this.sendToJoinedStageMembers(stage._id, ServerStageEvents.STAGE_MEMBER_ADDED, stageMember);

        // Update user
        user = await this.updateUser(user._id, {
            stageId: stage._id,
            stageMemberId: stageMember._id
        });

        // Send whole stage
        const wholeStage = await this.getWholeStage(user._id, stage._id, isAdmin || wasUserAlreadyInStage);
        this.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, {
            ...wholeStage,
            stageId: stage._id,
            groupId: groupId,
        });

        if (previousStageMemberId) {
            // Set old stage member offline (async!)
            this.updateStageMember(previousStageMemberId, {online: false});
            // Set old stage member tracks offline (async!)
            this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).find({
                stageMemberId: previousStageMemberId
            })
                .toArray()
                .then(producers => producers.map(producer => this.updateStageMemberAudioProducer(producer._id, {
                    online: false
                })));

            this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_VIDEOS).find({
                stageMemberId: previousStageMemberId
            })
                .toArray()
                .then(producers => producers.map(producer => this.updateStageMemberVideoProducer(producer._id, {
                    online: false
                })));

            this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_OVS).find({
                stageMemberId: previousStageMemberId
            })
                .toArray()
                .then(tracks => tracks.map(track => this.updateStageMemberOvTrack(track._id, {
                    online: false
                })));
        }

        // Assign tracks of user to new stage and inform their stage members (async!)


        console.log("joinStage: " + (Date.now() - startTime) + "ms");
        return Promise.resolve(undefined);
    }

    leaveStage(userId: UserId, skipLeaveNotification?: boolean): Promise<Stage> {
        return Promise.resolve(undefined);
    }

    readStage(id: StageId): Promise<Stage> {
        return this._db.collection<Stage>(Collections.STAGES).findOne({_id: new ObjectId(id)});
    }

    private async getWholeStage(userId: UserId, stageId: StageId, skipStageAndGroups: boolean = false): Promise<{
        stage?: Stage;
        groups?: Group[];
        stageMembers: StageMember[];
        customGroups: CustomGroup[];
        customStageMembers: CustomStageMember[];
        videoProducers: StageMemberVideoProducer[];
        audioProducers: StageMemberAudioProducer[];
        customAudioProducers: CustomStageMemberAudioProducer[];
        ovTracks: StageMemberOvTrack[];
        customOvTracks: CustomStageMemberOvTrack[];
    }> {
        const objStageId = new ObjectId(stageId);
        const objUserId = new ObjectId(userId);
        const stage = skipStageAndGroups ? undefined : await this._db.collection<Stage>(Collections.STAGES).findOne({_id: objStageId});
        const groups = skipStageAndGroups ? undefined : await this._db.collection<Group>(Collections.GROUPS).find({stageId: objStageId}).toArray();
        const stageMembers = await this._db.collection<StageMember>(Collections.STAGE_MEMBERS).find({stageId: objStageId}).toArray();
        const customGroups = await this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).find({
            userId: objUserId,
            stageId: objStageId
        }).toArray();
        const customStageMembers: CustomStageMember[] = await this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).find({
            userId: objUserId,
            stageId: objStageId
        }).toArray();
        const videoProducers: StageMemberVideoProducer[] = await this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).find({
            stageId: objStageId
        }).toArray();
        const audioProducers: StageMemberAudioProducer[] = await this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).find({
            stageId: objStageId
        }).toArray();
        const customAudioProducers: CustomStageMemberAudioProducer[] = await this._db.collection<CustomStageMemberAudioProducer>(Collections.CUSTOM_STAGE_MEMBER_AUDIOS).find({
            userId: objUserId,
            stageId: objStageId
        }).toArray();
        const ovTracks: StageMemberOvTrack[] = await this._db.collection<StageMemberOvTrack>(Collections.TRACKS).find({
            stageId: objStageId
        }).toArray();
        const customOvTracks: CustomStageMemberOvTrack[] = await this._db.collection<CustomStageMemberOvTrack>(Collections.CUSTOM_STAGE_MEMBER_OVS).find({
            userId: objUserId,
            stageId: objStageId
        }).toArray();

        return {
            stage,
            groups,
            stageMembers,
            customGroups,
            customStageMembers,
            videoProducers,
            audioProducers,
            customAudioProducers,
            ovTracks,
            customOvTracks
        }
    }

    updateStage(id: StageId, update: Partial<Omit<Stage, "_id">>): Promise<Stage> {
        return this._db.collection(Collections.STAGES).findOneAndUpdate({_id: new ObjectId(id)}, {$set: {update}})
            .then(result => {
                //TODO: Update all associated, too

                this.sendToStage(id, ServerStageEvents.STAGE_CHANGED, {
                    ...update,
                    _id: id
                });
                return result.value;
            });
    }

    deleteStage(id: StageId): Promise<Stage> {
        return this._db.collection<Stage>(Collections.STAGES).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                //TODO: Remove all associated, too

                this.sendToStage(id, ServerStageEvents.STAGE_REMOVED, id);
                return result.value;
            })
    }

    createCustomGroup(initial: Omit<CustomGroup, "_id">): Promise<CustomGroup> {
        return this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).insertOne(initial)
            .then(result => result.ops[0] as CustomGroup)
            .then(customGroup => {
                this.sendToUser(customGroup.userId, ServerStageEvents.CUSTOM_GROUP_ADDED, customGroup);
                return customGroup;
            });
    }

    createCustomStageMember(initial: Omit<CustomStageMember, "_id">): Promise<CustomStageMember> {
        return this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).insertOne(initial)
            .then(result => result.ops[0] as CustomStageMember)
            .then(customStageMember => {
                this.sendToUser(customStageMember.userId, ServerStageEvents.CUSTOM_STAGE_MEMBER_ADDED, customStageMember);
                return customStageMember;
            });
    }

    createGroup(initial: Omit<Group, "_id">): Promise<Group> {
        return this._db.collection<Group>(Collections.GROUPS).insertOne(initial)
            .then(result => result.ops[0] as Group)
            .then(group => {
                this.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group);
                return group;
            });
    }

    createSoundCard(initial: Omit<SoundCard, "_id">): Promise<SoundCard> {
        return this._db.collection<SoundCard>(Collections.SOUND_CARDS).insertOne(initial)
            .then(result => result.ops[0] as SoundCard)
            .then(soundCard => {
                this.sendToUser(soundCard.userId, ServerDeviceEvents.SOUND_CARD_ADDED, soundCard);
                return soundCard;
            });
    }

    createStageMember(initial: Omit<StageMember, "_id">): Promise<StageMember> {
        return this._db.collection<StageMember>(Collections.STAGE_MEMBERS).insertOne(initial)
            .then(result => result.ops[0] as StageMember)
            .then(stageMember => {
                this.sendToJoinedStageMembers(stageMember.stageId, ServerStageEvents.STAGE_MEMBER_ADDED, stageMember);
                return stageMember;
            });
    }

    createTrack(initial: Omit<Track, "_id">): Promise<Track> {
        return this._db.collection<Track>(Collections.TRACKS).insertOne(initial)
            .then(result => result.ops[0] as Track)
            .then(track => {
                this.sendToUser(track.userId, ServerDeviceEvents.TRACK_ADDED, track);

                this.readUser(track.userId).then(
                    user => {
                        if (user.stageMemberId) {
                            const stageTrack: Omit<StageMemberOvTrack, "_id"> = {
                                ...initial,
                                stageId: user.stageId,
                                stageMemberId: user.stageMemberId,
                                userId: user._id,
                                trackId: track._id,
                                online: true,
                                x: 0,
                                y: 0,
                                z: 0,
                                rX: 0,
                                rY: 0,
                                rZ: 0
                            }
                            return this.createStageMemberOvTrack(stageTrack);
                        }
                    }
                )
                return track;
            });
    }

    createTrackPreset(initial: Omit<TrackPreset, "_id">): Promise<TrackPreset> {
        return this._db.collection<TrackPreset>(Collections.TRACK_PRESETS).insertOne(initial)
            .then(result => result.ops[0] as TrackPreset)
            .then(preset => {
                this.sendToUser(preset.userId, ServerDeviceEvents.TRACK_PRESET_ADDED, preset);
                return preset;
            });
    }

    deleteCustomGroup(id: CustomGroupId): Promise<CustomGroup> {
        return this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                //TODO: Check if anything has to be done here
                this.sendToUser(result.value.userId, ServerStageEvents.CUSTOM_GROUP_REMOVED, id);
                return result.value;
            });
    }

    deleteCustomStageMember(id: CustomGroupId): Promise<CustomStageMember> {
        return this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                //TODO: Check if anything has to be done here
                this.sendToUser(result.value.userId, ServerStageEvents.CUSTOM_STAGE_MEMBER_REMOVED, id);
                return result.value;
            });
    }

    deleteGroup(id: GroupId): Promise<Group> {
        return this._db.collection<Group>(Collections.GROUPS).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                if (result.value) {
                    // Delete all associated custom groups and stage members
                    this._db.collection<StageMember>(Collections.STAGE_MEMBERS).find({groupId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(stageMembers => stageMembers.map(stageMember => this.deleteStageMember(stageMember._id)));

                    this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).find({groupId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(customGroups => customGroups.map(customGroup => this.deleteCustomGroup(customGroup._id)));

                    this.sendToStage(result.value.stageId, ServerStageEvents.GROUP_REMOVED, id);
                }
                return result.value;
            });
    }

    deleteSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<SoundCard> {
        return this._db.collection<SoundCard>(Collections.SOUND_CARDS).findOneAndDelete({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        })
            .then(result => {
                if (result.value) {
                    this._db.collection<TrackPreset>(Collections.TRACK_PRESETS).find({soundCardId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(presets => presets.map(preset => this.deleteTrackPreset(deviceId, preset._id)));
                    this.sendToUser(result.value.userId, ServerDeviceEvents.SOUND_CARD_REMOVED, id);
                }
                return result.value;
            });
    }

    deleteStageMember(id: StageMemberId): Promise<StageMember> {
        return this._db.collection<StageMember>(Collections.STAGE_MEMBERS).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                if (result.value) {
                    // Delete all custom stage members and stage member tracks
                    this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).find({stageMemberId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(presets => presets.map(preset => this.deleteCustomStageMember(preset._id)));

                    this._db.collection<StageMemberVideoProducer>(Collections.STAGE_MEMBER_VIDEOS).find({stageMemberId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(producers => producers.map(producer => this.deleteStageMemberVideoProducer(producer._id)))
                    this._db.collection<StageMemberAudioProducer>(Collections.STAGE_MEMBER_AUDIOS).find({stageMemberId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(producers => producers.map(producer => this.deleteStageMemberAudioProducer(producer._id)))
                    this._db.collection<StageMemberOvTrack>(Collections.STAGE_MEMBER_OVS).find({stageMemberId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(tracks => tracks.map(track => this.deleteStageMemberOvTrack(track._id)))

                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_REMOVED, id);
                }
                return result.value;
            });
    }

    deleteTrack(deviceId: DeviceId, id: TrackId): Promise<Track> {
        return this._db.collection<Track>(Collections.TRACKS).findOneAndDelete({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        })
            .then(result => {
                if (result.value) {
                    // Delete all custom stage members and stage member tracks
                    this._db.collection<StageMemberOvTrack>(Collections.STAGE_MEMBER_OVS).find({trackId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(tracks => tracks.map(track => this.deleteStageMemberOvTrack(track._id)))
                    this.sendToUser(result.value.userId, ServerDeviceEvents.TRACK_REMOVED, id);
                }
                return result.value;
            });
    }

    deleteTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<TrackPreset> {
        return this._db.collection<TrackPreset>(Collections.TRACK_PRESETS).findOneAndDelete({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        })
            .then(result => {
                if (result.value) {
                    // Delete all custom stage members and stage member tracks
                    this._db.collection<Track>(Collections.TRACKS).find({trackPresetId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(tracks => tracks.map(track => this.deleteTrack(deviceId, track._id)));
                    this.sendToUser(result.value.userId, ServerDeviceEvents.TRACK_PRESET_REMOVED, id);
                }
                return result.value;
            });
    }

    readTrackPreset(id: TrackPresetId): Promise<TrackPreset> {
        return this._db.collection<TrackPreset>(Collections.TRACK_PRESETS).findOne({_id: new ObjectId(id)});
    }

    readCustomGroup(id: CustomGroupId): Promise<CustomGroup> {
        return this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).findOne({_id: new ObjectId(id)});
    }

    readCustomStageMember(id: CustomStageMemberId): Promise<CustomStageMember> {
        return this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).findOne({_id: new ObjectId(id)});
    }

    readGroup(id: GroupId): Promise<Group> {
        return this._db.collection<Group>(Collections.GROUPS).findOne({_id: new ObjectId(id)});
    }

    readSoundCard(id: SoundCardId): Promise<SoundCard> {
        return this._db.collection<SoundCard>(Collections.SOUND_CARDS).findOne({_id: new ObjectId(id)});
    }

    readStageMember(id: StageMemberId): Promise<StageMember> {
        return this._db.collection<StageMember>(Collections.STAGE_MEMBERS).findOne({_id: new ObjectId(id)});
    }

    readTrack(id: TrackId): Promise<Track> {
        return this._db.collection<Track>(Collections.TRACKS).findOne({_id: new ObjectId(id)});
    }

    updateCustomGroup(id: CustomGroupId, update: Partial<Omit<CustomGroup, "_id">>): Promise<CustomGroup> {
        return this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).findOneAndUpdate({_id: new ObjectId(id)}, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerStageEvents.CUSTOM_GROUP_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }

    updateCustomStageMember(id: CustomStageMemberId, update: Partial<Omit<CustomStageMember, "_id">>): Promise<CustomStageMember> {
        return this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).findOneAndUpdate({_id: new ObjectId(id)}, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerStageEvents.CUSTOM_STAGE_MEMBER_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }

    updateGroup(id: GroupId, update: Partial<Omit<Group, "_id">>): Promise<Group> {
        return this._db.collection<Group>(Collections.GROUPS).findOneAndUpdate({_id: new ObjectId(id)}, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToStage(result.value.stageId, ServerStageEvents.GROUP_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }

    updateSoundCard(deviceId: DeviceId, id: SoundCardId, update: Partial<Omit<SoundCard, "_id">>): Promise<SoundCard> {
        return this._db.collection<SoundCard>(Collections.SOUND_CARDS).findOneAndUpdate({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        }, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.SOUND_CARD_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }

    updateStageMember(id: StageMemberId, update: Partial<Omit<StageMember, "_id">>): Promise<StageMember> {
        return this._db.collection<StageMember>(Collections.STAGE_MEMBERS).findOneAndUpdate({_id: new ObjectId(id)}, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.GROUP_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }

    updateTrack(deviceId: DeviceId, id: TrackId, update: Partial<Omit<Track, "_id">>): Promise<Track> {
        return this._db.collection<Track>(Collections.TRACKS).findOneAndUpdate({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        }, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.TRACK_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }

    updateTrackPreset(deviceId: DeviceId, id: TrackPresetId, update: Partial<Omit<TrackPreset, "_id">>): Promise<TrackPreset> {
        return this._db.collection<TrackPreset>(Collections.TRACK_PRESETS).findOneAndUpdate({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        }, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.TRACK_PRESET_CHANGED, {
                        ...update,
                        _id: id
                    });
                }
                return result.value;
            });
    }


    public async sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any> {
        const stageMemberId = user.stageMemberId ? new ObjectId(user.stageMemberId) : undefined;
        if (stageMemberId) {
            // Switch current stage member online
            await this._db.collection(Collections.STAGE_MEMBERS).updateOne({stageMemberId: stageMemberId}, {$set: {online: true}});
        }
        const stageMembers = await this._db.collection(Collections.STAGE_MEMBERS).find({userId: user._id}).toArray();
        // Get all managed stages and stages, where the user was or is in
        const stages = await this._db.collection(Collections.STAGES).find({$or: [{_id: {$in: stageMembers.map(groupMember => groupMember.stageId)}}, {admins: user._id}]}).toArray();
        for (const stage of stages) {
            await this.sendToDevice(socket, ServerStageEvents.STAGE_ADDED, stage);
        }
        const groups = await this._db.collection(Collections.GROUPS).find({stageId: {$in: stages.map(stage => stage._id)}}).toArray();
        for (const group of groups) {
            await this.sendToDevice(socket, ServerStageEvents.GROUP_ADDED, group);
        }
        if (stageMemberId) {
            const stageMember = stageMembers.find(groupMember => groupMember._id.toString() === user.stageMemberId.toString());
            if (stageMember) {
                const wholeStage = await this.getWholeStage(user._id, user.stageId, true);
                this.sendToDevice(socket, ServerStageEvents.STAGE_JOINED, {
                    ...wholeStage,
                    stageId: user.stageId,
                    groupId: stageMember.groupId
                });
            } else {
                logger.error("Group member or stage should exists, but could not be found");
            }
        }
    }


    sendToStage(stageId: StageId, event: string, payload?: any): Promise<void> {
        return Promise.all([
            this._db.collection<Stage>(Collections.STAGES).findOne({_id: new ObjectId(stageId)}, {projection: {admins: 1}}).then(stage => stage.admins),
            this._db.collection<StageMember>(Collections.STAGE_MEMBERS).find({stageId: new ObjectId(stageId)}, {projection: {user: 1}}).toArray().then(stageMembers => stageMembers.map(stageMember => stageMember.userId))
        ])
            .then(result => Set<UserId>([...result[0], ...result[1]]).toArray())
            .then(userIds => userIds.forEach(userId => this.sendToUser(userId, event, payload)));
    }

    sendToStageManagers(stageId: StageId, event: string, payload?: any): Promise<void> {
        return this._db.collection(Collections.STAGES).findOne({_id: new ObjectId(stageId)}, {projection: {admins: 1}})
            .then(stage => stage.admins.forEach(admin => this.sendToUser(admin, event, payload)));
    }

    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any): Promise<void> {
        return this._db.collection(Collections.USERS).find({stageId: new ObjectId(stageId)}, {projection: {_id: 1}}).toArray()
            .then((users: { _id: string }[]) => {
                users.forEach(user => this.sendToUser(user._id, event, payload));
            });
    }

    sendToDevice(socket: socketIO.Socket, event: string, payload?: any): void {
        if (process.env.DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO DEVICE '" + socket.id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO DEVICE '" + socket.id + "' " + event);
        }
        socket.emit(event, payload);
    }

    sendToUser(_id: UserId, event: string, payload?: any): void {
        if (process.env.DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO USER '" + _id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO USER '" + _id + "' " + event);
        }
        this._io.to(_id.toString()).emit(event, payload);
    };

    sendToAll(event: string, payload?: any): void {
        if (process.env.DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO ALL " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO ALL " + event);
        }
        this._io.emit(event, payload);
    }
}