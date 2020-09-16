import * as socketIO from "socket.io";
import SocketServer from "./SocketServer";
import {User} from "../model.common";
import {manager} from "../storage/Manager";
import Client from "../model.client";
import {ClientStageEvents, ServerStageEvents} from "../events";
import * as pino from "pino";
import GroupMemberPrototype = Client.GroupMemberPrototype;

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

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
            return manager.createStage(this.user, payload)
                .then(stage => stage.admins.forEach(admin => SocketServer.sendToUser(admin, ServerStageEvents.STAGE_ADDED, stage)))
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " created stage " + payload.name))
                .catch(error => logger.error(error))
        });
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: { id: string, stage: Partial<Client.StagePrototype> }) => {
                return manager.updateStage(this.user, payload.id, payload.stage)
                    .then(() => SocketServer.sendToStage(payload.id, ServerStageEvents.STAGE_CHANGED, payload))
                    .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " changed stage " + payload.id))
            }
        );
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) =>
            manager.getUsersByStage(id)
                .then(stageUsers => manager.removeStage(this.user, id)
                    .then(() => stageUsers.forEach(stageUser => SocketServer.sendToUser(stageUser._id, ServerStageEvents.STAGE_REMOVED, id)))
                    .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " removed stage " + id)))
        );

        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload: {
                stageId: string,
                name: string
            }) => manager.addGroup(this.user, payload.stageId, payload.name)
                .then(group => SocketServer.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group))
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " added group " + payload.name))
        );
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: { id: string, group: Partial<Client.GroupPrototype> }) => manager.updateGroup(this.user, payload.id, payload.group)
            .then(group => SocketServer.sendToStage(group.stageId, ServerStageEvents.GROUP_CHANGED, payload))
            .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " updated group " + payload.id))
        );
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) => manager.removeGroup(this.user, id)
            .then(group => SocketServer.sendToStage(group.stageId, ServerStageEvents.GROUP_REMOVED, id))
            .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " removed group " + id))
        );

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id: string, groupMember: Partial<GroupMemberPrototype>) =>
            manager.updateStageMember(this.user, id, groupMember)
                .then(stageMember => SocketServer.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                    ...groupMember,
                    _id: id
                }))
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " updated group member " + id))
        );

        // this.user STAGE MANAGEMENT (join, leave)
        this.socket.on(ClientStageEvents.JOIN_STAGE, (payload: {
                stageId: string,
                groupId: string,
                password: string | null
            }, fn: (error?: string) => void) => manager.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
                .then(groupMember => {
                    SocketServer.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember);
                    SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, payload.stageId);
                })
                /* .then(groupMember => Promise.all([
                        SocketServer.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember),
                        manager.getActiveStageSnapshotByUser(this.user)
                            .then(stage => SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, stage))
                            .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " joined stage " + payload.stageId))
                    ]))*/
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " joined stage " + payload.stageId))
                .then(() => {
                    console.log("all right");
                    fn()
                })
                .catch(error => {
                    console.log("Sending error" + error);
                    fn(error.message)
                })
        );
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
            Promise.all([
                SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT),
                manager.leaveStage(this.user)
            ])
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " left stage "))
        );

        // Handle internal events
        this.socket.on(ServerStageEvents.STAGE_READY, () => {
            console.log("Stage joined");
        })
    }

    generateStage(): Promise<any> {
        return Promise.all([
            // Send active stage
            /*
            manager.getActiveStageSnapshotByUser(this.user)
                .then(stage => {
                    if (stage) {
                        SocketServer.sendToDevice(this.socket, ServerStageEvents.STAGE_READY, stage);
                        logger.trace("[SOCKET STAGE EVENT] Send active stage " + stage.name + " to user " + this.user.name);
                    }
                }),*/
            // Send non-active stages
            manager.getStagesByUser(this.user)
                .then(stages => {
                        stages.forEach(stage => {
                            // Send stage
                            logger.trace("[SOCKET STAGE EVENT] Send managed stage " + stage.name + " to user " + this.user.name);
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
                .then(() => {
                    if (this.user.stageId) {
                        SocketServer.sendToDevice(this.socket, ServerStageEvents.STAGE_JOINED, this.user.stageId);
                    }
                })
        ]);
    }
}

export default SocketStageHandler;