import Client from "../model.client";
import {
    Device,
    DeviceId,
    GroupId,
    Producer,
    ProducerId,
    RouterId,
    StageId,
    StageMemberId,
    User,
    UserId
} from "../model.common";

export interface IDeviceManagement {
    init(): Promise<any>;

    // Device management
    createDevice(userId: UserId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    getDevicesByUser(userId: UserId): Promise<Device[]>;

    getDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device>;

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    removeDevice(deviceId: DeviceId): Promise<Device>;

    getDevices(): Promise<Device[]>;
}

export interface IStageManagement {
    init(): Promise<any>;

    createStage(userId: UserId, name: string, password);

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string);

    leaveStage(userId: UserId);

    getStagesByUser(userId: UserId): Promise<Client.StagePrototype[]>;

    updateStage(userId: UserId, stageId: StageId, stage: Partial<Client.StagePrototype>);

    removeStage(userId: UserId, stageId: StageId);

    addGroup(userId: UserId, stageId: StageId, name: string);

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]>;

    updateGroup(userId: UserId, groupId: GroupId, group: Partial<Client.GroupPrototype>);

    removeGroup(userId: UserId, groupId: GroupId);

    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number);

    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number);

    updateStageMember(id: StageMemberId, groupMember: Partial<Client.StageMemberPrototype>);

    getUsersWithActiveStage(stageId: StageId): Promise<User[]>;

    getUserByUid(uid: string): Promise<User>;

    getUsersByStage(stageId: StageId): Promise<User[]>;

    addProducer(userId: UserId, deviceId: DeviceId, kind: "audio" | "video" | "ov", routerId: RouterId);


    updateProducer(userId: UserId, producerId: ProducerId, producer: Partial<Producer>);

    removeProducer(userId: UserId, producerId: ProducerId);

    getActiveStageSnapshotByUser(userId: UserId): Promise<Client.Stage>;

    // Methods for init stage building
    //TODO: Optimize the data model to support fastest possible fetch
    getProducersByStage(stageId: StageId): Promise<Producer[]>;

    getCustomGroupVolumesByUserAndStage(userId: UserId, stageId: StageId): Promise<Client.CustomGroupVolume[]>;

    getCustomStageMemberVolumesByUserAndStage(userId: UserId, stageId: StageId): Promise<Client.CustomStageMemberVolume[]>;

    generateGroupMembersByStage(stageId: StageId): Promise<Client.GroupMemberPrototype[]>;
}

export interface IStorage {
    init(): Promise<any>;

    // User management
    createUser(uid: string, name: string, avatarUrl: string | null): Promise<User>;

    //updateUser(id: UserId, user: Partial<Omit<User, "_id">>): Promise<User>;

    updateUserByUid(uid: string, user: Partial<Omit<User, "_id">>): Promise<User>;

    getUserByUid(uid: string): Promise<User>;

    removeUserByUid(uid: string): Promise<User>;

    // Device management
    createDevice(userId: UserId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    getDevicesByUser(userId: UserId): Promise<Device[]>;

    getDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device>;

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    removeDevice(deviceId: DeviceId): Promise<Device>;

    getDevices(): Promise<Device[]>;


    // User shall be able to create stage
    createStage(name: string, password: string | null, adminId: UserId): Promise<Client.StagePrototype>;

    getStage(stageId: StageId): Promise<Client.StagePrototype>;

    getStagesByUser(userId: UserId): Promise<Client.StagePrototype[]>;

    getManagedStageByUser(stageId: StageId, userId: UserId): Promise<Client.StagePrototype[]>;

    //TODO: Discuss, if we may remove the privileges check and outsource it
    updateStage(adminUserId: UserId, stageId: StageId, stage: Partial<Omit<Client.StagePrototype, "_id">>): Promise<Client.StagePrototype>;

    //TODO: Discuss, if we may remove the privileges check and outsource it
    removeStage(adminUserId: UserId, stageId: StageId): Promise<Client.StagePrototype>;


    // Group management
    //TODO: Discuss, if we may remove the privileges check and outsource it
    createGroup(adminUserId: UserId, stageId: StageId, name: string): Promise<Client.GroupPrototype>;

    //TODO: Discuss, if we may remove the privileges check and outsource it
    updateGroup(adminUserId: UserId, groupId: GroupId, group: Partial<Omit<Client.GroupPrototype, "_id">>): Promise<Client.GroupPrototype>;

    getGroup(groupId: GroupId): Promise<Client.GroupPrototype>;

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]>;

    // Admin of stage shall be able to remove groups
    removeGroup(groupId: GroupId): Promise<Client.GroupPrototype>;


    // Stage member management
    createStageMember(stageId: StageId, groupId: GroupId, userId: UserId): Promise<Client.StageMemberPrototype>;

    getStageMembersByStage(stageId: StageId): Promise<Client.StageMemberPrototype[]>;

    // Director and admin of stage shall be able to modify stage member (usually coordinates and volume)
    //TODO: Discuss, if we may remove the privileges check and outsource it
    updateStageMember(adminUserId: UserId, stageMemberId: StageMemberId, stageMember: Partial<Omit<Client.StageMemberPrototype, "_id">>): Promise<Client.StageMemberPrototype>;

    removeStageMember(stageMemberId: StageMemberId): Promise<Client.StageMemberPrototype>;

    // Custom Group volume management
    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number): Promise<Client.CustomGroupVolume>;

    // Custom Stage member volume management
    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number): Promise<Client.CustomStageMemberVolume>;
}