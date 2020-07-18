import {
    Device,
    RemoteDevicePayload,
    RemoteTrackPayload,
    RemoteUserPayload,
    Stage,
    StagePayload,
    Track,
    User
} from "./data.model";

export interface IDatabase {
    // To send initial data to a newly connected device
    getUser(userId: string): Promise<User>;

    getDevicesByUser(userId: string): Promise<Device[]>;

    getTracksByUser(userId: string): Promise<Track[]>;

    getStage(stageId: string): Promise<StagePayload>;

    getRemoteUsersByStage(stageId: string): Promise<RemoteUserPayload[]>;

    getRemoteDevicesByStage(stageId: string): Promise<RemoteDevicePayload[]>;

    getRemoteTracksByStageForUser(stageId: string, userId: string): Promise<RemoteTrackPayload[]>;

    // To handle commands
    createUser(id: string, name: string, avatarUrl?: string): Promise<User>;

    // - to check if device may be registered (by mac)
    getDeviceByUserAndMac(userId: string, mac: string): Promise<Device>;

    getDevice(deviceId: string): Promise<Device>;

    registerDevice(userId: string, initialData: Partial<Omit<Omit<Device, "id">, "userId">>): Promise<Device>;

    unregisterDevice(deviceId: string): Promise<void>;

    addTrack(userId: string, deviceId: string, name: string): Promise<Track>;

    getTrack(trackId: string): Promise<Track>;

    updateTrack(trackId: string, track: Partial<Omit<Track, "id">>): Promise<Track>;

    removeTrack(trackId: string): Promise<Track>;

    setRemoteTrackDataForStageAndUser(stageId: string, userId: string, trackId: string, volume: number, x?: number, y?: number, z?: number): Promise<void>;

    updateUser(userId: string, user: Partial<Omit<User, "id">>): Promise<void>;

    updateStage(stageId: string, stage: Partial<Omit<Stage, "id">>): Promise<void>;
}
