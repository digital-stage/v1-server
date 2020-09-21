import {Device, GroupId, GroupMemberId, ProducerId, StageId, StageMemberId, User, UserId} from "../model.common";
import Model from "../storage/mongo/model.mongo";
import {ServerDeviceEvents, ServerStageEvents} from "../events";
import Client from "../model.client";
import IEventReactor from "../IEventReactor";
import ISocketServer from "../ISocketServer";
import {
    CustomGroupVolumeType,
    DeviceType,
    GroupType, ProducerType, GroupMemberType,
    StageType, UserType
} from "../storage/mongo/mongo.types";
import * as pino from "pino";
import GroupMemberModel = Model.GroupMemberModel;
import CustomGroupVolumeModel = Model.CustomGroupVolumeModel;
import GroupModel = Model.GroupModel;
import {Errors} from "../errors";
import * as socketIO from "socket.io";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});


class EventReactor implements IEventReactor {
    private readonly server: ISocketServer;

    constructor(server: ISocketServer) {
        this.server = server;
    }

    private removeGroupModel(group: GroupType) {
        return Promise.all([
            // Remove all custom group volumes
            CustomGroupVolumeModel.find({groupId: group._id}).exec()
                .then(volumes => Promise.all(volumes.map(volume => volume.remove().then(() => this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, volume._id))))),
            // remove all group members
            GroupMemberModel.find({groupId: group._id}).exec()
                .then(groupMembers => Promise.all(groupMembers.map(groupMember => this.removeGroupMemberModel(groupMember))))
        ]);
    }

    public removeGroupMemberModel(groupMember: GroupMemberType) {
        return Model.UserModel.findById(groupMember.userId).exec()
            .then(user => {
                if (user.stageMemberId === groupMember._id) {
                    // If user is connected, let user leave first
                    return this.leaveStage(user);
                }
            })
            // Remove all custom group member volumes
            .then(() => Model.CustomStageMemberVolumeModel.find({stageMemberId: groupMember._id}).exec()
                .then(volumes => volumes.forEach(volume => volume.remove().then(() => this.server.sendToStage(groupMember.stageId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, volume._id))))
            )
            // Remove group member
            .then(() => groupMember.remove())
            .then(() => this.server.sendToStage(groupMember.stageId, ServerStageEvents.GROUP_MEMBER_REMOVED, groupMember._id))
            .then(() => this.server.sendToUser(groupMember.userId, ServerStageEvents.GROUP_MEMBER_REMOVED, groupMember._id));
    }


    private removeStageModel(stage: StageType) {
        return Model.GroupModel.find({stageId: stage._id}).exec()
            .then(groups => Promise.all(groups.map(group => this.removeGroupModel(group))))
            .then(() => this.getUserIdsByStage(stage))
            .then(userIds => stage.remove()
                .then(() => userIds.forEach(userId => this.server.sendToUser(userId, ServerStageEvents.STAGE_REMOVED, stage._id))));
    }

    addStage(user: User, initialStage: Partial<Client.StagePrototype>): Promise<any> {
        // ADD STAGE
        const stage = new Model.StageModel();
        stage.name = initialStage.name;
        stage.password = initialStage.password;
        stage.width = initialStage.width || 25;
        stage.length = initialStage.length || 13;
        stage.height = initialStage.height || 7.5;
        stage.reflection = initialStage.reflection || 0.7;
        stage.absorption = initialStage.absorption || 0.6;
        stage.admins = initialStage.admins ? [...initialStage.admins, user._id] : [user._id];
        return stage.save()
            .then(stage => stage.admins.forEach(admin => this.server.sendToUser(admin, ServerStageEvents.STAGE_ADDED, stage)));
    }

    changeStage(user: User, id: StageId, stage: Partial<Client.StagePrototype>): Promise<any> {
        // CHANGE STAGE
        return Model.StageModel.findOneAndUpdate({_id: id, admins: user._id}, stage).lean().exec()
            .then(() => this.server.sendToStage(id, ServerStageEvents.STAGE_CHANGED, {
                ...stage,
                id: id
            }));
    }

    private async generateStage(user: User, stageId: StageId) {
        const stage = await Model.StageModel.findById(stageId).lean().exec();
        const groups = await Model.GroupModel.find({stageId: stageId}).lean().exec();
        const stageMembers = await Model.GroupMemberModel.find({stageId: stageId}).lean().exec();
        const customGroupVolumes = await Model.CustomGroupVolumeModel.find({
            stageId: stageId,
            userId: user._id
        }).lean().exec();
        const stageMemberIds: string[] = stageMembers.map(stageMember => stageMember._id);
        const customStageMemberGroupVolumes = await Model.CustomStageMemberVolumeModel.find({
            userId: user._id,
            stageMemberId: {$in: stageMemberIds}
        }).lean().exec();
        const producers = await Model.ProducerModel.find({stageMemberId: {$in: stageMemberIds}}).lean().exec();
        return {
            stage,
            groups,
            stageMembers,
            customGroupVolumes,
            customStageMemberGroupVolumes,
            producers
        }
    }

    async revokeFullStageFromUser(user: User, stageId: StageId) {
        const {stage, groups, stageMembers, customGroupVolumes, customStageMemberGroupVolumes, producers} = await this.generateStage(user, stageId);
        for (const producer of producers) {
            await this.server.sendToUser(user._id, ServerStageEvents.PRODUCER_REMOVED, producer._id);
        }
        for (const customGroupMemberVolume of customStageMemberGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, customGroupMemberVolume._id);
        }
        for (const customGroupVolume of customGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, customGroupVolume._id);
        }
        for (const stageMember of stageMembers) {
            await this.server.sendToUser(user._id, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMember._id);
        }
        for (const group of groups) {
            await this.server.sendToUser(user._id, ServerStageEvents.GROUP_REMOVED, group._id);
        }
        await this.server.sendToUser(user._id, ServerStageEvents.STAGE_REMOVED, stage._id);
    }

    async revokeActiveStageInformationFromUser(user: User, stageId: StageId) {
        const {customGroupVolumes, customStageMemberGroupVolumes, producers} = await this.generateStage(user, stageId);
        for (const producer of producers) {
            await this.server.sendToUser(user._id, ServerStageEvents.PRODUCER_REMOVED, producer._id);
        }
        for (const customGroupMemberVolume of customStageMemberGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, customGroupMemberVolume._id);
        }
        for (const customGroupVolume of customGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, customGroupVolume._id);
        }
    }

    async sendStageToDevice(socket: socketIO.Socket, user: User, stageId: StageId) {
        const {stage, groups, stageMembers, customGroupVolumes, customStageMemberGroupVolumes, producers} = await this.generateStage(user, stageId);
        await this.server.sendToDevice(socket, ServerStageEvents.STAGE_ADDED, stage);
        for (const group of groups) {
            await this.server.sendToDevice(socket, ServerStageEvents.GROUP_ADDED, group);
        }
        for (const stageMember of stageMembers) {
            await this.server.sendToDevice(socket, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember);
        }
        for (const customGroupVolume of customGroupVolumes) {
            await this.server.sendToDevice(socket, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, customGroupVolume);
        }
        for (const customGroupMemberVolume of customStageMemberGroupVolumes) {
            await this.server.sendToDevice(socket, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, customGroupMemberVolume);
        }
        for (const producer of producers) {
            await this.server.sendToUser(user._id, ServerStageEvents.PRODUCER_ADDED, producer);
        }
    }


    async sendActiveStageInformationToUser(user: User, stageId: StageId) {
        const {customGroupVolumes, customStageMemberGroupVolumes, producers} = await this.generateStage(user, stageId);
        for (const customGroupVolume of customGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, customGroupVolume);
        }
        for (const customGroupMemberVolume of customStageMemberGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, customGroupMemberVolume);
        }
        for (const producer of producers) {
            await this.server.sendToUser(user._id, ServerStageEvents.PRODUCER_ADDED, producer);
        }
    }

    async sendStageToUser(user: User, stageId: StageId) {
        const {stage, groups, stageMembers, customGroupVolumes, customStageMemberGroupVolumes, producers} = await this.generateStage(user, stageId);
        await this.server.sendToUser(user._id, ServerStageEvents.STAGE_ADDED, stage);
        for (const group of groups) {
            await this.server.sendToUser(user._id, ServerStageEvents.GROUP_ADDED, group);
        }
        for (const stageMember of stageMembers) {
            await this.server.sendToUser(user._id, ServerStageEvents.GROUP_MEMBER_ADDED, stageMember);
        }
        for (const customGroupVolume of customGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_VOLUME_ADDED, customGroupVolume);
        }
        for (const customGroupMemberVolume of customStageMemberGroupVolumes) {
            await this.server.sendToUser(user._id, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_ADDED, customGroupMemberVolume);
        }
        for (const producer of producers) {
            await this.server.sendToUser(user._id, ServerStageEvents.PRODUCER_ADDED, producer);
        }
    }

    joinStage(user: User, stageId: StageId, groupId: GroupId, password?: string) {
        logger.debug("[EVENT REACTOR] User " + user.name + " wants to join stage " + stageId + " and group " + groupId);
        // First check password
        return Model.StageModel.findById(stageId).exec()
            .then(stage => {
                if (!stage)
                    throw new Error(Errors.NOT_FOUND);
                if (stage.password && stage.password !== password) {
                    throw new Error(Errors.INVALID_PASSWORD);
                }
                const isAdmin: boolean = stage.admins.find(admin => admin === user._id.toString()) != undefined;
                // Find the group
                return GroupModel.findById(groupId).exec()
                    .then(async group => {
                        if (group) {
                            // Let the user leave stage if joined
                            await this.leaveStage(user, true);

                            // Create or get group member
                            let groupMember = await Model.GroupMemberModel.findOne({
                                userId: user._id,
                                stageId: stage._id
                            }).exec();
                            const wasUserAlreadyInStage = groupMember !== null;
                            if (!groupMember) {
                                groupMember = new Model.GroupMemberModel();
                                groupMember.userId = user._id;
                                groupMember.volume = 1.0;
                                groupMember.isDirector = false;
                                groupMember.stageId = stage._id;
                            }
                            groupMember.groupId = group._id;
                            groupMember.online = true;
                            groupMember = await groupMember.save();

                            // Assign user
                            user = await Model.UserModel.findById(user._id).exec();
                            user.stageId = stage._id;
                            user.stageMemberId = groupMember._id;
                            await Model.UserModel.findByIdAndUpdate(user._id, {
                                stageId: stage._id,
                                stageMemberId: groupMember._id
                            });

                            await this.server.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, {
                                stageId: stage._id,
                                groupId: group._id
                            });

                            if (wasUserAlreadyInStage || isAdmin) {
                                await this.sendActiveStageInformationToUser(user, stage._id);
                            } else {
                                await this.sendStageToUser(user, stage._id);
                            }


                            // NOW the user is also a joined stage member (!)
                            if (wasUserAlreadyInStage) {
                                await this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                                    _id: groupMember._id,
                                    online: true,
                                    groupId: group._id
                                });
                            } else {
                                await this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.GROUP_MEMBER_ADDED, groupMember.toObject());
                            }

                            // Publish existing producers
                            const producers = await Model.ProducerModel.find({userId: user._id}).exec();
                            for (const producer of producers) {
                                await producer.updateOne({
                                    stageMemberId: groupMember._id
                                })
                                    .then(producer => this.server.sendToJoinedStageMembers(stage._id, ServerStageEvents.PRODUCER_ADDED, producer));
                            }
                        }
                    })
            })
    }

    public leaveStage(user: User, dontInformUser?: boolean): Promise<any> {
        return Model.UserModel.findById(user._id).exec()
            .then(user => {
                if (user.stageId) {
                    const stageId = user.stageId;
                    // Disconnect all producers of user from group member
                    return Model.GroupMemberModel.findById(user.stageMemberId).exec()
                        .then(async groupMember => {
                            if (groupMember) {
                                // First clean up client by revoking stage
                                await this.revokeActiveStageInformationFromUser(user, stageId);

                                // Update group member (before finally leaving)
                                groupMember.online = false;
                                await groupMember.save();
                                await this.server.sendToJoinedStageMembers(stageId, ServerStageEvents.GROUP_MEMBER_CHANGED, {
                                    _id: groupMember._id,
                                    online: false
                                });
                                logger.debug("[EVENT REACTOR] Set group member " + user.name + " of stage to offline");

                                // Leave the user <-> stage member connection
                                await Model.UserModel.findByIdAndUpdate(user._id, {
                                    stageId: undefined,
                                    stageMemberId: undefined
                                }).exec();
                                if (!dontInformUser) {
                                    await this.server.sendToUser(user._id, ServerStageEvents.STAGE_LEFT);
                                }

                                // NOW the user is no joined stage member any more

                                // Remove producers
                                const producers = await Model.ProducerModel.find({stageMemberId: groupMember._id}).exec();
                                for (const producer of producers) {
                                    await producer.updateOne({
                                        stageMemberId: undefined
                                    }).then(() => this.server.sendToJoinedStageMembers(stageId, ServerStageEvents.PRODUCER_REMOVED, producer));
                                }

                                // Now refresh state for all other users

                            }
                        })
                }
            })
    }

    removeStage(user: User, stageId: StageId) {
        // For all active users: leave stage first
        // Remove all groups
        return Model.StageModel.findOne({_id: stageId, admins: user._id}).exec()
            .then(stage => {
                if (stage) {
                    return this.removeStageModel(stage)
                        .then(() => logger.debug("[EVENT REACTOR] " + user.name + " removed stage " + stage.name))
                }
            })
    }

    public addGroup(user: User, stageId: StageId, name: string): Promise<any> {
        return Model.StageModel.findOne({_id: stageId, admins: user._id}).exec()
            .then(stage => {
                if (stage) {
                    const group = new Model.GroupModel();
                    group.name = name;
                    group.stageId = stage._id;
                    return group.save()
                        .then(group => this.server.sendToStage(stage._id, ServerStageEvents.GROUP_ADDED, group.toObject()))
                        .then(() => logger.debug("[EVENT REACTOR] " + user.name + " added group " + group.name))
                }
            })
    }

    public changeGroup(user: User, groupId: GroupId, update: Partial<Client.GroupPrototype>): Promise<any> {
        return Model.GroupModel.findById(groupId).exec()
            .then(
                group => Model.StageModel.findOne({_id: group.stageId, admins: user._id}).exec()
                    .then(stage => {
                        if (stage) {
                            group.updateOne(update)
                                .then(group => this.server.sendToStage(stage._id, ServerStageEvents.GROUP_CHANGED, {
                                    ...update,
                                    _id: group._id
                                }))
                                .then(() => logger.debug("[EVENT REACTOR] " + user.name + " changed group " + group.name))
                        }
                    })
            );
    }


    public removeGroup(user: User, groupId: GroupId): Promise<any> {
        return Model.GroupModel.findById(groupId).exec().then(
            group => {
                if (group) {
                    return Model.StageModel.findOne({_id: group._id, admins: user._id}).exec()
                        .then(stage => {
                            if (stage) {
                                this.removeGroupModel(group)
                                    .then(() => logger.debug("[EVENT REACTOR] " + user.name + " removed group " + group.name))
                            }
                        })
                }
            }
        )
    }


    getUserIdsByStageId(stageId: StageId): Promise<UserId[]> {
        return Model.StageModel.findById(stageId).lean().exec()
            .then(stage => {
                if (stage) {
                    return this.getUserIdsByStage(stage);
                }
                return [];
            })
    }

    getUserIdsByStage(stage: Client.StagePrototype): Promise<UserId[]> {
        return Model.GroupMemberModel.find({stageId: stage._id}).exec()
            .then(stageMembers => ([...new Set([...stage.admins, ...stageMembers.map(stageMember => stageMember.userId)])]));
    }
}

export default EventReactor;