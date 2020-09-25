import * as pino from "pino";
import SocketServer from "./socket/SocketServer";
import * as express from "express";
import * as cors from "cors";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import {MONGO_URL, PORT} from "./env";
import * as ip from "ip";
import DefaultAuthentication from "./auth/default/DefaultAuthentication";
import Model from "./storage/mongo/model.mongo";
import * as mongoose from "mongoose";
import HttpService from "./http/HttpService";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

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


const authentication = new DefaultAuthentication();
const socketServer = new SocketServer(server, authentication);

const resetDevices = () => {
    return Model.DeviceModel
        .find({
            server: serverAddress
        })
        .exec()
        .then(servers => servers.map(server => server.remove()))
        .then(() => logger.warn("Removed all devices of " + serverAddress + " first"));
}

const init = async () => {
    return mongoose.connect(MONGO_URL + "/digitalstage", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    })
        .then(() => HttpService.init(app, authentication))
        .then(() => socketServer.init())
        .then(() => resetDevices())
}

logger.info("[SERVER] Starting ...");
init()
    .then(() => logger.info("[SERVER] DONE, running on port " + PORT))
    .catch(error => logger.error("[SERVER] Could not start:\n" + error));
