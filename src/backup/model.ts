export interface User {
    id: string;
    name: string;
    avatarUrl?: string;

    stageId: string | null;
}

export interface Device {
    id: string;
    userId: string;
    name: string;

    canAudio: boolean;
    canVideo: boolean;

    sendAudio: boolean;
    sendVideo: boolean;
    receiveAudio: boolean;
    receiveVideo: boolean;

    mac?: string;

    ipv4?: string;
    ipv6?: string;
    port?: number;

    audioDevices?: {
        [id: string]: string;
    }
    inputAudioDevice?: string;
    outputAudioDevice?: string;
}

export interface Track {
    id: string;
    deviceId: string;
    kind: "audio" | "video" | "ov-audio";

    // Web specific
    routerId?: string;
    producerId?: string;
}

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

    // OV specific
    ipv4?: string;
    ipv6?: string;
    port?: number;
}

/**
 * Assignment between stage and tracks with default values (usually managed by the stage admin)
 */
export interface StageTrack {
    id: string;
    stageId: string;
    trackId: string;

    volume: number;
    x: number;
    y: number;
    z: number;
}

/**
 * Customized StageTrack for a specific user
 */
export interface UserStageTrack {
    stageTrackId: string;
    volume: number;
    x: number;
    y: number;
    z: number;
}
