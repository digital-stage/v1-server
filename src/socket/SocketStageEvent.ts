import * as socketIO from "socket.io";
import SocketServer from "./SocketServer";
import {User} from "../model.common";
import {manager} from "../storage/Manager";
import Client from "../model.client";
import GroupMemberPrototype = Client.GroupMemberPrototype;
import {ClientStageEvents, ServerStageEvents} from "../events";


class SocketStageHandler {
    private user: User;
    private readonly socket: socketIO.Socket;

    constructor(socket: socketIO.Socket, user: User) {
        this.socket = socket;
        this.user = user;
    }

    public addSocketHandler() {
        // STAGE MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_STAGE, (payload: Partial<Client.StagePrototype>) => {
            console.log("add-stage");
            return manager.createStage(this.user, payload)
                .then(stage => {
                    console.log("Stage is:");
                    console.log(stage);
                    return stage;
                })
                .then(stage => SocketServer.sendToStage(stage._id, ServerStageEvents.STAGE_ADDED, stage))
                .catch(error => console.error(error))
        });
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: { id: string, stage: Partial<Client.StagePrototype> }) => {
                console.log("change-stage");
                console.log(payload);
                return manager.updateStage(this.user, payload.id, payload.stage)
                    .then(() => SocketServer.sendToStage(payload.id, ServerStageEvents.STAGE_CHANGED, payload));
            }
        );
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) =>
            manager.removeStage(this.user, id)
                .then(() =>
                    SocketServer.sendToStage(id, ServerStageEvents.STAGE_REMOVED, id)
                )
        );

        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload: {
            stageId: string,
            name: string
        }) => manager.addGroup(this.user, payload.stageId, payload.name).then(group => SocketServer.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group)));
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: { id: string, group: Partial<Client.GroupPrototype> }) => manager.updateGroup(this.user, payload.id, payload.group).then(group => SocketServer.sendToStage(group.stageId, ServerStageEvents.GROUP_CHANGED, payload)));
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
                            console.log("Sending managed stage " + stage.name);
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