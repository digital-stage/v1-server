import {Device, GroupId, ProducerId, StageId, StageMemberId, User, UserId} from "../model.common";
import Model from "../storage/mongo/model.mongo";
import {ServerDeviceEvents, ServerStageEvents} from "../events";
import Client from "../model.client";
import IEventReactor from "../IEventReactor";
import ISocketServer from "../ISocketServer";
import {
    CustomGroupVolumeType,
    DeviceType,
    GroupType, ProducerType, StageMemberType,
    StageType, UserType
} from "../storage/mongo/mongo.types";
import * as pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});


class EventReactor implements IEventReactor {
    private readonly server: ISocketServer;

    constructor(server: ISocketServer) {
        this.server = server;
        this.initHandler();
    }

    private initHandler = () => {
        /*
        Model.addListener<StageType>(ModelEvents.STAGE_REMOVED, stage => {
            logger.debug("[EVENT REACTOR] Stage removed hook called");
            console.log(stage);
            return this.server.sendToStage(stage._id, ServerStageEvents.STAGE_REMOVED, stage._id);
        });
        Model.addListener<GroupType>(ModelEvents.GROUP_REMOVED, group => {
            logger.debug("[EVENT REACTOR] Group removed hook called");
            return this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_REMOVED, group._id);
        });
        Model.addListener<CustomGroupVolumeType>(ModelEvents.CUSTOM_GROUP_VOLUME_REMOVED, volume => {
            logger.debug("[EVENT REACTOR] Custom group volume removed hook called");
            this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, volume._id);
            return Promise.resolve();
        });
        Model.addListener<CustomStageMemberVolumeType>(ModelEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, volume => {
            logger.debug("[EVENT REACTOR] Custom group member volume removed hook called");
            this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, volume._id);
            return Promise.resolve();
        });
        Model.addListener<DeviceType>(ModelEvents.DEVICE_REMOVED, device => {
            //this.server.sendToUser(device.userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, device._id);
            logger.debug("[EVENT REACTOR] Device removed hook called");
            this.server.sendToUser(device.userId, ServerDeviceEvents.DEVICE_REMOVED, device._id);
            return Promise.resolve();
        });
        Model.addListener<ProducerType>(ModelEvents.PRODUCER_REMOVED, producer => {
            logger.debug("[EVENT REACTOR] Producer removed hook called");
            this.server.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_REMOVED, producer._id);
            return Promise.resolve();
        });
        Model.addListener<UserType>(ModelEvents.USER_REMOVED, user => {
            //this.server.sendToUser(device.userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, device._id);
            logger.debug("[EVENT REACTOR] User removed hook called");
            //return this.server.sendToUser(user._id, ServerStageEvents.PRODUCER_REMOVED, user._id);
            return Promise.resolve();
        });
        Model.addListener<RouterType>(ModelEvents.ROUTER_REMOVED, router => {
            //this.server.sendToUser(device.userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, device._id);
            logger.debug("[EVENT REACTOR] Router removed hook called");
            this.server.sendToAll(ServerDeviceEvents.ROUTER_REMOVED, router._id);
            return Promise.resolve();
        });*/
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

    removeStage(user: User, id: StageId): Promise<any> {
        return Model.StageModel
            .findOne({_id: id, admins: user._id})
            .exec()
            .then(stage => {
                if (stage) {
                    return Promise.all([
                        // Remove stage members
                        Model.StageMemberModel.find({stageId: stage._id}).exec()
                            .then(stageMembers => {
                                return Promise.all(stageMembers.map(stageMember => {
                                    return Promise.all([
                                        // - remove published producers
                                        Model.ProducerModel.find({stageMemberId: stageMember._id}).exec()
                                            .then(producers => Promise.all(producers.map(
                                                producer => producer.remove()
                                                    .then(() => this.server.sendToStage(stage._id, ServerStageEvents.PRODUCER_REMOVED, producer._id))))),
                                        // - remove custom stage member volumes
                                        Model.CustomStageMemberVolumeModel.find({stageMemberId: stageMember._id}).exec()
                                            .then(volumes =>
                                                Promise.all(volumes.map(
                                                    volume => volume.remove()
                                                        .then(() => this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, volume._id)))))
                                    ])
                                        .then(() => this.server.sendToStage(stage._id, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMember._id));
                                }));
                            }),
                        // Remove custom group volumes
                        Model.CustomGroupVolumeModel.find({stageId: stage._id}).exec()
                            .then(volumes => Promise.all(volumes.map(
                                volume => volume.remove()
                                    .then(() => this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_VOLUME_CHANGED, volume._id))))),
                        // Remove groups
                        Model.GroupModel.find({stageId: stage._id}).exec()
                            .then(groups => Promise.all(groups.map(
                                group => group.remove()
                                    .then(() => this.server.sendToStage(stage._id, ServerStageEvents.GROUP_REMOVED, group._id))
                            )))
                    ])
                        .then(() => this.server.sendToStage(stage._id, ServerStageEvents.STAGE_REMOVED, stage._id))
                        .then(() => stage.remove());
                }
            })
    }

    removeGroup(user: User, id: GroupId): Promise<any> {
        return Model.GroupModel.findById(id).exec()
            .then(group => {
                if (group) {
                    return Model.StageModel.findOne({_id: group.stageId, admins: user._id})
                        .then(stage => {
                            if (stage) {
                                return this.removeGroupModel(group)
                            }
                        });
                }
            })
    }

    publishProducer(device: Device, producerId: ProducerId, stageId: StageId): Promise<any> {
        return Model.ProducerModel.findOne({_id: producerId, deviceId: device._id}).exec()
            .then(producer => {
                if (producer)
                    return this.publishProducerModel(producer, stageId);
            });
    }

    hideProducer(device: Device, producerId: ProducerId): Promise<any> {
        return Model.ProducerModel.findOne({_id: producerId, deviceId: device._id}).exec()
            .then(producer => {
                if (producer)
                    return this.hideProducerModel(producer);
            });
    }

    removeDevice(device: Device): Promise<any> {
        return Model.DeviceModel.findById(device._id).exec()
            .then(device => this.removeDeviceModel(device));
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
        return Model.StageMemberModel.find({stageId: stage._id}).exec()
            .then(stageMembers => ([...new Set([...stage.admins, ...stageMembers.map(stageMember => stageMember.userId)])]));
    }

    private removeStageModel(...stage: StageType[]): Promise<any> {
        const stages = stage.concat(stage);
        return Promise.all(stages.map(
            stage =>
                Model.GroupModel.find({stageId: stage._id}).exec()
                    .then(groups => this.removeGroupModel(groups))
                    .then(() => this.getUserIdsByStage(stage))
                    .then(userIds => stage.remove()
                        .then(() => userIds.forEach(userId => this.server.sendToUser(userId, ServerStageEvents.STAGE_REMOVED, stage._id))))
        ));
    }

    private removeGroupModel(group: GroupType | GroupType[]): Promise<any> {
        //const groups = group.concat(group);
        const groups = (group instanceof Array) ? group : [group];
        return Promise.all(groups.map(
            group =>
                Model.StageMemberModel.find({groupId: group._id})
                    .then(stageMembers => this.removeStageMemberModel(stageMembers))
                    .then(() => group.remove())
                    .then(() => this.server.sendToStage(group.stageId, ServerStageEvents.GROUP_REMOVED, group._id))
            )
        );
    }

    private removeCustomGroupVolumeModel(groupVolume: CustomGroupVolumeType | CustomGroupVolumeType[]): Promise<any> {
        //const groupVolumes = groupVolume.concat(groupVolume);
        const groupVolumes = (groupVolume instanceof Array) ? groupVolume : [groupVolume];
        return Promise.all(groupVolumes.map(groupVolume =>
            groupVolume.remove()
                .then(() => this.server.sendToStage(groupVolume.stageId, ServerStageEvents.CUSTOM_GROUP_VOLUME_REMOVED, groupVolume._id))
        ));
    }

    private removeStageMemberModel(stageMember: StageMemberType | StageMemberType[]): Promise<any> {
        //const stageMembers = stageMember.concat(stageMember);
        const stageMembers = (stageMember instanceof Array) ? stageMember : [stageMember];
        return Promise.all(stageMembers.map(stageMember => {
            Model.CustomStageMemberVolumeModel.find({stageMemberId: stageMember._id}).exec()
                .then(volumes => volumes.forEach(volume => volume.remove().then(() => this.server.sendToUser(volume.userId, ServerStageEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED, volume._id))));
            return stageMember.remove()
                .then(() => this.server.sendToStage(stageMember.stageId, ServerStageEvents.GROUP_MEMBER_REMOVED, stageMember._id));
        }));
    }

    private publishProducerModel(producer: ProducerType, stageMemberId: StageMemberId): Promise<any> {
        if (producer.stageMemberId) {
            return Model.StageMemberModel.findById(stageMemberId).exec()
                .then(stageMember => {
                    return producer.update({stageMemberId: stageMemberId})
                        .then(() => this.server.sendToStage(stageMember.stageId, ServerStageEvents.PRODUCER_ADDED, producer._id))
                        .then(() => this.server.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_CHANGED, {
                            id: producer._id,
                            producer: {stageMemberId: stageMemberId}
                        }));
                })
        }
    }

    private hideProducerModel(producer: ProducerType | ProducerType[]): Promise<any> {
        const producers = (producer instanceof Array) ? producer : [producer];
        return Promise.all(producers.map(producer => {
            if (producer.stageMemberId) {
                return Model.StageMemberModel.findById(producer.stageMemberId).exec()
                    .then(stageMember => {
                        return producer.update({stageMemberId: undefined})
                            .then(() => this.server.sendToStage(stageMember.stageId, ServerStageEvents.PRODUCER_REMOVED, producer._id));
                    })
                    .then(() => this.server.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_CHANGED, {
                        id: producer._id,
                        producer: {stageMemberId: undefined}
                    }));
            }
        }));
    }

    private removeProducerModel(producer: ProducerType | ProducerType[]): Promise<any> {
        const producers = (producer instanceof Array) ? producer : [producer];
        return Promise.all(producers.map(producer => {
            if (producer.stageMemberId) {
                return Model.StageMemberModel.findById(producer.stageMemberId).exec()
                    .then(stageMember => this.server.sendToStage(stageMember.stageId, ServerStageEvents.PRODUCER_REMOVED, producer._id))
                    .then(() => producer.remove())
                    .then(() => this.server.sendToUser(producer.userId, ServerDeviceEvents.PRODUCER_REMOVED, producer._id));
            }
        }));
    }

    private removeDeviceModel(device: DeviceType | DeviceType[]): Promise<any> {
        const devices = (device instanceof Array) ? device : [device];
        return Promise.all(devices.map(device =>
            Model.ProducerModel.find({deviceId: device._id}).exec()
                .then(producers => this.removeProducerModel(producers))
                .then(() => this.server.sendToUser(device.userId, ServerDeviceEvents.DEVICE_REMOVED, device._id))
        ));
    }

    private removeUserModel(user: UserType): Promise<any> {
        return Promise.all([
            Model.StageMemberModel.find({userId: user._id}).exec().then(stageMembers => this.removeStageMemberModel(stageMembers)),
            Model.CustomGroupVolumeModel.find({userId: user._id}).exec().then(volumes => this.removeCustomGroupVolumeModel(volumes)),
            Model.DeviceModel.find({userId: user._id}).exec().then(devices => this.removeDeviceModel(devices))
        ])
            .then(() => user.remove());
    }

}

export default EventReactor;