import * as socketIO from "socket.io";
import {StageId, User} from "../model.common";
import Client from "../model.client";
import {ClientStageEvents, ServerStageEvents} from "../events";
import * as pino from "pino";
import GroupMemberPrototype = Client.GroupMemberPrototype;
import {Errors} from "../errors";
import Model from "../storage/mongo/model.mongo";
import {GroupType} from "../storage/mongo/mongo.types";
import IEventReactor from "../IEventReactor";
import ISocketServer from "../ISocketServer";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

class SocketStageHandler {
    private readonly server: ISocketServer;
    private user: User;
    private readonly socket: socketIO.Socket;
    private readonly reactor: IEventReactor;

    constructor(server: ISocketServer, reactor: IEventReactor, socket: socketIO.Socket, user: User) {
        this.server = server;
        this.socket = socket;
        this.user = user;
        this.reactor = reactor;
    }

    public addSocketHandler() {
        // STAGE MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_STAGE, (initialStage: Partial<Client.StagePrototype>) =>
            // ADD STAGE
            this.reactor.addStage(this.user, initialStage)
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " created stage " + initialStage.name))
                .catch(error => logger.error(error))
        );
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: { id: string, stage: Partial<Client.StagePrototype> }) =>
            // CHANGE STAGE
            this.reactor.changeStage(this.user, payload.id, payload.stage)
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " changed stage " + payload.id))
                .catch(error => logger.error(error))
        );
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) =>
            // REMOVE STAGE
            this.reactor.removeStage(this.user, id)
        );

        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload: {
                stageId: string,
                name: string
            }) =>
                this.reactor.addGroup(this.user, payload.stageId, payload.name)
        );
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: { id: string, group: Partial<Client.GroupPrototype> }) =>
            // CHANGE GROUP
            this.reactor.changeGroup(this.user, payload.id, payload.group)
        );
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) =>
            // REMOVE GROUP
            this.reactor.removeGroup(this.user, id)
        );

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id: string, groupMember: Partial<GroupMemberPrototype>) =>
            // CHANGE GROUP MEMBER
            Model.GroupMemberModel.findById(id).exec()
                .then(stageMember => {
                    return Model.StageModel.findOne({_id: stageMember.stageId, admins: this.user._id}).lean().exec()
                        .then(stage => {
                            if (stage) {
                                return stageMember.update(groupMember)
                                    .then(stageMember => this.server.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                                        ...groupMember,
                                        _id: id
                                    }))
                                    .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " updated group member " + id))
                            }
                        })
                        .then(() => stageMember.update(groupMember)
                            .then(() => stageMember.toObject()))
                })
        );

        // STAGE MEMBERSHIP MANAGEMENT
        this.socket.on(ClientStageEvents.JOIN_STAGE, (payload: {
                stageId: string,
                groupId: string,
                password: string | null
            }, fn: (error?: string) => void) =>
                // JOIN STAGE
                this.reactor.joinStage(this.user, payload.stageId, payload.groupId, payload.password)
                    .then(() => fn())
                    .catch(error => fn(error))
        );
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
            // LEAVE STAGE
            this.reactor.leaveStage(this.user)
        );
        this.socket.on(ClientStageEvents.LEAVE_STAGE_FOR_GOOD, (id: StageId) => {
            // LEAVE STAGE FOR GOOD
            return Model.UserModel.findById(this.user._id).exec()
                .then(user => Model.GroupMemberModel.findOneAndRemove({userId: user._id, stageId: id})
                    .lean()
                    .then(stageMember => {
                        if (stageMember) {
                            if (user.stageId.toString() === stageMember.stageId.toString()) {
                                // Also logout
                                user.stageId = undefined;
                                user.stageMemberId = undefined;
                                user.save()
                                    .then(() => {
                                        this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT);
                                        this.server.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMember._id);
                                    });
                            }
                        }
                    }));
        });
    }

    sendStageToUser(stage: Client.StagePrototype): Promise<any> {
        this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            Model.GroupModel.find({stageId: stage._id})
                .lean().exec()
                .then(groups =>
                    groups.forEach(group => this.server.sendToUser(this.user._id, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            Model.GroupMemberModel.find({stageId: stage._id})
                .lean().exec()
                .then(groupMember => groupMember.forEach(stageMember => this.server.sendToUser(this.user._id, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (this.user.stageId && this.user.stageId.toString() === stage._id.toString()) {
            promises.push(this.sendProducersAndCustomVolumesToUser(stage._id));
        }
        return Promise.all(promises);
    }

    sendStageToDevice(stage: Client.StagePrototype): Promise<any> {
        const currentStageId = this.user.stageId ? this.user.stageId.toString() : undefined;
        this.server.sendToDevice(this.socket, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            Model.GroupModel.find({stageId: stage._id})
                .lean().exec()
                .then(groups =>
                    groups.forEach(group => this.server.sendToDevice(this.socket, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            Model.GroupMemberModel.find({stageId: stage._id})
                .lean().exec()
                .then(groupMember => groupMember.forEach(stageMember => this.server.sendToDevice(this.socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (currentStageId && currentStageId === stage._id.toString()) {
            promises.push(this.sendProducersAndCustomVolumesToDevice(stage._id));
        }
        return Promise.all(promises);
    }

    generateStages(): Promise<any> {
        return this.getStages()
            .then(stages => {
                    const promises: Promise<any>[] = stages.map(stage => this.sendStageToDevice(stage));
                    if (this.user.stageMemberId) {
                        promises.push(
                            Model.GroupMemberModel.findById(this.user.stageMemberId).lean().exec()
                                .then(stageMember => {
                                    if (stageMember)
                                        this.server.sendToDevice(this.socket, ServerStageEvents.STAGE_JOINED, {
                                            stageId: stageMember.stageId,
                                            groupId: stageMember.groupId
                                        })
                                })
                        );
                    }
                    return Promise.all(promises);
                }
            )
            .catch(error => {
                logger.error(error);
            });
    }

    private getStages = () => {
        return Model.GroupMemberModel.find({userId: this.user._id}).lean().exec()
            .then(stageMembers =>
                Model.StageModel.find({$or: [{_id: {$in: stageMembers.map(stageMember => stageMember.stageId)}}, {admins: this.user._id}]}).lean().exec()
            );
    }

    private sendProducersAndCustomVolumesToDevice = (stageId: StageId) => {
        return Model.UserModel.find({stageId: stageId}).lean().exec()
            .then(currentStageUsers => Promise.all([
                    // Get producers
                    Model.ProducerModel.find({userId: {$in: currentStageUsers.map(user => user._id)}})
                        .lean()
                        .exec()
                        .then(producers => producers.forEach(producer => this.server.sendToDevice(this.socket, ServerStageEvents.PRODUCER_ADDED, producer))),
                    Model.CustomGroupVolumeModel.find({userId: this.user._id, stageId: stageId})
                        .lean()
                        .exec()
                        .then(volumes => volumes.forEach(volume => this.server.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))),
                    Model.GroupMemberModel.find({stageId: stageId}).lean().exec()
                        .then(stageMembers =>
                            Model.CustomStageMemberVolumeModel.find({
                                userId: this.user._id,
                                stageMembers: {$in: stageMembers.map(stageMember => stageMember._id)}
                            })
                                .lean()
                                .exec()
                                .then(volumes => volumes.forEach(volume => this.server.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume)))
                        )
                ])
            );
    }
    private sendProducersAndCustomVolumesToUser = (stageId: StageId) => {
        return Model.UserModel.find({stageId: stageId}).lean().exec()
            .then(currentStageUsers => Promise.all([
                    // Get producers
                    Model.ProducerModel.find({userId: {$in: currentStageUsers.map(user => user._id)}})
                        .lean()
                        .exec()
                        .then(producers => producers.forEach(producer => this.server.sendToUser(this.user._id, ServerStageEvents.PRODUCER_ADDED, producer))),
                    Model.CustomGroupVolumeModel.find({userId: this.user._id, stageId: stageId})
                        .lean()
                        .exec()
                        .then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))),
                    Model.GroupMemberModel.find({stageId: stageId}).lean().exec()
                        .then(stageMembers =>
                            Model.CustomStageMemberVolumeModel.find({
                                userId: this.user._id,
                                stageMembers: {$in: stageMembers.map(stageMember => stageMember._id)}
                            })
                                .lean()
                                .exec()
                                .then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, volume)))
                        )
                ])
            );
    }
}

export default SocketStageHandler;