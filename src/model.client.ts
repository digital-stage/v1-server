import {DeviceId, GroupId, GroupMemberId, ProducerId, RouterId, StageId, UserId} from "./model.common";

/**
 * REST:
 *
 * PUSH:    /stages
 * GET:     /stages (only where user is a stage member or admin or director)
 * PUT:     /stages/:stageId
 * DELETE:  /stages/:stageId
 *
 * PUSH:    /stages/:stageId/join
 * PUSH:    /stages/leave
 *
 * PUSH:    /stages/:stageId/groups
 * GET:     /stages/:stageId/groups     (only where user is stage admin, maybe duplicate of above)
 * PUT:     /stages/:stageId/groups/:groupId    (modify name)
 * DELETE:  /stages/:stageId/groups/:groupId
 *
 * PUSH:    /stages/:stageId/groups/:groupId    (add user to group)
 * GET:     /stages/:stageId/groups/:groupId    (duplicate?)
 * PUT:     /stages/:stageId/groups/:groupId/members/:memberId
 * DELETE:  /stages/:stageId/groups/:groupId/members/:memberId
 *
 * PUSH:    /stages/:stageId/directors
 * GET:     /stages/:stageId/directors
 * PUT:     /stages/:stageId/directors/:memberId
 * DELETE:  /stages/:stageId/directors/:memberId
 *
 * PUSH:    /stages/:stageId/admins
 * GET:     /stages/:stageId/admins
 * PUT:     /stages/:stageId/admins/:userId
 * DELETE:  /stages/:stageId/admins/:userId
 *
 * SOCKET:
 *
 * device-added
 * device-changed
 * device-removed
 *
 * change-group-volume (only admins)
 * change-group-member-volume (only admins)
 * change-directors (only admins)
 * change-admins (only admins, overwrite request by adding requesting admin)
 * add-group (only admins)
 * remove-group (only admins)
 * change-stage-member-group (only admins)
 * change-user-group-volume
 * change-user-group-member-volume
 * add-producer
 * remove-producer
 *
 * EVENTS:
 * stage-changed (includes directors-changed and admins-changed and name and room settings changes)
 * group-changed (mostly name)
 * group-member-added
 * group-member-changed
 * group-member-removed
 * producer-added
 * producer-changed
 * producer-removed
 *
 *
 * INITIAL SOCKET:
 * Send the active stage with all members, producers, admins, directors etc.
 *
 */

namespace Client {
    export interface UserDescription {
        _id: UserId;
        name: string;
        avatarUrl: string | null;
    }

    export interface User {
        _id: UserId;
        name: string;
        avatarUrl: string | null;
        stage: Stage | null;
        lastStageIds: StageDescription[];
    }

    export interface StageDescription {
        _id: StageId;
        name: string;
    }

    export interface Stage {
        _id: StageId,
        name: string;

        // 3D Room specific
        width: number;
        length: number;
        height: number;
        absorption: number;
        reflection: number;

        groups: Group[];
        admins: UserDescription[];
    }


    export interface Group {
        _id: GroupId;
        name: string;
        volume: number;
        customVolume?: number;

        members: GroupMember[];
    }


    export interface GroupMember {
        _id: GroupMemberId;
        name: string;
        avatarUrl: string | null;

        isDirector: boolean;

        volume: number;
        customVolume?: number;

        videoProducer: Producer[];
        audioProducer: Producer[];
        ovProducer: Producer[];

        // 3D Room specific
        x: number;
        y: number;
        z: number;
    }

    export interface Producer {
        _id: ProducerId;
        deviceId: DeviceId;
        userId: UserId;
        kind: "audio" | "video" | "ov";
        routerId?: RouterId;
    }

    export interface Router {
        _id: RouterId;
        ipv4: string;
        ipv6: string;
        port: number;
    }
}

export default Client;