import Client from "../model.client";
import {Device, DeviceId, GroupId, StageId, StageMemberId, UserId} from "../model.common";
import Server from "../model.server";


export interface IStorage {
    init(): Promise<any>;

    createUser(uid: string, name: string, avatarUrl: string | null): Promise<Server.User>;

    updateUserByUid(uid: string, user: Partial<Omit<Server.User, "_id">>): Promise<Server.User>;

    getUserByUid(uid: string): Promise<Server.User>;

    removeUserByUid(uid: string): Promise<Server.User>;

    createDevice(userId: UserId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    getDeviceByUserAndMac(userId: UserId, mac: string): Promise<Device>;

    updateDevice(deviceId: DeviceId, device: Partial<Omit<Device, "_id">>): Promise<Device>;

    removeDevice(deviceId: DeviceId): Promise<Device>;


    // User shall be able to create stage
    createStage(name: string, password: string | null, adminId: UserId): Promise<Server.Stage>;

    // Admin of stage shall be able to modify stage
    updateStage(stageId: StageId, stage: Partial<Omit<Server.Stage, "_id">>): Promise<Server.Stage>;

    // Admin of stage shall be able to remove stage
    removeStage(stageId: StageId): Promise<Server.Stage>;


    // Admin of stage shall be able to add groups
    createGroup(stageId: StageId, name: string): Promise<Server.Group>;

    // Admin of stage shall be able to modify groups (mostly name and volume)
    updateGroup(groupId: GroupId, group: Partial<Omit<Server.Group, "_id">>): Promise<Server.Group>;

    // Director and admin of stage shall be able to modify group (usually coordinates and volume) - duplicate of updateGroup
    setGroupVolume(groupId: GroupId, volume: number): Promise<Server.Group>;

    // Admin of stage shall be able to remove groups
    removeGroup(groupId: GroupId): Promise<Server.Group>;


    addStageMember(stageId: StageId, groupId: GroupId, userId: UserId): Promise<Server.StageMember>;

    // Director and admin of stage shall be able to modify stage member (usually coordinates and volume)
    updateStageMember(stageMemberId: StageMemberId, stageMember: Partial<Omit<Server.StageMember, "_id">>): Promise<Server.StageMember>;

    // Director and admin of stage shall be able to modify volume of stage member - duplicate of updateStageMember
    setStageMemberVolume(stageMemberId: StageMemberId, volume: number): Promise<Server.StageMember>;

    removeStageMember(stageMemberId: StageMemberId): Promise<Server.StageMember>;


    // User shall be able to modify personal group volume
    setCustomGroupVolume(userId: UserId, groupId: GroupId, volume: number): Promise<Server.CustomGroupVolume>;

    // User shall be able to modify personal stage member volume
    setCustomStageMemberVolume(userId: UserId, stageMemberId: StageMemberId, volume: number): Promise<Server.CustomStageMemberVolume>;

    // User shall be able to see history of visited stages
    //getUsersStageHistory(userId: UserId): Promise<Client.StageDescription[]>;


    // Send full stage when user connected with device
    generateStage(userId: UserId, stageId: StageId): Promise<Client.Stage>;
}