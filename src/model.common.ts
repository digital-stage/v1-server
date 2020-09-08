export type StageId = string;
export type GroupId = string;
export type UserId = string;
export type GroupMemberId = string;
export type StageMemberId = string;
export type DeviceId = string;
export type RouterId = string;
export type ProducerId = string;
export type CustomGroupVolumeId = string;
export type CustomStageMemberVolumeId = string;

export interface Device {
    _id: DeviceId;
    userId: UserId;
    online: boolean;
    mac?: string;
    name: string;
    canVideo: boolean;
    canAudio: boolean;
    sendVideo: boolean;
    sendAudio: boolean;
    receiveVideo: boolean;
    receiveAudio: boolean;
    audioDevices?: {
        [id: string]: {
            name: string;
        }
    }
    inputAudioDevice?: string;
    outputAudioDevice?: string;
    videoProducer: ProducerId[];
    audioProducer: ProducerId[];
    ovProducer: ProducerId[];
}

export interface Producer {
    _id: ProducerId;
    userId: UserId;
    deviceId: DeviceId;
    kind: "audio" | "video" | "ov";
    routerId?: RouterId;
}

export interface Router {
    _id: RouterId;
    ipv4: string;
    ipv6: string;
    port: number;
}