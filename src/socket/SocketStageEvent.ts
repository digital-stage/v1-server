import * as socketIO from "socket.io";
import SocketServer from "./SocketServer";
import {User} from "../model.common";
import {manager} from "../storage/mongo/MongoStageManager";

export enum ServerStageEvents {
    STAGE_READY = "stage-ready",

    STAGE_LEFT = "stage-left",
    STAGE_JOINED = "stage-joined",

    STAGE_ADDED = "stage-added",
    STAGE_CHANGED = "stage-changed",
    STAGE_REMOVED = "stage-removed",

    GROUP_ADDED = "group-added",
    GROUP_CHANGED = "group-changed",
    GROUP_REMOVED = "group-removed",

    GROUP_MEMBER_ADDED = "group-member-added",
    GROUP_MEMBER_CHANGED = "group-member-changed",
    GROUP_MEMBER_REMOVED = "group-member-removed",

    CUSTOM_GROUP_VOLUME_ADDED = "custom-group-volume-added",
    CUSTOM_GROUP_VOLUME_CHANGED = "custom-group-volume-changed",
    CUSTOM_GROUP_VOLUME_REMOVED = "custom-group-volume-removed",

    CUSTOM_GROUP_MEMBER_VOLUME_ADDED = "custom-group-member-volume-added",
    CUSTOM_GROUP_MEMBER_CHANGED = "custom-group-member-volume-changed",
    CUSTOM_GROUP_MEMBER_REMOVED = "custom-group-member-volume-removed",

    PRODUCER_ADDED = "producer-added",
    PRODUCER_CHANGED = "producer-changed",
    PRODUCER_REMOVED = "producer-removed",
}

export enum ClientStageEvents {
    ADD_STAGE = "add-stage",

    JOIN_STAGE = "join-stage",
    LEAVE_STAGE = "leave-stage",

    SET_CUSTOM_GROUP_VOLUME = "set-custom-group-volume",
    SET_CUSTOM_GROUP_MEMBER_VOLUME = "set-custom-group-member-volume",

    ADD_PRODUCER = "add-producer",
    CHANGE_PRODUCER = "add-producer",
    REMOVE_PRODUCER = "remove-producer",

    // Following shall be only possible if client is admin of stage
    UPDATE_STAGE = "update-stage",
    REMOVE_STAGE = "remove-stage",

    ADD_GROUP = "add-group",
    CHANGE_GROUP = "update-group",
    REMOVE_GROUP = "remove-group",

    CHANGE_GROUP_MEMBER = "update-group-member",
}

namespace SocketStageEvent {

    export async function generateStage(user: User, socket: socketIO.Socket): Promise<any> {
        return Promise.all([
            // Send active stage
            manager.getActiveStageSnapshotByUser(user._id)
                .then(stage => SocketServer.sendToDevice(socket, ServerStageEvents.STAGE_READY, stage)),
            // Send non-active stages
            manager.getStagesByUser(user._id)
                .then(stages => {
                        stages.forEach(stage => {
                            // Send stage
                            SocketServer.sendToDevice(socket, ServerStageEvents.STAGE_ADDED, stage);
                            // Send associated models
                            return Promise.all([
                                // Send groups
                                manager.getGroupsByStage(stage._id)
                                    .then(groups =>
                                        groups.forEach(group => SocketServer.sendToDevice(socket, ServerStageEvents.GROUP_ADDED, group))),
                                // Send group members
                                manager.generateGroupMembersByStage(stage._id)
                                    .then(groupMember => groupMember.forEach(stageMember => SocketServer.sendToDevice(socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
                                // We don't send producers for non-active stages
                            ]);
                        });
                    }
                )
        ]);
    }

    export function loadStageEvents(user: User, socket: socketIO.Socket) {
        socket.on(ClientStageEvents.ADD_STAGE, (payload: {
            name: string, password: string | null
        }) => {
            return manager.createStage(user._id, payload.name, payload.password);
        });

        socket.on(ClientStageEvents.JOIN_STAGE, (payload: {
            stageId: string,
            groupId: string,
            password: string | null
        }) => {
            console.log(payload);
            return manager.joinStage(user._id, payload.stageId, payload.groupId, payload.password);
        });

        socket.on(ClientStageEvents.LEAVE_STAGE, () => manager.leaveStage(user._id));

        socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) => {
            return manager.removeStage(user._id, id);
        });

        socket.on(ClientStageEvents.ADD_GROUP, (payload: {
            stageId: string,
            name: string
        }) => manager.addGroup(user._id, payload.stageId, payload.name));

        socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) => {
            return manager.removeGroup(user._id, id);
        });
    }
}
export default SocketStageEvent;