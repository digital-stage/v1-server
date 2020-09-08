import {
    CustomGroupVolumeId,
    CustomStageMemberVolumeId,
    DeviceId, GroupId,
    ProducerId, RouterId,
    StageId, StageMemberId,
    UserId
} from "./model.common";

/***
 *
 * A stage can have several groups
 * A stage can have several directors
 * A stage can have several admins
 *
 *
 * A group can have several group users
 * A group has one master volume (controlled by admins of the stage)
 * A group can have different custom group volumes (for other users)
 *
 * A group user has one master volume (controlled by admins of the stage)
 * A group user can have different custom group user volumes (for other users)
 *
 * A user can be a group user (only at once)
 *
 * A user can have several devices
 * A device can have several producers
 *
 */

namespace Server {
    export interface Stage {
        _id: StageId;
        name: string;
        password?: string;
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
        _id: GroupId;
        stageId: StageId;
        members: StageMemberId[];
        name: string;
        volume: number;
    }

    export interface StageMember {
        _id: StageMemberId;
        stage: StageId;   //TODO: Remove?
        user: UserId;
        group: GroupId;   //TODO: Remove?
        volume: number;
        isDirector: boolean;

        // 3D Room specific
        x: number;
        y: number;
        z: number;
    }

    // Custom volume of user for a group
    export interface CustomGroupVolume {
        _id: CustomGroupVolumeId;
        userId: string;
        groupId: string;
        volume: number;
    }

    // Custom volume of user for a group member
    export interface CustomStageMemberVolume {
        _id: CustomStageMemberVolumeId;
        userId: UserId;
        stageMemberId: string;
        volume: number;
    }

    export interface User {
        _id: UserId;
        uid: string;
        name: string;
        avatarUrl: string | null;
        stage: StageId | null;
        lastStages: StageId[];
    }
}

export default Server;