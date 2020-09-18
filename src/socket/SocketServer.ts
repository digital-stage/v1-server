import * as socketIO from "socket.io";
import * as Redis from "ioredis";
import * as redisAdapter from 'socket.io-redis';
import * as pino from "pino";
import * as https from "https";
import * as http from "http";
import {StageId, User, UserId} from "../model.common";
import SocketDeviceHandler from "./SocketDeviceEvent";
import SocketStageHandler from "./SocketStageEvent";
import {DEBUG_PAYLOAD, REDIS_HOSTNAME, REDIS_PASSWORD, REDIS_PORT, USE_REDIS} from "../env";
import {ServerGlobalEvents, ServerUserEvents} from "../events";
import Auth from "../auth/IAuthentication";
import IAuthentication = Auth.IAuthentication;
import {StageMemberModel, StageModel, UserModel} from "../storage/mongo/model.mongo";
import Client from "../model.client";
import EventReactor, {IEventReactor} from "./EventReactor";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

export interface ISocketServer {
    sendToStage(stageId: StageId, event: string, payload?: any);

    sendToStageManagers(stageId: StageId, event: string, payload?: any);

    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any);

    sendToDevice(socket: socketIO.Socket, event: string, payload?: any);

    sendToUser(userId: UserId, event: string, payload?: any);

    init();

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Client.StagePrototype): Promise<UserId[]>;
}

class SocketServer implements ISocketServer {
    private io: socketIO.Server;
    private authentication: IAuthentication;
    private readonly server: https.Server | http.Server;
    private readonly reactor: IEventReactor;

    constructor(server: https.Server | http.Server, authentication: IAuthentication) {
        this.server = server;
        this.authentication = authentication;
        this.reactor = new EventReactor(this);
    }

    /**
     * Send event with payload to all users, that are associated anyway to the stage
     * @param stageId
     * @param event
     * @param payload
     */
    sendToStage(stageId: StageId, event: string, payload?: any) {
        return this.getUserIdsByStageId(stageId)
            .then(userIds => {
                userIds.forEach(userId => this.sendToUser(userId, event, payload));
            });
    }

    /**
     * Send event with payload to all users, that are manging this stage
     * @param stageId
     * @param event
     * @param payload
     */
    sendToStageManagers(stageId: StageId, event: string, payload?: any) {
        return StageModel.findById(stageId).lean().exec()
            .then(stage => stage.admins.forEach(admin => this.sendToUser(admin, event, payload)));
    }

    /**
     * Send event with payload to all users, that are currently joined in the stage
     * @param stageId
     * @param event
     * @param payload
     */
    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any) {
        return UserModel.find({stageId: stageId}).lean().exec()
            .then(users => {
                users.forEach(user => this.sendToUser(user._id, event, payload));
            });
    }

    /**
     * Send event with payload to the device
     * @param socket socket of device
     * @param event
     * @param payload
     */
    sendToDevice(socket: socketIO.Socket, event: string, payload?: any) {
        if (DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO DEVICE '" + socket.id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO DEVICE '" + socket.id + "' " + event);
        }
        socket.emit(event, payload);
    }

    /**
     * Send event with payload to the given user (and all her/his devices)
     * @param _id id of user
     * @param event
     * @param payload
     */
    sendToUser(_id: UserId, event: string, payload?: any) {
        if (DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO USER '" + _id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO USER '" + _id + "' " + event);
        }
        this.io.to(_id).emit(event, payload);
    };

    getUserIdsByStage = (stage: Client.StagePrototype): Promise<UserId[]> => {
        return StageMemberModel.find({stageId: stage._id}).exec()
            .then(stageMembers => ([...new Set([...stage.admins, ...stageMembers.map(stageMember => stageMember.userId)])]));

    }

    getUserIdsByStageId = (stageId: StageId): Promise<UserId[]> => {
        return StageModel.findById(stageId).lean().exec()
            .then(stage => {
                if (stage) {
                    return this.getUserIdsByStage(stage);
                }
                return [];
            })
    }

    init() {
        logger.info("[SOCKETSERVER] Initializing socket server...");
        this.io = socketIO(this.server);
        if (USE_REDIS) {
            logger.info("[SOCKETSERVER] Using redis at " + REDIS_HOSTNAME + ":" + REDIS_PORT);
            const pub = new Redis("rediss://:" + REDIS_PASSWORD + "@" + REDIS_HOSTNAME + ":" + REDIS_PORT);
            const sub = new Redis("rediss://:" + REDIS_PASSWORD + "@" + REDIS_HOSTNAME + ":" + REDIS_PORT);
            this.io.adapter(redisAdapter({
                pubClient: pub,
                subClient: sub
            }));
        }
        this.io.on("connection", (socket: socketIO.Socket) => {
            logger.trace("[SOCKETSERVER] Incoming socket request " + socket.id);
            return this.authentication.authorizeSocket(socket)
                .then(async (user: User) => {
                    logger.trace("[SOCKETSERVER](" + socket.id + ") Authenticated user " + user.name);
                    const deviceHandler = new SocketDeviceHandler(this, this.reactor, socket, user);
                    const stageHandler = new SocketStageHandler(this, this.reactor, socket, user);
                    /**
                     * DEVICE MANAGEMENT
                     */
                    deviceHandler.addSocketHandler();

                    /**
                     * STAGE MANAGEMENT
                     */
                    stageHandler.addSocketHandler();

                    this.sendToDevice(socket, ServerUserEvents.USER_READY, user);

                    return Promise.all([
                        deviceHandler.generateDevice()
                            .then(() => deviceHandler.sendRemoteDevices()),
                        stageHandler.generateStages()
                    ])
                        .then(() => {
                            // Finally join user stream
                            return socket.join(user._id, err => {
                                if (err)
                                    logger.warn("[SOCKETSERVER](" + socket.id + ") Could not join room: " + err);
                                logger.trace("[SOCKETSERVER](" + socket.id + ") Joined room: " + user._id);
                                logger.trace("[SOCKETSERVER](" + socket.id + ") Ready");
                                this.sendToDevice(socket, ServerGlobalEvents.READY);
                            });
                        })
                        .catch((error) => {
                            socket.error(error.message);
                            logger.error("[SOCKETSERVER](" + socket.id + ") Internal error");
                            logger.error(error);
                            socket.disconnect();
                        })
                })
                .catch((error) => {
                    socket.error("Invalid authorization");
                    logger.trace("[SOCKETSERVER](" + socket.id + ") INVALID CONNECTION ATTEMPT");
                    logger.trace(error);
                    socket.disconnect();
                })
        });
        logger.info("[SOCKETSERVER] DONE initializing socket server.");
    }
}

export default SocketServer;