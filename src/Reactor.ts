import * as socketIO from "socket.io";
import * as http from "http";
import * as Redis from "ioredis";
import Auth from "./auth/IAuthentication";
import IAuthentication = Auth.IAuthentication;
import * as redisAdapter from "socket.io-redis";
import {ServerGlobalEvents, ServerUserEvents} from "./events";
import * as pino from "pino";
import {Stage, StageId, StageMember, User, UserId} from "./model.server";
import {SocketDeviceHandler} from "./socket/SocketDeviceHandler";
import {SocketStageHandler} from "./socket/SocketStageHandler";
import {MongoDatabase} from "./database/MongoDatabase";
import {Set} from "immutable";
import DefaultAuthentication from "./auth/DefaultAuthentication";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export interface IReactor {
    init(database: string): Promise<void>;

    /**
     * Send event with payload to all users, that are associated anyway to the stage (admins or stage members)
     * @param stageId
     * @param event
     * @param payload
     */
    sendToStage(stageId: StageId, event: string, payload?: any): Promise<void>;

    /**
     * Send event with payload to all users, that are manging this stage
     * @param stageId
     * @param event
     * @param payload
     */
    sendToStageManagers(stageId: StageId, event: string, payload?: any): Promise<void>;

    /**
     * Send event with payload to the device
     * @param socket socket of device
     * @param event
     * @param payload
     */
    sendToDevice(socket: socketIO.Socket, event: string, payload?: any): void;

    /**
     * Send event with payload to all users, that are currently joined in the stage
     * @param stageId
     * @param event
     * @param payload
     */
    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any): Promise<void>;

    /**
     * Send event with payload to the given user (and all her/his devices)
     * @param _id id of user
     * @param event
     * @param payload
     */
    sendToUser(_id: UserId, event: string, payload?: any): void;

    sendToAll(event: string, payload?: any): void;
}

export class Reactor implements IReactor {
    private readonly _io: socketIO.Server;
    private readonly _authentication: IAuthentication;
    private readonly _database: MongoDatabase;

    constructor(server: http.Server, mongoUrl: string, serverAddress: string) { // Quick'n'dirty constructor ...
        this._io = socketIO(server);
        this._database = new MongoDatabase(mongoUrl, this, serverAddress);
        this._authentication = new DefaultAuthentication(this._database);
    }

    public get database(): MongoDatabase {
        return this._database;
    }

    public get authentication(): IAuthentication {
        return this._authentication;
    }

    async init(database: string): Promise<void> {
        logger.info("[SOCKETSERVER] Initializing database...");
        await this._database.connect(database);
        logger.info("[SOCKETSERVER] DONE initializing database.");

        logger.info("[SOCKETSERVER] Initializing socket server...");
        if (process.env.USE_REDIS) {
            logger.info("[SOCKETSERVER] Using redis at " + process.env.REDIS_HOSTNAME + ":" + process.env.REDIS_PORT);
            const pub = new Redis("rediss://:" + process.env.REDIS_PASSWORD + "@" + process.env.REDIS_HOSTNAME + ":" + process.env.REDIS_PORT);
            const sub = new Redis("rediss://:" + process.env.REDIS_PASSWORD + "@" + process.env.REDIS_HOSTNAME + ":" + process.env.REDIS_PORT);
            this._io.adapter(redisAdapter({
                pubClient: pub,
                subClient: sub
            }));
        }
        this._io.on("connection", (socket: socketIO.Socket) => {
            logger.trace("[SOCKETSERVER] Incoming socket request " + socket.id);
            return this._authentication.authorizeSocket(socket)
                .then(async (user: User) => {
                    logger.trace("[SOCKETSERVER](" + socket.id + ") Authenticated user " + user.name);
                    const deviceHandler = new SocketDeviceHandler(this._database, this, user, socket);
                    const stageHandler = new SocketStageHandler(this._database, this, user, socket);
                    /**
                     * DEVICE MANAGEMENT
                     */
                    deviceHandler.init();

                    /**
                     * STAGE MANAGEMENT
                     */
                    stageHandler.init();

                    this.sendToDevice(socket, ServerUserEvents.USER_READY, user);

                    return Promise.all([
                        deviceHandler.generateDevice()
                            .then(() => deviceHandler.sendRemoteDevices()),
                        stageHandler.sendStages()
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

    sendToStage(stageId: StageId, event: string, payload?: any): Promise<void> {
        return Promise.all([
            this._database.db().collection<Stage>("stages").findOne({_id: stageId}, {projection: {admins: 1}}).then(stage => stage.admins),
            this._database.db().collection<StageMember>("stagemembers").find({stage: stageId}, {projection: {user: 1}}).toArray().then(stageMembers => stageMembers.map(stageMember => stageMember.user))
        ])
            .then(result => Set<UserId>([...result[0], ...result[1]]).toArray())
            .then(userIds => userIds.forEach(userId => this.sendToUser(userId, event, payload)));
    }

    sendToStageManagers(stageId: StageId, event: string, payload?: any): Promise<void> {
        return this._database.db().collection("stages").findOne({_id: stageId}, {projection: {admins: 1}})
            .then(stage => stage.admins.forEach(admin => this.sendToUser(admin, event, payload)));
    }

    sendToJoinedStageMembers(stageId: StageId, event: string, payload?: any): Promise<void> {
        return this._database.db().collection("users").find({stage: stageId}, {projection: {_id: 1}}).toArray()
            .then((users: { _id: string }[]) => {
                users.forEach(user => this.sendToUser(user._id, event, payload));
            });
    }

    sendToDevice(socket: socketIO.Socket, event: string, payload?: any): void {
        if (process.env.DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO DEVICE '" + socket.id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO DEVICE '" + socket.id + "' " + event);
        }
        socket.emit(event, payload);
    }

    sendToUser(_id: UserId, event: string, payload?: any): void {
        if (process.env.DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO USER '" + _id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO USER '" + _id + "' " + event);
        }
        this._io.to(_id).emit(event, payload);
    };

    sendToAll(event: string, payload?: any): void {
        if (process.env.DEBUG_PAYLOAD) {
            logger.trace("[SOCKETSERVER] SEND TO ALL " + event + ": " + JSON.stringify(payload));
        } else {
            logger.trace("[SOCKETSERVER] SEND TO ALL " + event);
        }
        this._io.emit(event, payload);
    }
}