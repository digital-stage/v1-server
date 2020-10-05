import {Db, MongoClient, ObjectId} from "mongodb";
import {
    CustomGroup, CustomGroupId, CustomStageMember, CustomStageMemberId, CustomStageMemberTrack,
    Device,
    DeviceId, GlobalProducer, GlobalProducerId, Group, GroupId, SoundCard,
    SoundCardId,
    Stage,
    StageId,
    StageMember, StageMemberId,
    StageMemberTrack, StageMemberTrackId, Track, TrackId, TrackPreset, TrackPresetId,
    User,
    UserId
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
    PRODUCERS = "producers",

    STAGES = "stages",
    GROUPS = "groups",
    CUSTOM_GROUPS = "customgroup",
    STAGE_MEMBERS = "stagemembers",
    CUSTOM_STAGE_MEMBERS = "customstagemembers",
    STAGE_TRACKS = "stagetracks",  // refers to tracks OR producers
    CUSTOM_STAGE_MEMBER_TRACKS = "customstagemembertrack",
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

    public db(): Db {
        return this._db;
    }

    async connect(database: string): Promise<void> {
        if (this._mongoClient.isConnected()) {
            await this.disconnect()
        }
        this._mongoClient = await this._mongoClient.connect();
        this._db = this._mongoClient.db(database);
        //TODO: Clean up old devices etc.
    }

    disconnect() {
        return this._mongoClient.close();
    }


    createUser(initial: Omit<User, "_id" | "stageId" | "stageMemberId">): Promise<User> {
        return this._db.collection(Collections.USERS).insertOne(initial)
            .then(result => result.ops[0]);
    }

    readUser(id: UserId): Promise<User | null> {
        return this._db.collection<User | {
            _id: ObjectId
        }>(Collections.USERS).findOne({_id: new ObjectId(id)});
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
        return this._db.collection<Device>(Collections.DEVICES).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                if (result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.DEVICE_REMOVED, id);

                    // Delete associated producers
                    result.value.producerIds.map(producerId => this.deleteProducer(id, producerId));

                    // Delete associated track presets
                    result.value.soundCardIds.map(soundCardId => this.deleteSoundCard(id, soundCardId));
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
                tracks: [],
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
            this._db.collection<StageMemberTrack>(Collections.TRACKS).find({
                userId: user._id,
                stageId: previousStageId
            }).toArray()
                .then(stageTracks => stageTracks.map(stageTrack => this.updateStageMemberTrack(stageTrack._id, {
                    online: false
                })));
        }

        // Assign tracks of user to new stage and inform their stage members (async!)
        this._db.collection<GlobalProducer>(Collections.PRODUCERS).find({userId: user._id}).toArray()
            .then(producers =>
                // Upsert stage member track for each producer
                producers.map(producer => this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).updateOne({
                        userId: user._id,
                        producerId: producer._id,
                        stageId: stage._id,
                    }, {
                        $set: {
                            online: true
                        },
                        $setOnInsert: {
                            userId: user._id,
                            producerId: producer._id,
                            stageId: stage._id,
                            stageMemberId: stageMember._id,
                            online: true,
                            kind: "webrtc",
                            gain: 1,
                            volume: 1,
                            x: 0,
                            y: 0,
                            z: 0,
                            rX: 0,
                            rY: 0,
                            rZ: 0
                        }
                    }, {upsert: true})
                ));

        this._db.collections<TrackPreset>(Collections.TRACK_PRESETS).find

        // Assign tracks of user to new stage and inform their stage members (async!)
        this._db.collection<GlobalProducer>(Collections.PRODUCERS).find({userId: user._id}).toArray()
            .then(producers =>
                // Upsert stage member track for each producer
                producers.map(producer => this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).updateOne({
                        userId: user._id,
                        producerId: producer._id,
                        stageId: stage._id,
                    }, {
                        $set: {
                            online: true
                        },
                        $setOnInsert: {
                            userId: user._id,
                            producerId: producer._id,
                            stageId: stage._id,
                            stageMemberId: stageMember._id,
                            online: true,
                            kind: "webrtc",
                            gain: 1,
                            volume: 1,
                            x: 0,
                            y: 0,
                            z: 0,
                            rX: 0,
                            rY: 0,
                            rZ: 0
                        }
                    }, {upsert: true})
                ));

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
        tracks: StageMemberTrack[];
        customTracks: CustomStageMemberTrack[];
    }> {
        const objStageId = new ObjectId(stageId);
        const objUserId = new ObjectId(userId);
        const stage = skipStageAndGroups ? undefined : await this._db.collection<Stage>(Collections.STAGES).findOne({_id: objStageId});
        const groups = skipStageAndGroups ? undefined : await this._db.collection<Group>(Collections.GROUPS).find({objStageId: objStageId}).toArray();
        const stageMembers = await this._db.collection<StageMember>(Collections.STAGE_MEMBERS).find({objStageId: objStageId}).toArray();
        const customGroups = await this._db.collection<CustomGroup>(Collections.CUSTOM_GROUPS).find({
            objStageId: objStageId,
            objUserId: objUserId
        }).toArray();
        const stageMemberIds: UserId[] = stageMembers.map(stageMember => stageMember._id);
        const customStageMembers: CustomStageMember[] = await this._db.collection<CustomStageMember>(Collections.CUSTOM_STAGE_MEMBERS).find({
            objUserId: objUserId,
            stageMemberId: {$in: stageMemberIds}
        }).toArray();
        const tracks: StageMemberTrack[] = await this._db.collection<StageMemberTrack>(Collections.TRACKS).find({
            objStageId: objStageId
        }).toArray();
        const customTracks: CustomStageMemberTrack[] = await this._db.collection<CustomStageMemberTrack>(Collections.CUSTOM_STAGE_MEMBER_TRACKS).find({
            objStageId: objStageId,
            objUserId: objUserId
        }).toArray();

        return {
            stage,
            groups,
            stageMembers,
            customGroups,
            customStageMembers,
            tracks,
            customTracks
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

    createProducer(initial: Omit<GlobalProducer, "_id">): Promise<GlobalProducer> {
        return this._db.collection<GlobalProducer>(Collections.PRODUCERS).insertOne(initial)
            .then(result => result.ops[0] as GlobalProducer)
            .then(producer => {
                this.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_ADDED, producer);
                if (producer.stageId) {
                    //TODO: Discuss, if we might read user and use its stage id instead of the initial data
                    // Create stage tracks for this producer
                    this._db.collection<StageMember>(Collections.STAGE_MEMBERS).findOne({
                        userId: producer.userId,
                        stageId: producer.stageId
                    })
                        .then(stageMember => {
                            if (stageMember) {
                                const stageTrack: Omit<StageMemberTrack, "_id"> = {
                                    stageId: stageMember.stageId,
                                    stageMemberId: stageMember._id,
                                    userId: initial.userId,
                                    kind: "webrtc",
                                    producerId: producer._id,
                                    gain: 1,
                                    volume: 1,
                                    x: 0,
                                    y: 0,
                                    z: 0,
                                    rX: 0,
                                    rY: 0,
                                    rZ: 0
                                }
                                return this.createStageMemberTrack(stageTrack);
                            }
                        });
                }
                return producer;
            })
    }

    readProducerByDevice(id: DeviceId): Promise<GlobalProducer[]> {
        return this._db.collection<GlobalProducer>(Collections.PRODUCERS).find({deviceId: new ObjectId(id)}).toArray();
    }

    updateProducer(deviceId: DeviceId, id: GlobalProducerId, update: Partial<Omit<GlobalProducer, "id">>): Promise<GlobalProducer> {
        return this._db.collection<GlobalProducer>(Collections.PRODUCERS).findOneAndUpdate({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId)
        }, {$set: update})
            .then(result => {
                if (result.ok && result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.PRODUCER_CHANGED, {
                        ...update,
                        _id: result.value._id
                    });
                }
                return result.value;
            })
    }

    /**
     * { "_id" : ObjectId("5f7b354b3168a71ba7086e89"), "kind" : "video", "routerId" : "5f7a620349240461fefd28b2", "routerProducerId" : "c290b047-ec7e-4e14-87f5-3f644c81ffd5", "deviceId" : ObjectId("5f7b34f33168a71ba7086e86"), "userId" : ObjectId("5f60dc485458f542dbbf56f5"), "stageId" : ObjectId("5f75d3ae59feab0648da5ddf") }

     * @param deviceId
     * @param id
     */

    deleteProducer(deviceId: DeviceId, id: GlobalProducerId): Promise<GlobalProducer> {
        return this._db.collection<GlobalProducer>(Collections.PRODUCERS).findOneAndDelete({
            _id: new ObjectId(id),
            deviceId: new ObjectId(deviceId),
        })
            .then(result => {
                if (result.ok && result.value) {
                    this.sendToUser(result.value.userId, ServerDeviceEvents.PRODUCER_REMOVED, result.value._id);

                    // Remove associated stage tracks
                    this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).find({producerId: result.value._id}, {projection: {_id: 1}})
                        .toArray()
                        .then(stageTracks => stageTracks.map(stageTrack => this.deleteStageMemberTrack(stageTrack._id)));
                }
                return result.value;
            });
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

    createStageMemberTrack(initial: Omit<StageMemberTrack, "_id">): Promise<StageMemberTrack> {
        return this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).insertOne(initial)
            .then(result => result.ops[0] as StageMemberTrack)
            .then(stageTrack => {
                this.sendToJoinedStageMembers(stageTrack.stageId, ServerStageEvents.STAGE_MEMBER_TRACK_ADDED, stageTrack);
                return stageTrack;
            });
    }

    createTrack(initial: Omit<Track, "_id">): Promise<Track> {
        return this._db.collection<Track>(Collections.TRACKS).insertOne(initial)
            .then(result => result.ops[0] as Track)
            .then(track => {
                this.sendToUser(track.userId, ServerDeviceEvents.TRACK_ADDED, track);
                if (track.stageId) {
                    //TODO: Discuss, if we might read user and use its stage id instead of the initial data
                    // Create stage tracks for this producer

                    this._db.collection<StageMember>(Collections.STAGE_MEMBERS).findOne({
                        userId: track.userId,
                        stageId: track.stageId
                    })
                        .then(stageMember => {
                            if (stageMember) {
                                const stageTrack: Omit<StageMemberTrack, "_id"> = {
                                    stageId: stageMember.stageId,
                                    stageMemberId: stageMember._id,
                                    userId: stageMember.userId,
                                    kind: "ov",
                                    trackId: track._id,
                                    gain: 1,
                                    volume: 1,
                                    x: 0,
                                    y: 0,
                                    z: 0,
                                    rX: 0,
                                    rY: 0,
                                    rZ: 0
                                }
                                return this.createStageMemberTrack(stageTrack);
                            }
                        });
                }
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

                    this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).find({stageMemberId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(presets => presets.map(preset => this.deleteStageMemberTrack(preset._id)));
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_REMOVED, id);
                }
                return result.value;
            });
    }

    deleteStageMemberTrack(id: StageMemberTrackId): Promise<StageMemberTrack> {
        return this._db.collection<StageMemberTrack>(Collections.STAGE_MEMBERS).findOneAndDelete({_id: new ObjectId(id)})
            .then(result => {
                if (result.value) {
                    // Delete all custom stage members and stage member tracks
                    this._db.collection<CustomStageMemberTrack>(Collections.CUSTOM_STAGE_MEMBER_TRACKS).find({stageMemberTrackId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(customStageMemberTracks => customStageMemberTracks.map(customStageMemberTrack => this.deleteCustomStageMember(customStageMemberTrack._id)));
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_TRACK_REMOVED, id);
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
                    this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).find({trackId: result.value._id}, {projection: {_id: 1}}).toArray()
                        .then(stageMemberTracks => stageMemberTracks.map(stageMemberTrack => this.deleteStageMemberTrack(stageMemberTrack._id)));
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

    readProducer(id: GlobalProducerId): Promise<GlobalProducer> {
        return this._db.collection<GlobalProducer>(Collections.PRODUCERS).findOne({_id: new ObjectId(id)});
    }

    readSoundCard(id: SoundCardId): Promise<SoundCard> {
        return this._db.collection<SoundCard>(Collections.SOUND_CARDS).findOne({_id: new ObjectId(id)});
    }

    readStageMember(id: StageMemberId): Promise<StageMember> {
        return this._db.collection<StageMember>(Collections.STAGE_MEMBERS).findOne({_id: new ObjectId(id)});
    }

    readStageMemberTrack(id: StageMemberTrackId): Promise<StageMemberTrack> {
        return this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).findOne({_id: new ObjectId(id)});
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

    updateStageMemberTrack(id: StageMemberTrackId, update: Partial<Omit<StageMemberTrack, "_id">>): Promise<StageMemberTrack> {
        return this._db.collection<StageMemberTrack>(Collections.STAGE_TRACKS).findOneAndUpdate({_id: new ObjectId(id)}, {$set: update})
            .then(result => {
                if (result.value) {
                    this.sendToJoinedStageMembers(result.value.stageId, ServerStageEvents.STAGE_MEMBER_TRACK_CHANGED, {
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
            this._db.collection<Stage>(Collections.STAGES).findOne({_id: stageId}, {projection: {admins: 1}}).then(stage => stage.admins),
            this._db.collection<StageMember>(Collections.STAGE_MEMBERS).find({stage: stageId}, {projection: {user: 1}}).toArray().then(stageMembers => stageMembers.map(stageMember => stageMember.userId))
        ])
            .then(result => Set<UserId>([...result[0], ...result[1]]).toArray())
            .then(userIds => userIds.forEach(userId => this.sendToUser(userId, event, payload)));
    }

    sendToStageManagers(stageId: StageId, event: string, payload?: any): Promise<void> {
        return this._db.collection(Collections.STAGES).findOne({_id: stageId}, {projection: {admins: 1}})
            .then(stage => stage.admins.forEach(admin => this.sendToUser(admin, event, payload)));
    }

    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any): Promise<void> {
        return this._db.collection(Collections.USERS).find({stage: stageId}, {projection: {_id: 1}}).toArray()
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