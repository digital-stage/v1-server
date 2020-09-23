import {
    CustomGroupVolumeId,
    CustomStageMemberVolumeId,
    GroupId,
    GroupMemberId,
    Producer,
    StageId,
    StageMemberId,
    UserId
} from "./model.common";

namespace Server {
    export interface Stage {
        _id: StageId;
        name: string;

        password: string | null;

        admins: UserId[];

        // 3D Room specific
        width: number;
        length: number;
        height: number;
        absorption: number;
        reflection: number;
    }

    export interface Group {
        _id: GroupId;
        name: string;
        stageId: StageId;
        volume: number;
    }

    export interface CustomGroupVolume {
        _id: CustomGroupVolumeId;
        userId: UserId;
        stageId: StageId;
        groupId: GroupId;
        volume: number;
    }

    export interface StageMember {
        _id: StageMemberId;
        stageId: StageId;
        groupId: GroupId;
        userId: UserId;
        online: boolean;
        isDirector: boolean;
        volume: number;
        x: number;
        y: number;
        z: number;
    }

    export interface CustomStageMemberVolume {
        _id: CustomStageMemberVolumeId;
        userId: UserId;
        stageMemberId: StageMemberId;
        volume: number;
    }
}

export default Server;