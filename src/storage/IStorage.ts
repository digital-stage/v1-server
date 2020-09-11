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
    createDevice(user: User, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    getDevicesByUser(user: User): Promise<Device[]>;

    getDeviceByUserAndMac(user: User, mac: string): Promise<Device>;

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    removeDevice(deviceId: DeviceId): Promise<Device>;

    getDevices(): Promise<Device[]>;
}

export interface IStageManagement {
    init(): Promise<any>;

    createStage(user: User, name: string, password): Promise<Client.StagePrototype>;

    joinStage(user: User, stageId: StageId, groupId: GroupId, password?: string): Promise<Client.GroupMemberPrototype>;

    leaveStage(user: User): Promise<boolean>;

    getStagesByUser(user: User): Promise<Client.StagePrototype[]>;

    getStage(stageId: StageId): Promise<Client.StagePrototype>;

    getManagedStages(user: User): Promise<Client.StagePrototype[]>;

    updateStage(user: User, stageId: StageId, stage: Partial<Client.StagePrototype>): Promise<Client.StagePrototype>;

    removeStage(user: User, stageId: StageId): Promise<Client.StagePrototype>;

    addGroup(user: User, stageId: StageId, name: string): Promise<Client.GroupPrototype>;

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]>;

    updateGroup(user: User, groupId: GroupId, group: Partial<Client.GroupPrototype>): Promise<Client.GroupPrototype>;

    removeGroup(user: User, groupId: GroupId): Promise<Client.GroupPrototype>;

    setCustomGroupVolume(user: User, groupId: GroupId, volume: number);

    setCustomStageMemberVolume(user: User, stageMemberId: StageMemberId, volume: number);

    updateStageMember(user: User, id: StageMemberId, groupMember: Partial<Client.StageMemberPrototype>): Promise<Client.StageMemberPrototype>;

    createUserWithUid(uid: string, name: string, avatarUrl?: string): Promise<User>;

    getUser(id: string): Promise<User>;

    getJoinedUsersOfStage(stageId: StageId): Promise<User[]>;

    getUserByUid(uid: string): Promise<User>;

    getUsersByStage(stageId: StageId): Promise<User[]>;

    getUsersManagingStage(stageId: StageId): Promise<User[]>;

    addProducer(user: User, device: Device, kind: "audio" | "video" | "ov", routerId: RouterId): Promise<Producer>;

    updateProducer(device: Device, producerId: ProducerId, producer: Partial<Producer>): Promise<Producer>;

    removeProducer(device: Device, producerId: ProducerId): Promise<Producer>;

    getActiveStageSnapshotByUser(user: User): Promise<Client.Stage>;

    // Methods for init stage building
    //TODO: Optimize the data model to support fastest possible fetch
    getProducersByStage(stageId: StageId): Promise<Producer[]>;

    getCustomGroupVolumesByUserAndStage(user: User, stageId: StageId): Promise<Client.CustomGroupVolume[]>;

    getCustomStageMemberVolumesByUserAndStage(user: User, stageId: StageId): Promise<Client.CustomStageMemberVolume[]>;

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
    createDevice(user: User, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    getDevicesByUser(user: User): Promise<Device[]>;

    getDeviceByUserAndMac(user: User, mac: string): Promise<Device>;

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    removeDevice(deviceId: DeviceId): Promise<Device>;

    getDevices(): Promise<Device[]>;


    // User shall be able to create stage
    createStage(name: string, password: string | null, adminId: UserId): Promise<Client.StagePrototype>;

    getStage(stageId: StageId): Promise<Client.StagePrototype>;

    getStagesByUser(user: User): Promise<Client.StagePrototype[]>;

    getManagedStageByUser(stageId: StageId, user: User): Promise<Client.StagePrototype[]>;

    //TODO: Discuss, if we may remove the privileges check and outsource it
    updateStage(adminuser: User, stageId: StageId, stage: Partial<Omit<Client.StagePrototype, "_id">>): Promise<Client.StagePrototype>;

    //TODO: Discuss, if we may remove the privileges check and outsource it
    removeStage(adminuser: User, stageId: StageId): Promise<Client.StagePrototype>;


    // Group management
    //TODO: Discuss, if we may remove the privileges check and outsource it
    createGroup(adminuser: User, stageId: StageId, name: string): Promise<Client.GroupPrototype>;

    //TODO: Discuss, if we may remove the privileges check and outsource it
    updateGroup(adminuser: User, groupId: GroupId, group: Partial<Omit<Client.GroupPrototype, "_id">>): Promise<Client.GroupPrototype>;

    getGroup(groupId: GroupId): Promise<Client.GroupPrototype>;

    getGroupsByStage(stageId: StageId): Promise<Client.GroupPrototype[]>;

    // Admin of stage shall be able to remove groups
    removeGroup(groupId: GroupId): Promise<Client.GroupPrototype>;


    // Stage member management
    createStageMember(stageId: StageId, groupId: GroupId, user: User): Promise<Client.StageMemberPrototype>;

    getStageMembersByStage(stageId: StageId): Promise<Client.StageMemberPrototype[]>;

    // Director and admin of stage shall be able to modify stage member (usually coordinates and volume)
    //TODO: Discuss, if we may remove the privileges check and outsource it
    updateStageMember(adminuser: User, stageMemberId: StageMemberId, stageMember: Partial<Omit<Client.StageMemberPrototype, "_id">>): Promise<Client.StageMemberPrototype>;

    removeStageMember(stageMemberId: StageMemberId): Promise<Client.StageMemberPrototype>;

    // Custom Group volume management
    setCustomGroupVolume(user: User, groupId: GroupId, volume: number): Promise<Client.CustomGroupVolume>;

    // Custom Stage member volume management
    setCustomStageMemberVolume(user: User, stageMemberId: StageMemberId, volume: number): Promise<Client.CustomStageMemberVolume>;
}