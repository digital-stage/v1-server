import * as socketIO from "socket.io";
import Client from "../model.client";
import Server from "../model.server";
import {storage} from "../storage/Storage";
import SocketServer from "./SocketServer";
import * as pino from "pino";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

export enum ServerStageEvents {
    STAGE_READY = "stage-ready",

    STAGE_ADDED = "stage-added",

    STAGE_REMOVED = "stage-removed",

    STAGE_LEFT = "stage-left",

    STAGE_JOINED = "stage-joined"
}

export enum ClientStageEvents {
    ADD_STAGE = "add-stage",

    JOIN_STAGE = "join-stage",
    LEAVE_STAGE = "leave-stage",

    // Following shall be only possible if client is admin of stage
    UPDATE_STAGE = "update-stage",
    REMOVE_STAGE = "remove-stage",

    ADD_GROUP = "add-group",
    UPDATE_GROUP = "update-group",
    REMOVE_GROUP = "remove-group",

    UPDATE_STAGE_MEMBER = "update-stage-member",
}

namespace SocketStageEvent {

    export async function generateStage(user: Server.User, socket: socketIO.Socket) {
        let stage: Client.Stage = null;
        if (user.stage) {
            stage = await storage.generateStage(user._id, user.stage);
        }
        SocketServer.sendToDevice(socket, ServerStageEvents.STAGE_READY, stage);

        return storage.getStagesByUser(user._id)
            .then(stages => {
                return storage.getStagePrototypes(stages.map(stage => stage._id))
                    .then(stagePrototypes => stagePrototypes.forEach(stagePrototype =>
                        SocketServer.sendToDevice(socket, ServerStageEvents.STAGE_ADDED, stagePrototype)
                    ));
            });
    }

    export function loadStageEvents(user: Server.User, socket: socketIO.Socket) {
        socket.on(ClientStageEvents.ADD_STAGE, (payload: {
            name: string, password: string | null
        }) => {
            return storage.createStage(payload.name, payload.password, user._id)
                .then(stage => storage.getStagePrototype(stage._id))
                .then(stage => {
                    SocketServer.sendToUser(user._id, ServerStageEvents.STAGE_ADDED, stage);
                });
        });

        socket.on(ClientStageEvents.JOIN_STAGE, (payload: {
            stageId: string,
            groupId: string,
            password: string | null
        }) => {
            console.log(payload);
            return storage.getStage(payload.stageId)
                .then(stage => {
                    if (stage.password && stage.password.length > 0) {
                        console.error("TODO: Replace Socket with REST and return wrong password message");
                        if (!payload.password || payload.password.length === 0) {
                            throw new Error("No password given");
                        } else if (payload.password !== stage.password) {
                            throw new Error("Wrong password");
                        }
                    }
                    return storage.getGroup(payload.groupId)
                        .then(group => {
                            logger.debug("Adding user " + user.name + " to stage '" + stage.name + "' and group '" + group.name + "'")

                            return storage.generateStage(user._id, payload.stageId)
                                .then(stage => SocketServer.sendToUser(user._id, ServerStageEvents.STAGE_JOINED, stage));
                        })
                })
                .catch(error => logger.error(error));
        });

        socket.on(ClientStageEvents.LEAVE_STAGE, () => {
            return storage.updateUserByUid(user.uid, {
                stage: null
            })
                .then(() => SocketServer.sendToUser(user._id, ServerStageEvents.STAGE_LEFT));
        });

        socket.on(ClientStageEvents.REMOVE_STAGE, (id: string) => {
            return storage.getStage(id)
                .then(stage => {
                    if (stage && stage.admins.indexOf(user._id) !== -1) {
                        return storage.getStageMembersByUser(id)
                            .then(stageMembers => {
                                return storage.removeStage(id)
                                    .then(() => {
                                        stage.admins.forEach(admin => SocketServer.sendToUser(admin, ServerStageEvents.STAGE_REMOVED, stage._id));
                                        stageMembers.forEach(stageMember => SocketServer.sendToUser(stageMember.user, ServerStageEvents.STAGE_REMOVED, stage._id));
                                    });
                            })
                    } else {
                        // no rights
                        logger.error("Could not find stage with id=" + id);
                    }
                })
        });
    }
}
export default SocketStageEvent;