import {MongoRealtimeDatabase} from "../database/MongoRealtimeDatabase";
import * as socketIO from "socket.io";
import {User} from "../model.server";
import * as pino from "pino";
import {ClientStageEvents, ServerStageEvents} from "../events";
import {ObjectId} from "mongodb";
import {
    AddCustomGroupPayload,
    AddGroupPayload,
    AddStagePayload,
    ChangeGroupPayload,
    ChangeStageMemberPayload,
    ChangeStagePayload,
    JoinStagePayload, RemoveCustomGroupPayload,
    RemoveGroupPayload,
    RemoveStagePayload, SetCustomGroupPayload, UpdateCustomGroupPayload
} from "../payloads";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export class SocketStageHandler {
    private readonly user: User;
    private readonly socket: socketIO.Socket;
    private readonly database: MongoRealtimeDatabase;

    constructor(database: MongoRealtimeDatabase, user: User, socket: socketIO.Socket) {
        this.user = user;
        this.database = database;
        this.socket = socket;
    }

    init() {
        // STAGE MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_STAGE, (payload: AddStagePayload) =>
            // ADD STAGE
            this.database.createStage({
                ...payload,
                admins: [this.user._id]
            })
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " created stage " + payload.name))
                .catch(error => logger.error(error))
        );
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: ChangeStagePayload) => {
            // CHANGE STAGE
            const id = new ObjectId(payload.id);
            return this.database.readManagedStage(this.user._id, id)
                .then(stage => {
                    if (stage) {
                        return this.database.updateStage(id, payload.update)
                            .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " changed stage " + payload.id))
                            .catch(error => logger.error(error));
                    }
                })
        });
        this.socket.on(ClientStageEvents.REMOVE_STAGE, (payload: RemoveStagePayload) => {
                // REMOVE STAGE
                const id = new ObjectId(payload);
                return this.database.readManagedStage(this.user._id, id)
                    .then(stage => {
                        if (stage)
                            return this.database.deleteStage(id)
                    })
            }
        );

        // GROUP MANAGEMENT
        this.socket.on(ClientStageEvents.ADD_GROUP, (payload: AddGroupPayload) => {
                const stageId = new ObjectId(payload.stageId);
                this.database.readManagedStage(this.user._id, stageId)
                    .then(stage => {
                        if (stage) {
                            return this.database.createGroup({
                                stageId: stageId,
                                name: payload.name,
                                volume: 1
                            })
                        }
                    })
            }
        );
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: ChangeGroupPayload) => {// CHANGE GROUP
                const id = new ObjectId(payload.id);
                return this.database.readGroup(id)
                    .then(group => {
                        if (group) {
                            return this.database.readManagedStage(this.user._id, group.stageId)
                                .then(stage => {
                                    if (stage)
                                        return this.database.updateGroup(id, {
                                            ...payload.update
                                        })
                                })
                        }
                    })
            }
        );
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (payload: RemoveGroupPayload) => {
                // REMOVE GROUP
                const id = new ObjectId(payload);
                this.database.readGroup(id)
                    .then(group => {
                        if (group) {
                            return this.database.readManagedStage(this.user._id, group.stageId)
                                .then(stage => {
                                    if (stage)
                                        return this.database.deleteGroup(id)
                                })
                        }
                    })
            }
        );

        this.socket.on(ClientStageEvents.ADD_CUSTOM_GROUP, (payload: AddCustomGroupPayload) => {// CHANGE GROUP
                const groupId = new ObjectId(payload.groupId);
                return this.database.createCustomGroup({
                    userId: this.user._id,
                    groupId: groupId,
                    volume: payload.volume
                });
            }
        );

        this.socket.on(ClientStageEvents.SET_CUSTOM_GROUP, (payload: SetCustomGroupPayload) => {// CHANGE GROUP
                const groupId = new ObjectId(payload.groupId);
                return this.database.setCustomGroup(this.user._id, groupId, payload.volume);
            }
        );

        this.socket.on(ClientStageEvents.UPDATE_CUSTOM_GROUP, (payload: UpdateCustomGroupPayload) => {// CHANGE GROUP
                const customGroupId = new ObjectId(payload.customGroupId);
                return this.database.updateCustomGroupByUser(this.user._id, customGroupId, payload.volume);
            }
        );


        this.socket.on(ClientStageEvents.REMOVE_CUSTOM_GROUP, (payload: RemoveCustomGroupPayload) => {// CHANGE GROUP
                const customGroupId = new ObjectId(payload.customGroupId);
                return this.database.deleteCustomGroupByUserAndGroup(this.user._id, customGroupId);
            }
        );

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER, (payload: ChangeStageMemberPayload) => {// CHANGE GROUP MEMBER
                // REMOVE GROUPS
                const id = new ObjectId(payload.id);
                return this.database.readStageMember(id)
                    .then(stageMember => {
                        if (stageMember) {
                            return this.database.readManagedStage(this.user._id, stageMember.stageId)
                                .then(stage => {
                                    if (stage)
                                        return this.database.updateStageMember(id, payload.update)
                                })
                        }
                    })
            }
        );

        // STAGE MEMBERSHIP MANAGEMENT
        this.socket.on(ClientStageEvents.JOIN_STAGE, (payload: JoinStagePayload, fn: (error?: string) => void) => {
                // JOIN STAGE
                const stageId = new ObjectId(payload.stageId);
                const groupId = new ObjectId(payload.groupId);
                return this.database.joinStage(this.user._id, stageId, groupId, payload.password)
                    .then(() => logger.info(this.user.name + " joined stage " + stageId + " and group " + groupId))
                    .then(() => {
                        return fn();
                    })
                    .catch(error => {
                        logger.error(error);
                        return fn(error.message)
                    })
            }
        );
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
            // LEAVE STAGE
            this.database.leaveStage(this.user._id)
                .then(() => logger.info(this.user.name + " left stage"))
        );
        /*
        this.socket.on(ClientStageEvents.LEAVE_STAGE_FOR_GOOD, (id: StageId) => {
            // LEAVE STAGE FOR GOOD
            return Model.UserModel.findById(this.user._id).exec()
                .then(user => Model.StageMemberModel.findOneAndRemove({userId: user._id, stageId: id})
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
        });*/

        logger.debug("[SOCKET STAGE HANDLER] Registered handler for user " + this.user.name + " at socket " + this.socket.id);
    }

    sendStages(): Promise<void> {
        logger.debug("[SOCKET STAGE HANDLER] Sending stages");
        return this.database.sendInitialToDevice(this.socket, this.user);
    }
}