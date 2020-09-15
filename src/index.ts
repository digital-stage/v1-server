import * as pino from "pino";
import SocketServer from "./socket/SocketServer";
import * as express from "express";
import * as cors from "cors";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as core from "express-serve-static-core";
import HttpService from "./http/HttpService";
import {manager} from "./storage/Manager";
import * as ip from "ip";
import * as expressPino from "express-pino-logger";
import * as dotenv from 'dotenv';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

if (process.env.ENV_PATH) {
    logger.debug("Using custom environment file at " + process.env.ENV_PATH);
    const envConfig = dotenv.parse(fs.readFileSync(process.env.ENV_PATH));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

export const PORT: number | string = process.env.PORT || 4000;
export const MONGO_URL: string = process.env.MONGO_URL || "mongodb://127.0.0.1:4321/digitalstage";
export const USE_REDIS: boolean = (process.env.USE_REDIS && process.env.USE_REDIS === "true") || false;
export const REDIS_HOSTNAME: string = process.env.REDIS_HOSTNAME || "localhost";
export const REDIS_PORT: number | string = process.env.REDIS_PORT || 25061;
export const REDIS_PASSWORD: string = process.env.REDIS_PASSWORD || "";
export const DEBUG_PAYLOAD: boolean = (process.env.DEBUG_PAYLOAD && process.env.DEBUG_PAYLOAD === "true") || false;
export const serverAddress = ip.address() + PORT;


const app: core.Express = express();
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: true}));
app.options('*', cors());
const server = (process.env.USE_SSL && process.env.USE_SSL === "true") ? https.createServer({
    key: fs.readFileSync(
        path.resolve(process.env.SSL_KEY || './ssl/key.pem')
    ),
    cert: fs.readFileSync(
        path.resolve(process.env.SSL_CRT || './ssl/cert.pem')
    ),
    ca: process.env.SSL_CA ? fs.readFileSync(path.resolve(process.env.SSL_CA)) : undefined,
    requestCert: true,
    rejectUnauthorized: false
}, app) : app.listen(PORT);

app.use(expressPino());


const resetDevices = () => manager.removeDevicesByServer(serverAddress)
    .then(() => logger.warn("Removed all devices of " + serverAddress + " first"));

const init = async () => {
    return manager.init()
        .then(() => SocketServer.init(server))
        .then(() => HttpService.init(app))
        .then(() => resetDevices())
}

export {app, server};
logger.info("[SERVER] Starting ...");
init()
    .then(() => logger.info("[SERVER] DONE, running on port " + PORT))
    .catch(error => logger.error("[SERVER] Could not start:\n" + error));
