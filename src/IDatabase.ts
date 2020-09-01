import {DeviceId, GroupId, StageId, UserId} from "./model.common";
import Server from "./model.server";
import * as EventEmitter from "events";

export enum DatabaseEvents {
    // Important events for digital stage
    StageChanged = "stage-changed", // send update to each member
    StageRemoved = "stage-removed", // sign off every body
    GroupAdded = "group-added",
    GroupChanged = "group-changed",
    GroupRemoved = "group-removed",
    UserChanged = "user-changed",
    GroupVolumeChanged = "group-volume-changed",
    GroupVolumeRemoved = "group-volume-removed",
    GroupUserChanged = "group-user-changed",
    StageAdded = "stage-added",
    UserAdded = "user-added",
    UserRemoved = "user-removed",
    GroupVolumeAdded = "group-volume-added",
    GroupUserAdded = "group-user-added",
    GroupUserRemoved = "group-user-removed",
    GroupUserVolumeAdded = "group-user-volume-added",
    GroupUserVolumeChanged = "group-user-volume-changed",
    GroupUserVolumeRemoved = "group-user-volume-removed",
    DeviceAdded = "device-added",
    DeviceChanged = "device-changed",
    DeviceRemoved = "device-removed",
    RouterAdded = "router-added",
    RouterChanged = "router-changed",
    RouterRemoved = "router-removed",
    ProducerAdded = "producer-added",
    ProducerChanged = "producer-changed",
    ProducerRemoved = "producer-removed",
}

export interface IDatabase extends EventEmitter.EventEmitter {
    init(): Promise<any>;

    createStage(stage: Omit<Server.Stage, "id">): Promise<Server.Stage>;

    updateStage(id: StageId, stage: Partial<Server.Stage>): Promise<boolean>;

    readStage(id: StageId): Promise<Server.Stage>;

    readStages(): Promise<Server.Stage[]>;

    deleteStage(id: StageId): Promise<boolean>;

    createUser(user: Server.User): Promise<Server.User>;

    updateUser(id: UserId, user: Partial<Omit<Server.User, "id">>): Promise<boolean>;

    readUser(id: UserId): Promise<Server.User>;

    deleteUser(id: UserId): Promise<boolean>;

    createGroup(group: Omit<Server.Group, "id">): Promise<Server.Group>;

    updateGroup(id: GroupId, group: Partial<Omit<Server.Group, "id">>): Promise<boolean>;

    readGroup(id: GroupId): Promise<Server.Group>;

    readGroupsByStage(stageId: StageId): Promise<Server.Group[]>;

    deleteGroup(id: GroupId): Promise<boolean>;

    createDevice(device: Omit<Server.Device, "id">): Promise<Server.Device>;

    updateDevice(id: DeviceId, device: Partial<Omit<Server.Device, "id">>): Promise<boolean>;

    readDevice(id: DeviceId): Promise<Server.Device>;

    readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Server.Device>;

    deleteDevice(id: DeviceId): Promise<boolean>;

}