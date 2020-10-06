import * as pino from "pino";
import * as express from "express";
import * as cors from "cors";
import * as core from "express-serve-static-core";
import * as ip from "ip";
import HttpService from "./http/HttpService";
import {parseEnv} from "./env";
import SocketHandler from "./socket/SocketHandler";
import * as socketIO from "socket.io";
import {MongoRealtimeDatabase} from "./database/MongoRealtimeDatabase";
import Auth from "./auth/IAuthentication";
import IAuthentication = Auth.IAuthentication;
import DefaultAuthentication from "./auth/DefaultAuthentication";

parseEnv();

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export const serverAddress = ip.address() + ":" + process.env.PORT;

const app: core.Express = express();
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: true}));
app.options('*', cors());


const server = app.listen(process.env.PORT);
const io = socketIO(server);

const database = new MongoRealtimeDatabase(io, process.env.MONGO_URL);
const auth: IAuthentication = new DefaultAuthentication(database);
const handler = new SocketHandler(serverAddress, database, auth, io);


const resetDevices = () => {
    return database.readDevicesByServer(serverAddress)
        .then(devices => devices.map(device => database.deleteDevice(device._id)))
        .then(() => logger.warn("Removed all devices of " + serverAddress + " first"));
}

const init = async () => {
    return database.connect(process.env.MONGO_DB)
        .then(() => handler.init())
        .then(() => HttpService.init(app, database, auth))
        .then(() => resetDevices());
}

logger.info("[SERVER] Starting ...");
init()
    .then(() => logger.info("[SERVER] DONE, running on port " + process.env.PORT))
    .catch(error => logger.error("[SERVER] Could not start:\n" + error));
