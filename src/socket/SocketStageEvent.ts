import * as socketIO from "socket.io";
import {ISocketServer} from "./SocketServer";
import {User} from "../model.common";
import Client from "../model.client";
import {ClientStageEvents, ServerStageEvents} from "../events";
import * as pino from "pino";
import GroupMemberPrototype = Client.GroupMemberPrototype;
import {IStageManager, IUserManager} from "../storage/IManager";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

class SocketStageHandler {
    private readonly manager: IStageManager & IUserManager;
    private readonly server: ISocketServer;
    private user: User;
    private readonly socket: socketIO.Socket;

    constructor(manager: IStageManager & IUserManager, server: ISocketServer, socket: socketIO.Socket, user: User) {
        this.manager = manager;
        this.server = server;
        this.socket = socket;
        this.user = user;
    }

    public addSocketHandler() {
        // STAGE MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_STAGE, (payload: Partial<Client.StagePrototype>) => {
            return this.manager.createStage(this.user, payload)
                .then(stage => stage.admins.forEach(admin => this.server.sendToUser(admin, ServerStageEvents.STAGE_ADDED, stage)))
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " created stage " + payload.name))
                .catch(error => logger.error(error))
        });
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: { id: string, stage: Partial<Client.StagePrototype> }) => {
                return this.manager.updateStage(this.user, payload.id, payload.stage)
                    .then(() => this.server.sendToStage(payload.id, ServerStageEvents.STAGE_CHANGED, payload))
                    .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " changed stage " + payload.id))
            }
        );
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) =>
            this.manager.getUsersByStage(id)
                .then(stageUsers => this.manager.removeStage(this.user, id)
                    .then(() => stageUsers.forEach(stageUser => this.server.sendToUser(stageUser._id, ServerStageEvents.STAGE_REMOVED, id)))
                    .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " removed stage " + id)))
        );

        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload: {
                stageId: string,
                name: string
            }) => this.manager.addGroup(this.user, payload.stageId, payload.name)
                .then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group))
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " added group " + payload.name))
        );
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: { id: string, group: Partial<Client.GroupPrototype> }) => this.manager.updateGroup(this.user, payload.id, payload.group)
            .then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_CHANGED, payload))
            .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " updated group " + payload.id))
        );
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) => this.manager.removeGroup(this.user, id)
            .then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_REMOVED, id))
            .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " removed group " + id))
        );

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id: string, groupMember: Partial<GroupMemberPrototype>) =>
            this.manager.updateStageMember(this.user, id, groupMember)
                .then(stageMember => this.server.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
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
        }, fn: (error?: string) => void) => {
            // Is the stage already in the scope of the user?
            return this.manager.isUserAssociatedWithStage(this.user, payload.stageId)
                .then(wasAssociatedWithStage => {
                    return this.manager.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
                        .then(groupMember => {
                            this.server.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember);
                            this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, {
                                stageId: groupMember.stageId,
                                groupId: groupMember.groupId
                            });
                            if (!wasAssociatedWithStage) {
                                // Send whole stage
                                return this.manager.getStage(groupMember.stageId).then(stage => this.sendStageToUser(stage));
                            }
                            // Return only additional stage information
                            return Promise.all([
                                this.manager.getProducersByStage(groupMember.stageId).then(producers => producers.forEach(producer => this.server.sendToUser(this.user._id, ServerStageEvents.PRODUCER_ADDED, producer))),
                                this.manager.getCustomGroupVolumesByUserAndStage(this.user, groupMember.stageId).then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))),
                                this.manager.getCustomStageMemberVolumesByUserAndStage(this.user, groupMember.stageId).then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume)))
                            ])
                        })
                        .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " joined stage " + payload.stageId))
                        .then(() => {
                            fn()
                        })
                        .catch(error => {
                            fn(error.message)
                        })
                });
        });

        this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
            Promise.all([
                this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT),
                this.manager.leaveStage(this.user)
            ])
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " left stage "))
        );
    }

    sendStageToUser(stage: Client.StagePrototype): Promise<any> {
        const currentStageId = this.user.stageId.toString();
        this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            this.manager.getGroupsByStage(stage._id)
                .then(groups =>
                    groups.forEach(group => this.server.sendToUser(this.user._id, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            this.manager.generateGroupMembersByStage(stage._id)
                .then(groupMember => groupMember.forEach(stageMember => this.server.sendToUser(this.user._id, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (currentStageId === stage._id.toString()) {
            promises.push(this.manager.getProducersByStage(stage._id).then(producers => producers.forEach(producer => this.server.sendToUser(this.user._id, ServerStageEvents.PRODUCER_ADDED, producer))));
            promises.push(this.manager.getCustomGroupVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))));
            promises.push(this.manager.getCustomStageMemberVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume))));
        }
        return Promise.all(promises);
    }

    sendStageToDevice(stage: Client.StagePrototype): Promise<any> {
        const currentStageId = this.user.stageId ? this.user.stageId.toString() : undefined;
        this.server.sendToDevice(this.socket, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            this.manager.getGroupsByStage(stage._id)
                .then(groups =>
                    groups.forEach(group => this.server.sendToDevice(this.socket, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            this.manager.generateGroupMembersByStage(stage._id)
                .then(groupMember => groupMember.forEach(stageMember => this.server.sendToDevice(this.socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (currentStageId && currentStageId === stage._id.toString()) {
            promises.push(this.manager.getProducersByStage(stage._id).then(producers => producers.forEach(producer => this.server.sendToDevice(this.socket, ServerStageEvents.PRODUCER_ADDED, producer))));
            promises.push(this.manager.getCustomGroupVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => this.server.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))));
            promises.push(this.manager.getCustomStageMemberVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => this.server.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume))));
        }
        return Promise.all(promises);
    }

    generateStages(): Promise<any> {
        return this.manager.getStagesByUser(this.user)
            .then(stages => {
                    const promises: Promise<any>[] = stages.map(stage => this.sendStageToDevice(stage));
                    if (this.user.stageMemberId) {
                        promises.push(
                            this.manager.getStageMember(this.user, this.user.stageMemberId)
                                .then(stageMember => this.server.sendToDevice(this.socket, ServerStageEvents.STAGE_JOINED, {
                                    stageId: stageMember.stageId,
                                    groupId: stageMember.groupId
                                }))
                        );
                    }
                    return Promise.all(promises);
                }
            )
            .catch(error => {
                logger.error(error);
            });
    }
}

export default SocketStageHandler;