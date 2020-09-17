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
        }, fn: (error?: string) => void) => {
            // Is the stage already in the scope of the user?
            return manager.isUserAssociatedWithStage(this.user, payload.stageId)
                .then(wasAssociatedWithStage => {
                    return manager.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
                        .then(groupMember => {
                            SocketServer.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember);
                            SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, {
                                stageId: payload.stageId,
                                groupId: payload.groupId
                            });
                            if (!wasAssociatedWithStage) {
                                // Send whole stage
                                return manager.getStage(groupMember.stageId).then(stage => this.sendStageToUser(stage));
                            }
                            // Return only additional stage information
                            return Promise.all([
                                manager.getProducersByStage(groupMember.stageId).then(producers => producers.forEach(producer => SocketServer.sendToUser(this.user._id, ServerStageEvents.PRODUCER_ADDED, producer))),
                                manager.getCustomGroupVolumesByUserAndStage(this.user, groupMember.stageId).then(volumes => volumes.forEach(volume => SocketServer.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))),
                                manager.getCustomStageMemberVolumesByUserAndStage(this.user, groupMember.stageId).then(volumes => volumes.forEach(volume => SocketServer.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume)))
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
                SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT),
                manager.leaveStage(this.user)
            ])
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " left stage "))
        );
    }

    sendStageToUser(stage: Client.StagePrototype): Promise<any> {
        const currentStageId = this.user.stageId.toString();
        SocketServer.sendToUser(this.user._id, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            manager.getGroupsByStage(stage._id)
                .then(groups =>
                    groups.forEach(group => SocketServer.sendToUser(this.user._id, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            manager.generateGroupMembersByStage(stage._id)
                .then(groupMember => groupMember.forEach(stageMember => SocketServer.sendToUser(this.user._id, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (currentStageId === stage._id.toString()) {
            promises.push(manager.getProducersByStage(stage._id).then(producers => producers.forEach(producer => SocketServer.sendToUser(this.user._id, ServerStageEvents.PRODUCER_ADDED, producer))));
            promises.push(manager.getCustomGroupVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => SocketServer.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))));
            promises.push(manager.getCustomStageMemberVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => SocketServer.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume))));
        }
        return Promise.all(promises);
    }

    sendStageToDevice(stage: Client.StagePrototype): Promise<any> {
        const currentStageId = this.user.stageId ? this.user.stageId.toString() : undefined;
        SocketServer.sendToDevice(this.socket, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            manager.getGroupsByStage(stage._id)
                .then(groups =>
                    groups.forEach(group => SocketServer.sendToDevice(this.socket, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            manager.generateGroupMembersByStage(stage._id)
                .then(groupMember => groupMember.forEach(stageMember => SocketServer.sendToDevice(this.socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (currentStageId === stage._id.toString()) {
            promises.push(manager.getProducersByStage(stage._id).then(producers => producers.forEach(producer => SocketServer.sendToDevice(this.socket, ServerStageEvents.PRODUCER_ADDED, producer))));
            promises.push(manager.getCustomGroupVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => SocketServer.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))));
            promises.push(manager.getCustomStageMemberVolumesByUserAndStage(this.user, stage._id).then(volumes => volumes.forEach(volume => SocketServer.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume))));
        }
        return Promise.all(promises);
    }

    generateStage(): Promise<any> {
        return manager.getStagesByUser(this.user)
            .then(stages => {
                    const promises: Promise<any>[] = stages.map(stage => this.sendStageToDevice(stage));
                    if (this.user.stageId) {
                        SocketServer.sendToDevice(this.socket, ServerStageEvents.STAGE_JOINED, this.user._id.toString());
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