import { Db, MongoClient, ObjectId } from "mongodb";
import { ITeckosProvider, ITeckosSocket } from "teckos";
import * as EventEmitter from "events";
import {
  CustomStageMemberVolume,
  CustomRemoteAudioProducerVolume,
  CustomRemoteOvTrackPosition,
  Device,
  GlobalAudioProducer,
  GlobalVideoProducer,
  Group,
  InitialStagePackage,
  SoundCard,
  Stage,
  StageMember,
  RemoteAudioProducer,
  RemoteOvTrack,
  RemoteVideoProducer,
  StagePackage,
  OvTrack,
  User,
  Router,
  CustomStageMemberPosition,
  CustomGroupVolume,
  CustomGroupPosition,
} from "../types";
import {
  ServerDeviceEvents,
  ServerRouterEvents,
  ServerStageEvents,
  ServerUserEvents,
} from "../events";
import { IRealtimeDatabase } from "./IRealtimeDatabase";
import { DEBUG_EVENTS, DEBUG_PAYLOAD } from "../env";
import logger from "../logger";
import generateColor from "../util/generateColor";
import {
  CustomGroupId,
  CustomRemoteOvTrackId,
  DeviceId,
  GlobalAudioProducerId,
  GlobalVideoProducerId,
  GroupId,
  OvTrackId,
  RemoteAudioProducerId,
  RemoteOvTrackId,
  RemoteVideoProducerId,
  RouterId,
  SoundCardId,
  StageId,
  StageMemberId,
  UserId,
} from "../types/IdTypes";
import ThreeDimensionProperties from "../types/ThreeDimensionProperties";
import { CustomRemoteOvTrackVolume } from "../types/CustomRemoteOvTrackVolume";
import { CustomRemoteAudioProducerPosition } from "../types/CustomRemoteAudioProducerPosition";

const { info, error, trace, warn } = logger("database");

export enum Collections {
  ROUTERS = "r",

  USERS = "u",

  DEVICES = "d",
  SOUND_CARDS = "sc",
  TRACK_PRESETS = "tp",
  TRACKS = "t",
  AUDIO_PRODUCERS = "ap",
  VIDEO_PRODUCERS = "vp",

  STAGES = "s",
  GROUPS = "g",
  CUSTOM_GROUP_POSITIONS = "c_g_p",
  CUSTOM_GROUP_VOLUMES = "c_g_v",
  STAGE_MEMBERS = "sm",
  CUSTOM_STAGE_MEMBER_POSITIONS = "c_sm_p",
  CUSTOM_STAGE_MEMBER_VOLUMES = "c_sm_v",
  REMOTE_AUDIO_PRODUCERS = "r_ap",
  REMOTE_VIDEO_PRODUCERS = "r_vp",
  REMOTE_OV_TRACKS = "r_ov",
  CUSTOM_REMOTE_AUDIO_POSITIONS = "c_r_ap_p",
  CUSTOM_REMOTE_AUDIO_VOLUMES = "c_r_ap_v",
  CUSTOM_REMOTE_OV_POSITIONS = "c_r_ov_p",
  CUSTOM_REMOTE_OV_VOLUMES = "c_r_ov_v",
}

class MongoRealtimeDatabase
  extends EventEmitter.EventEmitter
  implements IRealtimeDatabase {
  private _mongoClient: MongoClient;

  private _db: Db;

  private readonly _io: ITeckosProvider;

  constructor(
    io: ITeckosProvider,
    url: string,
    certificate?: ReadonlyArray<Buffer | string>
  ) {
    super();
    this._io = io;
    this._mongoClient = new MongoClient(url, {
      poolSize: 10,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      // useUnifiedTopology: true,
      sslValidate: !!certificate,
      sslCA: certificate,
    });
  }

  async connect(database: string): Promise<void> {
    if (this._mongoClient.isConnected()) {
      warn("Reconnecting");
      await this.disconnect();
    }
    this._mongoClient = await this._mongoClient.connect();
    this._db = this._mongoClient.db(database);
    if (this._mongoClient.isConnected()) {
      info(`Connected to ${database}`);
      await this.prepareDatabase();
      info(`Prepared ${database}`);
    }
    // TODO: Clean up old devices etc.
  }

  private prepareDatabase() {
    return Promise.all([
      this._db
        .collection<Router>(Collections.ROUTERS)
        .createIndex({ server: 1 }),
      this._db
        .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
        .createIndex({ globalProducerId: 1 }),
      this._db
        .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
        .createIndex({ globalProducerId: 1 }),
      this._db
        .collection<CustomRemoteOvTrackVolume>(
          Collections.CUSTOM_REMOTE_OV_VOLUMES
        )
        .createIndex({ ovTrackId: 1 }),
      this._db
        .collection<CustomRemoteOvTrackPosition>(
          Collections.CUSTOM_REMOTE_OV_POSITIONS
        )
        .createIndex({ ovTrackId: 1 }),
      this._db.collection<Stage>(Collections.STAGES).createIndex({ admins: 1 }),
      this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<SoundCard>(Collections.SOUND_CARDS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<Device>(Collections.DEVICES)
        .createIndex({ userId: 1 }),
      this._db
        .collection<Device>(Collections.DEVICES)
        .createIndex({ server: 1 }),
      this._db
        .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
        .createIndex({ deviceId: 1 }),
      this._db
        .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
        .createIndex({ deviceId: 1 }),
      this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
        .createIndex({ globalProducerId: 1 }),
      this._db
        .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<OvTrack>(Collections.TRACKS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<Group>(Collections.GROUPS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<Stage>(Collections.STAGES)
        .createIndex({ "ovServer.router": 1 }),
      this._db
        .collection<Stage>(Collections.STAGES)
        .createIndex({ ovServer: 1 }),
      this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
        .createIndex({ userId: 1, groupId: 1 }),
      this._db
        .collection<CustomGroupPosition>(Collections.CUSTOM_GROUP_POSITIONS)
        .createIndex({ userId: 1, groupId: 1 }),
      this._db
        .collection<CustomStageMemberVolume>(
          Collections.CUSTOM_STAGE_MEMBER_VOLUMES
        )
        .createIndex({ userId: 1, stageMemberId: 1 }),
      this._db
        .collection<CustomGroupPosition>(
          Collections.CUSTOM_STAGE_MEMBER_POSITIONS
        )
        .createIndex({ userId: 1, stageMemberId: 1 }),
      this._db
        .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<CustomRemoteAudioProducerVolume>(
          Collections.CUSTOM_REMOTE_AUDIO_VOLUMES
        )
        .createIndex({ userId: 1, remoteAudioProducerId: 1 }),
      this._db
        .collection<CustomRemoteAudioProducerPosition>(
          Collections.CUSTOM_REMOTE_AUDIO_POSITIONS
        )
        .createIndex({ userId: 1, remoteAudioProducerId: 1 }),
      this._db
        .collection<RemoteOvTrack>(Collections.TRACKS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<CustomRemoteOvTrackVolume>(
          Collections.CUSTOM_REMOTE_OV_VOLUMES
        )
        .createIndex({ userId: 1, remoteOvTrackId: 1 }),
      this._db
        .collection<CustomRemoteOvTrackPosition>(
          Collections.CUSTOM_REMOTE_OV_POSITIONS
        )
        .createIndex({ userId: 1, remoteOvTrackId: 1 }),
      this._db
        .collection<Group>(Collections.GROUPS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .createIndex({ groupId: 1 }),
      this._db
        .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
        .createIndex({ groupId: 1 }),
      this._db
        .collection<CustomGroupPosition>(Collections.CUSTOM_GROUP_POSITIONS)
        .createIndex({ groupId: 1 }),
      this._db
        .collection<Device>(Collections.DEVICES)
        .createIndex({ userId: 1, soundCardNames: 1 }),
      this._db
        .collection<OvTrack>(Collections.TRACKS)
        .createIndex({ soundCardId: 1 }),
      this._db
        .collection<CustomStageMemberVolume>(
          Collections.CUSTOM_STAGE_MEMBER_VOLUMES
        )
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<CustomStageMemberPosition>(
          Collections.CUSTOM_STAGE_MEMBER_POSITIONS
        )
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<CustomRemoteOvTrackVolume>(
          Collections.CUSTOM_REMOTE_OV_VOLUMES
        )
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<CustomRemoteOvTrackPosition>(
          Collections.CUSTOM_REMOTE_OV_POSITIONS
        )
        .createIndex({ stageMemberId: 1 }),
      this._db
        .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
        .createIndex({ trackId: 1 }),
      this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<Group>(Collections.GROUPS)
        .createIndex({ stageId: 1 }),
      this._db
        .collection<SoundCard>(Collections.SOUND_CARDS)
        .createIndex({ userId: 1 }),
      this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .createIndex({ stageId: 1 }),
      this._db.collection<User>(Collections.USERS).createIndex({ stageId: 1 }),
      this._db
        .collection<Group>(Collections.GROUPS)
        .createIndex({ stageId: 1 }),
    ]);
  }

  disconnect() {
    return this._mongoClient.close();
  }

  cleanUp(serverAddress: string): Promise<any> {
    return Promise.all([
      this.readDevicesByServer(serverAddress).then((devices) =>
        devices.map((device) =>
          this.deleteDevice(device._id).then(() =>
            trace(`Clean up: Removed device ${device._id}`)
          )
        )
      ),
      this.readRoutersByServer(serverAddress).then((routers) =>
        routers.map((router) =>
          this.deleteRouter(router._id).then(() =>
            trace(`Clean up: Removed router ${router._id}`)
          )
        )
      ),
      this.cleanUpStages(),
    ]);
  }

  cleanUpStages(): Promise<any> {
    return this._db
      .collection<Stage>(Collections.STAGES)
      .find({ ovServer: { $exists: true, $ne: null } })
      .toArray()
      .then((stages) =>
        Promise.all(
          stages.map((stage) =>
            this._db
              .collection<Router>(Collections.ROUTERS)
              .findOne({ _id: stage.ovServer.router })
              .then((result) => {
                if (!result) {
                  trace(
                    `Clean up: Removing abandoned ov server from stage ${stage._id}`
                  );
                  return this.updateStage(stage._id, { ovServer: null });
                }
                return null;
              })
          )
        )
      );
  }

  createRouter(initial: Omit<Router, "_id">): Promise<Router> {
    return this._db
      .collection<Router>(Collections.ROUTERS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((router: Router) => {
        this.emit(ServerRouterEvents.ROUTER_ADDED, router);
        return router;
      });
  }

  readRouter(id: ObjectId): Promise<Router | null> {
    return this._db.collection<Router>(Collections.ROUTERS).findOne({
      _id: id,
    });
  }

  readRouters(): Promise<Router[]> {
    return this._db.collection<Router>(Collections.ROUTERS).find().toArray();
  }

  readRoutersByServer(serverAddress: string): Promise<Router[]> {
    return this._db
      .collection<Router>(Collections.ROUTERS)
      .find({
        server: serverAddress,
      })
      .toArray();
  }

  updateRouter(
    id: RouterId,
    update: Partial<Omit<Router, "_id">>
  ): Promise<any> {
    return this._db
      .collection<Router>(Collections.ROUTERS)
      .findOneAndUpdate({ _id: id }, { $set: update })
      .then(() =>
        this.emit(ServerRouterEvents.ROUTER_CHANGED, {
          ...update,
          _id: id,
        })
      );
  }

  deleteRouter(id: ObjectId): Promise<any> {
    return this._db
      .collection<Router>(Collections.ROUTERS)
      .deleteOne({ _id: id })
      .then((result) => {
        if (result.deletedCount > 0) {
          this.emit(ServerRouterEvents.ROUTER_REMOVED, id);
          return this.readStagesByRouter(id).then((stages) =>
            Promise.all(
              stages.map((stage) =>
                this.updateStage(stage._id, { ovServer: null })
              )
            )
          );
        }
        throw new Error(`Could not find and delete router ${id}`);
      });
  }

  db() {
    return this._db;
  }

  renewOnlineStatus(userId: UserId): Promise<void> {
    // Has the user online devices?
    return this._db
      .collection<User>(Collections.USERS)
      .findOne({ _id: userId }, { projection: { stageMemberId: 1 } })
      .then((user) => {
        if (user.stageMemberId) {
          // Use is inside stage
          return this._db
            .collection<Device>(Collections.DEVICES)
            .countDocuments({
              userId,
              online: true,
            })
            .then((numDevicesOnline) => {
              if (numDevicesOnline > 0) {
                // User is online
                return this.updateStageMember(user.stageMemberId, {
                  online: true,
                });
              }
              // User has no more online devices
              return this.updateStageMember(user.stageMemberId, {
                online: false,
              });
            });
        }
        return null;
      });
  }

  createAudioProducer(
    initial: Omit<GlobalAudioProducer, "_id">
  ): Promise<GlobalAudioProducer> {
    return this._db
      .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((producer) => {
        this.emit(ServerDeviceEvents.AUDIO_PRODUCER_ADDED, producer);
        this.sendToUser(
          initial.userId,
          ServerDeviceEvents.AUDIO_PRODUCER_ADDED,
          producer
        );
        // Publish producer?
        return this.readUser(initial.userId)
          .then((user) => {
            if (user.stageMemberId) {
              return this.createRemoteAudioProducer({
                stageMemberId: user.stageMemberId,
                globalProducerId: producer._id,
                volume: 1,
                muted: false,
                x: 0,
                y: 0,
                z: 0,
                rX: 0,
                rY: 0,
                rZ: 0,
                userId: user._id,
                stageId: user.stageId,
                online: true,
              });
            }
            throw new Error("User is not inside a stage");
          })
          .then(() => producer);
      });
  }

  readAudioProducer(id: GlobalAudioProducerId): Promise<GlobalAudioProducer> {
    return this._db
      .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
      .findOne({
        _id: id,
      });
  }

  updateAudioProducer(
    deviceId: StageMemberId,
    id: GlobalAudioProducerId,
    update: Partial<Omit<GlobalAudioProducer, "_id">>
  ): Promise<void> {
    return this._db
      .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
      .findOneAndUpdate(
        {
          _id: id,
          deviceId,
        },
        {
          $set: update,
        },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerDeviceEvents.AUDIO_PRODUCER_CHANGED, payload);
          return this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.AUDIO_PRODUCER_CHANGED,
            payload
          );
        }
        throw new Error(`Could not find and update audio producer ${id}`);
      });
  }

  deleteAudioProducer(userId: UserId, id: GlobalAudioProducerId): Promise<any> {
    return this._db
      .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
      .findOneAndDelete(
        {
          userId,
          _id: id,
        },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerDeviceEvents.AUDIO_PRODUCER_REMOVED, id);
          this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.AUDIO_PRODUCER_REMOVED,
            id
          );
          // Also delete all published producers
          return this._db
            .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
            .find(
              {
                globalProducerId: id,
              },
              { projection: { _id: 1 } }
            )
            .toArray()
            .then((globalProducers) =>
              Promise.all(
                globalProducers.map((globalProducer) =>
                  this.deleteRemoteAudioProducer(globalProducer._id)
                )
              )
            );
        }
        throw new Error(`Could not find and delete audio producer ${id}`);
      });
  }

  createVideoProducer(
    initial: Omit<GlobalVideoProducer, "_id">
  ): Promise<GlobalVideoProducer> {
    return this._db
      .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((producer) => {
        this.emit(ServerDeviceEvents.VIDEO_PRODUCER_ADDED, producer);
        this.sendToUser(
          initial.userId,
          ServerDeviceEvents.VIDEO_PRODUCER_ADDED,
          producer
        );
        // Publish producer?
        return this.readUser(initial.userId)
          .then((user) => {
            if (user.stageMemberId) {
              return this.createRemoteVideoProducer({
                stageMemberId: user.stageMemberId,
                globalProducerId: producer._id,
                userId: user._id,
                stageId: user.stageId,
                online: true,
              });
            }
            return null;
          })
          .then(() => producer);
      });
  }

  readVideoProducer(id: GlobalVideoProducerId): Promise<GlobalVideoProducer> {
    return this._db
      .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
      .findOne({
        _id: id,
      })
      .then((result) => result);
  }

  updateVideoProducer(
    deviceId: DeviceId,
    id: GlobalVideoProducerId,
    update: Partial<Omit<GlobalVideoProducer, "_id">>
  ): Promise<void> {
    return this._db
      .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
      .findOneAndUpdate(
        {
          _id: id,
          deviceId,
        },
        {
          $set: update,
        },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerDeviceEvents.VIDEO_PRODUCER_CHANGED, payload);
          return this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.VIDEO_PRODUCER_CHANGED,
            payload
          );
        }
        throw new Error(`Could not find and update video producer ${id}`);
      });
  }

  deleteVideoProducer(userId: UserId, id: GlobalVideoProducerId): Promise<any> {
    return this._db
      .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
      .findOneAndDelete(
        {
          userId,
          _id: id,
        },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerDeviceEvents.VIDEO_PRODUCER_REMOVED, id);
          this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.VIDEO_PRODUCER_REMOVED,
            id
          );
          // Also delete all published producers
          return this._db
            .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
            .find(
              {
                globalProducerId: id,
              },
              { projection: { _id: 1 } }
            )
            .toArray()
            .then((globalProducers) =>
              Promise.all(
                globalProducers.map((globalProducer) =>
                  this.deleteRemoteVideoProducer(globalProducer._id)
                )
              )
            );
        }
        throw new Error(`Could not find and delete video producer ${id}`);
      });
  }

  createRemoteOvTrack(
    initial: Omit<RemoteOvTrack, "_id">
  ): Promise<RemoteOvTrack> {
    return this._db
      .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((track) => {
        this.emit(ServerStageEvents.STAGE_MEMBER_OV_ADDED, track);
        return this.sendToJoinedStageMembers(
          initial.stageId,
          ServerStageEvents.STAGE_MEMBER_OV_ADDED,
          track
        ).then(() => track);
      });
  }

  readRemoteOvTrack(id: CustomRemoteOvTrackId): Promise<RemoteOvTrack> {
    return this._db
      .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
      .findOne({
        _id: id,
      });
  }

  updateRemoteOvTrack(
    id: CustomRemoteOvTrackId,
    update: Partial<Omit<RemoteOvTrack, "_id">>
  ): Promise<void> {
    return this._db
      .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
      .findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: update,
        },
        { projection: { stageId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerStageEvents.STAGE_MEMBER_OV_CHANGED, payload);
          return this.sendToJoinedStageMembers(
            result.value.stageId,
            ServerStageEvents.STAGE_MEMBER_OV_CHANGED,
            payload
          );
        }
        throw new Error(
          `Could not find and update stage member ov track ${id}`
        );
      });
  }

  deleteRemoteOvTrack(id: OvTrackId): Promise<any> {
    return this._db
      .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
      .findOneAndDelete({
        _id: id,
      })
      .then((result) => {
        if (result.value) {
          this.emit(
            ServerStageEvents.STAGE_MEMBER_OV_REMOVED,
            result.value._id
          );
          return Promise.all([
            // Delete all stage member tracks
            this._db
              .collection<CustomRemoteOvTrackVolume>(
                Collections.CUSTOM_REMOTE_OV_VOLUMES
              )
              .find({ ovTrackId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((tracks) =>
                tracks.map((track) =>
                  this.deleteCustomRemoteOvTrackVolume(track._id)
                )
              ),
            this._db
              .collection<CustomRemoteOvTrackPosition>(
                Collections.CUSTOM_REMOTE_OV_POSITIONS
              )
              .find({ ovTrackId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((tracks) =>
                tracks.map((track) =>
                  this.deleteCustomRemoteOvTrackPosition(track._id)
                )
              ),
            this.sendToJoinedStageMembers(
              result.value.stageId,
              ServerStageEvents.STAGE_MEMBER_OV_REMOVED,
              result.value._id
            ),
          ]);
        }
        throw new Error(
          `Could not find and delete stage member ov track ${id}`
        );
      });
  }

  createRemoteAudioProducer(
    initial: Omit<RemoteAudioProducer, "_id">
  ): Promise<RemoteAudioProducer> {
    return this._db
      .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((producer) => {
        this.emit(ServerStageEvents.STAGE_MEMBER_AUDIO_ADDED, producer);
        return this.sendToJoinedStageMembers(
          initial.stageId,
          ServerStageEvents.STAGE_MEMBER_AUDIO_ADDED,
          producer
        ).then(() => producer);
      });
  }

  readRemoteAudioProducer(
    id: RemoteAudioProducerId
  ): Promise<RemoteAudioProducer> {
    return this._db
      .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
      .findOne({
        _id: id,
      });
  }

  updateRemoteAudioProducer(
    id: RemoteAudioProducerId,
    update: Partial<Omit<RemoteAudioProducer, "_id">>
  ): Promise<void> {
    return this._db
      .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
      .findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: update,
        },
        { projection: { stageId: 1 } }
      )
      .then(async (result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerStageEvents.STAGE_MEMBER_AUDIO_CHANGED, payload);
          await this.sendToJoinedStageMembers(
            result.value.stageId,
            ServerStageEvents.STAGE_MEMBER_AUDIO_CHANGED,
            payload
          );
        }
        throw new Error(
          `Could not find and update stage member audio producer ${id}`
        );
      });
  }

  deleteRemoteAudioProducer(id: RemoteAudioProducerId): Promise<void> {
    return this._db
      .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
      .findOneAndDelete(
        {
          _id: id,
        },
        { projection: { stageId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerStageEvents.STAGE_MEMBER_AUDIO_REMOVED, id);
          return this.sendToJoinedStageMembers(
            result.value.stageId,
            ServerStageEvents.STAGE_MEMBER_AUDIO_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete stage member audio producer ${id}`
        );
      });
  }

  createRemoteVideoProducer(
    initial: Omit<RemoteVideoProducer, "_id">
  ): Promise<RemoteVideoProducer> {
    return this._db
      .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((producer) => {
        this.emit(ServerStageEvents.STAGE_MEMBER_VIDEO_ADDED, producer);
        return this.sendToJoinedStageMembers(
          initial.stageId,
          ServerStageEvents.STAGE_MEMBER_VIDEO_ADDED,
          producer
        ).then(() => producer);
      });
  }

  readRemoteVideoProducer(
    id: RemoteVideoProducerId
  ): Promise<RemoteVideoProducer> {
    return this._db
      .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
      .findOne({
        _id: id,
      });
  }

  updateRemoteVideoProducer(
    id: RemoteVideoProducerId,
    update: Partial<Omit<RemoteVideoProducer, "_id">>
  ): Promise<void> {
    return this._db
      .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
      .findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: update,
        },
        { projection: { stageId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerStageEvents.STAGE_MEMBER_VIDEO_CHANGED, payload);
          return this.sendToJoinedStageMembers(
            result.value.stageId,
            ServerStageEvents.STAGE_MEMBER_VIDEO_CHANGED,
            payload
          );
        }
        throw new Error(
          `Could not find and update stage member video producer ${id}`
        );
      });
  }

  deleteRemoteVideoProducer(id: RemoteVideoProducerId): Promise<void> {
    return this._db
      .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
      .findOneAndDelete(
        {
          _id: id,
        },
        { projection: { stageId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerStageEvents.STAGE_MEMBER_VIDEO_REMOVED, id);
          return this.sendToJoinedStageMembers(
            result.value.stageId,
            ServerStageEvents.STAGE_MEMBER_VIDEO_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete stage member video producer ${id}`
        );
      });
  }

  createUser(
    initial: Omit<User, "_id" | "stageId" | "stageMemberId">
  ): Promise<User> {
    return this._db
      .collection<User>(Collections.USERS)
      .insertOne(initial)
      .then((result) => result.ops[0])
      .then((user) => {
        this.emit(ServerUserEvents.USER_ADDED, user);
        return user;
      });
  }

  readUser(id: UserId): Promise<User | null> {
    return this._db.collection<User>(Collections.USERS).findOne({ _id: id });
  }

  readUserByUid(uid: string): Promise<User | null> {
    return this._db.collection<User>(Collections.USERS).findOne({ uid });
  }

  updateUser(id: UserId, update: Partial<Omit<User, "_id">>): Promise<void> {
    return this._db
      .collection<User>(Collections.USERS)
      .updateOne({ _id: id }, { $set: update })
      .then(() => {
        // TODO: Update all associated (Stage Members), too
        const payload = {
          ...update,
          _id: id,
        };
        this.emit(ServerUserEvents.USER_CHANGED, payload);
        return this.sendToUser(id, ServerUserEvents.USER_CHANGED, payload);
      });
  }

  deleteUser(id: UserId): Promise<any> {
    return this._db
      .collection<User>(Collections.USERS)
      .deleteOne({ _id: id })
      .then((result) => {
        if (result.deletedCount > 0) {
          return this.emit(ServerUserEvents.USER_REMOVED, id);
        }
        throw new Error(`Could not find and delete user ${id}`);
      })
      .then(() =>
        Promise.all([
          this._db
            .collection<Stage>(Collections.STAGES)
            .find({ admins: [id] }, { projection: { _id: 1 } })
            .toArray()
            .then((stages) => stages.map((s) => this.deleteStage(s._id))),
          this._db
            .collection<StageMember>(Collections.STAGE_MEMBERS)
            .find({ userId: id }, { projection: { _id: 1 } })
            .toArray()
            .then((stageMembers) =>
              stageMembers.map((stageMember) =>
                this.deleteStageMember(stageMember._id)
              )
            ),
          this._db
            .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
            .find({ userId: id }, { projection: { _id: 1 } })
            .toArray()
            .then((producers) =>
              producers.map((producer) =>
                this.deleteAudioProducer(id, producer._id)
              )
            ),
          this._db
            .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
            .find({ userId: id }, { projection: { _id: 1 } })
            .toArray()
            .then((producers) =>
              producers.map((producer) =>
                this.deleteVideoProducer(id, producer._id)
              )
            ),
          this._db
            .collection<SoundCard>(Collections.SOUND_CARDS)
            .find({ userId: id }, { projection: { _id: 1 } })
            .toArray()
            .then((soundCards) =>
              soundCards.map((soundCard) =>
                this.deleteSoundCard(id, soundCard._id)
              )
            ),
        ])
      );
  }

  createDevice(init: Omit<Device, "_id">): Promise<Device> {
    return this._db
      .collection(Collections.DEVICES)
      .insertOne(init)
      .then((result) => result.ops[0])
      .then((device) => {
        this.emit(ServerDeviceEvents.DEVICE_ADDED, device);
        this.sendToUser(init.userId, ServerDeviceEvents.DEVICE_ADDED, device);
        return this.renewOnlineStatus(init.userId).then(() => device);
      });
  }

  readDevicesByUser(userId: UserId): Promise<Device[]> {
    return this._db
      .collection<Device>(Collections.DEVICES)
      .find({ userId })
      .toArray();
  }

  readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device | null> {
    return this._db
      .collection<Device>(Collections.DEVICES)
      .findOne({ userId, mac });
  }

  readDevice(id: DeviceId): Promise<Device | null> {
    return this._db
      .collection<Device>(Collections.DEVICES)
      .findOne({ _id: id });
  }

  readDevicesByServer(server: string): Promise<Device[]> {
    return this._db
      .collection<Device>(Collections.DEVICES)
      .find({ server })
      .toArray();
  }

  updateDevice(
    userId: UserId,
    id: DeviceId,
    update: Partial<Omit<Device, "_id">>
  ): Promise<void> {
    // Update first ;)
    const payload = {
      ...update,
      userId,
      _id: id,
    };
    this.emit(ServerDeviceEvents.DEVICE_CHANGED, payload);
    this.sendToUser(userId, ServerDeviceEvents.DEVICE_CHANGED, payload);
    return this._db
      .collection<Device>(Collections.DEVICES)
      .updateOne({ _id: id }, { $set: update })
      .then((result) => {
        if (result.modifiedCount > 0) {
          return this.renewOnlineStatus(userId);
        }
        return null;
      });
  }

  deleteDevice(id: DeviceId): Promise<any> {
    return this._db
      .collection<Device>(Collections.DEVICES)
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(ServerDeviceEvents.DEVICE_REMOVED, id);
          this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.DEVICE_REMOVED,
            id
          );
          // Delete associated producers
          return Promise.all([
            this._db
              .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
              .find(
                {
                  deviceId: id,
                },
                { projection: { _id: 1, userId: 1 } }
              )
              .toArray()
              .then((producers) =>
                producers.map((producer) =>
                  this.deleteVideoProducer(producer.userId, producer._id)
                )
              ),
            this._db
              .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
              .find(
                {
                  deviceId: id,
                },
                { projection: { _id: 1, userId: 1 } }
              )
              .toArray()
              .then((producers) =>
                producers.map((producer) =>
                  this.deleteAudioProducer(producer.userId, producer._id)
                )
              ),
            this.renewOnlineStatus(result.value.userId),
          ]);
        }
        throw new Error(`Could not find and delete device ${id}`);
      });
  }

  createStage(init: Partial<Omit<Stage, "_id">>): Promise<Stage> {
    const initialStage: Omit<Stage, "_id"> = {
      name: "",
      password: "",
      width: 13,
      length: 25,
      height: 7.5,
      absorption: 0.6,
      damping: 0.7,
      admins: [],
      renderAmbient: false,
      ambientLevel: 1,
      ...init,
    };
    return this._db
      .collection<Stage>(Collections.STAGES)
      .insertOne(initialStage)
      .then((result) => {
        this.emit(ServerStageEvents.STAGE_ADDED, initialStage);
        initialStage.admins.forEach((adminId) =>
          this.sendToUser(adminId, ServerStageEvents.STAGE_ADDED, initialStage)
        );
        return result.ops[0];
      });
  }

  async joinStage(
    userId: UserId,
    stageId: StageId,
    groupId: GroupId,
    password?: string
  ): Promise<void> {
    const startTime = Date.now();

    const user: User = await this.readUser(userId);
    const stage: Stage = await this.readStage(stageId);

    if (stage.password && stage.password !== password) {
      throw new Error("Invalid password");
    }

    const isAdmin: boolean =
      stage.admins.find((admin) => admin.equals(userId)) !== undefined;
    const previousStageMemberId = user.stageMemberId;

    let stageMember = await this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .findOne({
        userId: user._id,
        stageId: stage._id,
      });

    const wasUserAlreadyInStage = stageMember !== null;
    if (!stageMember) {
      // Create stage member
      const ovStageDeviceId = await this._db
        .collection<StageMember>(Collections.STAGE_MEMBERS)
        .find({ stageId })
        .toArray()
        .then((stageMembers) => {
          if (stageMembers) {
            for (let i = 0; i < 30; i += 1) {
              if (
                !stageMembers.find((current) => current.ovStageDeviceId === i)
              ) {
                return i;
              }
            }
            return -1;
          }
          return 0;
        });
      if (ovStageDeviceId === -1)
        throw new Error("No more members possible, max of 30 reached");
      stageMember = await this.createStageMember({
        userId: user._id,
        stageId: stage._id,
        groupId,
        online: true,
        isDirector: false,
        volume: 1,
        muted: false,
        x: 0,
        y: -1,
        z: 0,
        rX: 0,
        rY: 0,
        rZ: -180,
        sendlocal: false,
        ovStageDeviceId,
      });
      // Also create a custom stage member for the same user and mute it per default
      await this.setCustomStageMemberVolume(userId, stageMember._id, {
        muted: true,
      });
    } else if (!stageMember.groupId.equals(groupId) || !stageMember.online) {
      // Update stage member
      stageMember.online = true;
      stageMember.groupId = groupId;
      await this.updateStageMember(stageMember._id, {
        groupId,
        online: true,
      });
      // Always mute the custom stage member
      await this.setCustomStageMemberVolume(userId, stageMember._id, {
        muted: true,
      });
    }

    // Update user
    if (
      !previousStageMemberId ||
      !previousStageMemberId.equals(stageMember._id)
    ) {
      user.stageId = stage._id;
      user.stageMemberId = stageMember._id;
      await this.updateUser(user._id, {
        stageId: stage._id,
        stageMemberId: stageMember._id,
      });
      this.emit(ServerStageEvents.STAGE_LEFT, user._id);
      this.sendToUser(user._id, ServerStageEvents.STAGE_LEFT);
    }

    // Send whole stage
    await this.getWholeStage(
      user._id,
      stage._id,
      isAdmin || wasUserAlreadyInStage
    ).then((wholeStage) => {
      this.emit(ServerStageEvents.STAGE_JOINED, {
        ...wholeStage,
        stageId: stage._id,
        groupId,
        user: user._id,
      });
      return this.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, {
        ...wholeStage,
        stageId: stage._id,
        groupId,
      });
    });

    if (
      !previousStageMemberId ||
      !previousStageMemberId.equals(stageMember._id)
    ) {
      if (previousStageMemberId) {
        // Set old stage member offline (async!)
        await this.updateStageMember(previousStageMemberId, { online: false });
        // Set old stage member tracks offline (async!)
        // Remove stage member related audio and video
        await this._db
          .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
          .find({
            stageMemberId: previousStageMemberId,
          })
          .toArray()
          .then((producers) =>
            producers.map((producer) =>
              this.deleteRemoteAudioProducer(producer._id)
            )
          );
        await this._db
          .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
          .find({
            stageMemberId: previousStageMemberId,
          })
          .toArray()
          .then((producers) =>
            producers.map((producer) =>
              this.deleteRemoteVideoProducer(producer._id)
            )
          );
        await this._db
          .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
          .find({
            stageMemberId: previousStageMemberId,
          })
          .toArray()
          .then((tracks) =>
            tracks.map((track) =>
              this.updateRemoteOvTrack(track._id, {
                online: false,
              })
            )
          );
      }

      // Create stage related audio and video producers
      await this._db
        .collection<GlobalVideoProducer>(Collections.VIDEO_PRODUCERS)
        .find({ userId }, { projection: { _id: 1 } })
        .toArray()
        .then((producers) =>
          producers.map((producer) =>
            this.createRemoteVideoProducer({
              stageMemberId: user.stageMemberId,
              globalProducerId: producer._id,
              userId: user._id,
              stageId: user.stageId,
              online: true,
            })
          )
        );

      await this._db
        .collection<GlobalAudioProducer>(Collections.AUDIO_PRODUCERS)
        .find({ userId }, { projection: { _id: 1 } })
        .toArray()
        .then((producers) =>
          producers.map((producer) =>
            this.createRemoteAudioProducer({
              stageMemberId: user.stageMemberId,
              globalProducerId: producer._id,
              userId: user._id,
              stageId: user.stageId,
              online: true,
              volume: 1,
              muted: false,
              x: 0,
              y: 0,
              z: 0,
              rX: 0,
              rY: 0,
              rZ: 0,
            })
          )
        );

      await this._db
        .collection<OvTrack>(Collections.TRACKS)
        .find({ userId }, { projection: { _id: 1 } })
        .toArray()
        .then((tracks) =>
          tracks.map((track) =>
            this.createRemoteOvTrack({
              channel: track.channel,
              ovTrackId: track._id,
              userId: user._id,
              stageId: user.stageId,
              stageMemberId: user.stageMemberId,
              online: true,
              volume: 1,
              muted: false,
              directivity: "omni",
              x: 0,
              y: 0,
              z: 0,
              rX: 0,
              rY: 0,
              rZ: 0,
            })
          )
        );
    }

    trace(`joinStage: ${Date.now() - startTime}ms`);
  }

  async leaveStage(userId: UserId): Promise<any> {
    const startTime = Date.now();
    const user: User = await this.readUser(userId);

    if (user.stageId) {
      const previousStageMemberId = user.stageMemberId;

      // Leave the user <-> stage member connection
      user.stageId = undefined;
      user.stageMemberId = undefined;
      await this.updateUser(user._id, {
        stageId: undefined,
        stageMemberId: undefined,
      });
      this.emit(ServerStageEvents.STAGE_LEFT, user._id);
      this.sendToUser(user._id, ServerStageEvents.STAGE_LEFT);

      // Set old stage member offline (async!)
      await this.updateStageMember(previousStageMemberId, { online: false });

      // Remove old stage member related video and audio
      await Promise.all([
        this._db
          .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
          .find({
            stageMemberId: previousStageMemberId,
          })
          .toArray()
          .then((producers) =>
            producers.map((producer) =>
              this.deleteRemoteAudioProducer(producer._id)
            )
          ),
        this._db
          .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
          .find({
            stageMemberId: previousStageMemberId,
          })
          .toArray()
          .then((producers) =>
            producers.map((producer) =>
              this.deleteRemoteVideoProducer(producer._id)
            )
          ),
        // Set tracks offline
        this._db
          .collection<RemoteAudioProducer>(Collections.REMOTE_OV_TRACKS)
          .find({
            stageMemberId: previousStageMemberId,
          })
          .toArray()
          .then((tracks) =>
            tracks.map((track) =>
              this.updateRemoteOvTrack(track._id, {
                online: false,
              })
            )
          ),
      ]);
    }
    trace(`leaveStage: ${Date.now() - startTime}ms`);
  }

  leaveStageForGood(userId: UserId, stageId: StageId): Promise<any> {
    // TODO: Log out user if he's joined
    // Delete stage member
    return this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .findOne(
        {
          userId,
          stageId,
        },
        {
          projection: { _id: 1 },
        }
      )
      .then((stageMember) => {
        if (stageMember) {
          return this.deleteStageMember(stageMember._id)
            .then(() =>
              this._db
                .collection<Group>(Collections.GROUPS)
                .find(
                  {
                    stageId,
                  },
                  {
                    projection: { _id: 1 },
                  }
                )
                .toArray()
            )
            .then((groups) =>
              groups.map((group) =>
                this.sendToUser(
                  userId,
                  ServerStageEvents.GROUP_REMOVED,
                  group._id
                )
              )
            )
            .then(() =>
              this.sendToUser(userId, ServerStageEvents.STAGE_REMOVED, stageId)
            );
        }
        throw new Error(`User ${userId} was not joined inside ${stageId}`);
      });
  }

  readStage(id: StageId): Promise<Stage> {
    return this._db.collection<Stage>(Collections.STAGES).findOne({ _id: id });
  }

  readStagesByRouter(routerId: RouterId): Promise<Stage[]> {
    return this._db
      .collection<Stage>(Collections.STAGES)
      .find({ "ovServer.router": routerId })
      .toArray();
  }

  readStagesWithoutRouter(limit?: number): Promise<Stage[]> {
    if (limit) {
      return this._db
        .collection<Stage>(Collections.STAGES)
        .find({ ovServer: null })
        .limit(limit)
        .toArray();
    }
    return this._db
      .collection<Stage>(Collections.STAGES)
      .find({ ovServer: null })
      .toArray();
  }

  readManagedStage(userId: UserId, id: StageId): Promise<Stage> {
    return this._db.collection<Stage>(Collections.STAGES).findOne({
      _id: id,
      admins: userId,
    });
  }

  readManagedStageByGroupId(userId: UserId, id: GroupId): Promise<Stage> {
    return this._db
      .collection<Group>(Collections.GROUPS)
      .findOne({
        _id: id,
        admins: userId,
      })
      .then((group) => {
        if (group) {
          return this.readManagedStage(userId, group.stageId);
        }
        return null;
      });
  }

  private async getWholeStage(
    userId: UserId,
    stageId: StageId,
    skipStageAndGroups: boolean = false
  ): Promise<StagePackage> {
    const stage = await this._db
      .collection<Stage>(Collections.STAGES)
      .findOne({ _id: stageId });
    const groups = await this._db
      .collection<Group>(Collections.GROUPS)
      .find({ stageId })
      .toArray();
    const stageMembers = await this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .find({ stageId })
      .toArray();
    const stageMemberUserIds = stageMembers.map(
      (stageMember) => stageMember.userId
    );
    const users = await this._db
      .collection<User>(Collections.USERS)
      .find({ _id: { $in: stageMemberUserIds } })
      .toArray();
    const customGroupVolumes = await this._db
      .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
      .find({
        userId,
        groupId: { $in: groups.map((group) => group._id) },
      })
      .toArray();
    const customGroupPositions = await this._db
      .collection<CustomGroupPosition>(Collections.CUSTOM_GROUP_POSITIONS)
      .find({
        userId,
        groupId: { $in: groups.map((group) => group._id) },
      })
      .toArray();

    const customStageMemberVolumes: CustomStageMemberVolume[] = await this._db
      .collection<CustomStageMemberVolume>(
        Collections.CUSTOM_STAGE_MEMBER_VOLUMES
      )
      .find({
        userId,
        stageMemberId: {
          $in: stageMembers.map((stageMember) => stageMember._id),
        },
      })
      .toArray();
    const customStageMemberPositions: CustomStageMemberPosition[] = await this._db
      .collection<CustomStageMemberPosition>(
        Collections.CUSTOM_STAGE_MEMBER_POSITIONS
      )
      .find({
        userId,
        stageMemberId: {
          $in: stageMembers.map((stageMember) => stageMember._id),
        },
      })
      .toArray();
    const remoteVideoProducers: RemoteVideoProducer[] = await this._db
      .collection<RemoteVideoProducer>(Collections.REMOTE_VIDEO_PRODUCERS)
      .find({
        stageId,
      })
      .toArray();
    const remoteAudioProducers: RemoteAudioProducer[] = await this._db
      .collection<RemoteAudioProducer>(Collections.REMOTE_AUDIO_PRODUCERS)
      .find({
        stageId,
      })
      .toArray();
    const customRemoteAudioProducerVolumes: CustomRemoteAudioProducerVolume[] = await this._db
      .collection<CustomRemoteAudioProducerVolume>(
        Collections.CUSTOM_REMOTE_AUDIO_VOLUMES
      )
      .find({
        userId,
        remoteAudioProducerId: {
          $in: remoteAudioProducers.map((audioProducer) => audioProducer._id),
        },
      })
      .toArray();
    const customRemoteAudioProducerPositions: CustomRemoteAudioProducerPosition[] = await this._db
      .collection<CustomRemoteAudioProducerPosition>(
        Collections.CUSTOM_REMOTE_AUDIO_POSITIONS
      )
      .find({
        userId,
        remoteAudioProducerId: {
          $in: remoteAudioProducers.map((audioProducer) => audioProducer._id),
        },
      })
      .toArray();
    const remoteOvTracks: RemoteOvTrack[] = await this._db
      .collection<RemoteOvTrack>(Collections.TRACKS)
      .find({
        stageId,
      })
      .toArray();
    const customRemoteOvTrackVolumes: CustomRemoteOvTrackVolume[] = await this._db
      .collection<CustomRemoteOvTrackVolume>(
        Collections.CUSTOM_REMOTE_OV_VOLUMES
      )
      .find({
        userId,
        remoteOvTrackId: {
          $in: remoteOvTracks.map((ovTrack) => ovTrack._id),
        },
      })
      .toArray();
    const customRemoteOvTrackPositions: CustomRemoteOvTrackPosition[] = await this._db
      .collection<CustomRemoteOvTrackPosition>(
        Collections.CUSTOM_REMOTE_OV_POSITIONS
      )
      .find({
        userId,
        remoteOvTrackId: {
          $in: remoteOvTracks.map((ovTrack) => ovTrack._id),
        },
      })
      .toArray();

    if (skipStageAndGroups) {
      return {
        users,
        stageMembers,
        customGroupVolumes,
        customGroupPositions,
        customStageMemberVolumes,
        customStageMemberPositions,
        remoteVideoProducers,
        remoteAudioProducers,
        customRemoteAudioProducerVolumes,
        customRemoteAudioProducerPositions,
        remoteOvTracks,
        customRemoteOvTrackVolumes,
        customRemoteOvTrackPositions,
      };
    }
    return {
      users,
      stage,
      groups,
      stageMembers,
      customGroupVolumes,
      customGroupPositions,
      customStageMemberVolumes,
      customStageMemberPositions,
      remoteVideoProducers,
      remoteAudioProducers,
      customRemoteAudioProducerVolumes,
      customRemoteAudioProducerPositions,
      remoteOvTracks,
      customRemoteOvTrackVolumes,
      customRemoteOvTrackPositions,
    };
  }

  updateStage(id: StageId, update: Partial<Omit<Stage, "_id">>): Promise<void> {
    return this._db
      .collection(Collections.STAGES)
      .updateOne({ _id: id }, { $set: update })
      .then(() => {
        const payload = {
          ...update,
          _id: id,
        };
        this.emit(ServerStageEvents.STAGE_CHANGED, payload);
        return this.sendToStage(id, ServerStageEvents.STAGE_CHANGED, payload);
      });
  }

  deleteStage(id: StageId): Promise<any> {
    return this._db
      .collection<Group>(Collections.GROUPS)
      .find({ stageId: id }, { projection: { _id: 1 } })
      .toArray()
      .then((groups) =>
        Promise.all(groups.map((group) => this.deleteGroup(group._id)))
      )
      .then(() => this.readStage(id))
      .then((stage) => this.emit(ServerStageEvents.STAGE_REMOVED, stage))
      .then(() => this.sendToStage(id, ServerStageEvents.STAGE_REMOVED, id))
      .then(() =>
        this._db.collection<Stage>(Collections.STAGES).deleteOne({ _id: id })
      );
  }

  async createGroup(
    initial: Omit<Group, "_id" | "color"> & Partial<{ color: string }>
  ): Promise<Group> {
    let { color } = initial;
    if (!color) {
      color = await this.generateGroupColor(initial.stageId);
    }
    return this._db
      .collection<Group>(Collections.GROUPS)
      .insertOne({
        ...initial,
        color,
      })
      .then((result) => result.ops[0] as Group)
      .then((group) => {
        this.emit(ServerStageEvents.GROUP_ADDED, group);
        return this.sendToStage(
          group.stageId,
          ServerStageEvents.GROUP_ADDED,
          group
        ).then(() => group);
      });
  }

  setSoundCard(
    userId: UserId,
    deviceId: DeviceId,
    name: string,
    update: Partial<Omit<SoundCard, "_id" | "name" | "userId">>
  ): Promise<SoundCard> {
    return this._db
      .collection<SoundCard>(Collections.SOUND_CARDS)
      .findOneAndUpdate(
        {
          deviceId,
          name,
        },
        {
          $set: {
            ...update,
            name,
            deviceId,
          },
        },
        { upsert: false, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          this.sendToUser(userId, ServerDeviceEvents.SOUND_CARD_CHANGED, {
            ...update,
            _id: result.value._id,
          });
          return result.value;
        }
        if (result.ok) {
          return this._db
            .collection<SoundCard>(Collections.SOUND_CARDS)
            .insertOne({
              userId,
              deviceId,
              sampleRate: 48000,
              sampleRates: [48000],
              name,
              label: name,
              isDefault: false,
              driver: "jack",
              numInputChannels: 0,
              numOutputChannels: 0,
              inputChannels: [],
              outputChannels: [],
              periodSize: 96,
              numPeriods: 2,
              ...update,
            })
            .then((insertResult) => insertResult.ops[0] as SoundCard)
            .then((soundCard) => {
              this.sendToUser(
                userId,
                ServerDeviceEvents.SOUND_CARD_ADDED,
                soundCard
              );
              return soundCard;
            });
        }
        throw new Error("Could not create sound card");
      });
  }

  /*
  createSoundCard(initial: Omit<SoundCard, "_id">): Promise<SoundCard> {
    return this._db
      .collection<SoundCard>(Collections.SOUND_CARDS)
      .insertOne(initial)
      .then((result) => result.ops[0] as SoundCard)
      .then((soundCard) => {
        this.emit(ServerDeviceEvents.SOUND_CARD_ADDED, soundCard);
        this.sendToUser(
          soundCard.userId,
          ServerDeviceEvents.SOUND_CARD_ADDED,
          soundCard
        );
        // Also create default preset
        this.createTrackPreset({
          userId: soundCard.userId,
          soundCardId: soundCard._id,
          name: "Default",
          inputChannels: soundCard.numInputChannels >= 2 ? [0, 1] : [],
          outputChannels: soundCard.numOutputChannels >= 2 ? [0, 1] : [],
        });
        return soundCard;
      });
  }
  */

  createStageMember(initial: Omit<StageMember, "_id">): Promise<StageMember> {
    return this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .insertOne(initial)
      .then((result) => result.ops[0] as StageMember)
      .then((stageMember) => {
        this.emit(ServerStageEvents.STAGE_MEMBER_ADDED, stageMember);
        return this.sendToJoinedStageMembers(
          stageMember.stageId,
          ServerStageEvents.STAGE_MEMBER_ADDED,
          stageMember
        ).then(() => stageMember);
      });
  }

  createOvTrack(initial: Omit<OvTrack, "_id">): Promise<OvTrack> {
    return this._db
      .collection<OvTrack>(Collections.TRACKS)
      .insertOne(initial)
      .then((result) => result.ops[0] as OvTrack)
      .then((track) => {
        this.emit(ServerDeviceEvents.TRACK_ADDED, track);
        this.sendToUser(track.userId, ServerDeviceEvents.TRACK_ADDED, track);
        return this.readUser(track.userId)
          .then((user) => {
            if (user && user.stageMemberId) {
              const remoteOvTrack: Omit<RemoteOvTrack, "_id"> = {
                directivity: "omni",
                volume: 1,
                ...initial,
                stageId: user.stageId,
                stageMemberId: user.stageMemberId,
                userId: user._id,
                ovTrackId: track._id,
                muted: false,
                online: true,
                x: 0,
                y: 0,
                z: 0,
                rX: 0,
                rY: 0,
                rZ: 0,
              };
              return this.createRemoteOvTrack(remoteOvTrack);
            }
            return null;
          })
          .then(() => track);
      });
  }

  /*
  createTrackPreset(initial: Omit<TrackPreset, "_id">): Promise<TrackPreset> {
    return this._db
      .collection<TrackPreset>(Collections.TRACK_PRESETS)
      .insertOne(initial)
      .then((result) => result.ops[0] as TrackPreset)
      .then((preset) => {
        this.emit(ServerDeviceEvents.TRACK_PRESET_ADDED, preset);
        this.sendToUser(
          preset.userId,
          ServerDeviceEvents.TRACK_PRESET_ADDED,
          preset
        );
        return preset;
      });
  } */

  deleteGroup(id: GroupId): Promise<any> {
    return this._db
      .collection<Group>(Collections.GROUPS)
      .findOneAndDelete(
        { _id: id },
        {
          projection: {
            _id: 1,
            stageId: 1,
          },
        }
      )
      .then((result) => {
        if (result.value) {
          // Delete all associated custom groups and stage members
          this.emit(ServerStageEvents.GROUP_REMOVED, id);
          return Promise.all([
            this._db
              .collection<StageMember>(Collections.STAGE_MEMBERS)
              .find(
                { groupId: result.value._id },
                {
                  projection: {
                    _id: 1,
                    online: 1,
                    userId: 1,
                  },
                }
              )
              .toArray()
              .then((stageMembers) =>
                stageMembers.map(async (stageMember) => {
                  // Throw out user first
                  if (stageMember.online) {
                    await this.leaveStage(stageMember.userId);
                  }
                  return this.deleteStageMember(stageMember._id);
                })
              ),
            this._db
              .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
              .find({ groupId: result.value._id }, { projection: { _id: 1 } })
              .toArray()
              .then((customGroupVolumes) =>
                customGroupVolumes.map((customGroupVolume) =>
                  this.deleteCustomGroupVolume(customGroupVolume._id)
                )
              ),
            this._db
              .collection<CustomGroupPosition>(
                Collections.CUSTOM_GROUP_POSITIONS
              )
              .find({ groupId: result.value._id }, { projection: { _id: 1 } })
              .toArray()
              .then((customGroupPositions) =>
                customGroupPositions.map((customGroupPosition) =>
                  this.deleteCustomGroupPosition(customGroupPosition._id)
                )
              ),
            this.sendToStage(
              result.value.stageId,
              ServerStageEvents.GROUP_REMOVED,
              id
            ),
          ]);
        }
        throw new Error(`Could not find or delete group ${id}`);
      });
  }

  deleteSoundCard(userId: UserId, id: SoundCardId): Promise<any> {
    return this._db
      .collection<SoundCard>(Collections.SOUND_CARDS)
      .findOneAndDelete(
        {
          _id: id,
          userId,
        },
        { projection: { userId: 1, name: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerDeviceEvents.SOUND_CARD_REMOVED, id);
          this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.SOUND_CARD_REMOVED,
            id
          );
          return Promise.all([
            this._db
              .collection<Device>(Collections.DEVICES)
              .find({ userId, soundCardNames: result.value.name })
              .toArray()
              .then((devices) =>
                devices.map((device) => {
                  const soundCardNames = device.soundCardNames.filter(
                    (i) => i !== result.value.name
                  );
                  return this.updateDevice(device.userId, device._id, {
                    soundCardNames,
                    soundCardName:
                      device.soundCardName === result.value.name
                        ? undefined
                        : device.soundCardName,
                  });
                })
              ),
            this._db
              .collection<OvTrack>(Collections.TRACKS)
              .find({ soundCardId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((presets) =>
                presets.map((track) => this.deleteOvTrack(userId, track._id))
              ),
            /* this._db
              .collection<TrackPreset>(Collections.TRACK_PRESETS)
              .find({ soundCardId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((presets) =>
                presets.map((preset) =>
                  this.deleteTrackPreset(userId, preset._id)
                )
              ), */
          ]);
        }
        throw new Error(`Could not find and delete the sound card ${id}`);
      });
  }

  deleteStageMember(id: StageMemberId): Promise<any> {
    return this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .findOneAndDelete({ _id: id }, { projection: { stageId: 1 } })
      .then((result) => {
        if (result.value) {
          // Delete all custom stage members and stage member tracks
          this.emit(ServerStageEvents.STAGE_MEMBER_REMOVED, id);
          return Promise.all([
            this._db
              .collection<CustomStageMemberVolume>(
                Collections.CUSTOM_STAGE_MEMBER_VOLUMES
              )
              .find({ stageMemberId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((presets) =>
                Promise.all(
                  presets.map((preset) =>
                    this.deleteCustomStageMemberVolume(preset._id)
                  )
                )
              ),
            this._db
              .collection<CustomStageMemberPosition>(
                Collections.CUSTOM_STAGE_MEMBER_POSITIONS
              )
              .find({ stageMemberId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((presets) =>
                Promise.all(
                  presets.map((preset) =>
                    this.deleteCustomStageMemberPosition(preset._id)
                  )
                )
              ),
            this._db
              .collection<RemoteVideoProducer>(
                Collections.REMOTE_VIDEO_PRODUCERS
              )
              .find({ stageMemberId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((producers) =>
                producers.map((producer) =>
                  this.deleteRemoteVideoProducer(producer._id)
                )
              ),
            this._db
              .collection<RemoteAudioProducer>(
                Collections.REMOTE_AUDIO_PRODUCERS
              )
              .find({ stageMemberId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((producers) =>
                producers.map((producer) =>
                  this.deleteRemoteAudioProducer(producer._id)
                )
              ),
            this._db
              .collection<CustomRemoteOvTrackVolume>(
                Collections.CUSTOM_REMOTE_OV_VOLUMES
              )
              .find({ stageMemberId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((tracks) =>
                tracks.map((track) =>
                  this.deleteCustomRemoteOvTrackVolume(track._id)
                )
              ),
            this._db
              .collection<CustomRemoteOvTrackPosition>(
                Collections.CUSTOM_REMOTE_OV_POSITIONS
              )
              .find({ stageMemberId: id }, { projection: { _id: 1 } })
              .toArray()
              .then((tracks) =>
                tracks.map((track) =>
                  this.deleteCustomRemoteOvTrackPosition(track._id)
                )
              ),
            this.sendToJoinedStageMembers(
              result.value.stageId,
              ServerStageEvents.STAGE_MEMBER_REMOVED,
              id
            ),
          ]);
        }
        throw new Error(`Could not find or delete stage member ${id}`);
      });
  }

  deleteOvTrack(userId: UserId, id: OvTrackId): Promise<any> {
    return this._db
      .collection<OvTrack>(Collections.TRACKS)
      .findOneAndDelete(
        {
          _id: id,
          userId,
        },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerDeviceEvents.TRACK_REMOVED, id);
          this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.TRACK_REMOVED,
            id
          );
          // Delete all stage member tracks
          return this._db
            .collection<RemoteOvTrack>(Collections.REMOTE_OV_TRACKS)
            .find({ trackId: id }, { projection: { _id: 1 } })
            .toArray()
            .then((tracks) =>
              tracks.map((track) => this.deleteRemoteOvTrack(track._id))
            );
        }
        throw new Error(`Could not find and delete track ${id}`);
      });
  }

  /*
  deleteTrackPreset(userId: UserId, id: TrackPresetId): Promise<any> {
    return this._db
      .collection<TrackPreset>(Collections.TRACK_PRESETS)
      .findOneAndDelete(
        {
          _id: id,
          userId,
        },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          this.emit(ServerDeviceEvents.TRACK_PRESET_REMOVED, id);
          this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.TRACK_PRESET_REMOVED,
            id
          );
          // Delete all custom stage members and stage member tracks
          return this._db
            .collection<Track>(Collections.TRACKS)
            .find({ trackPresetId: id }, { projection: { _id: 1 } })
            .toArray()
            .then((tracks) =>
              tracks.map((track) => this.deleteTrack(userId, track._id))
            );
        }
        throw new Error(`Could not find and delete track preset ${id}`);
      });
  } */

  /*
  readTrackPreset(id: TrackPresetId): Promise<TrackPreset> {
    return this._db
      .collection<TrackPreset>(Collections.TRACK_PRESETS)
      .findOne({ _id: id });
  } */

  readGroup(id: GroupId): Promise<Group> {
    return this._db.collection<Group>(Collections.GROUPS).findOne({ _id: id });
  }

  readSoundCard(id: SoundCardId): Promise<SoundCard> {
    return this._db
      .collection<SoundCard>(Collections.SOUND_CARDS)
      .findOne({ _id: id });
  }

  readStageMember(id: StageMemberId): Promise<StageMember> {
    return this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .findOne({ _id: id });
  }

  readOvTrack(id: OvTrackId): Promise<OvTrack> {
    return this._db
      .collection<OvTrack>(Collections.TRACKS)
      .findOne({ _id: id });
  }

  updateGroup(id: GroupId, update: Partial<Omit<Group, "_id">>): Promise<void> {
    return this._db
      .collection<Group>(Collections.GROUPS)
      .findOneAndUpdate(
        { _id: id },
        { $set: update },
        { projection: { stageId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerStageEvents.GROUP_CHANGED, payload);
          return this.sendToStage(
            result.value.stageId,
            ServerStageEvents.GROUP_CHANGED,
            payload
          );
        }
        return null;
      });
  }

  updateSoundCard(
    deviceId: DeviceId,
    id: SoundCardId,
    update: Partial<Omit<SoundCard, "_id">>
  ): Promise<void> {
    return this._db
      .collection<SoundCard>(Collections.SOUND_CARDS)
      .findOneAndUpdate(
        {
          _id: id,
          deviceId,
        },
        { $set: update },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerDeviceEvents.SOUND_CARD_CHANGED, payload);
          return this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.SOUND_CARD_CHANGED,
            payload
          );
        }
        throw new Error(`Could not find or update sound card ${id}`);
      });
  }

  updateStageMember(
    id: StageMemberId,
    update: Partial<Omit<StageMember, "_id">>
  ): Promise<void> {
    return this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .findOneAndUpdate(
        { _id: id },
        { $set: update },
        { projection: { stageId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerStageEvents.STAGE_MEMBER_CHANGED, payload);
          return this.sendToJoinedStageMembers(
            result.value.stageId,
            ServerStageEvents.STAGE_MEMBER_CHANGED,
            payload
          );
        }
        throw new Error(`Could not find or update stage member ${id}`);
      });
  }

  updateOvTrack(
    deviceId: DeviceId,
    id: OvTrackId,
    update: Partial<Omit<OvTrack, "_id">>
  ): Promise<void> {
    return this._db
      .collection<OvTrack>(Collections.TRACKS)
      .findOneAndUpdate(
        {
          _id: id,
          deviceId,
        },
        { $set: update },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerDeviceEvents.TRACK_CHANGED, payload);
          return this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.TRACK_CHANGED,
            payload
          );
        }
        throw new Error(`Could not find or update track ${id}`);
      });
  }

  /*
  updateTrackPreset(
    userId: UserId,
    id: TrackPresetId,
    update: Partial<Omit<TrackPreset, "_id">>
  ): Promise<void> {
    return this._db
      .collection<TrackPreset>(Collections.TRACK_PRESETS)
      .findOneAndUpdate(
        {
          _id: id,
          userId,
        },
        { $set: update },
        { projection: { userId: 1 } }
      )
      .then((result) => {
        if (result.value) {
          const payload = {
            ...update,
            _id: id,
          };
          this.emit(ServerDeviceEvents.TRACK_PRESET_CHANGED, payload);
          return this.sendToUser(
            result.value.userId,
            ServerDeviceEvents.TRACK_PRESET_CHANGED,
            payload
          );
          // TODO: Remove tracks?
        }
        throw new Error(`Could not find or update track preset ${id}`);
      });
  } */

  /* CUSTOMIZED STATES FOR EACH STAGE MEMBER */
  setCustomGroupPosition(
    userId: UserId,
    groupId: GroupId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void> {
    return this._db
      .collection<CustomGroupPosition>(Collections.CUSTOM_GROUP_POSITIONS)
      .findOneAndUpdate(
        { userId, groupId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(ServerStageEvents.CUSTOM_GROUP_POSITION_CHANGED, payload);
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_GROUP_POSITION_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readGroup(groupId)
            .then(
              (group): Omit<CustomGroupPosition, "_id"> => ({
                userId,
                groupId,
                stageId: group.stageId,
                x: group.x,
                y: group.y,
                z: group.z,
                rX: group.rX,
                rY: group.rY,
                rZ: group.rZ,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomGroupPosition>(
                  Collections.CUSTOM_GROUP_POSITIONS
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_GROUP_POSITION_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_GROUP_POSITION_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize position of group ${groupId} for user ${userId}`
        );
      });
  }

  readCustomGroupPosition(id: CustomGroupId): Promise<CustomGroupPosition> {
    return this._db
      .collection<CustomGroupPosition>(Collections.CUSTOM_GROUP_POSITIONS)
      .findOne({ _id: id });
  }

  deleteCustomGroupPosition(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomGroupPosition>(Collections.CUSTOM_GROUP_POSITIONS)
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(ServerStageEvents.CUSTOM_GROUP_POSITION_REMOVED, id);
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_GROUP_POSITION_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete custom group position ${id}`
        );
      });
  }

  setCustomGroupVolume(
    userId: UserId,
    groupId: GroupId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void> {
    return this._db
      .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
      .findOneAndUpdate(
        { userId, groupId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(ServerStageEvents.CUSTOM_GROUP_VOLUME_CHANGED, payload);
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_GROUP_VOLUME_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readGroup(groupId)
            .then(
              (group): Omit<CustomGroupVolume, "_id"> => ({
                userId,
                groupId,
                stageId: group.stageId,
                volume: group.volume,
                muted: group.muted,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize volume of group ${groupId} for user ${userId}`
        );
      });
  }

  readCustomGroupVolume(id: CustomGroupId): Promise<CustomGroupVolume> {
    return this._db
      .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
      .findOne({ _id: id });
  }

  deleteCustomGroupVolume(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomGroupVolume>(Collections.CUSTOM_GROUP_VOLUMES)
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, id);
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED,
            id
          );
        }
        throw new Error(`Could not find and delete custom group volume ${id}`);
      });
  }

  setCustomStageMemberPosition(
    userId: UserId,
    stageMemberId: StageMemberId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void> {
    return this._db
      .collection<CustomStageMemberPosition>(
        Collections.CUSTOM_STAGE_MEMBER_POSITIONS
      )
      .findOneAndUpdate(
        { userId, stageMemberId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_POSITION_CHANGED,
            payload
          );
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_POSITION_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readStageMember(stageMemberId)
            .then(
              (stageMember): Omit<CustomStageMemberPosition, "_id"> => ({
                userId,
                stageMemberId,
                stageId: stageMember.stageId,
                x: stageMember.x,
                y: stageMember.y,
                z: stageMember.z,
                rX: stageMember.rX,
                rY: stageMember.rY,
                rZ: stageMember.rZ,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomStageMemberPosition>(
                  Collections.CUSTOM_STAGE_MEMBER_POSITIONS
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_POSITION_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_POSITION_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize position of stage member ${stageMemberId} for user ${userId}`
        );
      });
  }

  readCustomStageMemberPosition(
    id: CustomGroupId
  ): Promise<CustomStageMemberPosition> {
    return this._db
      .collection<CustomStageMemberPosition>(
        Collections.CUSTOM_STAGE_MEMBER_POSITIONS
      )
      .findOne({ _id: id });
  }

  deleteCustomStageMemberPosition(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomStageMemberPosition>(
        Collections.CUSTOM_STAGE_MEMBER_POSITIONS
      )
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(ServerStageEvents.CUSTOM_STAGE_MEMBER_POSITION_REMOVED, id);
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_POSITION_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete custom stage member position ${id}`
        );
      });
  }

  setCustomStageMemberVolume(
    userId: UserId,
    stageMemberId: StageMemberId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void> {
    return this._db
      .collection<CustomStageMemberVolume>(
        Collections.CUSTOM_STAGE_MEMBER_VOLUMES
      )
      .findOneAndUpdate(
        { userId, stageMemberId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_VOLUME_CHANGED,
            payload
          );
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_VOLUME_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readStageMember(stageMemberId)
            .then(
              (stageMember): Omit<CustomStageMemberVolume, "_id"> => ({
                userId,
                stageMemberId,
                stageId: stageMember.stageId,
                volume: stageMember.volume,
                muted: stageMember.muted,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomStageMemberVolume>(
                  Collections.CUSTOM_STAGE_MEMBER_VOLUMES
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_VOLUME_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_VOLUME_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize volume of stage member ${stageMemberId} for user ${userId}`
        );
      });
  }

  readCustomStageMemberVolume(
    id: CustomGroupId
  ): Promise<CustomStageMemberVolume> {
    return this._db
      .collection<CustomStageMemberVolume>(
        Collections.CUSTOM_STAGE_MEMBER_VOLUMES
      )
      .findOne({ _id: id });
  }

  deleteCustomStageMemberVolume(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomStageMemberVolume>(
        Collections.CUSTOM_STAGE_MEMBER_VOLUMES
      )
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(ServerStageEvents.CUSTOM_STAGE_MEMBER_VOLUME_REMOVED, id);
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_VOLUME_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete custom stage member volume ${id}`
        );
      });
  }

  setCustomRemoteAudioProducerPosition(
    userId: UserId,
    remoteAudioProducerId: RemoteAudioProducerId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void> {
    return this._db
      .collection<CustomRemoteAudioProducerPosition>(
        Collections.CUSTOM_REMOTE_AUDIO_POSITIONS
      )
      .findOneAndUpdate(
        { userId, remoteAudioProducerId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_POSITION_CHANGED,
            payload
          );
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_POSITION_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readRemoteAudioProducer(remoteAudioProducerId)
            .then(
              (
                audioProducer
              ): Omit<CustomRemoteAudioProducerPosition, "_id"> => ({
                userId,
                remoteAudioProducerId,
                stageId: audioProducer.stageId,
                stageMemberId: audioProducer.stageMemberId,
                x: audioProducer.x,
                y: audioProducer.y,
                z: audioProducer.z,
                rX: audioProducer.rX,
                rY: audioProducer.rY,
                rZ: audioProducer.rZ,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomRemoteAudioProducerPosition>(
                  Collections.CUSTOM_REMOTE_AUDIO_POSITIONS
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_POSITION_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_POSITION_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize position of remote audio producer ${remoteAudioProducerId} for user ${userId}`
        );
      });
  }

  readCustomRemoteAudioProducerPosition(
    id: CustomGroupId
  ): Promise<CustomRemoteAudioProducerPosition> {
    return this._db
      .collection<CustomRemoteAudioProducerPosition>(
        Collections.CUSTOM_REMOTE_AUDIO_POSITIONS
      )
      .findOne({ _id: id });
  }

  deleteCustomRemoteAudioProducerPosition(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomRemoteAudioProducerPosition>(
        Collections.CUSTOM_REMOTE_AUDIO_POSITIONS
      )
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_POSITION_REMOVED,
            id
          );
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_POSITION_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete remote audio producer position ${id}`
        );
      });
  }

  setCustomRemoteAudioProducerVolume(
    userId: UserId,
    remoteAudioProducerId: RemoteAudioProducerId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void> {
    return this._db
      .collection<CustomRemoteAudioProducerVolume>(
        Collections.CUSTOM_REMOTE_AUDIO_VOLUMES
      )
      .findOneAndUpdate(
        { userId, remoteAudioProducerId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_CHANGED,
            payload
          );
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readRemoteAudioProducer(remoteAudioProducerId)
            .then(
              (
                audioProducer
              ): Omit<CustomRemoteAudioProducerVolume, "_id"> => ({
                userId,
                remoteAudioProducerId,
                stageId: audioProducer.stageId,
                volume: audioProducer.volume,
                muted: audioProducer.muted,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomRemoteAudioProducerVolume>(
                  Collections.CUSTOM_REMOTE_AUDIO_VOLUMES
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize volume of remote audio producer ${remoteAudioProducerId} for user ${userId}`
        );
      });
  }

  readCustomRemoteAudioProducerVolume(
    id: CustomGroupId
  ): Promise<CustomRemoteAudioProducerVolume> {
    return this._db
      .collection<CustomRemoteAudioProducerVolume>(
        Collections.CUSTOM_REMOTE_AUDIO_VOLUMES
      )
      .findOne({ _id: id });
  }

  deleteCustomRemoteAudioProducerVolume(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomRemoteAudioProducerVolume>(
        Collections.CUSTOM_REMOTE_AUDIO_VOLUMES
      )
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_REMOVED,
            id
          );
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete custom remote audio producer volume ${id}`
        );
      });
  }

  setCustomRemoteOvTrackPosition(
    userId: UserId,
    remoteOvTrackId: RemoteOvTrackId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void> {
    return this._db
      .collection<CustomRemoteOvTrackPosition>(
        Collections.CUSTOM_REMOTE_OV_POSITIONS
      )
      .findOneAndUpdate(
        { userId, remoteOvTrackId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_POSITION_CHANGED,
            payload
          );
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_POSITION_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readRemoteOvTrack(remoteOvTrackId)
            .then(
              (ovTrack): Omit<CustomRemoteOvTrackPosition, "_id"> => ({
                userId,
                remoteOvTrackId,
                stageId: ovTrack.stageId,
                stageMemberId: ovTrack.stageMemberId,
                directivity: ovTrack.directivity,
                x: ovTrack.x,
                y: ovTrack.y,
                z: ovTrack.z,
                rX: ovTrack.rX,
                rY: ovTrack.rY,
                rZ: ovTrack.rZ,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomRemoteOvTrackPosition>(
                  Collections.CUSTOM_REMOTE_OV_POSITIONS
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_POSITION_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_POSITION_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize position of remote ov track ${remoteOvTrackId} for user ${userId}`
        );
      });
  }

  readCustomRemoteOvTrackPosition(
    id: CustomGroupId
  ): Promise<CustomRemoteOvTrackPosition> {
    return this._db
      .collection<CustomRemoteOvTrackPosition>(
        Collections.CUSTOM_REMOTE_OV_POSITIONS
      )
      .findOne({ _id: id });
  }

  deleteCustomRemoteOvTrackPosition(id: CustomRemoteOvTrackId): Promise<void> {
    return this._db
      .collection<CustomRemoteOvTrackPosition>(
        Collections.CUSTOM_REMOTE_OV_POSITIONS
      )
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_POSITION_REMOVED,
            id
          );
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_POSITION_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete remote ov track position ${id}`
        );
      });
  }

  setCustomRemoteOvTrackVolume(
    userId: UserId,
    remoteOvTrackId: RemoteOvTrackId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void> {
    return this._db
      .collection<CustomRemoteOvTrackVolume>(
        Collections.CUSTOM_REMOTE_OV_VOLUMES
      )
      .findOneAndUpdate(
        { userId, remoteOvTrackId },
        {
          $set: update,
        },
        { upsert: true, projection: { _id: 1 } }
      )
      .then((result) => {
        if (result.value) {
          // Return updated document
          const payload = {
            ...update,
            _id: result.value._id,
          };
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_VOLUME_CHANGED,
            payload
          );
          return this.sendToUser(
            userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_VOLUME_CHANGED,
            payload
          );
        }
        if (result.ok) {
          return this.readRemoteOvTrack(remoteOvTrackId)
            .then(
              (remoteOvTrack): Omit<CustomRemoteOvTrackVolume, "_id"> => ({
                userId,
                remoteOvTrackId,
                stageId: remoteOvTrack.stageId,
                stageMemberId: remoteOvTrack.stageMemberId,
                volume: remoteOvTrack.volume,
                muted: remoteOvTrack.muted,
                ...update,
              })
            )
            .then((payload) =>
              this._db
                .collection<CustomRemoteOvTrackVolume>(
                  Collections.CUSTOM_REMOTE_OV_VOLUMES
                )
                .insertOne(payload)
                .then(() => {
                  this.emit(
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_VOLUME_ADDED,
                    payload
                  );
                  return this.sendToUser(
                    userId,
                    ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_VOLUME_ADDED,
                    payload
                  );
                })
            );
        }
        throw new Error(
          `Could not customize volume of remote ov track ${remoteOvTrackId} for user ${userId}`
        );
      });
  }

  readCustomRemoteOvTrackVolume(
    id: CustomGroupId
  ): Promise<CustomRemoteOvTrackVolume> {
    return this._db
      .collection<CustomRemoteOvTrackVolume>(
        Collections.CUSTOM_REMOTE_OV_VOLUMES
      )
      .findOne({ _id: id });
  }

  deleteCustomRemoteOvTrackVolume(id: CustomGroupId): Promise<void> {
    return this._db
      .collection<CustomRemoteOvTrackVolume>(
        Collections.CUSTOM_REMOTE_OV_VOLUMES
      )
      .findOneAndDelete({ _id: id }, { projection: { userId: 1 } })
      .then((result) => {
        if (result.value) {
          this.emit(
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_VOLUME_REMOVED,
            id
          );
          return this.sendToUser(
            result.value.userId,
            ServerStageEvents.CUSTOM_STAGE_MEMBER_OV_VOLUME_REMOVED,
            id
          );
        }
        throw new Error(
          `Could not find and delete custom remote ov track volume ${id}`
        );
      });
  }

  /* SENDING METHODS */
  public async sendStageDataToDevice(
    socket: ITeckosSocket,
    user: User
  ): Promise<any> {
    if (user.stageMemberId) {
      // Switch current stage member online
      await this._db
        .collection(Collections.STAGE_MEMBERS)
        .updateOne(
          { stageMemberId: user.stageMemberId },
          { $set: { online: true } }
        );
    }
    const stageMembers = await this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .find({ userId: user._id })
      .toArray();
    // Get all managed stages and stages, where the user was or is in
    const stages = await this._db
      .collection<Stage>(Collections.STAGES)
      .find({
        $or: [
          {
            _id: {
              $in: stageMembers.map((groupMember) => groupMember.stageId),
            },
          },
          { admins: user._id },
        ],
      })
      .toArray();
    await stages.map((s) =>
      MongoRealtimeDatabase.sendToDevice(
        socket,
        ServerStageEvents.STAGE_ADDED,
        s
      )
    );
    const groups = await this._db
      .collection<Group>(Collections.GROUPS)
      .find({ stageId: { $in: stages.map((foundStage) => foundStage._id) } })
      .toArray();
    await Promise.all(
      groups.map((group) =>
        MongoRealtimeDatabase.sendToDevice(
          socket,
          ServerStageEvents.GROUP_ADDED,
          group
        )
      )
    );

    if (user.stageMemberId) {
      const stageMember = stageMembers.find((groupMember) =>
        groupMember._id.equals(user.stageMemberId)
      );
      if (stageMember) {
        const wholeStage: StagePackage = await this.getWholeStage(
          user._id,
          user.stageId,
          true
        );
        const initialStage: InitialStagePackage = {
          ...wholeStage,
          stageId: user.stageId,
          groupId: stageMember.groupId,
        };
        MongoRealtimeDatabase.sendToDevice(
          socket,
          ServerStageEvents.STAGE_JOINED,
          initialStage
        );
      } else {
        error("Group member or stage should exists, but could not be found");
      }
    }
  }

  public async sendDeviceConfigurationToDevice(
    socket: ITeckosSocket,
    user: User
  ): Promise<any> {
    // Send all sound cards
    await this._db
      .collection<SoundCard>(Collections.SOUND_CARDS)
      .find({ userId: user._id })
      .toArray()
      .then((foundSoundCard) =>
        foundSoundCard.map((soundCard) =>
          MongoRealtimeDatabase.sendToDevice(
            socket,
            ServerDeviceEvents.SOUND_CARD_ADDED,
            soundCard
          )
        )
      );
    /*
    await this._db
      .collection(Collections.TRACK_PRESETS)
      .find({ userId: user._id })
      .toArray()
      .then((presets) =>
        presets.map((trackPreset) =>
          MongoRealtimeDatabase.sendToDevice(
            socket,
            ServerDeviceEvents.TRACK_PRESET_ADDED,
            trackPreset
          )
        )
      ); */
  }

  async sendToStage(
    stageId: StageId,
    event: string,
    payload?: any
  ): Promise<void> {
    const adminIds: UserId[] = await this._db
      .collection<Stage>(Collections.STAGES)
      .findOne({ _id: stageId }, { projection: { admins: 1 } })
      .then((stage) => stage.admins);
    const stageMemberIds: UserId[] = await this._db
      .collection<StageMember>(Collections.STAGE_MEMBERS)
      .find({ stageId }, { projection: { userId: 1 } })
      .toArray()
      .then((stageMembers) =>
        stageMembers.map((stageMember) => stageMember.userId)
      );
    const userIds: {
      [id: string]: UserId;
    } = {};
    adminIds.forEach((adminId) => {
      userIds[adminId.toHexString()] = adminId;
    });
    stageMemberIds.forEach((stageMemberId) => {
      userIds[stageMemberId.toHexString()] = stageMemberId;
    });
    Object.values(userIds).forEach((userId) =>
      this.sendToUser(userId, event, payload)
    );
  }

  sendToStageManagers(
    stageId: StageId,
    event: string,
    payload?: any
  ): Promise<void> {
    return this._db
      .collection<Stage>(Collections.STAGES)
      .findOne({ _id: new ObjectId(stageId) }, { projection: { admins: 1 } })
      .then((foundStage) =>
        foundStage.admins.forEach((admin) =>
          this.sendToUser(admin, event, payload)
        )
      );
  }

  sendToJoinedStageMembers(
    stageId: StageId,
    event: string,
    payload?: any
  ): Promise<void> {
    return this._db
      .collection<User>(Collections.USERS)
      .find({ stageId }, { projection: { _id: 1 } })
      .toArray()
      .then((users: { _id: UserId }[]) =>
        users.forEach((user) => this.sendToUser(user._id, event, payload))
      );
  }

  static sendToDevice(
    socket: ITeckosSocket,
    event: string,
    payload?: any
  ): void {
    if (DEBUG_EVENTS) {
      if (DEBUG_PAYLOAD) {
        trace(
          `SEND TO DEVICE '${socket.id}' ${event}: ${JSON.stringify(payload)}`
        );
      } else {
        trace(`SEND TO DEVICE '${socket.id}' ${event}`);
      }
    }
    socket.emit(event, payload);
  }

  sendToUser(userId: UserId, event: string, payload?: any): void {
    if (DEBUG_EVENTS) {
      if (DEBUG_PAYLOAD) {
        trace(`SEND TO USER '${userId}' ${event}: ${JSON.stringify(payload)}`);
      } else {
        trace(`SEND TO USER '${userId}' ${event}`);
      }
    }
    this._io.to(userId.toString(), event, payload);
  }

  sendToAll(event: string, payload?: any): void {
    if (DEBUG_EVENTS) {
      if (DEBUG_PAYLOAD) {
        trace(`SEND TO ALL ${event}: ${JSON.stringify(payload)}`);
      } else {
        trace(`SEND TO ALL ${event}`);
      }
    }
    this._io.toAll(event, payload);
  }

  private generateGroupColor = (stageId: StageId) => {
    return this._db
      .collection<Group>(Collections.GROUPS)
      .find({ stageId })
      .toArray()
      .then((groups) => {
        let color: string;
        const hasColor = (c: string): boolean =>
          !!groups.find((group) => group.color === c);
        do {
          color = generateColor().toString();
        } while (hasColor(color));
        return color;
      });
  };
}

export default MongoRealtimeDatabase;
