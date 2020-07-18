/***
 * INTERNAL DATA MODEL
 */
export interface Stage {
    id: string;
    name: string;
    password: string;
    width: number;
    length: number;
    height: number;
    absorption: number;
    reflection: number;
    adminId: string;
}

export interface User {
    id: string;
    name: string;
    stageId: string | null;
    avatarUrl?: string;
}

export interface Device {
    id: string;
    mac: string;
    userId: string;
    name: string;
    ipv4: string;
    ipv6: string;
    port: number;
    type: "ov" | "browser";
    canAudio: boolean;
    canVideo: boolean;

    sendAudio: boolean;
    sendVideo: boolean;
    receiveAudio: boolean;
    receiveVideo: boolean;

    audioDevices: {
        [id: string]: string;
    }
    inputAudioDevice: string;
    outputAudioDevice: string;
}

export interface Track {
    id: string;
    userId: string;
    deviceId: string;
    name: string;
}

export interface StageTrack {
    trackId: string;
    x: number;
    y: number;
    z: number;
}

export interface StageTrackUserData {
    stageId: string;
    trackId: string;
    userId: string;
    volume: number;
    x?: number;
    y?: number;
    z?: number;
}


/***
 * EVENTS
 */
export enum EVENTS {
    DEVICE_ADDED = "device-added",
    DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed",

    TRACK_ADDED = "track-added",
    TRACK_CHANGED = "track-changed",
    TRACK_REMOVED = "track-removed",

    STAGE_CHANGED = "stage-changed",

    USER_CHANGED = "user-changed",

    REMOTE_USER_ADDED = "remote-user-added",
    REMOTE_USER_CHANGED = "remote-user-changed",
    REMOTE_USER_REMOVED = "remote-user-removed",

    REMOTE_DEVICE_ADDED = "remote-device-added",
    REMOTE_DEVICE_CHANGED = "remote-device-changed",
    REMOTE_DEVICE_REMOVED = "remote-device-removed",

    REMOTE_TRACK_ADDED = "remote-track-added",
    REMOTE_TRACK_CHANGED = "remote-track-changed",
    REMOTE_TRACK_REMOVED = "remote-track-removed",

    READY = "ready"
}

export enum COMMANDS {
    REGISTER_DEVICE = "register-device",
    UPDATE_DEVICE = "update-device",
    UNREGISTER_DEVICE = "unregister-device",

    ADD_TRACK = "add-track",
    UPDATE_TRACK = "update-track",
    REMOVE_TRACK = "remote-track",

    CREATE_STAGE = "create-stage",
    JOIN_STAGE = "join-stage",
    LEAVE_STAGE = "leave-stage",

    UPDATE_USER = "update-user",

    UPDATE_STAGE = "update-stage",  // will only work with enough permissions

    UPDATE_REMOTE_TRACK = "update-remote-track",
}

/***
 * PAYLOADS
 */
// For own devices
export type DevicePayload = Device;

export type StagePayload = Stage;

export interface UserPayload {
    id: string;
    name: string;
    avatarUrl?: string;
}

export interface RemoteUserPayload {
    id: string;
    name: string;
    avatarUrl?: string;
}

export interface RemoteDevicePayload {
    id: string;
    userId: string;
    name: string;   // Tobi's OV-Box 1
    ipv4: string;
    ipv6: string;
    port: number;
    type: "ov" | "browser";
}

// THE FOLLOWING NEEDS TO BE CUSTOM BUILD
export interface RemoteTrackPayload {
    userId: string;
    deviceId: string;
    name: string;   // Tobi's MIC
    volume: number;
    x: number;
    y: number;
    z: number;
}
