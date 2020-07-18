export interface RemoteDevicePayload {
    uid: string;
    ipv4: string;
    ipv6: string;
    port: number;
    x: number;
    y: number;
    z: number;
    tracks: {
        [trackId: string]: {
            volume: number;
        }
    }
}

export interface UserTable {
    uid: string;
    name: string;
    stageId?: string;
    avatarUrl?: string;
}

export interface StageTable {
    id: string;
    name: string;
    password: string;
    width: number;
    length: number;
    height: number;
    absorption: number;
    reflection: number;
    defaultUserSettings: {
        [uid: string]: IStageUserSettings
    }
}

export interface CustomizedStageTable {
    uid: string;        // Assigned UserTable
    stageId: string;    // Assigned StageTable
    userSettings: {
        [uid: string]: IStageUserSettings
    }
}

export interface IStageUserSettings {
    masterVolume: number
    devices: {
        [deviceId: string]: {
            x: number;
            y: number;
            z: number;
            volume: number;
        }
    }
    tracks: {
        [id: string]: {
            x: number;
            y: number;
            z: number;
            volume: number;
        }
    }
}

// ALTERNATIVE TO CustomizedStageTable
export interface MasterVolumeTable {
    uid: string;
    stageId: string;
    stageUserId: string;
    value: number;
}

export interface TrackVolumeTable {
    uid: string;
    stageId: string;
    trackId: string;
    value: number;
}

export interface TrackPositionTable {
    uid: string;
    stageId: string;
    trackId: string;
    position: {
        x: number;
        y: number;
        z: number;
    }
}


export interface DeviceTable {
    id: string;
    uid: string;
    ipv4: string;
    ipv6: string;
    port: number;

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

export interface TrackTable {
    id: string;
    name: string;
}
