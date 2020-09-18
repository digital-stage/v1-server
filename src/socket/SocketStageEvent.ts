import * as socketIO from "socket.io";
import {ISocketServer} from "./SocketServer";
import {StageId, User} from "../model.common";
import Client from "../model.client";
import {ClientStageEvents, ServerDeviceEvents, ServerStageEvents} from "../events";
import * as pino from "pino";
import GroupMemberPrototype = Client.GroupMemberPrototype;
import {
    CustomGroupVolumeModel, CustomStageMemberVolumeModel,
    GroupModel,
    GroupType,
    ProducerModel,
    StageMemberModel, StageModel,
    UserModel
} from "../storage/mongo/model.mongo";
import {Errors} from "../errors";
import {IEventReactor} from "./EventReactor";

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
                // ADD GROUP
                StageModel.findOne({_id: payload.stageId, admins: this.user._id})
                    .then(stage => {
                        if (stage) {
                            const group = new GroupModel();
                            group.stageId = stage._id;
                            group.name = payload.name;
                            return group.save()
                                .then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_ADDED, group))
                                .then(() => logger.debug("[SOCKET STAGE EVENT] User " + this.user.name + " added group " + payload.name))
                        }
                    })
        );
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: { id: string, group: Partial<Client.GroupPrototype> }) =>
            // CHANGE GROUP
            GroupModel.findById(payload.id).populate("stageId").exec()
                .then((group: GroupType) => {
                    if (group) {
                        // Check permissions, they are inside the stage...
                        return StageModel.findOne({_id: group.stageId, admins: this.user._id}).exec()
                            .then(stage => {
                                if (stage) {
                                    group.updateOne(payload.group)
                                        .then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_CHANGED, payload))
                                        .then(() => logger.debug("[SOCKET STAGE EVENT] User " + this.user.name + " updated group " + payload.id))
                                }
                            });
                    }
                })
        );
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) =>
            // REMOVE GROUP
            GroupModel.findById(id).exec()
                .then(group => {
                    if (group) {
                        // Check permissions, they are inside the stage...
                        return StageModel.findOne({_id: group.stageId, admins: this.user._id}).exec()
                            .then(stage => {
                                if (stage) {
                                    group.remove().then(group => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_REMOVED, id))
                                        .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " removed group " + id));
                                }
                            });
                    }
                })
        );

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id: string, groupMember: Partial<GroupMemberPrototype>) =>
            // CHANGE GROUP MEMBER
            StageMemberModel.findById(id).exec()
                .then(stageMember => {
                    return StageModel.findOne({_id: stageMember.stageId, admins: this.user._id}).lean().exec()
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
        }, fn: (error?: string) => void) => {
            // JOIN STAGE
            let hasUserStageReceived = false;
            return StageModel.findById(payload.stageId)
                .lean()
                .exec()
                .then(stage => {
                    if (!stage) {
                        return fn(Errors.NOT_FOUND);
                    }
                    // Check if password matches
                    if (stage.password && stage.password !== payload.password) {
                        return fn(Errors.INVALID_PASSWORD);
                    }
                    if (stage.admins.find(admin => admin === this.user._id.toString())) {
                        hasUserStageReceived = true;
                    }
                    return GroupModel.findById(payload.groupId)
                        .lean()
                        .exec()
                        .then(group => {
                            if (!group) {
                                return fn(Errors.NOT_FOUND);
                            }
                            return StageMemberModel.findOne({userId: this.user._id, stageId: stage._id}).exec()
                                .then(groupMember => {
                                    if (!groupMember) {
                                        groupMember = new StageMemberModel();
                                        groupMember.userId = this.user._id;
                                        groupMember.groupId = group._id;
                                        groupMember.stageId = stage._id;
                                        groupMember.volume = 1;
                                    } else {
                                        if (groupMember.groupId === group._id) {
                                            return;
                                        }
                                        hasUserStageReceived = true;
                                    }
                                    groupMember.groupId = payload.groupId;
                                    return groupMember.save();
                                })
                                .then(async groupMember => {
                                    // Inform other stage members
                                    logger.debug("[SOCKET STAGE EVENT] Send stage member " + this.user.name + " to stage " + stage.name);
                                    this.server.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember);

                                    const user = await UserModel.findById(this.user._id);
                                    user.stageId = stage._id;
                                    user.stageMemberId = groupMember._id;
                                    await user.save();

                                    // Send additional stage objects to user
                                    logger.debug("[SOCKET STAGE EVENT] Sending custom volumes and producers of group " + stage.name + " to " + this.user.name);

                                    return UserModel.updateOne({_id: this.user._id}, {
                                        stageId: stage._id,
                                        stageMemberId: groupMember._id
                                    }).lean()
                                        .then(() => {
                                            if (!hasUserStageReceived) {
                                                // Send stage to user, since he has not received it yet
                                                logger.debug("[SOCKET STAGE EVENT] Send stage " + stage.name + " to user " + this.user.name);
                                                return this.sendStageToUser(stage);
                                            }
                                        })
                                        .then(() => {
                                                logger.debug("[SOCKET STAGE EVENT] Inform user " + this.user.name + " about join to " + stage.name);
                                                this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_JOINED, {
                                                    stageId: groupMember.stageId,
                                                    groupId: groupMember.groupId
                                                });
                                            }
                                        )
                                })
                                .then(() => {
                                    logger.debug("[SOCKET STAGE EVENT] Sending custom volumes and producers of group " + stage.name + " to " + this.user.name);
                                    return this.sendProducersAndCustomVolumesToUser(stage._id)
                                })
                                .then(() => fn())
                        })
                })
        });
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () => {
            // LEAVE STAGE
            return UserModel.findById(this.user._id).exec()
                .then(user => {
                    if (user.stageMemberId) {
                        const stageId = user.stageId;
                        const stageMemberId = user.stageMemberId;
                        user.stageId = undefined;
                        user.stageMemberId = undefined;
                        user.save()
                            .then(() => {
                                this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_LEFT);
                                this.server.sendToStage(stageId, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMemberId);
                            })
                            .then(() => logger.debug("[SOCKET STAGE EVENT] User " + this.user.name + " left stage "));
                    }
                });
        });
        this.socket.on(ClientStageEvents.LEAVE_STAGE_FOR_GOOD, (id: StageId) => {
            // LEAVE STAGE FOR GOOD
            return UserModel.findById(this.user._id).exec()
                .then(user => StageMemberModel.findOneAndRemove({userId: user._id, stageId: id})
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
        const currentStageId = this.user.stageId.toString();
        this.server.sendToUser(this.user._id, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            GroupModel.find({stageId: stage._id})
                .lean().exec()
                .then(groups =>
                    groups.forEach(group => this.server.sendToUser(this.user._id, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            StageMemberModel.find({stageId: stage._id})
                .lean().exec()
                .then(groupMember => groupMember.forEach(stageMember => this.server.sendToUser(this.user._id, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember))),
        ];
        if (currentStageId === stage._id.toString()) {
            promises.push(this.sendProducersAndCustomVolumesToUser(stage._id));
        }
        return Promise.all(promises);
    }

    sendStageToDevice(stage: Client.StagePrototype): Promise<any> {
        const currentStageId = this.user.stageId ? this.user.stageId.toString() : undefined;
        this.server.sendToDevice(this.socket, ServerStageEvents.STAGE_ADDED, stage);
        const promises: Promise<any>[] = [
            // Send groups
            GroupModel.find({stageId: stage._id})
                .lean().exec()
                .then(groups =>
                    groups.forEach(group => this.server.sendToDevice(this.socket, ServerStageEvents.GROUP_ADDED, group))),
            // Send group members
            StageMemberModel.find({stageId: stage._id})
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
                            StageMemberModel.findById(this.user.stageMemberId).lean().exec()
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
        return StageMemberModel.find({userId: this.user._id}).lean().exec()
            .then(stageMembers =>
                StageModel.find({$or: [{_id: {$in: stageMembers.map(stageMember => stageMember.stageId)}}, {admins: this.user._id}]}).lean().exec()
            );
    }

    private sendProducersAndCustomVolumesToDevice = (stageId: StageId) => {
        return UserModel.find({stageId: stageId}).lean().exec()
            .then(currentStageUsers => Promise.all([
                    // Get producers
                    ProducerModel.find({userId: {$in: currentStageUsers.map(user => user._id)}})
                        .lean()
                        .exec()
                        .then(producers => producers.forEach(producer => this.server.sendToDevice(this.socket, ServerStageEvents.PRODUCER_ADDED, producer))),
                    CustomGroupVolumeModel.find({userId: this.user._id, stageId: stageId})
                        .lean()
                        .exec()
                        .then(volumes => volumes.forEach(volume => this.server.sendToDevice(this.socket, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))),
                    StageMemberModel.find({stageId: stageId}).lean().exec()
                        .then(stageMembers =>
                            CustomStageMemberVolumeModel.find({
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
        return UserModel.find({stageId: stageId}).lean().exec()
            .then(currentStageUsers => Promise.all([
                    // Get producers
                    ProducerModel.find({userId: {$in: currentStageUsers.map(user => user._id)}})
                        .lean()
                        .exec()
                        .then(producers => producers.forEach(producer => this.server.sendToUser(this.user._id, ServerStageEvents.PRODUCER_ADDED, producer))),
                    CustomGroupVolumeModel.find({userId: this.user._id, stageId: stageId})
                        .lean()
                        .exec()
                        .then(volumes => volumes.forEach(volume => this.server.sendToUser(this.user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, volume))),
                    StageMemberModel.find({stageId: stageId}).lean().exec()
                        .then(stageMembers =>
                            CustomStageMemberVolumeModel.find({
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