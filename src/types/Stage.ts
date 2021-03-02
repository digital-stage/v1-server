import {RouterId, StageId, UserId} from "./IdTypes";


export interface Stage {
    _id: StageId;
    name: string;

    // SETTINGS
    admins: UserId[];
    password: string | null;
    // 3D Room specific
    width: number;
    length: number;
    height: number;
    absorption: number;
    damping: number;
    ambientSoundUrl?: string;
    ambientLevel: number;

    ovServer?: {
        router: RouterId;
        ipv4: string;
        ipv6?: string;
        port: number;
        pin: number;
        serverJitter?: number;

        latency?: {
            [srcOvStageDeviceId: number]: {
                [desOvStageDeviceId: number]: {
                    latency: number;
                    jitter: number;
                };
            };
        };
    };
}
