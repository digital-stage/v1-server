import * as socketIO from "socket.io";
import {StageId, User} from "../model.common";
import {ClientStageEvents, ServerStageEvents} from "../events";
import * as pino from "pino";
import Model from "../storage/mongo/model.mongo";
import IEventReactor from "../reactor/IEventReactor";
import ISocketServer from "../ISocketServer";
import Server from "../model.server";

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
        this.socket.on(ClientStageEvents.ADD_STAGE, (initialStage: Partial<Server.Stage>) =>
            // ADD STAGE
            this.reactor.addStage(this.user, initialStage)
                .then(() => logger.trace("[SOCKET STAGE EVENT] User " + this.user.name + " created stage " + initialStage.name))
                .catch(error => logger.error(error))
        );
        this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: { id: string, stage: Partial<Server.Stage> }) =>
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
        this.socket.on(ClientStageEvents.CHANGE_GROUP, (payload: { id: string, group: Partial<Server.Group> }) =>
            // CHANGE GROUP
            this.reactor.changeGroup(this.user, payload.id, payload.group)
        );
        this.socket.on(ClientStageEvents.REMOVE_GROUP, (id: string) =>
            // REMOVE GROUP
            this.reactor.removeGroup(this.user, id)
        );

        // STAGE MEMBER MANAGEMENT
        this.socket.on(ClientStageEvents.CHANGE_GROUP_MEMBER, (id: string, groupMember: Partial<Server.Group>) =>
            // CHANGE GROUP MEMBER
            Model.StageMemberModel.findById(id).exec()
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
                this.reactor.joinStage(this.user._id, payload.stageId, payload.groupId, payload.password)
                    .then(() => fn())
                    .catch(error => fn(error))
        );
        this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
            // LEAVE STAGE
            this.reactor.leaveStage(this.user._id)
        );
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
        });
    }

    sendStages(): Promise<any> {
        return this.reactor.sendInitialToDevice(this.socket, this.user);
    }
}

export default SocketStageHandler;