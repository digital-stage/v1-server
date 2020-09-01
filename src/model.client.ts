import {DeviceId, ProducerId, RouterId, UserId} from "./model.common";


export type StageId = string;
export type GroupId = string;
export type StageMemberId = string;

namespace Client {

    export interface Stage {
        id: StageId;
        name: string;
        groups: Group[];
        admins: StageMember[];
        directors: StageMember[];

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
        customVolume?: number;

        members: StageMember[];
    }

    export interface StageMember {
        id: StageMemberId;
        name: string;
        avatarUrl: string;
        isAdmin: boolean;
        isDirector: boolean;

        volume: number;
        customVolume?: number;

        videoProducer: ProducerId[];
        audioProducer: ProducerId[];
        ovProducer: ProducerId[];

        // 3D Room specific
        x: number;
        y: number;
        z: number;
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

export default Client;