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

export const PORT: number = 4000;

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

const app: core.Express = express();
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: true}));
app.options('*', cors());
const server = process.env.NODE_ENV === "development" ? app.listen(PORT) : https.createServer({
    key: fs.readFileSync(
        path.resolve(process.env.SSL_KEY || './ssl/key.pem')
    ),
    cert: fs.readFileSync(
        path.resolve(process.env.SSL_CRT || './ssl/cert.pem')
    ),
    ca: process.env.SSL_CA ? fs.readFileSync(path.resolve(process.env.SSL_CA)) : undefined,
    requestCert: true,
    rejectUnauthorized: false
}, app);

const resetDevices = () => {
    return manager.getDevices()
        .then(devices => devices.forEach(async device => await manager.removeDevice(device._id)))
        .then(() => logger.warn("Removed all devices first!"));
}

const init = async () => {
    return manager.init()
        .then(() => SocketServer.init(server))
        .then(() => HttpService.init(app))
        .then(() => {
            return resetDevices()
        })
}

export {app, server};
logger.info("[SERVER] Starting ...");
init()
    .then(() => logger.info("[SERVER] DONE, running on port " + PORT))
    .catch(error => logger.error("[SERVER] Could not start:\n" + error));
