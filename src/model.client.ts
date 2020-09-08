import {DeviceId, GroupId, GroupMemberId, Producer, ProducerId, RouterId, StageId, UserId} from "./model.common";

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

    export interface UserPrototype {
        _id: UserId;
        name: string;
        avatarUrl: string | null;
    }

    export interface User extends UserPrototype {
        stage: Stage | null;
        stages: Stage[];
    }


    export interface StagePrototype {
        _id: StageId;
        name: string;

        password: string | null;    // Will be only set for admins of this stage

        // 3D Room specific
        width: number;
        length: number;
        height: number;
        absorption: number;
        reflection: number;

        groups: GroupPrototype[];
        admins: UserPrototype[];
    }

    export interface Stage extends StagePrototype {
        groups: Group[];
        admins: UserPrototype[];
    }

    export interface GroupPrototype {
        _id: GroupId;
        name: string;

        volume: number;

        members: GroupMemberPrototype[];
    }

    export interface Group extends GroupPrototype {
        customVolume?: number;

        members: GroupMember[];
    }

    export interface GroupMemberPrototype extends UserPrototype {
        _id: GroupMemberId;

        isDirector: boolean;

        volume: number;

        // 3D Room specific
        x: number;
        y: number;
        z: number;
    }

    export interface GroupMember extends GroupMemberPrototype {
        customVolume?: number;

        videoProducer: Producer[];
        audioProducer: Producer[];
        ovProducer: Producer[];

    }
}

export default Client;