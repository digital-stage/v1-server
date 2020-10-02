import * as pino from "pino";
import * as express from "express";
import * as cors from "cors";
import * as core from "express-serve-static-core";
import * as ip from "ip";
import HttpService from "./http/HttpService";
import {parseEnv} from "./env";
import {Reactor} from "./Reactor";

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

const reactor = new Reactor(server, process.env.MONGO_URL, serverAddress);


const resetDevices = () => {
    return reactor.database.removeDevicesByServer(serverAddress)
        .then(() => logger.warn("Removed all devices of " + serverAddress + " first"));
}

const init = async () => {
    return reactor.init(process.env.MONGO_DB)
        .then(() => HttpService.init(app, reactor.authentication))
        .then(() => resetDevices());
}

logger.info("[SERVER] Starting ...");
init()
    .then(() => logger.info("[SERVER] DONE, running on port " + process.env.PORT))
    .catch(error => logger.error("[SERVER] Could not start:\n" + error));
