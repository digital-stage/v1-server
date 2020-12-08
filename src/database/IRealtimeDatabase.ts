import { Db } from 'mongodb';
import { ITeckosSocket } from 'teckos';
import {
  CustomGroup,
  CustomGroupId,
  CustomStageMember, CustomStageMemberAudioProducer, CustomStageMemberAudioProducerId,
  CustomStageMemberId, CustomStageMemberOvTrack, CustomStageMemberOvTrackId,
  Device,
  DeviceId,
  GlobalAudioProducer,
  GlobalAudioProducerId,
  GlobalVideoProducer,
  GlobalVideoProducerId,
  Group,
  GroupId,
  SoundCard,
  SoundCardId,
  Stage,
  StageId,
  StageMember,
  StageMemberAudioProducer,
  StageMemberAudioProducerId,
  StageMemberId,
  StageMemberOvTrack,
  StageMemberOvTrackId,
  StageMemberVideoProducer,
  StageMemberVideoProducerId,
  Track,
  TrackId,
  TrackPreset,
  TrackPresetId,
  User,
  UserId,
  ThreeDimensionAudioProperties,
} from '../types';

export interface IRealtimeDatabase {
  connect(database: string): Promise<void>;

  db(): Db;

  // USER HANDLING
  createUser(initial: Omit<User, '_id' | 'stageId' | 'stageMemberId'>): Promise<User>;

  readUser(id: UserId): Promise<User>;

  readUserByUid(uid: string): Promise<User>;

  updateUser(id: UserId, update: Partial<Omit<User, '_id'>>): Promise<void>;

  deleteUser(id: UserId): Promise<void>;

  // DEVICE HANDLING
  createDevice(initial: Omit<Device, '_id'>): Promise<Device>;

  readDevice(id: DeviceId): Promise<Device | null>;

  readDevicesByServer(server: string): Promise<Device[]>;

  readDevicesByUser(userId: UserId): Promise<Device[]>;

  readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device | null>;

  updateDevice(userId: UserId, id: DeviceId, update: Partial<Omit<Device, '_id'>>): Promise<void>;

  deleteDevice(id: DeviceId): Promise<void>;

  createSoundCard(initial: Omit<SoundCard, '_id'>): Promise<SoundCard>;

  readSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<SoundCard>;

  updateSoundCard(deviceId: DeviceId, id: SoundCardId, update: Partial<Omit<SoundCard, '_id'>>): Promise<void>;

  deleteSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<void>;

  createTrackPreset(initial: Omit<TrackPreset, '_id'>): Promise<TrackPreset>;

  readTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<TrackPreset>;

  updateTrackPreset(deviceId: DeviceId, id: TrackPresetId, update: Partial<Omit<TrackPreset, '_id'>>): Promise<void>;

  deleteTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<void>;

  createTrack(initial: Omit<Track, '_id' | 'stageId'>): Promise<Track>;

  readTrack(deviceId: DeviceId, id: TrackId): Promise<Track>;

  updateTrack(deviceId: DeviceId, id: TrackId, update: Partial<Omit<Track, '_id'>>): Promise<void>;

  deleteTrack(deviceId: DeviceId, id: TrackId): Promise<void>;

  createAudioProducer(initial: Omit<GlobalAudioProducer, '_id'>): Promise<GlobalAudioProducer>;

  readAudioProducer(id: GlobalAudioProducerId): Promise<GlobalAudioProducer>;

  updateAudioProducer(deviceId: DeviceId, id: GlobalAudioProducerId, update: Partial<Omit<GlobalAudioProducer, '_id'>>): Promise<void>;

  deleteAudioProducer(deviceId: DeviceId, id: GlobalAudioProducerId): Promise<void>;

  createVideoProducer(initial: Omit<GlobalVideoProducer, '_id'>): Promise<GlobalVideoProducer>;

  readVideoProducer(id: GlobalVideoProducerId): Promise<GlobalVideoProducer>;

  updateVideoProducer(deviceId: DeviceId, id: GlobalVideoProducerId, update: Partial<Omit<GlobalVideoProducer, '_id'>>): Promise<void>;

  deleteVideoProducer(deviceId: DeviceId, id: GlobalVideoProducerId): Promise<void>;

  // STAGE HANDLING
  createStage(initial: Omit<Stage, '_id'>): Promise<Stage>;

  readStage(id: StageId): Promise<Stage>;

  readManagedStage(userId: UserId, id: StageId): Promise<Stage>;

  joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string): Promise<void>;

  leaveStage(userId: UserId, skipLeaveNotification?: boolean): Promise<void>;

  updateStage(id: StageId, update: Partial<Omit<Stage, '_id'>>): Promise<void>;

  deleteStage(id: StageId): Promise<any>;

  createGroup(initial: Omit<Group, '_id'>): Promise<Group>;

  readGroup(id: GroupId): Promise<Group>;

  updateGroup(id: GroupId, update: Partial<Omit<Group, '_id'>>): Promise<void>;

  deleteGroup(id: GroupId): Promise<void>;

  createStageMember(initial: Omit<StageMember, '_id'>): Promise<StageMember>;

  readStageMember(id: StageMemberId): Promise<StageMember>;

  updateStageMember(id: StageMemberId, update: Partial<Omit<StageMember, '_id'>>): Promise<void>;

  deleteStageMember(id: StageMemberId): Promise<void>;

  createStageMemberOvTrack(initial: Omit<StageMemberOvTrack, '_id'>): Promise<StageMemberOvTrack>;

  readStageMemberOvTrack(id: StageMemberOvTrackId): Promise<StageMemberOvTrack>;

  updateStageMemberOvTrack(id: StageMemberOvTrackId, update: Partial<Omit<StageMemberOvTrack, '_id'>>): Promise<void>;

  deleteStageMemberOvTrack(id: StageMemberOvTrackId): Promise<void>;

  createStageMemberAudioProducer(initial: Omit<StageMemberAudioProducer, '_id'>): Promise<StageMemberAudioProducer>;

  readStageMemberAudioProducer(id: StageMemberAudioProducerId): Promise<StageMemberAudioProducer>;

  updateStageMemberAudioProducer(id: StageMemberAudioProducerId, update: Partial<Omit<StageMemberAudioProducer, '_id'>>): Promise<void>;

  deleteStageMemberAudioProducer(id: StageMemberAudioProducerId): Promise<void>;

  createStageMemberVideoProducer(initial: Omit<StageMemberVideoProducer, '_id'>): Promise<StageMemberVideoProducer>;

  readStageMemberVideoProducer(id: StageMemberVideoProducerId): Promise<StageMemberVideoProducer>;

  updateStageMemberVideoProducer(id: StageMemberVideoProducerId, update: Partial<Omit<StageMemberVideoProducer, '_id'>>): Promise<void>;

  deleteStageMemberVideoProducer(id: StageMemberVideoProducerId): Promise<void>;

  // Customized elements for each stage member
  createCustomGroup(initial: Omit<CustomGroup, '_id'>): Promise<CustomGroup>;

  readCustomGroup(id: CustomGroupId): Promise<CustomGroup>;

  setCustomGroup(
    userId: UserId,
    groupId: GroupId,
    update: Partial<ThreeDimensionAudioProperties>
  ): Promise<void>;

  updateCustomGroup(id: CustomGroupId, update: Partial<Omit<CustomGroup, '_id'>>): Promise<void>;

  deleteCustomGroup(id: CustomGroupId): Promise<void>;

  createCustomStageMember(initial: Omit<CustomStageMember, '_id'>): Promise<CustomStageMember>;

  readCustomStageMember(id: CustomStageMemberId): Promise<CustomStageMember>;

  setCustomStageMember(userId: UserId, stageMemberId: StageMemberId, update: Partial<Omit<CustomStageMember, '_id'>>): Promise<void>;

  updateCustomStageMember(id: CustomStageMemberId, update: Partial<Omit<CustomStageMember, '_id'>>): Promise<void>;

  deleteCustomStageMember(id: CustomStageMemberId): Promise<void>;

  createCustomStageMemberAudioProducer(initial: Omit<CustomStageMemberAudioProducer, '_id'>): Promise<CustomStageMemberAudioProducer>;

  readCustomStageMemberAudioProducer(id: CustomStageMemberAudioProducerId):
  Promise<CustomStageMemberAudioProducer>;

  setCustomStageMemberAudioProducer(userId: UserId, stageMemberAudioProducerId: StageMemberAudioProducerId, update: Partial<Omit<CustomStageMemberAudioProducer, '_id'>>): Promise<void>;

  updateCustomStageMemberAudioProducer(id: CustomStageMemberAudioProducerId, update: Partial<Omit<CustomStageMemberAudioProducer, '_id'>>): Promise<void>;

  deleteCustomStageMemberAudioProducer(id: CustomStageMemberAudioProducerId): Promise<void>;

  createCustomStageMemberOvTrack(initial: Omit<CustomStageMemberOvTrack, '_id'>): Promise<CustomStageMemberOvTrack>;

  readCustomStageMemberOvTrack(id: CustomStageMemberOvTrackId): Promise<CustomStageMemberOvTrack>;

  setCustomStageMemberOvTrack(userId: UserId, stageMemberOvTrackId: StageMemberOvTrackId, update: Partial<Omit<CustomStageMemberOvTrack, '_id'>>): Promise<void>;

  updateCustomStageMemberOvTrack(id: CustomStageMemberOvTrackId, update: Partial<Omit<CustomStageMemberOvTrack, '_id'>>): Promise<void>;

  deleteCustomStageMemberOvTrack(id: CustomStageMemberOvTrackId): Promise<void>;

  // MESSAGING
  sendInitialToDevice(socket: ITeckosSocket, user: User): Promise<void>;

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
  sendToStageManagers(stageId: StageId, event: string, payload?: any): Promise<void>;

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
  sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any): Promise<void>;

  /**
   * Send event with payload to the given user (and all her/his devices)
   * @param _id id of user
   * @param event
   * @param payload
   */
  sendToUser(_id: UserId, event: string, payload?: any): void;

  sendToAll(event: string, payload?: any): void;
}
