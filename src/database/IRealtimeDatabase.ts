import { Db } from "mongodb";
import { ITeckosSocket } from "teckos";
import * as EventEmitter from "events";
import {
  CustomGroupId,
  CustomStageMemberId,
  DeviceId,
  GlobalAudioProducerId,
  GlobalVideoProducerId,
  GroupId,
  SoundCardId,
  StageId,
  StageMemberId,
  RemoteOvTrackId,
  RemoteVideoProducerId,
  OvTrackId,
  UserId,
  RouterId,
  RemoteAudioProducerId,
  CustomRemoteAudioProducerId,
  CustomRemoteOvTrackId,
} from "../types/IdTypes";
import {
  CustomGroupPosition,
  CustomGroupVolume,
  CustomRemoteAudioProducerVolume,
  CustomRemoteOvTrackPosition,
  CustomStageMemberPosition,
  CustomStageMemberVolume,
  Device,
  GlobalAudioProducer,
  GlobalVideoProducer,
  Group,
  OvTrack,
  RemoteAudioProducer,
  RemoteOvTrack,
  RemoteVideoProducer,
  Router,
  SoundCard,
  Stage,
  StageMember,
  User,
} from "../types";
import ThreeDimensionProperties from "../types/ThreeDimensionProperties";
import { CustomRemoteOvTrackVolume } from "../types/CustomRemoteOvTrackVolume";
import { CustomRemoteAudioProducerPosition } from "../types/CustomRemoteAudioProducerPosition";

export interface IRealtimeDatabase extends EventEmitter.EventEmitter {
  connect(database: string): Promise<void>;

  // TODO: REMOVE; JUST A ESLINT TEST
  connect(database: string): Promise<void>;

  db(): Db;

  cleanUp(serverAddress: string): Promise<void>;

  // ROUTER HANDLING
  createRouter(initial: Omit<Router, "_id">): Promise<Router>;

  readRouter(id: RouterId): Promise<Router | null>;

  readRouters(): Promise<Router[]>;

  readRoutersByServer(serverAddress: string): Promise<Router[]>;

  updateRouter(
    id: RouterId,
    update: Partial<Omit<Router, "_id">>
  ): Promise<void>;

  deleteRouter(id: RouterId): Promise<void>;

  // USER HANDLING
  createUser(
    initial: Omit<User, "_id" | "stageId" | "stageMemberId">
  ): Promise<User>;

  readUser(id: UserId): Promise<User>;

  readUserByUid(uid: string): Promise<User>;

  updateUser(id: UserId, update: Partial<Omit<User, "_id">>): Promise<void>;

  deleteUser(id: UserId): Promise<void>;

  // DEVICE HANDLING
  createDevice(initial: Omit<Device, "_id">): Promise<Device>;

  readDevice(id: DeviceId): Promise<Device | null>;

  readDevicesByServer(serverAddress: string): Promise<Device[]>;

  readDevicesByUser(userId: UserId): Promise<Device[]>;

  readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device | null>;

  updateDevice(
    userId: UserId,
    id: DeviceId,
    update: Partial<Omit<Device, "_id">>
  ): Promise<void>;

  deleteDevice(id: DeviceId): Promise<void>;

  setSoundCard(
    userId: UserId,
    deviceId: DeviceId,
    name: string,
    initial: Omit<SoundCard, "_id" | "name" | "userId">
  ): Promise<SoundCard>;

  readSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<SoundCard>;

  updateSoundCard(
    deviceId: DeviceId,
    id: SoundCardId,
    update: Partial<Omit<SoundCard, "_id">>
  ): Promise<void>;

  deleteSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<void>;

  /*
  createTrackPreset(initial: Omit<TrackPreset, "_id">): Promise<TrackPreset>;

  readTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<TrackPreset>;

  updateTrackPreset(
    deviceId: DeviceId,
    id: TrackPresetId,
    update: Partial<Omit<TrackPreset, "_id">>
  ): Promise<void>;

  deleteTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<void>;
*/
  createOvTrack(initial: Omit<OvTrack, "_id" | "stageId">): Promise<OvTrack>;

  readOvTrack(deviceId: DeviceId, id: OvTrackId): Promise<OvTrack>;

  updateOvTrack(
    deviceId: DeviceId,
    id: OvTrackId,
    update: Partial<Omit<OvTrack, "_id">>
  ): Promise<void>;

  deleteOvTrack(deviceId: DeviceId, id: OvTrackId): Promise<void>;

  createAudioProducer(
    initial: Omit<GlobalAudioProducer, "_id">
  ): Promise<GlobalAudioProducer>;

  readAudioProducer(id: GlobalAudioProducerId): Promise<GlobalAudioProducer>;

  updateAudioProducer(
    deviceId: DeviceId,
    id: GlobalAudioProducerId,
    update: Partial<Omit<GlobalAudioProducer, "_id">>
  ): Promise<void>;

  deleteAudioProducer(
    deviceId: DeviceId,
    id: GlobalAudioProducerId
  ): Promise<void>;

  createVideoProducer(
    initial: Omit<GlobalVideoProducer, "_id">
  ): Promise<GlobalVideoProducer>;

  readVideoProducer(id: GlobalVideoProducerId): Promise<GlobalVideoProducer>;

  updateVideoProducer(
    deviceId: DeviceId,
    id: GlobalVideoProducerId,
    update: Partial<Omit<GlobalVideoProducer, "_id">>
  ): Promise<void>;

  deleteVideoProducer(
    deviceId: DeviceId,
    id: GlobalVideoProducerId
  ): Promise<void>;

  // STAGE HANDLING
  createStage(initial: Omit<Stage, "_id">): Promise<Stage>;

  readStage(id: StageId): Promise<Stage>;

  readStagesWithoutRouter(limit?: number): Promise<Stage[]>;

  readManagedStage(userId: UserId, id: StageId): Promise<Stage>;

  joinStage(
    userId: UserId,
    stageId: StageId,
    groupId: GroupId,
    password?: string
  ): Promise<void>;

  leaveStage(userId: UserId, skipLeaveNotification?: boolean): Promise<void>;

  updateStage(id: StageId, update: Partial<Omit<Stage, "_id">>): Promise<void>;

  deleteStage(id: StageId): Promise<any>;

  createGroup(initial: Omit<Group, "_id">): Promise<Group>;

  readGroup(id: GroupId): Promise<Group>;

  updateGroup(id: GroupId, update: Partial<Omit<Group, "_id">>): Promise<void>;

  deleteGroup(id: GroupId): Promise<void>;

  createStageMember(initial: Omit<StageMember, "_id">): Promise<StageMember>;

  readStageMember(id: StageMemberId): Promise<StageMember>;

  updateStageMember(
    id: StageMemberId,
    update: Partial<Omit<StageMember, "_id">>
  ): Promise<void>;

  deleteStageMember(id: StageMemberId): Promise<void>;

  createRemoteOvTrack(
    initial: Omit<RemoteOvTrack, "_id">
  ): Promise<RemoteOvTrack>;

  readRemoteOvTrack(id: RemoteOvTrackId): Promise<RemoteOvTrack>;

  updateRemoteOvTrack(
    id: RemoteOvTrackId,
    update: Partial<Omit<RemoteOvTrack, "_id">>
  ): Promise<void>;

  deleteRemoteOvTrack(id: RemoteOvTrackId): Promise<void>;

  createRemoteAudioProducer(
    initial: Omit<RemoteAudioProducer, "_id">
  ): Promise<RemoteAudioProducer>;

  readRemoteAudioProducer(
    id: RemoteAudioProducerId
  ): Promise<RemoteAudioProducer>;

  updateRemoteAudioProducer(
    id: RemoteAudioProducerId,
    update: Partial<Omit<RemoteAudioProducer, "_id">>
  ): Promise<void>;

  deleteRemoteAudioProducer(id: RemoteAudioProducerId): Promise<void>;

  createRemoteVideoProducer(
    initial: Omit<RemoteVideoProducer, "_id">
  ): Promise<RemoteVideoProducer>;

  readRemoteVideoProducer(
    id: RemoteVideoProducerId
  ): Promise<RemoteVideoProducer>;

  updateRemoteVideoProducer(
    id: RemoteVideoProducerId,
    update: Partial<Omit<RemoteVideoProducer, "_id">>
  ): Promise<void>;

  deleteRemoteVideoProducer(id: RemoteVideoProducerId): Promise<void>;

  setCustomGroupVolume(
    userId: UserId,
    groupId: GroupId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void>;

  readCustomGroupVolume(id: CustomGroupId): Promise<CustomGroupVolume>;

  deleteCustomGroupVolume(id: CustomGroupId): Promise<void>;

  setCustomGroupPosition(
    userId: UserId,
    groupId: GroupId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void>;

  readCustomGroupPosition(id: CustomGroupId): Promise<CustomGroupPosition>;

  deleteCustomGroupPosition(id: CustomGroupId): Promise<void>;

  setCustomStageMemberVolume(
    userId: UserId,
    stageMemberId: StageMemberId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void>;

  readCustomStageMemberVolume(
    id: CustomStageMemberId
  ): Promise<CustomStageMemberVolume>;

  deleteCustomStageMemberVolume(id: CustomStageMemberId): Promise<void>;

  setCustomStageMemberPosition(
    userId: UserId,
    stageMemberId: StageMemberId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void>;

  readCustomStageMemberPosition(
    id: CustomStageMemberId
  ): Promise<CustomStageMemberPosition>;

  deleteCustomStageMemberPosition(id: CustomStageMemberId): Promise<void>;

  setCustomRemoteAudioProducerVolume(
    userId: UserId,
    RemoteAudioProducerId: RemoteAudioProducerId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void>;

  readCustomRemoteAudioProducerVolume(
    id: CustomRemoteAudioProducerId
  ): Promise<CustomRemoteAudioProducerVolume>;

  deleteCustomRemoteAudioProducerVolume(
    id: CustomRemoteAudioProducerId
  ): Promise<void>;

  setCustomRemoteAudioProducerPosition(
    userId: UserId,
    RemoteAudioProducerId: RemoteAudioProducerId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void>;

  readCustomRemoteAudioProducerPosition(
    id: CustomRemoteAudioProducerId
  ): Promise<CustomRemoteAudioProducerPosition>;

  deleteCustomRemoteAudioProducerPosition(
    id: CustomRemoteAudioProducerId
  ): Promise<void>;

  setCustomRemoteOvTrackVolume(
    userId: UserId,
    CustomRemoteOvTrackId: CustomRemoteOvTrackId,
    update: { volume?: number; muted?: boolean }
  ): Promise<void>;

  readCustomRemoteOvTrackVolume(
    id: CustomRemoteOvTrackId
  ): Promise<CustomRemoteOvTrackVolume>;

  deleteCustomRemoteOvTrackVolume(id: CustomRemoteOvTrackId): Promise<void>;

  setCustomRemoteOvTrackPosition(
    userId: UserId,
    CustomRemoteOvTrackId: CustomRemoteOvTrackId,
    update: Partial<ThreeDimensionProperties>
  ): Promise<void>;

  readCustomRemoteOvTrackPosition(
    id: CustomRemoteOvTrackId
  ): Promise<CustomRemoteOvTrackPosition>;

  deleteCustomRemoteOvTrackPosition(id: CustomRemoteOvTrackId): Promise<void>;

  // MESSAGING
  sendStageDataToDevice(socket: ITeckosSocket, user: User): Promise<void>;

  sendDeviceConfigurationToDevice(
    socket: ITeckosSocket,
    user: User
  ): Promise<void>;

  /**
   * Send event with payload to all users,
   * that are associated anyway to the stage (admins or stage members)
   * @param stageId
   * @param event
   * @param payload
   */
  sendToStage(stageId: StageId, event: string, payload?: any): Promise<void>;

  /**
   * Send event with payload to all users, that are manging this stage
   * @param stageId
   * @param event
   * @param payload
   */
  sendToStageManagers(
    stageId: StageId,
    event: string,
    payload?: any
  ): Promise<void>;

  /**
   * Send event with payload to the device
   * @param socket socket of device
   * @param event
   * @param payload
   */

  // sendToDevice(socket: socketIO.Socket, event: string, payload?: any): void;

  /**
   * Send event with payload to all users, that are currently joined in the stage
   * @param stageId
   * @param event
   * @param payload
   */
  sendToJoinedStageMembers(
    stageId: StageId,
    event: string,
    payload?: any
  ): Promise<void>;

  /**
   * Send event with payload to the given user (and all her/his devices)
   * @param _id id of user
   * @param event
   * @param payload
   */
  sendToUser(_id: UserId, event: string, payload?: any): void;

  sendToAll(event: string, payload?: any): void;
}
