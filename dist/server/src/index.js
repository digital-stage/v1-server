"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = exports.PORT = void 0;
const pino = require("pino");
const SocketServer_1 = require("./socket/SocketServer");
const express = require("express");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
const path = require("path");
const HttpService_1 = require("./http/HttpService");
const Manager_1 = require("./storage/Manager");
exports.PORT = 4000;
const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});
const app = express();
exports.app = app;
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true }));
app.options('*', cors());
const server = process.env.NODE_ENV === "development" ? app.listen(exports.PORT) : https.createServer({
    key: fs.readFileSync(path.resolve(process.env.SSL_KEY || './ssl/key.pem')),
    cert: fs.readFileSync(path.resolve(process.env.SSL_CRT || './ssl/cert.pem')),
    ca: process.env.SSL_CA ? fs.readFileSync(path.resolve(process.env.SSL_CA)) : undefined,
    requestCert: true,
    rejectUnauthorized: false
}, app);
exports.server = server;
const resetDevices = () => {
    return Manager_1.manager.getDevices()
        .then(devices => devices.forEach((device) => __awaiter(void 0, void 0, void 0, function* () { return yield Manager_1.manager.removeDevice(device._id); })))
        .then(() => logger.warn("Removed all devices first!"));
};
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    return Manager_1.manager.init()
        .then(() => SocketServer_1.default.init(server))
        .then(() => HttpService_1.default.init(app))
        .then(() => {
        return resetDevices();
    });
});
logger.info("[SERVER] Starting ...");
init()
    .then(() => logger.info("[SERVER] DONE, running on port " + exports.PORT))
    .catch(error => logger.error("[SERVER] Could not start:\n" + error));
//# sourceMappingURL=index.js.map