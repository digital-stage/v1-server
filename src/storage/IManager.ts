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
    User, UserId
} from "../model.common";
import {UserType} from "./mongo/model.mongo";

export interface IDeviceManager {
    init(): Promise<any>;

    // Device management
    createDevice(user: User, server: string, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    getDevicesByUser(user: User): Promise<Device[]>;

    getDeviceByUserAndMac(user: User, mac: string): Promise<Device>;

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    removeDevice(deviceId: DeviceId): Promise<Device>;

    removeDevicesByServer(serverAddress: string): Promise<Device[]>;

    getDevices(): Promise<Device[]>;
}

export interface IStageManager {
    init(): Promise<any>;

    createStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<Client.StagePrototype>;

    joinStage(user: User, stageId: StageId, groupId: GroupId, password?: string): Promise<Client.GroupMemberPrototype>;

    leaveStage(user: User): Promise<boolean>;

    isStageManager(user: User, stageId: StageId): Promise<boolean>;

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

    getUserByUid(uid: string): Promise<User>;

    getJoinedUsersOfStage(stageId: StageId): Promise<User[]>;

    getUser(userId: UserId): Promise<User>;

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