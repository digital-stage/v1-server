import * as socketIO from "socket.io";
import SocketServer from "./SocketServer";
import {User} from "../model.common";
import {manager} from "../storage/mongo/MongoStageManager";
import Client from "../model.client";
import GroupMemberPrototype = Client.GroupMemberPrototype;

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
    CHANGE_STAGE = "change-stage",
    REMOVE_STAGE = "remove-stage",

    ADD_GROUP = "add-group",
    CHANGE_GROUP = "update-group",
    REMOVE_GROUP = "remove-group",

    CHANGE_GROUP_MEMBER = "update-group-member",
}

class SocketStageHandler {
    private user: User;
    private readonly socket: socketIO.Socket;

    constructor(socket: socketIO.Socket, user: User) {
        this.socket = socket;
        this.user = user;
    }

    public addSocketHandler() {
        // STAGE MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_STAGE, (payload: {
            name: string, password: string | null
        }) => manager.createStage(this.user, payload.name, payload.password).then(stage => SocketServer.sendToStage(stage._id, ServerStageEvents.STAGE_ADDED, stage)));
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (id: string, stage: Partial<Client.StagePrototype>) =>
            manager.updateStage(this.user, id, stage)
                .then(() => SocketServer.sendToStage(id, ServerStageEvents.STAGE_CHANGED, id))
        );
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) =>
            manager.removeStage(this.user, id)
                .then(() => SocketServer.sendToStage(id, ServerStageEvents.STAGE_REMOVED, id))
        );

        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload: {
            stageId: string,
            name: string
        }) => manager.addGroup(this.user, payload.stageId, payload.name).then(group => SocketServer.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group)));
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (id: string, group: Partial<Client.GroupPrototype>) => manager.updateGroup(this.user, id, group).then(() => SocketServer.sendToStage(this.user._id, ServerStageEvents.GROUP_CHANGED, group)));
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) => manager.removeGroup(this.user, id).then(() => SocketServer.sendToStage(this.user._id, ServerStageEvents.GROUP_REMOVED, id)));

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id: string, groupMember: Partial<GroupMemberPrototype>) =>
            manager.updateStageMember(this.user, id, groupMember)
                .then(stageMember => SocketServer.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                    ...groupMember,
                    _id: id
                })));

        // this.user STAGE MANAGEMENT (join, leave)
        this.socket.on(ClientStageEvents.JOIN_STAGE, (payload: {
            stageId: string,
            groupId: string,
            password: string | null
        }) => manager.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
            .then(groupMember => Promise.all([
                SocketServer.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember),
                manager.getActiveStageSnapshotByUser(this.user)
                    .then(stage => SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, stage))
            ])));
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
            Promise.all([
                SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT),
                manager.leaveStage(this.user)
            ]));

        // Handle internal events
        this.socket.on(ServerStageEvents.STAGE_READY, () => {
            console.log("Stage joined");
        })
    }

    generateStage(): Promise<any> {
        return Promise.all([
            // Send active stage
            manager.getActiveStageSnapshotByUser(this.user)
                .then(stage => SocketServer.sendToDevice(this.socket, ServerStageEvents.STAGE_READY, stage)),
            // Send non-active stages
            manager.getStagesByUser(this.user)
                .then(stages => {
                        stages.forEach(stage => {
                            // Send stage
                            SocketServer.sendToDevice(this.socket, ServerStageEvents.STAGE_ADDED, stage);
                            // Send associated models
                            return Promise.all([
                                // Send groups
                                manager.getGroupsByStage(stage._id)
                                    .then(groups =>
                                        groups.forEach(group => SocketServer.sendToDevice(this.socket, ServerStageEvents.GROUP_ADDED, group))),
                                // Send group members
                                manager.generateGroupMembersByStage(stage._id)
                                    .then(groupMember => groupMember.forEach(stageMember => SocketServer.sendToDevice(this.socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
                                // We don't send producers for non-active stages
                            ]);
                        });
                    }
                )
        ]);
    }
}

export default SocketStageHandler;