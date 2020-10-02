import {MongoDatabase} from "../database/MongoDatabase";
import * as socketIO from "socket.io";
import {User} from "../model.server";
import {IReactor} from "../Reactor";

export class SocketStageHandler {
    private readonly user: User;
    private readonly socket: socketIO.Socket;
    private readonly database: MongoDatabase;
    private readonly handler: IReactor;

    constructor(database: MongoDatabase, handler: IReactor, user: User, socket: socketIO.Socket) {
        this.user = user;
        this.database = database;
        this.socket = socket;
        this.handler = handler;
    }

    init() {
    }

    sendStages(): Promise<void> {
        return Promise.resolve();
    }
}