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
const GoogleAuthentication_1 = require("./auth/GoogleAuthentication");
const database_1 = require("./database");
const events_1 = require("./events");
const database = new database_1.default();
const authentication = new GoogleAuthentication_1.default();
const io = socketIO(4000);
const sendToUser = (uid, event, payload) => {
    io.to(uid).send(event, payload);
};
database.on(database_1.DatabaseEvents.DEVICE_ADDED, (device) => sendToUser(device.userId, events_1.ServerEvents.DEVICE_ADDED, device));
database.on(database_1.DatabaseEvents.DEVICE_CHANGED, (device) => sendToUser(device.userId, events_1.ServerEvents.DEVICE_CHANGED, device));
database.on(database_1.DatabaseEvents.DEVICE_REMOVED, (device) => sendToUser(device.userId, events_1.ServerEvents.DEVICE_REMOVED, device));
io.on("connection", (socket) => {
    authentication.authorizeSocket(socket)
        .then((user) => __awaiter(void 0, void 0, void 0, function* () {
        const sendToDevice = (event, payload) => {
            socket.emit(event, payload);
        };
        // Socket has been authorized
        // Check if user is already in database
        let existingUser = database.getUser(user.id);
        if (!existingUser) {
            database.storeUser(user);
        }
        else {
            user = existingUser;
        }
        sendToDevice(events_1.ServerEvents.READY);
    }))
        .catch((error) => {
        socket.error(error.message);
        socket.disconnect();
    });
});
//# sourceMappingURL=index.js.map