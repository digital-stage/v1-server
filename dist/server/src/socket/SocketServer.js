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
const socketIO = require("socket.io");
const Authentication_1 = require("../auth/Authentication");
const pino = require("pino");
const SocketDeviceEvent_1 = require("./SocketDeviceEvent");
const SocketStageEvent_1 = require("./SocketStageEvent");
const Manager_1 = require("../storage/Manager");
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const DEBUG_PAYLOAD = false;
var SocketServer;
(function (SocketServer) {
    let io;
    /**
     * Send event with payload to all users, that are associated anyway to the stage
     * @param stageId
     * @param event
     * @param payload
     */
    SocketServer.sendToStage = (stageId, event, payload) => {
        return Manager_1.manager.getUsersByStage(stageId)
            .then(users => {
            users.forEach(user => SocketServer.sendToUser(user._id, event, payload));
        });
    };
    /**
     * Send event with payload to all users, that are manging this stage
     * @param stageId
     * @param event
     * @param payload
     */
    SocketServer.sendToStageManagers = (stageId, event, payload) => {
        return Manager_1.manager.getUsersManagingStage(stageId)
            .then(users => {
            users.forEach(user => SocketServer.sendToUser(user._id, event, payload));
        });
    };
    /**
     * Send event with payload to all users, that are currently joined in the stage
     * @param stageId
     * @param event
     * @param payload
     */
    SocketServer.sendToJoinedStageMembers = (stageId, event, payload) => {
        return Manager_1.manager.getJoinedUsersOfStage(stageId)
            .then(users => {
            users.forEach(user => SocketServer.sendToUser(user._id, event, payload));
        });
    };
    /**
     * Send event with payload to the device
     * @param socket socket of device
     * @param event
     * @param payload
     */
    SocketServer.sendToDevice = (socket, event, payload) => {
        if (DEBUG_PAYLOAD) {
            logger.debug("SEND TO DEVICE '" + socket.id + "' " + event + ": " + JSON.stringify(payload));
        }
        else {
            logger.debug("SEND TO DEVICE '" + socket.id + "' " + event);
        }
        socket.emit(event, payload);
    };
    /**
     * Send event with payload to the given user (and all her/his devices)
     * @param _id id of user
     * @param event
     * @param payload
     */
    SocketServer.sendToUser = (_id, event, payload) => {
        if (DEBUG_PAYLOAD) {
            logger.debug("SEND TO USER '" + _id + "' " + event + ": " + JSON.stringify(payload));
        }
        else {
            logger.debug("SEND TO USER '" + _id + "' " + event);
        }
        io.to(_id).emit(event, payload);
    };
    SocketServer.init = (server) => {
        io = socketIO(server);
        logger.info("[SOCKETSERVER] Initializing socket server...");
        io.on("connection", (socket) => {
            logger.debug("Incoming socket request " + socket.id);
            Authentication_1.authentication.authorizeSocket(socket)
                .then((user) => __awaiter(this, void 0, void 0, function* () {
                const deviceHandler = new SocketDeviceEvent_1.default(socket, user);
                const stageHandler = new SocketStageEvent_1.default(socket, user);
                /**
                 * DEVICE MANAGEMENT
                 */
                deviceHandler.addSocketHandler();
                /**
                 * STAGE MANAGEMENT
                 */
                stageHandler.addSocketHandler();
                return Promise.all([
                    deviceHandler.generateDevice()
                        .then(() => deviceHandler.sendRemoteDevices()),
                    stageHandler.generateStage()
                ])
                    .then(() => {
                    // Finally join user stream
                    return socket.join(user._id, err => {
                        if (err)
                            logger.error("Could not join room: " + err);
                        logger.debug("Joined room: " + user._id);
                        logger.debug("Ready");
                    });
                })
                    .catch((error) => {
                    socket.error(error.message);
                    logger.error("Internal error");
                    logger.error(error);
                    socket.disconnect();
                });
            }))
                .catch((error) => {
                socket.error("Invalid authorization");
                logger.error("INVALID CONNECTION ATTEMPT");
                logger.error(error);
                socket.disconnect();
            });
        });
        logger.info("[SOCKETSERVER] DONE initializing socket server.");
    };
})(SocketServer || (SocketServer = {}));
exports.default = SocketServer;
//# sourceMappingURL=SocketServer.js.map