import {MongoRealtimeDatabase} from "../database/MongoRealtimeDatabase";
import * as socketIO from "socket.io";
import {User} from "../model.server";
import * as pino from "pino";

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


        logger.debug("[SOCKET STAGE HANDLER] Registered handler for user " + this.user.name + " at socket " + this.socket.id);
    }

    sendStages(): Promise<void> {
        logger.debug("[SOCKET STAGE HANDLER] Sending stages");
        return this.database.sendInitialToDevice(this.socket, this.user);
    }
}