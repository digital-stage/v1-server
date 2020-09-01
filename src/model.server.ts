import {
    DeviceId, GroupId,
    GroupUserId,
    GroupUserVolumeId,
    GroupVolumeId,
    ProducerId, RouterId,
    StageId,
    UserId
} from "./model.common";


namespace Server {
    export interface Stage {
        id: StageId;
        name: string;
        password?: string;
        directors: UserId[];
        admins: UserId[];
        groups: GroupId[];

        // 3D Room specific
        width: number;
        length: number;
        height: number;
        absorption: number;
        reflection: number;
    }

    export interface Group {
        id: GroupId;
        name: string;
        volume: number;
        members: GroupUserId[];
        customVolumes: GroupVolumeId[];
    }

    export interface GroupVolume {
        id: string;
        userId: UserId;
        groupId: GroupId;
        volume: number;
    }

    export interface GroupUser extends Coordinates {
        id: GroupUserId;
        userId: UserId;
        volume: number;
        customVolumes: GroupUserVolume[];

        // 3D Room specific
        x: number;
        y: number;
        z: number;
    }

    export interface GroupUserVolume {
        id: GroupUserVolumeId;
        userId: UserId;
        groupUserId: GroupUserId;
        volume: number;
    }

    export interface User {
        id: UserId;
        name: string;
        avatarUrl?: string;
    }

    export interface Device {
        id: DeviceId;
        userId: UserId;
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
        id: ProducerId;
        deviceId: DeviceId;
        userId: UserId;
        kind: "audio" | "video" | "ov";
        routerId?: RouterId;
    }

    export interface Router {
        id: RouterId;
        ipv4: string;
        ipv6: string;
        port: number;
    }
}

export default Server;