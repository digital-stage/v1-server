import {
    DeviceId,
    GroupId,
    ProducerId,
    StageId, StageMemberId,
    UserGroupVolumeId,
    UserId, UserStageMemberVolumeId
} from "../../src/model.common";
import Server from "../../src/model.server";
import * as EventEmitter from "server/src/events";

export enum DatabaseEvents {
    // User
    UserAdded = "user-added",
    UserChanged = "user-changed",
    UserRemoved = "user-removed",

    // Device
    DeviceAdded = "device-added",
    DeviceChanged = "device-changed",
    DeviceRemoved = "device-removed",

    // Producer
    ProducerAdded = "producer-added",
    ProducerChanged = "producer-changed",
    ProducerRemoved = "producer-removed",

    // Stage
    StageAdded = "stage-added",
    StageChanged = "stage-changed", // send update to each member
    StageRemoved = "stage-removed", // sign off every body

    // Stage Members
    StageMemberAdded = "stage-member-added",
    StageMemberChanged = "stage-member-added",
    StageMemberRemoved = "stage-member-removed",

    // User Stage Member Volume
    UserStageMemberVolumeAdded = "user-stage-member-volume-added",
    UserStageMemberVolumeChanged = "user-stage-member-volume-changed",
    UserStageMemberVolumeRemoved = "user-stage-member-volume-removed",

    // Group
    GroupAdded = "group-added",
    GroupChanged = "group-changed",
    GroupRemoved = "group-removed",

    // User Group Volume
    UserGroupVolumeAdded = "user-group-volume-added",
    UserGroupVolumeChanged = "user-group-volume-changed",
    UserGroupVolumeRemoved = "user-group-volume-removed",

    // Router
    RouterAdded = "router-added",
    RouterChanged = "router-changed",
    RouterRemoved = "router-removed",


}

export interface IDatabase extends EventEmitter.EventEmitter {
    init(): Promise<any>;

    // Users
    createUser(user: Server.User): Promise<Server.User>;

    updateUser(id: UserId, user: Partial<Omit<Server.User, "id">>): Promise<boolean>;

    readUser(id: UserId): Promise<Server.User>;

    deleteUser(id: UserId): Promise<boolean>;

    // Device
    createDevice(device: Omit<Server.Device, "id">): Promise<Server.Device>;

    updateDevice(id: DeviceId, device: Partial<Omit<Server.Device, "id">>): Promise<boolean>;

    readDevice(id: DeviceId): Promise<Server.Device>;

    readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Server.Device>;

    deleteDevice(id: DeviceId): Promise<boolean>;

    // Producers
    createProducer(device: Omit<Server.Producer, "id">): Promise<Server.Producer>;

    updateProducer(id: ProducerId, producer: Partial<Omit<Server.Producer, "id">>): Promise<boolean>;

    readProducer(id: ProducerId): Promise<Server.Producer>;

    deleteProducer(id: ProducerId): Promise<boolean>;

    // Stage
    createStage(stage: Omit<Server.Stage, "id">): Promise<Server.Stage>;

    updateStage(id: StageId, stage: Partial<Server.Stage>): Promise<boolean>;

    readStage(id: StageId): Promise<Server.Stage>;

    readStages(): Promise<Server.Stage[]>;

    deleteStage(id: StageId): Promise<boolean>;

    // Group
    createGroup(group: Omit<Server.Group, "id">): Promise<Server.Group>;

    updateGroup(id: GroupId, group: Partial<Omit<Server.Group, "id">>): Promise<boolean>;

    readGroup(id: GroupId): Promise<Server.Group>;

    readGroupsByStage(stageId: StageId): Promise<Server.Group[]>;

    deleteGroup(id: GroupId): Promise<boolean>;

    // Group Members
    createStageMember(stageMember: Omit<Server.StageMember, "id">): Promise<Server.StageMember>;

    updateStageMember(id: StageMemberId, group: Partial<Omit<Server.StageMember, "id">>): Promise<boolean>;

    readStageMember(id: StageMemberId): Promise<Server.StageMember>;

    deleteStageMember(id: StageMemberId): Promise<boolean>;

    // User Group Volume
    createUserGroupVolume(userGroupVolume: Omit<Server.UserGroupVolume, "id">): Promise<Server.UserGroupVolume>;

    readUserGroupVolume(id: UserGroupVolumeId): Promise<Server.UserGroupVolume>;

    updateUserGroupVolume(id: UserGroupVolumeId, userGroupVolume: Omit<Server.UserGroupVolume, "id">): Promise<boolean>;

    deleteUserGroupVolume(id: UserGroupVolumeId): Promise<boolean>;

    // User Group Member Volume
    createUserStageMemberVolume(userStageVolume: Omit<Server.UserStageMemberVolume, "id">): Promise<Server.UserStageMemberVolume>;

    readUserStageMemberVolume(id: UserStageMemberVolumeId): Promise<Server.UserStageMemberVolume>;

    updateUserStageMemberVolume(id: UserStageMemberVolumeId, userStageVolume: Omit<Server.UserStageMemberVolume, "id">): Promise<boolean>;

    deleteUserStageMemberVolume(id: UserStageMemberVolumeId): Promise<boolean>;

}