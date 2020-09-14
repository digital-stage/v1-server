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


export const PORT: number = 4000;
export const serverAddress = ip.address() + PORT;

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
