import {
    CustomGroup, CustomGroupId, CustomStageMember, CustomStageMemberId,
    Device,
    DeviceId, GlobalProducer, GlobalProducerId, Group, GroupId,
    SoundCard,
    SoundCardId, Stage, StageId, StageMember, StageMemberId, StageMemberTrack, StageMemberTrackId,
    Track, TrackId,
    TrackPreset,
    TrackPresetId,
    User,
    UserId
} from "../model.server";
import * as socketIO from "socket.io";

export interface IRealtimeDatabase {
    connect(database: string): Promise<void>;


    // USER HANDLING
    createUser(initial: Omit<User, "_id" | "stageId" | "stageMemberId">): Promise<User>;

    readUser(id: UserId): Promise<User>;

    readUserByUid(uid: string): Promise<User>;

    updateUser(id: UserId, update: Partial<Omit<User, "_id">>): Promise<User>;

    deleteUser(id: UserId): Promise<User>;


    // DEVICE HANDLING
    createDevice(initial: Omit<Device, "_id">): Promise<Device>;

    readDevice(id: DeviceId): Promise<Device | null>;

    readDevicesByServer(server: string): Promise<Device[]>;

    readDevicesByUser(userId: UserId): Promise<Device[]>;

    readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device | null>;

    updateDevice(userId: UserId, id: DeviceId, update: Partial<Omit<Device, "_id">>): Promise<Device>;

    deleteDevice(id: DeviceId): Promise<Device>;

    createSoundCard(initial: Omit<SoundCard, "_id">): Promise<SoundCard>;

    readSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<SoundCard>;

    updateSoundCard(deviceId: DeviceId, id: SoundCardId, update: Partial<Omit<SoundCard, "_id">>): Promise<SoundCard>;

    deleteSoundCard(deviceId: DeviceId, id: SoundCardId): Promise<SoundCard>;

    createTrackPreset(initial: Omit<TrackPreset, "_id">): Promise<TrackPreset>;

    readTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<TrackPreset>;

    updateTrackPreset(deviceId: DeviceId, id: TrackPresetId, update: Partial<Omit<TrackPreset, "_id">>): Promise<TrackPreset>;

    deleteTrackPreset(deviceId: DeviceId, id: TrackPresetId): Promise<TrackPreset>;

    createTrack(initial: Omit<Track, "_id" | "stageId">): Promise<Track>;

    readTrack(deviceId: DeviceId, id: TrackId): Promise<Track>;

    updateTrack(deviceId: DeviceId, id: TrackId, update: Partial<Omit<Track, "_id">>): Promise<Track>;

    deleteTrack(deviceId: DeviceId, id: TrackId): Promise<Track>;

    createProducer(initial: Omit<GlobalProducer, "_id">): Promise<GlobalProducer>;

    readProducer(deviceId: DeviceId , id: GlobalProducerId): Promise<GlobalProducer>;

    updateProducer(deviceId: DeviceId, id: GlobalProducerId, update: Partial<Omit<GlobalProducer, "_id">>): Promise<GlobalProducer>;

    deleteProducer(deviceId: DeviceId, id: GlobalProducerId): Promise<GlobalProducer>;


    // STAGE HANDLING
    createStage(initial: Omit<Stage, "_id">): Promise<Stage>;

    readStage(id: StageId): Promise<Stage>;

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId): Promise<Stage>;

    leaveStage(userId: UserId, skipLeaveNotification?: boolean): Promise<Stage>;

    updateStage(id: StageId, update: Partial<Omit<Stage, "_id">>): Promise<Stage>;

    deleteStage(id: StageId): Promise<Stage>;

    createGroup(initial: Omit<Group, "_id">): Promise<Group>;

    readGroup(id: GroupId): Promise<Group>;

    updateGroup(id: GroupId, update: Partial<Omit<Group, "_id">>): Promise<Group>;

    deleteGroup(id: GroupId): Promise<Group>;

    createCustomGroup(initial: Omit<CustomGroup, "_id">): Promise<CustomGroup>;

    readCustomGroup(id: CustomGroupId): Promise<CustomGroup>;

    updateCustomGroup(id: CustomGroupId, update: Partial<Omit<CustomGroup, "_id">>): Promise<CustomGroup>;

    deleteCustomGroup(id: CustomGroupId): Promise<CustomGroup>;

    createStageMember(initial: Omit<StageMember, "_id">): Promise<StageMember>;

    readStageMember(id: StageMemberId): Promise<StageMember>;

    updateStageMember(id: StageMemberId, update: Partial<Omit<StageMember, "_id">>): Promise<StageMember>;

    deleteStageMember(id: StageMemberId): Promise<StageMember>;

    createCustomStageMember(initial: Omit<CustomStageMember, "_id">): Promise<CustomStageMember>;

    readCustomStageMember(id: CustomStageMemberId): Promise<CustomStageMember>;

    updateCustomStageMember(id: CustomStageMemberId, update: Partial<Omit<CustomStageMember, "_id">>): Promise<CustomStageMember>;

    deleteCustomStageMember(id: CustomStageMemberId): Promise<CustomStageMember>;

    createStageMemberTrack(initial: Omit<StageMemberTrack, "_id">): Promise<StageMemberTrack>;

    readStageMemberTrack(id: StageMemberTrackId): Promise<StageMemberTrack>;

    updateStageMemberTrack(id: StageMemberTrackId, update: Partial<Omit<StageMemberTrack, "_id">>): Promise<StageMemberTrack>;

    deleteStageMemberTrack(id: StageMemberTrackId): Promise<StageMemberTrack>;


    // MESSAGING
    sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any>;

    /**
     * Send event with payload to all users, that are associated anyway to the stage (admins or stage members)
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
    sendToDevice(socket: socketIO.Socket, event: string, payload?: any): void;

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