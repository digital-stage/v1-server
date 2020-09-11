import {DeviceId, GroupId, GroupMemberId, Producer, ProducerId, RouterId, StageId, UserId} from "./model.common";
import {
    CustomGroupVolumeId,
    CustomStageMemberVolumeId,
    StageMemberId
} from "../../react-hooks/lib/useSocket/model.common";

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
    export interface StagePrototype {
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

    export interface GroupPrototype {
        _id: GroupId;
        name: string;
        stageId: string;
        volume: number;
    }

    export interface StageMemberPrototype {
        _id: StageMemberId;
        stageId: StageId;
        groupId: GroupId;
        isDirector: boolean;
        userId: UserId;
        volume: number;
        x: number;
        y: number;
        z: number;
    }

    export interface CustomGroupVolume {
        _id: CustomGroupVolumeId;
        userId: UserId;
        stageId: StageId;
        groupId: GroupId;
        volume: number;
    }

    export interface CustomStageMemberVolume {
        _id: CustomStageMemberVolumeId;
        userId: UserId;
        stageMemberId: StageMemberId;
        volume: number;
    }

    export interface Stage extends StagePrototype {
        groups: Group[];
    }

    export interface Group extends GroupPrototype {
        members: GroupMember[];
    }

    export interface GroupMemberPrototype extends StageMemberPrototype {
        name: string;
        avatarUrl?: string;
    }

    export interface GroupMember extends GroupMemberPrototype {
        videoProducers: Producer[];
        audioProducers: Producer[];
        ovProducers: Producer[];
    }
}

export default Client;